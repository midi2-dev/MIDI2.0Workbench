/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

const d = require('./debugger.js');
const s = require('./streams.js');
const t = require('./translations.js');
const midi2Tables = require('./midiCITables.js');
const {JsonPointer: ptr } = require('json-ptr');
const fs = require('fs');
const events = require('events');
const http = require("http");
const path = require("path");
const pako = require('pako');
const AjvD4 = require('ajv-draft-04');
const Ajv = require('ajv');
const draft6MetaSchema = require("ajv/dist/refs/json-schema-draft-06.json");

const {getRandomInt, setRemoteEndpointValueFromMUID} = require("./utils");
const {getManufacturer16bit} = require("./manufactuers");
const {ciParts} = require("./ciParts");

class midici {
	constructor(opts) {
		this.ciEventHandler = opts.ciEventHandler;
		//this.sendOutSysEx = opts.sendOutSysEx;
		this.midiOutFunc = opts.midiOutFunc;
		this.configSetting = opts.configSetting || global.configSetting;
		this.debug=false;
		this.discoveryTimer=0;
		this.device = {};
		this.ciVer = 0x02;
		this.authorityLevel = 0x30;
		this.midiReportModeMUID = null;
		this.cbResponses={};
		this.cbTimeoutResponses={};
		this.events = {};
		this._saveTimeOut=0;
		this._muid = null;
		this.ev = new events.EventEmitter();

		this.remoteDevices={};
		this.remoteDevicesInternal={};
	}

	setData(remoteMuid, path, value){
		if(this.getData(remoteMuid,path)===value || !this.remoteDevices[remoteMuid]){
			return;
		}

		ptr.set(this.remoteDevices[remoteMuid],path, value, true);
		this._updateSettings(remoteMuid);
	}

	unsetData(remoteMuid, path, value){
		if(this.getData(remoteMuid,path)===value || !this.remoteDevices[remoteMuid]){
			return;
		}

		ptr.unset(this.remoteDevices[remoteMuid],path);
		this._updateSettings(remoteMuid);
	}

	getData(remoteMuid, path){
		return ptr.get(this.remoteDevices[remoteMuid],path);
	}

	createMIDICIMsg(sourceMUID, subId, sourceDestination, destMuid, oOpts = {}){
		if(!midi2Tables.ciTypes[subId] ){
			return;
		}

		if(sourceMUID === null){
			sourceMUID = this._muid;
		}

		if(!sourceMUID){
			debugger;
		}

		let newResponse = {
			debug: d.new(`Send ${midi2Tables.ciTypes[subId].title} for `
				+ (sourceDestination === 0x7F?' the Function Block':sourceDestination === 0x7E?` the Group ${oOpts.group+1}`:` the channel ${sourceDestination+1}`))
			,sysex: []
			,sourceMUID
			,group: oOpts.group || 0
		};

		let sysex = [0xF0,0x7E,sourceDestination,0x0D,subId,this.ciVer]
			.concat(t.getBytesFromNumbers(sourceMUID,4))
			.concat(t.getBytesFromNumbers(destMuid,4));

		const ciType= midi2Tables.ciTypes[subId] || '';

		newResponse.debug.addDebug(0,1,"System Exclusive Start");
		newResponse.debug.addDebug(1,1,"Universal System Exclusive");
		if(sourceDestination === 0x7F){
			newResponse.debug.addDebug(2,1,"To/From whole MIDI Port");
		}else{
			newResponse.debug.addDebug(2,1,"To/From Channel ",sourceDestination+1);
			if(!ciType.srcDestChannel){
				newResponse.debug.addError("Source Destination shall be set to 0x7F for this message",0x03);
			}
		}

		newResponse.debug.addDebug(3,1,"Universal System Exclusive Sub ID #1","MIDI-CI");
		newResponse.debug.addDebug(4,1,"Universal System Exclusive Sub ID #2",ciType.title);
		newResponse.debug.addDebug(5,1,"MIDI-CI Message Version/Format",this.ciVer);
		newResponse.debug.addDebug(6,4,"Src. MUID (MIDI Unique Identifier)",sourceMUID);
		newResponse.debug.addDebug(10,4,"Dest. MUID (MIDI Unique Identifier)",destMuid);


		newResponse.sysex =  sysex;

		if(oOpts.cb){
			let srcdestID = sourceDestination+'_'+midi2Tables.ciTypes[subId].reply;
			if(oOpts.requestId){
				srcdestID += '_'+oOpts.requestId;
			}
			if(!this.cbResponses[destMuid])this.cbResponses[destMuid]={};
			//if(!this.cbResponses[destMuid][srcdestID])this.cbResponses[destMuid][srcdestID]={};
			this.cbResponses[destMuid][srcdestID] = oOpts.cb;
		}

		if(oOpts.cbTimeout){
			let srcdestID = sourceDestination+'_'+midi2Tables.ciTypes[subId].reply;
			if(oOpts.requestId){
				srcdestID += '_'+oOpts.requestId;
			}
			newResponse.cbTimeoutActive = true;
			newResponse.destMuid = destMuid;
			newResponse.srcdestID = srcdestID;
			newResponse.cbTimeout = oOpts.cbTimeout;
		}

		if(ciType.header) {
			//let profileDataLength = 0;
			for (let v = 0; v < this.ciVer; v++) {
				if(!ciType.header[v])continue;
				for (let i = 0; i < ciType.header[v].length; i++) {
					let offset = newResponse.sysex.length;
					const part = ciParts[ciType.header[v][i]];
					if(part){
						let val = oOpts[ciType.header[v][i]];
						let offsetLength = part.length;
						if(typeof offsetLength === 'function'){
							offsetLength = part.length('out',newResponse, this,oOpts);
						}

						if(offsetLength===0){
							continue;
						}

						if(part.outValue){
							val = part.outValue(oOpts, this);
						}

						if(val===undefined || val===null){
							debugger;
						}

						if(part.type === 'string'){
							const sysval = [].slice.call(t.strToUnicode(val||"")).map(v=>v.charCodeAt(0));
							newResponse.sysex.push(...sysval);
							offsetLength = sysval.length;
						}else if(part.type === 'array'){
							newResponse.sysex.push(...val);
							offsetLength = val.length;
						}else{
							newResponse.sysex.push(...t.getBytesFromNumbers(val, offsetLength));
						}

						let debugText = val;
						if(Array.isArray(val) || part.type === 'hex'){
							if(!Array.isArray(debugText)){
								debugText = [debugText];
							}
							debugText = d.arrayToHex([...debugText])
						}
						if(part.debugValue){
							debugText = part.debugValue('out', val,oOpts,part);
						}
						newResponse.debug.addDebug(offset, offsetLength, part.title, debugText, {compact : part.compactDebug});
						offset += offsetLength;

						continue;
					}


					debugger; //Should not hit this obviously

				}
			}
		}
		return newResponse;
	}

	completeMIDICIMsg(newCIMsgObj,umpDev){
		if(!global.umpDevices || !global.umpDevices[umpDev] || !newCIMsgObj){
			return;
		}
		newCIMsgObj.sysex.push(0xF7);
		newCIMsgObj.debug.addDebug(newCIMsgObj.sysex.length-1,1,"End Universal System Exclusive");

		newCIMsgObj.debug.setSysex(newCIMsgObj.sysex);


		if(this.debug){
			d.msg("sysex",newCIMsgObj.debug.getDebug(),'out',umpDev,newCIMsgObj.group,newCIMsgObj.debug.getErrors());
		}
		this.midiOutFunc(umpDev,t.midi10ToUMP(newCIMsgObj.group, newCIMsgObj.sysex));

		if(newCIMsgObj.cbTimeoutActive){
			if(!this.cbTimeoutResponses[newCIMsgObj.destMuid])this.cbTimeoutResponses[newCIMsgObj.destMuid]={};
			this.cbTimeoutResponses[newCIMsgObj.destMuid][newCIMsgObj.srcdestID] = setTimeout((cbTimeout)=>{
				cbTimeout();
			},3000, newCIMsgObj.cbTimeout);
		}


		// if(ciType.followup){
		// 	setTimeout((newCIMsgObjSent,ciTypeSent)=>{
		// 		let muid = t.getNumberFromBytes(newCIMsgObjSent.sysex,10,4);//newResponse.sysex.slice(6, 10);
		// 		let sourceDestination = newCIMsgObjSent.sysex[2];
		// 		let newCIMsgObjFollow = this.createMIDICIMsg(this.remoteDevicesInternal[muid]._out._muid, ciTypeSent.followup,sourceDestination, muid, {group:newCIMsgObjSent.group});
		// 		this.completeMIDICIMsg(newCIMsgObjFollow);
		// 	},100,newCIMsgObj,ciType);
		// }
	}

	loadMUID(remoteMuid, homedir,cb){
		this.setData(remoteMuid,'/midi1Packet',true);
		this.setData(remoteMuid,'/umpPacket',false);

		this.findMatchingFile(remoteMuid,homedir,()=>{
			cb();
			this.protocolNegotiationStart(remoteMuid,()=> {
				setTimeout(()=>{
					this.peCapabilityStart(remoteMuid, () => {
						setTimeout(()=>{
							this.piCapabilityStart(remoteMuid, () => {
								setTimeout(()=>{
									this.profileInquiryStart(remoteMuid, () => {
										if(this.remoteDevicesInternal[remoteMuid].peCapabilityComplete){
											this.getResourceList(remoteMuid);
										}
									});
								},200);
							});
						},200);
					});
				},200);


			});
		});
	}
//************************************
	sendDiscovery(umpDev, group = 0, ciSupport = 0){
		this.discoveryTimer = process.hrtime();
		this.discoveryList=[];

		this.ciSupport = ciSupport; //0b1100;
		// if (!this.configSetting.skipProtocol){
		// 	ciSupport +=2;
		// }
		// if (this.configSetting.ciVerLocal > 1){
		// 	ciSupport +=16;
		// }
		if(!this._muid){
			this._muid = getRandomInt(0xFFFFF00);
		}
		const newResponse = this.createMIDICIMsg(this._muid,0x70,0x7F, 0xFFFFFFF,
			{
				group,
				maxSysex: this.configSetting.maxSysex,
				outputPathId: Object.keys(global.umpDevices).indexOf(umpDev),
				ciSupport
			});
		this.completeMIDICIMsg(newResponse,umpDev);
	}

	sendInvalidate(remoteMuid,group=0){
		if (!this.remoteDevicesInternal[remoteMuid])return;

		const newResponse = this.createMIDICIMsg(this._muid, 0x7E,0x7F, 0xFFFFFFF,{
			targetMuid: remoteMuid, group:group
		});
		this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);
		delete this.remoteDevices[remoteMuid];
		delete this.remoteDevicesInternal[remoteMuid];
	}

	getEndpointInformation(remoteMuid, epStatus, cbComplete = function(){} ) {

		let newResponse = this.createMIDICIMsg(this._muid, 0x72, 0x7F, remoteMuid, {
			group: this.remoteDevicesInternal[remoteMuid].group,
			epStatus,
			cb: cbComplete
		});
		this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);

	}


	invalidateSelf(){
		Object.keys(this.remoteDevicesInternal).map(remoteMuid=>{
			const rmMIDICI = this.remoteDevicesInternal[remoteMuid];
			const newResponse = this.createMIDICIMsg(0xFFFFFFF, 0x7E,0x7F, 0xFFFFFFF,{
				targetMuid: this._muid, group:rmMIDICI.group
			});
			this.completeMIDICIMsg(newResponse, rmMIDICI.umpDev);
			delete this.remoteDevices[remoteMuid];
			delete this.remoteDevicesInternal[remoteMuid];
		});
		this._muid = null;
	}

	sendNAK(msgObj, remoteMuid,sourceDestination, oOpts, group=0){
		if (!this.remoteDevicesInternal[remoteMuid])return;
		if (oOpts.originalSubId === 0x7F)return; //Don't send a NAK from a NAK

		oOpts.group=group;
		let newResponse = this.createMIDICIMsg(this._muid, oOpts.isAck?0x7D:0x7F, sourceDestination, remoteMuid,oOpts);
		this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);

		//TODO send Timeout Wait Notify PE
		//TODO send Terminate Notify PE

	}

//************************************

	processUMP(ump){
		if(this.midiReportModeMUID){
			this.ev.emit('MIDIReportMessage',ump);
		}
	}

	processCI(msgObj, group, umpDev){

		const ciType = midi2Tables.ciTypes[msgObj.sysex[4]] || {};
		msgObj.sourceDestination = msgObj.sysex[2];

		if(!midi2Tables.ciTypes[msgObj.sysex[4]] ){
			msgObj.debug.setTitle('Received unknown CI Type for '
				+ (msgObj.sourceDestination === 0x7F ? ' the Function Block' : msgObj.sourceDestination === 0x7E?` the Group ${group+1}` : ' the channel ' + (msgObj.sourceDestination + 1))
			);
			msgObj.debug.addError("Received unknown CI Type" + d.arrayToHex([msgObj.sysex[4]]),0x00);
		}else{
			msgObj.debug.setTitle(`Received ${ciType.title} for `
				+ (msgObj.sourceDestination === 0x7F ? ' the Function Block' : msgObj.sourceDestination === 0x7E?` the Group ${group+1}` : ' the channel ' + (msgObj.sourceDestination + 1)));
		}


		if(msgObj.sysex.length > this.configSetting.maxSysex){
			msgObj.debug.addError(
				`Received SysEx length of ${msgObj.sysex.length} is greater than allowed length of ${this.configSetting.maxSysex}`,
				0x21);
		}

		msgObj.ciType = ciType.title;
		msgObj.ciVer = msgObj.sysex[5];

		msgObj.debug.addDebug(0, 1, "System Exclusive Start");
		msgObj.debug.addDebug(1, 1, "Universal System Exclusive");

		if (msgObj.sysex[2] > 0x0F && msgObj.sysex[2] < 0x7E) {
			msgObj.debug.addDebug(2, 1, "Source/Destination has incorrect value", msgObj.sysex[2], {type: "error"});
			msgObj.debug.addError("Source/Destination has incorrect value" + d.arrayToHex([msgObj.sysex[2]]),0x03);
		} else {
			if (msgObj.sysex[2] === 0x7F) {
				msgObj.debug.addDebug(2, 1, "To/From whole MIDI Port");
			} else {
				if(!ciType.srcDestChannel){
					msgObj.debug.addError("Source Destination shall be set to 0x7F for this message",0x03);
				}
				msgObj.debug.addDebug(2, 1, "To/From Channel ", msgObj.sysex[2] + 1);
			}

		}

		msgObj.debug.addDebug(3, 1, "Universal System Exclusive Sub ID #1", "MIDI-CI");
		msgObj.debug.addDebug(4, 1, "Universal System Exclusive Sub ID #2", ciType.title);

		//check the MIDI CI version
		if (msgObj.sysex[5] === 0x00) {
			msgObj.debug.addError("MIDI CI version 0x00 is deprecated : " + d.arrayToHex([msgObj.sysex[5]]), 0x02);
		} else if (msgObj.sysex[5] > 0x02) {
			msgObj.debug.addWarning( "MIDI CI version is not supported: " + d.arrayToHex([msgObj.sysex[5]]), 0x02);
		} else {
			msgObj.debug.addDebug(5, 1, "MIDI-CI Message Version/Format", msgObj.sysex[5]);
		}

		if(msgObj.sysex[5] < ciType.addedFrom){
			msgObj.debug.addError("MIDI CI Message is not available for this version", 0x02);
		}
		if(msgObj.sysex[5] >= ciType.deprecatedFrom ){
			msgObj.debug.addWarning("MIDI CI Message is deprecated for this version", 0x02);
		}

		const remotemuid = t.getNumberFromBytes(msgObj.sysex,6,4);//msgObj.sysex.slice(6, 10);
		const destmuid =  t.getNumberFromBytes(msgObj.sysex,10,4);//msgObj.sysex.slice(10, 14);

		msgObj.debug.addDebug(6,4,"Src. MUID (MIDI Unique Identifier)",remotemuid);
		msgObj.debug.addDebug(10,4,"Dest. MUID (MIDI Unique Identifier)",destmuid);

		if(remotemuid===0xFFFFFFF){
			msgObj.debug.addWarning("Src. MUID should not be the Broadcast MUID" , 0x00);
		}

		if(
			(remotemuid===0xFFFFFFF || destmuid===0xFFFFFFF)
			&& msgObj.sysex[4] === 0x71){
			msgObj.debug.addError("Discovery Reply cannot be the Broadcast MUID" , 0x00);
		}
		//Is this an Invalid MUID Message?
		if(destmuid===0xFFFFFFF && msgObj.sysex[4] === 0x7E){
			const targetMuid =  t.getNumberFromBytes(msgObj.sysex,14,4);
			msgObj.debug.addDebug(14,4,"Target. MUID (MIDI Unique Identifier)");
			if(targetMuid===this._muid){
				//Our MUID has had a collision - We need to change and send out a new discovery message!
				this._muid = null;
				this._exclusiveEndCheck(msgObj,18);
				if(this.debug)d.msg("sysex",msgObj.debug.getDebug(),'in',umpDev.name,group,msgObj.debug.getErrors());
				this.ciEventHandler(umpDev, group, 'InvalidRemoteID',targetMuid);
				if(this.remoteDevices[targetMuid]){
					delete this.remoteDevices[targetMuid];
					delete this.remoteDevicesInternal[targetMuid];
				}
				return;
			}
			if(this.remoteDevices[targetMuid]){
				//h.sendOutSysexDebug(msgObj);
				if(this.debug)d.msg("sysex",msgObj.debug.getDebug(),'in',umpDev,group,msgObj.debug.getErrors());
				//this.events.InvalidRemoteID(targetMuid);
				this.ciEventHandler(umpDev, group, 'InvalidRemoteID',targetMuid);
				delete this.remoteDevices[targetMuid];
				delete this.remoteDevicesInternal[targetMuid];
			}
			return;
		}

		if(destmuid!==this._muid && destmuid!==0xFFFFFFF ){
			//not for me
			return;
		}

		//TODO This needs more work
		if(msgObj.sysex[4]===0x71){ //Discovery Reply
			if(process.hrtime() - this.discoveryTimer < 200000 && this.discoveryList.indexOf(remotemuid)!==-1){
				debugger;
				//Send Invalidate MUID

				return;
			}else{
				this.discoveryList.push(remotemuid);
			}
		}

		if(destmuid===0xFFFFFFF){
			msgObj.multicast = true;
		}

		msgObj.muid = remotemuid;

		if(!this.remoteDevices[msgObj.muid]){
			this.remoteDevices[msgObj.muid]={};
			this.remoteDevicesInternal[msgObj.muid]={
				cache:{},
				peSubscriptions:{},
				group: msgObj.group,
				umpDev,
				ciVer: msgObj.sysex[5]
			};

			this.setData(msgObj.muid,'/midiCIEnabled',true);
		}

		// if(!this.remoteDevicesInternal[msgObj.muid]._out){
		// 	msgObj.debug.addWarning("No Out Port found", 0x00);
		// }

		if(this.remoteDevicesInternal[msgObj.muid].ciVer !== msgObj.sysex[5]){
			msgObj.debug.addError("MIDI-CI Message Format Version has Changed", 0x00);
		}

		msgObj.dest = this._muid;
		//msgObj.dest = this.remoteDevicesInternal[msgObj.muid]._out._muid;

		let offset = 14;
		let doRecvEvent = true;
		const oOptsForReply={};
		const streamObjVals={};
		//let createdCIResponse = false;
		let endCheckDone = false;
		if(ciType.header){
			let lastNumVal=0;
			let lastPart=null;
			for (let v = 0; v < msgObj.ciVer; v++) {
				if (!ciType.header[v]) continue;
				for (let i = 0; i < ciType.header[v].length; i++) {
					const part = ciParts[ciType.header[v][i]];
					if (msgObj.sysex[offset] === 0xF7) {
						//Reach the end of the sent messages
							if(!lastPart || (!lastPart.assignToStreamObjVals && !lastPart.assignoOptsForReply)) {
							msgObj.debug.addWarning("End of Message reached before it should. Missing " + part.title, 0x00);
						}
						this._exclusiveEndCheck(msgObj, offset);
						endCheckDone = true;
						break; //exit the for loop
					}


					if (part) {
						let valPart;
						let offsetLength = part.length;
						if(part.length === undefined){
							offsetLength = lastNumVal;
						}
						if (typeof offsetLength === 'function') {
							offsetLength = part.length('in',msgObj, this,oOptsForReply,streamObjVals);
						}
						if(part.type === 'string'){
							if (offsetLength) {
								lastNumVal = offsetLength;
							}
							valPart = t.unicodeToChar(msgObj.sysex.slice(offset, offset + lastNumVal).map(v=>String.fromCharCode(v)).join(''));
							offsetLength = lastNumVal;
						}else if (part.type === 'array') {
							if (offsetLength) {
								lastNumVal = offsetLength;
							}
							valPart = msgObj.sysex.slice(offset, offset + lastNumVal);
							offsetLength = lastNumVal;
						} else {
							valPart = t.getNumberFromBytes(msgObj.sysex, offset, offsetLength);
							lastNumVal = valPart;
						}

						if(offsetLength===0){
							continue;
						}

						if (part.inValue) {
							valPart = part.inValue(msgObj, this, valPart, oOptsForReply,streamObjVals,offset);
						}

						if (part.assignToStreamObjVals) {
							streamObjVals[ciType.header[v][i]] = valPart;
						}
						if (part.assignoOptsForReply) {
							oOptsForReply[ciType.header[v][i]] = valPart;
						}

						if (part.path) {
							this.setData(msgObj.muid, part.path, valPart, oOptsForReply);
						}

						if (part.incomingErrorCheck) {
							part.incomingErrorCheck(valPart, msgObj);
						}

						let debugText = valPart;
						if (Array.isArray(valPart) || part.type === 'hex') {
							if (!Array.isArray(valPart)) {
								valPart = [valPart];
							}
							debugText = d.arrayToHex(valPart);
						}
						if (part.debugValue) {
							debugText = part.debugValue('in',valPart, oOptsForReply,streamObjVals);
						}
						msgObj.debug.addDebug(offset, offsetLength, part.title, debugText, {compact: part.compactDebug});
						offset += offsetLength;

						lastPart=part;

						continue;
					}


					msgObj.debug.addWarning("Internal CI Field Missing", 0x00);

				}
			}
		}


		if(msgObj.sysex[4]===0x70 || msgObj.sysex[4]===0x71) { //Discovery Reply
			if(remotemuid === this._muid)return;
			//This is a loopback ignore
		}

		if(msgObj.sysex[offset]!==0xF7){
			msgObj.debug.addWarning("End of SysEx is wrong", 0x21);
		}else if(!endCheckDone){
			//Reach the end of the sent messages
			this._exclusiveEndCheck(msgObj,offset);
		}

		switch (ciType.recvEvent.name) {
			case 'setProtocol':
			case 'protocolNegotiation': {
				if (!(this.ciSupport & 0b10)) {
					msgObj.debug.addError("Do not send "+
						ciType.title
						+" - not supported on this endpoint.", 0x00);
				}
				break;
			}
			case 'profileInquiry':
			case 'profileDetailsInquiry':
			case 'profileOn':
			case 'profileOff':{
				if (!(this.ciSupport & 0b100)) {
					msgObj.debug.addError("Do not send "+
						ciType.title
						+" - Workbench does not support being a Responder to Profile MIDI-CI messages. Workbench has informed the Initiator in Discovery that this is not supported.", 0x00);
				}
				break;
			}

			case 'peGetRequest':
			case 'peSetRequest':
			case 'peCapabilities': {
				if (!(this.ciSupport & 0b1000)) {
					msgObj.debug.addError("Do not send "+
						ciType.title
						+" - Workbench does not support being a Responder to Property Exchange MIDI-CI messages. Workbench has informed the Initiator in Discovery that this is not supported.", 0x00);
				}
				break;
			}

			case 'processInquiryCapabilities':
			case 'processInquiryMIDIMessageReport': {
				if (!(this.ciSupport & 0b10000)) {
					msgObj.debug.addError("Do not send "+
						ciType.title
						+" - Workbench does not support being a Responder to Process Inquiry MIDI-CI messages. Workbench has informed the Initiator in Discovery that this is not supported.", 0x00);
				}
				break;
			}
		}


		if(this.debug){
			d.msg("sysex",msgObj.debug.getDebug(),'in',umpDev,group,msgObj.debug.getErrors(),msgObj.debug.getWarnings());
		}
		if(msgObj.debug.hasErrors()){
			let ackNakDetails = [0,0,0,0,0];
			/*	Protocol - the 5 Bytes declares the 5 bytes used for the Protocol Type
				Profile Configuration - the 5 bytes used here represent the Profile Id
				Property Exchange - Byte 1 is the PE Stream Id. Byte 2 and 3 represent the current Chunk number (LSB first). Other bytes are reserved.
				Process Inquiry - The 5 Bytes are reserved.
			*/
			if(msgObj.sysex[4]=== 0x12){ //Set New Protocol Message
				ackNakDetails = msgObj.sysex.slice(14, 19);
			}

			if(msgObj.sysex[4]>= 0x22 && msgObj.sysex[4]<= 0x2F){ //Profiles
				ackNakDetails = msgObj.sysex.slice(13, 18);
			}

			if(msgObj.sysex[4]>= 0x34 && msgObj.sysex[4]<= 0x3F){ //PE
				const hLength = msgObj.sysex[15] + (msgObj.sysex[16] << 7);
				ackNakDetails[0] = msgObj.sysex[14];
				ackNakDetails[1] = msgObj.sysex[19+hLength];
				ackNakDetails[2] = msgObj.sysex[20+hLength];
			}

			this.sendNAK(msgObj, msgObj.muid,msgObj.sourceDestination,
				{
					originalSubId:  msgObj.sysex[4],
					statusCode: msgObj.debug.getErrorCode(),
					statusData: 0,
					ackNakMessage: msgObj.debug.getErrors()[0],
					ackNakDetails,
					streamObjVals,
					oOptsForReply
				}
			);
			return;
		}

		let streamType = ciType.streams ||null;
		let stream;

		if(streamType){
			doRecvEvent=false;
			if(!this.remoteDevicesInternal[msgObj.muid])return;

			if(streamType==='none') {
				streamObjVals.totalChunks = 1;
				streamObjVals.currentChunk = 1;
				streamObjVals.propertyData=[];
				if([0x3F].indexOf(msgObj.sysex[4])!==-1){
					streamType = 'request';
				}else if([0x34,0x36,0x38].indexOf(msgObj.sysex[4])!==-1){
					streamType = 'request';
				}else {
					streamType = 'reply';
				}
			}

			if(streamType==='request' && this.remoteDevicesInternal[msgObj.muid].streamsIn) {
				if (streamObjVals.currentChunk === 1) {
					this.remoteDevicesInternal[msgObj.muid].streamsIn.add(streamObjVals.requestId);
				}
				const streamIn = this.remoteDevicesInternal[msgObj.muid].streamsIn.get(streamObjVals.requestId);

				if(streamIn.currentChunk !== streamObjVals.currentChunk-1){
					msgObj.debug.addWarning("Chuck Order is wrong", 0x21);
				}

				this.remoteDevicesInternal[msgObj.muid].streamsIn.update(streamObjVals.requestId
					,streamObjVals.header
					, streamObjVals.propertyData
					,streamObjVals.currentChunk
				);

				if (streamObjVals.totalChunks === streamObjVals.currentChunk) {
					doRecvEvent = true;
					const reqData = this.remoteDevicesInternal[msgObj.muid].streamsIn.get(streamObjVals.requestId);
					let debugData = {
						title: "Receiving PE Request ("+streamObjVals.requestId+")"
						,errors:[]
						,warnings:[]
					};

					if(reqData.header.length){
						if(streamObjVals.currentChunk > 1){
							debugData.errors.push("Header should only be in the first Chunk");
							msgObj.debug.addWarning("Header should only be in the first Chunk", 0x21);
						}else{
							const headerConvert = payloadToObject(reqData.header);
							if(headerConvert.success){
								streamObjVals.reqHead = headerConvert.payload;
								let peTitle = (streamObjVals.reqHead.resource || (streamObjVals.reqHead.command + ':' +streamObjVals.reqHead.subscribeId ));
								if(msgObj.sysex[4] === 0x3F){
									peTitle = ciType.title;
								}
								debugData.title= "Receiving PE "
									+ peTitle
									+" Request ("+streamObjVals.requestId+")";
								debugData.header = streamObjVals.reqHead;

								if(ciType.allowedHeaderSchema){
									const ajv = new Ajv();
									ajv.addMetaSchema(draft6MetaSchema);
									ajv.addFormat('json-pointer', ()=>{return true;});
									const validate = ajv.compile(ciType.allowedHeaderSchema);
									const valid = validate(headerConvert.payload);
									if (!valid){
										debugData.warnings.push(
											validate.errors.map(e=>{
												return e.instancePath +' : ' + e.message +' - '
													+ Object.keys(e.params).map(key => `${key}=${e.params[key]}`).join(" ");
											}).join('. ')
										);
									}
								}

								if(ciType.recvEvent.name==='peSubRequest' && streamObjVals.reqHead.command !== 'start'){
									let subDetails = ((this.remoteDevicesInternal[msgObj.muid] || {}).peSubscriptions || {})[streamObjVals.reqHead.subscribeId];
									if (!subDetails) {
										debugData.warnings.push("No Matching Subscription for subscription id: "+streamObjVals.reqHead.subscribeId);
									}
								}
							}else{
								debugData.errors.push(headerConvert.error);
								debugData.headerText = headerConvert.payloadText;
							}
						}
					}else{
						streamObjVals.reqHead={};
					}

					if(reqData.propertyData.length){
						const bodyConvert =  payloadToObject(reqData.propertyData,streamObjVals.reqHead);
						if(bodyConvert.success){
							streamObjVals.reqBody  = bodyConvert.payload;
							if(!streamObjVals.reqHead.mediaType)debugData.body = streamObjVals.reqBody;
						}else{
							debugData.error.push(bodyConvert.error);
							if(!streamObjVals.reqHead.mediaType)debugData.bodyText = bodyConvert.payloadText;
						}
					}
					if(this.debug)d.msg('pe',debugData,'in',umpDev,group);
				}
			}

			if(streamType==='reply') {
				//This is ok for HAS/GET/SET but not replies
				if(!this.remoteDevicesInternal[msgObj.muid] || !this.remoteDevicesInternal[msgObj.muid].streamsOut)return;
				stream=this.remoteDevicesInternal[msgObj.muid].streamsOut.getStream(streamObjVals.requestId);
				if(stream) {
					 if(stream.currentChunkResp !== streamObjVals.currentChunk-1){
						 stream.errors.push('Chunks are out of Sync '
							 + (streamObjVals.currentChunk-1)
							 + ':'
							 + stream.currentChunkResp);
					 }

					if (typeof streamObjVals.totalChunkResp == 'undefined') {
						stream = this.remoteDevicesInternal[msgObj.muid].streamsOut.updateStream(streamObjVals.requestId, streamObjVals.totalChunks, streamObjVals.currentChunk, [], []);
					}

					if(streamObjVals.currentChunk > 1 && streamObjVals.header){
						stream.warnings.push('Header should only be in first Chunk');
						msgObj.debug.addWarning("Header should only be in the first Chunk", 0x21);
						streamObjVals.header = '';
					}

					stream = this.remoteDevicesInternal[msgObj.muid].streamsOut.updateStream(
						streamObjVals.requestId
						, streamObjVals.totalChunks
						, streamObjVals.currentChunk
						, streamObjVals.header
						, streamObjVals.propertyData
					);

					if (streamObjVals.totalChunks === streamObjVals.currentChunk) {
						doRecvEvent = true;
						streamObjVals.reqHead = stream.data.reqHeader;
						streamObjVals.reqBody = stream.data.reqBody;
						const headerConvert = payloadToObject(stream.responseHeader);
						const bodyConvert = payloadToObject(stream.responsePayload, headerConvert.payload);

						const debugData = {
							title: 'Receiving PE Request (' + streamObjVals.requestId + ')',
							errors: stream.errors,
							warnings: stream.warnings
						};

						if(headerConvert.success){
							streamObjVals.resHead = headerConvert.payload;
							debugData.title= "Receiving PE "+streamObjVals.reqHead.resource+" Reply ("+streamObjVals.requestId+")";
							debugData.header = streamObjVals.resHead;
							if(bodyConvert.success){
								streamObjVals.resBody  = bodyConvert.payload;
								if(!streamObjVals.resHead)debugger;
								if(!streamObjVals.resHead.mediaType)debugData.body = streamObjVals.resBody;
							}else{
								debugData.errors.push(bodyConvert.error);
								if(!streamObjVals.resHead?.mediaType)debugData.bodyText = bodyConvert.payloadText;
							}
							if(ciType.allowedHeaderSchema){
								const ajv = new Ajv();
								ajv.addMetaSchema(draft6MetaSchema);
								ajv.addFormat('json-pointer', ()=>{return true;});
								const validate = ajv.compile(ciType.allowedHeaderSchema);
								const valid = validate(headerConvert.payload);
								if (!valid){
									debugData.warnings.push(
										validate.errors.map(e=>{
											return e.instancePath +' : ' + e.message +' - '
												+ Object.keys(e.params).map(key => `${key}=${e.params[key]}`).join(" ");
										}).join('. ')
									);
								}
							}
						}else{
							debugData.errors.push(headerConvert.error);
							debugData.headerText = headerConvert.payloadText;
						}
						if(this.debug)d.msg('pe',debugData,'in',umpDev,group);
						this.remoteDevicesInternal[msgObj.muid].streamsOut.closeStream(streamObjVals.requestId, 'close');

						if(debugData.errors.length){
							const hLength = msgObj.sysex[15] + (msgObj.sysex[16] << 7);
							let ackNakDetails = [0,0,0,0,0];
							ackNakDetails[0] = msgObj.sysex[14];
							ackNakDetails[1] = msgObj.sysex[19+hLength];
							ackNakDetails[2] = msgObj.sysex[20+hLength];
							this.sendNAK(msgObj, msgObj.muid,msgObj.sourceDestination,
								{
									originalSubId:  msgObj.sysex[4]-1,
									statusCode: 0x21,
									statusData: 0x00,
									streamObjVals,
									oOptsForReply,
									ackNakMessage: debugData.errors[0],
									ackNakDetails
								},
								group
							);
							return;
						}
					}
					if(streamObjVals.totalChunks !== streamObjVals.currentChunk && stream.data.reqHeader.receiptReq){

							this.sendNAK(msgObj, msgObj.muid,msgObj.sourceDestination,
								{
									originalSubId:  msgObj.sysex[4]-1,
									statusCode: 0x11,
									isAck: true,
									statusData: 10,
									streamObjVals,
									oOptsForReply
								}
							);


					}
				}else{
					msgObj.debug.addError("Unknown Request Id "+
						streamObjVals.requestId, 0x00);

				}
			}
		}

		if(doRecvEvent && ciType.recvEvent){
			if(ciType.recvEvent.name) {
				const out = [];
				for (let i = 0; i < ciType.recvEvent.args.length; i++) {
					const part = ciParts[ciType.recvEvent.args[i]];
					if(part){
						if(part.path){
							out.push(this.getData(msgObj.muid, part.path));
						}
						else if(part.assignToStreamObjVals){
							out.push(streamObjVals[ciType.recvEvent.args[i]]);
						}
						else if(part.assignoOptsForReply){
							out.push(oOptsForReply[ciType.recvEvent.args[i]]);
						}
						continue;
					}

					switch (ciType.recvEvent.args[i]) {
						case 'muid':
						case 'sourceDestination':
						case 'ciVer':
							out.push(msgObj[ciType.recvEvent.args[i]]);
							break;
						case "profile":
						case "profiles":
						case 'profileSpecificData':
							out.push(oOptsForReply[ciType.recvEvent.args[i]]);
							break;
						case "midiProtocol":
							out.push(this.remoteDevices[msgObj.muid].currentProtocol);
							break;
						case "status":
						case "reqHead":
						case "reqBody":
						case "resHead":
						case "resBody":
							out.push(streamObjVals[ciType.recvEvent.args[i]]);
							break;
						default:
							debugger;
					}
				}

				let cb = null;
				if (stream && stream.data.cb) {
					cb = stream.data.cb;
				}

				let srcdestID = msgObj.sysex[2]+'_'+msgObj.sysex[4]; //Srcdest ciType
				if(msgObj.sysex[4] >= 0x34 && msgObj.sysex[4] <= 0x3F){
					srcdestID += '_'+msgObj.sysex[14];
				}
				if (this.cbResponses[msgObj.muid] && this.cbResponses[msgObj.muid][srcdestID]) {

					cb = this.cbResponses[msgObj.muid][srcdestID];
					delete this.cbResponses[msgObj.muid][srcdestID];

					if(this.cbTimeoutResponses[msgObj.muid] && this.cbTimeoutResponses[msgObj.muid][srcdestID]){
						clearTimeout(this.cbTimeoutResponses[msgObj.muid][srcdestID]);
						delete this.cbTimeoutResponses[msgObj.muid][srcdestID];
					}

				}

				if(ciType.recvEvent.getCB){
					cb = ciType.recvEvent.getCB(this,msgObj);
				}

				switch (ciType.recvEvent.name) {
					case'discoveryRequest':
					case'discoveryReply': {

						if(ciType.recvEvent.name==='discoveryRequest'){
							setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/midi2Supp/initiator", true);
						}else{
							setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/midi2Supp/responder", true);
						}

						this.setData(msgObj.muid,'/messageFormatVersion',msgObj.ciVer);

						setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/midi2Supp/midiciver", midi2Tables.messageFormatLookup[msgObj.ciVer])

						this.setData(msgObj.muid,'/MUID',msgObj.muid);

						const ciSupportCheck = this.getData(msgObj.muid, '/ciSupport');
						this.setData(msgObj.muid,'/supported', {});
						this.setData(msgObj.muid,'/processInquiryMIDIReport',false);
						if (ciSupportCheck & 2) {
							this.setData(msgObj.muid,'/supported/protocol',true);

							setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/midi2Supp/protocol", true);

						}

						if (ciSupportCheck & 4) {
							this.setData(msgObj.muid,'/supported/profile',true);
							setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/midi2Supp/profile", true);
						}

						if (ciSupportCheck & 8) {
							this.setData(msgObj.muid,'/supported/pe',true);
							setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/midi2Supp/pe", true);
						}

						if (ciSupportCheck & 16) {
							this.setData(msgObj.muid,'/supported/procInq',true);
							setRemoteEndpointValueFromMUID(msgObj.muid, "/remoteEndpoint/midi2Supp/pi", true);
						}
						break;
					}
					case 'ack':{
						switch (oOptsForReply.statusCode){
							case 0x10:{ //Terminate Inquiry (replaces PE Notify Message with a status of 144)
								this.remoteDevicesInternal[msgObj.muid].streamsOut.timeoutWait(oOptsForReply.statusData[0], oOptsForReply.statusData * 100);
								break;
							}
						}
						break;
					}
					case 'nak':{
						switch (oOptsForReply.statusCode){
							case 0x20:{ //Terminate Inquiry (replaces PE Notify Message with a status of 144)
									this.remoteDevicesInternal[msgObj.muid].streamsOut.terminate(oOptsForReply.ackNakDetails[0]);
								break;
							}
						}
						break;
					}
					case'notifyMessage': {
						if(streamObjVals.reqHead.status===100){
							this.remoteDevicesInternal[msgObj.muid].streamsOut.timeoutWait(streamObjVals.requestId);
						}

						if(streamObjVals.reqHead.status===144){
							this.remoteDevicesInternal[msgObj.muid].streamsOut.terminate(streamObjVals.requestId);
						}

						if(streamObjVals.reqHead.status===408){
							msgObj.debug.addWarning("Recieved 408 Status", 0x00);
							//this.remoteDevicesInternal[msgObj.muid].streamsOut.terminate(streamObjVals.requestId);
						}
						break;
					}
					case'peSubRequest': {
						if (streamObjVals.reqHead.command !== 'start') {
							let subDetails = ((this.remoteDevicesInternal[msgObj.muid] || {}).peSubscriptions || {})[streamObjVals.reqHead.subscribeId];
							if (subDetails && subDetails.processSubMessage) {
								cb = subDetails.processSubMessage;
							}
						}
						break;
					}
				}

				if(streamObjVals.resHead && streamObjVals.resHead.cacheTime){
					const reqHeadCopy = JSON.parse(JSON.stringify(streamObjVals.reqHead));
					delete reqHeadCopy.mutualEncoding;
					const cacheId = JSON.stringify(reqHeadCopy) + (JSON.stringify(streamObjVals.reqBody)||'');
					this.remoteDevicesInternal[msgObj.muid].cache[cacheId] = {
						cb: cb,
						out: out
					};
					setTimeout((cacheIdRecv)=> {
						if(this.remoteDevicesInternal[msgObj.muid]) {
							delete this.remoteDevicesInternal[msgObj.muid].cache[cacheIdRecv];
						}
					},streamObjVals.resHead.cacheTime*1000,cacheId);
				}
				if(!cb){
					//debugger;
					this.ciEventHandler.apply(this,[umpDev, group, ciType.recvEvent.name,...out]);
				}else{
					if(!out)debugger;
					cb.apply(this,[...out]);
				}
			}
		}
	};

	//*********************************************
	piCapabilityStart(remoteMuid, cbComplete = function(){} ) {

		if(configSetting.ciVerLocal < 2 || !this.getData(remoteMuid,'/supported/procInq')
			|| this.remoteDevicesInternal[remoteMuid].processInquiryComplete
		) {
			//this.remoteDevicesInternal[remoteMuid].processInquiryComplete = true;
			cbComplete();
			return;
		}
		let newResponse = this.createMIDICIMsg(this._muid, 0x40, 0x7F,
			remoteMuid, {
			group: this.remoteDevicesInternal[remoteMuid].group,
			cb: () =>{
				this.remoteDevicesInternal[remoteMuid].processInquiryComplete = true;

				cbComplete();
			},
			cbTimeout:()=>{
				d.msg('sysex',{title: 'Timeout on ' + midi2Tables.ciTypes[0x40].title,
						warnings: ['No Response in 3 seconds']}
					,'out',(this.remoteDevicesInternal[remoteMuid]||{}).umpDev,
					(this.remoteDevicesInternal[remoteMuid]||{}).group,null,['No Response in 3 seconds']);
				cbComplete();
			}
		});
		this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);

	}

	peCapabilityStart(remoteMuid, cbComplete = function(){} ) {

		if(!this.getData(remoteMuid,'/supported/pe')
				|| this.remoteDevicesInternal[remoteMuid].peCapabilityComplete
		) {
			this.remoteDevicesInternal[remoteMuid].peCapabilityComplete = true;
			cbComplete();
			return;
		}
		let newResponse = this.createMIDICIMsg(this._muid, 0x30, 0x7F, remoteMuid, {
			group: this.remoteDevicesInternal[remoteMuid].group,
			peVersion:0x00,
			simultaneousPERequests: configSetting.simultaneousPERequests,
			cb: () =>{
				this.remoteDevicesInternal[remoteMuid].peCapabilityComplete = true;
				setTimeout(()=>{
					//this.getResourceList(remoteMuid).then(cbComplete);
					cbComplete();
				},200);

			},
			cbTimeout:()=>{
				d.msg('sysex',{
					title: 'Timeout on ' + midi2Tables.ciTypes[0x30].title,
					warnings: ['No Response in 3 seconds']
					}
					,'out',(this.remoteDevicesInternal[remoteMuid]||{}).umpDev,
					(this.remoteDevicesInternal[remoteMuid]||{}).group,null,);
				cbComplete();
			}
		});
		this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);

	}

	profileInquiryStart(remoteMuid,cbComplete = function(){} ) {

		if(!this.getData(remoteMuid,'/supported/profile')) {
			cbComplete();
			return;
		}
		this.setData(remoteMuid, '/profiles.js', {});
		//global.settings.projDevice.profiles.js={};
		this.setData(remoteMuid, '/interoperability/pf1.1','',true);
		this.setData(remoteMuid, '/interoperability/pf1.3','',true);
		let newResponse = this.createMIDICIMsg(this._muid, 0x20,
			0x7F, remoteMuid, {group: this.remoteDevicesInternal[remoteMuid].group,
				cb:cbComplete,
				cbTimeout:()=>{
					d.msg('sysex',{title: 'Timeout on ' + midi2Tables.ciTypes[0x20].title,
							warnings: ['No Response in 3 seconds']}
						,'out',(this.remoteDevicesInternal[remoteMuid]||{}).umpDev,
						(this.remoteDevicesInternal[remoteMuid]||{}).group,null,['No Response in 3 seconds']);
					cbComplete();
				}
		});
		this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);
	}

	protocolNegotiationStart(remoteMuid,cbComplete = function(){}, group ){
		if(this.configSetting.skipProtocol
			|| !this.getData(remoteMuid,'/supported/protocol')
			|| this.remoteDevicesInternal[remoteMuid].protocolNegotiationComplete) {
			cbComplete();
			return;
		}
		this.setData(remoteMuid,'/midi10',false);
		this.setData(remoteMuid,'/umpmidi10mixed',false);
		this.setData(remoteMuid,'/umpmidi10',false);
		this.setData(remoteMuid,'/umpmidi10jr',false);
		this.setData(remoteMuid,'/umpmidi10mixedjr',false);
		this.setData(remoteMuid,'/umpmidi20',false);
		this.setData(remoteMuid,'/umpmidi20jr',false);

		let found=false;
		setTimeout(()=>{
			if(found===false){
				this.setData(remoteMuid,'/midi10',true);
			}
		},3000);

		let newResponse = this.createMIDICIMsg(this._muid, 0x10,0x7F, remoteMuid,{
			group:group,
			authorityLevel: this.authorityLevel, //Does this need defining
			protocols:[midi2Tables.ciProtocols.umpmidi10,midi2Tables.ciProtocols.umpmidi10mixed,midi2Tables.ciProtocols.umpmidi20],
			currentProtocol: midi2Tables.ciProtocols.umpmidi10,
			cb:(_muid,authorityLevel,protocolList)=>{
				found=true;
				this.setData(remoteMuid,'/protocolList', protocolList);
				protocolList.map(p=>{
					if(p.type === 1 && !p.sExt && !p.jr){
						this.setData(remoteMuid,'/umpmidi10', true, true);
					}

					if(p.type === 1 && p.sExt && !p.jr){
						this.setData(remoteMuid,'/umpmidi10mixed', true, true);
					}

					if(p.type === 1 && !p.sExt && p.jr){
						this.setData(remoteMuid,'/umpmidi10jr', true, true);
					}
					if(p.type === 1 && p.sExt && p.jr){
						this.setData(remoteMuid,'/umpmidi10mixedjr', true, true);
					}

					if(p.type === 2 && !p.jr){
						this.setData(remoteMuid,'/umpmidi20', true, true);
					}

					if(p.type === 2 && p.jr){
						this.setData(remoteMuid,'/umpmidi20jr', true, true);
					}

				});
				cbComplete();
			},
			cbTimeout:()=>{
				d.msg('sysex',{
						title: 'Timeout on ' + midi2Tables.ciTypes[0x10].title, warnings: ['No Response in 3 seconds']}
					,'out',(this.remoteDevicesInternal[remoteMuid]||{}).umpDev,
					(this.remoteDevicesInternal[remoteMuid]||{}).group,null,['No Response in 3 seconds']);
				cbComplete();
			}
		});
		this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);

		this.remoteDevicesInternal[remoteMuid].protocolNegotiationComplete = true;
	}

	findMatchingFile(remoteMuid,homedir,cbComplete = function(){}){
		if(this.remoteDevicesInternal[remoteMuid].fileLoaded){
			cbComplete();
			return;
		}
		const filename = this.getData(remoteMuid,'/device/manufacturerId16')+ '_'
		     + this.getData(remoteMuid,'/device/familyId').join('-')+ '_'
		     + this.getData(remoteMuid,'/device/modelId').join('-')
		;

		this.remoteDevicesInternal[remoteMuid].file = homedir+filename+'.json';
		if (!fs.existsSync(this.remoteDevicesInternal[remoteMuid].file)){
			fs.writeFileSync(this.remoteDevicesInternal[remoteMuid].file,JSON.stringify(this.remoteDevices[remoteMuid]),{flag:'w+'});
		}
		const fileData = fs.readFileSync(this.remoteDevicesInternal[remoteMuid].file).toString() ;

		this.remoteDevices[remoteMuid] = {
			...this.remoteDevices[remoteMuid],
			...JSON.parse(fileData),
			...{
				supported: this.remoteDevices[remoteMuid].supported,
				processInquiryMIDIReport: this.remoteDevices[remoteMuid].processInquiryMIDIReport,
				maxSysex: this.remoteDevices[remoteMuid].maxSysex,
				ciSupport: this.remoteDevices[remoteMuid].ciSupport,
				pe:{}
			}
		} ;

		this.remoteDevicesInternal[remoteMuid].fileLoaded = true;

		cbComplete();
	}

	getResourceList (remoteMuid, forceNew = false){
		return new Promise( (resolve,reject) => {
			let ResourceListRaw = this.getData(remoteMuid, '/pe/ResourceListRaw');
			if(!forceNew && ResourceListRaw){
				if (this.remoteDevicesInternal[remoteMuid]) {
					this.ciEventHandler.apply(this, [this.remoteDevicesInternal[remoteMuid].umpDev, this.remoteDevicesInternal[remoteMuid].group, 'updatePE', remoteMuid, "ResourceList"]);
				}
				resolve(ResourceListRaw);
				return;
			}


			this.sendPE(0x34, remoteMuid, {resource: "ResourceList"})
				.then(([, , resBody, reqHead]) => {
					if (!resBody) {
						this.setData(remoteMuid, '/pe', {});
						reject('No ResourceList Data');
						return;
					}

					const resListOrder = [];
					this.setData(remoteMuid, '/pe/ResourceListRaw', JSON.parse(JSON.stringify(resBody)));
					ResourceListRaw = this.getData(remoteMuid, '/pe/ResourceListRaw');
					let errors = [];
					let warnings = [];
					this.setData(remoteMuid, '/midi2Supp/pe_ResourceList', true);

					setRemoteEndpointValueFromMUID(remoteMuid,
						'/remoteEndpoint/midi2Supp/pe_ResourceList',
						true);

					(resBody || []).map((resourceObj) => {
						if (!resourceObj.resource.match(/^X-/)) { //This is a defined resource
							let MMADefinition = midi2Tables.resourceSchema[resourceObj.resource];
							if (!MMADefinition ) {
								errors.push(resourceObj.resource + " is not a valid defined Resource.");
								MMADefinition = {schema: {type: "experimental?"}};
							}

							if (resourceObj.requireResId !== undefined) {
								errors.push("Do not set " + resourceObj.resource + " requireResId Property in ResourceList");
								resourceObj.requireResId = MMADefinition.requireResId;
							}
							if (resourceObj.schema) {
								errors.push("Do not set " + resourceObj.resource + " schema Property in ResourceList");
								//Always use the registered schema
								resourceObj.schema = MMADefinition.schema;
							}
							if (resourceObj.canGet) {
								warnings.push("Do not set " + resourceObj.resource + " canGet Property in ResourceList");
								resourceObj.canGet = MMADefinition.canGet;
							}

							if (resourceObj.canSet && !MMADefinition.canOverrideSet) {
								warnings.push("Do not set " + resourceObj.resource + " canSet Property in ResourceList");
								resourceObj.canSet = MMADefinition.canSet;
							}
							if (resourceObj.canPaginate) {
								warnings.push(`Do not set ${resourceObj.resource}  canPaginate Property in ResourceList`);
								resourceObj.canPaginate = MMADefinition.canPaginate
							}

							resourceObj = Object.assign({}, MMADefinition, resourceObj);

							this.setData(remoteMuid, `/midi2Supp/pe_${resourceObj.resource}`, true);
							setRemoteEndpointValueFromMUID(remoteMuid,
								`/remoteEndpoint/midi2Supp/pe_${resourceObj.resource}`,
								true);
						}
						else {
							if(resourceObj.resource.match(/\s+/)){
								errors.push(`${resourceObj.resource} Resource name in ResourceList has a space.`);
							}
							if (!resourceObj.schema) {
								errors.push(`Manufacturer defined Resource ${resourceObj.resource} has no schema in ResourceList`);
							}
						}

						if (!resourceObj.resource.match(/List$/)) { //This is a list resource
							//TODO Look up the link and make sure the Resource Exists - otherwise trigger an error
							const columns = resourceObj.columns || [];
							(columns||[]).map(colObj=>{
								if(colObj.link && !resBody[colObj.link]){
									errors.push(`${resourceObj.resource} Resource columns make reference to a Resource (${colObj.link}) that does not exist. 
									Note defined Resources have default columns.`);
								}
							});
						}


						/*else if(!resourceObj.schema.type){
						errors.push("Manufacturer defined Resource "+ resourceObj.resource+" has no schema type in ResourceList");
					}*/
						resListOrder.push(resourceObj.resource);
						this.setData(remoteMuid, '/pe/ResourceList/' + resourceObj.resource, resourceObj);

						switch (resourceObj.resource) {
							case 'DeviceInfo':
								this.sendPE(0x34, remoteMuid, {resource: 'DeviceInfo'});
								break;
						}
					});

					if (errors.length || warnings.length) {
						const debugData = {
							title: "Validation Error(s)"
							, errors
							, warnings
							, header: reqHead
							, body: resBody || null
						};
						if (this.debug) d.msg('pe', debugData, 'in', this.remoteDevicesInternal[remoteMuid].umpDev, this.remoteDevicesInternal[remoteMuid].group,errors, warnings);
					}

					this.setData(remoteMuid, "/pe/resListOrder", resListOrder);
					setTimeout(() => {
						if (this.remoteDevicesInternal[remoteMuid]) {
							this.ciEventHandler.apply(this, [this.remoteDevicesInternal[remoteMuid].umpDev, this.remoteDevicesInternal[remoteMuid].group, 'updatePE', remoteMuid, "ResourceList"]);
						}
						resolve(ResourceListRaw);
					}, 500);
				});
		});
	}

	sendPE (subId,remoteMuid,reqHeader,reqBody = null,force=false){
		return new Promise( (resolve,reject) => {

			let retries = 4;
			const cb = (...args) => {
				const status = args[1].status;
				if(status >= 300 && status < 400){
					//Retry....
					if(retries-- > 0){
						setTimeout(() => {
							if (!this.remoteDevicesInternal[remoteMuid])return;
							this.remoteDevicesInternal[remoteMuid].streamsOut.addToQueue(data,goToStream);
						},1500);
					}else{
						reject(args);
					}

				}else if(status >= 400){
					//Retry....
					reject(args);
				}else{
					resolve(args);
				}
			};

			const data = {
				subId: subId,
				remotemuid: remoteMuid,
				reqHeader: reqHeader,
				reqBody: reqBody,
				cb: cb,
				maxPayload: 0,
				payloadBody: [],
				payloadHeader: [],
				chunkTotal: 0
			};

			if (!this.remoteDevicesInternal[remoteMuid] || !this.remoteDevicesInternal[remoteMuid].streamsOut){
				reject();
				return;
			}
			if (!this.remoteDevicesInternal[remoteMuid].cache) {this.remoteDevicesInternal[remoteMuid].cache = {}; }

			if(subId===0x34){ //Get
				const cacheId = JSON.stringify(reqHeader) + (JSON.stringify(reqBody)||'');
				if(!force && this.remoteDevicesInternal[remoteMuid].cache[cacheId]){
					const cbTouse = cb || this.remoteDevicesInternal[remoteMuid].cache[cacheId].cb;
					if(cbTouse){
						cbTouse(...this.remoteDevicesInternal[remoteMuid].cache[cacheId].out);
					}
					return;
				}
				data.cb = (_muid,resHead,resBody,reqHead) => {
					if(resBody && !(resHead.mutualEncoding||'').match(/Mcoded7/)){
						this.getResourceWithSchemaRef(remoteMuid,reqHead.resource)
							.then(resourceObj=>{

								const debugData = {
									title:  "Validation Error "+ reqHead.resource+" GET Request"
									,errors:[]
									,warnings:[]
									,header:reqHead
									,body: resBody || null
								};

								if(resourceObj.canPaginate && resHead.totalCount===undefined){
									debugData.warnings.push("Response header is missing \"totalCount\" Property field.");
								}

								if(resourceObj.canPaginate && reqHead.limit && reqHead.limit < resBody.length){
									debugData.warnings.push("Response has more entries than limit requested.");
								}

								if(resHead.mediaType && (resourceObj.mediaTypes||['application/json']).indexOf(resHead.mediaType)){
									debugData.warnings.push("Response has unmatched mediaType to ResourceList details.");
								}

								if(resHead.mutualEncoding && (resourceObj.encodings||['ASCII']).indexOf(resHead.mutualEncoding)){
									debugData.warnings.push("Response has unmatched mutualEncoding to ResourceList details.");
								}

								if(resHead.mutualEncoding && reqHead.mutualEncoding && resHead.mutualEncoding!==reqHead.mutualEncoding ){
									debugData.warnings.push("Request and Response has unmatched mutualEncoding.");
								}

								if(reqHead.cacheTime && resourceObj.canSubscribe ){
									debugData.warnings.push("CacheTime and Subscribable Resource can cause issues. Please only use one feature.");
								}


								const ajv = new Ajv({formats: {commonmark: true}});
								ajv.addMetaSchema(draft6MetaSchema);
								ajv.addFormat('json-pointer', ()=>{return true;});

								const ajv4 = new AjvD4({formats: {commonmark: true}});
								ajv4.addFormat('json-pointer', ()=>{return true;});

								let validate;
								try{
									if(resourceObj.resource==="JSONSchema"){
										if(resBody['$schema'] === "http://json-schema.org/draft-04/schema#") {
											validate = ajv4.compile(resBody);
										}else{
											validate = ajv.compile(resBody);
										}
									}else{
										if(resourceObj.schema['$schema'] === "http://json-schema.org/draft-04/schema#"){
											if(resourceObj.resource==="ResourceList"){
												delete resourceObj.schema.items.properties.schema.anyOf;
												resourceObj.schema.items.properties.schema.type = "object";
											}
											validate = ajv4.compile(resourceObj.schema);
										}else{
											validate = ajv.compile(resourceObj.schema);
										}
										const valid = validate(resBody);
										if (!valid){
											debugData.errors.push(...validate.errors.map(e=>{
												return e.instancePath +' : ' + e.message +' - '
													+ Object.keys(e.params).map(key => `${key}=${e.params[key]}`).join(" ");
											}));

										}

										if(this.debug && (debugData.errors.length || debugData.warnings.length)){
											d.msg('pe',debugData,'in',this.remoteDevicesInternal[remoteMuid].umpDev,this.remoteDevicesInternal[remoteMuid].group);
										}

									}
								}catch (e){
									//debugger;
									const debugData = {
										title:  "Schema Validation Error "+ reqHead.resource+" GET Request"
										,errors:[e.message]
										,header:reqHead
										,body: resBody || null
									};
									if(this.debug){
										d.msg('pe',debugData,'in',this.remoteDevicesInternal[remoteMuid].umpDev,this.remoteDevicesInternal[remoteMuid].group);
									}
								}
							})
							.catch(eMsg=>{});
					}

					if(reqHead.resource==="DeviceInfo" && resBody){
						this.setData(remoteMuid,"/device/manufacturer",resBody.manufacturer,true);
						this.setData(remoteMuid,"/device/manufacturerId",resBody.manufacturerId,true);
						this.setData(remoteMuid,"/device/manufacturerId16",getManufacturer16bit(resBody.manufacturerId).manufacturerId16,true);
						this.setData(remoteMuid,"/device/family",resBody.family,true);
						this.setData(remoteMuid,"/device/familyId",resBody.familyId,true);
						this.setData(remoteMuid,"/device/model",resBody.model,true);
						this.setData(remoteMuid,"/device/modelId",resBody.modelId,true);
						this.setData(remoteMuid,"/device/version",resBody.version,true);
						this.setData(remoteMuid,"/device/versionId",resBody.versionId,true);
						this.setData(remoteMuid,"/device/serialNumber",resBody.serialNumber || 'No Serial',true);

						//TODO show serialNumber etc if agreed and Provided.
						this.setData(remoteMuid,'/pe/DeviceInfo',resBody,true);
					}
					cb(remoteMuid,resHead,resBody,reqHead);
				};
			}else if(subId===0x36){ //send
				if(!reqHeader.setPartial && (reqHeader.mediaType||'application/json').match(/application\/json/)) {
					this.getResourceWithSchemaRef(remoteMuid,data.reqHeader.resource)
						.then(resourceObj => {
							const validate = ajv.compile(resourceObj.schema);
							const valid = validate(data.reqBody);
							if (!valid) {
								const debugData = {
									title: "Validation Error " + data.reqHeader.resource + " SET Request"
									, errors: validate.errors
									, header: data.reqHeader
									, body: data.reqBody || null
								};
								if(this.debug)d.msg('pe', debugData, 'out',this.remoteDevicesInternal[remoteMuid].umpDev,group);
							}
						})
						.catch(eMsg => {
						});
				}
			}

			const resourceObj = this.getData(remoteMuid,"/pe/ResourceList/"+data.reqHeader.resource) || {};
			const encodings = (resourceObj ||{}).encodings || [];
			const encType = data.reqHeader.mutualEncoding || encodings[0] || 'ASCII';
			if(encType!=='ASCII'){
				data.reqHeader.mutualEncoding=encType;
			}


			data.maxPayload = this.remoteDevices[remoteMuid].maxSysex - 24;
			data.payloadHeader = objectToPayload('ASCII',reqHeader,{});
			data.payloadBody=[];
			if(reqBody !== null){
				data.payloadBody = objectToPayload(subId === 0x34 ? 'ASCII' : encType, reqBody, reqHeader);
			}
			data.chunkTotal = Math.ceil((data.payloadHeader.length + data.payloadBody.length)/data.maxPayload);

			const goToStream = (requestId,reason,streamObj)=> {
				if(!this.remoteDevicesInternal[remoteMuid])return;
				switch (reason) {
					case 'startChunking': {
						const debugData = {
							title: 'Sending PE ' + streamObj.data.reqHeader.resource + ' Request (' + requestId + ')',
							errors: [],
							header: streamObj.data.reqHeader,
							body: ''
						};
						if (!streamObj.data.reqHeader.mediaType) debugData.body = streamObj.data.reqBody;

						if(this.debug)d.msg('pe', debugData, 'out',this.remoteDevicesInternal[remoteMuid].umpDev,this.remoteDevicesInternal[remoteMuid].group);
						break;
					}
					case 'chunk': {
						const newResponse = this.createMIDICIMsg(
							this._muid
							, streamObj.data.subId
							, 0x7F
							, streamObj.data.remotemuid
							, {
								group: this.remoteDevicesInternal[remoteMuid].group,
								totalChunks: streamObj.data.chunkTotal,
								currentChunk: streamObj.chunkNumber,
								payloadHeaderChunk: streamObj.payloadHeaderChunk,
								payloadBodyChunk: streamObj.payloadBodyChunk,
								requestId: requestId
							});
						this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);
						break;
					}
					case 'timeout':
						if(this.debug)d.msg('pe',{title: 'Timeout on Stream ' + requestId, header: streamObj.data.reqHeader,body:streamObj.data.reqBody
								,errors: ['Timeout on Stream ' + requestId]}
							,'out',(this.remoteDevicesInternal[remoteMuid]||{}).umpDev,
							(this.remoteDevicesInternal[remoteMuid]||{}).group);
						break;
					case 'close':
						break;
					case 'terminate':
						if(this.debug)d.msg('pe',{title: 'Terminate Stream ' + requestId, header: streamObj.data.reqHeader,body:streamObj.data.reqBody
								,errors: ['Terminate Stream ' + requestId]}
							,'out',this.remoteDevicesInternal[remoteMuid].umpDev,this.remoteDevicesInternal[remoteMuid].group);
						break;
					case 'response':
						//TODO Replace with event cb(streamObj);
						debugger;
						break;
					default:
						debugger;
				}
			};
			this.remoteDevicesInternal[remoteMuid].streamsOut.addToQueue(data,goToStream);

		});
	}

	getResourceWithSchemaRef(remoteMuid,resource){
		return  new Promise(async (resolve,reject) => {
			let resourceObj = this.getData(remoteMuid,"/pe/ResourceList/"+resource);
			if(!resourceObj && resource==="ResourceList"){
				resourceObj = JSON.parse(JSON.stringify(midi2Tables.resourceSchema.ResourceList));
				this.setData(remoteMuid,"/pe/ResourceList/"+resource,resourceObj);
			}
			if(!resourceObj){
				reject("No Resource in ResourceList called "+resource);
				return;
			}
			let schema = resourceObj.schema;

			if(!schema || !schema['$ref']){
				resolve(resourceObj);
				return;
			}
			const schRef = schema['$ref'];
			const match = schRef.match(/^midi\+jsonschema:\/\/([^#]+)#?(.*)/);
			if(match){
				//debugger;
				const getJSONSchema = () =>{
					this.sendPE(0x34, remoteMuid,{resource:"JSONSchema",resId:match[1]})
						.then(([, , resBody, reqHead])=> {
							if(!resBody){
								reject("Empty "+resource+" Schema $ref:"+schema['$ref']);
								return;
							}
							delete schema['$ref'];
							Object.assign(schema, resBody);
							resolve(resourceObj);
						})
						.catch(()=>{
							reject("Empty "+resource+" Schema $ref:"+schema['$ref']);
						});
				}
				if (!this.remoteDevicesInternal[remoteMuid] || !this.remoteDevicesInternal[remoteMuid].streamsOut){
					setTimeout(getJSONSchema,1500);
				}else{
					getJSONSchema();
				}




			}else{
				if(schRef.match(/^(https?.*)/)){
					http
						.get(schRef, res => {
							let body = '';
							res.on('data', chunk => {body += chunk;});

							res.on('end', () => {
								if(!body){
									reject("Empty "+resource+" Schema $ref:"+schRef);
									return;
								}
								delete schema['$ref'];
								let resBody;
								try{
									resBody = JSON.parse(body);
								}catch(e){
									reject("Malformed "+resource+" Schema $ref:"+schRef);
									return;
								}
								Object.assign(schema, resBody);
								resolve(resourceObj);
							});
						})
						.on('error', () => {
							const jsonPath = __dirname + '/schema/' + path.basename(schRef);
							if(fs.existsSync(jsonPath)){
								let resBody = JSON.parse(fs.readFileSync(jsonPath));
								delete schema['$ref'];
								Object.assign(schema, resBody);
								resolve(resourceObj);
								return;
							}
							reject(resource+" Schema not found $ref:"+schRef);
						});
				}else{
					reject("strange $ref:"+schema['$ref']);
				}
			}
		});
	};

	setUpSubscription(remoteMuid,origReqHead,origResBody,cbOnChange){
		const reqHead = {command: 'start', ...JSON.parse(JSON.stringify(origReqHead))};
		let uniqId = '';

		return new Promise( (resolve,reject) => {

			this.getResourceWithSchemaRef(remoteMuid,origReqHead.resource)
				.then(resourceObj=>{
					if(!this.remoteDevicesInternal[remoteMuid] || !resourceObj.canSubscribe) { //Subscription Not available
						reject("Cannot Subscribe to "+resourceObj.resource);
						return;
					}
					if(!this.remoteDevicesInternal[remoteMuid].peSubscriptions){
						this.remoteDevicesInternal[remoteMuid].peSubscriptions={};
					}
					//Look for Existing Subscriptions
					//Track all the callBacks close as needed.
					for(let id in this.remoteDevicesInternal[remoteMuid].peSubscriptions){
						const peSub = this.remoteDevicesInternal[remoteMuid].peSubscriptions[id];
						if(JSON.stringify(peSub.reqHead)===JSON.stringify(origReqHead)){
							uniqId = id+':'+peSub.cbOnChange.length;
							peSub.cbOnChange.push(cbOnChange);
							resolve(uniqId);
							return;
						}
					}


					this.sendPE(0x38, remoteMuid, reqHead)
						.then(([,resHead,resBody,reqHead])=>{
						//debugger;
						const subId = resHead.subscribeId;

						for(let id in this.remoteDevicesInternal[remoteMuid].peSubscriptions){
							const peSub = this.remoteDevicesInternal[remoteMuid].peSubscriptions[id];
							if(peSub.subscribeId===subId){
								uniqId = subId+':'+peSub.cbOnChange.length;
								peSub.cbOnChange.push(cbOnChange);
								resolve(uniqId);
								return;
							}
						}

						this.remoteDevicesInternal[remoteMuid].peSubscriptions[subId] = {
							reqHead: origReqHead,
							subscribeId: subId,
							remoteMuid: remoteMuid,
							//,mode:resourceObj.canSubscribe
							resBody: origResBody,
							cbOnChange: [cbOnChange],
							processSubMessage: this._processSubMessage
						};
						uniqId = subId+':0';
						resolve(uniqId);
					});
				})
				.catch(eMsg=>{
					reject(eMsg);
				});
		});
	};

	peUnsubscribeAll(remoteMuid,cbComplete){
		if(!Object.keys(this.remoteDevicesInternal[remoteMuid].peSubscriptions).length){
			cbComplete();
			return;
		}

		let total=0;
		const subEnd = ()=>{
			total--;
			if(!total){
				this.ev.removeListener('subscriptionEnd',subEnd);
				cbComplete();
			}
		};

		this.ev.addListener('subscriptionEnd',subEnd);
		Object.keys(this.remoteDevicesInternal[remoteMuid].peSubscriptions)
			.map((subid)=>{
				total++;
				const sub = this.remoteDevicesInternal[remoteMuid].peSubscriptions[subid];
				sub.cbOnChange.map((f,cbCountId)=>{
					this.peUnsubscribe(remoteMuid,subid+':'+cbCountId);
				});

			});
	}

	peUnsubscribe(remoteMuid,id,bIsRecv = false){
		const subDetail = this.remoteDevicesInternal[remoteMuid].peSubscriptions;

		const subid = id.split(':')[0];
		if(!subDetail || !subDetail[subid]){
			return;
		}
		const sub = subDetail[subid];
		const cbCountId =  parseInt(id.split(':')[1],10);
		delete sub.cbOnChange[cbCountId];

		if (!sub.cbOnChange.filter(cb => {return!!(cb); }).length){
			if(!bIsRecv) {
				this.sendPE(0x38, remoteMuid, {command: "end", subscribeId: subid})
					.then(([,resHead,resBody,reqHead,reqBody]) =>{
						this.ev.emit('subscriptionEnd',remoteMuid,resHead,resBody,reqHead,reqBody);
					});
			}
			delete subDetail[subid];
		}
	}

	getMIDIMessageReport(remoteMuid,group,settings){
		/*{
					noteDataTypeBitmap:noteDataTypeBitmap,
					chanContTypeBitmap:chanContTypeBitmap,
					systemTypesBitmap:systemTypesBitmap << 7,
				   // callbackId:id,
					dataControl: parseInt($('#MDdataControl').val(),10),
					channel: parseInt($('#MDChannel').val(),10)

                	groupToUse: parseInt($('#MDGroup1b').val(),10),
				}*/
		return new Promise( (resolve) => {
					if(!(this.remoteDevices[remoteMuid].ciSupport & 0b10000)){
					resolve({});
					return;
				}
			this.remoteDevicesInternal[remoteMuid].midiMessageReport= {
					sourceDestination:settings.channel,
					ump:[]
			};
			this.midiReportModeMUID = remoteMuid;
			const processMIDIReport = (ump)=>{
				this.remoteDevicesInternal[this.midiReportModeMUID].midiMessageReport.ump.push(...ump);
			};

			this.ev.on('MIDIReportMessage',processMIDIReport);
			this.ev.once('MIDIReportEnd',(srcDestRet)=>{

				this.ev.removeListener('MIDIReportMessage',processMIDIReport);
				let controllerMsg = {};
				let MidiMessageReport = this.remoteDevicesInternal[this.midiReportModeMUID].midiMessageReport || {};

				if(MidiMessageReport.ump){
					const ump = t.ump10To20(MidiMessageReport.ump,'conv');
					for(let i=0; i<ump.length;i++) {
						const mess = ump[i];
						const mt = mess >>> 28;
						switch (mt) {
							case 4: //64 bits MIDI 2.0 Channel Voice Messages

								const mess2 =  ump[++i];
								//const group= mess >> 24 & 0xF;
								const status= mess >> 16 & 0xF0;
								const channel= mess >> 16 & 0xF;
								const val1 = mess >> 8 & 0xFF;
								const val2 = mess & 0xFF;
								//let out = [mess >> 16 & 0xFF];
								//convert note on zero velocity to noteoff
								controllerMsg[channel] = controllerMsg[channel]
									|| {notes:{}, cc:{}, rpn:{},nrpn:{}};
								switch(status){
									case 0x80: //note off
										break;
									case 0x90: //note on
										controllerMsg[channel].notes[val1] = {
											...controllerMsg[channel].notes[val1]||{},
											velocity: mess2 >>> 16,
											attributes:null //TODO
										};
										break;
									case 0xA0: //poly aftertouch
										controllerMsg[channel].notes[val1] = {
											...controllerMsg[channel].notes[val1]||{},
											aftertouch: mess2
										};
										break;
									case 0xB0: //CC
										controllerMsg[channel].cc[val1]=mess2;
										break;
									case 0xD0: //Channel Pressure
										controllerMsg[channel].chPress = mess2>>>0
										break;
									case 0b00100000: //rpn
										controllerMsg[channel].rpn[(val1<<7)+val2]=mess2;
										break;
									case 0b00110000: //nrpn
										controllerMsg[channel].nrpn[(val1<<7)+val2]=mess2;
										break;
									case 0xC0: //Program change
										if(mess & 0x1){
											controllerMsg[channel].bank = [mess2 >> 8 & 0x7F, mess2  & 0x7F];
										}
										controllerMsg[channel].PC = mess2 >> 24 & 0x7F;
										break;
									case 0xE0: //Pitch bend
										controllerMsg[channel].pitch = mess2;
										break;
								}
								break;
							default:
								break;
						}
					}
				}

				MidiMessageReport.controllerMsg=controllerMsg;

				resolve(MidiMessageReport);
				delete this.remoteDevicesInternal[this.midiReportModeMUID].midiMessageReport;
			});
			this.ev.once('MIDIReportBegin',(sourceDestination,systemTypesBitmap,chanContTypeBitmap,noteDataTypeBitmap)=>{
				this.remoteDevicesInternal[this.midiReportModeMUID].midiMessageReport = {
					...this.remoteDevicesInternal[this.midiReportModeMUID].midiMessageReport
					,sourceDestination, systemTypesBitmap,chanContTypeBitmap,noteDataTypeBitmap
				};
			});

			let newMIDICIMsg = this.createMIDICIMsg(null,0x42,settings.channel,remoteMuid,
				{...settings,
					group:group,
					cb:function(){}
				});
			this.completeMIDICIMsg(newMIDICIMsg, this.remoteDevicesInternal[remoteMuid].umpDev);

			setTimeout(()=>{
				this.ev.emit('MIDIReportEnd');
			},8000);
			});
	}
	buildOut(pf,mmaProf,manuProf){
		if(pf.isMMA){
			const mmaMatch = new RegExp('\('+pf.bank+':'+pf.number+'\)');
			if(!mmaProf.match(mmaMatch)){
				mmaProf += '('+pf.bank+':'+pf.number+') '+pf.name+ "\n";
			}
		}else{
			const mmaMatch2 = new RegExp('\('+pf.id1+':'+pf.id2+'\)');
			if(!manuProf.match(mmaMatch2)){
				manuProf += '('+pf.id1+':'+pf.id2+') '+"\n";
			}
		}
		return {
			manuProf,
			mmaProf
		};
	}
	buildProfile(newProfile){
		const type = newProfile.sysex[0];
		newProfile.sourceDestinations={};

		//Standard Defined Profile
		if(type === 0x7E){
			newProfile.isMMA = true;
			newProfile.bank = newProfile.sysex[1];
			newProfile.number = newProfile.sysex[2];
			newProfile.version = newProfile.sysex[3];
			newProfile.level = newProfile.sysex[4];
			//look up on profile list :)
			midi2Tables.profiles.map(function(profile){
				if(profile.number !== newProfile.number || profile.bank!==newProfile.bank) return;
				//if(this.experimentalSpecs && !profile.isApproved) return;

				newProfile.name = profile.name;
				newProfile.type = profile.type;
				newProfile.profileLevels = profile.profileLevels;
				newProfile.channels = profile.channels;
			});

		}else{
			newProfile.isMMA = false;
			const manu = getManufacturer16bit(newProfile.sysex.slice(0,3));
			newProfile.manufacturerId16 = manu.manufacturerId16;
			newProfile.manufacturerId = manu.manufacturerId;
			newProfile.manufacturerName = manu.name || 'Unknown';
			newProfile.id1 = newProfile.sysex[3];
			newProfile.id2 = newProfile.sysex[4];


		}
	}

	//***** Private (?) functions

	_peSendReply(subId, remoteMuid, requestId, resHeader, resBody = '', encType = 'ASCII'){
		const debugData = {
			title:  "Sending PE "
				//+resHeader.resource
				+" Reply ("+requestId+")"
			,errors:[]
			,header:resHeader
			,body: resBody
		};

		if(this.debug)d.msg('pe',debugData,'out',this.remoteDevicesInternal[remoteMuid].umpDev,this.remoteDevicesInternal[remoteMuid].group);
		this._sendChunks(
			{data:{remoteMuid,subId,requestId,reqHeader:resHeader,reqBody:resBody}}
			,encType);

	};

	_updateSettings(remoteMuid){
		if(this.remoteDevicesInternal[remoteMuid].file){
			clearTimeout(this._saveTimeOut);
			this._saveTimeOut = setTimeout(()=>{
				if(!this.remoteDevicesInternal[remoteMuid]) return;
				this.ciEventHandler.apply(this,
					[
						this.remoteDevicesInternal[remoteMuid].umpDev,
						this.remoteDevicesInternal[remoteMuid].group,
						'settingChange',
						remoteMuid
					]);
				if (fs.existsSync(this.remoteDevicesInternal[remoteMuid].file)){
					fs.writeFileSync(this.remoteDevicesInternal[remoteMuid].file,JSON.stringify(this.remoteDevices[remoteMuid]),{flag:'w+'});
				}
			},500);
		}
	}

	_processSubMessage(remoteMuid,requestId,reqHead,reqBody){
		const resHeader = {status:200};
		this._peSendReply(0x39, remoteMuid, requestId, resHeader);
		const subscribeId = reqHead.subscribeId;
		const subDetail = this.remoteDevicesInternal[remoteMuid].peSubscriptions[subscribeId];

		if(reqHead.command==='end'){

			subDetail.cbOnChange.map(cb=>{
				if (cb) {cb(JSON.parse(JSON.stringify(subDetail)), null, 'end'); }
			});
			this.peUnsubscribe(remoteMuid, subscribeId, true);
			return;
		}
		if(reqHead.command==='full'){
			subDetail.resBody = reqBody;
			subDetail.cbOnChange.map(cb=>{
				if (cb) {cb(JSON.parse(JSON.stringify(subDetail)), reqBody, 'full'); }
			});
			return;
		}

		if(reqHead.command==='notify'){
			this.sendPE(0x34, remoteMuid, subDetail.reqHead,null,true)
				.then(([,,resBody,])=>{
				subDetail.resBody = resBody;
				subDetail.cbOnChange.map(cb=>{
					if (cb) {cb(JSON.parse(JSON.stringify(subDetail)), resBody, 'full'); }
				});

			});
			return;
		}
		if(reqHead.command==='partial'){
			const errors=[];
			for(let jpath in reqBody) {
				//this.setData(remoteMuid,subDetail.resBody,jpath,reqBody[jpath]);
				if (["string", 'number', 'boolean'].indexOf(typeof reqBody[jpath]) === -1) {
					errors.push(jpath + ' is not a string, number or boolean');
				}
			}
			if(errors.length){
				const debugData = {
					title:  "Validation Error(s) Partial"
					,errors
					,header:reqHead
					,body: reqBody || null
				};
				if(this.debug)d.msg('pe',debugData,'in',this.remoteDevicesInternal[remoteMuid].umpDev,group);
			}else{
				for(let jpath in reqBody){
					ptr.set(subDetail.resBody,jpath, reqBody[jpath], true);
				}
				subDetail.cbOnChange.map(cb=>{
					if(cb)cb(JSON.parse(JSON.stringify(subDetail)),subDetail.resBody,'partial',reqBody);
				});
			}


		}
	}

	_exclusiveEndCheck (msgObj, offset){
		if(msgObj.sysex[offset]!==0xF7 ){
			msgObj.debug.addError("Exclusive end Check Fail",0x21);
			msgObj.debug.addDebug(offset,1,"Not End of Exclusive",d.arrayToHex([msgObj.sysex[offset]]),{type:"error"});
		}else{
			msgObj.debug.addDebug(offset,1,"End Universal System Exclusive");
		}
	}

	_sendChunks(streamObj,encType =  'ASCII'){
		const remoteMuid = streamObj.data.remoteMuid;
		const subId = streamObj.data.subId;
		const reqHeader = streamObj.data.reqHeader;
		const reqBody = streamObj.data.reqBody;

		const maxPayload = this.remoteDevices[remoteMuid].maxSysex - 24;

		if(encType!=='ASCII'){
			reqHeader.mutualEncoding=encType;
		}

		const payloadHeader = objectToPayload('ASCII', reqHeader, {});
		let payloadBody = [];
		if(reqBody){
			payloadBody = objectToPayload(subId === 0x34 ? 'ASCII' : encType, reqBody, reqHeader);
		}
		const chunkTotal = Math.ceil((payloadHeader.length + payloadBody.length)/maxPayload);

		let headerSent=false;
		let start=0;
		let chunkNumber=1;


		const sendNextChunk = () =>{
			let totalPayloadLeft = maxPayload;
			let payloadHeaderChunk = [];
			let payloadBodyChunk = [];
			if(!headerSent){
				payloadHeaderChunk = payloadHeader.slice(start, start + maxPayload);
				totalPayloadLeft -= payloadHeaderChunk.length;
				start+=payloadHeaderChunk.length;
				if(start + maxPayload > payloadHeader.length){
					headerSent=true;
					start=0;
				}
			}

			if(totalPayloadLeft>0){
				payloadBodyChunk = payloadBody.slice(start, start + totalPayloadLeft );
				start+=payloadBodyChunk.length;
			}

			payloadHeaderChunk.map(function (v) {
				if(v > 127 ) debugger;
			})

			const newResponse = this.createMIDICIMsg(this._muid
				, subId,0x7F, remoteMuid,{
				group: this.remoteDevicesInternal[remoteMuid].group,
				totalChunks: chunkTotal,
				currentChunk: chunkNumber,
				payloadHeaderChunk: payloadHeaderChunk,
				payloadBodyChunk: payloadBodyChunk,
				requestId: streamObj.data.requestId,
			});
			this.completeMIDICIMsg(newResponse, this.remoteDevicesInternal[remoteMuid].umpDev);

			if(payloadBodyChunk.length){
				//console.log("payload size :"+payloadBodyChunk.length);
//				console.log((Array.from(payloadBodyChunk)).join());
			}

			if(chunkTotal>1){
				console.log("sent sysex:"+s.now()+'--' +streamObj.data.requestId+ ':' + chunkNumber+" "+ chunkTotal);
				//await timer(700);

			}
			if(chunkNumber!==chunkTotal){
				chunkNumber++;
				setTimeout(sendNextChunk,this.configSetting.sysexTimer);
			}else{

			}
		};
		sendNextChunk();

	}

}
module.exports.midici = midici;

//*****************************


function payloadToObject(sysexPayload,header) {
	let doHeaderChecks = !header;
	header = header || {};
	let mediaType = header.mediaType || "application/json";

	if(header.mutualEncoding){
		//header.encoding.map(function(encode){
		switch(header.mutualEncoding){
			case 'ASCII': //do nothing
				break;
			case 'Mcoded7':
				sysexPayload = t.arr7BitTo8Bit(sysexPayload);
				sysexPayload = [].slice.call(sysexPayload);
				break;
			case 'zlib+Mcoded7':
				sysexPayload = t.arr7BitTo8Bit(sysexPayload);
				try{
					sysexPayload = pako.inflate(sysexPayload);
				}
				catch (e){
					return {success:false,error:"zlib inflate error: "+e, payloadText:''};
				}

				sysexPayload = [].slice.call(sysexPayload);
				break;
			default:
				debugger; //Want to know
		}
	}

	if(mediaType.match(/^text\//)){
		return {success: true, payload: sysexPayload.map((v) => {
			return String.fromCharCode(v);
		}).join('')};
	}

	if (mediaType !== 'application/json'){
		return {success:true,payload: new Uint8Array(sysexPayload)};
	}

	const payload = t.unicodeToChar(sysexPayload.map((v) => {
		return String.fromCharCode(v);
	}).join(''));
	if(!payload) return {success:true,payload:null};

	if(doHeaderChecks){
		//Lets check the format of the header Common Rules for PE has strict guidelines on order and whitespace
		//Check if the first Property is resource,status or command
		if(!payload.match(/^{"(resource|status|command)"/)){
			return {success:false,error:"The first header property is not resource, status or command.",payloadText:payload};
		}
		//No whitespace between except in strings
		if(payload.replace(/\\"/g,'').replace(/"[^"]*"/g,'').match(/\s/g)){
			return {success:false,error:"There is whitespace in the header",payloadText:payload};
		}
	}

	try{
		let payloadParsed = JSON.parse(payload);
		if(doHeaderChecks){
			//Lets check the format of the header Common Rules for PE has strict guidelines property values
			//All props are either number, boolean or string
			const keyValueLengths={resource:36, resId:36,message:512};
			const keys = Object.keys(payloadParsed);
			for(let i=0;i<keys.length;i++){
				let keyName =keys[i];
				if(keyName.length>20){
					return {success:false,error: keyName+" is too long for a key name",payloadText:payload};
				}
				if(!~["string","boolean","number"].indexOf(typeof payloadParsed[keyName])){
					return {success:false,error: keyName+" is not a number, string or boolean.",payloadText:payload};
				}
				if(keyValueLengths[keyName] && payloadParsed[keyName].length>keyValueLengths[keyName]){
					return {success:false,error: keyName+" value is too long.",payloadText:payload};
				}
			}
		}
		return {success:true,payload:payloadParsed,payloadText:payload};
	}catch (e) {
		return {success:false,error:e.message,payloadText:payload};
	}
}

function objectToPayload(encType,obj,header){
	header = header || {};
	const mediaType = header.mediaType || 'application/json';

	if (mediaType === 'application/json'){
		obj = JSON.stringify(obj);
		//obj = t.strToUnicode(obj);
		//obj = obj.split("").map(function(c){return c.charCodeAt(0);});
	}

	switch(encType){
		case 'ASCII':
			obj = t.strToUnicode(obj);
			obj = obj.split("").map(function(c){return c.charCodeAt(0);});
			break;

		case 'Mcoded7':
			if(typeof obj == "string"){
				obj = new TextEncoder("utf-8").encode(obj);
			}
			//console.log(Array.from(obj));
			obj = t.arrTobit7array(obj);

			break;
		case 'zlib+Mcoded7':
			obj = pako.deflate(obj);
			obj = t.arrTobit7array(obj);
			break;
		default:
			debugger; //Want to know
	}
	return obj;
}






