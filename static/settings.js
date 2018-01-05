const remote = require('electron').remote;
const app = remote.app;
const settings = require('electron-settings');
const $ = require('jquery')
const Config = require('electron-config');
const config = new Config();
const dialog = remote.dialog;
const ipcRenderer = require('electron').ipcRenderer

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
    ipcRenderer.send('refreshMainWindow');
});

$('#destroy').click(() => {
  $("#destroy").prop("disabled", true);
  if (settingsValues.do_api_key == null || settingsValues.do_api_ke == "") {
    $('#destroy').text('No API Key was found');
    setTimeout(function(){
      $('#destroy').text('Destroy');
      $("#destroy").prop("disabled", false);
    }, 5000);
  } else {
    $('#destroy').text('Destroying...');
    ipcRenderer.send('wipeDroplets');
  }
});

$('#reset').click(() => {
  dialog.showMessageBox({
      "message": `Are you sure you want to reset?`,
      "detail": "You will not be able to recover any task data after you perform this action.",
      "buttons": ["Ok", "Cancel"],
  }, function(response) {
      switch (response) {
          case 0:
              ok();
          case 1:
              break;
      }
  });
  function ok() {
    settings.resetToDefaults()
    ipcRenderer.send('resetApp');
  }
});

ipcRenderer.on('errDestroy', function(event, data) {

  $('#destroy').text('Error Occured while destroying');

  setTimeout(function(){
    $('#destroy').text('Destroy');
    $("#destroy").prop("disabled", false);
  }, 5000);

});

ipcRenderer.on('wipe-complete', function(event, data) {
  $('#destroy').text('All Droplets have been destroyed');

  setTimeout(function(){
    $('#destroy').text('Destroy');
    $("#destroy").prop("disabled", false);
  }, 5000);
});
