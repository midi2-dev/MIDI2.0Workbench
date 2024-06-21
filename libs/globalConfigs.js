const os = require("os");
const {app} = require("electron");
const fs = require("fs");


const release = os.release().split('.').map(v=>parseInt(v,10));

const homedir = app.commandLine.getSwitchValue('configDir') || require('os').homedir()+'/midi2workbench/';
if (!fs.existsSync(homedir)){
    fs.mkdirSync(homedir);
}

let configFromFile = {};
const configFileLocation = homedir+'config.json';

if (fs.existsSync(configFileLocation)){
    configFromFile = JSON.parse(fs.readFileSync(configFileLocation));
}
global.configSetting = {
    maxSysex: 2048, simultaneousPERequests:4, peCompression: false,
    experimentalSpecs: false,
    sysexTimer: 20,
    ciVerLocal:2,
    productInstanceId: Math.random().toString(16).substr(2, 9),
    umpVirtualMIDI1:[],
    osAPIinUse: os.platform(),
    osPlatform: os.platform(),
    ...configFromFile,
    workbenchMIDI1VirtPortName: app.commandLine.getSwitchValue('virtualMidiName') || "MIDI 2.0 Workbench",
    mdnsRemoteAnswers:{},
    bridging:[],
    deviceInfo: {
        manufacturerId16: 0x7D
        ,manufacturerId: [0x7D,0,0]
        ,manufacturer: 'Educational Use'
        ,familyId:[0,0]
        ,family:'Test MIDI CI'
        ,modelId:[1,0]
        ,model:'MIDI 2.0 Workbench'
        ,versionId:[0,0,3,0]
        ,version:"0.3"
    }
};

if(os.platform()==='darwin' && (release[0] * 100) + release[1] >= 2104) {
    global.configSetting.osAPI = 'coreMIDI';
}else{
    global.configSetting.osAPI = os.platform();
}
