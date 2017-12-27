const homedir = require('os').homedir
const app = require('electron').app
const settings = require('electron-settings')
const objectPath = require('object-path')

const DEFAULTS = {
    filePath: null,
    ssh_passphrase: null,
    do_api_key: null,
    do_ssh_key_name: null
};

// we need to sync every setting that can be modified externally
// e.g. the `openOnStartup` setting can be modified via
// macOS' System Preferences.app

function sync() {
  settings.setSync('openOnStartup', app.getLoginItemSettings().openAtLogin);
}

function init() {
  settings.defaults(DEFAULTS);
  settings.applyDefaultsSync();
  sync();
}

function get(key) {
  sync();
  return objectPath.get(key) || settings.getSync(key);
}

function getAll() {
  sync();
  return settings.getSync();
}

function set(key, value) {
  settings.setSync(key, value);
}

function observe(keyPath, handler) {
  return settings.observe(keyPath, handler);
}

module.exports = {
  get: get,
  getAll: getAll,
  set: set,
  observe: observe,
  init: init
};