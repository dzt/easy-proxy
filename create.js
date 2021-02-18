const randomstring = require('randomstring')
const DigitalOcean = require('do-wrapper').default
const eSettings = require('electron-settings')
const request = require('request')
const _ = require('underscore')
const ipcMain = require('electron').ipcMain

var task = function(win, info, settings, no, callback) {
    var sender = win.webContents;
    var ssh_key_id = null;
    var id = null;
    var stopped = false;

    api = new DigitalOcean(eSettings.getSync('do_api_key'), '9999')
    var host = null;

    ipcMain.on('stopTasks', function(event) {
        if (stopped == false) {
            sender.send('updateMonitor', {
                no: no,
                msg: 'Cancelled',
                username: info.username,
                password: info.password,
                ip: 'n/a',
                error: true
            });
            stopped = true
        }
    });

    sender.send('updateMonitor', {
        no: no,
        msg: 'Started',
        username: info.username,
        password: info.password,
        ip: 'n/a',
        error: false
    });

    createDroplet();

    function createDroplet() {

        sender.send('updateMonitor', {
            no: no,
            msg: `Creating Droplet`,
            username: info.username,
            password: info.password,
            ip: 'n/a',
            error: false
        });

        var dropletName = randomstring.generate(14) + '-ep';

        var dropletData = {
            name: dropletName,
            region: info.region,
            size: '512mb',
            image: parseInt(info.slug),
            ssh_keys: [ssh_key_id],
            monitoring: true,
            user_data:
              '#!/bin/bash \n' +
              'yum install squid wget httpd-tools -y &&' +
              'touch /etc/squid/passwd &&' +
              `htpasswd -b /etc/squid/passwd ${info.username} ${info.password} &&` +
              'wget -O /etc/squid/squid.conf https://raw.githubusercontent.com/dzt/easy-proxy/master/confg/userpass/squid.conf --no-check-certificate &&' +
              'touch /etc/squid/blacklist.acl &&' +
              'systemctl restart squid.service && systemctl enable squid.service &&' +
              'iptables -I INPUT -p tcp --dport 3128 -j ACCEPT &&' +
              'iptables-save'
        };

/*
        var dropletData = {
            name: dropletName,
            region: info.region,
            size: '512mb',
            image: parseInt(info.slug),
            ssh_keys: [ssh_key_id],
            monitoring: true,
            user_data:
              '#!/bin/bash \n' +
              'yum install squid wget httpd-tools -y &&' +
              //'touch /etc/squid/passwd &&' +
              //`htpasswd -b /etc/squid/passwd ${info.username} ${info.password} &&` +
              'wget -O /etc/squid/squid.conf https://raw.githubusercontent.com/dzt/easy-proxy/master/confg/nouserpass/squid.conf --no-check-certificate &&' +
              'touch /etc/squid/blacklist.acl &&' +
              'systemctl restart squid.service && systemctl enable squid.service &&' +
              'iptables -I INPUT -p tcp --dport 3128 -j ACCEPT &&' +
              'iptables-save'
        };

*/
        console.log(dropletData);

        api.dropletsCreate(dropletData, function(err, resp, body) {
            if (err) {
                sender.send('updateMonitor', {
                    no: no,
                    msg: 'An error occured while trying to create your droplet.',
                    username: info.username,
                    password: info.password,
                    ip: 'n/a',
                    error: true
                });
                console.log(`[${no}] Error creating droplet.`);
                console.log(err);
                return callback(null, true);
            }

            setTimeout(function() {

                if (stopped) {
                    destroyDroplet(id, api, function(err, resp) {
                        if (err) {
                            return callback(null, true);
                        }
                        return callback(null, true);
                    });
                }

                api.dropletsGetAll({}, function(err, resp, body) {

                    id = _.findWhere(resp.body.droplets, {
                        name: dropletName
                    }).id

                    host = _.findWhere(resp.body.droplets, {
                        name: dropletName
                    }).networks.v4[0].ip_address

                    var para = null;

                    if (eSettings.getSync('ssh_passphrase') != null) {
                        para = eSettings.getSync('ssh_passphrase');
                    }

                    if (stopped) {
                        destroyDroplet(id, api, function(err, resp) {
                            if (err) {
                                return callback(null, true);
                            }
                            return callback(null, true);
                        });
                    }

                    if (stopped) {
                        destroyDroplet(id, api, function(err, resp) {
                            if (err) {
                                return callback(null, true);
                            }
                            return callback(null, true);
                        });
                    } else {
                        sender.send('updateMonitor', {
                            no: no,
                            msg: `Droplet Created`,
                            username: info.username,
                            password: info.password,
                            ip: host,
                            error: false
                        });
                    }

                        console.log("http://" + info.username + ":" + info.password + "@" + host + ":" + '3128')


                        var count = 119;
                        for (var i = 0; i < 119; i++) {

                          setTimeout(function() {
                            sender.send('updateMonitor', {
                                no: no,
                                msg: `Testing Proxy in ${count}s`,
                                username: info.username,
                                password: info.password,
                                ip: host,
                                error: false
                            });
                            count--;
                          }, 1000*i);

                        }


                        setTimeout(function() {
                            request({
                                method: 'get',
                                url: 'https://google.com/',
                                proxy: "http://" + info.username + ":" + info.password + "@" + host + ":" + '3128',
                                gzip: true,
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3107.4 Safari/537.36'
                                }
                            }, (error, resp, body) => {

                                if (error) {
                                    console.log(error);
                                    sender.send('updateMonitor', {
                                        no: no,
                                        msg: `Proxy Invalid, destroying droplet.`,
                                        username: info.username,
                                        password: info.password,
                                        ip: host,
                                        error: true
                                    });

                                    destroyDroplet(id, api, function(err, resp) {
                                        if (err) {
                                            sender.send('updateMonitor', {
                                                no: no,
                                                msg: `Error Occured while destroying droplet due to bad proxy Connection.`,
                                                username: info.username,
                                                password: info.password,
                                                ip: host,
                                                error: true
                                            });
                                            return callback(null, true);
                                        }

                                        sender.send('updateMonitor', {
                                            no: no,
                                            msg: `Droplet Destroyed due to bad proxy connection.`,
                                            username: info.username,
                                            password: info.password,
                                            ip: host,
                                            error: true
                                        });

                                        return callback(null, true);

                                    });

                                } else {
                                    sender.send('updateMonitor', {
                                        no: no,
                                        msg: `Created!`,
                                        username: info.username,
                                        password: info.password,
                                        ip: host,
                                        error: false
                                    });

                                    console.log(`[${no}] Created!`);
                                    return callback(null, true);
                                }

                            });
                        }, 120000);

                });


            }, 60000);

        });


    }

}

function destroyDroplet(id, api, cb) {
    api.dropletsDelete(id, function(err, resp, body) {
        if (err) {
            return cb(true, null);
        }
        return cb(null, true)
    });
}

module.exports = {
    task: task
};
