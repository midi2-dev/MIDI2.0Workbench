let ALSA = require('bindings')('ALSA');


console.log("Support:", ALSA.UMPSupported());
//ALSA.setup();
ALSA.startListen();
//let version = ALSA.get_midi_version();
let ep = ALSA.get_UMP_Endpoints();
//ep = ALSA.get_UMP_Endpoints();

console.dir(ep,{depth:null});



let check = setInterval(()=>{
    let ev = ALSA.getEvents();
    if(ev.client)
    console.dir(ev,{depth:null});
    
    //ALSA.sendUMP(ep[0].client, [ 1083195648, 3374579712 ]);
    
},5)


let check2 = setInterval(()=>{
        //1083195648, 3374579712
    ALSA.sendUMP(ep[0].client, [ 0xf0000101, 0x00000001 ,0x00000000, 0x00000000 ]);//4026532097 1 0 0
    
},3000)
