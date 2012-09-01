var moduleName = 'udpserver',
    util       = require('util');

module.exports = function (config, server) {
    var parsingRegex_ = config.parsingRegex || /<([^>]+)>\s*(\d+\s+[A-Z][a-z]+\s+\d+:\d+:\d+)\s+([^\s]+)\s+(.*)/i; // <1>1 Jul 08:01:00 server.domain.name {json here}
    var routes_  = {};
    var debug_   = (config && config[moduleName] && config[moduleName].debug)   ? config[moduleName].debug   : false;
    var info_    = (config && config[moduleName] && config[moduleName].info)    ? config[moduleName].info    : false;
    var warning_ = (config && config[moduleName] && config[moduleName].warning) ? config[moduleName].warning : false;

    server.on('message', function(msg, clientInfo) {
        if (debug_) util.log(moduleName+'|UDP|client='+clientInfo.address+':'+clientInfo.port+'|message='+msg);
        try {
            var parsedMessage = parsingRegex_.exec(msg),
            udpPacket = {
                client    : clientInfo.address,
                port      : clientInfo.port,
                priority  : parsedMessage[1] || 0,
                timestamp : parsedMessage[2] || 'unknown', // new Date(logline[2]),
                hostname  : parsedMessage[3] || 'unknown',
                message   : parsedMessage[4] || '{}'
            };
            if (debug_) util.log(moduleName+'|UDP|client='+udpPacket.client+':'+udpPacket.port+'|parsed-message='+util.inspect(udpPacket));
            var object   = null,
                callback = null;
            try {
                object   = JSON.parse(udpPacket.message);
                callback = routes_[object.url];
            } catch (parsingJSONException) {
                if (callback)
                    return callback(parsingJSONException);
                else if (warning_)
                    util.log(moduleName+'|UDP|client='+udpPacket.client+':'+udpPacket.port+'|parsed-message='+util.inspect(udpPacket)+'|parsing-JSON-Exception='+util.inspect(parsingJSONException));
                return parsingJSONException;
            }
            if (callback) {
                callback(null, { 'header' : udpPacket, 'data' : object });
            } else if (info_) 
                util.log(moduleName+'|UDP|client='+udpPacket.lient+':'+udpPacket.port+'|parsed-message='+util.inspect(udpPacket)+'|message-ignored-reason=unknown-destination');
        } catch (parsingSyslogException) {
            if (warning_)
                util.log(moduleName+'|UDP|client='+clientInfo.address+':'+clientInfo.port+'|message=' + msg + '|parsing-syslog-Exception='+util.inspect(parsingSyslogException));
            return parsingSyslogException
        }
    });
    
    function add(route, callback) {
        routes_[route] = callback;
    }
    
    return {
        'add' : add
    };
    
};
