var jsreport = require('jsreport')()

var date = new Date().getTime()
jsreport.on('express-configure', function (app) {
   app.get('/api/test', function (req, res) {
     res.send('4 - ' + date)
   })
})

jsreport.init(function () {


  // running
}).catch(function (e) {
  // error during startup
  console.error(e.stack)
  process.exit(1)
})
