var homepage      = require('./homepage')
  , notifications = require('./notifications');

module.exports = function (config, app, udpRouter) {

  /////////////////////////////////////////////////////////////////////////////////////////
  //
  // public homepage routes
  homepage(config, app, udpRouter);

  /////////////////////////////////////////////////////////////////////////////////////////
  //
  // public notifications routes
  notifications(config, app, udpRouter);
};


