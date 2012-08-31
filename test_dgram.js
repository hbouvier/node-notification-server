var dgram  = require('dgram'),
    util   = require('util'),
    client = dgram.createSocket("udp4");

var message = new Buffer('<1> 19 Aug 21:44:45 anonymous-server {"url":"/notifications/show","title":"Title","message":"Yo bob!"}');

client.send(message, 0, message.length, 3333, '127.0.0.1',
  function (err, bytes) {
    if (err) {
      client.close();
      throw err;
    }
    util.log("Wrote " + bytes + " bytes to socket.");
    client.close();
});
