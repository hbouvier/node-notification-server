var moduleName = 'homepage',
    express    = require('express'),
    util       = require('util');

// app.param('name', /^.*$/);
// app.get('/content/:name', /*auth,*/ routes.content);



module.exports = function (serverConfig, app, io, udpRouter) {
    var config_        = serverConfig.routes[moduleName],
        debug_         = config_.debug   || false,
        context_       = config_.context || '',
        version_       = config_.version || '0.0.0',
        serverVersion_ = serverConfig.version       || '0.0.0.0',
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
    // index
    //
    function index(req, res) {
        if (debug_) util.log(context_);
        res.render('index', { title: 'Express' });
    }
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //
    // public routes
    //
    app.get(context_ + 'version', auth_, version);
    app.get(context_, index);
};
