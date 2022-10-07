import PhantomEditor from './PhantomEditor.js'
import PhantomPdfProperties from './PhantomPdfProperties.js'
import PhantomTitle from './PhantomTitle.js'
import * as Constants from './constants.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('phantom pdf', PhantomPdfProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'phantom-pdf')

const reformat = (reformatter, entity, tab) => {
  const lastPhantomProperties = entity.phantom || {}
  const reformated = reformatter(lastPhantomProperties[tab.headerOrFooter], 'html')

  return {
    phantom: {
      ...lastPhantomProperties,
      [tab.headerOrFooter]: reformated
    }
  }
}

Studio.addEditorComponent(Constants.PHANTOM_TAB_EDITOR, PhantomEditor, reformat)
Studio.addTabTitleComponent(Constants.PHANTOM_TAB_TITLE, PhantomTitle)

Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'templates' && entity.recipe === 'phantom-pdf') ? 'fa-file-pdf-o' : null)
