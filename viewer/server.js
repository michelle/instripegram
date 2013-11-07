var express = require('express');
var app = express.createServer();
var fs = require('fs');

var BinaryServer = require('binaryjs').BinaryServer;

var id = 0;
var viewer;

// We were using BinaryJS for images before, but that didn't really scale. We'll
// just use it now for messaging since it's already here.
var server = new BinaryServer({port: 9001});
// Wait for new user connections
server.on('connection', function(client) {
  client.on('stream', function(stream, meta){ 
    if (meta && meta.type == "viewer") {
      viewer = stream;
    }
  });
});

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}

app.configure(function() {
  app.use(express.bodyParser({uploadDir: __dirname + '/static/img'}));
  app.use(allowCrossDomain);
  app.use(express.static(__dirname + '/static/'));
});

app.post('/image', function(req, res) {
  // Heks
  var name = req.files.image.path.split('/static').pop();
  if (viewer) {
    console.log('sending to client...' + name);
    viewer.write(name);
  }
  res.send(200);
});

app.listen(8000);
