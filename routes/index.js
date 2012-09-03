var homepage      = require('./homepage'),
    notifications = require('./notifications');

module.exports = function (config, app, io, socketIoClient, udpRouter) {

  /////////////////////////////////////////////////////////////////////////////////////////
  //
  // public homepage routes
  homepage(config, app, io, socketIoClient, udpRouter);

  /////////////////////////////////////////////////////////////////////////////////////////
  //
  // public notifications routes
  notifications(config, app, io, socketIoClient, udpRouter);
};


