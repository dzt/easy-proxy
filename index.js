const config = require('./config');
const randomstring = require('randomstring');
const prompt = require('prompt');
const async = require('async');
const node_ssh = require('node-ssh');
const DigitalOcean = require('do-wrapper');
const fs = require('fs');
const ssh = new node_ssh();
require('console.table');

api = new DigitalOcean(config.digital_ocean.api_key, '9999');

prompt.get([{
  name: 'type',
  required: true,
  description: 'Proxy type? (PW/IP)'
}, {
  name: 'count',
  required: true,
  description: 'Number of proxies to make'
}], (err, result) => {
  if (err) {
    process.exit();
  }
  proxyCount = parseInt(result.count);
  console.log(`Creating proxies | ${proxyCount}`);
  if (config.provider = 'digital_ocean') {
    let proxyData = getRandomProxyData(proxyCount);
    let proxyPromises = proxyData.map((proxy) => {
      return createDroplet()
      .then((droplet) => {
        console.log(`${droplet.name} | Setting up Squid (this might take a while)`);
        if (result.type === 'pw' || result.type === 'PW') {
          return pwProxySetup(droplet, proxy.username, proxy.password);
        } else {
          return ipProxySetup(droplet, config.allowed_ips);
        }
      });
    });
    Promise.all(proxyPromises).then((proxies) => {
      console.table(proxies);
      process.exit();
    });
  } else {
    console.error('Unknown provider');
    process.exit();
  }
});

let getRandomProxyData = (proxyCount) => {
  let proxyData = [];
  for (let i = 0; i < proxyCount; i++) {
    let port = Math.floor(Math.random() * 6500) + 2000;
    
    let username = randomstring.generate({
      length: 7,
      charset: 'alphabetic',
      capitalization: 'lowercase'
    });

    let password = randomstring.generate({
      length: 14,
      charset: 'alphabetic',
      capitalization: 'lowercase'
    });

    proxyData.push({
      username: username,
      password: password,
      port: port
    });
  }
  return proxyData;
}

let waitForCreation = (dropletName) => {
  return new Promise((resolve) => {
    let waitInterval = setInterval(() => {
      api.dropletsGetAll({}).then((data) => {
        let droplet = data.body.droplets.find((droplet) => {
          return droplet.name === dropletName;
        });
        if (droplet.status === 'active') {
          resolve(droplet);
        }
      });
    }, 5000);
  });
}

let createDroplet = () => {
  let dropletName = randomstring.generate(14);
  let dropletData = {
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
  };

  console.log(`${dropletName} | Creating droplet`);
  let dropletPromise = api.dropletsCreate(dropletData).then(() => {
    console.log(`${dropletName} | Waiting for droplet to initialize`);
    return waitForCreation(dropletName);
  });
  return dropletPromise;
}

let pwProxySetup = (droplet, username, password) => {
  let id = droplet.host;
  let host = droplet.networks.v4[0].ip_address;

  return proxyPromise = new Promise((resolve, reject) => {
    ssh.connect({
      host: host,
      user: 'root',
      privateKey: config.digital_ocean.rsa_id_path,
      passphrase: config.digital_ocean.ssh_passphrase
    }).then(() => {
      ssh.execCommand(`yum install squid httpd-tools -y &&
                       touch /etc/squid/passwd &&
                       htpasswd -b /etc/squid/passwd ${username} ${password} &&
                       wget -O /etc/squid/squid.conf https://hastebin.com/raw/abituqaruy --no-check-certificate &&
                       touch /etc/squid/blacklist.acl &&
                       systemctl restart squid.service && systemctl enable squid.service &&
                       iptables -I INPUT -p tcp --dport 3128 -j ACCEPT &&
                       iptables-save`)
      .then((result) => {
        let proxy = {
          'IP/HOST': host,
          'Port': '3128',
          'Username': username,
          'Password': password
        };
        resolve(proxy);
      });
    });
  });
}

let ipProxySetup = (droplet, ips) => {
  let id = droplet.host;
  let host = droplet.networks.v4[0].ip_address;

  return proxyPromise = new Promise((resolve, reject) => {
    ssh.connect({
      host: host,
      user: 'root',
      privateKey: config.digital_ocean.rsa_id_path,
      passphrase: config.digital_ocean.ssh_passphrase
    }).then(() => {
      ssh.execCommand(`yum install squid httpd-tools -y &&
                       touch /etc/squid/allowed_ips.txt &&
                       ips=${JSON.stringify(ips).replace('[','').replace(']','')} &&
                       IFS=', ' read -r -a ipsarr <<< $ips &&
                       printf "%s\n" "\${ipsarr[@]}" > /etc/squid/allowed_ips.txt && 
                       wget -O /etc/squid/squid.conf https://hastebin.com/raw/utagigabah --no-check-certificate &&
                       touch /etc/squid/blacklist.acl &&
                       systemctl restart squid.service && systemctl enable squid.service &&
                       iptables -I INPUT -p tcp --dport 3128 -j ACCEPT &&
                       iptables-save`)
      .then((result) => {
        let proxy = {
          'IP/HOST': host,
          'Port': '3128',
          'Allowed IPs': ips,
        };
        resolve(proxy);
      });
    });
  });
}