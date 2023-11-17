/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

const {profiles} = require('./profiles.js');

exports.ciProtocols = {
	umpmidi10: {
		name: 'MIDI 1.0'
		, sysex: [0x01, 0x00, 0x00, 0x00, 0x00]
	 },
	umpmidi10jr: {
		name: 'MIDI 1.0 + JR'
		, sysex: [0x01, 0x00, 0x01, 0x00, 0x00]
	},
	umpmidi10mixed: {
		name: 'MIDI 1.0 + Mixed Messages'
		, sysex: [0x01, 0x00, 0x02, 0x00, 0x00]
	},
	umpmidi10mixedjr: {
		name: 'MIDI 1.0 + JR, Mixed Messages'
		, sysex: [0x01, 0x00, 0x03, 0x00, 0x00]
	},
	umpmidi20: {
		name: 'MIDI 2.0'
		, sysex: [0x02, 0x00, 0x00, 0x00, 0x00]
	},
	umpmidi20jr: {
		name: 'MIDI 2.0 + JR'
		, sysex: [0x02, 0x00, 0x01, 0x00, 0x00]
	}
};

exports.ciTypes = {
	0x70:{
		title:'Discovery Request'
		,header:[
			['manufacturerId','familyId','modelId','versionId','ciSupport','maxSysex'],
			['outputPathId']
		]
		,reply:0x71
		,recvEvent:{
			name:'discoveryRequest'
			,args:['muid','device','ciVer','ciSupport','maxSysex','outputPathId']
		},
		addedFrom: 0x01
	}
	,0x71:{
		title:'Discovery Reply'
		,header:[
			['manufacturerId','familyId','modelId','versionId','ciSupport','maxSysex'],
			['outputPathId','fbIdx']
		]
		,recvEvent:{
			name:'discoveryReply'
			,args:['muid','device','ciVer','ciSupport','maxSysex','outputPathId','fbIdx']
		},
		addedFrom: 0x01
		
	}
	,0x72:{
		title:'Inquiry: Endpoint Information'
		,header:[
			[],
			['epStatus']
		]
		,reply:0x73
		,recvEvent:{
			name:'endpointInformation'
			,args:['muid','epStatus']
		},
		addedFrom: 0x02
	}
	,0x73:{
		title:'Reply to Endpoint Information'
		,header:[
			[],
			['epStatus','lenOfInfo','informationData']
		]
		,recvEvent:{
			name:'replyToEndpointInformation'
			,args:['muid','epStatus','informationData']
		},
		addedFrom: 0x02
	}
	,0x7D:{
		title:'MIDI-CI ACK'
		,header:[
			[],
			['originalSubId','statusCode','statusData','ackNakDetails','messageLength','ackNakMessage']
		]
		,recvEvent:{
			name:'ack'
			,args:['muid','originalSubId','statusCode','statusData','ackNakDetails','ackNakMessage']
		}
		,srcDestChannel:true,
		addedFrom: 0x02
	}
	,0x7E:{
		title:'Invalidate MUID'
		,header:[['targetMuid']]
		,recvEvent:{
			name:'InvalidRemoteID'
			,args:['targetMuid']
		},
		addedFrom: 0x01
	}
	,0x7F:{
		title:'MIDI-CI NAK'
		,header:[
			[],
			['originalSubId','statusCode','statusData','ackNakDetails','messageLength','ackNakMessage']
		]
		,recvEvent:{
			name:'nak'
			,args:['muid','originalSubId','statusCode','statusData','ackNakDetails','ackNakMessage']
		}
		,srcDestChannel:true,
		addedFrom: 0x01
	}

	
	//Protocol Negotiation
	,0x10:{
		title:'Initiate Protocol Negotiation Message'
		,header:[
			['authorityLevel','protocolCount','protocolList'],
			['currentProtocol']
		]
		,reply:0x11
		,recvEvent:{
			name:'protocolNegotiation'
			,args:['muid','authorityLevel','protocolList','currentProtocol']
		},
		addedFrom: 0x01
	}
	,0x11:{
		title:'Reply to Initiate Protocol Negotiation Message'
		,header:[
			['authorityLevel','protocolCount','protocolList'],
			['currentProtocol']
		]
		,recvEvent:{
			name:'recvProtocols'
			,args:['muid','authorityLevel','protocolList','currentProtocol']
		},
		addedFrom: 0x01
	}
	,0x12:{
		title:'Set New Protocol Message'
		,header:[['authorityLevel','protocol']]
		//,followup:0x13
		,recvEvent:{
			name:'setProtocol'
			,args:['muid','authorityLevel','protocol']
		},
		addedFrom: 0x01
	}
	,0x13:{
		title:'Test New Protocol Initiator to Responder Message'
		,header:[['authorityLevel','protocolNumbers']]
		,reply:0x14
		,recvEvent:{
			name:'testNewProtocol'
			,args:['muid','authorityLevel']
		}
		,deprecatedFrom:0x02,
		addedFrom: 0x01
		
	}
	,0x14:{
		title:'Test New Protocol Responder to Initiator Message'
		,header:[['authorityLevel','protocolNumbers']]
		,reply:0x15
		,recvEvent:{
			name:'testNewProtocolResponder'
			,args:['muid','authorityLevel']
		}
		,deprecatedFrom:0x02,
		addedFrom: 0x01
	}
	,0x15:{
		title:'Confirmation New Protocol Established Message'
		,header:[['authorityLevel']]
		,recvEvent:{
			name:'confirmProtocol'
			,args:['muid','authorityLevel']
		},
		addedFrom: 0x01
	}
	
	
	//Profiles
	,0x20:{
		title:'Profile Inquiry Message'
		,header:[]
		,reply:0x21
		//,multiReply:true
		,srcDestChannel:true
		,recvEvent:{
			name:'profileInquiry'
			,args:['sourceDestination','muid']
		},
		addedFrom: 0x01
	}
	,0x21:{
		title:'Reply to Profile Inquiry Message'
		,header:[['enabledProfileCount','enabledProfileList','disabledProfileCount','disabledProfileList']]
		,recvEvent:{
			name:'profileReplyList'
			,args:['sourceDestination','muid','profiles']
		}
		,srcDestChannel:true,
		addedFrom: 0x01
	}



	,0x22:{
		title:'Set Profile On Message'
		,header:[['profile'],['numberOfChannels']]
		,recvEvent:{
			name:'profileOn'
			,args:['sourceDestination','muid','profile','numberOfChannels']
		}
		,srcDestChannel:true,
		addedFrom: 0x01
	}
	,0x23:{
		title:'Set Profile Off Message'
		,header:[['profile'],['numberOfChannels']]
		,recvEvent:{
			name:'profileOff'
			,args:['sourceDestination','muid','profile','numberOfChannels']
		}
		,srcDestChannel:true,
		addedFrom: 0x01
	}
	,0x24:{
		title:'Profile Enabled Report Message'
		,header:[['profile'],['numberOfChannels']]
		,recvEvent:{
			name:'profileEnabled'
			,args:['sourceDestination','muid','profile','numberOfChannels']
		}
		,srcDestChannel:true,
		addedFrom: 0x01
	}
	,0x25:{
		title:'Profile Disabled Report Message'
		,header:[['profile'],['numberOfChannels']]
		,recvEvent:{
			name:'profileDisabled'
			,args:['sourceDestination','muid','profile','numberOfChannels']
		}
		,srcDestChannel:true,
		addedFrom: 0x01
	}

	,0x26:{
		title:'Profile Added Report Message'
		,header:[[],['profile']]
		,recvEvent:{
			name:'profileAdd'
			,args:['sourceDestination','muid','profile']
		}
		,srcDestChannel:true,
		addedFrom: 0x02
	}

	,0x27:{
		title:'Profile Removed Report Message'
		,header:[[],['profile']]
		,recvEvent:{
			name:'profileRemove'
			,args:['sourceDestination','muid','profile']
		}
		,srcDestChannel:true,
		addedFrom: 0x02
	}


	,0x28:{
		title:'Profile Details Inquiry Message'
		,header:[
			[],
			['profile','inquiryTarget']
		]
		,reply:0x27
		,srcDestChannel:true
		,recvEvent:{
			name:'profileDetailsInquiry'
			,args:['sourceDestination','muid','profile','inquiryTarget']
		},
		addedFrom: 0x02
	}
	,0x29:{
		title:'Reply to Profile Details Inquiry Message'
		,header:[
			[],
			['profile','inquiryTarget','targetDataLength','targetData']
		]
		,recvEvent:{
			name:'profileDetailsReply'
			,args:['sourceDestination','muid','profile','inquiryTarget','targetData']
		}
		,srcDestChannel:true,
		addedFrom: 0x02
	}


	,0x2F:{
		title:'Profile Specific Data message'
		,header:[['profile', 'profileDataLength', 'profileSpecificData']]
		,recvEvent:{
			name:'profileSpecificData'
			,args:['sourceDestination', 'muid', 'profile', 'profileSpecificData']
		}
		,srcDestChannel:true,
		addedFrom: 0x01
	}
	
	//Property Exchange
	,0x30:{
		title:'Inquiry: Property Exchange Capabilities'
		,header:[['simultaneousPERequests'],['peVersion']]
		,reply:0x31
		,recvEvent:{
			name:'peCapabilities'
			,args:['muid','simultaneousPERequests','peVersion']
		},
		addedFrom: 0x01

	}
	,0x31:{
		title:'Reply to Property Exchange Capabilities'
		,header:[['simultaneousPERequests'],['peVersion']]
		,recvEvent:{
			name:'peCapabilitiesRecv'
			,args:['muid','simultaneousPERequests','peVersion']
		},
		addedFrom: 0x01
	}
	,0x34:{
		title:'Inquiry: Get Property Data'
		,streams:'none'
		,header:[['requestId','headerLength','header','totalChunks','currentChunk','propertyDataLength','propertyData']]
		,reply:0x35
		,recvEvent:{
			name:'peGetRequest'
			,args:['muid','requestId','reqHead']
		}
		,chunkAck:true
		,addedFrom: 0x01
		,allowedHeaderSchema:{
			"type": "object",
			"properties": {
				"resId": {"type": "string", "maxLength": 36},
				"resource": {"type": "string", "maxLength": 36},
				"offset": {"type": "integer", "minimum": 0},
				"limit": {"type": "integer", "minimum": 0},
				"mutualEncoding": {"type": "string","enum":["ASCII", "Mcoded7", "zlib+Mcoded7"]},
				"path": {"type": "string"},
			},
			"additionalProperties": false,
			"required": [
				"resource"
			]
		}
	}
	,0x35:{
		title:'Reply to Get Property Data'
		,streams:'reply'
		,header:[['requestId','headerLength','header','totalChunks','currentChunk','propertyDataLength','propertyData']]
		,recvEvent:{
			name:'peGetResponse'
			,args:['muid','resHead','resBody','reqHead']
		},
		addedFrom: 0x01
		,allowedHeaderSchema:{
			"type": "object",
			"properties": {
				"status": {"type": "integer", enum: [200, 202, 341, 342, 343, 400, 403, 404, 405, 413, 415, 445, 500]},
				"totalCount": {"type": "integer", "minimum": 0},
				"cacheTime": {"type": "integer", "minimum": 0},
				"mutualEncoding": {"type": "string","enum":["ASCII", "Mcoded7", "zlib+Mcoded7"]},
				"mediaType": {"type": "string"},
				"message": {"type": "string"},
				"stateRev": {"type": "string"},
				"timestamp": {"type": "integer", "minimum": 0}
			},
			"additionalProperties": false,
			"required": [
				"status"
			]
		}
	}
	,0x36:{
		title:'Inquiry: Set Property Data'
		,streams:'request'
		,header:[['requestId','headerLength','header','totalChunks','currentChunk','propertyDataLength','propertyData']]
		,recvEvent:{
			name:'peSetRequest'
			,args:['muid','requestId','reqHead','reqBody']
		}
		,reply:0x37
		,chunkAck:true,
		addedFrom: 0x01
		,allowedHeaderSchema:{
			"type": "object",
			"properties": {
				"resId": {"type": "string", "maxLength": 36},
				"resource": {"type": "string", "maxLength": 36},
				"mutualEncoding": {"type": "string","enum":["ASCII", "Mcoded7", "zlib+Mcoded7"]},
				"path": {"type": "string"},
				"mediaType": {"type": "string"},
				"setPartial": {"type": "boolean"},
				"stateRev": {"type": "string"}
			},
			"additionalProperties": false,
			"required": [
				"resource"
			]
		}
	}
	,0x37:{
		title:'Reply to Set Property Data'
		,streams:'none'
		,header:[['requestId','headerLength','header','totalChunks','currentChunk','propertyDataLength','propertyData']]
		,recvEvent:{
			name:'peSetResponse'
			,args:['muid','resHead','resBody','reqHead','reqBody']
		},
		addedFrom: 0x01
		,allowedHeaderSchema:{
			"type": "object",
			"properties": {
				"status": {"type": "integer", enum: [200, 202, 341, 342, 343, 400, 403, 404, 405, 413, 415, 445, 500]},
				"mutualEncoding": {"type": "string","enum":["ASCII", "Mcoded7", "zlib+Mcoded7"]},
				"message": {"type": "string"}
			},
			"additionalProperties": false,
			"required": [
				"status"
			]
		}
	}
	,0x38:{
		title:'Subscription'
		,streams:'request'
		,header:[['requestId','headerLength','header','totalChunks','currentChunk','propertyDataLength','propertyData']]
		,recvEvent:{
			name:'peSubRequest'
			,args:['muid','requestId','reqHead','reqBody']
		}
		,reply:0x39,
		addedFrom: 0x01
		,allowedHeaderSchema:{
			"type": "object",
			"properties": {
				"resId": {"type": "string", "maxLength": 36},
				"resource": {"type": "string", "maxLength": 36},
				"subscribeId": {"type": "string", "maxLength": 8},
				"command": {"type": "string","enum":["start", "partial", "full", "notify"]}
			},
			"additionalProperties": false,
			"required": [
				"command"
			]
		}
	}
	,0x39:{
		title:'Reply to Subscription'
		,streams:'none'
		,header:[['requestId','headerLength','header','totalChunks','currentChunk','propertyDataLength','propertyData']]
		,recvEvent:{
			name:'peSubResponse'
			,args:['muid','resHead','resBody','reqHead','reqBody']
		},
		addedFrom: 0x01
		,allowedHeaderSchema:{
			"type": "object",
			"properties": {
				"status": {"type": "integer", enum:[200, 202, 341, 342, 343, 400, 403, 404, 405, 413, 415, 445, 500]},
				"subscribeId": {"type": "string", "maxLength": 8},
				"message": {"type": "string"}
			},
			"additionalProperties": false,
			"required": [
				"status"
			]
		}
	}
    ,0x3F:{
        title:'Notify Message'
        ,streams:'none'
        ,header:[['requestId','headerLength','header','totalChunks','currentChunk','propertyDataLength','propertyData']]
        ,recvEvent:{
            name:'notifyMessage'
            ,args:['muid','requestId','reqHead','reqBody']
        },
		addedFrom: 0x01
		,allowedHeaderSchema:{
			"type": "object",
			"properties": {
				"status": {"type": "integer", enum:[100,144,408]},
				"message": {"type": "string"}
			},
			"additionalProperties": false,
			"required": [
				"status"
			]
		}
    }

	//****** Process Inquiry *****
	,0x40:{
		title:'Process Inquiry Message'
		,header:[]
		,reply:0x41,
		addedFrom: 0x02,
		recvEvent:{
			name:'processInquiryCapabilities'
			,args:['processInquiryBitmap']
		},
	}
	,0x41:{
		title:'Reply to Process Inquiry Message'
		,header:[[],['processInquiryBitmap']]
		,recvEvent:{
			name:'processInquiryCapabilitiesReply'
			,args:['processInquiryBitmap']
		},
		addedFrom: 0x02
	}
	,0x42:{
		title:'Inquiry: MIDI Message Report'
		,header:[[],['messageDataControl','systemTypesBitmap','chanContTypeBitmap','noteDataTypeBitmap']]
		,recvEvent:{
			name:'processInquiryMIDIMessageReport'
			,args:['sourceDestination','messageDataControl','systemTypesBitmap','chanContTypeBitmap','noteDataTypeBitmap']
		}
		,reply:0x43
		,srcDestChannel:true,
		addedFrom: 0x02
	}
	,0x43:{
		title:'Reply to MIDI Message Report (Begin)'
		,header:[[],['systemTypesBitmap','chanContTypeBitmap','noteDataTypeBitmap']]
		,recvEvent:{
			name:'processInquiryMIDIMessageReportBegin'
			,args:['sourceDestination','systemTypesBitmap','chanContTypeBitmap','noteDataTypeBitmap']
			,getCB: (midiCI,msgObj) => {
				return (...args)=>{
					let [sourceDestination, messageDataControl, systemTypesBitmap, chanContTypeBitmap, noteDataTypeBitmap] = args;
					if(midiCI.remoteDevicesInternal[midiCI.midiReportModeMUID].midiMessageReport.sourceDestination!==sourceDestination){
						msgObj.debug.addError('Begin Report Src/Dest does not match expected Src/Dest from Inquiry Message',0x00);
					}
					midiCI.midiReportModeMUID = msgObj.muid;
					midiCI.ev.emit('MIDIReportBegin', sourceDestination, messageDataControl, systemTypesBitmap, chanContTypeBitmap, noteDataTypeBitmap);

				}
			}
		}
		,srcDestChannel:true,
		addedFrom: 0x02
	}
	,0x44:{
		title:'Reply to MIDI Message Report (End)'
		,header:[]
		,recvEvent:{
			name:'processInquiryMessageReportEnd'
			,args:['sourceDestination']
			,getCB: (midiCI,msgObj) => {
				return (...args)=>{
					let [sourceDestination] = args;
					if(midiCI.remoteDevicesInternal[midiCI.midiReportModeMUID].midiMessageReport.sourceDestination!==sourceDestination){
						msgObj.debug.addError('End Report Src/Dest does not match expected Src/Dest from Inquiry Message',0x00);
					}
					midiCI.ev.emit('MIDIReportEnd', sourceDestination);
					midiCI.midiReportModeMUID = null;
				}
			}
		}
		,srcDestChannel:true,
		addedFrom: 0x02
	}
};

exports.messageFormatLookup = ['1.0','1.1','1.2'];

exports.profiles=profiles;


// exports.JSONSchema = {
// 	"ResourceList":{
// 		"$ref":"http://schema.midi.org/property-exchange/M2-103-S_v1-0_ResourceList.json"
// 	}
// };

exports.resourceSchema = {
	//Voted
	"ResourceList":{
		resource:"ResourceList",
		"requireResId": false,
		canGet:true,
		canSet:"none",
		canSubscribe:false,
		"schema": {
			"$ref":"http://schema.midi.org/property-exchange/M2-103-S_v1-0_ResourceList.json"
		}
	},
	"DeviceInfo":{
		resource:"DeviceInfo",
		"requireResId": false,
		canGet:true,
		canSet:"none",
		canSubscribe:false,
		"schema": {
			"$ref":"http://schema.midi.org/property-exchange/M2-105-S_v1-0_DeviceInfo.json"
		}
	},
	"ChannelList": {
		resource: "ChannelList",
		"requireResId": false,
		canGet: true,
		canSet: "none",
		canSubscribe:false,
		"schema":{
			"$ref":"http://schema.midi.org/property-exchange/M2-105-S_v1-1_ChannelList.json"
		},
		columns:[
			{"property": "title", "title": "Title"},
			{"property": "channel", "title": "MIDI Channel"},
			{"property": "programTitle", "title": "Program Title"},
			{"link": "ProgramList", "title": "Program List"}
		]
	},
	"JSONSchema":{
		"resource": "JSONSchema",
		"canGet": true,
		"canSet": "none",
		"canSubscribe":false,
		"requireResId": true,
		"schema":{
			"type": "object",
			"title": "JSON Schema",
			"$ref": "http://json-schema.org/draft-04/schema"
		}
	},
	"ModeList":{
		"resource": "ModeList",
		"canGet": true,
		"canSet": "none",
		"canSubscribe":false,
		"pagination": false,
		"requireResId": false,
		"schema":{
			"$ref":"http://schema.midi.org/property-exchange/M2-105-S_v1-0_ModeList.json"
		},
		"columns":[
			{"property": "title", "title": "Mode"},
			{"property": "description", "title": "Description"}
		]
	},
	"CurrentMode":{
		"resource": "CurrentMode",
		"canGet": true,
		"canSet": "full",
		"canSubscribe":false,
		"requireResId": false,
		"schema":{
			"type": "string",
			"title": "Current Mode",
			"maxLength": 36
		}
	},
	"ProgramList": {
		resource: "ProgramList",
		canGet: true,
		requireResId:true,
		canSet: "none",
		canSubscribe: false,
		canPaginate:true,
		"schema":{
			"$ref":"http://schema.midi.org/property-exchange/M2-105-S_v1-0_ProgramList.json"
		},
		columns:[
			{property:"title"},
			{property:"category"},
			{property:"tags"}
		]
	},
	"ExternalSync":{
		"resource": "ExternalSync",
		"canGet": true,
		"canSet": "full",
		"canSubscribe": false,
		"requireResId": false,
		"schema": {
			"title": "External Timing Sync",
			"type": "boolean",
			"description": "Get or set whether the Device's clock will synchronize to external MIDI sync related System Real Time Messages"
		}
	},
	"LocalOn":{
		"resource":"LocalOn",
		"canGet":true,
		"canSet":"full",
		canOverrideSet: true,
		"canSubscribe":false,
		"requireResId":false,
		"schema":{
			"title":"Local On",
			"type":"boolean",
			"description":"Local on/off state. Will return true if Local is on."
		}
	},
	"ChannelMode":{
		"resource":"ChannelMode",
		"canGet":true,
		"canSet":"none",
		"canSubscribe":false,
		"requireResId":false,
		"schema":{
			"title":"Channel Mode",
			"type":"number",
			"minimum":1,
			"maximum":4,
			"multipleOf":1,
			"description":"This is the Channel Mode value. It is one of the following values:\n1.Omni On Poly\n2.Omni On Mono\n3.Omni Off Poly\n4.Omni Off Mono"
		}
	},
	"BasicChannelRx":{
		"resource":"BasicChannelRx",
		"canGet":true,
		"canSet":"full",
		"canSubscribe":false,
		"requireResId":false,
		"schema":{
			"title":"Basic Channel Receive",
			"type":"number",
			"minimum":1,
			"maximum":16,
			"multipleOf":1
		}
	},
	"BasicChannelTx":{
		"resource":"BasicChannelTx",
		"canGet":true,
		"canSet":"full",
		"canSubscribe":false,
		"requireResId":false,
		"schema":{
			"title":"Basic Channel Receive",
			"type":"number",
			"minimum":1,
			"maximum":16,
			"multipleOf":1
		}
	},
	"State":{
		"resource": "State",
		"canGet": true,
		"canSet": "full",
		"requireResId": true,
		"canSubscribe": false,
		"encodings":["Mcoded7"],
		"mediaTypes":["application/octet-stream"],
		"schema":{
			"title": "State"
		}
	},
	"StateList": {
		"resource": "StateList",
		"canGet": true,
		"canSet": "none",
		"canSubscribe": false,
		"canPaginate": false,
		"requireResId": false,
		"schema": {
			"$ref": "http://schema.midi.org/property-exchange/M2-112-S_v1-0_StateList.json"
		},
		"columns": [
			{"property": "title", "title": "Title"},
			{"property": "timestamp", "title": "UTC timestamp"},
			{"property": "description", "title": "Description"}
		]
	},
	"MaxSysex8Streams":{
		"resource": "MaxSysex8Streams",
		"canGet": true,
		"canSet": "none",
		"canSubscribe": false,
		"requireResId": false,
		"schema": {
			"title": "Max SysEx 8 Streams",
			"type": "integer",
			"minimum": 0,
			"maximum": 255,
			"description": "The number of simultaneous SysEx8 Stream IDs supported.\n0 = Receiver does not support any System " +
				"Exclusive 8 messages.\n1 = Receiver does not support multiple, simultaneous System Exclusive 8 messages.\n2 –" +
				"255 = The number of simultaneous System Exclusive 8 Stream IDs supported"
		}
	},
	"AllCtrlList": {
		resource: "AllCtrlList",
		requireResId:false,
		canGet: true,
		canSet: "none",
		canSubscribe: false,
		canPaginate: false,
		"schema": {
			"$ref":"http://schema.midi.org/property-exchange/M2-117-S_v1-0_AllCtrlList.json"
		},
		columns:[
			{property:"title"},{property:"channel"},{property: "ctrlType"},{property: "ctrlIndex"}
		]
	},
	"ChCtrlList": {
		resource: "CtrlList",
		requireResId:true,
		canGet: true,
		canSet: "none",
		canSubscribe: false,
		canPaginate: false,
		"schema": {
			"$ref":"http://schema.midi.org/property-exchange/M2-117-S_v1-0_ChCtrlList.json"
		},
		columns:[
			{property:"title"},{property: "ctrlType"},{property: "ctrlIndex"}
		]
	},
	"CtrlMapList": {
		resource: "CtrlMapList",
		requireResId:true,
		canGet: true,
		canSet: "none",
		canSubscribe: false,
		canPaginate: false,
		"schema": {
			"$ref":"http://schema.midi.org/property-exchange/M2-117-S_v1-0_CtrlMapList.json"
		},
		columns:[{property:"title"},{property: "value"}]
	}
};







