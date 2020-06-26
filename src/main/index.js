'use strict'
process.env.UV_THREADPOOL_SIZE = "100";

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { format as formatUrl, resolve } from 'url';
import logger from '../../lib/logger';
import ConfigStore from 'electron-store';
import { config } from 'dotenv';
import Logger from 'electron-log';

app.allowRendererProcessReuse = false;

config({
  path: __static + '/.env'
});

logger.transports.file.level = 'debug';
logger.transports.file.maxSize = 5 * 1024 * 1024;

const isDevelopment = process.env.NODE_ENV !== 'production'

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow

const configStore = new ConfigStore();

function createMainWindow() {
  const window = new BrowserWindow({
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      webviewTag: true
    },
    frame: true,
    allowRunningInsecureContent: false,
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
  app.quit();
  if (process.platform !== "darwin") {
    app.quit();
  }
  mainWindow.webContents.send("quit");
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
    minWidth: 400,
    webPreferences: {
      nodeIntegration: true
    }
  });


  ipcMain.on('loadingScreenConnected', (event, arg) => {
    logger.debug('Loading screen loaded');

    let loadingIPC = event.sender;

    loadingIPC.send("loadingText", "Update mncmcc database")
    logger.debug('Starting migrations');

    setTimeout(async () => {
      fs.readFileSync(path.join(__static, 'mncmcc.json'), (err, data) => {
        if (err) {
          reject(err);
        }

        let items = JSON.parse(data.toString());
        configStore.set('mncmcc', items);
        resolve();
      })

      //loadingIPC.send("loadingText", "Find user")
      mainWindow = createMainWindow();
      mainWindow.webContents.once('dom-ready', () => {
        mainWindow.show();
        loading.hide();
        loading.destroy();
      })
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
