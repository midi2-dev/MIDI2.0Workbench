const USB = require ('usb');
const async = require('async');

let USBDevices={};
let MIDI2DevicesSendInterfaces={};
let MIDI2DevicesInterfaces = [];
let lookupOptions = {NoGBLookup:false,attach:false};

let starting=false;


let alertNewDev = (id, midiEndPoint)=>{};
let alertRemoveDev = (id)=>{};

let alertNewUMPData = (id, UMP)=>{};

module.exports = {
    startUSB: (o={})=>{
        starting=true;
        lookupOptions = {...lookupOptions,...o};
        USB.usb.on('attach', getRawUSBMIDI2);
        USB.usb.on('detach', removeRawUSBMIDI2);
        const uList = USB.getDeviceList();
        uList.map(getRawUSBMIDI2);
        starting=false;
    },
    setNewUSBDeviceAlert: (cb=>{
        alertNewDev = cb;
    }),
    setRemoveUSBDeviceAlert: (cb=>{
        alertRemoveDev = cb;
    }),
    setUSBUMPAlert: (cb=>{
        alertNewUMPData = cb;
    }),
    getListOfUSBMIDI2Devices: ()=>{
        return USBDevices;
    },
    sendUMPUSB: (id,ump)=>{
        if(!MIDI2DevicesSendInterfaces[id])return;
        const buf = Buffer.allocUnsafe(ump.length*4);
        let lastPos = 0 ;
        for(let j = 0;j< ump.length;j++) {
            lastPos = buf.writeUInt32LE(ump[j], lastPos);
        }
        MIDI2DevicesSendInterfaces[id].transfer(buf,(err)=>{
            if(err){
                console.log(err);
            }
        });
    }
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

function getRawUSBMIDI2(dev) {
    const id = [dev.deviceDescriptor.idVendor, dev.deviceDescriptor.idProduct, dev.deviceDescriptor.bcdDevice].join('_');
    if(USBDevices[id])return;
    try {
        dev.configDescriptor.interfaces.map(int => {
            int.map(ii => {
                if (ii.bInterfaceClass === 1 && ii.bInterfaceSubClass === 3
                    && ii.extra[4] === 2) {
                    dev.open();
                    if(lookupOptions.attach){
                        let uinterface = dev.interface(ii.bInterfaceNumber);
                        if (uinterface.isKernelDriverActive()) {
                            uinterface.detachKernelDriver();
                        }

                        uinterface.claim();
                        MIDI2DevicesInterfaces.push(uinterface);

                        if (uinterface.altSetting === 0) {
                            uinterface.setAltSetting(ii.bAlternateSetting, (error) => {
                                descriptorLookupTrigger(id,dev, ii,uinterface);
                                    //const enP = uinterface.endpoint(ep.bEndpointAddress);
                                });
                        }
                    }else{
                        descriptorLookupTrigger(id,dev, ii);
                    }

                                        //console.log(data);
                                        }
                                    });
                                    });
                                } catch (e) {
        		console.log(e);
	return;
                        }
                    }
                    
function descriptorLookupTrigger(id, dev,ii,uinterface=false){
    async.series(
        descriptorLookup(dev, ii.bInterfaceNumber),
        (err, results) => {
            if (err) {
                console.log('USB_MIDI_2 DescriptorLookup Error',err);
                return;
            }
            //const id = [dev.deviceDescriptor.idVendor, dev.deviceDescriptor.idProduct, dev.deviceDescriptor.bcdDevice].join('_');
            const usbEndpoint = {
                iManufacturer: results[0],
                iProduct: results[1],
                iSerialNumber: results[2],
                groupBlocks: results[3].gbs,
                gbOdd: {},
                devId: id
            };

            dev.allConfigDescriptors[0].interfaces.map(inl1 => {
                inl1.map(uinterface2 => {
                    if (uinterface2.bInterfaceClass === 1 && uinterface2.bInterfaceSubClass === 3
                        && uinterface2.extra[4] === 2) {
                        const extraDetail = {};
                        extraDetail.bLength = uinterface2.extra[0];
                        extraDetail.bDescriptorType = uinterface2.extra[1];//'CS_INTERFACE';
                        extraDetail.bDescriptorSubtype = uinterface2.extra[2];//'MS_HEADER';
                        extraDetail.bcdMSC = uinterface2.extra[3] + (uinterface2.extra[4] << 8);
                        extraDetail.wTotalLength = uinterface2.extra[5] + (uinterface2.extra[6] << 8);
                        usbEndpoint.descriptor = {
                            ...uinterface2,
                            extraDetail,
                            groupTerminalBlocks: results[3].gbDev,
                            endpoints: uinterface2.endpoints.map(ep => {
                                const extraDetail = {};
                                extraDetail.bLength = ep.extra[0];
                                extraDetail.bDescriptorType = ep.extra[1];//'CS_ENDPOINT';

                                extraDetail.bDescriptorSubType = ep.extra[2];//'MS_GENERAL_2_0';
                                extraDetail.bNumGrpTrmBlock = ep.extra[3];
                                extraDetail.baAssoGrpTrmBlkID = ep.extra.slice(4, extraDetail.bLength);
                                extraDetail.extrabytes = ep.extra.slice(extraDetail.bLength);

                                if (ep.bEndpointAddress >> 7) { //IN
                                    usbEndpoint.gbIn = [...ep.extra.slice(4)].map(gr => gr - 1);
                                } else {
                                    usbEndpoint.gbOut = [...ep.extra.slice(4)].map(gr => gr - 1);
                                }

                                return {
                                    ...ep,
                                    extraDetail
                                };
                            })
                        };
                    }
                });
            });
            USBDevices[id] = usbEndpoint;
            console.log('New USB:'+ id);
            if(lookupOptions.attach){
                //console.dir(usbEndpoint,{depth:null})
                try {
                    let outEPNum, inEPNum;
                    uinterface.endpoints.map(enP => {

                        if (enP.direction === 'out') {
                            outEPNum = enP.address;
                        } else if (enP.direction === 'in') {
                            inEPNum = enP.address;
                        }
                    });
                    const inEndpoint = uinterface.endpoint(inEPNum);
                    MIDI2DevicesSendInterfaces[id] = uinterface.endpoint(outEPNum);

                    inEndpoint.on('data', data => {
                        console.log(data);
                        if (!data.length) return;
                        const umpArr = [];
                        for (let j = 0; j < data.length; j += 4) {
                            umpArr.push(data.readUInt32LE(j));
                        }
                        alertNewUMPData(id, umpArr);
                    });
                    inEndpoint.on('error', data => {
                       console.log('USB In Error:');
                       console.log(data);
                    });
                    inEndpoint.startPoll();
                    module.exports.sendUMPUSB(id,[0,0,0,0]); //Required for New USB Devices apparently
                    module.exports.sendUMPUSB(id,[0,0,0,0]); //Required for New USB Devices apparently
                    setTimeout(()=>{
                        alertNewDev(id,usbEndpoint);
                    },1000);
                }catch (e) {
                    console.log(e);
                    return;
                }
                alertNewUMPData(id, umpArr);

            }else{
                USBDevices[id] = usbEndpoint;
                alertNewDev(id,usbEndpoint);
            }
        });
}

function removeRawUSBMIDI2(dev){
    const id = [dev.deviceDescriptor.idVendor, dev.deviceDescriptor.idProduct, dev.deviceDescriptor.bcdDevice].join('_');
    delete USBDevices[id];
    delete MIDI2DevicesSendInterfaces[id];
    delete MIDI2DevicesInterfaces[id];
    console.log('Remove USB:'+id);
    alertRemoveDev(id);
}

function descriptorLookup(dev, interfaceId) {
    return [
        (cb) => {
            dev.getStringDescriptor(dev.deviceDescriptor.iManufacturer,
                (error, data) => {
                    cb(error, data);
                });
        },
        (cb) => {
            dev.getStringDescriptor(dev.deviceDescriptor.iProduct,
                (error, data) => {
                    cb(error, data);
                });
        },
        (cb) => {
            if(dev.deviceDescriptor.iSerialNumber){
                dev.getStringDescriptor(dev.deviceDescriptor.iSerialNumber,
                    (error, data) => {
                        cb(error, data);
                    });
            }else{
                cb(null, "");
            }

        },
        (cb) => {
            if(lookupOptions.NoGBLookup){
                cb(0, {gbs:[]});
                return;
            }
            dev.controlTransfer(0x81, 0x06, 0x2601, interfaceId, 0x5,
                (error, data) => {
                    if(error){
                        cb(error, data);
                    }else {
                        dev.controlTransfer(0x81, 0x06, 0x2601, interfaceId, data[3] + (data[4] << 8),
                            (error, data) => {
                                if (error) {
                                    cb(error, data);
                                } else {
                                    const header = data.slice(0, 5);
                                    const body = data.slice(5);
                                    const chunk = 13;

                                    const gbDev = {
                                        bLength: data[0],
                                        bDescriptorType: data[1],
                                        bDescriptorSubtype: data[2],
                                        wTotalLength: data[3] + (data[4] << 8),
                                        groupTerminalBlocks:[]
                                    };

                                    async.timesSeries(body.length / chunk,
                                        (n, next) => {
                                            const i = n * chunk;
                                            const groupBlockData = body.slice(i, i + chunk);
                                            const gb = {
                                                gbIdx: groupBlockData[3],
                                                direction: groupBlockData[4],
                                                firstGroup: groupBlockData[5],
                                                numberGroups: groupBlockData[6],
                                                protocol: groupBlockData[8],
                                                outports: [],
                                                inports: [],
                                                strID: groupBlockData[7]
                                            };
                                            gbDev.groupTerminalBlocks.push({
                                                bLength: groupBlockData[0],
                                                bDescriptorType: groupBlockData[1],
                                                bDescriptorSubtype: groupBlockData[2],
                                                bGrpTrmBlkID: groupBlockData[3],
                                                bGrpTrmBlkType: groupBlockData[4],
                                                nGroupTrm: groupBlockData[5],
                                                nNumGroupTrm: groupBlockData[6],
                                                iBlockItem: groupBlockData[7],
                                                bMIDIProtocol: groupBlockData[8],
                                                wMaxInputBandwidth: groupBlockData[9] + (groupBlockData[10]<<8),
                                                wMaxOutputBandwidth: groupBlockData[11] + (groupBlockData[12]<<8),
                                            });
                                            if(groupBlockData[7]){
                                                dev.getStringDescriptor(groupBlockData[7],
                                                    (error, data) => {
                                                        gb.name = data;
                                                        next(error, gb);
                                                    });
                                            }else{
                                                gb.name = "";
                                                next(null, gb);
                                            }

                                        },
                                        (err, gbs) => {
                                            cb(null, {gbDev,gbs});
                                        });
                                }
                            });
                    }
                });
        }
    ];
}
