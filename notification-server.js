"use strict";
/////////////////////////////////////////////////////////////////////////////////////////
//
//  Module dependencies.
//
var express       = require('express'),
    http          = require('http'),
    https         = require('https'),
    path          = require('path'),
    routes        = require('./routes'),
    roles         = require('../Certificates/auth').roles,
    auth          = express.basicAuth(roles.users[0].user, roles.users[0].password),
    port          = process.env.PORT  || 3031,
    sport         = process.env.SPORT || 3032,
    dport         = process.env.DPORT || 3031,
    app           = express(),
    fs            = require('fs'),
    notifier      = require('../modules/node-notification/notification'),
    appStatus     = 'OK',
    appInfo       = JSON.parse(fs.readFileSync(__dirname + "/package.json")),
    dgram = require('dgram'),
    util  = require('util'),
    server,
    syslog_re = /<([^>]+)>\s*(\d+\s+[A-Z][a-z]+\s+\d+:\d+:\d+)\s+([^\s]+)\s+(.*)/i; // <5>21 Jun 19:19:38 mt-nme-cosnme2.nuance.com MMFBanking|IP=10.3.28.140|customerName=Nuance|applicationName=MMFBanking|version=1.0000|callerID=DB683245-D8BA-4453-8136-831325EDC6E3|OSName=iPhoneOS|OSVersion=4.2.1|modelName=iPodtouch|hardware=4G|Resolution=640.00x960.00 from 10.3.39.106:50231



server = dgram.createSocket('udp4');
server.on('message', function(msg, rinfo) {
  util.log('server got: ' + msg + ' from ' + rinfo.address + ':' + rinfo.port);
  var logline = syslog_re.exec(msg);
  var loginfo = {
      client_ip: rinfo.address,
      pri: logline[1] || 0,
      timestamp: logline[2] || 'unknown', // new Date(logline[2]),
      hostname: logline[3]  || 'unknown',
      message: logline[4]   || '{}'
  };
  var notification = JSON.parse(loginfo.message);
  util.log('server got: ' + msg + ' from ' + rinfo.address + ':' + rinfo.port + '|' + util.inspect(loginfo));
  //util.log(util.inspect(loginfo));

  notifier.send({'title':notification.title, 'message':notification.message});
});

server.on('listening', function() {
    var address = server.address();
    util.log('DGRAM listening on ' + address.address + ':' + address.port);
});

server.bind(dport);
    

var options = {
      key:  fs.readFileSync(__dirname + '/../Certificates/node-hbo-key.pem',  'utf8'),
      cert: fs.readFileSync(__dirname + '/../Certificates/node-hbo-cert.pem', 'utf8')
    };

app.configure(function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.set('port',  port);
  app.set('sport', sport);

  app.param(function(name, fn){
    if (fn instanceof RegExp) {
      return function(req, res, next, val) {
        res=res;
        var captures;
        if ((captures = fn.exec(String(val))) !== null) {
          req.params[name] = captures;
          next();
        } else {
          next('route');
        }
      };
    }
  });

  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.engine('jade', require('jade').__express);
  app.use(express.favicon());
  //app.use(express.logger('dev')); // crash
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', auth, routes.index);
app.get('/index.html', auth, routes.index);

app.param('id', /^\d+$/); 
app.get('/documents/:id', auth, routes.documents);

app.param('name', /^.*$/); 
app.get('/content/:name', auth, routes.content);

function errorHandler(err, req, res, next) {
  req = req; next = next;
  res.status(500);
  res.render('error', { error: err });
}
function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.send(500, { error: 'Something blew up!' });
  } else {
    next(err);
  }
}
/////////////////////////////////////////////////////////////////////////////////////////
//
// Web Service Command
//
app.get('/ws/version', function (req, res) { req = req;
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end('{"application":"'+appInfo.name+'","version":"'+appInfo.version+'","status":"' + appStatus + '"}');
});

app.get('/ws/notify', function (req, res) { req = req;
    notifier.send({'title':req.query.title, 'message':req.query.message}, function (err, output) {
      res.writeHead(200, {"Content-Type": "application/json"});
      res.end('{"application":"'+appInfo.name+'","version":"'+appInfo.version+'","status":"' + appStatus + '"}');
    });
});


https.createServer(options, app).listen(app.get('sport'), function(){
  console.log("Express secure server listening on port " + app.get('sport'));
});


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

