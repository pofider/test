function foo (merge) {
  return { merge }
}
console.log(foo())
/* const client = require('@jsreport/nodejs-client')('http://localhost:5488')
const fs = require('fs')
const html = fs.readFileSync('main.html').toString()
client.render({
   template: {
    content: html,
    engine: 'none',
    recipe: 'chrome-pdf'
  }
  template: {
    name: 'test-bulk-template'
  },
  data: JSON.parse(fs.readFileSync('data.json').toString())
}).then((r) => r.body())
  .then((b) => fs.writeFileSync('out.pdf', b))
  .catch(console.error)
*/

const fs = require('fs')

console.log(fs.readFileSync('c:/work/cidset').length)

// docker run -p 5488:5488 -e chrome_strategy=dedicated-process jsreport/jsreport:3.7.1
docker run -p 5488:5488 jsreport/jsreport:3.7.1-full