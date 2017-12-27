const remote = require('electron').remote;
const app = remote.app;
const settings = require('electron-settings');
const $ = require('jquery')
const Config = require('electron-config');
const config = new Config();
const ipcRenderer = require('electron').ipcRenderer;

var settingsValues = app.ep.settings.getAll();
var settingsVal = config.get('settingsVal')
var shell = require('electron').shell;


$("#filePathBtn").click(function(event){
    event.preventDefault();
    ipcRenderer.send('open-file-dialog');
});

$('#passphrase').val(settingsValues.ssh_passphrase);
$('#doKey').val(settingsValues.do_api_key);
$('#filePath').val(settingsValues.filePath);
$('#keyName').val(settingsValues.do_ssh_key_name);

ipcRenderer.on('selected-file', function(event, filename) {
    $('#filePath').val(filename);
    settingsValues.filePath = filename
    app.ep.settings.set('filePath', filename);
});

$('#passphrase').change(function() {
    settingsValues.ssh_passphrase = $(this).val()
    app.ep.settings.set('ssh_passphrase', $(this).val());
});

$('#keyName').change(function() {
    settingsValues.do_ssh_key_name = $(this).val()
    app.ep.settings.set('do_ssh_key_name', $(this).val());
});

$('#doKey').change(function() {
    settingsValues.do_api_key = $(this).val()
    app.ep.settings.set('do_api_key', $(this).val());
});

$('#saveSettings').click(() => {
    remote.getCurrentWindow().reload();
});
