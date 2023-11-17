let CoreMIDI2 = require('bindings')('CoreMIDI2');


console.log("Support:", CoreMIDI2.UMPSupported());
//CoreMIDI2.setup();
CoreMIDI2.startListen();
//let version = CoreMIDI2.get_midi_version();
//let ep = CoreMIDI2.get_UMP_Endpoints();
//ep = CoreMIDI2.get_UMP_Endpoints();

//console.dir(ep,{depth:null});

let ep = {};

let checkNewDevices = setInterval(()=>{
    let epList = CoreMIDI2.get_UMP_Endpoints();
    Object.keys(ep).map(k=>{
        ep[k]['checkExists']=false;
    });
    (epList||[]).map(nep=>{
        if(nep.clientName==='Network')return;
        if(ep[nep.MIDIDeviceRef]){
            ep[nep.MIDIDeviceRef]['checkExists']=true;
        }else{
            ep[nep.MIDIDeviceRef] = nep;
            ep[nep.MIDIDeviceRef]['checkExists']=true;
            console.log('New EP:'+ nep.clientName);
            //console.dir(nep,{depth:null})
        }
    });

    Object.keys(ep).map(k=>{
        if(ep[k]['checkExists']===false){
            console.log('Remove EP:'+ep[k].clientName);
            delete(ep[k]);
        }
    });

},2000);



let check = setInterval(()=>{
    let ev = CoreMIDI2.getEvents();
    if(Object.keys(ev).length)
    console.dir(ev,{depth:null});
    
    //CoreMIDI2.sendUMP(ep[0].client, [ 1083195648, 3374579712 ]);
    
},50);


// let check2 = setInterval(()=>{
//         //1083195648, 3374579712
//     if(ep[0]) {
//         console.log("Send out Discover");
//         CoreMIDI2.sendUMP(ep[0].DestinationRef, [0xf0000101, 0x00000001, 0x00000000, 0x00000000]);//4026532097 1 0 0
//     }
// },3000)
