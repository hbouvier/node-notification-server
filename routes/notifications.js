var moduleName    = 'notifications',
    express       = require('express'),
    util          = require('util'),
    fs            = require('fs'),
    notifications = require('../../modules/node-notification/notification'),
    appInfo       = JSON.parse(fs.readFileSync(__dirname + "/../package.json"));
    

// app.param('name', /^.*$/);
// app.get('/content/:name', /*auth,*/ routes.content);



module.exports = function (serverConfig, app, io, socketIoClient, udpRouter) {
    var config_        = serverConfig.routes[moduleName],
        debug_         = config_.debug        || false,
        context_       = config_.context      || '',
        version_       = config_.version      || '0.0.0',
        serverVersion_ = serverConfig.version || '0.0.0',
        auth_          = express.basicAuth(config_.auth.user, config_.auth.password),
        Persistence    = require('../../modules/node-persistence/persistence')(config_),
        persistence    = new Persistence(config_);

    var socketIoServer;
    
    config_.persistence.URL = process.env.REDISTOGO_URL ? process.env.REDISTOGO_URL : process.env.REDIS_URL ? process.env.REDIS_URL : config_.persistence.URL;
    util.log('io='+ io);
    if (serverConfig.socketioclient.active) {
        socketIoClient.on('connect', function () {
            if (serverConfig.socketioclient.debug) util.log(moduleName+'|socket.io.client|connect');
            // socketIoClient.send('hi there!');
        });
        
        socketIoClient.on(moduleName + '.all', function (msg) {
            if (serverConfig.socketioclient.debug) util.log(moduleName+'|socket.io.client|all|' + util.inspect(msg));
            var object = JSON.parse(msg);
            notifications.send({'title':object.title, 'message':object.message}, function (err, output) {
            });        
        });
    }
    
    io.sockets.on('connection', function (socket) {
        socketIoServer = socket;
    });
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //
    // version
    //
    function version(req, res) {
        if (debug_) util.log(context_ + 'version');
        req = req;
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({'server-version':serverVersion_, 'context':context_, 'context-version':version_}));
    }
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //
    // show
    //
    function show(req, res) {
        if (debug_) util.log(context_ + 'show');
        notifications.send({'title':req.query.title, 'message':req.query.message}, function (err, output) {
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end('{"application":"'+appInfo.name+'","version":"'+appInfo.version+'","status":"' + 'OK' + '"}');
        });
    }



    function saveNotification(notice, callback) {
        util.log('io2='+io);
        persistence.set(moduleName + ':' + notice.hostname, JSON.stringify(notice), notice.ttl, callback);
        socketIoServer.emit(moduleName + '.all', JSON.stringify(notice));
        socketIoServer.emit(moduleName + '.' + notice.hostname, JSON.stringify(notice));
    }
    
    function getClientAddress(req) {
        return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }
    
    function getEpoch() {
        return (new Date()).getTime() / 1000;
    }
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //
    // REST - POST
    //
    function post(req, res) {
        if (debug_) util.log(context_ + ' - POST');
        saveNotification(
            { 'hostname'     : getClientAddress(req), // To avoid spoofing
              'servername'   : req.query.servername   || getClientAddress(req),
              'environment'  : req.query.environment  || 'none',
              'severity'     : req.query.severity     || 0,
              'repeatcount'  : req.query.repreatcount || 1,
              'repeatperiod' : req.query.repeatperiod || 0,
              'timestamp'    : req.query.timestamp    || getEpoch(),
              'title'        : req.query.title        || 'Title',
              'message'      : req.query.message      || 'Unknown',
              'action'       : req.query.action       || 'none',
              'actiondata'   : req.query.actiondata   || '',
              'ttl'          : req.query.ttl          || 24 * 60 * 60 * 1000 // 24 hours
            }, function (err, result) {
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end('{"application":"'+appInfo.name+'","version":"'+appInfo.version+'","status":"' + 'OK' + '"}');
        });
    }
    app.post(context_, post);

    /////////////////////////////////////////////////////////////////////////////////////////
    //
    // public HTTP(s)  routes
    //
    app.get(context_ + 'version', auth_, version);
    app.post(context_ + 'show', show);
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //
    // public DGRAM routes
    //
    if (udpRouter) {
        udpRouter.add(context_ + 'show', function (err, datagram) {
            util.log(context_ + 'show|client='+datagram.header.client + ':' + datagram.header.port + '|title='+datagram.data.title + '|message='+datagram.data.message);
            notifications.send({'title':datagram.data.title, 'message':datagram.data.message}, function (err, output) {
                if (err)
                    return err;
            });
        });
    }
};

