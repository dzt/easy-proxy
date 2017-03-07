# easy-proxy
Mass proxy distribution made easily with the DigitalOcean API

![term](http://i.imgur.com/0hcZt01.png)

### Installation

easy-proxy requires [Node.js](http://nodejs.org/).

Setup:

```sh
$ git clone https://github.com/dzt/easy-proxy.git
$ cd easy-proxy
$ npm install
```

Configure information inside the `config.example.json` be sure to rename it to `config.json` or simply run `mv config.example.json config.json` (macOS & Windows) when you're done.

Run After Setup:

```sh
$ node index
```

# Config

### Fields/Attributes
* **config**{ Object }:
  * **config.provider** {  _String_ }: Provider used to create proxies as of right now only `digital_ocean` is an option.
  * **config.digital_ocean.api_key** {  _String_ }: DigitalOcean API Key
  * **config.digital_ocean.ssh_key_id** {  _Number_ }: SSH keys that you wish to embed into your server, you must add your SSH Key to your DigitalOcean account and collect the ID. If you are unsure of the ID associated with your SSH Key you can simply run `node scripts/ssh_keys` to find the ID attached to your key.
  * **config.digital_ocean.region** {  _String_ }: Desired location to deploy proxies. I've gathered together a list of locations you can use [here](https://gist.github.com/dzt/8499a5f3ee0e3fc390891c64f737d3c6)
  * **config.digital_ocean.rsa_id_path** {  _String_ }: The path to your RSA private key, this may vary depending on what operating system you're on by default if you're using `ssh-keygen -t rsa` to generate RSA keys on macOS or Linux then your RSA private key path should look like this `/Users/john/.ssh/id_rsa` or `/home/john/.ssh/id_rsa`. But if you're on Windows, assuming that you're using PuTTYgen to generate your private/public key then you know where the location of you're private key is (usually with the file extension `.ppk`) under the `rsa_id_path` field on Windows yours should look like this `C:\\Users\\Billy\\Documents\\ssh-private.ppk` depending on where you saved your private key.
  * **config.digital_ocean.ssh_passphrase** {  _String_ }: If you did not set a passphrase to your SSH key then you can set this value as `null` otherwise you should set this value to the passphrase if present.

### Who

Written by <a href="http://petersoboyejo.com/">@dzt</a>, made better by you.


## License

```
The MIT License (MIT)

Copyright (c) 2017 Peter Soboyejo <http://petersoboyejo.com/>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
