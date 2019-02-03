const puppeteer = require('puppeteer')
console.log('launch')
puppeteer.launch({
  executablePath: 'google-chrome-unstable',
  args: ['--no-sandbox', '--disable-dev-shm-usage'/*, '--user-data-dir=/mytemp'*/]
}).then(() => console.log('launched')).catch(console.error)