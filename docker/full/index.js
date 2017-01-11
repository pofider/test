var fs = require('fs'),
    convertFactory = require('electron-html-to'),
    http = require('http')

var conversion = convertFactory({
  converterPath: convertFactory.converters.PDF
});


const server = http.createServer((req, res) => {
  console.log('request')
  conversion({ html: '<h1>Hello World</h1>' }, function(err, result) {
    if (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'text/plain')

      return res.end(err.stack) 
    }

    console.log(result.numberOfPages);
    result.stream.pipe(res);
  });
});


server.listen(5488)
console.log('running')