
const d = require("./debugger");
const {getManufacturerBy16bitId, getManufacturer16bit} = require("./manufactuers");

module.exports  = class universalSysex {
    constructor(umpDev, ciEventHandler) {
        this.umpDev = umpDev;
        this.ciEventHandler = ciEventHandler;

        //this.ev = new events.EventEmitter();

    }

    processUni(group, msgObj){
        if (msgObj.sysex[3] === 0x06 && msgObj.sysex[4] === 0x01) { //Identity Request
            debugger;
            this.processIdentityRequest(msgObj);
        } else if (msgObj.sysex[3] === 0x06 && msgObj.sysex[4] === 0x02) {
            this.processIdentityReply(msgObj);
        }
    }

    sendProcessIdentityRequest(){
        const msgObj = {
            debug: d.new('Send Device Identity Request')
            ,sysex: [0xF0,0x7E,0x7F,0x06,0x01]
        };
        msgObj.debug.addDebug(0,1,"System Exclusive Start");
        msgObj.debug.addDebug(1,1,"Universal System Exclusive");

        msgObj.debug.addDebug(2,1,"To/From whole MIDI Port");
        msgObj.debug.addDebug(3,1,"Universal System Exclusive Sub ID #1","General Information");
        msgObj.debug.addDebug(4,1,"Universal System Exclusive Sub ID #2","Identity Request");

        this.completeMIDISysExMsg(msgObj);
    }

//+++++++++ Identity Request
    processIdentityRequest(msgObj) {
        msgObj.debug.setTitle('Received Device Identity Request');

        msgObj.debug.addDebug(0, 1, "System Exclusive Start");
        msgObj.debug.addDebug(1, 1, "Universal System Exclusive");

        msgObj.debug.addDebug(2, 1, "To/From whole MIDI Port");
        msgObj.debug.addDebug(3, 1, "Universal System Exclusive Sub ID #1", "General Information");
        msgObj.debug.addDebug(4, 1, "Universal System Exclusive Sub ID #2", "Identity Request");
        h._exclusiveEndCheck(msgObj, 5);

        //h.sendOutSysexDebug(msgObj);
        d.msg("sysex", msgObj.debug.getDebug(), 'in',this.mOut._name,this.mOut._group, msgObj.debug.getErrors());

        //********
        let newResponse = {
            debug: d.new('Send Device Identity Response')
            , sysex: [0xF0, 0x7E, 0x7F, 0x06, 0x02]
        };


        newResponse.debug.addDebug(0, 1, "System Exclusive Start");
        newResponse.debug.addDebug(1, 1, "Universal System Exclusive");

        newResponse.debug.addDebug(2, 1, "To/From whole MIDI Port");
        newResponse.debug.addDebug(3, 1, "Universal System Exclusive Sub ID #1", "General Information");
        newResponse.debug.addDebug(4, 1, "Universal System Exclusive Sub ID #2", "Identity Response");

        let currDevice = global.settings.device;

        let offset;
        const manu = getManufacturerBy16bitId(currDevice.manufacturerId16,true);
        newResponse.sysex.push(manu.bytes);
        offset = 5 + manu.bytes.length;
        newResponse.debug.addDebug(5, manu.bytes.length, "Manufacturer", manu.name);


        newResponse.sysex.push(...currDevice.familyId);
        newResponse.debug.addDebug(offset, 2, "Device Family Id", currDevice.familyId);
        newResponse.sysex.push(...currDevice.modelId);
        newResponse.debug.addDebug(offset + 2, 2, "Device Model Id", currDevice.modelId);
        newResponse.sysex.push(...currDevice.versionId);
        //newResponse.sysex.push(...getBytesFromNumbers(majorId,2).reverse());
        newResponse.debug.addDebug(offset + 4, 4, "Device Version", d.arrayToHex(currDevice.versionId));

        h.completeMIDICIMsg(newResponse);

    }

    processIdentityReply(msgObj) {
        msgObj.debug.setTitle('Received Device Identity Reply');

        msgObj.debug.addDebug(0, 1, "System Exclusive Start");
        msgObj.debug.addDebug(1, 1, "Universal System Exclusive");

        msgObj.debug.addDebug(2, 1, "To/From whole MIDI Port");
        msgObj.debug.addDebug(3, 1, "Universal System Exclusive Sub ID #1", "General Information");
        msgObj.debug.addDebug(4, 1, "Universal System Exclusive Sub ID #2", "Identity Reply");

        //const currDevice = global.settings.projDevice || {};

        let manuIdOffset;

        const manu = getManufacturer16bit(msgObj.sysex.slice(5,3),true);
        manuIdOffset = 5 + manu.bytes.length;
        msgObj.debug.addDebug(5, manu.bytes.length, "Manufacturer", manu.name);

        const familyId = [msgObj.sysex[manuIdOffset++],msgObj.sysex[manuIdOffset++]];
        msgObj.debug.addDebug(manuIdOffset - 2, 2, "Device Family Id", d.arrayToHex(familyId));

        const modelId = [msgObj.sysex[manuIdOffset++], msgObj.sysex[manuIdOffset++]];
        msgObj.debug.addDebug(manuIdOffset - 2, 2, "Device Model Id", d.arrayToHex(modelId));

        const versionId = [msgObj.sysex[manuIdOffset++]
            , msgObj.sysex[manuIdOffset++], msgObj.sysex[manuIdOffset++],
            msgObj.sysex[manuIdOffset++]];
        msgObj.debug.addDebug(manuIdOffset - 4, 4, "Device Version", d.arrayToHex(versionId));


        this._exclusiveEndCheck(msgObj, manuIdOffset);

        // global._midici._ev.emit('deviceIdentityResponse',{
        //     ...manu,
        //     familyId,
        //     modelId,
        //     versionId
        // });

        //d.msg("sysex", msgObj.debug.getDebug(), 'in',this.mOut._name,this.mOut._group, msgObj.debug.getErrors());
    }


    completeMIDISysExMsg(newMsgObj){
        newMsgObj.sysex.push(0xF7);
        newMsgObj.debug.addDebug(newMsgObj.sysex.length-1,1,"End Universal System Exclusive");

        newMsgObj.debug.setSysex(newMsgObj.sysex);

        //d.msg("sysex",newMsgObj.debug.getDebug(),'out',this.mOut._name,this.mOut._group,newMsgObj.debug.getErrors());

        global.umpDevices[this.umpDev].midiOutFunc(this.umpDev,t.midi10ToUMP(newMsgObj.group,newMsgObj.sysex));
    };


    _exclusiveEndCheck (msgObj, offset){
        if(msgObj.sysex[offset]!==0xF7 ){
            msgObj.debug.addError("Exclusive end Check Fail",0x21);
            msgObj.debug.addDebug(offset,1,"Not End of Exclusive",d.arrayToHex([msgObj.sysex[offset]]),{type:"error"});
        }else{
            msgObj.debug.addDebug(offset,1,"End Universal System Exclusive");
        }
    };
}

