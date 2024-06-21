/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

const packageDetails = require('./package.json');
const { app, BrowserWindow, Menu,ipcMain, shell, protocol, dialog} = require('electron');

const loki = require("lokijs");
const events = require('events');
const fs = require('fs');
const {JsonPointer: ptr } = require('json-ptr');
const path = require('path');
const url = require("url");

require('./libs/globalConfigs');

const {midici} = require('./libs/midici');
const {whichGlobalMIDICI, midiOutFunc, removeUMPDevice} = require('./libs/umpDevices') ;


const d = require('./libs/debugger.js');
const interoperability = require('./libs/interoperability.js');
const midi2Tables = require('./libs/midiCITables.js');
//const t = require("./libs/translations");
const {getRandomInt, createPopoupWin} = require("./libs/utils");

process.report.reportOnFatalError =true;
process.report.reportOnUncaughtException =true;
process.report.reportOnSignal =true;
// process.on('unhandledRejection', function (err) {
// 	fs.writeFileSync('crash.log', err + "\n" + err.stack);
// });
// process.on('uncaughtException', function (err) {
// 	fs.writeFileSync('crash.log', err + "\n" + err.stack);
// });
// process.on('SIGABRT', function (err) {
// 	fs.writeFileSync('crash.log', err + "\n" + err.stack);
// });
//
// process.on('SIGSEGV', function (err) {
// 	fs.writeFileSync('crash.log', err + "\n" + err.stack);
// });

const homedir = app.commandLine.getSwitchValue('configDir') || require('os').homedir()+'/midi2workbench/';
if (!fs.existsSync(homedir)){
	fs.mkdirSync(homedir);
}
const ev = new events.EventEmitter();
let debugWin, helpWin, certWin, toolsWin, aboutWin, smf2Win;
global.isAppQuitting = false;

let projectPath = false;
const configFileLocation = homedir+'config.json';

const ymdhis =form_ymdHis(new Date() );
const logfilePath = require('os').homedir()+'/midi2workbench/'+ ymdhis +'.log';
global.logfile = fs.createWriteStream(logfilePath, {flags: 'a'});
global.logfile.write('New Log File - '+ymdhis+ "\n");
global.logfile.write('-----------------------'+ "\n");

logfile.write(JSON.stringify(global.configSetting,2,2)+ "\n");
logfile.write('-----------------------'+ "\n");




//let ctrlGetPromises = [];
//let processMidiIn = [];
//let processMidiOut = [];



const patchdbPath = require('os').homedir()+'/midi2workbench/patches.db';
if(!fs.existsSync(patchdbPath)){
	fs.copyFileSync(__dirname +'/output/app/sound/patches.db', patchdbPath);
}
let patchesDB;
const db = new loki(patchdbPath, {
	autoload: true,
	autoloadCallback : () => {
		patchesDB = db.getCollection("patches");
		if (patchesDB === null) {
			patchesDB = db.addCollection("patches");
		}
	},
	autosave: true,
	autosaveInterval: 4000
});



global._editWin=[];

global._midici = new midici({ciEventHandler, midiOutFunc});
global._midici.debug =  true;
global._midici._muid = getRandomInt(0xFFFFF00);
global._midici.device =  configSetting.deviceInfo;
global._midici.ciVer =  parseInt(configSetting.ciVerLocal);
global._midici.ev.on('inUMP',(o)=>{
	global._editWin.map(win => {
		if(!win || !win.webContents)return;
		win.webContents.send('asynchronous-reply', 'controlUpdate', o);
	});
});

const {getMIDI1Devices, load_umpVirtualMIDI} = require("./libs/UMPMIDI1");
global._midiciM1=[];
for(let i=0 ; i<global.configSetting.numberMIDI1UMPs;i++){
	load_umpVirtualMIDI(i);
	global._midiciM1[i] = new midici({ciEventHandler, midiOutFunc});
	global._midiciM1[i].debug =  true;
	global._midiciM1[i]._muid = getRandomInt(0xFFFFF00);
	global._midiciM1[i].device =  configSetting.deviceInfo;
	global._midiciM1[i].ciVer =  parseInt(configSetting.ciVerLocal);
	global._midiciM1[i].ev.on('inUMP',(o)=>{
		global._editWin.map(win => {
			if(!win || !win.webContents)return;
			win.webContents.send('asynchronous-reply', 'controlUpdate', o);
		});
	});
}



//---- Setup UMP Devices

require('./libs/UMPusb.js');


const {getManufacturer16bit} = require("./libs/manufactuers");



//******** Electron Stuff ****************
function createWindow () {
	// Create the browser window.
	global.indexWindow = new BrowserWindow({
		width: 1400,
		height: 800,
		center:true,
		icon: path.join(__dirname, '/icon.png'),
		title: 'MIDI 2.0 Workbench '+packageDetails.version,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			backgroundThrottling:false,
			enableRemoteModule: true,
			autoplayPolicy:'no-user-gesture-required'
		}
	});

	protocol.registerBufferProtocol("midi+file", (req, cb) => {
		const parts = url.parse(req.url,true);
		global._editWin.map(editWin=>{
			if(editWin._umpDev && editWin._id===parts.query.uiWinId){
				whichGlobalMIDICI(editWin._umpDev.umpDev).sendPE(0x34,editWin._umpDev.muid
				 	, {resource:"File", path:parts.pathname}).then(([,resHead,resBody])=>{
				 	cb({ statusCode: resHead.status, mimeType: resHead.mediaType || null, data: resBody || null});
				});
			}
		});
	});


	Menu.setApplicationMenu(null);

	// and load the index.html of the app.
	global.indexWindow.loadFile(__dirname + '/output/index.html');
	// Open the DevTools.
	//indexWindow.webContents.openDevTools();
	
	// Emitted when the window is closed.
	global.indexWindow.on('closed', () => {

		Object.keys(global.umpDevices).map(umpDev=>{
			global.umpDevices[umpDev].remove();
		});

		app.quit();
		global.indexWindow = null;

	});



}

ipcMain.on('asynchronous-message', (event, arg,xData) => {
	//console.log(arg) ;

	// if(ipcMainProcess[arg]){
	// 	ipcMainProcess[arg]({
	// 		event,
	// 		projectPath,
	// 		homedir,
	// 		xData
	// 	});
	// 	return;
	// }

	switch(arg) {

		//### Pages
		case 'showAbout': {
			if (!aboutWin) {
				const [,editWin] = createPopoupWin({
					onClose:()=>{
						aboutWin = null;
					},
					parentWindow: null
				});
				aboutWin = editWin;
			}

			aboutWin.loadFile(__dirname + '/output/about.html');
			aboutWin.show();

			break;
		}
		case 'showHelp': {
			if (!helpWin) {
				const [,editWin] = createPopoupWin({
					onClose:()=>{
						helpWin = null;
					},
					parentWindow: null
				});
				helpWin = editWin;
			}

			helpWin.loadFile(__dirname + '/output/help/dochelp.html',{query:{page:xData.xData}});
			helpWin.show();

			break;
		}
		case 'toggleDevTools':
			event.sender.toggleDevTools();
			break;
		case 'openTools': {
			if (!toolsWin) {
				toolsWin = new BrowserWindow({
					//parent: global.indexWindow,
					width: 1024,
					height: 800,
					webPreferences: {
						nodeIntegration: true,
						contextIsolation: false,
						enableRemoteModule: true,
						backgroundThrottling: false,
						autoplayPolicy: 'no-user-gesture-required'
					}
				});

				toolsWin.setMenuBarVisibility(false);
				toolsWin.loadFile(__dirname + '/output/tools.html');
				//toolsWin.webContents.openDevTools();

				toolsWin.on('closed', () => {
					toolsWin = null;
				});
			}
			else{
				toolsWin.show();
			}
			break;
		}
		case 'openSMF2': {
			if (!smf2Win) {
				smf2Win = new BrowserWindow({
					//parent: global.indexWindow,
					width: 1024,
					height: 800,
					webPreferences: {
						nodeIntegration: true,
						contextIsolation: false,
						enableRemoteModule: true,
						backgroundThrottling: false,
						autoplayPolicy: 'no-user-gesture-required'
					}
				});

				smf2Win.setMenuBarVisibility(false);
				smf2Win.loadFile(__dirname + '/output/smf2.html');
				//toolsWin.webContents.openDevTools();

				smf2Win.on('closed', () => {
					smf2Win = null;
				});
			}
			else{
				smf2Win.show();
			}
			break;
		}


		//#### Loading UMP Devices on Index Page
		case 'getAllUMPDevicesFunctionBlocks':
			if(xData && xData.resetMUID){
				global._midici.invalidateSelf();
				global._midiciM1.map(mciM1=>{
					mciM1.invalidateSelf();
				});
			}

			//search_mDNS();
			Object.keys(global.umpDevices).map(umpDev=>{
				if (global.indexWindow && global.umpDevices[umpDev].display()){
					global.indexWindow.webContents.send('asynchronous-reply',
						'umpDev', {umpDev, endpoint: global.umpDevices[umpDev].remoteEndpoint});
				}
				//global.umpDevices[umpDev].getEndpointInfo();
				//global.umpDevices[umpDev].getFunctionBlocks();
			});
			break;
		case 'openMIDIEndpoint':{
			let found = false;
			global._editWin.map(editWin=>{
				if(editWin._umpDev.umpDev===xData.umpDev && editWin._umpDev.remoteEndpoint===true){
					editWin.show();
					found=true;
				}
			});
			if(!found) {
				const ep = global.umpDevices[xData.umpDev].remoteEndpoint||{};
				//const fBs = global.umpDevices[xData.umpDev]._currentFBList||[];
				const [, editWin] = createPopoupWin({
					fileToLoad: __dirname + '/output/project.html',
					onClose:()=>{
						certWin = null;
					},
					finishLoad:xData,
					parentWindow: event.sender,
					_umpDev: xData
				});
				editWin._filename = homedir + xData.umpDev +'_'+ (ep.prodInstId ||'')+ '.json';
				if (!fs.existsSync(editWin._filename)) {
					fs.writeFileSync(editWin._filename, JSON.stringify({}), {flag: 'w+'});
				}
				editWin._fileData = JSON.parse(fs.readFileSync(editWin._filename).toString());

				//editWin.webContents.openDevTools();

				ptr.set(editWin._fileData,"/remoteEndpoint",ep,true);
				//ptr.set(editWin._fileData,"/remoteEndpoint/functionBlocks",fBs,true);

				ptr.set(editWin._fileData,"/device/model",ep.name,true);
				ptr.set(editWin._fileData,"/device/manufacturer",ep.manufacturer,true);
				// ptr.set(editWin._fileData,"/device/manufacturerId16",ep.MfrID?.manufacturerId16,true);
				ptr.set(editWin._fileData,"/device/manufacturerId",ep.manufacturerId,true);
				ptr.set(editWin._fileData,"/device/familyId",ep.familyId,true);
				ptr.set(editWin._fileData,"/device/modelId",ep.modelId,true);
				ptr.set(editWin._fileData,"/device/versionId",ep.versionId,true);
				fs.writeFileSync(editWin._filename, JSON.stringify(editWin._fileData), {flag: 'w+'});

			}

			break;
		}
		case 'addMIDI2Bridge':{
			global.configSetting.bridging.push(xData);
			global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);
			break;
		}
		case 'removeMIDI2Bridge':{
			global.configSetting.bridging = global.configSetting.bridging.filter(v => v!==xData);
			global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);
			break;
		}
		case 'refreshMIDICI':{
			whichGlobalMIDICI(xData.umpDev).sendDiscovery(xData.umpDev, xData.group);
			break;
		}
		case 'refreshMIDIDevices':
		case 'getMIDIDevices': {
			//MIDIDeviceBuildInOut();
			Promise.all([
				getMIDI1Devices()
			]).then((values) => {
				event.reply('asynchronous-reply', 'MIDIDevices', {midiDevices:values[0],serialDevices:values[1]||[]});
			});
			break;
		}

		//#### Project Page
		case 'openMIDICI': {
			if(xData.muid===-1){
				Object.keys(whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal).map(muid=>{
					const rmMIDICI = whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[muid];
					if(!rmMIDICI || rmMIDICI.umpDev!==xData.umpDev  || rmMIDICI.group!==xData.group) return;
					xData.muid = parseInt(muid,10);
				})
			}
			if(xData.muid!==-1){
				let found = false;
				global._editWin.map(editWin=>{
					if(editWin._umpDev && editWin._umpDev.muid===xData.muid){
						editWin.show();
						found=true;
						//editWin.bringToFront();
					}
				});
				if(!found){
					whichGlobalMIDICI(xData.umpDev).loadMUID(xData.muid, homedir, () => {
						if(xData.fbIdx===undefined){
							xData.fbIdx = global.umpDevices[xData.umpDev].getFBBasedOnGroup(xData.group);
						}
						xData.funcBlock = global.umpDevices[xData.umpDev].remoteEndpoint.blocks.filter(fb=>xData.fbIdx===fb.fbIdx)[0] || {};
						createPopoupWin({
							fileToLoad: __dirname + '/output/project.html',
							onClose:()=>{
								certWin = null;
							},
							finishLoad:{openMIDICI:true,...xData},
							parentWindow: event.sender,
							_umpDev: {openMIDICI:true,...xData}
						});

					});
				}

			}
			break;
		}
		case 'exitProject':
			BrowserWindow.fromWebContents(event.sender).close();
			break;
		case 'exitProjectINVRemote':
			whichGlobalMIDICI(xData.umpDev).sendInvalidate(xData.muid);
			BrowserWindow.fromWebContents(event.sender).close();
			setTimeout(()=>{
				// Object.keys(global.umpDevices).map(umpDev=>{
				// 	//global.umpDevices[umpDev].getEndpointInfo();
				// 	//global.umpDevices[umpDev].getFunctionBlocks();
				// });
			},1000);

			break;
		case 'exitProjectINVLocal':
			global._midici.invalidateSelf();
			global._midiciM1.map(mciM1=>{
				mciM1.invalidateSelf();
			});
			BrowserWindow.fromWebContents(event.sender).close();
			setTimeout(()=>{
				// Object.keys(global.umpDevices).map(umpDev=>{
				// 	if(global.umpDevices[umpDev].getEndpointInfo)global.umpDevices[umpDev].getEndpointInfo();
				// 	//global.umpDevices[umpDev].getFunctionBlocks();
				// });
			},1000);

			break;

		case 'getConfig':
			event.reply('asynchronous-reply', 'configSettings', configSetting);
			break;
		case 'getSettings':
			if(xData && xData.muid) {
				event.reply('asynchronous-reply', 'settings',
					{
						...whichGlobalMIDICI(xData.umpDev).remoteDevices[xData.muid],
						functionBlock:xData.funcBlock
					}
				);
			}else{
				const editWin = BrowserWindow.fromWebContents(event.sender);
				if(editWin._fileData) {
					event.reply('asynchronous-reply', 'settings',
						editWin._fileData
					);
				}else if(editWin._umpDev || xData.umpDev) {
					event.reply('asynchronous-reply', 'settings',
						{
							remoteEndpoint: global.umpDevices[editWin._umpDev?.umpDev || xData.umpDev].remoteEndpoint
						}
					);
				}
			}
			break;
		case 'changePC': {
			//Make this midi 2.0 it will downgrade if need be
			let out1 = 0, out2 = 0, ch = xData.channel;
			let umpGroup = xData.group + (Math.floor(ch/16))
			out1 = ((0x04 << 4) + umpGroup) << 24;
			out1 += (0xC0 + (ch%16)) << 16;
			out1 += 1;
			out2 += (xData.bankPC[0] << 8) + xData.bankPC[1];
			out2 += xData.bankPC[2] << 24;
			global.umpDevices[xData.umpDev].midiOutFunc(xData.umpDev, [out1, out2]);
			break;
		}
		case 'sendUMP':
			global.umpDevices[xData.umpDev].midiOutFunc(xData.umpDev, xData.ump);
			break;
		case 'midi1On': {
			const ump =  [
				((0xF << 28) >>> 0) + (0x005 << 16) + (0x01 << 8),
				0, 0, 0
			];
			global.umpDevices[xData.umpDev].midiOutFunc(xData.umpDev, ump);
			break;
		}
		case 'midi2On': {
			const ump = [
				((0xF << 28) >>> 0) + (0x005 << 16) + (0x02 << 8),
				0, 0, 0
			];
			global.umpDevices[xData.umpDev].midiOutFunc(xData.umpDev, ump);
			break;
		}

		case 'setConfigSetting':
			ptr.set(configSetting, xData.p, xData.v, true);

			if(xData.p === "/ciVerLocal"){
				global._midici.ciVer = parseInt(xData.v);
				global._midiciM1.map(mciM1=>{
					mciM1.ciVer = parseInt(xData.v);
				});

			}
			let m1Match = xData.p.match(/^\/umpVirtualMIDI(\d)/);
			if(m1Match){
				let umpVirtualEP = parseInt(m1Match[1],10);
				removeUMPDevice('umpVirtualMIDI'+umpVirtualEP);
				load_umpVirtualMIDI(umpVirtualEP);

			}

			fs.writeFileSync(configFileLocation, JSON.stringify(configSetting), {flag: 'w+'});
			break;
		case 'setSetting':

			if(xData.muid){
				whichGlobalMIDICI(xData.umpDev).setData(xData.muid, xData.p, xData.v);
				//setMPESetup();
				switch (xData.p) {
					case '/clock':
						//TODO SET UP Clock
						break;
				}
				event.reply('asynchronous-reply', 'settings', whichGlobalMIDICI(xData.umpDev).remoteDevices[xData.muid]);
			}else{
				const editWin = BrowserWindow.fromWebContents(event.sender);
				if(editWin._fileData){
					ptr.set(editWin._fileData,xData.p, xData.v, true);
					fs.writeFileSync(editWin._filename, JSON.stringify(editWin._fileData), {flag: 'w+'});
				}


			}


			break;
		case 'interoperabilityTestData':
			ev.emit('interoperabilityData', xData);
			break;
		case 'interoperabilityAutoTest': {
			const qsid = xData.qsid;
			interoperability.interoperability.map(topic => {
				topic.sections.map(section => {
					section.questions.map(qs => {
						if (qsid !== qs.id) return;
						//Ok found the auto test we want now what do we send it
						qs.test({
							qs,
							ev,
							indexWindow: global.indexWindow,
							sendToInteroperabilityModal: (opts,newMuid) => {
								let muidTouse = xData.muid;
								if(newMuid!==undefined) muidTouse = newMuid;
								sendToEditWindow(muidTouse,'interoperabilityAutoTestLog', opts);
							},
							setMUID: (oldMuid, muidRemote) => {
								global._editWin.map(editWin=>{
									if(editWin._umpDev && editWin._umpDev.muid===oldMuid){
										editWin._umpDev.muid = muidRemote;
										//newumpData
										editWin.webContents.send('asynchronous-reply', 'newumpData', editWin._umpDev);
									}
								});
								if(whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[oldMuid]){
									global.indexWindow.webContents.send('asynchronous-reply', 'removeMUID', {
										muid:oldMuid,umpDev:whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[oldMuid].umpDev
									});
									whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[muidRemote] = whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[oldMuid];
									whichGlobalMIDICI(xData.umpDev).remoteDevices[muidRemote] = whichGlobalMIDICI(xData.umpDev).remoteDevices[oldMuid];
									delete whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[oldMuid];
									delete whichGlobalMIDICI(xData.umpDev).remoteDevices[oldMuid];
								}

							},
							currentMuid: xData.muid,
							homedir,
							maxSysex: configSetting.maxSysex,
							simultaneousPERequests: configSetting.simultaneousPERequests,
							cbComplete: (success, msg, newMuid) => {

								let muidTouse = xData.muid;
								if(newMuid!==undefined) muidTouse = newMuid;

								whichGlobalMIDICI(xData.umpDev).setData(muidTouse, '/interoperability/' + qs.id, success, true);
								if (msg) {
									whichGlobalMIDICI(xData.umpDev).setData(muidTouse, '/interoperabilityText/' + qs.id, msg, true);
								}
								event.reply('asynchronous-reply', 'settings', whichGlobalMIDICI(xData.umpDev).remoteDevices[muidTouse]);
								if (!msg && success) {
									msg = "Success";
								}
								event.reply('asynchronous-reply', 'interoperabilityAutoTestLog'
									, {msg: msg, status: success ? 'success' : 'error'});
							},
							...xData
						});
					});
				});
			});
			break;
		}

		case 'showCertification': {
			if (!certWin) {
				const origEditWin = BrowserWindow.fromWebContents(event.sender);

				//Create MIDI 2.0 Device Data
				let devData = {};
				const midiCIVerEnum = ["1.0","1.1","1.2"]
				if(xData.openMIDICI){
					let rmData = whichGlobalMIDICI(xData.umpDev).remoteDevices[xData.muid];
					if(!rmData.devData){
						devData = {
							"checklistVersion": 1.8,
							"manufacturer": rmData.device.manufacturer,
							"model": rmData.device.model,
							"version": rmData.device.version,
							"manufacturerId": rmData.device.manufacturerId,
							"familyId": rmData.device.familyId,
							"modelId": rmData.device.modelId,
							"versionId": rmData.device.versionId,
							"midiCiVersion": midiCIVerEnum[rmData.messageFormatVersion],
							"midiCiResponder": true,
							//"uniqueMUID": true, ///interoperability/ci1.1
							//"midiCIMinRequirements": true, ///interoperability/ciSpec
							"midiCIProtocolNegotiation": rmData.supported.protocol || false,

						};
						if(rmData.supported.profile){
							//debugger;
							devData.profiles = [];
							Object.keys(rmData.profiles).map(idx=>{
								let pf = rmData.profiles[idx];
								if(pf.sysex[0]!==0x7E)return;
								devData.profiles.push({
									profileId:`0x${(pf.sysex[1].toString(16).padStart(2,0)).slice (-2).toUpperCase()}${(pf.sysex[2].toString(16).padStart(2,0)).slice (-2).toUpperCase()}`,
									level: pf.sysex[4],
									responder: true
								})
							})
						}
						if(rmData.supported.pe){
							devData.propertyExchange = [];
							if(rmData.pe.ResourceListRaw.length){
								devData.propertyExchange.push({
									resource: "ResourceList",
									responder: true
								})
							}
							rmData.pe.ResourceListRaw.map(res=>{
								if(res.resource.match(/^X-/))return;
								devData.propertyExchange.push({
									resource:res.resource,
									responder: true
								})
							})
						}
						if(rmData.processInquiryMIDIReport){
							devData.processInquiry = [{function:"MIDIMsgReport", responder:true}];
						}

						whichGlobalMIDICI(xData.umpDev).setData(xData.muid,'/devData', devData);

					}
					devData = whichGlobalMIDICI(xData.umpDev).getData(xData.muid,'/devData');
				}



				const [,editWin] = createPopoupWin({
					onClose:()=>{
						certWin = null;
					},
					finishLoad:{devData,...xData},
					parentWindow: event.sender,
					_umpDev: xData
				});
				certWin = editWin;
				certWin._filename = origEditWin._filename;
				certWin._fileData = origEditWin._fileData;
			}
			certWin.loadFile(__dirname + '/output/selfCertification.html');
			//certWin.webContents.openDevTools();
			break;
		}
		case 'openReport': {
			const reportWin = new BrowserWindow({
				parent: event.sender,
				width: 1024,
				height: 800,
				webPreferences: {
					nodeIntegration: true,
					contextIsolation: false,
					backgroundThrottling: false,
					autoplayPolicy: 'no-user-gesture-required'
				}
			});

			reportWin.setMenuBarVisibility(false);
			reportWin.loadFile(__dirname + '/output/report.html');


			break;
		}

		//#### Displaying PDF's
		case 'generateCertificate': {
			let rmData = whichGlobalMIDICI(xData.umpDev).remoteDevices[xData.muid];
			buildPDF('selfCertification',{devData: rmData.devData,...xData, printMode:true});
			break;
		}
		case 'generateImplementChart': {
			buildPDF('implementation',xData);
			break;
		}
		case 'generateReport': {
			buildPDF('report',xData);
			break;
		}

		//#### Debugging
		case 'getDebugFile': {
			shell.openExternal('file://' + logfilePath);
			break;
		}
		case 'getDebugMsg': {
			const data = d.getDebug(xData.type, xData.offset, xData.limit);

			event.reply('asynchronous-reply', 'debugTable', {
				type: xData.type,
				data: data/*,totalCount:midici.debugColl.count()*/
			});
			break;
		}
		case 'clearDebugMsg':{
			d.clearDebug(xData.type);
			break;
		}
		case 'openDebug': {
			if (!debugWin) {
				debugWin = new BrowserWindow({
					//parent: global.indexWindow,
					width: 1024,
					height: 800,
					webPreferences: {
						nodeIntegration: true,
						contextIsolation: false,
						enableRemoteModule: true,
						backgroundThrottling: false,
						autoplayPolicy: 'no-user-gesture-required'
					}
				});

				debugWin.setMenuBarVisibility(false);
				debugWin.loadFile(__dirname + '/output/debug.html');
				//debugWin.webContents.openDevTools();
				d.setDebugWindow(debugWin);
				debugWin.on('closed', () => {
					debugWin = null;
					d.setDebugWindow(false);
				});
			}
			else{
				debugWin.show();
			}
			break;
		}
		case 'clearErrors':{
			if(xData==="warning"){
				if(global.indexWindow)global.indexWindow.webContents.send('asynchronous-reply', 'increaseWarn',
					-1);
				global._editWin.map(editWin=>{
					editWin.webContents.send('asynchronous-reply', 'increaseWarn', -1);
				});
			}

			if(xData==="error"){
				if(global.indexWindow)global.indexWindow.webContents.send('asynchronous-reply', 'increaseError',
					-1);
				global._editWin.map(editWin=>{
					editWin.webContents.send('asynchronous-reply', 'increaseError', -1);
				});
			}

			break;
		}


		//### MIDI-CI
		case 'protocolNegotiation':
			whichGlobalMIDICI(xData.umpDev).protocolNegotiationStart(xData.muid);
			break;
		case 'setNewProtocol': {
			//debugger;

			const newResponse = whichGlobalMIDICI(xData.umpDev).createMIDICIMsg(null,0x12, 0x7F, xData.muid
				, {
					authorityLevel: 0x60,
					protocol: midi2Tables.ciProtocols[xData.xData]
				}
			);
			whichGlobalMIDICI(xData.umpDev).completeMIDICIMsg(newResponse, whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].umpDev);


			setTimeout(()=>{
				const newResponse = whichGlobalMIDICI(xData.umpDev).createMIDICIMsg(null,0x13, 0x7F,
					xData.muid,{authorityLevel: 0x60});
				whichGlobalMIDICI(xData.umpDev).completeMIDICIMsg(newResponse, whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].umpDev);

				whichGlobalMIDICI(xData.umpDev).setData(xData.muid, '/proposedProtocol',xData.xData);

			},300)

			break;
		}
		case 'profileCapability':
			whichGlobalMIDICI(xData.umpDev).profileInquiryStart(xData.muid);
			break;
		case 'profileOn': {
			//TODO Change to Method
			const newResponse = whichGlobalMIDICI(xData.umpDev).createMIDICIMsg(null,0x22, xData.channel
				, xData.muid, {group:xData.group, profile: xData.profile, numberOfChannels: xData.numberOfChannels});
			whichGlobalMIDICI(xData.umpDev).completeMIDICIMsg(newResponse, whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].umpDev);
			break;
		}
		case 'profileOff': {
			const newResponse = whichGlobalMIDICI(xData.umpDev).createMIDICIMsg(null,0x23, xData.channel
				, xData.muid, {group:xData.group, profile: xData.profile, numberOfChannels: 1});
			whichGlobalMIDICI(xData.umpDev).completeMIDICIMsg(newResponse, whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].umpDev);
			break;
		}
		case 'sendProfileSpecificData': {
			const newResponse = whichGlobalMIDICI(xData.umpDev).createMIDICIMsg(null,0x2F, xData.sourceDestination
				, xData.muid, xData);
			whichGlobalMIDICI(xData.umpDev).completeMIDICIMsg(newResponse, whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].umpDev);
			break;
		}
		case 'sendProfileDetailInquiry': {
			const newResponse = whichGlobalMIDICI(xData.umpDev).createMIDICIMsg(null,0x28, xData.sourceDestination
				, xData.muid, xData);
			whichGlobalMIDICI(xData.umpDev).completeMIDICIMsg(newResponse, whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].umpDev);
			break;
		}
		case 'openInstrument':{
			let matchedProfile={};
			midi2Tables.profiles.map(rawPF=>{
				if(rawPF.bank===xData.bank && rawPF.index===xData.index){
					//Great Found match
					matchedProfile=rawPF;
				}
			});
			createPopoupWin({
				fileToLoad: matchedProfile.extendedUI,
				finishLoad:xData,
				parentWindow: event.sender,
				_umpDev: xData
			});


			break;
		}
		case 'peRefresh': {
			if (whichGlobalMIDICI(xData.umpDev).getData(xData.muid, '/supported/pe')) {
				//Unsub from all PE
				whichGlobalMIDICI(xData.umpDev).peUnsubscribeAll(xData.muid, () => {
					//Do new Capability
					whichGlobalMIDICI(xData.umpDev).setData(xData.muid, '/pe', {});
					whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].cache={};
					whichGlobalMIDICI(xData.umpDev).peCapabilityStart(xData.muid,
						function () {
							whichGlobalMIDICI(xData.umpDev).getResourceList(xData.muid, true).then(()=>{});
						}
					);
				});
			}

			break;
		}
		case 'getState':
			whichGlobalMIDICI(xData.umpDev).sendPE(0x34,xData.muid
				, {resource:"State",resId:xData.stateId}).then(([,resHead,resBody])=>{
				//debugger;
				//fs.existsSync(projectPath)
				projectPath = homedir + '/' + path.basename(whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].file, '.json');
				if (!fs.existsSync(projectPath+'/peStates')) {
					fs.mkdirSync(projectPath+'/peStates',{recursive:true});
				}
				fs.writeFileSync(projectPath+'/peStates/'+xData.stateId, resBody);
				if(!resHead.timestamp){
					resHead.timestamp = Math.floor((new Date()).valueOf() / 1000);
				}
				whichGlobalMIDICI(xData.umpDev).setData(xData.muid,'/peStates/'+xData.stateId,resHead,true);
				event.reply('asynchronous-reply', 'settings',whichGlobalMIDICI(xData.umpDev).remoteDevices[xData.muid]);
				setTimeout(()=>{
					event.reply('asynchronous-reply', 'stateListUpdate');
				},1000);

			});
			break;
		case 'setState': {
			const oldState = ptr.get(whichGlobalMIDICI(xData.umpDev).remoteDevices[xData.muid], '/peStates/' + xData.stateId) || false;
			if (!oldState) return;
			projectPath = homedir + '/' + path.basename(whichGlobalMIDICI(xData.umpDev).remoteDevicesInternal[xData.muid].file, '.json');
			if (!fs.existsSync(projectPath+'/peStates')) {
				fs.mkdirSync(projectPath+'/peStates',{recursive:true});
			}
			const reqBody = fs.readFileSync(projectPath + '/peStates/' + xData.stateId);
			whichGlobalMIDICI(xData.umpDev).sendPE(0x36, xData.muid
				, {resource: "State", resId: xData.stateId, mediaType: oldState.mediaType}, reqBody)
				.then(([, resHead]) => {
					//debugger;
					//fs.existsSync(projectPath)
					//fs.writeFileSync(projectPath+'/'+xData, resBody);
					if(resHead.timestamp)whichGlobalMIDICI(xData.umpDev).setData(xData.muid, '/peStates/' + xData.stateId + '/timestamp', resHead.timestamp, true);
					if(resHead.stateRev)whichGlobalMIDICI(xData.umpDev).setData(xData.muid, '/peStates/' + xData.stateId + '/stateRev', resHead.stateRev, true);
					event.reply('asynchronous-reply', 'settings', whichGlobalMIDICI(xData.umpDev).remoteDevices[xData.muid]);
					setTimeout(()=>{
						event.reply('asynchronous-reply', 'stateListUpdate');
					},1000);
				});
			break;
		}
		case 'sendPE': {
			xData.reqHeader = JSON.parse(xData.reqHeaderJSON);

			if (xData.reqHeader.mediaType && xData.subId === 0x36) {
				//debugger;
				xData.reqBody = new Buffer(xData.reqBody.replace(/^data.*base64,/, ''), 'base64');

			}
//whichGlobalMIDICI(xData.umpDev).remoteDevices[currentMuid]
			const callbackId = xData.callbackId;
			const subscribe = xData.subscribe;
			const reqHeader = xData.reqHeader;

			//console.log("SendPE "+ xData.callbackId+ " " + reqHeader.resource);
			//console.log(xData);

			whichGlobalMIDICI(xData.umpDev).sendPE(xData.subId, xData.muid
				, reqHeader, xData.reqBody)
				.then(([muid, resHead, resBody]) => {

						//console.log("SendPE Reply "+ callbackId);
						//console.log(resBody);

						if (callbackId) {
							xData.resHead = resHead;
							xData.resBody = resBody;
							event.reply('asynchronous-reply', 'callback'
								, {data: xData, callbackId});
						}

						if (subscribe) {
							whichGlobalMIDICI(xData.umpDev).setUpSubscription(
								muid, reqHeader, resBody
								, (subDetail, updateBody, command) => {
									event.reply('asynchronous-reply', 'peSubUpdate'
										, {
											subDetail,
											updateBody,
											command: command
										}
										//,callbackId
									);
								}
							).then(()=>{}).catch(()=>{});
						}
					}
				).catch(([, resHead, resBody]) => {
				if (resHead.status >= 400) {
					let error = ' PE Error: ('+resHead.status+') '
						+reqHeader.resource;
					if(reqHeader.resId) error += ' ('+reqHeader.resId+')'
					if(resHead.message) error += '  - '+resHead.message;

					xData.resHead = resHead;
					xData.resBody = resBody;
					event.reply('asynchronous-reply', 'callback'
						, {error, data: xData, callbackId});
				}
			});


			break;
		}
		case 'getResourceWithSchemaRef':
			whichGlobalMIDICI(xData.umpDev).getResourceList (xData.muid).then(()=>{
				whichGlobalMIDICI(xData.umpDev).getResourceWithSchemaRef(xData.muid,xData.resource)
					.then(resourceObj=>{
						event.reply('asynchronous-reply', 'callback'
							,{data:resourceObj,callbackId:xData.callbackId});
					})
					.catch(eMsg=>{
						event.reply('asynchronous-reply', 'callback'
							,{error:eMsg
								,callbackId:xData.callbackId});
						d.msg('pe',{
								title: 'Get Resource Error' , errors: [eMsg]}
							,'in',xData.umpDev,
							0,[eMsg], null);
					});
			});
			break;
		case 'getChCtrlList':{
			const CtrlPromises = [
				whichGlobalMIDICI(xData.umpDev).sendPE(0x34,  xData.muid, {
					resource: xData.link.resource,
					resId: xData.link.resId
				}),
				whichGlobalMIDICI(xData.umpDev).getMIDIMessageReport(
					xData.muid,
					xData.group,
					{
						noteDataTypeBitmap:0,
						chanContTypeBitmap:0b111111,
						systemTypesBitmap:0,
						// callbackId:id,
						messageDataControl: 0x7F,
						channel: xData.channel ,

					})
			];

			Promise.all(CtrlPromises).then((values) => {
				const [, , ChCtrlList] = values[0];
				const MIDIReportMessage = values[1] || [];

				event.reply('asynchronous-reply', 'CtrlListInfo',
					{
						ChCtrlList,
						MIDIReportMessage
					}
				);
			});
			break;
		}
		case 'showCtrlList':{
			const [,editWin] = createPopoupWin({
				fileToLoad:__dirname + '/output/cmpopup.html',
				finishLoad: {
					link: xData.link,
					channel: xData.channelListData?.channel - 1,
					...xData
				},
				parentWindow: event.sender,
				_umpDev: xData
			});
			//editWin.webContents.openDevTools();
			break;
		}
		case 'processInquiryMIDIGet': {
			whichGlobalMIDICI(xData.umpDev).getMIDIMessageReport(xData.muid,xData.groupToUse,xData).then(data=>{
				event.reply('asynchronous-reply', 'MIDIReportMessage'
					,data);
			});
			break;
		}



		case 'getEndpointInfo':{
			whichGlobalMIDICI(xData.umpDev).getEndpointInformation(xData.muid, parseInt(xData.xData),
				function (muid,status,informationData){
					whichGlobalMIDICI(xData.umpDev).setData(xData.muid,'/endpointInformation/status_'+xData.xData,informationData,true);
					sendToEditWindow(xData.muid, 'settings',whichGlobalMIDICI(xData.umpDev).remoteDevices[xData.muid]);

				}
			);
			break;
		}

		default:
			debugger;
	}

});

app.on('ready', createWindow);

app.on('before-quit', function () {
	global.isAppQuitting = true;
});

app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q

	global._midici.invalidateSelf();
	global._midiciM1.map(mciM1=>{
		mciM1.invalidateSelf();
	});
	app.quit();

});

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (global.indexWindow === null) {
		createWindow();
	}
});

function sendToEditWindow(muidRemote, eventname,xargs){
	 global._editWin.map(editWin=>{
		 if(!editWin || !editWin.webContents || !editWin.webContents.send)return;
		 if(editWin._umpDev && editWin._umpDev.muid===muidRemote){
			 editWin.webContents.send('asynchronous-reply', eventname,xargs);
		 }
	 });
}







function ciEventHandler(umpDev, group, event,...args){
	switch (event){
		case 'settingChange':{
			let [muidRemote] = args;
			sendToEditWindow(muidRemote,'settings',this.remoteDevices[muidRemote]);
			break;
		}
		case 'updatePE':{
			let [muidRemote, resource] = args;
			sendToEditWindow(muidRemote,'updatePE',resource);


			break;
		}
		//***************************************

		case 'discoveryRequest': {
			let [muidRemote, device, ciVer, ciSupport, maxSysex,outputPathId,fbIdx] = args;
			this.setData(muidRemote,'/midi1Packet',true);
			this.setData(muidRemote,'/umpPacket',false);
			this.setData(muidRemote,"/device/manufacturer",device.manufacturer,true);
			this.setData(muidRemote,"/device/manufacturerId",device.manufacturerId,true);
			this.setData(muidRemote,"/device/manufacturerId16",getManufacturer16bit(device.manufacturerId).manufacturerId16,true);
			this.setData(muidRemote,"/device/familyId",device.familyId,true);
			this.setData(muidRemote,"/device/modelId",device.modelId,true);
			this.setData(muidRemote,"/device/versionId",device.versionId,true);
			this.setData(muidRemote,"/outputPathId",outputPathId,true);

			if((fbIdx === 0x7F || fbIdx===undefined || umpDev.match(/umpVirtualMIDI/) ) && global.umpDevices[umpDev].getFBBasedOnGroup){
				fbIdx = global.umpDevices[umpDev].getFBBasedOnGroup(group);
			}
			this.setData(muidRemote,"/fbIdx",fbIdx,true);
			this.setData(muidRemote,'/midi1Packet',true);
			this.setData(muidRemote,'/umpPacket',false);


			this.findMatchingFile(muidRemote,homedir,()=>{
				const funcBlock = global.umpDevices[umpDev].remoteEndpoint.blocks.filter(fb=>fbIdx===fb.fbIdx)[0] || {};

				if(!funcBlock.muids){funcBlock.muids = {};}
				funcBlock.muids[muidRemote] = this.remoteDevices[muidRemote];
				funcBlock.muids[muidRemote].muidRemote = muidRemote;
				global.umpDevices[umpDev].reportEndpoint();
			});

			this.ev.emit('discoveryRequest', umpDev, group, muidRemote, device, ciSupport, maxSysex,outputPathId,fbIdx);

			if(outputPathId===undefined){outputPathId=0;}

			const newResponse = this.createMIDICIMsg(
				this._muid,
				0x71,
				0x7F,
				muidRemote,
				{
					ciSupport: 0, //0b0001110,
					fbIdx:0,
					outputPathId,
					group,
					maxSysex: global.configSetting.maxSysex
				}
			);
			this.completeMIDICIMsg(newResponse,umpDev);

			break;
		}
		case 'discoveryReply': {
			let [muidRemote, device, ciVer, ciSupport, maxSysex,outputPathId,fbIdx] = args;

			this.setData(muidRemote,"/device/manufacturer",device.manufacturer,true);
			this.setData(muidRemote,"/device/manufacturerId",device.manufacturerId,true);
			this.setData(muidRemote,"/device/manufacturerId16",getManufacturer16bit(device.manufacturerId).manufacturerId16,true);
			this.setData(muidRemote,"/device/familyId",device.familyId,true);
			this.setData(muidRemote,"/device/modelId",device.modelId,true);
			this.setData(muidRemote,"/device/versionId",device.versionId,true);
			this.setData(muidRemote,"/outputPathId",outputPathId,true);


			if((fbIdx === 0x7F || fbIdx===undefined || umpDev.match(/umpVirtualMIDI/) ) && global.umpDevices[umpDev].getFBBasedOnGroup){
				fbIdx = global.umpDevices[umpDev].getFBBasedOnGroup(group);
			}
			this.setData(muidRemote,"/fbIdx",fbIdx,true);

			this.setData(muidRemote,'/midi1Packet',true);
			this.setData(muidRemote,'/umpPacket',false);

			this.findMatchingFile(muidRemote,homedir,()=>{
				const funcBlock = global.umpDevices[umpDev].remoteEndpoint.blocks.filter(fb=>fbIdx===fb.fbIdx)[0] || {};

				if(!funcBlock.muids){funcBlock.muids = {};}
				funcBlock.muids[muidRemote] = this.remoteDevices[muidRemote];
				funcBlock.muids[muidRemote].muidRemote = muidRemote;
				global.umpDevices[umpDev].reportEndpoint();
			});


			ev.emit('discoveryReplyPost', muidRemote, device, ciSupport, maxSysex);
			break;
		}
		case 'InvalidRemoteID':{
			let [muid] = args;
			global.umpDevices[umpDev].remoteEndpoint.blocks.map((b)=>{
				if(b.muids[muid]){
					delete b.muids[muid];
					global.umpDevices[umpDev].reportEndpoint();
				}
			});
			break;
		}
		case 'nak':
		case 'ack':{
			break;
		}

		case 'protocolNegotiation':
		{
			let [muidRemote] = args;
			const newResponse = this.createMIDICIMsg(
				this._muid,
				0x11,
				0x7F,
				muidRemote,
				{
					authorityLevel: 0x60,
					protocolCount: 1,
					protocols:[midi2Tables.ciProtocols.umpmidi10,midi2Tables.ciProtocols.umpmidi10mixed,midi2Tables.ciProtocols.umpmidi20],
					currentProtocol: midi2Tables.ciProtocols.umpmidi10,
				}
			);
			this.completeMIDICIMsg(newResponse,umpDev);
			break;
		}
		case 'testNewProtocol':{
			let [muidRemote] = args;
			const newResponse = this.createMIDICIMsg(this._muid,
				0x14, 0x7F,
				muidRemote,{authorityLevel: 0x60});
			this.completeMIDICIMsg(newResponse,umpDev);
			break;
		}
		case 'testNewProtocolResponder':{
			let [muidRemote] = args;
			const newResponse = this.createMIDICIMsg(this._muid,
				0x15, 0x7F,
				muidRemote,{authorityLevel: 0x60});
			this.completeMIDICIMsg(newResponse,umpDev);
			const proposedProtocol = this.getData(muidRemote, '/proposedProtocol');
			this.setData(muidRemote, '/currentProtocolId',proposedProtocol);
			this.setData(muidRemote, '/proposedProtocol',null);
			break;
		}

		case 'setProtocol':
		case 'recvProtocols':{
			break;
		}


		case 'confirmProtocol':
		{
			// const proposedProtocol = this.getData(muidRemote, '/proposedProtocol');
			// this.setData(muidRemote, '/currentProtocolId',proposedProtocol);
			// this.setData(muidRemote, '/proposedProtocol',null);
			break;
		}

		case'profileInquiry':
		{
			//TODO This is new Responder Work!!
			//TODO This is new Responder Work!!
			//TODO This is new Responder Work!!
			let [sourceDestination, muidRemote] = args;
			if(sourceDestination === 0x7F){
				//Send all...
				// Object.keys(global.configSetting.functionalBlocks).map(fbType=>{
				//
				// });



			}
			const newResponse = this.createMIDICIMsg(this._muid,
				0x21, sourceDestination,
				muidRemote,{profileList: []});
			this.completeMIDICIMsg(newResponse,umpDev);
			break;
		}
		case'profileDetailsReply':
		case'profileOn':
		case'profileOff':
		case'profileAdd':
		case'profileRemove':
		{
			//TODO This is new Responder Work!!
			break;
		}
		case 'profileEnabled':{
			//TODO This is new Responder Work!!
			//let [sourceDestination,muidRemote,profiles,profile] = args;
			break;
		}
		case 'profileDisabled':{
			//TODO This is new Responder Work!!
			//let [sourceDestination,muidRemote,profiles,profile] = args;
			break;
		}
		case 'profileReplyList':{
			//TODO This is new Responder Work!!
			//let [sourceDestination,muid,profiles] = args;
			break;
		}
		case 'profileSpecificData':{
			//TODO This is new Responder Work!!
			//let [sourceDestination,muid,profile, profileSpecificData] = args;

			// if (mOut._editWin) {
			// 	Object.keys(mOut._editWin).map(id => {
			// 		this.mOut._editWin[id].webContents.send('asynchronous-reply', 'profileSpecificData', {
			// 			sourceDestination,muid,profile, profileSpecificData
			// 		});
			// 	});
			// }
			break;
		}

		case 'peCapabilities':{
			let [muidRemote] = args;
			const newResponse = this.createMIDICIMsg(this._muid,
				0x31, 0x7F,
				muidRemote,{peVersion: 0x00,simultaneousPERequests: configSetting.simultaneousPERequests});
			this.completeMIDICIMsg(newResponse,umpDev);
			break;
		}

		case 'notifyMessage':{
			//TODO This is new Responder Work!!
			//let [muid,requestId,reqHead,reqBody] = args;
			break;
		}
		case 'peSubRequest':{
			//TODO This is new Responder Work!!
			break;
		}
		case 'peGetRequest':
			let [muid, requestId, reqHead] = args;
			switch(reqHead.resource){
				case 'DeviceInfo':
				case 'ResourceList':{
					this._peSendReply(0x35,muid, requestId,
						{status:200,cacheTime:1800},
						configSetting.responder[reqHead.resource]
						);
					break;
				}
				case 'ProgramList':{
					let data = patchesDB.chain();
					const totalCount = patchesDB.count();
					if(reqHead.offset){
						data = data.offset(reqHead.offset);
					}
					if(reqHead.limit){
						data = data.limit(reqHead.limit);
					}
					const result = [];
					data.data().map(p=>{
						result.push({
							bankPC: p.bankPC,
							title: p.title,
							category: p.category || [],
							tags: p.tags || []
						});
					});
					this._peSendReply(0x35,muid, requestId,
						{status:200,totalCount,cacheTime:10},
						result
					);
					break;
				}
				case 'ChannelList':
				//case 'StateList':
				//case 'State':
				default:{
					this._peSendReply(0x35,muid, requestId,
						{status:500}
					);
					break;
				}
			}
			break;
		case 'peCapabilitiesRecv':
		case 'peGetResponse':
		case 'peSetRequest':
		case 'peSetResponse':
		case 'peSubResponse':
		{
			break;
		}

		case 'endpointInformation':
		case 'processInquiryCapabilitiesReply':
		{
			break;
		}
		default:
			debugger;
	}
}
//********************

function form_ymdHis(xDate) {
	return xDate.getFullYear().toString(10).substring(2)
		+ (xDate.getMonth()+1).toString(10).padStart(2,'0')
		+ xDate.getDate().toString(10).padStart(2,'0')
		+ xDate.getHours().toString(10).padStart(2,'0')
		+ xDate.getMinutes().toString(10).padStart(2,'0')
		+ xDate.getSeconds().toString(10).padStart(2,'0')
}


function buildPDF(pdfName,xData){
	const window_to_PDF = new BrowserWindow({
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			backgroundThrottling: false,
			autoplayPolicy: 'no-user-gesture-required'
		}
	});//to just open the browser in background

	window_to_PDF.loadFile(__dirname + '/output/'+pdfName+'.html'); //give the file link you want to display
	projectPath = homedir + '/' + xData.umpDev;
	if (!fs.existsSync(projectPath)) {
		fs.mkdirSync(projectPath);
	}
	const pdfPath = path.join(projectPath, pdfName+'.pdf');
	//window_to_PDF.webContents.openDevTools();
	window_to_PDF.webContents.on('did-finish-load', () => {
		setTimeout(() => {
			xData.printMode = true;
			window_to_PDF.webContents.send('asynchronous-reply', 'firstLoad', xData);
		}, 500);
		// Use default printing options
		setTimeout(function () {
			window_to_PDF.webContents.printToPDF({
					landscape: false,
					marginsType: 0,
					printBackground: true,
					printSelectionOnly: false,
					pageSize: 'A4'
				},
				function (err, data) {
					//debugger;
					if (err) {
						//do whatever you want
						debugger;
						return;
					}
					try {
						fs.writeFileSync(pdfPath, data);
						shell.openExternal('file://' + pdfPath)
					} catch (err) {
						//unable to save pdf..
						debugger;
					}

				}).then(data => {
				try {
					fs.writeFileSync(pdfPath, data);
					shell.openExternal('file://' + pdfPath)
				} catch (err) {
					//unable to save pdf..
					debugger;
				}
			});
		}, 2000);

	});
}
