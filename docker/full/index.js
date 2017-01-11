/*var fs = require('fs'),
    convertFactory = require('electron-html-to'),*/
    http = require('http')
/*
var conversion = convertFactory({
  converterPath: convertFactory.converters.PDF
});*/


var electron = require('electron-prebuilt');
var spawn = require('child_process').spawn


const server = http.createServer((req, res) => {
  /*conversion({ html: '<h1>Hello World</h1>' }, function(err, result) {
    if (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'text/plain')

      return res.end(err.stack) 
    }

    console.log(result.numberOfPages);
    result.stream.pipe(res);
  });*/

  if (req.method !== 'GET' || req.url !== '/' ) {
    return res.end(0)
  }

  console.log('request')


  var ch = spawn(electron, ['--version'], {
    env: {
      DISPLAY: process.env.DISPLAY
    }
  })

  var result = ''
  function data(d) {
    console.log(d.toString())
    result += d
  }

  ch.stdout.on('data', data);
  ch.stderr.on('data', data);
  ch.on('close', function () {
    res.end(result)
  });
});


server.listen(5488)
console.log('running')