const {BrowserWindow} = require("electron");
const {JsonPointer: ptr } = require('json-ptr');
const {networkMIDICodes} = require("./networkMIDITables");
module.exports = {getRandomInt, createPopoupWin, processPacket, sendOutUMPBrokenUp, setRemoteEndpointValueFromMUID
,getNumberFromBytes,getBytesFromNumbers};


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


function processPacket(msg,oOpts={}){
    let length = msg.length;
    let pos = 0;

    const getWord = ()=>{
        return ((msg[pos++] << 24) + (msg[pos++] << 16) + (msg[pos++] << 8) + msg[pos++])>>>0;
    }

    if(getWord() !== startPacket){
        if(oOpts.badPacket)oOpts.badPacket();
        return; //Bad Packet no 'startPacket'
    }

    while(pos < length){
        let cCode=msg[pos];

        let mType = networkMIDICodes[cCode];
        if(!mType){
            if(oOpts.badPacket)oOpts.badPacket();
            return;
        }
        let keys = {};
        mType.bytes.map(d=>{
            let v=[];
            let length = d.length;
            if(typeof d.length === 'function'){
                length = d.length(keys);
            }
            for(let i=0;i<length;i++){
               v.push(msg[pos++]);
            }
            switch(d.type) {
                case 'text':
                    let text = new TextDecoder().decode(new Uint8Array(v));
                    keys[d.key] = text;
                    break;
                case 'array':
                    keys[d.key] = v;
                    break;
                case 'function':
                    keys[d.key] = d.cval(keys, v);
                    break;
                case 'wordArray': {
                    keys[d.key] = [];
                    let vc = 0;
                    for (let i = 0; i < v.length; i++) {
                        vc = (vc << 8) + v[i];
                        if((i+1)%4 === 0){
                            keys[d.key].push(vc>>>0);
                            vc=0;
                        }
                    }
                    break;
                }
                default: {
                    let vc = 0;
                    for (let i = 0; i < v.length; i++) vc += v[i] << ((v.length - i -1) * 8);
                    keys[d.key] = vc >>> 0;
                    break;
                }

            }
        });
        let args = [];
        (mType.oOptArgs || []).map(k=>{
            args.push(keys[k]);
        });
        if(oOpts[mType.oOptName]){
            oOpts[mType.oOptName](...args);
        }
    }
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


function getNumberFromBytes(sysex,offset,amount){
    let num = 0;const upperOffset = offset+amount;
    for(let offsetC = offset; offsetC<upperOffset;offsetC++){
        num += sysex[offsetC] << (7* (offsetC-offset));
    }
    return num;
}

function getBytesFromNumbers(number,amount){
    const bytes = [];
    for(let amountC = amount; amountC>0;amountC--){
        bytes.push(number & 127);
        number = number >> 7;
    }
    return bytes;
}

function wordsToIPv6(w1, w2, w3, w4) {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);

    // Set 32-bit words
    view.setUint32(0, w1);
    view.setUint32(4, w2);
    view.setUint32(8, w3);
    view.setUint32(12, w4);

    // Convert to 16-bit segments for IPv6 notation
    let segments = [];
    for (let i = 0; i < 16; i += 2) {
        segments.push(view.getUint16(i).toString(16));
    }

    return segments.join(':');
}




