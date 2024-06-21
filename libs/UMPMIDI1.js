const t = require('./translations.js');
//const os = require("os");
//const release = os.release().split('.').map(v=>parseInt(v,10));

let midi = require("midi");

const {app} = require("electron");
const d = require("./debugger");
const {addUMPDevice, whichGlobalMIDICI} = require("./umpDevices");
const {arrayToHex} = require("./debugger");
const {sendOutUMPBrokenUp} = require("./utils");

const midiOuts=[];
const midiIns=[];





function load_umpVirtualMIDI (virtualMIDIUMP = 0){
    if(!global.configSetting['umpVirtualMIDI'+ virtualMIDIUMP]){
        global.configSetting['umpVirtualMIDI'+ virtualMIDIUMP]=[];
    }
    let groupM1OutDevices = new Array(16).fill(null);
    const umpVirtualMIDI = {
        name:`MIDI 1.0 Devices (${virtualMIDIUMP})`,
        // extraText: "Configure and set-up MIDI 1.0 Devices here.",
        workbench: true,
        remoteEndpoint: {
            device:configSetting.deviceInfo,
            staticBlocks: 1,
            name: `MIDI 1.0 Devices (${virtualMIDIUMP})`
        },

        getUMPDataAndBlocks:()=>{
            let blocks=[];
            global.configSetting['umpVirtualMIDI'+ virtualMIDIUMP].map((vm1,idx)=>{

                blocks.push({
                    fbIdx: idx,
                    firstGroup: vm1.group,
                    numberGroups: 1,
                    direction: 0b11,
                    ciSupport: 0x00,
                    isMIDI1: 0x02,
                    active: true,
                    name: vm1.name || vm1.in
                });

            });
            global.umpDevices['umpVirtualMIDI'+ virtualMIDIUMP].reportEndpoint();
            global.umpDevices['umpVirtualMIDI'+ virtualMIDIUMP].reportBlocks(true, blocks);
        },

        getFBBasedOnGroup:(group) =>{
            return groupM1OutDevices[group].fbIdx;
        },
        midiOutFunc: (umpDev, ump, isFromNetwork=false) => {

            sendOutUMPBrokenUp(ump,0,(umpSplit,group)=>{
                d.msg('ump',umpSplit,'out',umpDev, group);
            });
            t.processUMP(ump, umpDev+'_', (type, group, data) => {
                const out = groupM1OutDevices[group];
                if(type==='ump'){

                    if (!out) return;
                    let outpackets = t.umpToMidi10(ump);
                    outpackets.map(msg => {
                        if(out){
                            if(!out.sendMessage && out.out){
                                out.out.sendMessage(msg);
                            }else {
                                out.sendMessage(msg);
                            }
                        }
                    });

                    if(isFromNetwork){
                        if((ump[0] & 0xFFFF00FF) === 0x50000000 ){ //Developer Transport Discovery
                            let subId2 = ump[1]  & 0xFF;
                            if(subId2 === 0x00){ //Discovery Request - send Reply
                                global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,[ump[0], ump[1]+1,0x01010100,0]);
                            }
                        }

                        if((ump[0] & 0xFFFF00FF) === 0x50100000 ){ //Loopback Packet Test
                            let subId2 = ump[1]  & 0xFF;
                            if(subId2 === 0x10){ //Loopback Packet Inquiry
                                global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,[ump[0], ump[1]+1,ump[2],ump[3]]);
                            }
                        }
                    }

                }else if(isFromNetwork && type==='umpEndpoint'){
                    switch(data.status){
                        case 0x000://Get MIDI Endpoint Info
                            if(data.filter & 0x1){
                                const umpMess = [0,0,0,0];
                                umpMess[0] = ((0xF << 28) >>> 0) + (0x001 << 16) +  (1<<8) + 1;
                                umpMess[1] = (( global.configSetting['umpVirtualMIDI'+ virtualMIDIUMP].length << 24) >>> 0) + 8 + 4 ; //bad guessing here
                                if(global.umpDevices[umpDev].sendUMPOutNetwork){
                                    global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,umpMess);
                                }
                            }

                            if(data.filter & 0x2){
                                const umpMess = [0,0,0,0];
                                umpMess[0] = ((0xF << 28) >>> 0) + (0x002 << 16) ;
                                umpMess[1] = (configSetting.deviceInfo.manufacturerId[0] << 16)
                                    + (configSetting.deviceInfo.manufacturerId[1] << 8)
                                    + configSetting.deviceInfo.manufacturerId[2] ;

                                umpMess[2] = ((configSetting.deviceInfo.familyId[0]) << 24)
                                    + (((configSetting.deviceInfo.familyId[1]) & 0x7f) << 16)
                                    + ((configSetting.deviceInfo.modelId[0]) << 8)
                                    + ((configSetting.deviceInfo.modelId[1]) & 0x7f) ;
                                umpMess[3] = (configSetting.deviceInfo.versionId[0] << 24)
                                    +(configSetting.deviceInfo.versionId[1] << 16)
                                    +(configSetting.deviceInfo.versionId[2] << 8)
                                    +configSetting.deviceInfo.versionId[3]
                                ;
                                if(global.umpDevices[umpDev].sendUMPOutNetwork){
                                    global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,umpMess);
                                }
                            }
                            if(data.filter & 0x4) {
                                if(global.umpDevices[umpDev].sendUMPOutNetwork){
                                    global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,
                                        t.stringToTypeF(2, null, umpVirtualMIDI.name));
                                }
                            }
                            break;
                        case 0x0010: { //Get Function Block Info
                            global.configSetting['umpVirtualMIDI'+ virtualMIDIUMP].map((vm1,idx)=>{
                                if(data.fbIdx === 0xFF || data.fbIdx===idx){

                                    if(data.filter & 0x1){
                                        const umpMess = [0,0,0,0];
                                        umpMess[0] = ((0xF << 28) >>> 0) + (0x11 << 16)
                                            + (1 << 15)
                                            + (idx << 8);
                                        umpMess[1] = (vm1.group  << 24)
                                            + (1 << 16)
                                            + 1 ;
                                        global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,  umpMess);
                                    }

                                    if(data.filter & 0x2) {
                                        global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,
                                            t.stringToTypeF(0x12, idx,vm1.name || vm1.in));
                                    }
                                }
                            });

                            break;
                        }
                    }
                }else if(type==='sysex'){
                    if(out){
                        global.logfile.write(`M1 out: ${d.arrayToHex(data.msgObj.sysex)}\n`)
                        out.out.sendMessage(data.msgObj.sysex);
                    }
                }
            });
        },

        remove:()=>{
            MIDIInListOfNames(true).map(v=>midiInExists(v,true, virtualMIDIUMP));
            MIDIOutListOfNames(true).map(v=>midiOutExists(v,true, virtualMIDIUMP));
        }

    };


    if(!global.umpDevices['umpVirtualMIDI'+ virtualMIDIUMP]){
        MIDIInListOfNames(false).map(v=>midiInExists(v,true, virtualMIDIUMP));
        MIDIOutListOfNames(false).map(v=>midiOutExists(v,true, virtualMIDIUMP));
        MIDIDeviceBuildInOut(true);

        groupM1OutDevices= new Array(16).fill(null);

        global.configSetting['umpVirtualMIDI'+ virtualMIDIUMP].map((vm1,fbIdx)=>{
            const inDev = midiInExists (vm1.in);
            if(inDev!==-1){
                if(!midiIns[inDev]._UMPConnections)midiIns[inDev]._UMPConnections={};
                midiIns[inDev]._UMPConnections[`${virtualMIDIUMP}_${vm1.group}`] = {group: vm1.group,virtualMIDIUMP} ;
                if(!midiIns[inDev].isPortOpen()){
                    if(!midiIns[inDev]._virtualOpen){
                        midiIns[inDev].on('message', processMidi);
                    }
                    if(midiIns[inDev]._virtual){
                        if(!midiIns[inDev]._virtualOpen){
                            midiIns[inDev].openVirtualPort(midiIns[inDev]._name);
                            midiIns[inDev]._virtualOpen = true;
                        }
                    }else{
                        midiIns[inDev].openPort(midiIns[inDev]._port);
                    }
                }
                midiIns[inDev].ignoreTypes(false, false, true);
            }
            const outDev = midiOutExists (vm1.out);
            if(outDev!==-1) {
                if(!midiOuts[outDev].isPortOpen()) {
                    if (midiOuts[outDev]._virtual) {
                        if(!midiOuts[outDev]._virtualOpen){
                            midiOuts[outDev].openVirtualPort(midiOuts[outDev]._name);
                            midiOuts[outDev]._virtualOpen = true;
                        }
                    } else {
                        midiOuts[outDev].openPort(midiOuts[outDev]._port);
                    }
                }
                groupM1OutDevices[vm1.group] = {out:midiOuts[outDev],fbIdx};
                //groupM1OutDevices[`${virtualMIDIUMP}_${vm1.group}`]._fbIdx = fbIdx;
            }
        });
        addUMPDevice('umpVirtualMIDI'+virtualMIDIUMP, umpVirtualMIDI);
    }
}

//load_umpVirtualMIDI(0);





module.exports = {
    load_umpVirtualMIDI,
    getMIDI1Devices: () =>{
        return new Promise( (resolve,reject) => {
            MIDIDeviceBuildInOut();
            const midiDevices = {in: [], out: []};
            midiIns.map(MIDIDev => {
                midiDevices.in.push({
                        inName: MIDIDev._name,
                        outName: (MIDIDev._connectedMout || {})._name || null
                    }
                );
            });

            midiOuts.map(MIDIDev => {
                midiDevices.out.push(MIDIDev._name);
            });

            midiDevices.umpVirtualMIDI = configSetting.umpVirtualMIDI;
            resolve(midiDevices);
        });
    }
};


function midiInExists (name, remove, specificRemove = null) {
    for(let i=0; i<midiIns.length;i++){
        if(midiIns[i]._name===name){
            if(remove){
                let fullRemove = true;
                if(specificRemove!==null && midiIns[i]._UMPConnections){
                    Object.keys(midiIns[i]._UMPConnections).map(umpConn=> {
                        const conn = midiIns[i]._UMPConnections[umpConn];
                        if(conn.virtualMIDIUMP===specificRemove){
                            delete midiIns[i]._UMPConnections[umpConn];
                        }
                    });
                    if(Object.keys(midiIns[i]._UMPConnections).length){
                        fullRemove=false;
                    }
                }
                if(fullRemove) {
                    midiIns[i]._virtualOpen = false;
                    if (midiIns[i].closePort) {
                        midiIns[i].closePort();
                    } else if (midiIns[i].end) {
                        midiIns[i].unpublish();
                        midiIns[i].end();
                    } else {
                        debugger;
                    }
                    midiIns.splice(i, 1);
                }
            }
            return i;
        }
    }
    return -1;
}

function midiOutExists(name, remove, specificRemove = null){
    for(let i=0; i<midiOuts.length;i++){
        if(midiOuts[i]._name===name){
            if(remove){
                let fullRemove = true;
                if(specificRemove!==null && midiOuts[i]._UMPConnections){
                    Object.keys(midiOuts[i]._UMPConnections).map(umpConn=> {
                        const conn = midiOuts[i]._UMPConnections[umpConn];
                        if(conn.virtualMIDIUMP===specificRemove){
                            delete midiOuts[i]._UMPConnections[umpConn];
                        }
                    });
                    if(Object.keys(midiOuts[i]._UMPConnections).length){
                        fullRemove=false;
                    }
                }
                if(fullRemove) {
                    midiOuts[i]._virtualOpen = false;
                    if (midiOuts[i].closePort) {
                        midiOuts[i].closePort();
                    } else {
                        debugger;
                    }
                    midiOuts.splice(i, 1);
                }
            }
            return i;
        }
    }
    return -1;
}

function MIDIInListOfNames(incVirtual = false){
    let InNames = [];
    for(let i=0; i<midiIns.length;i++){
        if(!incVirtual && midiIns[i]._virtual)continue;
        InNames.push(midiIns[i]._name);
    }
    return InNames;
}

function MIDIOutListOfNames(incVirtual = false){
    let OutNames = [];
    for(let i=0; i<midiOuts.length;i++){
        if(!incVirtual && midiOuts[i]._virtual)continue;
        OutNames.push(midiOuts[i]._name);
    }
    return OutNames;
}


function MIDIDeviceBuildInOut(firstbuild){
    //lets setup virtual
    let outputPathId = 0;
    global.logfile.write('Find MIDI Devices'+ "\n");


    let InNames = MIDIInListOfNames();
    let OutNames = MIDIOutListOfNames();

    const input = new midi.input();
    const output = new midi.output();

    const outcount = output.getPortCount();
    for(let i =0;i<outcount;i++){
        let name= output.getPortName(i);
        //if(name.match(/RtMidi Input|TEMPO|Metronome input|Midi Through/))continue;
        if(name.match(/(RtMidi Input Client:RtMidi Input|Midi Through|Microsoft GS Wavetable Synth)/))continue;
        name = name.replace('RtMidi Input Client:','');//for virtual ports
        name = name.replace(/\d+:\d+$/,'').trim();//for virtual ports
        OutNames = OutNames.filter(v=> name !== v);
        if(midiOutExists(name)!==-1)continue;


        //console.log('MIDIDeviceBuildInOut--'+name);
        let mOut =  new midi.output();
        mOut._name= name;
        //mOut.openPort(i);
        mOut._port = i;
        mOut._outputPathId = outputPathId++;
        midiOuts.push(mOut);
        //registerOut(mOut);
        //mOut._ev = new events.EventEmitter();
    }

    const incount = input.getPortCount();
    for(let i =0;i<incount;i++){
        let name= input.getPortName(i);
        //if(name.match(/(RtMidi Output|TEMPO|Metronome output|Midi Through)/))continue;
        if(name.match(/(RtMidi Output Client:RtMidi Output|Midi Through|Microsoft GS Wavetable Synth)/))continue;
        name = name.replace('RtMidi Output Client:','');//for virtual ports
        name = name.replace(/\d+:\d+$/,'').trim();//for virtual ports
        //console.log('MIDIDeviceBuildInOut--'+name);
        InNames = InNames.filter(v=>name !== v);
        if(midiInExists(name)!==-1)continue;

        let mIN = new midi.input();
        //mIN._parent= global.midiSetup[name];
        mIN._name= name;
       //

       // const mOutMatch = midiOutExists(name);
        //if(mOutMatch!==-1){
        //    mIN._connectedMout = midiOuts[mOutMatch];
       // }

        mIN._port = i;

        //mIN.on('message', processMidi);
        //mIN.openPort(i);
        //mIN.ignoreTypes(false, false, true);
        midiIns.push(mIN);

    }


    input.closePort();
    output.closePort();

    if(firstbuild
        && global.configSetting.osAPIinUse.platform !== "win32"
        && global.configSetting.osAPIinUse !== 'coreMIDI'
        && !app.commandLine.hasSwitch('noVirtualMidi')){
        let virtinput,virtoutput;
        //const name = app.commandLine.getSwitchValue('virtualMidiName') || "MIDI 2.0 Workbench";

        virtinput = new midi.input();
        virtinput._name= global.configSetting.workbenchMIDI1VirtPortName;
        virtinput._virtual = true;
        //virtinput.ignoreTypes(false, true, false);
        //virtinput.on('message', processMidi);
        //virtinput.openVirtualPort(global.configSetting.workbenchMIDI1VirtPortName);
        midiIns.push(virtinput);

        virtoutput = new midi.output();
        virtoutput._name= global.configSetting.workbenchMIDI1VirtPortName;
        virtoutput._virtual = true;
        virtoutput._outputPathId = outputPathId++;
        midiOuts.push(virtoutput);
       // registerOut(virtoutput);
        //virtoutput._ev = new events.EventEmitter();
       // virtoutput.openVirtualPort(global.configSetting.workbenchMIDI1VirtPortName);

        //virtinput._connectedMout = virtoutput;
    }

    InNames.map(v=>midiInExists(v,true));
    OutNames.map(v=>midiOutExists(v,true));

    for(let i=0; i<midiIns.length;i++){
        logfile.write(' - IN '+ midiIns[i]._name+ "\n");
    }
    for(let i=0; i<midiOuts.length;i++){
        logfile.write(' - OUT '+ midiOuts[i]._name+ "\n");
    }
    logfile.write('***********************************'+ "\n");

}

function processMidi(deltaTime, message) {

    Object.keys(this._UMPConnections).map(umpConn=>{
       const conn =  this._UMPConnections[umpConn];
        global.logfile.write(`midi1 in ${conn.group} -- ${arrayToHex(message)}\n`);

        if(message[0] !== 240){
            whichGlobalMIDICI(`umpVirtualMIDI${conn.virtualMIDIUMP}`).ev.emit('inMIDI1', message);
        }

        if(message[0] === 0xF8){ //TEMP FIX needs better handling
            return;
        }

        if(global.umpDevices[`umpVirtualMIDI${conn.virtualMIDIUMP}`].midiToProc) {
            global.umpDevices[`umpVirtualMIDI${conn.virtualMIDIUMP}`].midiToProc(`umpVirtualMIDI${conn.virtualMIDIUMP}`, t.midi10ToUMP(conn.group, message));
        }
    });
}


