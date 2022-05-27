const jsreport = require('jsreport')()
const migratedResourcesToAssets = require('./migrateResourcesToAssets')
if (process.env.JSREPORT_CLI) {
  // export jsreport instance to make it possible to use jsreport-cli
  module.exports = jsreport
} else {
  jsreport.init().then(() => {
    return migratedResourcesToAssets(jsreport)
    // running
  }).catch((e) => {
    // error during startup
    console.error(e.stack)
    process.exit(1)
  })
}
