const path = require('path')
const fs = require('fs')
const MongoClient = require('mongodb').MongoClient
const moment = require('moment')
const nanoid = require('nanoid')

const connectionString = process.env.connectionString
const singleTenantName = process.env.tenantName
const database = 'multitenant'
const rootDatabase = 'multitenant-root'

const args = process.argv.slice(2)
const executionId = nanoid(5)
const defaultPhantomjsChangeDate = new Date(2016, 9, 18)
// 6 months ago from 2022-01-21
const refDateForTenantsLoginQuery = moment(new Date(2022, 0, 21)).subtract(6, 'months').toDate()
const shouldRunMigration = !args.includes('--list')
const isSingleTenantMigration = singleTenantName != null
const migrationTemplatePostfix = '-jsreport-support'

async function run () {
  if (connectionString == null) {
    throw new Error('connectionString is not defined, please pass env var connectionString')
  }

  const client = await MongoClient.connect(connectionString, { useUnifiedTopology: true, useNewUrlParser: true })
  console.log('connected')

  const rootDb = client.db(rootDatabase)
  const db = client.db(database)

  if (isSingleTenantMigration) {
    console.log(`\ntenantName was specified, running migration for single tenant "${singleTenantName}"\n`)
  }

  if (!shouldRunMigration) {
    console.log('\n--list was passed as an argument, migration won\'t alter anything it will only list the templates that would be affected by the migration\n')
  }

  try {
    const { total: totalTemplatesWithExplicitPhantomWindows, groups: groupsTemplatesWithExplicitPhantomWindows } = await migrateTemplatesWithExplicitPhantomWindows(rootDb, db)
    const { total: totalTemplatesUsingDefaultPhantomWindows, groups: groupsTemplatesUsingDefaultPhantomWindows } = await migrateTemplatesUsingDefaultPhantomWindows(rootDb, db)
    const { total: totalTemplatesWithExplicitWkhtmltopdfWindows, groups: groupsTemplatesWithExplicitWkhtmltopdfWindows } = await migrateTemplatesWithExplicitWkhtmltopdfWindows(rootDb, db)

    const allTemplatesMigrated = totalTemplatesWithExplicitPhantomWindows + totalTemplatesUsingDefaultPhantomWindows + totalTemplatesWithExplicitWkhtmltopdfWindows

    if (allTemplatesMigrated === 0) {
      console.log('\nNo templates found to migrate')
    } else {
      console.log(`\n${[
        `- templates that explicitly used phantom windows: ${totalTemplatesWithExplicitPhantomWindows}`,
        `- templates that default to phantom windows (because it was default for old tenant): ${totalTemplatesUsingDefaultPhantomWindows}`,
        `- templates that explicitly used wkhtmltopdf windows: ${totalTemplatesWithExplicitWkhtmltopdfWindows}`
      ].join('\n')}`)

      console.log(`\ntotal templates ${shouldRunMigration ? 'migrated' : 'that need migration'}:`, allTemplatesMigrated)

      const allTenantsThatNeedMigration = new Set()

      for (const tenant of groupsTemplatesWithExplicitPhantomWindows.keys()) {
        allTenantsThatNeedMigration.add(tenant)
      }

      for (const tenant of groupsTemplatesUsingDefaultPhantomWindows.keys()) {
        allTenantsThatNeedMigration.add(tenant)
      }

      for (const tenant of groupsTemplatesWithExplicitWkhtmltopdfWindows.keys()) {
        allTenantsThatNeedMigration.add(tenant)
      }

      const tenantsMigrationSummary = []
      const migrationDetailsPath = path.join(__dirname, `ww-migration-details-${executionId}`)

      if (allTenantsThatNeedMigration.size > 0) {
        fs.mkdirSync(migrationDetailsPath, { recursive: true })
        console.log('\ncalculating tenants migration summary..')
      }

      for (const tenant of allTenantsThatNeedMigration) {
        const allTemplatesInTenant = []
        const types = []
        let total = 0

        const tRecord = await rootDb.collection('tenants').findOne({
          name: tenant
        }, {
          project: { _id: 1, email: 1 }
        })

        if (
          groupsTemplatesWithExplicitPhantomWindows.has(tenant) ||
          groupsTemplatesUsingDefaultPhantomWindows.has(tenant)
        ) {
          let phantomWindowsTotal = 0

          if (groupsTemplatesWithExplicitPhantomWindows.has(tenant)) {
            allTemplatesInTenant.push(...groupsTemplatesWithExplicitPhantomWindows.get(tenant))
            phantomWindowsTotal += groupsTemplatesWithExplicitPhantomWindows.get(tenant).length
          }

          if (groupsTemplatesUsingDefaultPhantomWindows.has(tenant)) {
            allTemplatesInTenant.push(...groupsTemplatesUsingDefaultPhantomWindows.get(tenant))
            phantomWindowsTotal += groupsTemplatesUsingDefaultPhantomWindows.get(tenant).length
          }

          total += phantomWindowsTotal
          types.push({ name: 'phantom-windows', total: phantomWindowsTotal })
        }

        if (groupsTemplatesWithExplicitWkhtmltopdfWindows.has(tenant)) {
          const wkhtmltopdfWindowsTotal = groupsTemplatesWithExplicitWkhtmltopdfWindows.get(tenant).length

          allTemplatesInTenant.push(...groupsTemplatesWithExplicitWkhtmltopdfWindows.get(tenant))

          total += wkhtmltopdfWindowsTotal
          types.push({ name: 'wkhtmltopdf-windows', total: wkhtmltopdfWindowsTotal })
        }

        fs.writeFileSync(path.join(migrationDetailsPath, `${tenant}.json`), JSON.stringify(allTemplatesInTenant, null, 2))
        tenantsMigrationSummary.push({ tenant, email: tRecord.email, total, types })
      }

      if (tenantsMigrationSummary.length > 0) {
        console.log(`\ntenants ${shouldRunMigration ? 'migrated' : 'that need migration'} summary:\n`)
      }

      // sort the summary from the tenant which has more templates to one with less
      tenantsMigrationSummary.sort((a, b) => {
        const totalA = a.total
        const totalB = b.total

        return totalB - totalA
      })

      for (const tMigrationSummary of tenantsMigrationSummary) {
        console.log(`- ${tMigrationSummary.tenant} (${tMigrationSummary.email}): ${tMigrationSummary.total} (${tMigrationSummary.types.map((type) => `${type.name}: ${type.total}`).join(', ')})`)
      }

      if (tenantsMigrationSummary.length > 0) {
        console.log(`\ndetails of templates that ${shouldRunMigration ? 'were migrated' : 'need migration'} can be found at: ${migrationDetailsPath}\n`)
      }
    }
  } finally {
    await client.close()
  }
}

run().then(() => {
  console.log('done')
}).catch((err) => {
  console.error('Error during query:')
  console.error(err)
})

async function migrateTemplatesWithExplicitPhantomWindows (rootDb, db) {
  console.log('started migration processing for templates with explicit phantom windows..')

  const tenantsQuery = {
    lastLogin: {
      $gte: refDateForTenantsLoginQuery
    }
  }

  if (isSingleTenantMigration) {
    tenantsQuery.name = singleTenantName
  }

  const tenants = await rootDb.collection('tenants').find(tenantsQuery).project({ _id: 1, name: 1 }).toArray()

  const explicitPhantomWindowsTemplates = new Map()
  let totalExplicitPhantomWindowsTemplates = 0

  let tCounter = 0

  for (const t of tenants) {
    tCounter++

    if (tCounter % 20 === 0) {
      console.log(`processing ${tCounter}/${tenants.length} tenants`)
    }

    const templates = await db.collection('templates').find({
      tenantId: t.name,
      recipe: 'phantom-pdf',
      'phantom.phantomjsVersion': /-windows$/
    }).toArray()

    const templatesToMigrate = []

    for (const template of templates) {
      let migratedBefore = false

      const migratedTemplateName = getMigrationTemplateName(template.name)

      const migratedTemplate = await db.collection('templates').findOne({
        tenantId: t.name,
        name: migratedTemplateName
      }, {
        project: { _id: 1, name: 1 }
      })

      migratedBefore = migratedTemplate != null

      if (!migratedBefore) {
        const templateMigrationInfoStored = {
          _id: template._id,
          shortid: template.shortid,
          name: template.name,
          migrationType: 'phantom-windows'
        }

        if (shouldRunMigration) {
          const newTemplate = await createMigrationPhantomTemplate(db, template)
          templateMigrationInfoStored.migrationResultEntity = newTemplate
        }

        templatesToMigrate.push(templateMigrationInfoStored)
      }
    }

    if (templatesToMigrate.length > 0) {
      totalExplicitPhantomWindowsTemplates += templatesToMigrate.length
      explicitPhantomWindowsTemplates.set(t.name, templatesToMigrate)
    }
  }

  console.log('done with migration for templates with explicit phantom windows!')

  return { total: totalExplicitPhantomWindowsTemplates, groups: explicitPhantomWindowsTemplates }
}

async function migrateTemplatesUsingDefaultPhantomWindows (rootDb, db) {
  console.log('started migration processing for templates using default phantom windows..')

  const tenantsQuery = {
    createdOn: {
      $lt: defaultPhantomjsChangeDate
    },
    lastLogin: {
      $gte: refDateForTenantsLoginQuery
    }
  }

  if (isSingleTenantMigration) {
    tenantsQuery.name = singleTenantName
  }

  const oldTenants = await rootDb.collection('tenants').find(tenantsQuery).project({ _id: 1, name: 1 }).toArray()

  console.log(`Found ${oldTenants.length} old tenant(s)`)

  const oldPhantomWindowsTemplates = new Map()
  let totalOldPhantomWindowsTemplates = 0

  let tCounter = 0

  for (const t of oldTenants) {
    tCounter++

    if (tCounter % 20 === 0) {
      console.log(`processing ${tCounter}/${oldTenants.length} tenants`)
    }

    const templates = await db.collection('templates').find({
      tenantId: t.name,
      recipe: 'phantom-pdf',
      $or: [{
        phantom: null
      }, {
        'phantom.phantomjsVersion': null
      }]
    }).toArray()

    const templatesToMigrate = []

    for (const template of templates) {
      let migratedBefore = false

      const migratedTemplateName = getMigrationTemplateName(template.name)

      const migratedTemplate = await db.collection('templates').findOne({
        tenantId: t.name,
        name: migratedTemplateName
      }, {
        project: { _id: 1, name: 1 }
      })

      migratedBefore = migratedTemplate != null

      if (!migratedBefore) {
        const templateMigrationInfoStored = {
          _id: template._id,
          shortid: template.shortid,
          name: template.name,
          migrationType: 'phantom-windows'
        }

        if (shouldRunMigration) {
          const newTemplate = await createMigrationPhantomTemplate(db, template)
          templateMigrationInfoStored.migrationResultEntity = newTemplate
        }

        templatesToMigrate.push(templateMigrationInfoStored)
      }
    }

    if (templatesToMigrate.length > 0) {
      totalOldPhantomWindowsTemplates += templatesToMigrate.length
      oldPhantomWindowsTemplates.set(t.name, templatesToMigrate)
    }
  }

  console.log('done with migration for templates using default phantom windows!')

  return { total: totalOldPhantomWindowsTemplates, groups: oldPhantomWindowsTemplates }
}

async function migrateTemplatesWithExplicitWkhtmltopdfWindows (rootDb, db) {
  console.log('started migration processing for templates with explicit wkhtmltopdf windows..')

  const tenantsQuery = {
    lastLogin: {
      $gte: refDateForTenantsLoginQuery
    }
  }

  if (isSingleTenantMigration) {
    tenantsQuery.name = singleTenantName
  }

  const tenants = await rootDb.collection('tenants').find(tenantsQuery).project({ _id: 1, name: 1 }).toArray()

  const explicitWkhtmltopdfWindowsTemplates = new Map()
  let totalExplicitWkhtmltopdfWindowsTemplates = 0

  let tCounter = 0

  for (const t of tenants) {
    tCounter++

    if (tCounter % 20 === 0) {
      console.log(`processing ${tCounter}/${tenants.length} tenants`)
    }

    const templates = await db.collection('templates').find({
      tenantId: t.name,
      recipe: 'wkhtmltopdf',
      'wkhtmltopdf.wkhtmltopdfVersion': /-windows$/
    }).toArray()

    const templatesToMigrate = []

    for (const template of templates) {
      let migratedBefore = false

      const migratedTemplateName = getMigrationTemplateName(template.name)

      const migratedTemplate = await db.collection('templates').findOne({
        tenantId: t.name,
        name: migratedTemplateName
      }, {
        project: { _id: 1, name: 1 }
      })

      migratedBefore = migratedTemplate != null

      if (!migratedBefore) {
        const templateMigrationInfoStored = {
          _id: template._id,
          shortid: template.shortid,
          name: template.name,
          migrationType: 'wkhtmltopdf-windows'
        }

        if (shouldRunMigration) {
          const newTemplate = await createMigrationWkhtmltopdfTemplate(db, template)
          templateMigrationInfoStored.migrationResultEntity = newTemplate
        }

        templatesToMigrate.push(templateMigrationInfoStored)
      }
    }

    if (templatesToMigrate.length > 0) {
      totalExplicitWkhtmltopdfWindowsTemplates += templatesToMigrate.length
      explicitWkhtmltopdfWindowsTemplates.set(t.name, templatesToMigrate)
    }
  }

  console.log('done with migration for templates with explicit wkhtmltopdf windows!')

  return { total: totalExplicitWkhtmltopdfWindowsTemplates, groups: explicitWkhtmltopdfWindowsTemplates }
}

async function createMigrationPhantomTemplate (db, template) {
  const newTemplate = {
    ...template
  }

  delete newTemplate._id
  delete newTemplate.shortid

  const phantomWindowsToLinuxStyle = '/* styles needed for migration from phantom-windows */\nbody { zoom: 0.75; }'

  newTemplate.shortid = nanoid(7)
  newTemplate.name = getMigrationTemplateName(newTemplate.name)
  newTemplate.content = addStyleToContent(newTemplate.content, phantomWindowsToLinuxStyle)
  newTemplate.phantom = newTemplate.phantom != null ? { ...newTemplate.phantom } : {}
  newTemplate.phantom.phantomjsVersion = '1.9.8'

  const result = await db.collection('templates').insertOne(newTemplate)

  return {
    _id: result.insertedId,
    shortid: newTemplate.shortid,
    name: newTemplate.name
  }
}

async function createMigrationWkhtmltopdfTemplate (db, template) {
  const newTemplate = {
    ...template
  }

  delete newTemplate._id
  delete newTemplate.shortid

  const wkhtmltopdfWindowsToLinuxStyle = '/* styles needed for migration from wkhtmltopdf-windows */\nbody { zoom: 0.8; }'

  newTemplate.shortid = nanoid(7)
  newTemplate.name = getMigrationTemplateName(newTemplate.name)
  newTemplate.content = addStyleToContent(newTemplate.content, wkhtmltopdfWindowsToLinuxStyle)
  newTemplate.wkhtmltopdf = newTemplate.wkhtmltopdf != null ? { ...newTemplate.wkhtmltopdf } : {}
  newTemplate.wkhtmltopdf.wkhtmltopdfVersion = '0.12.3'

  const result = await db.collection('templates').insertOne(newTemplate)

  return {
    _id: result.insertedId,
    shortid: newTemplate.shortid,
    name: newTemplate.name
  }
}

function addStyleToContent (content, newStyle) {
  const matches = [
    // when style tag already exists
    {
      getRegExpr: () => /(<style.*>)/m,
      replace: `$1\n${newStyle}\n`
    },
    // when not, we search for head tag
    {
      getRegExpr: () => /(<head.*>)/m,
      replace: `$1\n<style>\n${newStyle}\n</style>\n`
    },
    // when not, we search for html tag
    {
      getRegExpr: () => /(<html.*>)/m,
      replace: `$1\n<head>\n<style>\n${newStyle}\n</style>\n</head>\n`
    },
    // when not, we search for the first tag
    {
      getRegExpr: () => /(<.*>)/m,
      replace: `<style>\n${newStyle}\n</style>\n$1`
    }
  ]

  let result = content != null ? content : ''

  for (const match of matches) {
    if (match.getRegExpr().test(content)) {
      result = content.replace(match.getRegExpr(), match.replace)
      break
    }
  }

  return result
}

function getMigrationTemplateName (templateName) {
  return `${templateName}${migrationTemplatePostfix}`
}
