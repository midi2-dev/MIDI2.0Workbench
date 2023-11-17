/* (C) Copyright 2023 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

const {getManufacturerBy16bitId, getManufacturer16bit} = require("./manufactuers");
const {setRemoteEndpointValueFromMUID} = require("./utils");
const t = require("./translations");
const s = require("./streams");
const {arrayToHex} = require("./debugger");

const authorityLevels={
    0x10:{
        name:'MIDI Transport'
        ,description:'Carries MIDI data between Bidirectional Endpoints. Acts as MIDI-CI Proxy for\n' +
            'Endpoints whenever necessary. Passes both MIDI 1.0 and New AMEI/MMA Protocol messages. Does NOT\n' +
            'do any protocol translation.'
    }
    ,0x20:{
        name:'MIDI Event Processor (Sequencer, Arpeggiator)'
        ,description:'ecords, Edits, and Plays messages or Transforms\n' +
            'messages in real time. Supports only MIDI 1.0 or Switchable between MIDI 1.0 and New AMEI/MMA\n' +
            'Protocol messages on a port by port basis.'
    }
    ,0x30:{
        name:'MIDI Endpoint (e.g synth, controller)'
        ,description:'Original Source of MIDI Messages or Final Consumer of MIDI Messages. Supports only\n' +
            'MIDI 1.0 or Switchable between MIDI 1.0 and New AMEI/MMA Protocol messages.'
    }
    ,0x40:{
        name:'MIDI Translator'
        ,description:'Located between Bidirectional Endpoints. Performs Translation between MIDI 1.0 and\n' +
            'New AMEI/MMA Protocol whenever necessary. Acts as MIDI-CI Proxy for Endpoints whenever necessary.\n' +
            'Passes both MIDI 1.0 and New AMEI/MMA Protocol messages.'
    }
    ,0x50:{
        name:'MIDI Gateway'
        ,description:'A special purpose embedded OS device (e.g., Workstation, Router) that manages a Node\n' +
            'of Connected Devices/Applications/Plugins. Provides connection & routing between all Endpoints on the\n' +
            'Node. Acts as MIDI-CI Proxy for Endpoints whenever necessary. Supports only MIDI 1.0 or Switchable\n' +
            'between MIDI 1.0 and New AMEI/MMA Protocol messages.'
    }
    ,0x60:{
        name:'MIDI Node Server (PC) (DAW)'
        ,description:'General purpose OS, with wide range of MIDI service and MIDI API e.g., Mac\n' +
            'or Windows PC. Manages a Node of Connected Devices/Applications/Plugins. Provides connection &\n' +
            'routing between all Endpoints on the Node. Acts as MIDI-CI Proxy for Endpoints whenever necessary. May\n' +
            'act as MIDI-CI Proxy for Single Direction Endpoints (i.e. API as Proxi for Plugin) Supports both MIDI 1.0\n' +
            'and New AMEI/MMA Protocol messages. It is strongly recommended that a Central MIDI Node PC have\n' +
            'protocol translation capability on every Input/Output MIDI-CI connection.'
    }
};

const ACKStatusCodes = {
    0x00: 'ACK',
    0x01: 'MIDI Dump Complete',
    0x10: 'Timeout Wait in multiples of 100 milliseconds',
    0x11: 'Send next number of Chunks',
};

const NAKStatusCodes = {
    0x00: 'NAK',
    0x01: 'MIDI-CI Message not supported',
    0x02: 'MIDI-CI version not supported',
    0x03: 'Channel/Port(group Source/Destination) Not in use',
    0x04: 'Profile Enable or Disable message for a Profile the Responder does not support or does not support on the requested channel',
    0x05: 'Incomplete MIDI Message Dump',
    0x10: 'Terminate Inquiry',
    0x11: 'Property Exchange Chunk are out of sequence',
    0x12: 'Resend this number of the most recent Chunks',
    0x13: 'Requested MIDI-CI ACK 0x11 "Send next number of Chunks" is too large. Reply with max number of Chunks supported.',
    0x20: 'Error occurred, please retry',
    0x21: 'Message was malformed',
    0x22: 'Timeout Has Occurred',
    0x23: 'Busy, try again time, in multiples of 100 milliseconds ',
};


exports.ciParts = {
    'device':{
        path:'/device'
    },
    'manufacturerId': {
        title: 'Device Manufacturer',
        length: 3,
        type: 'array',
        path:'/device/manufacturerId',
        outValue : (oOpts, midiCi) => {
            return getManufacturerBy16bitId(midiCi.device.manufacturerId16).manufacturerId;
        },
        inValue : (msgObj, midiCi, val) => {
            midiCi.setData(msgObj.muid,'/device/manufacturer',getManufacturer16bit(val).name || 'Unknown');
            midiCi.setData(msgObj.muid,'/device/manufacturerId16',getManufacturer16bit(val).manufacturerId16 || 'Unknown');

            setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/manufacturerId", val);
            return val;
        }
    },
    'familyId': {
        title: 'Device Family Id',
        length: 2,
        type: 'array',
        path: '/device/familyId',
        outValue : (oOpts, midiCi) => {
            return midiCi.device.familyId;
        },
        inValue : (msgObj, midiCi, val) => {
            setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/familyId", val);
            return val;
        }
    },
    'modelId': {
        title: 'Device Model Id',
        length: 2,
        type: 'array',
        path: '/device/modelId',
        outValue : (oOpts, midiCi) => {
            return midiCi.device.modelId;
        },
        inValue : (msgObj, midiCi, val) => {
            setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/modelId", val);
            return val;
        }
    },
    'versionId': {
        title: 'Device Version Id',
        length: 4,
        type: 'array',
        path: '/device/versionId',
        outValue : (oOpts, midiCi) => {
            return midiCi.device.versionId;
        },
        inValue : (msgObj, midiCi, val) => {
            setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/versionId", val);
            return val;
        }
    },
    'ciSupport':{
        title: 'MIDI-CI Types Supported',
        length: 1,
        type: 'number',
        path:'/ciSupport',
        incomingErrorCheck : (val, msgObj) => {
            if((val & 16 ) && msgObj.sysex[5] < 0x02){
                msgObj.debug.addWarning("Process Inquiry not allowed on Message Format Version 0x01 Devices",0x00);
            }
        },
        debugValue : (dir, val,oOpts) => {
            const sup =[];
            if (val & 2) {
                sup.push('Protocol Negotiation');
            }

            if (val & 4) {
                sup.push('Profile Configuration');
            }

            if (val & 8) {
                sup.push('Property Exchange');
            }

            if (val & 16) {
                sup.push('Process Inquiry');
            }
            return sup.join(', ');
        }

    },
    'maxSysex':{
        title: 'Receivable Maximum SysEx Message Size',
        length: 4,
        type: 'number',
        path:'/maxSysex',
        incomingErrorCheck : (val, msgObj) => {
            if(val < 128){
                msgObj.debug.addError("Max SysEx is less than 128",0x00);
            }
            if(val < 512 && (msgObj.sysex[25] & 0b1100)){
                msgObj.debug.addError("Max SysEx is less than 512 where Property Exchange and Profiles exist.",0x00);
            }
        },
        // outValue : (oOpts, midiCi) => {
        // 	return global.configSetting.maxSysex
        // }
    },
    'targetMuid':{
        title: 'Target MUID',
        length: 4,
        type: 'number',
        assignoOptsForReply:true
    },
    outputPathId:{
        title: 'Output Path Id',
        length: 1,
        type: 'number',
        path:'/outputPathId',
        assignoOptsForReply:true
    },
    fbIdx:{
        title: 'Function Block Index',
        length: 1,
        type: 'number',
        path:'/fbIdx',
        assignoOptsForReply:true
    },
    productInstanceIdLength:{
        title: 'Number of bytes in Product Instance Id (pl)',
        length: 1,
        type: 'number',
        path:'/productInstanceIdLength',
        assignoOptsForReply:true,
        outValue : (oOpts,midiCi) => {
            return [].slice.call(t.strToUnicode(global.configSetting.productInstanceId)).length;
        },
    },
    productInstanceId:{
        title: 'Product Instance Id (pl)',
        type:'string',
        length: (dir,msgObj, midiCI,oOpts,streamObjVals) => {
            if(dir==='in'){
                return oOpts.productInstanceIdLength;
            }else{
                return 1;
            }
        },
        outValue : (oOpts, midiCi) => {
            return global.configSetting.productInstanceId;
        }
    },
    epStatus:{
        title: 'Endpoint Status',
        length: 1,
        type: 'number',
        assignoOptsForReply:true
    },
    'lenOfInfo':{
        title: 'Length of Information Data',
        length: 2,
        type: 'number',
        assignToStreamObjVals: true
    },
    informationData:{
        title: "Endpoint Information Data",
        type:'string',
        compactDebug: true,
        assignoOptsForReply:true
    },

    'authorityLevel':{
        title: 'Authority Level',
        length: 1,
        type: 'number',
        path:'/authorityLevel',
        // outValue : (oOpts, midiCi) => {
        // 	return midiCi.authorityLevel
        // },
        inValue : (msgObj, midiCi, val) => {
            const authorityType = (authorityLevels[val] ||{}).name || "Reserved";
            midiCi.setData(msgObj.muid,'/authorityType',authorityType);
            return val;
        },
        debugValue : (dir, val) => {
            return (authorityLevels[val] ||{}).name || "Reserved";
        }
    },
    'protocolCount':{
        title: 'Number of Supported Protocols (np)',
        length: 1,
        type: 'number',
        path:'/protocolCount',
        outValue : (oOpts, midiCi) => {
            return (oOpts.protocols || []).length;
        }
    },
    'protocolList':{
        title: 'Protocols',
        type: 'array',
        path:'/protocolList',
        length: (dir, msgObj, midiCi,oOpts) => {
            if(dir==='out'){
                return (oOpts.protocols || []).length * 5;
            }
            return 5*midiCi.getData(msgObj.muid,'/protocolCount');
        },
        debugValue : (dir, protocols,oOpts) => {
            if(dir==='out'){
                return oOpts.protocols.map(np=>np.name).join(', ');
            }
            return protocols.map(np=>{
                return "MIDI "+np.type
                    + ' ver.'+np.ver
                    + ((np.sExt)?' large packets supported':'')
                    + ((np.jr)?' with jitter reduction':'')
            }).join(', ');
        },
        inValue : (msgObj, midiCi, valSysex) => {
            let protocols=[];
            for(let i=0; i< valSysex.length;i+=5){
                protocols.push({
                    type : valSysex[ i],
                    ver : valSysex[1+ i] + 1,
                    jr: !!(valSysex[ 2 + i ] & 1),
                    sExt: !!(valSysex[ 2 + i ] & 2),
                    sysex: valSysex.slice( i, i+5)
                });
            }
            return protocols;
        },
        outValue : (oOpts, midiCi) => {
            let sysex = [];
            (oOpts.protocols || []).map(newProtocol=>{
                sysex.push(...newProtocol.sysex);
            });
            return sysex;
        },
    },
    protocol:{
        title: 'Protocol',
        length: 5,
        type: 'array',
        path:'/protocol',
        outValue : (oOpts) => {
            return oOpts.protocol.sysex;
        },
        debugValue : (dir, val,oOpts) => {
            return oOpts.protocol.name;
        },
        inValue : (msgObj, midiCi, valSysex,oOptsForReply,streamObjVals,offset) => {
            return processProtocols(msgObj, valSysex/5, offset);
        }
    },
    currentProtocol:{
        title: 'Current Protocol',
        length: 5,
        type: 'array',
        path:'/currentProtocol',
        outValue : (oOpts) => {
            return oOpts.currentProtocol.sysex;
        },
        debugValue : (dir, val,oOpts) => {
            if(dir==='out'){
                return oOpts.currentProtocol.name;
            }
            return "MIDI "+val.type
                + ' v.'+val.ver
                + ((val.sExt)?' large packets supported':'')
                + ((val.jr)?' with jitter reduction':'')
            //debugger;
        },
        inValue : (msgObj, midiCi, valSysex,oOptsForReply,streamObjVals,offset) => {
            return processProtocols(msgObj, 1, offset)[0];
        }
    },
    protocolNumbers:{
        title: "Test Data: string of 48 numbers in ascending order",
        length: 48,
        type: 'array',
        outValue : (oOpts) => {
            return Array.apply(null, {length: 48}).map(Number.call, Number);
        },
        // debugValue : (dir, val,oOpts) => {
        // 	return oOpts.protocol.name;
        // }
        /*let protocolVerified = true;
            for (let i = 0; i < 48; i++) {
                if (msgObj.sysex[offset + i] !== i) {
                    protocolVerified = false;
                }
            }
            if (protocolVerified) {
                msgObj.debug.addDebug(offset, 48, "Test Data: string of 48 numbers in ascending order", "0x00, 0x01, 0x02 ... 0x2E, 0x2F.", {compact: true});
            } else {
                msgObj.debug.addDebug(offset, 48, "Test Data: string of 48 numbers in ascending order has failed", "0x00, 0x01, 0x02 ... 0x2E, 0x2F.", {type: 'warn'});
                msgObj.debug.addError("Test Data: string of 48 numbers in ascending order has failed", "0x00, 0x01, 0x02 ... 0x2E, 0x2F.", 0x7D);
            }
            offset += 48;*/
    },

    'simultaneousPERequests':{
        title: 'Number of Simultaneous Requests Supported',
        length: 1,
        type: 'number',
        path:'/simultaneousPERequests',
        // outValue : (oOpts, midiCi) => {
        // 	return global.configSetting.simultaneousPERequests
        // },
        inValue : (msgObj, midiCi, val) => {
            if(!midiCi.remoteDevicesInternal[msgObj.muid].streamsOut){
                midiCi.remoteDevicesInternal[msgObj.muid].streamsOut = s.streamOut(val,
                    5, global.configSetting.sysexTimer);
            }
            if(!midiCi.remoteDevicesInternal[msgObj.muid].streamsIn){
                midiCi.remoteDevicesInternal[msgObj.muid].streamsIn = s.streamIn();
            }
            return val;
        },
        incomingErrorCheck : (val, msgObj) => {
            if(val === 0){
                msgObj.debug.addWarning("Streams cannot be set to 0",0x00);
            }
        },
    },
    'peVersion':{
        title: 'Property Exchange Version',
        length: 2,
        type: 'number',
        path:'/peVersion',
        assignoOptsForReply:true
    },
    'totalChunks':{
        title: 'Number of Chunks in Data Set',
        length: 2,
        type: 'number',
        assignToStreamObjVals: true
    },
    'currentChunk':{
        title: 'Number of This Chunk',
        length: 2,
        type: 'number',
        assignToStreamObjVals: true
    },
    'headerLength':{
        title: 'Header length',
        length: 2,
        type: 'number',
        assignToStreamObjVals: true,
        outValue : (oOpts, midiCi) => {
            return oOpts.payloadHeaderChunk.length
        },
    },
    header:{
        title: 'Header',
        type: 'array',
        length: (dir,msgObj, midiCI,oOpts,streamObjVals) => {
            if(dir==='in'){
                return streamObjVals.headerLength;
            }else{
                return oOpts.payloadHeaderChunk.length;
            }
        },
        outValue : (oOpts) => {
            return oOpts.payloadHeaderChunk;
        },
        assignToStreamObjVals:true,
        compactDebug: true,
        debugValue : (dir,val,oOpts,streamObjVals) => {
            let outString;

            outString = val.map(function (v) {
                return v < 127 ? String.fromCharCode(v) : '';
            }).join("");


            return outString;
        }
    },
    'propertyDataLength':{
        title: 'Property Data length',
        length: 2,
        type: 'number',
        assignToStreamObjVals: true,
        outValue : (oOpts, midiCi) => {
            return oOpts.payloadBodyChunk.length
        },
        incomingErrorCheck : (val, msgObj) => {
            if(val !== 0 && msgObj.sysex[4] === 0x37){
                msgObj.debug.addError("Reply to Set Property Data must have Property Data Length Set to 0",0x00);
            }
            if(val !== 0 && msgObj.sysex[4] === 0x3F){
                msgObj.debug.addError("Notify Message must have Property Data Length Set to 0",0x00);
            }
        },
    },
    propertyData:{
        title: 'Property Data',
        type: 'array',
        outValue : (oOpts) => {
            return oOpts.payloadBodyChunk;
        },
        assignToStreamObjVals:true,
        length: (dir,msgObj, midiCI,oOpts,streamObjVals) => {
            if(dir==='in'){
                return streamObjVals.propertyDataLength;
            }else{
                return oOpts.payloadBodyChunk.length;
            }
        },
        compactDebug: true,
        debugValue : (dir, val,oOpts) => {
            let outString;
            outString = val.map(function (v) {
                return v < 127 ? String.fromCharCode(v) : '';
            }).join("");

            return outString;
        },
    },
    'requestId':{
        title: 'Request Id',
        length: 1,
        type: 'number',
        assignToStreamObjVals: true
    },

    'profileDataLength':{
        title: 'Profile Data Length',
        length: 4,
        type: 'number',
        path: '/profileDataLength',
        assignoOptsForReply:true,
        outValue : (oOpts) => {
            let profileDataLength = 0;
            exports.profiles.map(rawPF=>{
                if(rawPF.bank===oOpts.profile.bank && rawPF.number===oOpts.profile.number){
                    //Great Found match
                    rawPF.profileSpecificData[oOpts.profileSpecificData].sysex.map(s=>{
                        profileDataLength += s.length;
                    });
                }
            });
            return profileDataLength;
        }
    },
    profile:{
        title: 'Profile',
        length: 5,
        type: 'array',
        outValue : (oOpts) => {
            if(oOpts.profile.sysex){
                return oOpts.profile.sysex;
            }else{
                return [0x7E, oOpts.profile.bank, oOpts.profile.number,
                    oOpts.profile.version || 0x01,
                    oOpts.profile.level
                ];
            }
        },
        assignoOptsForReply:true,
        inValue : (msgObj, midiCi, valSysex) => {
            const profileId = valSysex.join('_');
            let profile = {};

            if(msgObj.sysex[4] === 0x26){
                profile = midiCi.getData(msgObj.muid, '/profiles.js/' + profileId);
                if (!profile) {
                    profile = {sysex: valSysex};
                    midiCi.buildProfile(profile);
                    midiCi.setData(msgObj.muid, '/profiles.js/' + profileId, profile);
                    midiCi.setData(msgObj.muid, '/midi2Supp/pr_' + arrayToHex([profile.bank, profile.number], '_'), true);
                }

                midiCi.setData(msgObj.muid, `/profiles/${profileId}/sourceDestinations/${msgObj.group + '_' +msgObj.sourceDestination}/active`
                    , false);
            }

            if(msgObj.sysex[4] === 0x28 || msgObj.sysex[4] === 0x29){
                profile = midiCi.getData(msgObj.muid, '/profiles.js/' + profileId);
                if (!profile) {
                    profile = {sysex: valSysex};
                    midiCi.buildProfile(profile);
                    midiCi.setData(msgObj.muid, '/profiles.js/' + profileId, profile);
                    midiCi.setData(msgObj.muid, '/midi2Supp/pr_' + arrayToHex([profile.bank, profile.number], '_'), true);
                }
            }

            if(msgObj.sysex[4] === 0x27){
                midiCi.unsetData(msgObj.muid, `/profiles/${profileId}/sourceDestinations/${msgObj.group + '_' +msgObj.sourceDestination}`);

            }

            if (msgObj.sysex[4] >= 0x22 && msgObj.sysex[4] <= 0x25) {
                profile = midiCi.getData(msgObj.muid, '/profiles.js/' + profileId) || {};
                const isEnabled = (msgObj.sysex[4] === 0x24 || msgObj.sysex[4] === 0x22);

                midiCi.setData(msgObj.muid, `/profiles/${profileId}/sourceDestinations/${msgObj.group + '_' +msgObj.sourceDestination}/active`, isEnabled);

                if(msgObj.sourceDestination === 0x7F && profile.type!=='functionBlock'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Function Block (0x7F) is not of type Function Block Profile",0x00);
                }
                if(msgObj.sourceDestination === 0x7E && profile.type!=='group'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Group (0x7E) is not of type Group Profile",0x00);
                }
                if(msgObj.sourceDestination <= 15 && profile.type!=='singleChannel'  && profile.type!=='multiChannel'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Channel "
                        + (msgObj.sourceDestination+1)
                        +" is not of type Single or Multi Channel Profile",0x00);
                }
            }
            return profile;
        },
        debugValue : (dir, val,oOpts) => {
            return oOpts.profile.name;
        },
    },
    numberOfChannels: {
        title: 'Number Of Channels',
        length: 2,
        type: 'number',
        assignoOptsForReply:true,
        inValue : (msgObj, midiCi, val, oOptsForReply) => {
            if (msgObj.sysex[4] === 0x22 || msgObj.sysex[4] === 0x24){
                if(val !== 1 && oOptsForReply.profile.type==='singleChannel' ) {
                    msgObj.debug.addWarning("Number of Channels should be set to 1 ",0x00);
                }
                if(val === 0 && oOptsForReply.profile.type==='multiChannel' ) {
                    msgObj.debug.addError("Number of Channels must be set on Multi Channel Profiles",0x00);
                }
            }

            return val;
        }
    },
    profileSpecificData:{
        title: 'Profile Specific Data',
        length: (dir, msgObj, midiCi) => {
            return midiCi.getData(msgObj.muid,'/profileDataLength');
        },
        type: 'array',
        outValue : (oOpts) => {
            return [];
        },
        debugValue : (dir, val,oOpts) => {
            return "?";
        },
    },
    'inquiryTarget':{
        title: 'Inquiry Target Id',
        length: 1,
        type: 'number',
        assignToStreamObjVals: true,
        assignoOptsForReply:true
    },
    targetDataLength:{
        title: 'Profile Target Data Length',
        length: 2,
        type: 'number',
    },
    'targetData':{
        title: 'Profile Target Data',
        assignToStreamObjVals: true,
        type: 'array',
        inValue : (msgObj, midiCi, valSysex,oOptsForReply) => {
            let data = valSysex;
            exports.profiles.map(function(profile) {
                if (profile.number !== oOptsForReply.profile.number || profile.bank !== oOptsForReply.profile.bank) return;

                if(profile.profileDetailsReplyProcess){
                    data = profile.profileDetailsReplyProcess(msgObj, midiCi, valSysex,oOptsForReply);

                    midiCi.setData(msgObj.muid, `/profiles/${oOptsForReply.profile.sysex.join('_')}/sourceDestinations/${msgObj.group + '_' +msgObj.sourceDestination}/detailsInquiry/${oOptsForReply.inquiryTarget}`, data);
                }
            });
            return data;
        },
        debugValue : (dir, val,oOpts,midiCI) => {
            return oOpts.dataDebug || "";
        },
    },
    'enabledProfileCount':{
        title: 'Number of Currently-Enabled Profiles (cep)',
        length: 2,
        type: 'number',
        assignoOptsForReply:true,
        outValue : (oOpts) => {
            return (oOpts.enabledProfiles||[]).length;
        },

    },
    'enabledProfileList':{
        title: 'Enabled Profiles',
        type: 'array',
        //path:'/protocolList',
        assignoOptsForReply:true,
        length: (dir, msgObj, midiCi,oOpts,streamObjVals) => {
            if(dir==="in"){
                return 5 * oOpts.enabledProfileCount;
            }
            return 5* (oOpts.enabledProfiles||[]).length;
        },
        debugValue : (dir, val,oOpts,midiCI) => {
            return (oOpts.enabledProfiles||[]).map(p=>{
                return p.name
            }).join(', ');
        },
        inValue : (msgObj, midiCi, valSysex,oOptsForReply) => {
            let profiles=[];
            for (let i = 0; i < oOptsForReply.enabledProfileCount; i++) {
                const profSysex = valSysex.slice(i*5,(i*5) + 5);
                if (!profSysex.length) {
                    continue;
                }
                const profileId = profSysex.join('_');

                let profile = midiCi.getData(msgObj.muid, '/profiles.js/' + profileId);
                if (!profile) {
                    profile = {sysex: profSysex};
                    midiCi.buildProfile(profile);
                    midiCi.setData(msgObj.muid, '/profiles.js/' + profileId, profile);

                    midiCi.setData(msgObj.muid, '/midi2Supp/pr_' + arrayToHex([profile.bank, profile.number], '_'), true);
                    setRemoteEndpointValueFromMUID(msgObj.muid,
                        '/remoteEndpoint/midi2Supp/pr_' + arrayToHex([profile.bank, profile.number], '_'),
                        true);

                    setRemoteEndpointValueFromMUID(msgObj.muid,
                        '/remoteEndpoint/midi2Supp/pr_' + arrayToHex([profile.bank, profile.number], '_')+'_lvl',
                        profile.level);

                }

                midiCi.setData(msgObj.muid, `/profiles/${profileId}/sourceDestinations/${msgObj.group + '_' +msgObj.sourceDestination}/active`, true);

                if(msgObj.sourceDestination === 0x7F && profile.type!=='functionBlock'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Function Block (0x7F) is not of type Function Block Profile",0x00);
                }
                if(msgObj.sourceDestination === 0x7E && profile.type!=='group'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Group (0x7E) is not of type Group Profile",0x00);
                }
                if(msgObj.sourceDestination <= 15 && profile.type!=='singleChannel'  && profile.type!=='multiChannel'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Channel "
                        + (msgObj.sourceDestination+1)
                        +" is not of type Single or Multi Channel Profile",0x00);
                }
                profiles.push(profile);
            }
            let mmaProf = midiCi.getData(msgObj.muid, '/interoperability/pf1.1') || '';
            let manuProf = midiCi.getData(msgObj.muid, '/interoperability/pf1.3') || '';
            Object.keys(profiles).map(pId => {
                const out = midiCi.buildOut(profiles[pId], mmaProf, manuProf);
                mmaProf = out.mmaProf;
                manuProf = out.manuProf;
            });
            //profiles.js.disabled.map(pf=>{buildOut(pf,mmaProf,manuProf);});
            midiCi.setData(msgObj.muid, '/interoperability/pf1.1', mmaProf, true);
            midiCi.setData(msgObj.muid, '/interoperability/pf1.3', manuProf, true);
            return profiles;
        },
        outValue : (oOpts, midiCi) => {
            let sysex = [];
            (oOpts.enabledProfiles||[]).map(p=> {
                sysex.push(...p);
            });
            return sysex;
        }
    },
    'disabledProfileCount':{
        title: 'Number of Currently-Disabled Profiles (cdp)',
        length: 2,
        type: 'number',
        assignoOptsForReply:true,
        outValue : (oOpts) => {
            return (oOpts.disabledProfiles||[]).length;
        }
    },
    'disabledProfileList':{
        title: 'Disabled Profiles',
        type: 'array',
        assignoOptsForReply:true,
        length: (dir, msgObj, midiCi,oOpts) => {
            if(dir==="in"){
                return 5 * oOpts.disabledProfileCount;
            }
            return 5*(oOpts.disabledProfiles||[]).length;
        },
        debugValue : (dir, val,oOpts,midiCi) => {
            return (val||[]).map(pf=>{
                return pf.name
            }).join(', ');
        },
        inValue : (msgObj, midiCi, valSysex,oOptsForReply) => {
            let profiles=[];
            for (let i = 0; i < oOptsForReply.disabledProfileCount; i++) {
                const profSysex = valSysex.slice(i*5,(i*5) + 5);
                if (!profSysex.length) {
                    continue;
                }
                const profileId = profSysex.join('_');

                let profile = midiCi.getData(msgObj.muid, '/profiles.js/' + profileId);
                if (!profile) {
                    profile = {sysex: profSysex};
                    midiCi.buildProfile(profile);
                    midiCi.setData(msgObj.muid, '/profiles.js/' + profileId, profile);
                    midiCi.setData(msgObj.muid, '/midi2Supp/pr_' + arrayToHex([profile.bank, profile.number], '_'), true);
                    setRemoteEndpointValueFromMUID(msgObj.muid,
                        '/remoteEndpoint/midi2Supp/pr_' + arrayToHex([profile.bank, profile.number], '_'),
                        true);
                    setRemoteEndpointValueFromMUID(msgObj.muid,
                        '/remoteEndpoint/midi2Supp/pr_' + arrayToHex([profile.bank, profile.number], '_')+'_lvl',
                        profile.level);
                }

                midiCi.setData(msgObj.muid, `/profiles/${profileId}/sourceDestinations/${msgObj.group + '_' +msgObj.sourceDestination}/active`
                    , false);


                if(msgObj.sourceDestination === 0x7F && profile.type!=='functionBlock'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Function Block (0x7F) is not of type Function Block Profile",0x00);
                }
                if(msgObj.sourceDestination === 0x7E && profile.type!=='group'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Group (0x7E) is not of type Group Profile",0x00);
                }
                if(msgObj.sourceDestination <= 15 && profile.type!=='singleChannel'  && profile.type!=='multiChannel'){
                    msgObj.debug.addWarning("Profile \""+ profile.name +"\" reported on Channel "
                        + (msgObj.sourceDestination+1)
                        +" is not of type Single or Multi Channel Profile",0x00);
                }
                profiles.push(profile);
            }
            //let profiles.js = this.getData(msgObj.muid, '/profiles.js');
            let mmaProf = midiCi.getData(msgObj.muid, '/interoperability/pf1.1') || '';
            let manuProf = midiCi.getData(msgObj.muid, '/interoperability/pf1.3') || '';
            Object.keys(profiles).map(pId => {
                const out = midiCi.buildOut(profiles[pId], mmaProf, manuProf);
                mmaProf = out.mmaProf;
                manuProf = out.manuProf;
            });
            //profiles.js.disabled.map(pf=>{buildOut(pf,mmaProf,manuProf);});
            midiCi.setData(msgObj.muid, '/interoperability/pf1.1', mmaProf, true);
            midiCi.setData(msgObj.muid, '/interoperability/pf1.3', manuProf, true);
            return profiles;
        },
        outValue : (oOpts, midiCi) => {
            let sysex = [];
            (oOpts.disabledProfiles||[]).map(p=> {
                sysex.push(...p);
            });
            return sysex;
        },
    },

    'messageDataControl':{
        title: 'Message Data Control',
        length: 1,
        type: 'number',
        assignoOptsForReply:true
    },
    'chanContTypeBitmap':{
        title: 'Bitmap of requested Channel Controller Message Types',
        length: 1,
        type: 'number',
        assignoOptsForReply:true
    },
    'noteDataTypeBitmap':{
        title: "Bitmap of requested Note Data Message Types",
        length: 1,
        type: 'number',
        assignoOptsForReply:true
    },
    'systemTypesBitmap':{
        title: "Bitmap of requested System Message Types",
        length: 2,
        type: 'number',
        assignoOptsForReply:true,
        inValue : (msgObj, midiCi, val) => {
            return val >> 7;
        }
    },
    'processInquiryBitmap':{
        title: "Process Inquiry Bitmap",
        type: 'number',
        length: 1,
        // assignoOptsForReply: true,
        path: '/processInquiryBitmap' ,
        outValue : (oOpts, midiCi) => {
            return sysex;
        },
        inValue : (msgObj, midiCi, val) => {
            if(val & 1){
                midiCi.setData(msgObj.muid,'/processInquiryMIDIReport',true);
            }
            // if(val & 2){
            //     midiCi.setData(msgObj.muid,'/processInquirySysExSupport',true);
            // }
            return val;
        }
    },
    'originalSubId':{
        title: "Original SubId #2",
        length: 1,
        type: 'number',
        assignoOptsForReply:true,
    },
    'statusCode':{
        title: "Status Code",
        length: 1,
        type: 'number',
        assignoOptsForReply:true,
    },
    'statusData':{
        title: "Status Code Data",
        length: 1,
        type: 'number',
        assignoOptsForReply:true,
    },
    'ackNakDetails':{
        title: "ACK/NAK Details",
        length: 5,
        type: 'array',
        assignoOptsForReply:true,
        outValue : (oOpts, midiCi) => {
            return oOpts.ackNakDetails || [0,0,0,0,0];
        }
    },
    'messageLength':{
        title: "Message Length",
        length: 2,
        type: 'number',
        assignoOptsForReply:true,
        outValue : (oOpts, midiCi) => {
            return [].slice.call(oOpts.ackNakMessage||"").length;
        }
    },
    ackNakMessage:{
        title: "ACK/NAK Message",
        type:'string',
        compactDebug: true
    }

};



function processProtocols(msgObj,numberOfProtocols,offset){
    let protocols=[];

    for(let i=0; i< numberOfProtocols;i++){

        if(offset + (i*5)+2 > msgObj.sysex.length){
            msgObj.debug.addError("SysEx Size Doesn't match number of Protocols",0x21);
            break;
        }

        const np = {
            type : msgObj.sysex[offset + (i*5)],
            ver : msgObj.sysex[offset + 1+ (i*5)] + 1,
            jr: !!(msgObj.sysex[offset + 2 + (i * 5)] & 1),
            sExt: !!(msgObj.sysex[offset + 2 + (i * 5)] & 2),
            sysex: msgObj.sysex.slice(offset + (i*5),offset + (i*5)+5)
        };


        protocols.push(np);

        msgObj.debug.addDebug(offset+ (i*5),5,"Protocol"
            ,"MIDI "+np.type
            + ' v.'+np.ver
            + (np.sExt)?' large packets supported':''
            + (np.jr)?' with jitter reduction':''
        );

        //offset+=5;
    }
    return protocols;
}