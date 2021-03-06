// Copyright © 2016, Numenta, Inc. Unless you have purchased from
// Numenta, Inc. a separate commercial license for this software code, the
// following terms and conditions apply:
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero Public License version 3 as published by
// the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero Public License for
// more details.
//
// You should have received a copy of the GNU Affero Public License along with
// this program. If not, see http://www.gnu.org/licenses.
//
// http://numenta.org/licenses/


import {app, BrowserWindow, crashReporter, dialog, Menu} from 'electron';
import bunyan from 'bunyan';
import path from 'path';

import config from './ConfigService';
import MainMenu from './MainMenu';
import ModelServiceIPC from './ModelServiceIPC';
import ParamFinderServiceIPC from './ParamFinderServiceIPC';

const DEV = config.get('NODE_ENV') !== 'production';
const log = bunyan.createLogger({
  level: 'debug',  // @TODO higher for Production
  name: config.get('title')
});
const initialPage = path.join(__dirname, config.get('browser:entry'));

let mainWindow = null; // global ref to keep window object from JS GC
let modelService = null;
let paramFinderService = null;

/**
 * Unicorn: Cross-platform Desktop Application to showcase basic HTM features
 *  to a user using their own data stream or files.
 *
 * Main Electron code Application entry point, initializes browser app.
 */
crashReporter.start({
  companyName: config.get('company'),
  productName: config.get('title'),
  submitURL: '' // @TODO https://discuss.atom.io/t/electron-crash-report-server/20563
});

app.on('window-all-closed', () => {
  app.quit();
});

// Electron finished init and ready to create browser window
app.on('ready', () => {
  // set main menu
  Menu.setApplicationMenu(Menu.buildFromTemplate(MainMenu));

  // create browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720
    // @TODO fill out options
    //  https://github.com/atom/electron/blob/master/docs/api/browser-window.md
  });
  mainWindow.loadURL(`file://${initialPage}`);
  mainWindow.center();
  if (DEV) {
    // mainWindow.openDevTools();
  }

  // browser window events
  mainWindow.on('closed', () => {
    mainWindow = null; // dereference single main window object
  });

  // browser window web contents events
  mainWindow.webContents.on('crashed', () => {
    dialog.showErrorBox('Error', 'Application crashed');
  });
  mainWindow.webContents.on('did-fail-load', () => {
    dialog.showErrorBox('Error', 'Application failed to load');
  });
  mainWindow.webContents.on('dom-ready', () => {
    log.info('Electron Main: Renderer DOM is now ready!');
  });

  // Handle IPC communication for the ModelService
  modelService = new ModelServiceIPC();
  modelService.start(mainWindow.webContents);

  // Handle IPC communication for the ParamFinderService
  paramFinderService = new ParamFinderServiceIPC();
  paramFinderService.start(mainWindow.webContents);
});
