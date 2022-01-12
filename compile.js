const fs = require('fs')

if (process.platform === 'win32') {
    fs.writeFileSync('jsreport-win.zip', 'win')
    return
}

if (process.platform === 'darwin') {
    fs.writeFileSync('jsreport-osx.tar.gz', 'osx')
    return
}

fs.writeFileSync('jsreport-linux.tar.gz', 'linux')
