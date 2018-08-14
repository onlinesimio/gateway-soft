'use strict'

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { format as formatUrl, resolve } from 'url';
import { DB } from "../../lib/db";
import logger from '../../lib/logger';
import ConfigStore from 'electron-store';
import { config } from 'dotenv';
import Logger from 'electron-log';

config({
  path: __static + '/.env'
});

logger.transports.file.level = 'debug';
logger.transports.file.maxSize = 5 * 1024 * 1024;

const isDevelopment = process.env.NODE_ENV !== 'production'

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow

function getDbPath() {
  let appPath = app.getPath('userData');

  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath);
  }

  return path.join(appPath, 'db.sqlite');
}

const db = new DB(getDbPath());
const configStore = new ConfigStore();

function createMainWindow() {
  const window = new BrowserWindow({
    webPreferences: { webSecurity: false }
  })

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
  }
  else {
    window.loadURL(formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true
    }))
  }

  if (isDevelopment) {
    window.webContents.openDevTools();

    const { default: installExtension, VUEJS_DEVTOOLS } = require('electron-devtools-installer');

    installExtension(VUEJS_DEVTOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
  }

  window.on('closed', () => {
    mainWindow = null
  })

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  })

  return window
}

function migrate() {
  return db.db.migrate.latest({
    directory: path.join(__static, 'migrations')
  });
}

ipcMain.on('getDbPath', (event, arg) => {
  event.returnValue = getDbPath();
})

ipcMain.on('getLog', (event, arg) => {
  let log = fs.readFileSync(Logger.transports.file.findLogPath(process.env.npm_app_name)).toString();
  event.returnValue = log;
})

ipcMain.on('clearLog', (event, arg) => {
  fs.truncateSync(Logger.transports.file.findLogPath(process.env.npm_app_name));
  event.returnValue = true;
})

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
  mainWindow.webContents.send('quit');
})

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow()
  }
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {

  logger.debug('App ready');

  let loading = new BrowserWindow({
    show: false,
    frame: false,
    height: 400,
    width: 400,
    maxHeight: 400,
    maxWidth: 400,
    minHeight: 400,
    minWidth: 400
  });


  ipcMain.on('loadingScreenConnected', (event, arg) => {
    logger.debug('Loading screen loaded');

    let loadingIPC = event.sender;

    loadingIPC.send("loadingText", "Update database structure")
    logger.debug('Starting migrations');

    setTimeout(() => {
      migrate().then(() => {
        logger.debug("Migration completed");
        loadingIPC.send("loadingText", "Loading imsi data");

        return new Promise((resolve, reject) => {
          fs.readFile(path.join(__static, 'mncmcc.json'), (err, data) => {
            if (err) {
              reject(err);
            }

            let items = JSON.parse(data.toString());
            configStore.set('mncmcc', items);
            resolve();
          })
        })
      }).then(() => {
        //loadingIPC.send("loadingText", "Find user")
        mainWindow = createMainWindow();
        mainWindow.webContents.once('dom-ready', () => {
          mainWindow.show();
          loading.hide();
          loading.destroy();
        })
      }).catch(err => {
        logger.error(err);
      });
    }, 1000)
  });

  loading.loadURL(formatUrl({
    pathname: path.join(__static, 'loading.html'),
    protocol: 'file'
  }))

  // if (isDevelopment) {
  //   loading.webContents.openDevTools()
  // }
  loading.show()
})
