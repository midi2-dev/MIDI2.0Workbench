const t=exports;
const deviceHistory={};
const d = require('./debugger.js');
const {getManufacturer16bit} = require("./manufactuers");
const {chordTonic} = require("./messageTypes");


//*********** Translations *************************
t.ump10To20 = function(ump10,deviceid){
    const outarr=[];
    if(!deviceHistory[deviceid])deviceHistory[deviceid]={};
    if(!deviceHistory[deviceid].cctorpn)deviceHistory[deviceid].cctorpn={timeout:0}

    for(let i=0; i<ump10.length;i++){
        const mess = ump10[i];
        const mt = mess >>> 28;
        switch(mt){
            case 0:
            case 1:
                outarr.push(mess);
                break;
            case 2:
                //Convert! /32bits->64bits
                const group= mess >> 24 & 0xF;
                let status= mess >> 16 & 0xF0;
                const channel= mess >> 16 & 0xF;
                //const val1 = mess >> 8 & 0xF0;
                let val1 = mess >> 8 & 0x7F;
                let val2 = mess & 0x7F;
                let out1=0,out2=0;
                //convert note on zero velocity to noteoff
                if(status===0x90 && val2===0){
                    status=0x80;
                    val2 = 0x40;
                }

                switch(status){
                    case 0x80: //note off
                    case 0x90: //note on
                        out1 = ((0x04 << 4) + group) << 24;
                        out1 += (status + channel)<<16;
                        out1 += val1 <<8;
                        out2 += (t.scaleUp(val2,7,16) << 16)>>> 0;
                        break;
                    case 0xA0: //poly aftertouch
                        out1 = ((0x04 << 4) + group) << 24;
                        out1 += (status + channel)<<16;
                        out1 += val1 <<8;
                        out2 += t.scaleUp(val2,7,32) >>> 0;
                        break;
                    case 0xB0: //cc
                        if(~[6,38,98,99,100,101].indexOf(val1)){
                            //if(!deviceHistory[deviceid])deviceHistory[deviceid]={};
                            //if(!deviceHistory[deviceid].cctorpn)deviceHistory[deviceid].cctorpn={timeout:0};

                            switch(val1){
                                case 101:
                                    deviceHistory[deviceid].cctorpn.type='RPN';
                                    deviceHistory[deviceid].cctorpn.valueMSB=null;
                                    deviceHistory[deviceid].cctorpn.valueLSB=null;
                                    deviceHistory[deviceid].cctorpn.MSB=val2;

                                    break;
                                case 100:
                                    deviceHistory[deviceid].cctorpn.type='RPN';
                                    deviceHistory[deviceid].cctorpn.valueMSB=null;
                                    deviceHistory[deviceid].cctorpn.valueLSB=null;
                                    deviceHistory[deviceid].cctorpn.LSB=val2;

                                    break;
                                case 99:
                                    deviceHistory[deviceid].cctorpn.type='NRPN';
                                    deviceHistory[deviceid].cctorpn.valueMSB=null;
                                    deviceHistory[deviceid].cctorpn.valueLSB=null;
                                    deviceHistory[deviceid].cctorpn.MSB=val2;

                                    break;
                                case 98:
                                    deviceHistory[deviceid].cctorpn.type='NRPN';
                                    deviceHistory[deviceid].cctorpn.valueMSB=null;
                                    deviceHistory[deviceid].cctorpn.valueLSB=null;
                                    deviceHistory[deviceid].cctorpn.LSB=val2;

                                    break;
                                case 6:
                                    if(deviceHistory[deviceid].cctorpn.valueMSB){
                                        //So sometimes 38 is optional grrrr... handle this
                                        out1 = ((0x04 << 4) + group) << 24
                                        out1 +=  deviceHistory[deviceid].cctorpn.type='RPN'?0b0010 << 20:0b0011 << 20;
                                        out1 +=  channel << 16;
                                        out1 += (deviceHistory[deviceid].cctorpn.MSB <<8) + deviceHistory[deviceid].cctorpn.LSB;
                                        let val = (deviceHistory[deviceid].cctorpn.valueMSB<< 7) + deviceHistory[deviceid].cctorpn.valueLSB;
                                        out2 = scaleUp(val,14,32) >>> 0;
                                        deviceHistory[deviceid].cctorpn.valueMSB=null;
                                        deviceHistory[deviceid].cctorpn.valueLSB=null;
                                        clearTimeout(deviceHistory[deviceid].cctorpn.timeout);

                                    }
                                    deviceHistory[deviceid].cctorpn.valueMSB=val2;
                                    deviceHistory[deviceid].cctorpn.timeout = setTimeout(function(t,group){
                                        debugger; // need to rethink this!
                                        let ump=[];
                                        ump[0] = ((0x04 << 4) + group) << 24
                                        ump[0] +=  t.cctorpn.type='RPN'?0b0010 << 20:0b0011 << 20;
                                        ump[0] +=  channel << 16;
                                        ump[0] += (t.cctorpn.MSB <<8) + t.cctorpn.LSB;
                                        const val = (t.cctorpn.valueMSB<< 7);
                                        ump[1] = scaleUp(val,14,32) >>> 0;
                                        t.cctorpn.valueMSB=null;
                                        t.cctorpn.valueLSB=null;
                                        clearTimeout(t.cctorpn.timeout);

                                    },11,deviceHistory[deviceid],group)
                                    break;
                                case 38:
                                    deviceHistory[deviceid].cctorpn.valueLSB=val2;
                                    //clearTimeout(this.timeout);
                                    break;
                            }
                            if(deviceHistory[deviceid].cctorpn.valueLSB!==null && deviceHistory[deviceid].cctorpn.valueMSB!==null){

                                out1 = ((0x04 << 4) + group) << 24
                                out1 +=  deviceHistory[deviceid].cctorpn.type='RPN'?0b0010 << 20:0b0011 << 20;
                                out1 +=  channel << 16;
                                out1 += (deviceHistory[deviceid].cctorpn.MSB <<8) + deviceHistory[deviceid].cctorpn.LSB;
                                const val = (deviceHistory[deviceid].cctorpn.valueMSB<< 7) + deviceHistory[deviceid].cctorpn.valueLSB;
                                out2 = scaleUp(val,14,32) >>> 0;
                                deviceHistory[deviceid].cctorpn.valueMSB=null;
                                deviceHistory[deviceid].cctorpn.valueLSB=null;
                                clearTimeout(deviceHistory[deviceid].cctorpn.timeout);
                            }else{
                                continue;
                            }
                            break;
                            //(N)RPN
                            //continue;
                        }else if([0,32].indexOf(val1)!==-1){

                            if(val1===0){
                                deviceHistory[deviceid].msb = val2;
                            }
                            if(val1===32){
                                deviceHistory[deviceid].lsb = val2;
                            }
                            //bank select - is used with Program change
                            continue;
                        }else{
                            out1 = ((0x04 << 4) + group) << 24;
                            out1 += (status + channel)<<16;
                            out1 += val1 <<8;
                            out2 += t.scaleUp(val2,7,32) >>> 0;
                        }
                        break;
                    case 0xC0: //Program change
                        out1 = ((0x04 << 4) + group) << 24;
                        out1 += (status + channel)<<16;
                        if(deviceHistory[deviceid].msb!==undefined && deviceHistory[deviceid].lsb!==undefined){ //msb!=null //lsb!=null
                            out1 += 1;
                            out2 += (deviceHistory[deviceid].msb <<8) + deviceHistory[deviceid].lsb;
                        }
                        out2 += val1 << 24;
                        break;
                    case 0xD0: //Channel Pressure
                        out1 = ((0x04 << 4) + group) << 24;
                        out1 += (status + channel)<<16;
                        out2 += t.scaleUp(val1,7,32) >>> 0;
                        break;
                    case 0xE0: //Pitch bend
                        out1 = ((0x04 << 4) + group) << 24;
                        out1 += (status + channel)<<16;
                        const pb = (val2<< 7) + val1;
                        out2 +=t.scaleUp(pb,14,32) >>> 0;
                }

                //console.log(out1.toString(2).padStart(32,'0').match(/.{1,8}/g));
                //console.log(out2.toString(2).padStart(32,'0').match(/.{1,8}/g));
                outarr.push(out1);
                outarr.push(out2);


                break;
            case 3:
            case 4:
                outarr.push(mess);
                outarr.push(ump10[++i]);
                break;
            case 5:
                outarr.push(mess);
                outarr.push(ump10[++i]);outarr.push(ump10[++i]);outarr.push(ump10[++i]);
                break;
        }
    }

    return outarr;
};

t.midi10ToUMP = function(group, msg){
    const msgType = msg[0] & 0xF0;
    let out=0;

    if(msgType>=0x80 && msgType<=0xE0){
        //MIDI Message
        out = ((0x02 << 4) + group) << 24;
        out +=  msg[0]<< 16;
        out +=  msg[1]<< 8;
        out +=  msg[2] || 0;
    }else if([0xF1,0xF2,0xF3,0xF6,0xF8,0xFA,0xFB,0xFC,0xFE,0xFF].indexOf(msg[0])!==-1){
        out = ((0x01 << 4) + group) << 24;
        out +=  msg[0]<< 16;
        out +=  (msg[1] || 0)<< 8;
        out +=  msg[2] || 0;
    }else if(msg[0]===0xF0){
        //Oh yay sysex
        //We need to break this up into multiple messages to send
        let outArr=[];
        //First let's go through and find all the System Messages
        const sysMess = [];
        msg.map(b=>{
            if(b > 0xF0 && b!==0xF7)sysMess.push(b);
        });
        msg = msg.filter(b=>b === 0xF0 || b===0xF7 || b<0x80);
        if(sysMess.length){
            outArr = t.midi10ToUMP(group, sysMess)
        }


        let out1 = ((0x03 << 4) + group) << 24;
        let out2=0;
        if(msg.length -2 > 6){
            out1 +=  1 << 20;
            out1 +=  6 << 16;
        }else{
            out1 +=  ((msg.length -2) << 16)>>>0;
        }

        for(let i=1; i< msg.length-1;i++){
            const modI = (i-1)%6;
            if(modI===0 && i-1!==0){
                //console.log(out1.toString(2).padStart(32,'0').match(/.{1,8}/g));
                //console.log(out2.toString(2).padStart(32,'0').match(/.{1,8}/g));
                outArr.push(out1);
                outArr.push(out2);
                out1 = ((0x03 << 4) + group) << 24;
                out2=0;
                if(i+6>=msg.length-1){
                    out1 +=  3 << 20;
                    out1 +=  msg.length-1 - i << 16;
                }else{
                    out1 +=  2 << 20;
                    out1 +=  6 << 16;
                }

            }
            if(modI<2){
                out1 +=  msg[i] << ((1-modI)*8);
            }else{
                out2 +=  msg[i] << ((5-modI)*8);
            }

        }
        //console.log(out1.toString(2).padStart(32,'0').match(/.{1,8}/g));
        //console.log(out2.toString(2).padStart(32,'0').match(/.{1,8}/g));
        outArr.push(out1);
        outArr.push(out2);


        return outArr;
    }
//	console.log(out.toString(2).padStart(32,'0').match(/.{1,8}/g));
    return [out];
};

t.umpToMidi10 = function(ump,mode){
    const outArr =[];

    //midi 1.0
    let sysex = [];
    for(let i=0; i<ump.length;i++) {
        const mess = ump[i];
        const mt = mess >>> 28;
        switch (mt) {
            case 0: //32 bits Utility Messages
            case 5: //128 bits Data Messages
                //No conversion
                break;
            case 1: { //32 bits System Real Time and System Common Messages (except System Exclusive)
                let out = [mess >> 16 & 0xFF];
                if ([0xF1, 0xF2, 0xF3].indexOf(out[0]) !== -1) {
                    out.push(mess >> 8 & 0x7F);
                }
                if ([0xF2].indexOf(out[0]) !== -1) {
                    out.push(mess & 0x7F);
                }
                outArr.push(out);
                break;
            }

            case 2: {//32 Bits MIDI 1.0 Channel Voice Messages
                let out = [mess >> 16 & 0xFF, mess >> 8 & 0x7F];
                if ([0xC0, 0xD0].indexOf(out[0] & 0xF0) === -1) {
                    out.push(mess & 0x7F);
                }
                outArr.push(out);
                break;
            }

            case 3://64 bits Data Messages (including System Exclusive)
                const status = (mess >> 20) & 0xF;
                const numbytes  = (mess >> 16) & 0xF;
                const mess2 =  ump[++i];
                const smesg = [
                    (mess >>> 8) & 0x7F
                    ,mess & 0x7F
                    ,(mess2 >>> 24) & 0x7F
                    ,(mess2 >>> 16) & 0x7F
                    ,(mess2 >>> 8) & 0x7F
                    ,mess2 & 0x7F
                ];
                switch(status){
                    case 0:
                        sysex = [0xF0].concat(smesg.slice(0,numbytes)).concat([0xF7]);
                        outArr.push(sysex);
                        break;
                    case 1:
                        sysex = [0xF0].concat(smesg.slice(0,numbytes));
                        break;
                    case 2:
                        sysex = sysex.concat(smesg.slice(0,numbytes));
                        break;
                    case 3:
                        sysex = sysex.concat(smesg.slice(0,numbytes)).concat([0xF7]);
                        outArr.push(sysex);
                        break;
                }
                break;

            case 4: {//64 bits MIDI 2.0 Channel Voice Messages
                const mess2 = ump[++i];
                // const group = mess >> 24 & 0xF;
                const status = mess >> 16 & 0xF0;
                const channel = mess >> 16 & 0xF;
                const val1 = mess >> 8 & 0xFF;
                const val2 = mess & 0xFF;
                let out = [mess >> 16 & 0xFF];
                switch (status) {
                    case 0x80: //note off
                    case 0x90: //note on
                        let velocity = scaleDown((mess2 >>> 16), 16, 7);
                        if(velocity === 0 && status === 0x90){
                            velocity = 1;
                        }
                        out.push(val1);
                        out.push(velocity);
                        outArr.push(out);
                        break;
                    case 0xA0: //poly aftertouch
                    case 0xB0: {//CC
                        out.push(val1);
                        const f14bitval = scaleDown(mess2 >>> 0, 32, 7);
                        out.push(f14bitval);
                        outArr.push(out);
                        break;
                    }
                    case 0xD0: //Channel Pressure
                        out.push(scaleDown(mess2 >>> 0, 32, 7));
                        outArr.push(out);
                        break;
                    case 0b00100000: {//rpn
                        outArr.push([0xB0 + channel, 101, val1]);
                        outArr.push([0xB0 + channel, 100, val2]);
                        const val14bit = scaleDown(mess2 >>> 0, 32, 14);
                        outArr.push([0xB0 + channel, 6, (val14bit >> 7) & 0x7F]);
                        outArr.push([0xB0 + channel, 38, (val14bit & 127) & 0x7F]);
                        break;
                    }
                    case 0b00110000: { //nrpn
                        outArr.push([0xB0 + channel, 99, val1]);
                        outArr.push([0xB0 + channel, 98, val2]);
                        const val14bit = scaleDown(mess2 >>> 0, 32, 14);
                        outArr.push([0xB0 + channel, 6, (val14bit >> 7) & 0x7F]);
                        outArr.push([0xB0 + channel, 38, (val14bit & 127) & 0x7F]);
                        break;
                    }
                    case 0xC0: //Program change
                        if (mess & 0x1) {
                            outArr.push([0xB0 + channel, 0, mess2 >> 8 & 0x7F]);
                            outArr.push([0xB0 + channel, 32, mess2 & 0x7F]);
                            outArr.push([0xC0 + channel, mess2 >> 24 & 0x7F]);
                        } else {
                            outArr.push([0xC0 + channel, mess2 >> 24 & 0x7F]);
                        }
                        break;

                    case 0xE0: //Pitch bend
                        out.push(mess2 >> 18 & 0x7F);
                        out.push(mess2 >> 25 & 0x7F);
                        outArr.push(out);
                        break;
                }


                break;
            }
        }
    }


    return outArr;
};

t.processUMP = function(ump10,id,cbResponse){
    if (!deviceHistory[id])deviceHistory[id]={sysex:{},endpoint:{},fb:{},umpPos:0, ump:[], flexObj:{}, sysex8:{}};

    for(let i=0; i<ump10.length;i++) {
        const mess = ump10[i];
        switch(deviceHistory[id].umpPos){
            case 0:{

                deviceHistory[id].mt = mess >>> 28;
                deviceHistory[id].group = mess >> 24 & 0xF;
                deviceHistory[id].ump = [mess];
                deviceHistory[id].warnings = [];
                deviceHistory[id].errors = [];

                if (deviceHistory[id].sysex[deviceHistory[id].group]
                    && deviceHistory[id].sysex[deviceHistory[id].group].length
                    && deviceHistory[id].mt !== 0x3
                ) {
                    const status = mess >> 16 & 0xFF;
                    if(deviceHistory[id].mt !== 0x1 && status !== 0xF8){ //Timing Clock
                        deviceHistory[id].warnings.push("No Messages allowed between Sysex");
                    }
                }

                switch (deviceHistory[id].mt) {
                    case 0: //32 bits Utility Messages
                    case 1: //32 bits System Real Time and System Common Messages (except System Exclusive)
                    case 2://32 Bits MIDI 1.0 Channel Voice Messages
                    case 6://Reserved
                    case 7://Reserved
                        cbResponse('ump', deviceHistory[id].group, deviceHistory[id].ump,
                            deviceHistory[id].errors,deviceHistory[id].warnings);
                        break;
                    default:
                        deviceHistory[id].umpPos++
                        break;
                    }
                break;
                }
            case 1: {
                deviceHistory[id].ump.push(mess);
                switch (deviceHistory[id].mt) {
                    case 3: {//64 bits Data Messages (including System Exclusive)
                        const numbytes = (deviceHistory[id].ump[0] >> 16) & 0xF;
                        const smesg = [
                            (deviceHistory[id].ump[0] >> 8) & 0x7F
                            , deviceHistory[id].ump[0] & 0x7F
                            , (mess >> 24) & 0x7F
                            , (mess >> 16) & 0x7F
                            , (mess >> 8) & 0x7F
                            , mess & 0x7F
                        ];
                        const status = (deviceHistory[id].ump[0] >> 20) & 0xF;
                        let process = false;

                        //if (!deviceHistory[id][group])deviceHistory[id][group]={};
                        switch (status) {
                            case 0:


                                if (!deviceHistory[id].sysex[deviceHistory[id].group]){
                                    deviceHistory[id].sysex[deviceHistory[id].group] = [];
                                }
                                if(deviceHistory[id].sysex[deviceHistory[id].group].length){ //Timing Clock
                                    deviceHistory[id].warnings.push("Received new Sysex Before End of Last Sysex.");
                                }
                                if (deviceHistory[id].sysex[deviceHistory[id].group].length) {
                                    debugger;
                                }
                                deviceHistory[id].sysex[deviceHistory[id].group] = [0xF0].concat(smesg.slice(0, numbytes)).concat([0xF7]);
                                process = true;
                                break;
                            case 1:
                                if(deviceHistory[id].sysex[deviceHistory[id].group]
                                    && deviceHistory[id].sysex[deviceHistory[id].group].length){ //Timing Clock
                                    deviceHistory[id].warnings.push("Received new Sysex Before End of Last Sysex.");
                                }
                                deviceHistory[id].sysex[deviceHistory[id].group] = [0xF0].concat(smesg.slice(0, numbytes));
                                break;
                            case 2:
                                if (!deviceHistory[id].sysex[deviceHistory[id].group]) {
                                    deviceHistory[id].warnings.push("Received continue Sysex Before start of new Sysex.");
                                    break;
                                }
                                deviceHistory[id].sysex[deviceHistory[id].group] = deviceHistory[id].sysex[deviceHistory[id].group].concat(smesg.slice(0, numbytes));
                                break;
                            case 3:
                                if (!deviceHistory[id].sysex[deviceHistory[id].group]) {
                                    deviceHistory[id].warnings.push("Received end Sysex Before start of new Sysex.");
                                    break;
                                }
                                deviceHistory[id].sysex[deviceHistory[id].group] = deviceHistory[id].sysex[deviceHistory[id].group].concat(smesg.slice(0, numbytes)).concat([0xF7]);
                                process = true;
                                break;
                        }

                        if (process) {
                            const msgObj = {
                                debug: d.new()
                                , sysex: deviceHistory[id].sysex[deviceHistory[id].group]
                                , group: deviceHistory[id].group
                            };
                            msgObj.debug.setSysex(deviceHistory[id].sysex[deviceHistory[id].group]);
                            deviceHistory[id].sysex[deviceHistory[id].group] = [];
                            cbResponse('sysex', deviceHistory[id].group, {
                                msgObj,
                                ump: deviceHistory[id].ump
                            });
                            deviceHistory[id].sysex[deviceHistory[id].group] = [];
                        }else{
                            cbResponse('sysex', 0xFF, {
                                ump: deviceHistory[id].ump
                            },
                                deviceHistory[id].errors,deviceHistory[id].warnings);
                        }
                        deviceHistory[id].umpPos = 0;
                        break;
                    }
                    case 4: //64 bits MIDI 2.0 Channel Voice Messages
                    case 8: //Reserved
                    case 9: //Reserved
                    case 0xA: //Reserved
                        cbResponse('ump', deviceHistory[id].group,  deviceHistory[id].ump,
                            deviceHistory[id].errors,deviceHistory[id].warnings);
                        deviceHistory[id].umpPos = 0;
                        break;
                    default:
                        deviceHistory[id].umpPos++
                        break;


                }
                break;
            }
            case 2: {
                deviceHistory[id].ump.push(mess);
                switch (deviceHistory[id].mt) {
                    case 0xB: //Reserved
                    case 0xC: //Reserved
                        cbResponse('ump', deviceHistory[id].group, deviceHistory[id].ump,
                            deviceHistory[id].errors,deviceHistory[id].warnings);
                        deviceHistory[id].umpPos = 0;
                        break;
                    default:
                        deviceHistory[id].umpPos++
                        break;
                }
                break;
            }
            case 3: {
                deviceHistory[id].ump.push(mess);
                switch (deviceHistory[id].mt) {
                    case 0xD: //Flex Data Messages
                        const ump = deviceHistory[id].ump;
                        let errors = [];
                        let warnings = [];
                        const group = (ump[0] >>> 24) & 0xF;
                        const statusBank = (ump[0] >>> 8) & 0xFF;
                        const status = (ump[0]) & 0xFF;
                        const form = ump[0] >>> 22 & 0x3;
                        const addr = ump[0] >>> 20 & 0x3;
                        const channel = ump[0] >>> 16 & 0xF;

                        if(addr > 1) errors.push("Addrs is a reserved value");
                        if(addr === 1 && channel) errors.push("Addrs is > 1, Channel must be set to 0");
                        if(statusBank > 2) warnings.push("Status Bank is unknown");

                        switch(statusBank){
                            case 0x00:{
                                if(form > 1) errors.push("Form must be set to 0");
                                switch (status){
                                    case 0x00:{ //set Tempo
                                        cbResponse('umpFlexData', group, {
                                                ump, statusBank, status, form, addr, channel,
                                                nsPQtrNote: ump[1]
                                            },
                                            errors,warnings);
                                        break;
                                    }
                                    case 0x01:{ //set Time Signature
                                        cbResponse('umpFlexData', group, {
                                                ump, statusBank, status, form, addr, channel,
                                                numerator: ump[1] >>> 24,
                                                dominator: (ump[1] >>> 16) & 0xFF,
                                                num32ndNote: (ump[1] >>> 8) & 0xFF
                                            },
                                            errors,warnings);
                                        break;
                                    }
                                    case 0x02:{ //set Metronome
                                        cbResponse('umpFlexData', group, {
                                                ump, statusBank, status, form, addr, channel,
                                                numClckPrimTick: ump[1] >>> 24,
                                                barAccent1: (ump[1] >>> 16) & 0xFF,
                                                barAccent2: (ump[1] >>> 8) & 0xFF,
                                                barAccent3: (ump[1]) & 0xFF,
                                                numSubDivClk1: (ump[2] >>> 24) & 0xFF,
                                                numSubDivClk2: (ump[2] >>> 16) & 0xFF
                                            },
                                            errors,warnings);
                                        break;
                                    }
                                    case 0x05:{ //set Key Signature
                                        cbResponse('umpFlexData', group, {
                                                ump, statusBank, status, form, addr, channel,
                                                sharpFlats: t.TwosComplementToValue(ump[1] >>> 28,4),
                                                tonicMode: chordTonic[(ump[1] >>> 24) & 0xF]
                                            },
                                            errors,warnings);
                                        break;
                                    }
                                    case 0x06:{ //Set Chord Name Message
                                        cbResponse('umpFlexData', group, {
                                                ump, statusBank, status, form, addr, channel,
                                                sharpFlats: t.TwosComplementToValue(ump[1] >>> 28,4),
                                                chordTonicNote: chordTonic[(ump[1] >>> 24) & 0xF]
                                                //TODO Skipping Extra for now
                                            },
                                            errors,warnings);
                                        break;
                                    }
                                    default:{
                                        warnings.push("Unknown Flex Message?");
                                        cbResponse('umpFlexData', group, {
                                                ump, statusBank, status, form, addr, channel
                                            },
                                            errors,warnings);
                                    }
                                }
                                break;
                            }
                            case 0x01: // Performance Events
                            case 0x02:{ //Lyric Data Events

                                let ref = addr? group + 256: channel + (group*16);
                                let process = true;

                                if(form <= 1){
                                    if(deviceHistory[id].flexObj[ref]){
                                        warnings.push("Found previously unfinished set of Flex Messages?");
                                    }
                                    deviceHistory[id].flexObj[ref] = {form, txtArr:[], status, statusBank};
                                }else if(!deviceHistory[id].flexObj[ref]){
                                    errors.push("No initial set of Flex Messages?");
                                    process = false;
                                } else if(deviceHistory[id].flexObj[ref].status !== status){
                                    errors.push("Status does not match previous set of Flex Messages?");
                                    delete deviceHistory[id].flexObj[ref];
                                    process = false;
                                } else if(deviceHistory[id].flexObj[ref].statusBank !== statusBank){
                                    errors.push("Status Bank does not match previous set of Flex Messages?");
                                    delete deviceHistory[id].flexObj[ref];
                                    process = false;
                                }

                                const ump = deviceHistory[id].ump;
                                if(process){
                                    for (let j = 1; j < 4; j++) {
                                        if ((ump[j] >> 24) & 0xFF) deviceHistory[id].flexObj[ref].txtArr.push((ump[j] >> 24) & 0xFF);
                                        if ((ump[j] >> 16) & 0xFF) deviceHistory[id].flexObj[ref].txtArr.push((ump[j] >> 16) & 0xFF);
                                        if ((ump[j] >> 8) & 0xFF) deviceHistory[id].flexObj[ref].txtArr.push((ump[j] >> 8) & 0xFF);
                                        if (ump[j] & 0xFF) deviceHistory[id].flexObj[ref].txtArr.push(ump[j] & 0xFF);
                                    }
                                }

                                if (process && (form === 3 || form === 0)) {
                                    let txt = new TextDecoder().decode(new Uint8Array(deviceHistory[id].flexObj[ref].txtArr));
                                    cbResponse('umpFlexData', group, {
                                            ump: ump,
                                            mt: deviceHistory[id].mt,
                                            status,
                                            statusBank,
                                            txt
                                        },
                                        errors,warnings);
                                    delete deviceHistory[id].flexObj[ref];
                                }else{
                                    cbResponse('umpFlexData', group, {
                                            ump: ump
                                        },
                                        errors,warnings);
                                }


                                break;
                            }
                        }



                        cbResponse('umpFlexData', 0xFF, {
                            ump: deviceHistory[id].ump, statusBank, status, form, addr, channel
                            },
                            deviceHistory[id].errors,deviceHistory[id].warnings);
                        break;
                    case 0xE: //Reserved
                    case 0x5: { //128 bits Data Messages
                        const status = (deviceHistory[id].ump[0] >> 20) & 0xF;
                        const numBytes = (deviceHistory[id].ump[0] >> 16) & 0xF;
                        const streamId = (deviceHistory[id].ump[0] >> 8) & 0xFF;
                        const idGRStr = deviceHistory[id].group+'_'+streamId;

                        const ump = deviceHistory[id].ump;
                        let numBytesStart = 0;
                        if(status <= 1){ //Complete or First Message
                            deviceHistory[id].sysex8[idGRStr] = {
                                data:[],
                                mnrfId: ((ump[0] & 0xFF) << 8) + ((ump[1] >> 24) & 0xFF),
                                deviceId: (ump[1] >> 16) & 0xFF,
                                subId1: (ump[1] >> 8) & 0xFF,
                                subId2: ump[1]  & 0xFF
                            };
                            numBytesStart = 5;
                        }

                        let numBytesSoFar = 0;
                        if (numBytesStart <= numBytesSoFar && numBytes > numBytesSoFar++) deviceHistory[id].sysex8[idGRStr].push(ump[0] & 0xFF);
                        for (let j = status > 1?1:2; j < 4; j++) {
                            if (numBytesStart <= numBytesSoFar && numBytes > numBytesSoFar++) deviceHistory[id].sysex8[idGRStr].push((ump[j] >> 24) & 0xFF);
                            if (numBytesStart <= numBytesSoFar && numBytes > numBytesSoFar++) deviceHistory[id].sysex8[idGRStr].push((ump[j] >> 16) & 0xFF);
                            if (numBytesStart <= numBytesSoFar && numBytes > numBytesSoFar++) deviceHistory[id].sysex8[idGRStr].push((ump[j] >> 8) & 0xFF);
                            if (numBytesStart <= numBytesSoFar && numBytes > numBytesSoFar++) deviceHistory[id].sysex8[idGRStr].push(ump[j] & 0xFF);
                        }

                        if(status === 0 || status ===3){
                            cbResponse('sysex8', deviceHistory[id].group, {
                                    ump: deviceHistory[id].ump,
                                    streamId
                                },
                                deviceHistory[id].errors, deviceHistory[id].warnings);
                        }

                        cbResponse('ump', deviceHistory[id].group, deviceHistory[id].ump,
                            deviceHistory[id].errors, deviceHistory[id].warnings);
                        break;
                    }
                    case 0xF: {// Groupless Message Type F
                        const status = (deviceHistory[id].ump[0] >> 16) & 0x3FF; //10 bit Status
                        const form = deviceHistory[id].ump[0] >> 26 & 0x3;
                        //const filter = deviceHistory[id].ump[0] & 0xFF;

                        switch(status){
                            case 0x000://Get MIDI Endpoint Info

                                if ((deviceHistory[id].ump[0]>>8) & 0xFF < 1 ) {
                                    deviceHistory[id].warnings.push("UMP Major Version should be at least 1.");
                                }

                                if (deviceHistory[id].ump[0] & 0xFF < 1 ) {
                                    deviceHistory[id].warnings.push("UMP Minor Version should be at least 1.");
                                }

                                cbResponse('umpEndpoint', 0xFF, {
                                    ump:deviceHistory[id].ump,
                                    status,
                                    filter: deviceHistory[id].ump[1] & 0xFF,
                                    versionMajor: (deviceHistory[id].ump[0]>>8) & 0xFF,
                                    versionMinor: deviceHistory[id].ump[0] & 0xFF
                                },
                                    deviceHistory[id].errors,deviceHistory[id].warnings);
                                break;
                            case 0x0001: //Reply to Get MIDI Endpoint Info
                                if (((deviceHistory[id].ump[0]>>8) & 0xFF) < 1 ) {
                                    deviceHistory[id].warnings.push("UMP Major Version should be at least 1.");
                                }

                                if ((deviceHistory[id].ump[0] & 0xFF) < 1 ) {
                                    deviceHistory[id].warnings.push("UMP Minor Version should be at least 1.");
                                }

                                deviceHistory[id].numOfFuncBlocks = (deviceHistory[id].ump[1] >> 24) & 0x7F;

                                cbResponse('umpEndpointProcess', 0xFF, {
                                    ump:deviceHistory[id].ump,
                                    mt: deviceHistory[id].mt,
                                    status,
                                    versionMajor: (deviceHistory[id].ump[0]>>8) & 0xFF,
                                    versionMinor: deviceHistory[id].ump[0] & 0xFF,
                                    staticFuncBlocks: (deviceHistory[id].ump[1] >> 31) & 1,
                                    numOfFuncBlocks: deviceHistory[id].numOfFuncBlocks,
                                    midi2Supported: (deviceHistory[id].ump[1] >>> 9) & 1,
                                    midi1Supported: (deviceHistory[id].ump[1] >>> 8) & 1,
                                    jrrxSupported: (deviceHistory[id].ump[1] >>> 1) & 1,
                                    jrtxSupported: deviceHistory[id].ump[1]  & 1
                                },
                                    deviceHistory[id].errors,deviceHistory[id].warnings);
                                break;
                            case 0x0002: //Reply to Get MIDI Endpoint Device Info
                                const manufacturerId = [(deviceHistory[id].ump[1] >>> 16) & 0x7F,
                                    (deviceHistory[id].ump[1] >>> 8) & 0x7F,
                                    deviceHistory[id].ump[1] & 0x7F];
                                const manuDetails = getManufacturer16bit(manufacturerId);
                                cbResponse('umpEndpointProcess', 0xFF, {
                                    ump:deviceHistory[id].ump,
                                    mt: deviceHistory[id].mt,
                                    status,
                                    manufacturerId,
                                    manuDetails,
                                    familyId: [(deviceHistory[id].ump[2] >>> 24) & 0x7F, (deviceHistory[id].ump[2] >>> 16) & 0x7F],
                                    modelId: [(deviceHistory[id].ump[2] >>> 8) & 0x7F,deviceHistory[id].ump[2] & 0x7F],
                                    versionId: [
                                        (deviceHistory[id].ump[3] >>> 24) & 0x7F,
                                        (deviceHistory[id].ump[3] >>> 16) & 0x7F,
                                        (deviceHistory[id].ump[3] >>> 8) & 0x7F,
                                        deviceHistory[id].ump[3] & 0x7F]
                                },
                                    deviceHistory[id].errors,deviceHistory[id].warnings);
                                break;
                            case 0x0003: { //Reply to Get MIDI Endpoint Name
                                if (form <= 1 || !deviceHistory[id].endpoint.nameArr) {
                                    deviceHistory[id].endpoint.nameArr = [];
                                }
                                const ump = deviceHistory[id].ump;
                                if ((ump[0] >> 8) & 0xFF) deviceHistory[id].endpoint.nameArr.push((ump[0] >> 8) & 0xFF);
                                if (ump[0] & 0xFF) deviceHistory[id].endpoint.nameArr.push(ump[0] & 0xFF);
                                for (let j = 1; j < 4; j++) {
                                    if ((ump[j] >> 24) & 0xFF) deviceHistory[id].endpoint.nameArr.push((ump[j] >> 24) & 0xFF);
                                    if ((ump[j] >> 16) & 0xFF) deviceHistory[id].endpoint.nameArr.push((ump[j] >> 16) & 0xFF);
                                    if ((ump[j] >> 8) & 0xFF) deviceHistory[id].endpoint.nameArr.push((ump[j] >> 8) & 0xFF);
                                    if (ump[j] & 0xFF) deviceHistory[id].endpoint.nameArr.push(ump[j] & 0xFF);
                                }

                                if (form === 3 || form === 0) {
                                    deviceHistory[id].endpoint.name = new TextDecoder().decode(new Uint8Array(deviceHistory[id].endpoint.nameArr));
                                    cbResponse('umpEndpointProcess', 0xFF, {
                                        ump: ump,
                                        mt: deviceHistory[id].mt,
                                        status: status,
                                        name: deviceHistory[id].endpoint.name
                                    },
                                        deviceHistory[id].errors,deviceHistory[id].warnings);
                                }else{
                                    cbResponse('umpEndpointProcess', 0xFF, {
                                        ump: ump
                                    },
                                        deviceHistory[id].errors,deviceHistory[id].warnings);
                                }
                                break;
                            }
                            case 0x0004: { //Reply to Get MIDI Endpoint Product Instance Id
                                if (form <= 1) {
                                    deviceHistory[id].endpoint.prodInstIdArr = [];
                                }
                                const ump = deviceHistory[id].ump;
                                if ((ump[0] >> 8) & 0xFF) deviceHistory[id].endpoint.prodInstIdArr.push((ump[0] >> 8) & 0xFF);
                                if (ump[0] & 0xFF) deviceHistory[id].endpoint.prodInstIdArr.push(ump[0] & 0xFF);
                                for (let j = 1; j < 4; j++) {
                                    if ((ump[j] >> 24) & 0xFF) deviceHistory[id].endpoint.prodInstIdArr.push((ump[j] >> 24) & 0xFF);
                                    if ((ump[j] >> 16) & 0xFF) deviceHistory[id].endpoint.prodInstIdArr.push((ump[j] >> 16) & 0xFF);
                                    if ((ump[j] >> 8) & 0xFF) deviceHistory[id].endpoint.prodInstIdArr.push((ump[j] >> 8) & 0xFF);
                                    if (ump[j] & 0xFF) deviceHistory[id].endpoint.prodInstIdArr.push(ump[j] & 0xFF);
                                }

                                if (form === 3 || form === 0) {
                                    deviceHistory[id].endpoint.prodInstId = new TextDecoder().decode(
                                        new Uint8Array(deviceHistory[id].endpoint.prodInstIdArr));
                                    cbResponse('umpEndpointProcess', 0xFF, {
                                        ump: ump,
                                        mt: deviceHistory[id].mt,
                                        status,
                                        prodInstId: deviceHistory[id].endpoint.prodInstId
                                    },
                                        deviceHistory[id].errors,deviceHistory[id].warnings);
                                }else{
                                    cbResponse('umpEndpointProcess', 0xFF, {
                                        ump: ump
                                    },
                                        deviceHistory[id].errors,deviceHistory[id].warnings);
                                }
                                break;
                            }
                            case 0x6:  //Stream Configuration Reply
                            case 0x5: { //Stream Configuration Request
                                const ump = deviceHistory[id].ump;
                                cbResponse('umpEndpointProcess', 0xFF, {
                                        ump: ump,
                                        mt: deviceHistory[id].mt,
                                        status,
                                        protocol: (ump[0] >> 8) & 0xFF,
                                        jrrx: (ump[0] >> 2) & 0x1,
                                        jrtx: ump[0] & 0x1
                                    },
                                    deviceHistory[id].errors,deviceHistory[id].warnings);
                                break;
                            }
                            case 0x0010: { //Get Function Block Info
                                const fbIdx = (deviceHistory[id].ump[0] >> 8) & 0xFF;
                                if(fbIdx> 31){
                                    deviceHistory[id].errors.push("FB index is outside of boundary.");
                                }

                                if(deviceHistory[id].numOfFuncBlocks !== undefined && fbIdx > deviceHistory[id].numOfFuncBlocks){
                                    deviceHistory[id].errors.push("FB index is outside of Number of Function Blocks Endpoint Details.");
                                }

                                cbResponse('umpEndpoint', 0xFF, {
                                    ump: deviceHistory[id].ump,
                                    fbIdx,
                                    status,
                                    filter: deviceHistory[id].ump[0] & 0xFF
                                },
                                    deviceHistory[id].errors,deviceHistory[id].warnings);
                                break;
                            }
                            case 0x0011: { //Reply to Get Function Block Info
                                const fbIdx = (deviceHistory[id].ump[0] >> 8) & 0x7F;
                                const firstGroup = (deviceHistory[id].ump[1] >> 24) & 0xFF;
                                const numberGroups = (deviceHistory[id].ump[1] >> 16) & 0xFF;
                                const ciVersion = (deviceHistory[id].ump[1] >> 8) & 0x7F;
                                const active = !!((deviceHistory[id].ump[0] >> 15) & 0x1);

                                if(fbIdx> 31){
                                    deviceHistory[id].errors.push("FB index is outside of boundary.");
                                }
                                if(active){
                                    if(firstGroup> 15){
                                        deviceHistory[id].errors.push("FB first Group outside of boundary.");
                                    }
                                    if(firstGroup + numberGroups > 16){
                                        deviceHistory[id].errors.push("FB Number of Groups outside of boundary.");
                                    }
                                    if(ciVersion>0x2){
                                        deviceHistory[id].warnings.push("MIDI CI Version is unknown");
                                    }
                                }
                                cbResponse('umpEndpointProcess', 0xFF, {
                                    ump: deviceHistory[id].ump,
                                    mt: deviceHistory[id].mt,
                                    status,
                                    fbIdx,
                                    active,
                                    isMIDI1: (deviceHistory[id].ump[0]>>2) & 0x3,
                                    direction: deviceHistory[id].ump[0] & 0x3,
                                    firstGroup,
                                    numberGroups,
                                    ciVersion,
                                    sysex8Streams: deviceHistory[id].ump[1]  & 0xFF
                                },
                                    deviceHistory[id].errors,deviceHistory[id].warnings);
                                break;
                            }
                            case 0x0012: { //Reply to Get Function Block name
                                const fbIdx = (deviceHistory[id].ump[0] >> 8) & 0x7F;
                                if(fbIdx> 31){
                                    deviceHistory[id].errors.push("FB index is outside of boundary.");
                                }
                                const ump = deviceHistory[id].ump;
                                if (form <= 1) {
                                    deviceHistory[id].fb[fbIdx] = [];
                                }

                                if (ump[0] & 0xFF) deviceHistory[id].fb[fbIdx].push(ump[0] & 0xFF);
                                for (let j = 1; j < 4; j++) {
                                    if ((ump[j] >> 24) & 0xFF) deviceHistory[id].fb[fbIdx].push((ump[j] >> 24) & 0xFF);
                                    if ((ump[j] >> 16) & 0xFF) deviceHistory[id].fb[fbIdx].push((ump[j] >> 16) & 0xFF);
                                    if ((ump[j] >> 8) & 0xFF) deviceHistory[id].fb[fbIdx].push((ump[j] >> 8) & 0xFF);
                                    if (ump[j] & 0xFF) deviceHistory[id].fb[fbIdx].push(ump[j] & 0xFF);
                                }

                                if (form === 3 || form === 0) {
                                    const name = new TextDecoder().decode(new Uint8Array(deviceHistory[id].fb[fbIdx]));
                                    cbResponse('umpEndpointProcess', 0xFF, {
                                        ump,
                                        mt: deviceHistory[id].mt,
                                        status,
                                        fbIdx,
                                        name
                                    },
                                        deviceHistory[id].errors,deviceHistory[id].warnings);
                                }
                                break;
                            }
                            default:
                                cbResponse('umpEndpointProcess', 0xFF, {
                                        ump: deviceHistory[id].ump,
                                        mt: deviceHistory[id].mt,
                                        status,
                                        form
                                    },
                                    deviceHistory[id].errors,deviceHistory[id].warnings);
                                break;
                        }
                        break;
                    }
                }

                deviceHistory[id].umpPos = 0;
                break;
            }
        }
    }
};

t.getNumberFromBytes = function(sysex,offset,amount){
    let num = 0;const upperOffset = offset+amount;
    for(let offsetC = offset; offsetC<upperOffset;offsetC++){
        num += sysex[offsetC] << (7* (offsetC-offset));
    }
    return num;
};

t.getBytesFromNumbers = function(number,amount){
    const bytes = [];
    for(let amountC = amount; amountC>0;amountC--){
        bytes.push(number & 127);
        number = number >> 7;
    }
    return bytes;
};


function scaleUp(srcVal, srcBits, dstBits) {
    // simple bit shift
    if(srcVal===0){
        return 0;
    }
    if(srcBits===1){
        return (Math.pow(2, dstBits) - 1)>>>0;
    }

    const scaleBits = (dstBits - srcBits);
    let bitShiftedValue = (srcVal << scaleBits)>>>0;
    const srcCenter = Math.pow(2,srcBits-1);
    if (srcVal <= srcCenter) {
        return bitShiftedValue;
    }

    // expanded bit repeat scheme
    let repeatBits = srcBits - 1;
    const repeatMask = Math.pow(2,repeatBits) - 1;
    let repeatValue = srcVal & repeatMask;
    if (scaleBits > repeatBits) {
        repeatValue <<= scaleBits - repeatBits;
    } else {
        repeatValue >>= repeatBits - scaleBits;
    }
    while (repeatValue !== 0) {
        bitShiftedValue |= repeatValue;
        repeatValue >>= repeatBits;
    }
    return bitShiftedValue;
}
t.scaleUp = scaleUp;

function scaleDown(srcVal, srcBits, dstBits) {
    // simple bit shift
    const scaleBits = (srcBits - dstBits);
    return srcVal >>> scaleBits;
}
t.scaleDown = scaleDown;




t.arrTobit7array = function(data) {
    //data = Array.from(data);
    let sysex = [0];
    let idx = 0;
    let cnt7 = 6;

    for (let i=0;i<data.length;i++) {
        let x = data[i];
        let c = x & 0x7F;
        let msb = x >> 7;
        sysex[idx] |= msb << cnt7;
        sysex.push(c);
        if (cnt7 === 0) {
            idx += 8;
            sysex.push(0);
            cnt7 = 6;
        }
        else if (i+1 !== data.length){
            cnt7 -= 1
        }
    }
    if(cnt7 === 0)sysex.pop();
    return sysex;
};


t.arr7BitTo8Bit = function(sysex) {
    let cnt;
    let bits = 0;
    let data =[];
    for (cnt = 0; cnt < sysex.length; cnt++) {
        if ((cnt % 8) === 0) {
            bits = sysex[cnt];
        } else {
            data.push(sysex[cnt] | (((bits >> (7 - (cnt % 8))) & 1) << 7));
        }
    }
    return new Uint8Array(data);
};


t.unicodeToChar = function(text) {
    return text.replace(/\\u[\dA-F]{4}/gi,
        function (match) {
            return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
        });
};

t.strToUnicode = function(theString) {
    let unicodeString = '', charcode, theUnicode;
    for (let i=0; i < theString.length; i++) {
        charcode = theString.charCodeAt(i);
        if(charcode<=127){
            unicodeString +=theString[i];
            continue;
        }
        theUnicode = charcode.toString(16).toUpperCase();
        while (theUnicode.length < 4) {
            theUnicode = '0' + theUnicode;
        }
        theUnicode = '\\u' + theUnicode;
        unicodeString += theUnicode;
    }
    return unicodeString;
};

t.stringToTypeF = function(status, fbIdx, theString) {
    const umpMess = [];
    let umpPos = 0;
    const buf = Buffer.from(theString);
    const textLen = buf.length;
    for(let offset=0; offset< textLen; ) {
        let form = 0;
        if(offset===0){
            if(textLen> (fbIdx!==null?13:14)) form = 1;
        }else{
            if(offset+ (fbIdx!==null?12:13) < textLen){
                form = 2;
            }else{
                form = 3;
            }
        }
        umpMess[umpPos] = ((0xF << 28)>>> 0) + (form << 26) + (status << 16);
        if(fbIdx===null && offset < textLen){
            umpMess[umpPos] += (buf[offset++] << 8);
        }else{
            umpMess[umpPos] += fbIdx<< 8;
        }
        if(offset < textLen)umpMess[umpPos++] += buf[offset++];
        for(let i=1;i<4;i++){
            umpMess[umpPos] =0;
            if(offset < textLen)umpMess[umpPos] += (buf[offset++] << 24);
            if(offset < textLen)umpMess[umpPos] += (buf[offset++] << 16);
            if(offset < textLen)umpMess[umpPos] += (buf[offset++] << 8);
            if(offset < textLen)umpMess[umpPos] += buf[offset++];
            umpPos++;
        }
        // Now Return This too Remote End

    }
    return umpMess;
}


t.TwosComplementToValue = function(value, length)
{
    let halfValue = ((~0) << length) >>> 1;
    if(value>halfValue){
        return -(~value + 1);
    }

    return value;
}


//https://jsbin.com/misupikili/edit?js,console
t.ValueToTwosComplement = function(value, bitCount) {
    let binaryStr;

    if (value >= 0) {
        let twosComp = value.toString(2);
        binaryStr    = padAndChop(twosComp, '0', (bitCount || twosComp.length));
    } else {
        binaryStr = (Math.pow(2, bitCount) + value).toString(2);

        if (Number(binaryStr) < 0) {
            return undefined
        }
    }

    return Number(`0b${binaryStr}`);
}
function padAndChop(str, padChar, length) {
    return (Array(length).fill(padChar).join('') + str).slice(length * -1);
}


