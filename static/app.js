require("copy-paste").global()

const remote = require('electron').remote
const app = remote.app
const $ = require('jquery')
const ipcRenderer = require('electron').ipcRenderer
const settings = require('electron-settings')
const randomstring = require('randomstring')

var settingsValues = app.ep.settings.getAll();

// Fetch for Images as soon as Window is loaded

if (settingsValues.do_api_key == null || settingsValues.do_api_key == "") {
    $("#fetching").html('<option value="fetching" id="fetching">Digital Ocean API Key Missing</option>');
} else {
    ipcRenderer.send('fetchForImages');
}

ipcRenderer.on('initError', function(event, data) {

    $("#fetching").html('<option value="fetching" id="fetching">An error has occured while trying to fetch data from DigitalOcean, try checking your API Key or refresh.</option>');

});

// When Images are Fetched return data to DOM
ipcRenderer.on('updateOptionList', function(event, data) {

    if (data.length == 0) {
        $("#fetching").html('<option value="fetching" id="fetching">No CentOS 7 Servers are available at the time.</option>');
    } else {
        for (var i = 0; i < data.length; i++) {
            $('#sel1').append(`<option value="${data[i].title}" region="${data[i].region}" slug="${data[i].slug}">${data[i].title}</option>`);
        }

        $("#fetching").remove();
        $("#sel1").prop("disabled", false);
        $("#createButton").prop("disabled", false);
    }

});

ipcRenderer.on('refreshMain', function(event) {
  remote.getCurrentWindow().reload();
});

// Create Proxies Button
$('#createButton').click(() => {

    if ($("#count").val() == "") {

        alert("You must set the number of proxies you want to create before performing this action.");

    } else if (settingsValues.do_api_key == null) {

        alert("You're missing crutial settings required to create proxies, please check your settings and try again.");

    } else {


        $("#results").empty();

        $("#createButton").prop("disabled", true);
        $("#sel1").prop("disabled", true);
        $("#count").prop("disabled", true);
        $("#clearLogsButton").prop("disabled", true);
        $("#createButton").text('Creating...');

        var proxyCount = parseInt($('#count').val())

        var tasks = [];

        for (var i = 0; i < proxyCount; i++) {

            var username = randomstring.generate({
                length: 6,
                charset: 'alphabetic',
                capitalization: 'lowercase'
            });

            var password = randomstring.generate({
                length: 6,
                charset: 'alphabetic',
                capitalization: 'lowercase'
            });

            tasks.push({
                username: username,
                password: password,
                slug: $('#sel1').find(":selected").attr('slug'),
                region: $('#sel1').find(":selected").attr('region')
            })
        }

        ipcRenderer.send('create', tasks);
    }
});

// Update List Items in realtime

ipcRenderer.on('updateMonitor', function(event, data) {
    // TODO: Add Timestamp
    if ($(`#${data.username}`).length) {
        // update exisiting item

        if (data.error) {
            var newlyAddedUpdate = `
            <tr id="${data.username}">
            <td id="no">#${data.no}</td>
            <td>${data.ip}</td>
            <td>3128</td>
            <td>${data.username}</td>
            <td>${data.password}</td>
            <td style="color: red;">${data.msg}</td>
          </tr>`
        } else {
            var newlyAddedUpdate = `
            <tr id="${data.username}">
            <td id="no">#${data.no}</td>
            <td>${data.ip}</td>
            <td>3128</td>
            <td>${data.username}</td>
            <td>${data.password}</td>
            <td style="color: green;">${data.msg}</td>
          </tr>`
        }
        $(`#${data.username}`).replaceWith(newlyAddedUpdate);
    } else {
        var newlyAddedUpdate = `
      <tr id="${data.username}">
        <td id="no">#${data.no}</td>
        <td>${data.ip}</td>
        <td>3128</td>
        <td>${data.username}</td>
        <td>${data.password}</td>
        <td style="color: green;">${data.msg}</td>
      </tr>
    `
        $('#results').append(newlyAddedUpdate);
    }
});

$('#refresh').click(() => {
    remote.getCurrentWindow().reload();
});

$('#copyToClipboardButton').click(() => {

    var content = [];
    $("tr").each(function(i) {
        if (i != 0) {
            if ($(this).has(`td:contains('Created!')`).length) {
                var ip = $(this).find('td').eq(1).text();
                var user = $(this).find('td').eq(3).text();
                var pass = $(this).find('td').eq(4).text();
                content.push(`${ip}:3128:${user}:${pass}`);
            }
        }
    });
    // use join function
    copy(content.join('\n'))
});

$('#clearLogsButton').click(() => {
    $("#results").empty();
});

$('#cancelTasksButton').click(() => {
    ipcRenderer.send('stopTasks');
});

$('#settingsButton').click(() => {
    ipcRenderer.send('openSettings');
});

// When all tasks are done doing there thing bring everything back to normal and purge old stuff

ipcRenderer.on('tasksEnded', function(event, data) {
    $("#createButton").prop("disabled", false);
    $("#sel1").prop("disabled", false);
    $("#count").prop("disabled", false);
    $("#clearLogsButton").prop("disabled", false);
    $("#createButton").text('Create');
});
