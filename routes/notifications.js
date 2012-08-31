var moduleName    = 'notifications',
    express       = require('express'),
    util          = require('util'),
    fs            = require('fs'),
    notifications = require('../../modules/node-notification/notification'),
    appInfo       = JSON.parse(fs.readFileSync(__dirname + "/../package.json"));
    

// app.param('name', /^.*$/);
// app.get('/content/:name', /*auth,*/ routes.content);



module.exports = function (serverConfig, app) {
    var config_        = serverConfig.routes[moduleName],
        debug_         = config_.debug        || false,
        context_       = config_.context      || '',
        version_       = config_.version      || '0.0.0',
        serverVersion_ = serverConfig.version || '0.0.0',
        auth_           = express.basicAuth(config_.auth.user, config_.auth.password);
    
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
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //
    // public routes
    //
    app.get(context_ + 'version', auth_, version);
    app.post(context_ + 'show', show);
};
