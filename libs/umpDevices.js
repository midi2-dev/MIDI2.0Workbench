const t = require("./translations");
const d = require("./debugger");
const {JsonPointer: ptr} = require("json-ptr");
const {arrayToHex} = require("./debugger");
const {midici} = require("./midici");
const {getRandomInt} = require("./utils");

const bridgeMIDICI = new midici({ciEventHandler: ()=>{}, midiOutFunc: ()=>{}});
bridgeMIDICI.debug =  true;
//bridgeMIDICI.device =  global.configSetting.deviceInfo;
bridgeMIDICI.ciVer = 2;
bridgeMIDICI.ev.on('inUMP',(o)=>{});


if(!global.umpDevices){
    global.umpDevices = {};
}

const whichGlobalMIDICI = (umpDev)=>{
    let matches = umpDev.match(/umpVirtualMIDI(\d)/);
    return matches?global._midiciM1[matches[1]]: global._midici;
};

module.exports = {
    getMIDIEndpointUMP: [((0xF << 28) >>> 0) + (1<<8) + 2, 0b11111,0,0],
    whichGlobalMIDICI: whichGlobalMIDICI,
    getFBUMP: (fbIdx=0xff)=>{return [
                ((0xF << 28) >>> 0) + (0x010 << 16) + (fbIdx << 8) + 0x3,
                0, 0, 0
            ];
        },
    addUMPDevice: (umpDev,umpClassFunc)=>{

        let classFunc = {
            display : () => {return true;},
            extraTextGet : () => {return '';},
            remove : () => {},
            getUMPDataAndBlocks: () =>{
                classFunc.midiOutFunc(umpDev,module.exports.getMIDIEndpointUMP);
                classFunc.midiOutFunc(umpDev,module.exports.getFBUMP(0xFF));
            },
            getFBBasedOnGroup: (group) =>{
                let fbIdx = null;
                (classFunc.remoteEndpoint.blocks || []).map(gb => {
                    if (fbIdx ===null && gb.direction === 0b11 && gb.firstGroup <= group && gb.firstGroup+gb.numberGroups > group) {
                        fbIdx = gb.fbIdx===undefined?gb.gbIdx:gb.fbIdx;

                    }
                });
                return fbIdx;
            },
            checkFBBasedOnGroup: (fbIdx, group) =>{
                let res = false;
                (classFunc.remoteEndpoint.blocks || []).map(gb => {
                    if (fbIdx === gb.fbIdx && gb.direction === 0b11 && gb.firstGroup <= group && gb.firstGroup+gb.numberGroups > group) {
                        res = true;
                    }
                });
                return res;
            },
            ...umpClassFunc,
            midiToProc: midiToProc,
            remoteEndpoint:{
                versionMajor:1,
                versionMinor:0,
                midi2Supp:{},
                rawFunctionBlocks:[],
                //numOfBlocks: -1,
                staticBlocks: false,
                blocks:[],
                udpServer:false,
                udpClient:false,
                name: umpClassFunc.name,
                ...umpClassFunc.remoteEndpoint||{}
            },

        };


        global.umpDevices[umpDev] = classFunc;
        console.log(`Added UMP Device: ${umpDev}`);

        classFunc.reportEndpoint = ()=>{
            classFunc.remoteEndpoint.extraText =  classFunc.extraTextGet() || classFunc.name;
            if (global.indexWindow && classFunc.display()) {
              global.indexWindow.webContents.send('asynchronous-reply',
                  'umpDev', {umpDev, endpoint: classFunc.remoteEndpoint});
            }

           global._editWin.map(editWin => {
              if (editWin._umpDev && editWin._umpDev.umpDev === umpDev) {
                  if (editWin._fileData) {
                      ptr.set(editWin._fileData, "/remoteEndpoint", classFunc.remoteEndpoint, true);
                  }
                  editWin.webContents.send('asynchronous-reply', 'remoteEndpoint', classFunc.remoteEndpoint);
              }
          });
        };

        classFunc.reportBlocks = (staticBlocks, blocks)=>{
            classFunc.remoteEndpoint.staticBlocks = staticBlocks;
            classFunc.remoteEndpoint.blocks = blocks;

            let discoveryGroupCheck =[];
            classFunc.remoteEndpoint.blocks.map(fb=>{
                if(!fb.active)return;
                if(fb.direction === 0b11 && !fb.sentDiscovery){
                    fb.sentDiscovery = true;
                    if(discoveryGroupCheck.indexOf(fb.firstGroup)===-1){
                        whichGlobalMIDICI(umpDev).sendDiscovery(umpDev, fb.firstGroup);
                        discoveryGroupCheck.push(fb.firstGroup);
                    }
                }
            });
            classFunc.reportEndpoint();
        };

        classFunc.processUMPEndpoint = (o) =>{
            if(o.mt===0xF) {
                switch (o.status) {
                    case 0x00:
                        classFunc.remoteEndpoint['midi2Supp'].umpSendEPDisc = true;
                        break;
                    case 0x1: //MIDI Endpoint Info Notification
                        classFunc.remoteEndpoint.rawFunctionBlocks=[];
                        classFunc.remoteEndpoint.blocks=[];
                        classFunc.remoteEndpoint['midi2Supp'].umpEPInfoReply = true;
                        //classFunc.getFunctionBlocks();
                        classFunc.remoteEndpoint['versionMajor'] = o.versionMajor;
                        classFunc.remoteEndpoint['versionMinor'] = o.versionMinor;
                        classFunc.remoteEndpoint['midi2Supp'].umpver = `${o.versionMajor}.${o.versionMinor}`;
                        classFunc.remoteEndpoint['staticBlocks'] = !!o.staticFuncBlocks;
                        classFunc.remoteEndpoint['numOfBlocks'] = o.numOfFuncBlocks;

                        classFunc.remoteEndpoint.rawFunctionBlocks = Array(o.numOfFuncBlocks).fill({});
                        classFunc.remoteEndpoint['midi2Supported'] = o.midi2Supported;
                        classFunc.remoteEndpoint['midi1Supported'] = o.midi1Supported;
                        classFunc.remoteEndpoint['jrrxSupported'] = o.jrrxSupported;
                        classFunc.remoteEndpoint['jrtxSupported'] = o.jrtxSupported;
                        classFunc.reportEndpoint();
                        break;
                    case 0x2: //MIDI Endpoint Device Id Notification
                        classFunc.remoteEndpoint['midi2Supp'].umpEPIdentityReply = true;
                        classFunc.remoteEndpoint.manuDetails = o.manuDetails;
                        classFunc.remoteEndpoint['manufacturerId'] = o.manufacturerId;
                        classFunc.remoteEndpoint['familyId'] = o.familyId;
                        classFunc.remoteEndpoint['modelId'] = o.modelId;
                        classFunc.remoteEndpoint['versionId'] = o.versionId;
                        classFunc.reportEndpoint();
                        break;
                    case 0x3: //MIDI Endpoint Name Reply
                        classFunc.remoteEndpoint['midi2Supp'].umpEPNameReply = true;
                        classFunc.remoteEndpoint['name'] = o.name;
                        classFunc.remoteEndpoint['model'] = o.name;
                        classFunc.reportEndpoint();
                        break;
                    case 0x4: //MIDI Endpoint ProdId Reply
                        classFunc.remoteEndpoint['midi2Supp'].umpEPPIdReply = true;
                        classFunc.remoteEndpoint['prodInstId'] = o.prodInstId;
                        classFunc.reportEndpoint();
                        break;
                    case 0x5: //Stream Configuration Request
                        //Not sure what to do here?
                        classFunc.remoteEndpoint['midi2Supp'].umpStreamConfig = true;
                        break;
                    case 0x6: //Stream Configuration Reply
                        classFunc.remoteEndpoint['midi2Supp'].umpStreamConfig = true;
                        classFunc.remoteEndpoint.midi2On= (o.protocol === 0x2);
                        classFunc.remoteEndpoint.midi1On= (o.protocol === 0x1);
                        classFunc.reportEndpoint();
                        break;
                    case 0x11: { //FB Info Reply

                        //clear all GB Blocks - weird reset issue
                        classFunc.remoteEndpoint.blocks = classFunc.remoteEndpoint.blocks.filter(b=>b.gbIdx===undefined);

                        classFunc.remoteEndpoint['midi2Supp'].umpFBReport = true;
                        if(classFunc.remoteEndpoint.rawFunctionBlocks[o.fbIdx]===undefined){
                            //report error
                            let err = `Function Block Index (${o.fbIdx}) does not match number of FBs`;
                            d.msg('ump',o.ump
                                ,'in',umpDev,
                                0,[err], null);
                        }else{
                            classFunc.remoteEndpoint.rawFunctionBlocks[o.fbIdx] = o;
                        }
                        // let idxRaw = classFunc.remoteEndpoint.rawFunctionBlocks.findIndex(b => b.fbIdx === o.fbIdx);
                        // if (idxRaw === -1) {
                        //     idxRaw = classFunc.remoteEndpoint.rawFunctionBlocks.push({}) - 1;
                        // }
                        //
                        // classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].fbIdx = o.fbIdx;
                        // classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].active = o.active;
                        // classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].isMIDI1 = o.isMIDI1;
                        // classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].direction = o.direction;
                        // classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].firstGroup = o.firstGroup;
                        // classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].numberGroups = o.numberGroups;
                        // classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].ciVersion = o.ciVersion;
                        // classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].sysex8Streams = o.sysex8Streams;

                        let idx = classFunc.remoteEndpoint.blocks.findIndex(b => b.fbIdx === o.fbIdx);
                        if (idx === -1) {
                            idx = classFunc.remoteEndpoint.blocks.push({}) - 1;
                        }
                        classFunc.remoteEndpoint.blocks[idx] = {
                            ...classFunc.remoteEndpoint.blocks[idx],
                            ...classFunc.remoteEndpoint.rawFunctionBlocks[o.fbIdx] || {},
                            sentDiscovery: false
                        }
                        classFunc.reportBlocks(classFunc.remoteEndpoint['staticBlocks'], classFunc.remoteEndpoint.blocks);
                        break;
                    }
                    case 0x12: { //FB Name Reply
                        let idxRaw = classFunc.remoteEndpoint.rawFunctionBlocks.findIndex(b => b.fbIdx === o.fbIdx);
                        if (idxRaw === -1) {
                            idxRaw = classFunc.remoteEndpoint.rawFunctionBlocks.push({}) - 1;
                        }
                        classFunc.remoteEndpoint.rawFunctionBlocks[idxRaw].name = o.name;

                        let idx = classFunc.remoteEndpoint.blocks.findIndex(b=>b.fbIdx === o.fbIdx);
                        if(idx===-1){
                            idx = classFunc.remoteEndpoint.blocks.push({}) - 1;
                        }
                        classFunc.remoteEndpoint.blocks[idx].name = o.name;

                        classFunc.reportBlocks(classFunc.remoteEndpoint['staticBlocks'], classFunc.remoteEndpoint.blocks);
                        break;
                    }
                    case 0x040: { //Ping
                        //Send Reply to Ping
                        global.umpDevices[umpDev].midiOutFunc(umpDev,
                            [
                                ((0xF << 28) >>> 0) + (0x41<<8),
                                o.ump[1],
                                o.ump[2],
                                o.ump[3]
                            ]
                        );
                        break;
                    }
                    case 0x041: { //Ping Reply
                        global._editWin.map(editWin => {
                            if (editWin._umpDev && editWin._umpDev.umpDev === umpDev) {
                                editWin.webContents.send('asynchronous-reply', '', {type: 0x41, ump:o.ump});
                            }
                        });
                        break;
                    }
                    default:
                        if(global.umpDevices[umpDev].extendedProcessUMPEndpoint){
                            global.umpDevices[umpDev].extendedProcessUMPEndpoint(o);
                        }
                        break;

                }
            }else
            if(o.mt===0x0) {
                switch (o.status) {
                    case 3: //JR Protocol Req
                        debugger; //Not sure what to do here?
                        break;
                    case 4: //JR Protocol Notify
                        classFunc.remoteEndpoint = {...classFunc.remoteEndpoint, ...o};
                        classFunc.updateEndpoint();
                        break;
                }
            }
        };

        setTimeout(()=>{
            console.log(`Requesting FB's etc ${umpDev}`);
            classFunc.getUMPDataAndBlocks();
        },200);


        if (global.indexWindow && classFunc.display()) {
            global.indexWindow.webContents.send('asynchronous-reply',
                'umpDev', {umpDev, endpoint: classFunc.remoteEndpoint});
        }

        return classFunc;
    },
    removeUMPDevice: (umpDev)=>{

        //Cleanup required?
        console.log(`Remove UMP Device: ${umpDev}`);

        if(global.umpDevices[umpDev] && global.umpDevices[umpDev].remove){
            global.umpDevices[umpDev].remove();
        }

        delete global.umpDevices[umpDev];
        global.indexWindow.webContents.send('asynchronous-reply', 'umpDevRemove', {umpDev});
        global._editWin.map(editWin=>{
            if(editWin._umpDev && editWin._umpDev.umpDev===umpDev){
                editWin.close();
            }
        });
    },
    midiOutFunc:(umpDev, ump) => {
        global.umpDevices[umpDev].midiOutFunc(umpDev, ump);
    }
};



function midiToProc(umpDev, ump){
    if(global.umpDevices[umpDev].sendUMPOutNetwork){
        global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,ump);
    }

    let bridgeEnabled = false;
    if(global.configSetting.bridging.indexOf(umpDev)!==-1){
        global.configSetting.bridging.filter(v=> v!==umpDev).map(umpDevBridge=>{
            global.umpDevices[umpDevBridge].midiOutFunc(umpDevBridge,ump,true);
            bridgeEnabled = true;

        });
    }

    t.processUMP(ump,umpDev,(type,group, data,errors,warnings) =>{
        switch (type){
            case 'sysex':
                if (data.msgObj) {
                    if (data.msgObj.sysex[1] === 0x7E) {
                        if (data.msgObj.sysex[3] === 0x0D) { //MIDI-CI Message

                            if(bridgeEnabled){
                                bridgeMIDICI.processCI(data.msgObj, group, umpDev);
                            }else{
                                whichGlobalMIDICI(umpDev).processCI(data.msgObj, group, umpDev);
                            }
                            //console.log('Processed sysex for',umpDev)
                        } else {
                            //this._connectedMout._u.processUni(data);
                        }
                    } else {
                        d.msg('sysex', data.msgObj.debug.getDebug(), 'in', umpDev, group);
                    }
                }
                if(!data.ump){console.log("bad UMP:"+umpDev);console.log(data.ump);}
                d.msg('ump',data.ump,'in',umpDev, group,errors,warnings);

                break;
            case 'ump':
                if(bridgeEnabled){
                    bridgeMIDICI.processUMP(data, group, umpDev);
                }else {
                    whichGlobalMIDICI(umpDev).processUMP(data, group, umpDev);
                    whichGlobalMIDICI(umpDev).ev.emit('inUMP', {ump: data, umpDev});

                    if((data[0] & 0xFFFF00FF) === 0x50000000 ){ //Developer Transport Test
                        let subId2 = data[1]  & 0xFF;
                        // if(subId2 === 0x00){ //Discovery
                        //     global.umpDevices[umpDev].midiOutFunc(umpDev,[data[0], data[1]+1,0x01010100,0]);
                        // }
                        if(subId2 === 0x01){ //Discovery Reply
                            global.umpDevices[umpDev].remoteEndpoint['transportTest'] = {
                                loopbackPacket: !!((data[1] >> 24) & 0xFF),
                                loopbackMessage: !!((data[1] >> 16) & 0xFF),
                                validateTestData: !!((data[1] >> 8) & 0xFF),
                            };
                            global.umpDevices[umpDev].updateEndpoint();
                        }
                    }
                }
                if(!data){console.log("bad UMP:"+umpDev);console.log(data);}
                d.msg('ump',data,'in',umpDev, group,errors,warnings);
                break;
            case 'umpEndpoint':
                //global.umpDevices[umpDev].processUMPEndpoint(data)

                //Requesting Data from Endpoint
                if(!data.ump){console.log("bad UMP:"+umpDev);console.log(data.ump);}
                d.msg('ump',data.ump,'in',umpDev, group,errors,warnings);


                switch(data.status){
                    case 0x000://Get MIDI Endpoint Info
                        if(data.filter & 0x1){
                            const umpMess = [0,0,0,0];
                            umpMess[0] = ((0xF << 28) >>> 0) + (0x001 << 16) +  (1<<8) + 1;
                            umpMess[1] = (( 1 << 24) >>> 0) + 8 + 4 ; //bad guessing here
                            // if(global.umpDevices[umpDev].sendUMPOutNetwork){
                            //     global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,umpMess);
                            // }
                        }
                        if(data.filter & 0x3) {
                            // if(global.umpDevices[umpDev].sendUMPOutNetwork){
                            //     global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,t.stringToTypeF(3,null, m2.iProduct));
                            // }
                        }
                        if(data.filter & 0x4) {
                            // if(global.umpDevices[umpDev].sendUMPOutNetwork){
                            //     global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,t.stringToTypeF(4,null, m2.iSerialNumber));
                            // }
                        }
                        break;
                    case 0x0010: { //Get Function Block Info
                        
                        break;
                    }
                }


                break;
            case 'umpEndpointProcess':
                if(!bridgeEnabled && global.umpDevices[umpDev].processUMPEndpoint){
                    global.umpDevices[umpDev].processUMPEndpoint(data);
                }else{
                    //debugger;
                }
                if(!data.ump){console.log("bad UMP:"+umpDev);console.log(data.ump);}
                d.msg('ump',data.ump,'in',umpDev, group,errors,warnings);
                break;
        }
    });
}
