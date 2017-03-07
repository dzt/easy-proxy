var config = require('./config');
var SSH = require('simple-ssh');
var randomstring = require("randomstring");
var _ = require('underscore');
var async = require('async');
var prompt = require('prompt');
require('console.table');
prompt.message = 'easy-proxy'


// centos 7
var proxy_count = 0
var create = []

var DigitalOcean = require('do-wrapper'),
    api = new DigitalOcean(config.digital_ocean.api_key, '9999');

prompt.get([{
      name: 'count',
      required: true,
      description: '# of Proxies to Make'
    }], function (err, result) {
    if (err) {
      process.exit()
    }
    proxy_count = parseInt(result.count);
    for (var i=0; i < proxy_count; i++) {
      var port = Math.floor(Math.random() * 6500) + 2000

      var username = randomstring.generate({
        length: 7,
        charset: 'alphabetic',
        capitalization: 'lowercase'
      });

      var password = randomstring.generate({
        length: 14,
        charset: 'alphabetic',
        capitalization: 'lowercase'
      });

      create.push({
        username: username,
        password: password,
        port: port
      })

    }
    console.log(`Creating proxies | ${proxy_count}`)
    if (config.provider = 'digital_ocean') {
      makeDO()
    } else {
      console.log('Provider undefined')
      process.exit();
    }
});


var created = []

function makeDO() {
  async.every(create, function(info, callback) {
    var dropletName = randomstring.generate(14);
    var dropletData = {
        name: dropletName,
        region: config.digital_ocean.region,
        size: '512mb',
        image: 'centos-7-0-x64',
        ssh_keys: [config.digital_ocean.ssh_key_id],
        backups: false,
        ipv6: false,
        user_data: null,
        private_networking: false,
        volumes: null,
        tags: null
    }
    api.dropletsCreate(dropletData, function(err, resp, body) {
        if (err) {
          return callback(err, null)
        }
        setTimeout(function() {
          api.dropletsGetAll({}, function(err, resp, body) {

            var id = _.findWhere(resp.body.droplets, {
              name: dropletName
            }).id

            var host = _.findWhere(resp.body.droplets, {
              name: dropletName
            }).networks.v4[0].ip_address

            var ssh = new SSH({
                host: host,
                user: 'root',
                key: require('fs').readFileSync(config.digital_ocean.rsa_id_path),
                passphrase: config.digital_ocean.ssh_passphrase
            });

            ssh
                .exec('yum install squid httpd-tools -y')
                .exec('touch /etc/squid/passwd')
                .exec(`htpasswd -b /etc/squid/passwd ${info.username} ${info.password}`)
                .exec(`wget -O /etc/squid/squid.conf https://raw.githubusercontent.com/dzt/easy-proxy/master/confg/squid.conf --no-check-certificate`)
                .exec(`touch /etc/squid/blacklist.acl`)
                //.exec(`sed "1s/http_port 3128/http_port ${info.port}/g" /etc/squid/squid.conf`)
                .exec(`systemctl restart squid.service && systemctl enable squid.service`)
                .exec(`iptables -I INPUT -p tcp --dport 3128 -j ACCEPT`)
                .exec(`iptables-save`)
                .start();

                created.push({
                  'IP/Host': host,
                  'Port': '3128',
                  'Username': info.username,
                  'Password': info.password
                });

                callback(null, {ip:host, user: info.username, pass: info.password})

          });

        }, 60000);
      });

  }, function(err, result) {
      if (err) {
        return console.log(err.message)
      }
      console.log('\n')
      console.table(created);
  });
}
