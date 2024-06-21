const {BrowserWindow} = require("electron");
const {JsonPointer: ptr } = require('json-ptr');
module.exports = {getRandomInt, createPopoupWin, sendOutUMPBrokenUp, setRemoteEndpointValueFromMUID};


const startPacket = 0x4D494449; //“MIDI”

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max+1));
}


function createPopoupWin(oOpt){
    const id = Math.random().toString(36).substr(2, 9);
    const editWin = new BrowserWindow({
        parent: oOpt.parentWindow,
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            backgroundThrottling: false,
            autoplayPolicy: 'no-user-gesture-required'
        }
    });
    editWin.setMenuBarVisibility(false);
    //From https://github.com/electron/electron/pull/573
    //Allows for YouTube embeds
    editWin.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({responseHeaders: Object.fromEntries(Object.entries(details.responseHeaders).filter(header => !/x-frame-options/i.test(header[0])))});
    });
    editWin.on('closed', () => {
        if(oOpt.onClose)oOpt.onClose();
        global._editWin = global._editWin.filter(w=>w._id!==editWin._id);
        editWin.destroy()
    });
    if(oOpt.openDebug ) editWin.webContents.openDevTools();

    if(oOpt.finishLoad || oOpt._umpDev) {
        editWin.webContents.on('did-finish-load', () => {
            editWin.webContents.send('asynchronous-reply', 'firstLoad',
                {
                    ...oOpt.finishLoad ||{},
                    ...oOpt._umpDev ||{},
                    uiWinId:id
                }
            );
        });
    }

    if(oOpt.fileToLoad) editWin.loadFile(oOpt.fileToLoad );
    if(oOpt._umpDev) editWin._umpDev = oOpt._umpDev;



    editWin._id = id;
    global._editWin.push(editWin);



    return [id,editWin];
}


async function sendOutUMPBrokenUp(ump,sleep,cb){
    for(let i=0; i<ump.length;i++){
        const mt = ump[i] >>> 28;
        const group = ump[i] >> 24 & 0xF;
        switch (mt) {
            case 0: //32 bits Utility Messages
            case 1: //32 bits Utility Messages
            case 2: //32 bits Utility Messages
            case 6: //32 bits Utility Messages
            case 7: //32 bits Utility Messages
                cb( [ump[i]],group);
                if(sleep)await _sleep(sleep);
                break;
            case 3: //64 bits Utility Messages
            case 4: //64 bits Utility Messages
            case 8: //64 bits Utility Messages
            case 9: //64 bits Utility Messages
            case 0xA: //64 bits Utility Messages
                cb(  [ump[i++],ump[i]],group);
                if(sleep)await _sleep(5);
                break;
            case 0xB: //96 bits Utility Messages
            case 0xC: //96 bits Utility Messages
                cb( [ump[i++],ump[i++], ump[i]],group);
                if(sleep)await _sleep(5);
                break;
            default:
                cb([ump[i++],ump[i++],ump[i++], ump[i]],group);
                if(sleep)await _sleep(5);
                break;

        }
    }
}

function setRemoteEndpointValueFromMUID(muid, path, val, force=false){
    let umpDev = global._midici.remoteDevicesInternal[muid]?.umpDev;//
    if(!umpDev){
        global._midiciM1.map(mciM1=>{
            umpDev =  mciM1.remoteDevicesInternal[muid]?.umpDev;
        });
    }
    // || global._midiciM1.remoteDevicesInternal[muid]?.umpDev;
    if(!umpDev || !global.umpDevices[umpDev]) return;
    if(force || ptr.get(global.umpDevices[umpDev],path)!==undefined)return;
    ptr.set(global.umpDevices[umpDev],path,val,true);
}


