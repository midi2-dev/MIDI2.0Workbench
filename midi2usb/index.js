const os = require('os');
const release = os.release().split('.').map(v=>parseInt(v,10));
const USBDevices = require("./usbMIDI2Devices");
let CoreMIDI, CoreMIDI2, CMDevices, CMoutport,
    ALSA, ALSASupport, AlsaDevices, legacyAlsaOnly,
    WinMIDI, WinMIDISession
    ;

//const child_process = require('child_process');

let MIDI1Devices={};
let MIDI2Devices={};
let MIDI2DevicesInterfaces = [];
let MIDI2DevicesSendInterfaces = {};
let MIDI2DevicesRecvInterfaces = {};

let MIDI1DevicesRecvInterfaces = {}

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
    getMIDI2Devices: ()=>{
        return MIDI2Devices;
    },
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
            return;
        }

        if(CoreMIDI2){
            if(MIDI2Devices[id]){
                sendOutUMPBrokenUp(ump,0,(umpSplit,group)=>{
                    CoreMIDI2.sendUMP(MIDI2Devices[id].DestinationRef, umpSplit);
                });
            }
            return;
        }

        if(ALSASupport){
            if(MIDI2Devices[id]) {
                sendOutUMPBrokenUp(ump,0,(umpSplit,group)=>{
                    ALSA.sendUMP(id, umpSplit);
                });
            }
            return;
        }

        if(legacyAlsaOnly) {
            sendOutUMPBrokenUp(ump, 0, (umpSplit, group) => {
                USBDevices.sendUMPUSB(id, umpSplit);
            });
        }

        if(CoreMIDI){
            sendOutUMPBrokenUp(ump,5,(umpSplit,group)=>{
                CoreMIDI.MIDISendEventList(CMoutport, MIDI2DevicesSendInterfaces[id+'-'+group], umpSplit,2);
            });
            return;
        }



    })
};


//###########  Intial load and setup

if(os.platform()==='win32'){
    //USBDevices.startUSB();
   //DO Nothing: Win32 is handled elsewhere
    //WinMIDI
}else
if(os.platform()==='linux'){
    ALSA = require('bindings')('ALSA');
    ALSASupport = ALSA.UMPSupported();

    if(!ALSASupport){
        //LEGACY RAW USB Connect
        legacyAlsaOnly = true;
        USBDevices.startUSB({attach:true});
        USBDevices.setNewUSBDeviceAlert(addLinuxDevice);
        USBDevices.setRemoveUSBDeviceAlert((id)=>{
            alertRemoveDev(id);
        });
        USBDevices.setUSBUMPAlert((id,ump)=>{
            recvMIDI(id,ump);
        });
        let USBDeviceList = USBDevices.getListOfUSBMIDI2Devices();
        for(let id in USBDeviceList){
            addLinuxDevice(id,USBDeviceList[id]);
        }

        process.once('SIGINT', function (code) {
            console.log('SIGINT received...');
            MIDI2DevicesInterfaces.map(interface2=>{
                interface2.release(true, (error)=>{
                    console.log("interface2 Released");
                    if(!error){
                        interface2.device.reset((error)=>{
                            //if(!error)interface2.attachKernelDriver();
                            console.log("Dev Reset");
                        });

                    }
                });
            });
            console.log('SIGINT complete...');
        });
        process.on('beforeExit', (code) => {
            MIDI2DevicesInterfaces.map(interface2=>{
                interface2.release(true, (error)=>{
                    console.log("interface2 Released");
                    if(!error){
                        interface2.device.reset((error)=>{
                            //if(!error)interface2.attachKernelDriver();
                            console.log("Dev Reset");
                        });
                    }
                });
            });
        });
    }else{
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
                    };

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
    if(releaseNumber >= 2300){
        //New CoreMIDI2
        USBDevices.startUSB();
        CoreMIDI2 = require('bindings')('CoreMIDI2');
        CoreMIDI2.startListen();

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


    }else
    if(releaseNumber >=2104){
        CoreMIDI = require('bindings')('CoreMIDI');
        const oldInportsdisposd = [];

        CoreMIDI.setup( (inport, timestamp,ump)=>{
            //Process incoming MIDI Message - when setup to do so
            //console.log('--> ' + inport + ' : ' + timestamp + ' : '+ ump.join(', '));
            if(MIDI1DevicesRecvInterfaces[inport]){
                MIDI1DevicesRecvInterfaces[inport].inUMP(ump);
            }else if(MIDI2DevicesRecvInterfaces[inport]){
                recvMIDI(MIDI2DevicesRecvInterfaces[inport], ump);
            }else if(oldInportsdisposd.indexOf(inport)===-1){
                console.log("Dispose port as port not found :" + inport);
                CoreMIDI.MIDIPortDispose(inport);
                oldInportsdisposd.push(inport)
            }
        });

        CMoutport = CoreMIDI.MIDIOutputPortCreate();

        process.on('exit', (code) => {
            console.log("Cleaning up ports1");
            Object.keys(MIDI2DevicesRecvInterfaces).map(CoreMIDI.MIDIPortDispose);
            CoreMIDI.end();
        });
        process.on('SIGINT', (code) => {
            console.log("Cleaning up ports2");
            Object.keys(MIDI2DevicesRecvInterfaces).map(CoreMIDI.MIDIPortDispose);
            CoreMIDI.end();
        });

        USBDevices.startUSB();

        let checkNewDevices = setInterval(()=>{
            let epList = getCoreMIDIDeviceList();
            Object.keys(MIDI2Devices).map(k=>{
                MIDI2Devices[k]['_checkExists']=false;
            });
            (epList||[]).map(nep=>{
                if(nep.clientName==='Network' || MIDI1Devices[nep.MIDIDeviceRef])return;
                if(MIDI2Devices[nep.MIDIDeviceRef]){
                    MIDI2Devices[nep.MIDIDeviceRef]['_checkExists']=true;
                }else{

                    //***** Is it MIDI 1 or 2?
                    let Ulist = USBDevices.getListOfUSBMIDI2Devices();
                    let UIListIds = Object.keys(Ulist);
                    let usbDetails;
                    for(let i=0; i< UIListIds.length;i++){
                        let u = Ulist[UIListIds[i]];
                        if (nep.manufacturer === u.iManufacturer &&
                            nep.model === u.iProduct
                            //&& d.kMIDIPropertyDriverVersion===0
                        ){
                            usbDetails = u;
                        }
                    };
                    if(!usbDetails){
                        MIDI1Devices[nep.MIDIDeviceRef]=1;
                        return;
                    }

                    MIDI2Devices[nep.MIDIDeviceRef] = nep;
                    MIDI2Devices[nep.MIDIDeviceRef].devId=nep.MIDIDeviceRef;
                    MIDI2Devices[nep.MIDIDeviceRef]['_checkExists']=true;
                    MIDI2Devices[nep.MIDIDeviceRef].usbDetails = usbDetails;

                    let protoIn = {};
                    let protoOut = {};
                    let groupIn = [];
                    let groupOut = [];
                    MIDI2Devices[nep.MIDIDeviceRef].usbDetails.groupBlocks.map(gb => {
                        if (gb.direction === 0 || gb.direction === 2) {
                            for (let i = gb.firstGroup; i < gb.firstGroup + gb.numberGroups; i++) {
                                protoIn[i] = gb.protocol >= 0x10 ? 2 : 1;
                                groupIn.push(i);
                            }
                        }

                        if (gb.direction === 0 || gb.direction === 1) {
                            for (let i = gb.firstGroup; i < gb.firstGroup + gb.numberGroups; i++) {
                                protoOut[i] = gb.protocol >= 0x10 ? 2 : 1;
                                groupOut.push(i);
                            }
                        }
                    });
                    MIDI2Devices[nep.MIDIDeviceRef].entities.map(e => {
                        if (e.sources.length === 1) {
                            let group = groupIn.shift();
                            let inport = CoreMIDI.MIDIInputPortCreateWithProtocol(e.sources[0].sourceRef, 2/*protoIn[group]*/);
                            console.log('CoreMIDI in port setup ' + nep.MIDIDeviceRef + ' ' + group + ' : ' + e.sources[0].sourceRef + ' -> ' + inport);
                            MIDI2DevicesRecvInterfaces[inport] = nep.MIDIDeviceRef;//+'-'+group;
                            MIDI2DevicesRecvInterfaces[e.sources[0].sourceRef] = nep.MIDIDeviceRef;//+'-'+group;
                        }

                        if (e.destinations.length === 1) {
                            let group = groupOut.shift();
                            const port = e.destinations[0];
                            MIDI2DevicesSendInterfaces[nep.MIDIDeviceRef + '-' + group] = port.destRef;
                            console.log('CoreMIDI out port setup ' + nep.MIDIDeviceRef + ' ' + group + ' : ' + port.destRef);
                        }

                    });


                    console.log('New EP:'+ nep.clientName);
                    alertNewDev(nep.MIDIDeviceRef,nep);
                    //console.dir(nep,{depth:null})
                }
            });

            Object.keys(MIDI2Devices).map(k=>{
                if(MIDI2Devices[k]['_checkExists']===false){
                    console.log('Remove EP:'+MIDI2Devices[k].clientName);
                    alertRemoveDev(k);
                    //delete MIDI2DevicesRecvInterfaces[MIDI2Devices[k].InportRef];
                    delete(MIDI2Devices[k]);
                }else{
                    delete MIDI2Devices[k]['_checkExists'];
                }
            });

        },2000);

    }
}


function addLinuxDevice(id,usbDetails) {

    MIDI2Devices[id] = {
        model:usbDetails.iProduct,
        manufacturer: usbDetails.iManufacturer
    };
    let gbs = JSON.parse(JSON.stringify(usbDetails.groupBlocks));
    //const newAlsaDev = alertNewDev(id,usbDev);
    const newAlsaDev = alertNewDev(id,{
        devId: id,
        clientName:usbDetails.iProduct,
        blocks: gbs.map(gb=>{
            gb.direction = gb.direction===0? 3 :  gb.direction===3? 0 : gb.direction;
            gb.active = true;
            return gb;
        }),
        usbDetails
    });

}


function getCoreMIDIDeviceList() {
    const numDevices = CoreMIDI.MIDIGetNumberOfDestinations();
    const devices=[];
    for(let i=0; i< numDevices;i++){
        let deviceRef = CoreMIDI.MIDIGetDevice(i);
        const dev ={
            MIDIDeviceRef: deviceRef,
            clientName: CoreMIDI.MIDIObjectGetStringProperty(deviceRef, "kMIDIPropertyName"),
            model: CoreMIDI.MIDIObjectGetStringProperty(deviceRef, "kMIDIPropertyModel"),
            manufacturer: CoreMIDI.MIDIObjectGetStringProperty(deviceRef, "kMIDIPropertyManufacturer"),
            kMIDIPropertyUniqueID: CoreMIDI.MIDIObjectGetIntegerProperty(deviceRef, "kMIDIPropertyUniqueID") >>> 0,
            kMIDIPropertyDeviceID: CoreMIDI.MIDIObjectGetIntegerProperty(deviceRef, "kMIDIPropertyDeviceID"),
            kMIDIPropertyProtocolID: CoreMIDI.MIDIObjectGetIntegerProperty(deviceRef, "kMIDIPropertyProtocolID"),
            offline: CoreMIDI.MIDIObjectGetIntegerProperty(deviceRef, "kMIDIPropertyOffline"),
            kMIDIPropertyDriverVersion: CoreMIDI.MIDIObjectGetIntegerProperty(deviceRef, "kMIDIPropertyDriverVersion"),
            kMIDIPropertyDriverOwner: CoreMIDI.MIDIObjectGetStringProperty(deviceRef, "kMIDIPropertyDriverOwner"),
            numEnitities: CoreMIDI.MIDIDeviceGetNumberOfEntities(deviceRef),
            SourceRef:0,
            DestinationRef:0,
            InportRef:0,
            entities:[],
            blocks:[],
        };
        if(dev.offline || !dev.numEnitities){
            continue;
        }

        for(let j=0; j< dev.numEnitities;j++){
            let entityRef = CoreMIDI.MIDIDeviceGetEntity(deviceRef,j);
            const entity ={
                entityRef,
                kMIDIPropertyName: CoreMIDI.MIDIObjectGetStringProperty(entityRef, "kMIDIPropertyName"),
                kMIDIPropertyUniqueID: CoreMIDI.MIDIObjectGetIntegerProperty(entityRef, "kMIDIPropertyUniqueID") >>> 0,
                kMIDIPropertyDeviceID: CoreMIDI.MIDIObjectGetIntegerProperty(entityRef, "kMIDIPropertyDeviceID"),
                kMIDIPropertyDriverVersion: CoreMIDI.MIDIObjectGetIntegerProperty(entityRef, "kMIDIPropertyDriverVersion"),
                kMIDIPropertyDriverOwner: CoreMIDI.MIDIObjectGetStringProperty(entityRef, "kMIDIPropertyDriverOwner"),
                numSources: CoreMIDI.MIDIEntityGetNumberOfSources(entityRef),
                sources:[],
                numDestinations: CoreMIDI.MIDIEntityGetNumberOfDestinations(entityRef),
                destinations:[],
            };
            for(let h=0; h< entity.numSources;h++){
                let sourceRef = CoreMIDI.MIDIEntityGetSource(entityRef,h);
                const source ={
                    sourceRef,
                    kMIDIPropertyName: CoreMIDI.MIDIObjectGetStringProperty(sourceRef, "kMIDIPropertyName"),
                };
                entity.sources.push(source);
            }
            for(let h=0; h< entity.numDestinations;h++){
                let destRef = CoreMIDI.MIDIEntityGetDestination(entityRef,h);
                const dest ={
                    destRef,
                    kMIDIPropertyName: CoreMIDI.MIDIObjectGetStringProperty(destRef, "kMIDIPropertyName"),
                };
                entity.destinations.push(dest);
            }
            dev.entities.push(entity);
        }
        devices.push(dev);
        // console.dir(dev,{depth:null});
    }
    return devices;
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
