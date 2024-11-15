/* (C) Copyright 2023 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

const defMapLists = {
	volume:[
		{value:0,"title":"-infinity"},
		{value:0x20000000,"title":"-36.0 dB"},
		{value:0x40000000,"title":"-23.9 dB"},
		{value:0x80000000,"title":"-11.9 dB"},
		{value:0xC1041041,"title":"-4.9 dB"},
		{value:0xFFFFFFFF,"title":"0 dB"}
	],
	holdHalfPedal:[
		{value:0,"title":"Up"},
		{value:0x60000000,"title":"Half Pedal Start"},
		{value:0xA0000000,"title":"Half Pedal End"},
		{value:0xFFFFFFFF,"title":"Down"}
	]
}


exports.profiles=[
	{
		bank:0x21
		,index:0x00
		,name:'Default Control Change Mapping'
		,type:'singleChannel'
		,channels:[]
		,profileLevels:{
			0x00:'Some Implementation but Not to Minimum Requirements'
			,0x01:'Meets Minimum Requirements'
		}
		,CtrlList:[
			{
				title:"Bank Select MSB",
				ctrlType:"cc",
				numSigBits:7,
				ctrlIndex:[0],
				typeHint:'number'
			},{
				title:"Bank Select LSB",
				ctrlType:"cc",
				numSigBits:7,
				ctrlIndex:[32],
				typeHint:'number'
			},{
				title:"Modulation Wheel or Lever",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[1,33],
				default:0
			},{
				title:"Breath Controller",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[2,34],
				default:0
			},{
				title:"Foot Controller",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[4,36],
				default:0
			},{
				title:"Portamento Time",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[5,37],
				default:0
			}
			//DATA entry 6,38??

			,{
				"title":"Channel Volume Control Change"
				,ctrlType:"cc"
				,numSigBits:14
				,description:"If the device creates a sound, the device must respond to CC #07. This controller controls the volume of all sounds on the specified MIDI Channel and thus the relative volume balance among the Channels."
				,ctrlIndex:[7,39]
				,contMapList: defMapLists['volume']
			},{
				title:"Balance",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[8,40],
				default:2147483648
			},{
				title:"Pan",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[10,42]
			},{
				title:"Expression Controller",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[11,43],
				default:4294967295
			},{
				title:"Effect Control 1",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[12,44],
				default:0
			},{
				title:"Effect Control 2",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[13,45],
				default:0
			},{
				title:"General Purpose Controller 1",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[16,48]
			},{
				title:"General Purpose Controller 2",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[17,49]
			},{
				title:"General Purpose Controller 3",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[18,50]
			},{
				title:"General Purpose Controller 4",
				ctrlType:"cc",
				numSigBits:14,
				ctrlIndex:[19,51]
			},{
				"title":"Damper Pedal on/off (Sustain)"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[64]
				,typeHint: "button",
				default:0
			},{
				"title":"Portamento On/Off"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[65]
				,typeHint: "button",
				default:0
			},{
				"title":"Sostenuto On/Off"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[66]
				,typeHint: "button",
				default:0
			},{
				"title":"Soft Pedal On/Off"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[67]
				,typeHint: "button",
				default:0
			},{
				"title":"Legato Footswitch"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[68]
				,typeHint: "button",
				default:0
			},{
				"title":"Hold 2"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[69]
				,typeHint: "button",
				default:0
			},{
				"title":"Sound Controller 1 (default: Sound Variation)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[70]
			},{
				"title":"Sound Controller 2 (default: Timbre/Harmonic Intens.)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[71]
			},{
				"title":"Sound Controller 3 (default: Release Time)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[72]
			},{
				"title":"Sound Controller 4 (default: Attack Time)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[73]
			},{
				"title":"Sound Controller 5 (default: Brightness)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[74]
			},{
				"title":"Sound Controller 6 (default: Decay Time - see MMA RP-021)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[75]
			},{
				"title":"Sound Controller 7 (default: Vibrato Rate - see MMA RP-021)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[76]
			},{
				"title":"Sound Controller 8 (default: Vibrato Depth - see MMA RP-021)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[77]
			},{
				"title":"Sound Controller 9 (default: Vibrato Delay - see MMA RP-021)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[78]
			},{
				"title":"Sound Controller 10 (default undefined - see MMA RP-021)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[79]
			},{
				"title":"General Purpose Controller 5"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[80]
				,default: 0
			},{
				"title":"General Purpose Controller 6"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[81]
				,default: 0
			},{
				"title":"General Purpose Controller 7"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[82]
				,default: 0
			},{
				"title":"General Purpose Controller 8"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[83]
				,default: 0
			},{
				"title":"Portamento Control"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[84]
			}
			//88 High numSigBits Prefix
			,{
				"title":"Effects 1 Depth  (default: Reverb Send Level - see MMA RP-023)"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[91]
			},{
				"title":"Effects 2 Depth"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[92]
			},{
				"title":"Effects 3 Depth (default: Chorus Send Level - see MMA RP-023) "
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[93]
			},{
				"title":"Effects 4 Depth"
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[94]
			},{
				"title":"Effects 5 Depth "
				,ctrlType:"cc"
				,numSigBits:7
				,ctrlIndex:[95]
			}
			//96 Data increment
			//97 Data Decrement
			//98 NRPN lSB
			//99 NRPN MSB
			//100 RPN LSB
			//101 RPN MSB
			,{
				"title":"[Channel Mode Message] All Sound Off"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[120]
				,typeHint: "button"
			},{
				"title":"[Channel Mode Message] Reset All Controllers (See MMA RP-015)"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[121]
				,typeHint: "button"
			},{
				"title":"[Channel Mode Message] Local Control On/Off"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[122]
				,typeHint: "switch"
			},{
				"title":"[Channel Mode Message] All Notes Off"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[123]
				,typeHint: "button"
			},{
				"title":"[Channel Mode Message] Omni Mode Off (+ all notes off)"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[124]
				,typeHint: "button"
			},{
				"title":"[Channel Mode Message] Omni Mode On (+ all notes off)"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[125]
				,typeHint: "button"
			},{
				"title":"[Channel Mode Message] Mono Mode On (+ poly off, + all notes off)"
				,description: "Note: This equals the number of channels, or zero if the number of\n" +
					"channels equals the number of voices in the receiver."
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[126]
				,typeHint: "valueSelect"
				,contMapList:[
					{value:0,"title":"# channels = # voices."},
					{value:33554432,"title":"1"},
					{value:67108864,"title":"2"},
					{value:100663296,"title":"3"},
					{value:134217728,"title":"4"},
					{value:167772160,"title":"5"},
					{value:201326592,"title":"6"},
					{value:234881024,"title":"7"},
					{value:268435456,"title":"8"},
					{value:301989888,"title":"9"},
					{value:335544320,"title":"10"},
					{value:369098752,"title":"11"},
					{value:402653184,"title":"12"},
					{value:436207616,"title":"13"},
					{value:469762048,"title":"14"},
					{value:503316480,"title":"15"},
					{value:536870912,"title":"16"},
				]
			},{
				"title":"[Channel Mode Message] Poly Mode On (+ mono off, +all notes off)"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[127]
				,typeHint: "button"
			}
		]
		,interoperability:{
			"title":"Profile: " +
				"Default Control Change Mapping",
			sections:[
				{
					"title": "PfDefCon1: After Profile is Enabled",
					questions: [
						{
							id: "PfDefCon1.1", required:true,
							text: "Device has the assignment of controller message destinations/functions set to the " +
								"common, default definitions. Details of destinations/functions are in Appendix A."
						},
						{
							id: "PfDefCon1.2",required:true,
							text: "When a Device receives a Reset All Controllers message, it must set Control Change " +
								"values to the Values as defined in Appendix A."
						},
						{
							id: "PfDefCon1.3", required:true,
							text: "The Bank Select message shall not affect any change in sound until a subsequent " +
								"Program Change	message is received."
						}
					]
				}
			]
		}
	},
	{
		bank:0x00
		,index:0x00
		,name:'General MIDI 2'
		,type:'functionBlock'
		,channels:[]
		,profileLevels:{
			0x00:'Some Implementation but Not to Minimum Requirements'
			,0x01:'Meets Minimum Requirements'
		}
		,CtrlList:[

		]
		,interoperability:{
			"title":"Profile: " + "General MIDI 2",
			sections:[
				{
					"title": "PfGM2GroupCon1: After Profile is Enabled",
					questions: [
						{
							id: "PfGM2GroupCon1.1", required:true,
							text: "Device has the assignment of controller message destinations/functions set to the " +
								"common, default definitions. Details of destinations/functions are in Appendix A."
						}
					]
				}
			]
		}
	},
	{
		bank:0x21
		,index:0x02
		,name:'General MIDI 2 Single Channel'
		,type:'singleChannel'
		,channels:[]
		,profileLevels:{
			0x00:'Some Implementation but Not to Minimum Requirements'
			,0x01:'Meets Minimum Requirements'
		}
		,CtrlList:[

		]
		,interoperability:{
			"title":"Profile: " + "General MIDI 2 Single Channel",
			sections:[
				{
					"title": "PfGM2SingleCon1: After Profile is Enabled",
					questions: [
						{
							id: "PfGM2SingleCon1.1", required:true,
							text: "Device has the assignment of controller message destinations/functions set to the " +
								"common, default definitions. Details of destinations/functions are in Appendix A."
						}
					]
				}
			]
		}
	},

	{
		bank:0x20
		,index:0x01
		,name:'Drawbar Organ'
		,type:'singleChannel'
		,profileLevels:{
			0x00:'Some Implementation but does not comply with minimum requirements'
			,0x01:'Meets the minimum requirements'
			,0x02: 'Implements some extended/optional features'
			,0x7F: 'Highest Level of Profile'
		},
		extendedUI:__dirname+'/../output/app/sound/organ/drawbarSingle.html',
		profileDetailsInquiry: {
			0x01: "Get Drawbar Organ Profile Optional Features"
		},
		profileDetailsReplyProcess: (msgObj, midiCi, valSysex,oOptsForReply) => {

			if(oOptsForReply.inquiryTarget===0x01){
				let data =  {
					softPedal: !!(valSysex[0] & 0b1),
					vibratoChorus: !!(valSysex[0] & 0b10),
					percussion: !!(valSysex[0] & 0b100),
					keyClick: !!(valSysex[0] & 0b1000),
					crosstalk: !!(valSysex[0] & 0b10000),
				};
				oOptsForReply.dataDebug = `Supported params: ${data.softPedal?'Soft-Pedal ':''}${data.vibratoChorus?'Vibrato/Chorus ':''}${data.percussion?'Percussion ':''}${data.keyClick?'Key Click ':''}${data.crosstalk?'Crosstalk/Leakage ':''}`;
				return data;
			}else {
				return valSysex;
			}
		},
		ChCtrlList:[
			{
				title:"Volume"
				,ctrlType:"cc"
				,ctrlIndex:[7]
				,contMapList: defMapLists['volume']
				, "paramPath": "/volume"
			},
			{
				title:"Expression"
				,ctrlType:"cc"
				,ctrlIndex:[11]
				,contMapList: defMapLists['volume']
				, "paramPath": "/expression"
			},{
				"title":"All Sound Off"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[120]
				,typeHint: "button"
			},{
				"title":"Reset All Controllers"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[121]
				,typeHint: "button"
			},{
				"title":"Damper Pedal on/off (Sustain)"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[64]
				,typeHint: "button",
				default:0
			},
			{title:"16’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x30], "paramPath": "/drawbars/0", "stepCount": 8},
			{title:"5⅓’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x31], "paramPath": "/drawbars/1", "stepCount": 8},
			{title:"8’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x32], "paramPath": "/drawbars/2", "stepCount": 8},
			{title:"4’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x33], "paramPath": "/drawbars/3", "stepCount": 8},
			{title:"2⅔’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x34], "paramPath": "/drawbars/4", "stepCount": 8},
			{title:"2’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x35], "paramPath": "/drawbars/5", "stepCount": 8},
			{title:"1⅗’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x36], "paramPath": "/drawbars/6", "stepCount": 8},
			{title:"1⅓’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x37], "paramPath": "/drawbars/7", "stepCount": 8},
			{title:"1’ Drawbar",ctrlType:"rpn",ctrlIndex:[0x40,0x38], "paramPath": "/drawbars/8", "stepCount": 8},
			//optional
			{
				"title":"Soft Pedal On/Off"
				,ctrlType:"cc"
				,numSigBits:1
				,ctrlIndex:[67]
				,typeHint: "button",
				default:0
			},
			{title:"Vibrato / Chorus Type",ctrlType:"rpn",ctrlIndex:[0x40,0x39],managerOnly:true, "paramPath": "/chorusVibrato/type"},
			{title:"Vibrato Chorus Off/On",ctrlType:"rpn",ctrlIndex:[0x40,0x3A],numSigBits:1,typeHint: "button",default:0, "paramPath": "/chorusVibrato/on"},
			{title:"Percussion Off/On", "paramPath": "/perc/on",ctrlType:"rpn",ctrlIndex:[0x40,0x3B],managerOnly:true,numSigBits:1,typeHint: "button",default:0},
			{title:"Percussion Normal/Soft", "paramPath": "/perc/volume",ctrlType:"rpn",ctrlIndex:[0x40,0x3C],managerOnly:true,numSigBits:1,typeHint: "button"},
			{title:"Percussion Slow/Fast", "paramPath": "/perc/decay",ctrlType:"rpn",ctrlIndex:[0x40,0x3D],managerOnly:true},
			{title:"Percussion Type 2nd/3rd", "paramPath": "/perc/harmonic",ctrlType:"rpn",ctrlIndex:[0x40,0x3E],managerOnly:true},
			{title:"Amount of Key Click", "paramPath": "/keyClick",ctrlType:"rpn",ctrlIndex:[0x40,0x41],managerOnly:true, default: 2147483648},
			{title:"Amount of Crosstalk/Leakage", "paramPath": "/crosstalk",ctrlType:"rpn",ctrlIndex:[0x40,0x42],managerOnly:true, default: 214748364},
		]
	},
	{
		bank:0x61
		,index:0x00
		,name:'Rotary Speaker Effect'
		,type:'singleChannel'
		,channels:[]
		,profileLevels:{
			0x01:'Meets Minimum Requirements'
		}
		,CtrlList:[
			{title:"Rotary Speed (Slow/Fast)",ctrlType:"rpn",ctrlIndex:[0x60,0x00],default:0
				, "paramPath": "/rotary/speed",contMapList: {0:'Slow',0xFFFFFFFF:'Fast'}},
			{title:"Rotary Effect (Off/On)",ctrlType:"rpn",ctrlIndex:[0x60,0x01],numSigBits:1,typeHint: "button"
				,default:0xFFFFFFFF, "paramPath": "/rotary/effect"},
			{title:"Rotary Brake (Brake Off = Rotate, Brake On = Stop)",ctrlType:"rpn",ctrlIndex:[0x60,0x02]
				,numSigBits:1,typeHint: "button"
				,default:0, "paramPath": "/rotary/brake"},
			{title:"Horn Slow Speed",ctrlType:"rpn",ctrlIndex:[0x60,0x03],default:0x80000000
				, "paramPath": "/rotary/horn/slowSpeed"},
			{title:"Horn Fast Speed",ctrlType:"rpn",ctrlIndex:[0x60,0x04],default:0x80000000
				, "paramPath": "/rotary/horn/fastSpeed"},
			{title:"Woofer Slow Speed",ctrlType:"rpn",ctrlIndex:[0x60,0x05],default:0x80000000
				, "paramPath": "/rotary/woofer/slowSpeed"},
			{title:"Woofer Fast Speed",ctrlType:"rpn",ctrlIndex:[0x60,0x06],default:0x80000000
				, "paramPath": "/rotary/woofer/fastSpeed"},
			{title:"Horn Accelerate Time",ctrlType:"rpn",ctrlIndex:[0x60,0x07],default:0x80000000
				, "paramPath": "/rotary/horn/accelerateTime"},
			{title:"Horn Decelerate Time",ctrlType:"rpn",ctrlIndex:[0x60,0x08],default:0x80000000
				, "paramPath": "/rotary/horn/deccelerateTime"},
			{title:"Woofer Accelerate Time",ctrlType:"rpn",ctrlIndex:[0x60,0x09],default:0x80000000
				, "paramPath": "/rotary/woofer/accelerateTime"},
			{title:"Woofer Decelerate Time",ctrlType:"rpn",ctrlIndex:[0x60,0x0A],default:0x80000000
				, "paramPath": "/rotary/woofer/deccelerateTime"},
			{title:"Horn Level",ctrlType:"rpn",ctrlIndex:[0x60,0x0B],default:0xC8000000
				, "paramPath": "/rotary/horn/level"},
			{title:"Woofer Level",ctrlType:"rpn",ctrlIndex:[0x60,0x0C],default:0xC8000000
				, "paramPath": "/rotary/woofer/level"},
			{title:"Rotary Overdrive Amount",ctrlType:"rpn",ctrlIndex:[0x60,0x0D],default:0
				, "paramPath": "/rotary/overdrive"},
		]
		,interoperability:{
			"title":"Profile: Rotary Speaker",
			sections:[
				{
					"title": "PfRotaryEfx1: After Profile is Enabled",
					questions: [
						{
							id: "PfRotaryEfx1.1", required:true,
							text: "Device has the assignment of controller message destinations/functions set to the " +
								"common, default definitions. Details of destinations/functions are the specification."
						}
					]
				}
			]
		}
	},

	{
		bank:0x21
		,index:0x01
		,name:'Note On Orchestral Articulation'
		,type:'singleChannel'
		,channels:[]
		,profileLevels:{
			0x00:'Some Implementation but Not to Minimum Requirements'
			,0x01:'Meets Minimum Requirements'
		},
		profileDetailsInquiry: {
			0x01: "Get Profile Optional Features Supported",
			0x40: "Profile Specific – Discover Manufacturer Specific Sounds"
		},
		profileDetailsReplyProcess: (msgObj, midiCi, valSysex,oOptsForReply) => {

			if(oOptsForReply.inquiryTarget===0x01){
				let data =  {
					muteTypeRC: !!(valSysex[0] & 0b1),
					muteAmountRC: !!(valSysex[0] & 0b10),
					playingPositionRPNC: !!(valSysex[0] & 0b100),
					noteOffVelocity: !!(valSysex[0] & 0b1000),
					discoveryManuSpecificSounds: !!(valSysex[0] & 0b10000),
				};
				oOptsForReply.dataDebug = `Supported params: Orchestral Mute Type Registered Controller(RC 0x20/0x22): ${data.muteTypeRC?' yes':'no'},
				Orchestral Mute Amount Registered Controller (RC 0x20/0x23):${data.muteAmountRC?'yes':'no'}, 
				Playing Position Registered Per-Note Controller (RPNC 0x0C):${data.playingPositionRPNC?'yes':'no'}, 
				Note Off Velocity: ${data.thirdDimension?'yes':'no'}, 
				Discovery of Manufacturer Specific Sounds: ${data.discoveryManuSpecificSounds?'yes':'no'}, 
				`;
				return data;
			}else {
				return valSysex;
			}
		},

		profileDetailsReplyDisplay: (jq, inquiryTarget, data) => {

			if(inquiryTarget===0x01){
				jq.append(`Supported params: Orchestral Mute Type Registered Controller(RC 0x20/0x22): ${data.muteTypeRC?' yes':'no'},
				Orchestral Mute Amount Registered Controller (RC 0x20/0x23):${data.muteAmountRC?'yes':'no'}, 
				Playing Position Registered Per-Note Controller (RPNC 0x0C):${data.playingPositionRPNC?'yes':'no'}, 
				Note Off Velocity: ${data.thirdDimension?'yes':'no'}, 
				Discovery of Manufacturer Specific Sounds: ${data.discoveryManuSpecificSounds?'yes':'no'}, 
				`);

			}
		},

		noteOnAttributes:{
			0x10: 'Core Sounds - Sustains and Strikes',
			0x11: 'Staccatos and Shorts',
			0x12: 'Same Note Trills/Repeats',
			0x13: 'Intervallic Trills',
			0x14: 'Additional Colors - Sustained',
			0x15: 'Pitch and Dynamic Gestures',
			0x16: 'Scales, Runs, and Arpeggios',
			0x17: 'Effects and Noises',
			0x18: 'Reserved',
			0x19: 'Reserved',
			0x1A: 'Custom',
			0x1B: 'Custom',
			0x1C: 'Custom',
			0x1D: 'Custom',
			0x1E: 'Custom',
			0x1F: 'Custom'
		},
		noteOffAttributes: {
			0x10: 'Note ending characteristics.'
		},
		renderNoteOffAttribute: (attribute,ump,val,offset)=> {
			let subclassLabel = {
				0x10: [
					'No Note Off Sample',
					'Soft Ending',
					'Hard Ending',
					'Pitch Rise',
					'Pitch Fall'
				]
			};
			const stringAssLabel = [
				'No string assignment (Receiver may determine)',
				'First string, highest pitched (usually E on guitar, E on violin)',
				'Second string (usually B on guitar, A on violin)',
				'Third string (usually G on guitar, D on violin)',
				'Fourth string (usually D on guitar, G on violin)',
				'Fifth string (usually A on guitar, usually G drone on 5 String Banjo)',
				'Sixth string (usually E on guitar)',
				'Other String'
			];
			return [
				{
					range:[0 + offset,3 + offset], title:'Sub-Class',
					list: subclassLabel[attribute], classes:"bg-warning text-dark"
				},{
					range:[4 + offset,7 + offset], title:'Variation',  classes:'text-white bg-secondary'
				},{
					range:[13 + offset,15 + offset], title:'String Assignment', list: stringAssLabel,  classes:'text-white bg-dark'
				},
			];
		},
		renderNoteOnAttribute: (attribute,ump,val,offset)=>{
			let subclassLabel = {
				0x10:[
					'Normal Sustains & Strikes (PART 1)',
					'Normal Sustains & Strikes (PART 2)',
					'Legato and Legato Slurred',
					'Molto Legato',
					'Glissando',
					'Detaché',
					'Marcato',
					'Martelé',
					'Senza Vibrato',
					'Con Vibrato',
					'Synchronized Vibrato',
				],
				0x11:[
					'Normal Staccato Off String',
					'Normal Staccato Off String',
					'Slurred Staccato',
					'Accented Staccato',
					'Staccatissimo',
					'Sautillé',
					'Martellato',
					'Portato',
					'Bartok Pizzicato',
					'Col Legno Battuto',
					'Col Legno Gestrichen',
					'String Hand Tap',
					'Jete',
				],
				0x12:[
					'Tremolo / Flutter tongue',
					'Growl / Razz',
					'Other Coloristic Tremolo',
					'One Note Trills',
					'2 Repeats',
					'3 Repeats',
					'4 Repeats',
					'5 Repeats',
					'6 Repeats',
					'Faster Repeats'
				],
				0x13:[
					'Half Step (Classical)',
					'Half Step (Baroque)',
					'Whole Step (Classical)',
					'Whole Step (Baroque)',
					'Minor 3rd',
					'Major 3rd',
					'Perfect 4th',
					'Tritone',
					'Perfect 5th',
					'Minor 6th',
					'Major 6th',
					'Minor 7th',
					'Major 7th',
					'Octave'
				],
				0x14:[
					'Harmonics – Natural',
					'Harmonics – Artificial',
					'Col Legno Tratto',
					'Flautando',
					'Polyphony: multiple octaves',
					'Polyphony: intervals, chords, etc.',
					'Cuivré',
					'Lontano',
					'Singing into Instrument'
				],
				0x15:[
					'Pitch Fall End',
					'Pitch Fall Start',
					'Pitch Rise End',
					'Pitch Rise Start',
					'Blue Note Down',
					'Blue Note Up',
					'Grace Notes “Classical”',
					'Grace Notes “Baroque”',
					'Shakes',
					'Crescendo',
					'Decrescendo',
					'Cresc -> Decresc',
					'Decresc -> Cresc',
					'Sfz Crescendo'
				],
				0x16:[
					'Playable Runs',
					'Playable Tremolos',
					'Scales/Runs Major',
					'Scales/Runs Minor',
					'Scales/Runs Dominant 7th',
					'Scales/Runs diminished (whole/half) or Other 1',
					'Scales/Runs diminished (whole/half) or Other 2',
					'Whole Tone Scale 1 (includes C)',
					'Whole Tone Scale 1 (includes C#)',
					'Pentatonic Scale (maj)',
					'Pentatonic Scale (min)',
					'Lydian',
					'Lydian b7',
					'Chromatic',
					'Other Scales and Runs'
				],
				0x17:[
					'Assorted noises, Air Sound, or effects – Sustained',
					'Behind the Bridge – Sustained',
					'Random Pizz – Sustained',
					'Harmonic Glissando',
					'Random Glissando',
					'Air sound, Chiffs/Squeak/Lip-Pizz – Short',
					'Mechanical sounds – Sustained',
					'Mechanical sounds – Short',
					'Finger Glide',
					'Fret Buzz/Noise',
					'Thump',
					'Knock',
					'Slap',
					'Pop',
					'Tap',
					'Click'
				]
			};
			const directionLabel = [
				'Determined by the receiver or automatic',
				'Down stroke, right hand pizzicato, or right-hand strike',
				'Up stroke, left hand pizzicato, or left-hand strike',
				'Reserved'
			];

			const stringAssLabel = [
				'No string assignment (Receiver may determine)',
				'First string, highest pitched (usually E on guitar, E on violin)',
				'Second string (usually B on guitar, A on violin)',
				'Third string (usually G on guitar, D on violin)',
				'Fourth string (usually D on guitar, G on violin)',
				'Fifth string (usually A on guitar, usually G drone on 5 String Banjo)',
				'Sixth string (usually E on guitar)',
				'Other String'
			]

			return [
				{
					range:[0 + offset,3 + offset], title:'Sub-Class',
					list: subclassLabel[attribute], classes:"bg-warning text-dark"
				},{
					range:[4 + offset,7 + offset], title:'Variation',  classes:'text-white bg-secondary'
				},{
					range:[8 + offset,9 + offset], title:'Direction',
					list: directionLabel,  classes:'text-white bg-info'
				},{
					range:[12 + offset,12 + offset], title:'Reset Round Robin',  classes:'text-white bg-success'
				},{
					range:[13 + offset,15 + offset], title:'String Assignment', list: stringAssLabel,  classes:'text-white bg-dark'
				},
			];

		},
		CtrlList:[
			{
				title:"Orchestral Mute Type"
				,ctrlType:"rpn"
				,ctrlIndex:[0x20, 0x22]
				,contMapList: [
					{value:0x04000000,"title":"No Mute"},
					{value:0x0C000000,"title":"Straight mute (brass) or Standard mute (strings and others)"},
					{value:0x14000000,"title":"Practice mute"},
					{value:0x1C000000,"title":"Cup Mute"},
					{value:0x24000000,"title":"Wah-wah/Harmon Mute, stem in"},
					{value:0x2C000000,"title":"Wah-wah/Harmon Mute, stem extended"},
					{value:0x34000000,"title":"Wah-wah/Harmon, stem removed"},
					{value:0x3C000000,"title":"Plunger Mute"},
					{value:0x44000000,"title":"Bucket Mute"},
					{value:0x4C000000,"title":"Mica Mute"},
					{value:0x54000000,"title":"Solotone Mute"},
					{value:0x5C000000,"title":"Whispa/Whisper Mute"},
					{value:0x64000000,"title":"Hat"},
					{value:0x6C000000,"title":"Hand"},
					{value:0x74000000,"title":"Stopped"},
					{value:0x7C000000,"title":"Into the Stand"},




					{value:0xA0000000,"title":"Reserved"},


					{value:0xD4000000,"title":"Manufacturer Specific Mute 1"},
					{value:0xDC000000,"title":"Manufacturer Specific Mute 2"},
					{value:0xE4000000,"title":"Manufacturer Specific Mute 3"},
					{value:0xEC000000,"title":"Manufacturer Specific Mute 4"},
					{value:0xF4000000,"title":"Manufacturer Specific Mute 5"},
					{value:0xFC000000,"title":"Manufacturer Specific Mute 6"}
				]
				, "paramPath": "/muteType"
			},
			{
				title:"Orchestral Mute Amount"
				,ctrlType:"rpn"
				,ctrlIndex:[0x20, 0x23]
				//,contMapList: defMapLists['holdHalfPedal']
				, "paramPath": "/muteAmount"
			},
			{
				title:"Playing Position"
				,ctrlType:"pnrc"
				,ctrlIndex:[0x0C]
				,contMapList:[{value:0,"title":"At the Bridge/Center"},
					{value:0x80000000,"title":"Normal Playing Position"},
					{value:0xFFFFFFFF,"title":"At the Nut/Rim"}]
			}
		]
		,interoperability:{
			"title":"Profile: " + "Orchestral Articulation",
			sections:[
				{
					"title": "PfOA1: After Profile is Enabled",
					questions: [
						{
							id: "PfOA1.1", required:true,
							text: "When Reset Round Robin is set the Note On shall be played with the first sound in the round robin and restart the progress through the available round\n" +
								"robin sounds."
						},
						{
							id: "PfOA1.2", required:true,
							text: "When a Device receivesa MIDI 2.0 Note On Message with Attribute Type set to 0x10 through 0x1F, the Device shall play a note with the best available sound properties to suit the requested Classification and Subclass of note articulation and the other fields in the Note On."
						},
						{
							id: "PfOA1.3", required:true,
							text: "If the Device does not have a sound specifically designed for the Classification and Subclass of a received Note\n" +
								"On, the Device shall substitute another sound according to the rules in Section 6.1, Fallback Mechanism"
						},
						{
							id: "PfOA1.4", required:true,
							text: "If a Receiver receives a Note On with any Attribute Type other than 0x10-1F, then the Receiver shall decide which articulation to use."
						}
						,
						{
							id: "PfOA1.5", required:true,
							text: "A Device shall not use Attribute Type values from 0x18-0x19."
						},
						{
							id: "PfOA1.6", required:true,
							text: "A Device or Library shall provide a suitable note in Classification 0x10, Subclass 0x0, Variation 0x0 for\n" +
								"every instrument that is part of the sound set."
						},
						{
							id: "PfOA1.7", required:true,
							text: "When using custom, library specific, or device specific sounds, the Variation, Direction, Reset Round Robin, and String fields remain valid and shall not be used for any other function."
						},
						{
							id: "PfOA1.8",
							text: "A receiver shall follow the Fallback mechanisms as defined in Section 6.1."
						},
						{
							id: "PfOA1.9",
							text: "If a Receiver declares in a Reply to Profile Details Inquiry message (See Section 9) that it supports Note Off\n" +
								"Release Velocity, then the envelope release time of the Note in the Receiver shall be determined by the value of\n" +
								"the Release Velocity field, ranging from 0x0000 to 0xFFFF."
						}
					]
				}
			]
		}
	},

	{
		bank:0x31
		,index:0x00
		,name:'MPE'
		,type:'multiChannel'
		,channels:[]
		,profileLevels:{
			0x00:'Some Implementation but Not to Minimum Requirements'
			,0x01:'Meets Minimum Requirements'
		},
		profileDetailsInquiry: {
			0x00: "Number of MIDI Channels",
			0x01: "Get MPE Profile Optional Features"
		},
		profileDetailsReplyProcess: (msgObj, midiCi, valSysex,oOptsForReply) => {

			if(oOptsForReply.inquiryTarget===0x01){
				const typeSupport = ['none', 'CC', 'bipolarRPN'];
				let data =  {
					channelResponceNotification: !!(valSysex[0] & 0b1),
					pitchBend: !!(valSysex[1]),
					pressure: typeSupport[valSysex[2]],
					thirdDimension: typeSupport[valSysex[3]]
				};
				oOptsForReply.dataDebug = `Supported params: Channel-Response-Notification: ${data.channelResponceNotification?' yes':'no'},
				Pitchbend:${data.pitchBend?'yes':'no'}, Pressure:${data.pressure}, 3rd Dimension of Control: ${data.thirdDimension}`;
				return data;
			}else {
				return valSysex;
			}
		},

		profileDetailsReplyDisplay: (jq, inquiryTarget, data) => {

			if(inquiryTarget===0x01){
				const typeSupport = ['none', 'CC', 'bipolarRPN'];
				jq.append(`Supported params: Channel-Response-Notification: ${data.channelResponceNotification?' yes':'no'},
				Pitchbend:${data.pitchBend?'yes':'no'}, Pressure:${data.pressure}, 3rd Dimension of Control: ${data.thirdDimension}`);

			}
		},
		CtrlList:[

		]
		,interoperability:{
			"title":"Profile: " + "MPE",
			sections:[
				{
					"title": "PfMPE1: After Profile is Enabled",
					questions: [
						/*{
							id: "PfMPE1.1", required:true,
							text: "Device has the assignment of controller message destinations/functions set to the " +
								"common, default definitions. Details of destinations/functions are in Appendix A."
						}*/
					]
				}
			]
		}
	},

];
