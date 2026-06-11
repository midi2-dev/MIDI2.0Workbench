const os = require('os');
const release = os.release().split('.').map(v=>parseInt(v,10));
const USBDevices = require("./usbMIDI2Devices");
let CoreMIDI2, ALSA, ALSASupport, WinMIDI;

let MIDI2Devices={};
let MIDI2DevicesRecvInterfaces = {};

const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let alertNewDev = (id, midiEndPoint)=>{};
let alertRemoveDev = (id)=>{};
let recvMIDI = (id, umpArr)=>{};

module.exports = {
    getUSBDescriptors: (id)=>{
        let Ulist = USBDevices.getListOfUSBMIDI2Devices();
        let UIListIds = Object.keys(Ulist);
        for(let i=0; i< UIListIds.length;i++){
            let u = Ulist[UIListIds[i]];
            if (MIDI2Devices[id] && MIDI2Devices[id].manufacturer === u.iManufacturer &&
                MIDI2Devices[id].model === u.iProduct
                //&& d.kMIDIPropertyDriverVersion===0
            ){
                return u;
            }
        }
        return {};
    },
    // getMIDI2Devices: ()=>{
    //     return MIDI2Devices;
    // },
    setNewDeviceAlert: (cb=>{
        alertNewDev = cb;
    }),
    setRemoveDeviceAlert: (cb=>{
        alertRemoveDev = cb;
    }),
    setRecvMIDI: (cb=>{
        recvMIDI = cb;
    }),
    sendMIDI: ((id, ump)=>{
        if(WinMIDI){
            if(MIDI2Devices[id]){
                sendOutUMPBrokenUp(ump,0,(umpSplit,group)=>{
                    MIDI2Devices[id]._connection.sendMessageWords(WinMIDI.MidiClock.now, ...umpSplit);
                });
            }
        }else if(CoreMIDI2){
            if(MIDI2Devices[id]){
                sendOutUMPBrokenUp(ump,0,(umpSplit,group)=>{
                    CoreMIDI2.sendUMP(MIDI2Devices[id].DestinationRef, umpSplit);
                });
            }
        } else if(ALSASupport){
            if(MIDI2Devices[id]) {
                sendOutUMPBrokenUp(ump,0,(umpSplit,group)=>{
                    ALSA.sendUMP(id, umpSplit);
                });
            }
        }
    }),
    startUp:(protocol) =>{
        //###########  Initial load and setup

        if(os.platform()==='win32'){
            //USBDevices.startUSB();
            //DO Nothing: Win32 is handled elsewhere
            //WinMIDI
        }else
        if(os.platform()==='linux'){
            ALSA = require('bindings')('ALSA');
            ALSASupport = ALSA.UMPSupported();

            if(ALSASupport){
                USBDevices.startUSB({NoGBLookup:true});
                ALSA.startListen();
                let checkNewDevices = setInterval(()=>{
                    let epList =  ALSA.get_UMP_Endpoints();
                    Object.keys(MIDI2Devices).map(k=>{
                        MIDI2Devices[k]['_checkExists']=false;
                    });
                    (epList||[]).map(nep=>{
                        if(MIDI2Devices[nep.client]){
                            MIDI2Devices[nep.client]['_checkExists']=true;
                        }else{
                            MIDI2Devices[nep.client] = nep;
                            MIDI2Devices[nep.client].devId=nep.client;
                            MIDI2Devices[nep.client]['_checkExists']=true;

                            console.log('New EP:'+ nep.clientName);
                            //***** Look up Descriptors
                            let Ulist = USBDevices.getListOfUSBMIDI2Devices();
                            let UIListIds = Object.keys(Ulist);
                            let usbDetails = {};
                            for(let i=0; i< UIListIds.length;i++){
                                let u = Ulist[UIListIds[i]];
                                if (
                                    nep.name === u.iProduct
                                    //&& d.kMIDIPropertyDriverVersion===0
                                ){
                                    usbDetails = u;
                                }
                            }

                            MIDI2Devices[nep.client].usbDetails = usbDetails;
                            alertNewDev(nep.client,nep);
                            //console.dir(nep,{depth:null})
                        }
                    });

                    Object.keys(MIDI2Devices).map(k=>{
                        if(MIDI2Devices[k]['_checkExists']===false){
                            console.log('Remove EP:'+MIDI2Devices[k].clientName);
                            alertRemoveDev(k);
                            delete(MIDI2Devices[k]);
                        }else{
                            delete MIDI2Devices[k]['_checkExists'];
                        }
                    });

                },2000);
                let check = setInterval(()=>{
                    let ev = ALSA.getEvents();

                    if(ev.client ){
                        //console.dir(ev,{depth:null});
                        if(MIDI2Devices[ev.client]){
                            recvMIDI(ev.client,ev.ump);
                        }
                    }

                },1);
            }
        }
        else if(os.platform()==='darwin' && (release[0] * 100) + release[1] >= 2104){
            const releaseNumber = (release[0] * 100) + release[1];
            // if(releaseNumber >= 2400) {
            //     //New CoreMIDI2
            //     USBDevices.startUSB();
            //     CoreMIDI3 = require('bindings')('CoreMIDI3');
            //     CoreMIDI3.startListen();
            // } else
            if(releaseNumber >= 2300){
                //New CoreMIDI2
                USBDevices.startUSB();
                CoreMIDI2 = require('bindings')('CoreMIDI2');
                CoreMIDI2.startListen(protocol);

                let checkNewDevices = setInterval(()=>{
                    let epList = CoreMIDI2.get_UMP_Endpoints();
                    Object.keys(MIDI2Devices).map(k=>{
                        MIDI2Devices[k]['_checkExists']=false;
                    });
                    (epList||[]).map(nep=>{
                        if(nep.clientName==='Network')return;
                        if(MIDI2Devices[nep.MIDIDeviceRef]){
                            MIDI2Devices[nep.MIDIDeviceRef]['_checkExists']=true;
                        }else{
                            MIDI2Devices[nep.MIDIDeviceRef] = nep;
                            MIDI2Devices[nep.MIDIDeviceRef].devId=nep.MIDIDeviceRef;
                            MIDI2Devices[nep.MIDIDeviceRef]['_checkExists']=true;
                            MIDI2DevicesRecvInterfaces[nep.InportRef] = nep.MIDIDeviceRef;

                            console.log('New EP:'+ nep.clientName);

                            let Ulist = USBDevices.getListOfUSBMIDI2Devices();
                            let UIListIds = Object.keys(Ulist);
                            let usbDetails = {};
                            for(let i=0; i< UIListIds.length;i++){
                                let u = Ulist[UIListIds[i]];
                                if (
                                    nep.clientName === u.iProduct
                                    //&& d.kMIDIPropertyDriverVersion===0
                                ){
                                    MIDI2Devices[nep.MIDIDeviceRef].usbDetails = u;
                                }
                            }


                            console.log('New EP:'+ nep.clientName);
                            alertNewDev(nep.MIDIDeviceRef,nep);
                            //console.dir(nep,{depth:null})
                        }
                    });

                    Object.keys(MIDI2Devices).map(k=>{
                        if(MIDI2Devices[k]['_checkExists']===false){
                            console.log('Remove EP:'+MIDI2Devices[k].clientName);
                            alertRemoveDev(k);
                            delete MIDI2DevicesRecvInterfaces[MIDI2Devices[k].InportRef];
                            delete(MIDI2Devices[k]);
                        }else{
                            delete MIDI2Devices[k]['_checkExists'];
                        }
                    });

                },2000);
                let check = setInterval(()=>{
                    let ev = CoreMIDI2.getEvents();
                    if(Object.keys(ev).length && MIDI2DevicesRecvInterfaces[ev.client])
                        recvMIDI(MIDI2DevicesRecvInterfaces[ev.client], ev.ump);
                },1);


            }
        }

    }
};



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
