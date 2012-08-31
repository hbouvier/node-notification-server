var moduleName = 'homepage',
    express    = require('express'),
    util       = require('util');

// app.param('name', /^.*$/);
// app.get('/content/:name', /*auth,*/ routes.content);



module.exports = function (config, app) {
    
    var debug_   = config.routes[moduleName].debug   || false;
    var context_ = config.routes[moduleName].context || '';
    var version_ = config.routes[moduleName].version || '0.0.0';
    var auth     = express.basicAuth(config.routes[moduleName].auth.user, config.routes[moduleName].auth.password);
    
    /////////////////////////////////////////////////////////////////////////////////////////
    //
    // version
    //
    function version(req, res) {
        if (debug_) util.log(context_ + 'version');
        req = req;
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({'server-version':config.version, 'context':context_, 'context-version':version_}));
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
    app.get(context_ + 'version', auth, version);
    app.get(context_, index);
};
