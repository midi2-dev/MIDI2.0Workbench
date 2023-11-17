const t = require('./translations.js');
//const os = require("os");
//const release = os.release().split('.').map(v=>parseInt(v,10));

let midi = require("midi");

const {app} = require("electron");
const d = require("./debugger");
const {addUMPDevice} = require("./umpDevices");
const {arrayToHex} = require("./debugger");
const {sendOutUMPBrokenUp} = require("./utils");

const midiOuts=[];
const midiIns=[];


let groupM1OutDevices = new Array(16).fill(null);
const umpVirtualMIDI1 = {
    name:"MIDI 1.0 Devices",
   // extraText: "Configure and set-up MIDI 1.0 Devices here.",
    workbench: true,
    remoteEndpoint: {
        device:configSetting.deviceInfo,
        //numOfBlocks: global.configSetting.umpVirtualMIDI1.length,
        staticBlocks: 1,
        name: "MIDI 1.0 Devices"
    },

    getUMPDataAndBlocks:()=>{
        let blocks=[];
        global.configSetting.umpVirtualMIDI1.map((vm1,idx)=>{

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
        global.umpDevices['umpVirtualMIDI1'].reportEndpoint();
        global.umpDevices['umpVirtualMIDI1'].reportBlocks(true, blocks);
    },

    getFBBasedOnGroup:(group) =>{
         return groupM1OutDevices[group]._fbIdx;
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
                    if(out)out.sendMessage(msg);
                });
            }else if(isFromNetwork && type==='umpEndpoint'){
                switch(data.status){
                    case 0x000://Get MIDI Endpoint Info
                        if(data.filter & 0x1){
                            const umpMess = [0,0,0,0];
                            umpMess[0] = ((0xF << 28) >>> 0) + (0x001 << 16) +  (1<<8) + 1;
                            umpMess[1] = (( global.configSetting.umpVirtualMIDI1.length << 24) >>> 0) + 8 + 4 ; //bad guessing here
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
                                    t.stringToTypeF(2, null, umpVirtualMIDI1.name));
                            }
                        }
                        break;
                    case 0x0010: { //Get Function Block Info
                        global.configSetting.umpVirtualMIDI1.map((vm1,idx)=>{
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
                    out.sendMessage(data.msgObj.sysex);
                }
            }
        });
    },

    remove:()=>{
        MIDIInListOfNames(true).map(v=>midiInExists(v,true));
        MIDIOutListOfNames(true).map(v=>midiOutExists(v,true));
    }

};

function load_umpVirtualMIDI1 (){
    if(!global.umpDevices['umpVirtualMIDI1']){
        MIDIInListOfNames(false).map(v=>midiInExists(v,true));
        MIDIOutListOfNames(false).map(v=>midiOutExists(v,true));
        MIDIDeviceBuildInOut(true);

        groupM1OutDevices= new Array(16).fill(null);

        global.configSetting.umpVirtualMIDI1.map((vm1,fbIdx)=>{
            const inDev = midiInExists (vm1.in);
            if(inDev!==-1){
                midiIns[inDev]._group = vm1.group ;
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
                groupM1OutDevices[vm1.group] = midiOuts[outDev];
                groupM1OutDevices[vm1.group]._fbIdx = fbIdx;
            }
        });
        addUMPDevice('umpVirtualMIDI1', umpVirtualMIDI1);
    }
}

load_umpVirtualMIDI1();


const ump073 = {
    name:"UMP over prop073",
    workbench: true,
    display: () =>{return global.configSetting.ump073.out && global.configSetting.ump073.in;},
    extraTextGet: () =>{return global.configSetting.ump073.in +' / '+ global.configSetting.ump073.out;},
    midiOutFunc: (umpDev, ump) => {
        const outDev = midiOutExists (global.configSetting.ump073.out);
        if(midiOuts[outDev]){
            d.msg('ump',ump,'out',umpDev, 0);
            const out = umpToProp073(ump);
            out.map(sysex=>{
                midiOuts[outDev].send(sysex);
            });
        }
    },
};

function load_ump073 (){
    if(!global.umpDevices['ump073']){
        if(global.configSetting.ump073.in && global.configSetting.ump073.out) {
            const inDev = midiInExists (global.configSetting.ump073.in);
            if(inDev!==-1){
                if(!midiIns[inDev].isPortOpen()){
                    if(!midiIns[inDev]._virtualOpen){
                        midiIns[inDev].on('message', process073);
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
            const outDev = midiOutExists (global.configSetting.ump073.out);
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
            }

            addUMPDevice('ump073', ump073);
        }

    }
}

//load_ump073();


module.exports = {
    load_umpVirtualMIDI1,
    load_ump073,
    getMIDI1Devices: () =>{
        return new Promise( (resolve,reject) => {
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

            midiDevices.umpVirtualMIDI1 = configSetting.umpVirtualMIDI1;
            resolve(midiDevices);
        });
    }
};


function midiInExists (name, remove) {
    for(let i=0; i<midiIns.length;i++){
        if(midiIns[i]._name===name){
            if(remove){
                midiIns[i]._virtualOpen = false;
                if(midiIns[i].closePort){
                    midiIns[i].closePort();
                }else if(midiIns[i].end){
                    midiIns[i].unpublish();
                    midiIns[i].end();
                }else{
                    debugger;
                }
                midiIns.splice(i,1);
            }
            return i;
        }
    }
    return -1;
}

function midiOutExists(name, remove){
    for(let i=0; i<midiOuts.length;i++){
        if(midiOuts[i]._name===name){
            if(remove){
                midiOuts[i]._virtualOpen = false;
                if(midiOuts[i].closePort){
                    midiOuts[i].closePort();
                }else{
                    debugger;
                }
                midiOuts.splice(i,1);
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
    //console.log('midi group',this._group);
    global.logfile.write(`midi1 in ${this._group} -- ${arrayToHex(message)}\n`);

    if(message[0] !== 240){
        global._midiciM1.ev.emit('inMIDI1', message);
    }

    if(message[0] === 0xF8){ //TEMP FIX needs better handling
        return;
    }

    // if(message[0] === 240 && message.indexOf(0xF8)!==-1){
    //     debugger;
    // }

    if(global.umpDevices['umpVirtualMIDI1'].midiToProc) {
        global.umpDevices['umpVirtualMIDI1'].midiToProc('umpVirtualMIDI1', t.midi10ToUMP(this._group, message));
    }
}


function process073(deltaTime, message) {
    if(global.umpDevices['umpVirtualMIDI1'].midiToProc) {
        global.umpDevices['umpVirtualMIDI1'].midiToProc('ump073', prop073ToUMP(message));
    }
}


function prop073ToUMP(msg){
    let outArr =[];
    let out=0;
    if(msg[0]===0xF0 && msg[1]===0x7D && [8,13,23].indexOf(msg.length)!==-1){
        //Prop073
        out = ((((msg[2]&8) <<4)+msg[3])<<24)>>>0;
        out += (((msg[2]&4) <<5)+msg[4])<<16;
        out += (((msg[2]&2) <<6)+msg[5])<<8;
        out += ((msg[2]&1) <<7)+msg[6];
        outArr.push(out);
        //console.log(out.toString(2).padStart(32,'0').match(/.{1,8}/g));

        if(msg[2] & 16){
            out = ((((msg[7]&8) <<4)+msg[8])<<24)>>>0;
            out += (((msg[7]&4) <<5)+msg[9])<<16;
            out += (((msg[7]&2) <<6)+msg[10])<<8;
            out += ((msg[7]&1) <<7)+msg[11];
            outArr.push(out);
            //console.log(out.toString(2).padStart(32,'0').match(/.{1,8}/g));
        }

        if(msg[2] & 32){
            out = ((((msg[12]&8) <<4)+msg[13])<<24)>>>0;
            out += (((msg[12]&4) <<5)+msg[14])<<16;
            out += (((msg[12]&2) <<6)+msg[15])<<8;
            out += ((msg[12]&1) <<7)+msg[16];
            outArr.push(out);
            //console.log(out.toString(2).padStart(32,'0').match(/.{1,8}/g));

            out = ((((msg[17]&8) <<4)+msg[18])<<24)>>>0;
            out += (((msg[17]&4) <<5)+msg[19])<<16;
            out += (((msg[17]&2) <<5)+msg[20])<<8;
            out += ((msg[17]&1) <<7)+msg[21];
            outArr.push(out);
            //console.log(out.toString(2).padStart(32,'0').match(/.{1,8}/g));
        }
    }
    return outArr;
}

function umpToProp073(ump){
    let outArr =[];
    for(let i=0; i<ump.length;i++) {
        var mess = ump[i];
        var mt = mess >> 28;
        switch (mt) {
            case 0: //32 bits Utility Messages
            case 1: //32 bits System Real Time and System Common Messages (except System Exclusive)
            case 2: {//32 Bits MIDI 1.0 Channel Voice Messages
                const out = [0xF0, 0x7D]
                    .concat(ump32ToSysex(mess))
                    .concat([0xF7]);
                outArr.push(out);
                break;
            }
            case 3://64 bits Data Messages (including System Exclusive)
            case 4: { //64 bits MIDI 2.0 Channel Voice Messages
                const status = mess >> 16 & 0xF0;
                //Sometimes internal the message is flagged to say this should be a 14bit message
                //This cleans this up
                if (status === 0xB0 && (mess & 1)) {
                    mess ^= 1;
                }

                const out = [0xF0, 0x7D]
                    .concat(ump32ToSysex(mess, 0b10000))
                    .concat(ump32ToSysex(ump[++i]))
                    .concat([0xF7]);
                break;
            }
            case 5: { //128 bits Data Messages
                const out = [0xF0, 0x7D]
                    .concat(ump32ToSysex(mess, 0b110000))
                    .concat(ump32ToSysex(ump[++i]))
                    .concat(ump32ToSysex(ump[++i]))
                    .concat(ump32ToSysex(ump[++i]))
                    .concat([0xF7]);
                outArr.push(out);
                break;
            }
        }
    }
    return outArr;
}

function ump32ToSysex(mess, abcd = 0){
    let out =[];
    abcd += (mess >> 31) << 3;
    abcd += ((mess >> 23) & 1) << 2;
    abcd += ((mess >> 15) & 1) << 1;
    abcd += ((mess >> 7) & 1);
    out.push(
        abcd
        ,(mess >> 24) & 0x7f
        ,(mess >> 16) & 0x7f
        ,(mess >> 8) & 0x7f
        ,mess  & 0x7f
    );
    return out;
}


