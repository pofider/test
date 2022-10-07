const { DOMParser } = require('@xmldom/xmldom')
const recursiveStringReplaceAsync = require('../../recursiveStringReplaceAsync')
const { nodeListToArray, serializeXml, getHeaderFooterDocs, getClosestEl, clearEl } = require('../../utils')
const parseHtmlToDocxMeta = require('./parseHtmlToDocxMeta')
const convertDocxMetaToNodes = require('./convertDocxMetaToNodes')

module.exports = async (files) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const documentFilePath = documentFile.path
  const documentRelsDoc = files.find(f => f.path === 'word/_rels/document.xml.rels').doc

  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<w:p[^>]*__html_embed_container__="true"[^>]*>',
    '<!--__html_embed_container__--></w:p>',
    'g',
    async (val, content, hasNestedMatch) => {
      const doc = new DOMParser().parseFromString(val)
      const paragraphNode = doc.documentElement

      const xmlNodesGenerated = await processParagraphHtmlEmbedContainer(paragraphNode, doc, files)

      return xmlNodesGenerated.map((node) => serializeXml(node)).join('')
    }
  )

  const headerFooterReferences = []

  // checking if we need to handle html in header/footer of the document
  documentFile.data = await recursiveStringReplaceAsync(
    documentFile.data.toString(),
    '<docxHtmlSectPr>',
    '</docxHtmlSectPr>',
    'g',
    async (val, content, hasNestedMatch) => {
      const doc = new DOMParser().parseFromString(val)

      const headerReferences = nodeListToArray(doc.getElementsByTagName('w:headerReference')).map((el) => ({
        type: 'header',
        referenceEl: el
      }))

      const footerReferences = nodeListToArray(doc.getElementsByTagName('w:footerReference')).map((el) => ({
        type: 'footer',
        referenceEl: el
      }))

      if (documentRelsDoc != null) {
        const referenceResults = getHeaderFooterDocs([...headerReferences, ...footerReferences], documentFilePath, documentRelsDoc, files)
        headerFooterReferences.push(...referenceResults)
      }

      // return without the wrapping
      return serializeXml(doc.documentElement.firstChild)
    }
  )

  for (const { doc: headerFooterDoc } of headerFooterReferences) {
    const paragraphEls = nodeListToArray(headerFooterDoc.getElementsByTagName('w:p')).filter((el) => {
      return el.getAttribute('__html_embed_container__') === 'true'
    })

    for (const paragraphEl of paragraphEls) {
      const xmlNodesGenerated = await processParagraphHtmlEmbedContainer(paragraphEl, headerFooterDoc, files)

      for (const xmlNode of xmlNodesGenerated) {
        paragraphEl.parentNode.insertBefore(xmlNode, paragraphEl)
      }

      paragraphEl.parentNode.removeChild(paragraphEl)
    }
  }
}

async function processParagraphHtmlEmbedContainer (referenceParagraphEl, doc, files) {
  const paragraphEl = referenceParagraphEl.cloneNode(true)

  paragraphEl.removeAttribute('__html_embed_container__')

  if (
    paragraphEl.lastChild != null &&
    paragraphEl.lastChild.nodeName === '#comment' &&
    paragraphEl.lastChild.nodeValue === '__html_embed_container__'
  ) {
    paragraphEl.removeChild(paragraphEl.lastChild)
  }

  const htmlEmbedElements = nodeListToArray(paragraphEl.getElementsByTagName('docxHtmlEmbed'))
  let htmlEmbedDefs = []

  for (const htmlEmbedEl of htmlEmbedElements) {
    const match = htmlEmbedEl.textContent.match(/\$docxHtml([^$]*)\$/)
    const htmlEmbedConfig = JSON.parse(Buffer.from(match[1], 'base64').toString())

    const tEl = getClosestEl(htmlEmbedEl, (n) => (
      n.nodeName === 'w:t' &&
      n.getAttribute('__htmlEmbedRef__') != null &&
      n.getAttribute('__htmlEmbedRef__') === htmlEmbedEl.getAttribute('htmlId')
    ), 'previous')

    if (tEl == null) {
      throw new Error('Unable to find w:t reference element for docxHtmlEmbed')
    }

    htmlEmbedDefs.push({
      tEl,
      id: htmlEmbedEl.getAttribute('htmlId'),
      config: htmlEmbedConfig
    })

    htmlEmbedEl.parentNode.removeChild(htmlEmbedEl)
  }

  const embedType = htmlEmbedDefs.every((d) => d.config.inline === true) ? 'inline' : 'block'

  if (embedType === 'block') {
    // if the embed is block type we should clear the paragraph and only let the paragraph properties
    // and the node containing the html embed call
    const firstBlockEmbedDef = htmlEmbedDefs.find((d) => d.config.inline == null || d.config.inline !== true)

    let currentEl = firstBlockEmbedDef.tEl
    let parentElBeforeParagraph

    do {
      currentEl = currentEl.parentNode

      if (currentEl != null && currentEl.parentNode != null && currentEl.parentNode.nodeName === 'w:p') {
        parentElBeforeParagraph = currentEl
      }
    } while (currentEl != null && currentEl.parentNode != null && parentElBeforeParagraph == null)

    if (parentElBeforeParagraph == null) {
      throw new Error('Unable to find parent element for docxHtmlEmbed')
    }

    clearEl(paragraphEl, (c) => c.nodeName === 'w:pPr' || c === parentElBeforeParagraph)

    htmlEmbedDefs = [firstBlockEmbedDef]
  }

  const xmlNodesGenerated = []

  if (embedType === 'block') {
    const htmlEmbedDef = htmlEmbedDefs[0]
    const docxMeta = parseHtmlToDocxMeta(htmlEmbedDef.config.content, embedType)
    const xmlNodes = await convertDocxMetaToNodes(docxMeta, htmlEmbedDef, embedType, { doc, files, paragraphNode: paragraphEl })
    xmlNodesGenerated.push(...xmlNodes)
  } else {
    for (const htmlEmbedDef of htmlEmbedDefs) {
      const docxMeta = parseHtmlToDocxMeta(htmlEmbedDef.config.content, embedType)
      const xmlNodes = await convertDocxMetaToNodes(docxMeta, htmlEmbedDef, embedType, { doc, files })
      const rContainerNode = getClosestEl(htmlEmbedDef.tEl, 'w:r')

      for (const xmlNode of xmlNodes) {
        rContainerNode.parentNode.insertBefore(xmlNode, rContainerNode)
      }

      // remove the reference text node and container because we are not going to need it anymore
      rContainerNode.parentNode.removeChild(rContainerNode)
    }

    xmlNodesGenerated.push(paragraphEl)
  }

  return xmlNodesGenerated
}
