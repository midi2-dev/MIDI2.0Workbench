/* (C) Copyright 2023 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

const defMapLists = {
	volume:[
		{value:0,"title":"-infinity"},
		{value:2048,"title":"-36.0 dB"},
		{value:4096,"title":"-23.9 dB"},
		{value:8192,"title":"-11.9 dB"},
		{value:12353,"title":"-4.9 dB"},
		{value:16383,"title":"0 dB"}
	]
}


exports.profiles=[
	{
		bank:0x21
		,number:0x00
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
	}
];