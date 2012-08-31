/////////////////////////////////////////////////////////////////////////////////////////
//
"use strict";

/////////////////////////////////////////////////////////////////////////////////////////
//
//  Module dependencies.
//
var express = require('express'),
    http    = require('http'),
    https   = require('https'),
    dgram   = require('dgram'),
    path    = require('path'),
    util    = require('util'),
    fs      = require('fs');

/////////////////////////////////////////////////////////////////////////////////////////
//
//  Configuration
//
var config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/notification-server.json')));
config.version = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))).version;
config.http.port = process.env.PORT || config.http.port,
config.https.options = {
    'port' : process.env.HTTPS_PORT || config.https.port,
    'key'  : fs.readFileSync(path.join(__dirname, config.https.key),   'utf8'),
    'cert' : fs.readFileSync(path.join(__dirname, config.https.cert),  'utf8')
};
config.udp.port = process.env.PORT || process.env.HTTPS_PORT || config.udp.port || config.http.port;

util.log('config: ' + util.inspect(config));

/////////////////////////////////////////////////////////////////////////////////////////
//
//  Global variable initialization
//
var app           = express();

/////////////////////////////////////////////////////////////////////////////////////////
//
// Express configuration for ALL environment
//
app.configure(function () {
    app.set('view engine', 'jade');
    app.set('views', path.join(__dirname, 'views'));
    
    // PASS Base64 data "as is"
    //
    app.use(function base64UrlencodedBodyParser(req, res, next) {
        if (req._body) return next();
        req.body = req.body || {};
        
        // ignore GET
        if ('GET' == req.method || 'HEAD' == req.method) return next();
        
        // check Content-Type
        if ('application/x-www-form-urlencoded' !== req.headers['content-type']) return next();
        
        // flag as parsed
        req._body = true;
        
        var body = '';
        req.setEncoding('utf8');
        req.on('data', function (chunk) {
            body =  body + chunk;
        });
        req.on('end', function () {
            var bodyParts = body.split(/&/);
            for (var index in bodyParts) {
                var pos   = bodyParts[index].indexOf('=');
                var key   = bodyParts[index].substr(0, pos);
                var value = bodyParts[index].substr(pos +1);
                req.body[key] = value;
            }
            next();
        });
    });
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    
    app.use(function logErrors(err, req, res, next) {
        util.log(err.stack);
        next(err);
    });
    
    app.use(function clientErrorHandler(err, req, res, next) {
        if (req.xhr) {
            res.send(500, { error: 'Something blew up!' });
        } else {
            next(err);
        }
    });
    
    app.use(function errorHandler(err, req, res, next) {
        res.status(500);
        res.render('error', { error: err });
    });
    
    app.use(express.favicon());
    app.use(express.static(path.join(__dirname, 'public')));
    
    app.param(function paramRegexExtractor(name, fn) {
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
});


/////////////////////////////////////////////////////////////////////////////////////////
//
// Express configuration for development on your local machine
//
app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

/////////////////////////////////////////////////////////////////////////////////////////
//
// Express configuration for production in HEROKU
//
app.configure('production', function () {
    //  var oneYear = 31557600000;
    //  app.use(express.static(__dirname, { maxAge: oneYear }));
    app.use(express.errorHandler());
});


/////////////////////////////////////////////////////////////////////////////////////////
//
//  Include router
//
require('./routes')(config, app);

if (config.https.active) {
    util.log("Express secure server starting on port " + config.https['port']);
    https.createServer(config.https.options, app).listen(config.https.port, function(){
      util.log("Express secure server listening on port " + config.https['port']);
    });
}

if (config.http.active) {
    util.log("Express server starting on port " + config.http['port']);
    http.createServer(app).listen(config.http.port, function(){
      util.log("Express server listening on port " + config.http['port']);
    });
}


/////////////////////////////////////////////////////////////////////////////////////////
//
if (config.udp.active) {
    var udpServer   = dgram.createSocket('udp4'),
        syslogRegex = /<([^>]+)>\s*(\d+\s+[A-Z][a-z]+\s+\d+:\d+:\d+)\s+([^\s]+)\s+(.*)/i; // <1>1 Jul 08:01:00 server.domain.name {json here}
    
    udpServer.on('message', function(msg, rinfo) {
      util.log('udpServer got: ' + msg + ' from ' + rinfo.address + ':' + rinfo.port);
      var logline = syslogRegex.exec(msg);
      var loginfo = {
          client_ip: rinfo.address,
          pri: logline[1] || 0,
          timestamp: logline[2] || 'unknown', // new Date(logline[2]),
          hostname: logline[3]  || 'unknown',
          message: logline[4]   || '{}'
      };
      var notification = JSON.parse(loginfo.message);
      util.log('server got: ' + msg + ' from ' + rinfo.address + ':' + rinfo.port + '|' + util.inspect(loginfo));
    
      //notifier.send({'title':notification.title, 'message':notification.message});
    });
    
    udpServer.on('listening', function() {
        var address = udpServer.address();
        util.log('DGRAM listening on ' + address.address + ':' + address.port);
    });
    
    udpServer.bind(config.udp.port);
}    
