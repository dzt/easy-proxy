var config = require('../config');
var DigitalOcean = require('do-wrapper'),
    api = new DigitalOcean(config.digital_ocean_api_key, '9999');

api.accountGetKeys({}, function(err, resp, body) {
  if (err) {
    console.log(err)
  }
  console.log(body)
});
