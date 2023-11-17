/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');
const common = require('./app/common.js');

const ipccallbacks={};
const ipccallbacksSubs={};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

window.settings={};

document.addEventListener('DOMContentLoaded', () => {



});