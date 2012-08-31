var util = require('util');

module.exports = function (config, server) {
    var parsingRegex_ = config.parsingRegex || /<([^>]+)>\s*(\d+\s+[A-Z][a-z]+\s+\d+:\d+:\d+)\s+([^\s]+)\s+(.*)/i; // <1>1 Jul 08:01:00 server.domain.name {json here}
    var routes_ = {};
    
    server.on('message', function(msg, rinfo) {
      util.log('node-notifications-server|UDP|client='+rinfo.address+':'+rinfo.port+'|message='+msg);
      try {
          var logline = parsingRegex_.exec(msg);
          var loginfo = {
              client : rinfo.address,
              port   : rinfo.port,
              pri: logline[1] || 0,
              timestamp: logline[2] || 'unknown', // new Date(logline[2]),
              hostname: logline[3]  || 'unknown',
              message: logline[4]   || '{}'
          };
          util.log('node-notifications-server|UDP|client='+rinfo.address+':'+rinfo.port+'|parsed-message='+util.inspect(loginfo));
          try {
            var object = JSON.parse(loginfo.message);
            var callback = routes_[object.url];
            if (callback) {
                callback(null, { 'header' : loginfo, 'data' : object });
            } else {
              util.log('node-notifications-server|UDP|client='+rinfo.address+':'+rinfo.port+'|parsed-message='+util.inspect(loginfo)+'|message-ignored-reason=unknown-destination');
            }
          } catch (parsingJSONException) {
              util.log('node-notifications-server|UDP|client='+rinfo.address+':'+rinfo.port+'|parsed-message='+util.inspect(loginfo)+'|parsing-JSON-Exception='+util.inspect(parsingJSONException));
          }
      } catch (parsingSyslogException) {
          util.log('node-notifications-server|UDP|client='+rinfo.address+':'+rinfo.port+'|message=' + msg + '|parsing-syslog-Exception='+util.inspect(parsingSyslogException));
      }
      
    });
    
    function add(route, callback) {
        routes_[route] = callback;
    }
    
    return {
        'add' : add
    };
    
};

//              notifications.send({'title':object.title, 'message':object.message});
