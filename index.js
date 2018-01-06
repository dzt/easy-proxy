const electron = require('electron')
const {
    app,
    BrowserWindow,
    Menu
} = electron
const settings = require('./settings-manager')
const eSettings = require('electron-settings')
const create = require('./create')
const path = require('path')
const async = require('async')
const ChildProcess = require('child_process')
var DigitalOcean = require('do-wrapper'),
    api = null;

var win, settingsWin;

const debug = /--debug/.test(process.argv[2])

// Launch Menu Spawn System

var createShortcut = function(callback) {
    spawnUpdate([
        '--createShortcut',
        path.basename(process.execPath),
        '--shortcut-locations',
        'StartMenu'
    ], callback)
}

var removeShortcut = function(callback) {
    spawnUpdate([
        '--removeShortcut',
        path.basename(process.execPath)
    ], callback)
}

var spawnUpdate = function(args, callback) {
    var updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe')
    var stdout = ''
    var spawned = null

    try {
        spawned = ChildProcess.spawn(updateExe, args)
    } catch (error) {
        if (error && error.stdout == null)
            error.stdout = stdout
        process.nextTick(function() {
            callback(error)
        })
        return
    }

    var error = null

    spawned.stdout.on('data', function(data) {
        stdout += data
    })

    spawned.on('error', function(processError) {
        if (!error)
            error = processError
    })

    spawned.on('close', function(code, signal) {
        if (!error && code !== 0) {
            error = new Error('Command failed: ' + code + ' ' + signal)
        }
        if (error && error.code == null)
            error.code = code
        if (error && error.stdout == null)
            error.stdout = stdout
        callback(error)
    })
}

switch (process.argv[1]) {
    case '--squirrel-install':
        createShortcut(function() {
            app.quit()
        });
        break;
    case '--squirrel-uninstall':
        removeShortcut(function() {
            app.quit();
        });
        break;
    case '--squirrel-obsolete':
    case '--squirrel-updated':
        app.quit();
        break;
    default:
        init();
}

function init() {
    app.on('ready', () => {

        settings.init()
        app.ep = {
            settings
        }

        win = new BrowserWindow({
            width: 750,
            height: 670,
            minWidth: 750,
            minHeight: 670,
            resizable: true,
            maxWidth: 750,
            maxHeight: 640,
            fullscreenable: false,
            frame: true,
            show: true,
            icon: `${__dirname}/static/icon.png`
        })
        const menuTemplate = [{
                label: 'File',
                submenu: [{
                        label: 'Settings',
                        click() {
                            initSettings()
                        },
                        accelerator: 'CmdOrCtrl+,',
                    },
                    {
                        label: 'Quit',
                        click() {
                            app.quit()
                        },
                        accelerator: 'CmdOrCtrl+Q',
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [{
                        role: 'copy'
                    },
                    {
                        role: 'paste'
                    },
                    {
                        role: 'pasteandmatchstyle'
                    },
                    {
                        role: 'delete'
                    },
                    {
                        role: 'selectall'
                    }
                ]
            },
            {
                label: 'View',
                submenu: [{
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click(item, focusedWindow) {
                        if (focusedWindow) focusedWindow.reload()
                    }
                }]
            },
            {
                role: 'window',
                submenu: [{
                        role: 'minimize'
                    },
                    {
                        role: 'close'
                    }
                ]
            },
            {
                role: 'help',
                submenu: [{
                        label: 'Learn More about EasyProxy',
                        click() {
                            require('electron').shell.openExternal('github.com/dzt/easy-proxy')
                        }
                    },
                    {
                        label: 'Toggle Developer Tools',
                        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                        click(item, focusedWindow) {
                            if (focusedWindow) focusedWindow.webContents.toggleDevTools()
                        }
                    }
                ]
            }
        ]

        // If the platform is Mac OS, make some changes to the window management portion of the menu
        if (process.platform === 'darwin') {
            menuTemplate[2].submenu = [{
                    label: 'Close',
                    accelerator: 'CmdOrCtrl+W',
                    role: 'close'
                },
                {
                    label: 'Minimize',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize'
                },
                {
                    label: 'Zoom',
                    role: 'zoom'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Bring All to Front',
                    role: 'front'
                }
            ]
        }

        // Set menu template just created as the application menu
        const mainMenu = Menu.buildFromTemplate(menuTemplate)
        Menu.setApplicationMenu(mainMenu)
        win.setMenu(null);
        win.loadURL(`file://${__dirname}/static/index.html`);
    })
}

electron.ipcMain.on('create', function(event, args) {
    var tasks = []
    args.map(function(task, i) {
        tasks.push(function(cb) {
            create.task(win, task, settings, i + 1, (err, response) => {
                if (err) {
                    return (err)
                }
                return cb(null, response)
            })
        })
    })
    async.parallel(tasks, function(err, res) {
        if (err) {
            console.log('err', err)
        } else {
            console.log(res)
            // TODO: When Session Ends
            win.webContents.send('tasksEnded');
        }
    });
});

electron.ipcMain.on('openSettings', function(event, args) {
    initSettings();
});

electron.ipcMain.on('open-file-dialog', function(event) {
    require('electron').dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{
            name: 'All Files',
            extensions: ['*']
        }]
    }, function(filename) {
        if (filename) {
            console.log(filename[0]);
            event.sender.send('selected-file', filename[0]);
        }
    })
});

electron.ipcMain.on('wipeDroplets', function(event) {
    api = new DigitalOcean(eSettings.getSync('do_api_key'));
    var droplets = [];
    api.dropletsGetAll({}, function(err, resp, body) {
        if (err) {
            console.log(err);
            event.sender.send('errDestroy');
        }

        for (var i = 0; i < body.droplets.length; i++) {
            var id = body.droplets[i].id;
            var dropletName = body.droplets[i].name;
            if (dropletName.endsWith('-ep')) {
                api.dropletsDelete(id, function(err, resp, body) {});
            }
        }

        event.sender.send('wipe-complete');

        //console.log(body);
    });
});

electron.ipcMain.on('resetApp', (event, args) => {
    win.close()
    settingsWin.close()
    app.quit();
})

electron.ipcMain.on('refreshMainWindow', (event, args) => {
    win.webContents.send('refreshMain');
})

electron.ipcMain.on('fetchForImages', function(event) {

    var options = [];
    var regionDict = [];

    api = new DigitalOcean(eSettings.getSync('do_api_key'));

    function fetchFullRegionName(shortName) {
        for (var i = 0; i < regionDict.length; i++) {
            if (regionDict[i].slug == shortName) {
                return regionDict[i].fullName;
            }
        }
    }

    // Fetch for Regions and Slug Names
    api.regionsGetAll({}, function(err, resp, body) {
        if (err) {
            // Return Error to Window
            console.log('err', err);
            win.webContents.send('initError');
            return
        }

        for (var i = 0; i < body.regions.length; i++) {
            regionDict.push({
                fullName: body.regions[i].name,
                slug: body.regions[i].slug
            })
        }

        api.imagesGetAll({}, function(err, resp, body) {
            if (err) {
                // Return Error to Window
                win.webContents.send('initError');
                return
            }

            for (var i = 0; i < body.images.length; i++) {
                // Look for 64bit versions of CentOS 7
                if (body.images[i].distribution.indexOf('CentOS') > -1) {
                    if (body.images[i].name.split(' ')[0].startsWith('7')) {
                        for (var x = 0; x < body.images[i].regions.length; x++) {

                            if (fetchFullRegionName(body.images[i].regions[x]) != undefined) {
                                options.push({
                                    title: `CentOS ${body.images[i].name} - ${body.images[i].id} - (${fetchFullRegionName(body.images[i].regions[x])})`,
                                    region: body.images[i].regions[x],
                                    slug: body.images[i].id
                                })
                            }
                        }

                    }
                }
            }

            win.webContents.send('updateOptionList', options);

        });
    });

});

function initSettings() {
    settingsWin = new electron.BrowserWindow({
        backgroundColor: '#ffffff',
        center: true,
        fullscreen: false,
        height: 700,
        icon: `${__dirname}/static/icon.png`,
        maximizable: false,
        minimizable: false,
        resizable: false,
        show: false,
        skipTaskbar: true,
        title: 'Settings',
        useContentSize: true,
        width: 550
    })

    settingsWin.loadURL(`file://${__dirname}/static/settings.html`);
    // No menu on the About settingsWindow
    settingsWin.setMenu(null);
    //settingsWin.webContents.openDevTools()
    settingsWin.once('ready-to-show', function() {
        settingsWin.show()
    })

    settingsWin.once('closed', function() {
        aboutWin = null
    })

    return settingsWin.show()
}
