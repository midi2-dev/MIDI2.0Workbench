const midi2usb = require("usb_midi_2");
const {addUMPDevice, removeUMPDevice,
    getMIDIEndpointUMP, getFBUMP} = require('./umpDevices') ;
const t = require("./translations");
const d = require("./debugger");
const {sendOutUMPBrokenUp} = require("./utils");


midi2usb.setRecvMIDI((umpDev,umpArr)=>{
    if(global.umpDevices[umpDev]){
        global.umpDevices[umpDev].midiToProc(umpDev,umpArr);
    }else{
        //debugger;
        setTimeout((umpDev1 ,umpArr1)=> {
            if(global.umpDevices[umpDev]){
                global.umpDevices[umpDev].midiToProc(umpDev,umpArr);
            }
        },2000,umpDev ,umpArr);
    }
});

midi2usb.setNewDeviceAlert((umpDev,m2)=>{
    addDev(umpDev,m2);
});

midi2usb.setRemoveDeviceAlert((umpDev)=>{
    removeUMPDevice(umpDev);
});

function addDev(umpDev,m2){

    const newDev = addUMPDevice(umpDev,{
        name:m2.clientName,
        remoteEndpoint: {
            staticBlocks: 1,
            name: m2.clientName,
            blocks: m2.blocks ||[],
            usbDetails: m2.usbDetails|| {},
            manufacturer: m2.usbDetails?.iManufacturer||null,
            model: m2.usbDetails?.iProduct||null,
            midi2Supp: {
                transUSBMIDI2:true
            }
        },
        getUMPDataAndBlocks: () =>{
            global.umpDevices[umpDev].midiOutFunc(umpDev, getMIDIEndpointUMP);
            setTimeout(()=>{
                global.umpDevices[umpDev].midiOutFunc(umpDev, getFBUMP(0xFF));
            },200);
            setTimeout(()=>{
                if(global.umpDevices[umpDev] && !global.umpDevices[umpDev].remoteEndpoint.rawFunctionBlocks?.length){
                    global.umpDevices[umpDev].reportBlocks(true, m2.blocks);
                }
            },1500);

        },
        midiOutFunc: (umpDev, ump, isFromNetwork=false) => {
            if(isFromNetwork && !global.umpDevices[umpDev].remoteEndpoint.rawFunctionBlocks
                && global.umpDevices[umpDev].remoteEndpoint.usbDetails.groupBlocks
            ){
                t.processUMP(ump, m2.devId, (type, group, data) => {
                    if(type==='umpEndpoint'){
                        switch(data.status){
                            case 0x000://Get MIDI Endpoint Info
                                if(data.filter & 0x1){
                                    const umpMess = [0,0,0,0];
                                    umpMess[0] = ((0xF << 28) >>> 0) + (0x001 << 16) +  (1<<8) + 1;
                                    umpMess[1] = (( global.umpDevices[umpDev].remoteEndpoint.usbDetails.groupBlocks.length << 24) >>> 0) + 8 + 4 ; //bad guessing here
                                    if(global.umpDevices[umpDev].sendUMPOutNetwork){
                                        global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,umpMess);
                                    }
                                }
                                if(data.filter & 0x3) {
                                    if(global.umpDevices[umpDev].sendUMPOutNetwork){
                                        global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,t.stringToTypeF(3,null, m2.iProduct));
                                    }
                                }
                                if(data.filter & 0x4) {
                                    if(global.umpDevices[umpDev].sendUMPOutNetwork){
                                        global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,t.stringToTypeF(4,null, m2.iSerialNumber));
                                    }
                                }
                                break;
                            case 0x0010: { //Get Function Block Info
                                if(!global.umpDevices[umpDev].remoteEndpoint.rawFunctionBlocks) {
                                    if(data.filter & 0x1){ //info
                                        global.umpDevices[umpDev].remoteEndpoint.usbDetails.groupBlocks.map((gb,idx)=>{
                                            if(idx===data.fbIdx || data.fbIdx===0xFF){
                                                const umpMess = [0,0,0,0];
                                                umpMess[0] = ((0xF << 28) >>> 0) + (0x011 << 16) +  (1<<15) + (idx << 8)
                                                    + (0 << 2)
                                                    + (3-gb.dir);
                                                umpMess[1] = (gb.gbNum  << 24)
                                                    + (gb.numOfGroups << 16)
                                                    + (1 << 15)
                                                    + (0x00 << 8)
                                                    + 0x00;
                                                if(global.umpDevices[umpDev].sendUMPOutNetwork){
                                                    global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,umpMess);
                                                }
                                            }

                                        })
                                    }
                                    if(data.filter & 0x3){ //string
                                        m2.groupBlocks.map((gb,idx)=>{
                                            if(idx===data.fbIdx || data.fbIdx===0xFF){
                                                if(global.umpDevices[umpDev].sendUMPOutNetwork){
                                                    global.umpDevices[umpDev].sendUMPOutNetwork(umpDev,t.stringToTypeF(0x12,idx, gb.name));
                                                }
                                            }
                                        });
                                    }

                                }
                                break;
                            }
                        }
                    }
                });
            }


            midi2usb.sendMIDI(m2.devId,ump);
            sendOutUMPBrokenUp(ump,0,(umpSplit,group)=>{
                d.msg('ump',umpSplit,'out',umpDev, group);
            });

        }
    });

    if(!newDev.remoteEndpoint.usbDetails){
        newDev.remoteEndpoint.usbDetails = midi2usb.getUSBDescriptors(umpDev);
    }
    newDev.reportEndpoint();
}