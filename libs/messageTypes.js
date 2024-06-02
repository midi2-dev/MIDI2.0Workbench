/* (C) Copyright 2023 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

let mtColours={
    messageType:"text-danger bg-warning",
    Group:"text-danger",
    status:"text-white bg-dark",
    channel:'text-warning bg-dark',
    noteNumber:'text-white bg-success',
    index:'text-white bg-secondary',

    program:'text-white bg-secondary',
    reset:'text-white bg-secondary',
    velocity:'text-white bg-info',
    pressure:'text-white bg-info',
    value:'text-white bg-info',

    attrType:"bg-warning text-dark",
    attribute:"bg-warning text-dark",
    bank:"bg-warning text-dark",
    detach:"bg-warning text-dark",
    pitch:"bg-warning text-dark",

    numberOfBytes:'text-white bg-success',
    streamId:"bg-warning text-dark",
    lsb:'text-white bg-secondary',
    msb:'text-white bg-info',
    numberOfValidBytes:"text-white bg-dark",
    numberOfchunks:"bg-primary text-white",

    numberOfSharpsFlats:"text-white bg-dark",
    chordTonic:"text-white bg-success",
    chordType:"bg-warning text-dark",
    alterType:"text-white bg-success",
    alterDegree:"text-white bg-info"
};

let byteRangeArr = [
    {range:[32,39],title:'Byte 1',classes:mtColours.lsb},
    {range:[40,47],title:'Byte 2',classes:mtColours.msb},
    {range:[48,55],title:'Byte 3',classes:mtColours.lsb},
    {range:[56,63],title:'Byte 4',classes:mtColours.msb},
    {range:[64,71],title:'Byte 5',classes:mtColours.lsb},
    {range:[72,79],title:'Byte 6',classes:mtColours.msb},
    {range:[80,87],title:'Byte 7',classes:mtColours.lsb},
    {range:[88,95],title:'Byte 8',classes:mtColours.msb},
    {range:[96,103],title:'Byte 9',classes:mtColours.lsb},
    {range:[104,111],title:'Byte 10',classes:mtColours.msb},
    {range:[112,119],title:'Byte 11',classes:mtColours.lsb},
    {range:[120,127],title:'Byte 12',classes:mtColours.msb}
]



exports.messageType = [
    {
        title:'Utility Messages',
        bits:32,
        noGroup: true,
        status:{
            0:{
                title:'NOOP'
            },
            1:{
                title:'JR Clock',
                parts:[
                    {range:[16,31],title:"Sender Clock Time",classes:mtColours.msb}
                ]
            },
            2:{
                title:'JR Timestamp'
                ,parts:[
                    {range:[16,31],title:"Sender Clock Timestamp",classes:mtColours.msb}
                ]
            },
            3:{
                title:'Delta Clockstamp Ticks Per Quarter Note'
                ,parts:[
                    {range:[16,31],title:"Number of Ticks Per Quarter Note",classes:mtColours.msb}
                ]
            },
            4:{
                title:'Delta Clockstamp'
                ,parts:[
                    {range:[16,31],title:"Number of Ticks Since Last Event",classes:mtColours.msb}
                ]
            }
        }
    },
    {
        title:'System Real Time and System Common Messages',
        bits:32,
        status8bit:true,
        status:{
            0xF1:{
                title:'MIDI Time Code',
                parts:[
                    {range:[17,23],title:'0nnndddd',classes:mtColours.msb}
                ]
            },
            0xF2:{
                title:'Song Position Pointer',
                parts:[
                    {range:[17,23],title:'0lllllll*',classes:mtColours.msb},
                    {range:[24,31],title:'0mmmmmmm*',classes:mtColours.lsb}
                ]
            },
            0xF3:{
                title:'Song Select',
                parts:[
                    {range:[17,23],title:'0sssssss',classes:mtColours.msb}
                ]
            },
            0xF6:{title:'Tune Request',},
            0xF8:{title:'Timing Clock',},
            0xFA:{title:'Start',},
            0xFB:{title:'Continue',},
            0xFC:{title:'Stop',},
            0xFE:{title:'Active Sensing',},
            0xFF:{title:'Reset',}
        }
    },
    {
        title:'MIDI 1.0 Channel Voice Messages',
        bits:32,
        status: {
            0b1000: {
                title: 'Note Off',
                parts:[
                    {range:[12,15], title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23], title:'Note Number',classes:mtColours.noteNumber},
                    {range:[25,31], title:'Velocity',classes:mtColours.velocity}
                ]
            },
            0b1001: {
                title: 'Note On',
                parts:[
                    {range:[12,15], title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23], title:'Note Number',classes:mtColours.noteNumber},
                    {range:[25,31], title:'Velocity',classes:mtColours.velocity}
                ]
            },
            0b1010: {
                title: 'Poly Pressure',
                parts:[
                    {range:[12,15], title:'Channel',format:'+1',classes:mtColours.channel},
                    {range:[17,23], title:'Note Number',classes:mtColours.noteNumber},
                    {range:[25,31], title:'Pressure',classes:mtColours.pressure}
                ]
            },
            0b1011: {
                title: 'Control Change Message',
                parts:[
                    {range:[12,15], title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23], title:'Index',classes:mtColours.index},
                    {range:[25,31], title:'Value',classes:mtColours.value}
                ]
            },
            0b1100: {
                title: 'Program Change Message',
                parts:[
                    {range:[12,15], title:'Channel',format:'+1',classes:mtColours.channel},
                    {range:[17,23], title:'Program',classes:mtColours.program}
                ]
            },
            0b1101: {
                title: 'Channel Pressure Message',
                parts:[
                    {range:[12,15], title:'Channel',format:'+1',classes:mtColours.channel},
                    {range:[17,23], title:'Pressure',classes:mtColours.pressure}
                ]
            },
            0b1110: {
                title: 'Pitch Bend',
                parts:[
                    {range:[12,15], title:'Channel',format:'+1',classes:mtColours.channel},
                    {range:[17,23], title:'LSB data',classes:mtColours.lsb},
                    {range:[25,31], title:'MSB data',classes:mtColours.msb}
                ]
            },
        }
    },
    {
        title:'SysEx',
        bits:64,
        status:{
            0x0:{
                title: 'Complete System Exclusive Message in One Packet',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[17,23],title:'Byte 1',classes:mtColours.msb,format: 'hex'},
                    {range: [25, 31],title: 'Byte 2',classes:mtColours.lsb,format: 'hex'},
                    {range:[33,39],	title:'Byte 3',classes:mtColours.msb,format: 'hex'},
                    {range:[41,47],title:'Byte 3',classes:mtColours.lsb,format: 'hex'},
                    {range:[49,55],title:'Byte 5',classes:mtColours.msb,format: 'hex'},
                    {range:[57,63],title:'Byte 6',classes:mtColours.lsb,format: 'hex'}
                ]
            },
            0x1:{
                title: 'System Exclusive Start Packet',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[17,23],title:'Byte 1',classes:mtColours.msb,format: 'hex'},
                    {range: [25, 31],title: 'Byte 2',classes:mtColours.lsb,format: 'hex'},
                    {range:[33,39],	title:'Byte 3',classes:mtColours.msb,format: 'hex'},
                    {range:[41,47],title:'Byte 3',classes:mtColours.lsb,format: 'hex'},
                    {range:[49,55],title:'Byte 5',classes:mtColours.msb,format: 'hex'},
                    {range:[57,63],title:'Byte 6',classes:mtColours.lsb,format: 'hex'}
                ]
            },
            0x2:{
                title: 'System Exclusive Continue Packet',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[17,23],title:'Byte 1',classes:mtColours.msb,format: 'hex'},
                    {range: [25, 31],title: 'Byte 2',classes:mtColours.lsb,format: 'hex'},
                    {range:[33,39],	title:'Byte 3',classes:mtColours.msb,format: 'hex'},
                    {range:[41,47],title:'Byte 3',classes:mtColours.lsb,format: 'hex'},
                    {range:[49,55],title:'Byte 5',classes:mtColours.msb,format: 'hex'},
                    {range:[57,63],title:'Byte 6',classes:mtColours.lsb,format: 'hex'}
                ]
            },
            0x3:{
                title: 'System Exclusive End Packet',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[17,23],title:'Byte 1',classes:mtColours.msb,format: 'hex'},
                    {range: [25, 31],title: 'Byte 2',classes:mtColours.lsb,format: 'hex'},
                    {range:[33,39],	title:'Byte 3',classes:mtColours.msb,format: 'hex'},
                    {range:[41,47],title:'Byte 3',classes:mtColours.lsb,format: 'hex'},
                    {range:[49,55],title:'Byte 5',classes:mtColours.msb,format: 'hex'},
                    {range:[57,63],title:'Byte 6',classes:mtColours.lsb,format: 'hex'}
                ]
            }
        }
    },
    {
        title:'MIDI 2.0 Channel Voice Messages',
        bits:64,
        status:{
            0b1000: {
                title: 'Note Off',
                parts:[
                    {range:[12,15], title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23], title:'Note Number',classes:mtColours.noteNumber},
                    {
                        range:[25,31],
                        title:'Attribute Type',
                        list:{
                            0x00: 'No Attribute Data',
                            0x01: 'Manufacturer Specific Attribute Data',
                            0x02: 'Profile Specific Attribute Data',
                            0x03: 'Pitch 7.9 (See Section 8.3)'
                        }
                        ,classes:mtColours.attrType
                    },
                    {range:[32,47], title:'Velocity',classes:mtColours.velocity},
                    {range:[48,63], title:'Attribute',classes:mtColours.attribute}
                ]
            },
            0b1001: {
                title: 'Note On',
                parts:[
                    {range:[12,15], title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23], title:'Note Number',classes:mtColours.noteNumber},
                    {
                        range:[25,31],
                        title:'Attribute Type',
                        list:{
                            0x00: 'No Attribute Data',
                            0x01: 'Manufacturer Specific Attribute Data',
                            0x02: 'Profile Specific Attribute Data',
                            0x03: 'Pitch 7.9 (See Section 8.3)'
                        }
                        ,classes:mtColours.attrType
                    },
                    {range:[32,47], title:'Velocity',classes:mtColours.velocity},
                    {range:[48,63], title:'Attribute',classes:mtColours.attribute}
                ]
            },
            0b1010: {
                title: 'Poly Pressure',
                parts:[
                    {range:[12,15], title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23], title:'Note Number',classes:mtColours.noteNumber},
                    {range:[32,63], title:'Pressure',classes:mtColours.pressure}
                ]
            },
            0b1011: {
                title: 'Control Change Message',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23],title:'Index',classes:mtColours.index},
                    {range:[32,63],title:'Value',classes:mtColours.value}
                ]
            },
            0b0010: {
                title: 'Registered Controller (RPN)',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23],title:'Bank',classes:mtColours.bank},
                    {range:[25,31],title:'Index',classes:mtColours.index},
                    {range:[32,63],title:'Value',classes:mtColours.value}
                ]
            },

            0b0011: {
                title: 'Assignable Controller (NRPN) Messages',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23],title:'Bank',classes:mtColours.bank},
                    {range:[25,31],title:'Index',classes:mtColours.index},
                    {range:[32,63],title:'Value',classes:mtColours.value}
                ]
            },

            0b0100: {
                title: 'Relative Registered Controller (RPN)',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23],title:'Bank',classes:mtColours.bank},
                    {range:[25,31],title:'Index',classes:mtColours.index},
                    {range:[32,63],title:'Value',format:'twosComplement',classes:mtColours.value}
                ]
            },

            0b0101: {
                title: 'Relative Assignable Controller (NRPN)',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23],title:'Bank',classes:mtColours.bank},
                    {range:[25,31],title:'Index',classes:mtColours.index},
                    {range:[32,63],title:'value',format:'twosComplement',classes:mtColours.value}
                ]
            },

            0b1100: {
                title: 'Program Change Message',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[31,31],title:'Bank Valid',classes:mtColours.bank},
                    {range:[33,39],title:'Program',classes:mtColours.program},
                    {range:[49,55],title:'Bank MSB',classes:mtColours.msb},
                    {range:[57,63],title:'Bank LSB',classes:mtColours.lsb}
                ]
            },

            0b1101: {
                title: 'Channel Pressure Message',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[32,63],title:'Pressure',classes:mtColours.pressure}
                ]
            },

            0b1110: {
                title: 'Pitch Bend',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[32,63],title:'Pitch'
                        //,format:'pitch7.25'
                        ,classes:mtColours.pitch}
                ]
            },

            0b0110: {
                title: 'Per-Note Pitch Bend',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23],title:'Note Number',classes:mtColours.noteNumber},
                    {range:[32,63],title:'Pitch'
                        //,format:'pitch7.25'
                        ,classes:mtColours.pitch}
                ]
            },

            0b0001: {
                title: 'Assignable Per-Note Controller',
                parts:[
                    {range:[12,15],title:'Channel',classes:mtColours.channel,format:'+1'},
                    {range:[17,23],title:'Note Number',classes:mtColours.noteNumber},
                    {range:[24,31],title:'Index',classes:mtColours.index},
                    {range:[32,63],title:'Value',classes:mtColours.value}
                ]
            },

            0b0000: {
                title: 'Registered Per-Note Controller',
                parts:[
                    {
                        range:[12,15],
                        title:'Channel',classes:mtColours.channel
                        ,format:'+1'
                    },
                    {
                        range:[17,23],
                        title:'Note Number'
                        ,classes:mtColours.noteNumber
                    },
                    {
                        range:[24,31],
                        title:'Index'
                        ,classes:mtColours.index
                    },
                    {
                        range:[32,63],
                        title:'Value'
                        ,classes:mtColours.value
                    }
                ]
            },

            0b1111: {
                title: 'Per-Note Management Message',
                parts:[
                    {
                        range:[12,15],
                        title:'Channel',classes:mtColours.channel
                        ,format:'+1'
                    },
                    {
                        range:[17,23],
                        title:'Note Number'
                        ,classes:mtColours.noteNumber
                    },
                    {
                        range:[30,30],
                        title:'Detach Per-Note controllers from previously received Note(s)'
                        ,format:'bool'
                        ,classes:mtColours.detach
                    },
                    {
                        range:[31,31],
                        title:'Reset (Set) Per-Note controllers to default values'
                        ,format:'bool'
                        ,classes:mtColours.reset
                    }
                ]
            },


        }
    },
    { //MT0x5
        title:'SysEx8 and MDS',
        bits:128,
        status:{
            0x0:{
                title: 'Complete System Exclusive 8 Message in One Packet',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[16,23],title:'stream id',classes:mtColours.streamId}
                ]
            },
            0x1:{
                title: 'System Exclusive 8 Start Packet',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[16,23],title:'stream id',classes:mtColours.streamId}
                ]
            },
            0x2:{
                title: 'System Exclusive 8 Continue Packet',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[16,23],title:'stream id',classes:mtColours.streamId}
                ]
            },
            0x3:{
                title: 'System Exclusive End Packet',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[16,23],title:'stream id',classes:mtColours.streamId}
                ]
            },
            0x8:{
                title: 'Mixed Data Set Header',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[16,23],title:'mds id',classes:mtColours.streamId},
                    {range:[24,31],title:'number of valid bytes in this message chunk',classes:mtColours.numberOfValidBytes},
                    {range:[32,47],title:'number of chunks in mixed data set',classes:mtColours.numberOfchunks},
                    {range:[48,63],title:'number of this chunk',classes:mtColours.numberOfBytes},
                    {range:[64,79],title:'manufacturer id',format:'MfrID',classes:mtColours.numberOfValidBytes},
                    {range:[80,95],title:'device id',classes:mtColours.numberOfchunks},
                    {range:[96,111],title:'sub id #1',classes:mtColours.lsb},
                    {range:[112,127],title:'sub id #2',classes:mtColours.msb}
                ]
            },
            0x9:{
                title: 'Mixed Data Set Payload',
                parts:[
                    {range:[12,15],title:'# of bytes',classes:mtColours.numberOfBytes},
                    {range:[16,23],title:'mds id',classes:mtColours.streamId},

                ]
            }
        }
    },
    {},
    {},
    {},
    {},
    {},
    {},
    {},



    {
        title:'Flex Data Messages',
        bits:128,
        statusMSBLSB:true,
        form:['Complete',"Start","Continue","End"],
        addr:['Channel',"Group","-","-"],
        status:{
            0x00:{
                title: "Common/Configuration for MIDI File, Project, and Track",
                status:{
                    0x00:{
                        title:"Set Tempo Message",
                        parts:[
                            {range:[32,63], title:"Number of 10 Nanosecond units Per Quarter Note",classes:mtColours.msb}
                        ]
                    },
                    0x01:{
                        title:"Set Time Signature Message",
                        parts:[
                            {range:[32,39], title:"Numerator",classes:mtColours.msb},
                            {range:[40,47], title:"Denominator",classes:mtColours.lsb},
                            {range:[48,55], title:"Number of 1/32 Notes",classes:mtColours.numberOfBytes}
                        ]
                    },
                    0x02:{
                        title:"Set Metronome Message",
                        parts:[
                            {range:[32,39], title:"Primary Clicks",classes:mtColours.numberOfBytes},
                            {range:[40,47], title:"Bar Accent part 1",classes:mtColours.msb},
                            {range:[48,55], title:"Bar Accent part 2",classes:mtColours.lsb},
                            {range:[56,63], title:"Bar Accent part 3",classes:mtColours.msb},
                            {range:[64,71],title:'Subdivision Clicks 1',classes:mtColours.lsb},
                            {range:[72,79],title:'Subdivision Clicks 2',classes:mtColours.msb}
                        ]
                    },
                    0x05:{
                        title:"Set Key Signature Message",
                        parts:[
                            {range:[32,35], title:"Sharps/Flats",classes:mtColours.msb, format:'twosComplement'},
                            {range:[36,39], title:"Tonic Note",classes:mtColours.lsb, list:exports.chordTonic}
                        ]
                    },
                    0x06:{
                        title:"Set Chord Name Message",
                        parts:[
                            {range:[32,35], title:"Tonic Sharps/Flats",classes:mtColours.numberOfSharpsFlats, format:'twosComplement'},
                            {range:[36,39], title:"Tonic Note",classes:mtColours.chordTonic, list:exports.chordTonic},
                            {range:[40,47], title:"Chord Type",classes:mtColours.chordType, list:exports.chordType},
                            {range:[48,51], title:"Alter 1 Type",classes:mtColours.alterType, list:exports.alterType},
                            {range:[52,55], title:"Alter 1 Degree",classes:mtColours.alterDegree},
                            {range:[56,59], title:"Alter 2 Type",classes:mtColours.alterType, list:exports.alterType},
                            {range:[60,63], title:"Alter 2 Degree",classes:mtColours.alterDegree},
                            {range:[64,67], title:"Alter 3 Type",classes:mtColours.alterType, list:exports.alterType},
                            {range:[68,71], title:"Alter 3 Degree",classes:mtColours.alterDegree},
                            {range:[72,75], title:"Alter 4 Type",classes:mtColours.alterType, list:exports.alterType},
                            {range:[76,79], title:"Alter 4 Degree",classes:mtColours.alterDegree},
                            {range:[80,95], title:"Reserved"},
                            {range:[96,99], title:"Bass Sharps/Flats",classes:mtColours.numberOfSharpsFlats, format:'twosComplement'},
                            {range:[100,103], title:"Bass Note",classes:mtColours.chordTonic},
                            {range:[104,111], title:"Chord Type",classes:mtColours.chordType, list:exports.chordType},
                            {range:[112,115], title:"Alter 1 Type",classes:mtColours.alterType, list:exports.alterType},
                            {range:[116,119], title:"Alter 1 Degree",classes:mtColours.alterDegree},
                            {range:[120,123], title:"Alter 2 Type",classes:mtColours.alterType, list:exports.alterType},
                            {range:[124,127], title:"Alter 2 Degree",classes:mtColours.alterDegree}
                        ]
                    }
                }
            },
            0x01:{
                title: "Performance Events",
                status:{
                    0x00:{
                        title: "Unknown Text Event", parts: byteRangeArr
                    },
                    0x01:{
                        title: "Project Name", parts: byteRangeArr
                    },
                    0X02:{
                        title: "Composition (Song) Name", parts: byteRangeArr
                    },
                    0x03:{
                        title: "MIDI Clip Name", parts: byteRangeArr
                    },
                    0x04:{
                        title: "Copyright Notice", parts: byteRangeArr
                    },
                    0x05:{
                        title: "Composer Name", parts: byteRangeArr
                    },
                    0x06:{
                        title: "Lyricist Name", parts: byteRangeArr
                    },
                    0x07:{
                        title: "Arranger Name", parts: byteRangeArr
                    },
                    0x08:{
                        title: "Publisher Name", parts: byteRangeArr
                    },
                    0x09:{
                        title: "Primary Performer Name", parts: byteRangeArr
                    },
                    0x0A:{
                        title: "Accompanying Performer Name", parts: byteRangeArr
                    },
                    0x0B:{
                        title: "Recording/Concert Date", parts: byteRangeArr
                    },
                    0x0C:{
                        title: "Recording/Concert Location", parts: byteRangeArr
                    }
                }
            },
            0x02:{
                title: "Lyric Data Events",
                status:{
                    0x00:{
                        title: "Unknown Performance Text Data", parts: byteRangeArr
                    },
                    0x01:{
                        title: "Lyrics", parts: byteRangeArr
                    },
                    0x02:{
                        title: "Lyrics Language", parts: byteRangeArr
                    },
                    0x03:{
                        title: "Ruby", parts: byteRangeArr
                    },
                    0x04:{
                        title: "Ruby Language", parts: byteRangeArr
                    }
                }
            }

        }
    },
    {},
    {
        title:'MIDI Endpoint',
        status10bit:true,
        form:['Complete',"Start","Continue","End"],
        bits:128,
        status:{
            0x0:{
                title: 'Get MIDI Endpoint Info',
                parts:[
                    {range:[16,23],title:'UMP Version Major',classes:mtColours.msb},
                    {range:[24,31],title:'UMP Version Minor',classes:mtColours.lsb},
                    {range:[59,59], title:"Requesting a Stream Configuration Notification",classes:mtColours.lsb},
                    {range:[60,60], title:"Requesting a MIDI Endpoint Product Instance Id Notification",classes:mtColours.msb},
                    {range:[61,61], title:"Requesting a MIDI Endpoint Name Notification",classes:mtColours.lsb},
                    {range:[62,62], title:"Requesting a MIDI Endpoint Device Identity Notification",classes:mtColours.msb},
                    {range:[63,63], title:"Requesting a MIDI Endpoint Info Notification",classes:mtColours.lsb}
                ]
            },
            0x1:{
                title: 'MIDI Endpoint Info Notify',
                parts:[
                    {range:[16,23],title:'UMP Version Major',classes:mtColours.msb},
                    {range:[24,31],title:'UMP Version Minor',classes:mtColours.lsb},
                    {range:[32,32],title:'Static Function Blocks',classes:mtColours.streamId},
                    {range:[33,39],title:'Number of Function Blocks',classes:mtColours.numberOfBytes},
                    {range:[54,54], title:"MIDI 2.0",classes:mtColours.lsb},
                    {range:[55,55], title:"MIDI 1.0",classes:mtColours.msb},
                    {range:[62,62], title:"Jitter Reduction Receive",classes:mtColours.lsb},
                    {range:[63,63], title:"Jitter Reduction Transmit",classes:mtColours.msb}
                ]
            },
            0x2:{
                title: 'MIDI Endpoint Device Info Notify',
                parts:[
                    {range:[41,47],title:'Manufacturer Id Byte 1',classes:mtColours.lsb},
                    {range:[49,55],title:'Manufacturer Id Byte 2',classes:mtColours.msb},
                    {range:[57,63],title:'Manufacturer Id Byte 3',classes:mtColours.lsb},
                    {range:[65,71],title:'Family Id LSB',classes:mtColours.lsb},
                    {range:[73,79],title:'Family Id MSB',classes:mtColours.msb},
                    {range:[81,87],title:'Model Id LSB',classes:mtColours.lsb},
                    {range:[89,95],title:'Model Id MSB',classes:mtColours.msb},
                    {range:[97,103],title:'Software Revision Level 1',classes:mtColours.lsb},
                    {range:[105,111],title:'Software Revision Level 2',classes:mtColours.msb},
                    {range:[113,119],title:'Software Revision Level 3',classes:mtColours.lsb},
                    {range:[121,127],title:'Software Revision Level 4',classes:mtColours.msb}
                ]
            },
            0x3:{
                title: 'MIDI Endpoint Name Notify',
                parts:[
                    {range:[16,23],title:'Byte 1',classes:mtColours.lsb},
                    {range:[24,31],title:'Byte 2',classes:mtColours.msb},
                    {range:[32,39],title:'Byte 3',classes:mtColours.lsb},
                    {range:[40,47],title:'Byte 4',classes:mtColours.msb},
                    {range:[48,55],title:'Byte 5',classes:mtColours.lsb},
                    {range:[56,63],title:'Byte 6',classes:mtColours.msb},
                    {range:[64,71],title:'Byte 7',classes:mtColours.lsb},
                    {range:[72,79],title:'Byte 8',classes:mtColours.msb},
                    {range:[80,87],title:'Byte 9',classes:mtColours.lsb},
                    {range:[88,95],title:'Byte 10',classes:mtColours.msb},
                    {range:[96,103],title:'Byte 11',classes:mtColours.lsb},
                    {range:[104,111],title:'Byte 12',classes:mtColours.msb},
                    {range:[112,119],title:'Byte 13',classes:mtColours.lsb},
                    {range:[120,127],title:'Byte 14',classes:mtColours.msb}
                ]
            },
            0x4:{
                title: 'MIDI Endpoint Product Instance Id Notify',
                parts:[
                    {range:[16,23],title:'Byte 1',classes:mtColours.lsb},
                    {range:[24,31],title:'Byte 2',classes:mtColours.msb},
                    {range:[32,39],title:'Byte 3',classes:mtColours.lsb},
                    {range:[40,47],title:'Byte 4',classes:mtColours.msb},
                    {range:[48,55],title:'Byte 5',classes:mtColours.lsb},
                    {range:[56,63],title:'Byte 6',classes:mtColours.msb},
                    {range:[64,71],title:'Byte 7',classes:mtColours.lsb},
                    {range:[72,79],title:'Byte 8',classes:mtColours.msb},
                    {range:[80,87],title:'Byte 9',classes:mtColours.lsb},
                    {range:[88,95],title:'Byte 10',classes:mtColours.msb},
                    {range:[96,103],title:'Byte 11',classes:mtColours.lsb},
                    {range:[104,111],title:'Byte 12',classes:mtColours.msb},
                    {range:[112,119],title:'Byte 13',classes:mtColours.lsb},
                    {range:[120,127],title:'Byte 14',classes:mtColours.msb}
                ]
            },
            0x5:{
                title:'Stream Configuration Request'
                ,parts:[
                    {range:[16,23],title:'Protocol',classes:mtColours.msb},
                    {range:[30,30], title:"JR Receive",classes:mtColours.lsb},
                    {range:[31,31], title:"JR Transmit",classes:mtColours.msb}
                ]
            },
            0x6:{
                title:'Stream Configuration Notify'
                ,parts:[
                    {range:[16,23],title:'Protocol',classes:mtColours.msb},
                    {range:[30,30], title:"JR Receive",classes:mtColours.lsb},
                    {range:[31,31], title:"JR Transmit",classes:mtColours.msb}
                ]
            },

            0x10:{
                title: 'Get Function Block Info',
                parts:[
                    {range:[16,23],title:'Function Block #',classes:mtColours.streamId},
                    {range:[30,30],title:'Requesting a Function Block Name Notification',classes:mtColours.lsb},
                    {range:[31,31],title:'Requesting a Function Block Info Notification',classes:mtColours.numberOfBytes}
                ]
            },
            0x11:{
                title: 'Function Block Info Notification',
                parts:[
                    {range:[16,16],title:'Active',classes:mtColours.msb},
                    {range:[17,23],title:'Function Block',classes:mtColours.streamId},
                    {range:[26,27],title:'UI Hint',classes:mtColours.msb},
                    {range:[28,29],title:'Is MIDI 1.0',classes:mtColours.lsb},
                    {range:[30,31],title:'Direction',classes:mtColours.numberOfBytes},
                    {range:[32,39],title:'First Group',classes:mtColours.msb},
                    {range:[40,47],title:'Group Length',classes:mtColours.numberOfValidBytes},
                    {range:[49,55],title:'MIDI-CI Support',classes:mtColours.numberOfchunks,
                        list:{
                            0x00: 'Unknown',
                            0x01: 'MIDI CI 1.1',
                            0x02: 'MIDI CI 1.2'
                        }
                    },
                    {range:[56,63],title:'Max # SysEx Streams.',classes:mtColours.msb}
                ]
            },
            0x12:{
                title: 'Function Block Name Notification',
                parts:[
                    {range:[16,23],title:'Function Block',classes:mtColours.streamId},
                    {range:[24,31],title:'Byte 1',classes:mtColours.msb},
                    {range:[32,39],title:'Byte 2',classes:mtColours.lsb},
                    {range:[40,47],title:'Byte 3',classes:mtColours.msb},
                    {range:[48,55],title:'Byte 4',classes:mtColours.lsb},
                    {range:[56,63],title:'Byte 5',classes:mtColours.msb},
                    {range:[64,71],title:'Byte 6',classes:mtColours.lsb},
                    {range:[72,79],title:'Byte 7',classes:mtColours.msb},
                    {range:[80,87],title:'Byte 8',classes:mtColours.lsb},
                    {range:[88,95],title:'Byte 9',classes:mtColours.msb},
                    {range:[96,103],title:'Byte 10',classes:mtColours.lsb},
                    {range:[104,111],title:'Byte 11',classes:mtColours.msb},
                    {range:[112,119],title:'Byte 12',classes:mtColours.lsb},
                    {range:[120,127],title:'Byte 13',classes:mtColours.msb}
                ]
            },
            0x20:{
                title:'Start of Sequence Message'
            },
            0x21:{
                title:'End of File Message'
            }
        }
    }
];


exports.chordTonic = {
    0x00: "Unknown",
    0x01: "A",
    0x02: "B",
    0x03: "C",
    0x04: "D",
    0x05: "E",
    0x06: "F",
    0x08: "reserved"
};

exports.chordType = {
    0x00: "Clear Chord - No Chord",
    0x01: "Major",
    0x02: "Major 6th",
    0x03: "Major 7th",
    0x04: "Major 9th",
    0x05: "Major 11th",
    0x06: "Major 13th",
    0x07: "Minor",
    0x08: "Minor 6th",
    0x09: "Minor 7th",
    0x0A: "Minor 9th",
    0x0B: "Minor 11th",
    0x0C: "Minor 13th",
    0x0D: "Dominant",
    0x0E: "Dominant ninth",
    0x0F: "Dominant 11th",
    0x10: "Dominant 13th",
    0x11: "Augmented",
    0x12: "Augmented seventh",
    0x13: "Diminished",
    0x14: "Diminished seventh",
    0x15: "Half diminished (Diminished triad, minor seventh)",
    0x16: "Major-minor or Minor-major (Minor triad, major seventh)",
    0x17: "Pedal (e.g. XF 1+8)",
    0x18: "Power (e.g. XF 1+5)",
    0x19: "Suspended 2nd (e.g. XF 1+2+5)",
    0x1A: "Suspended 4th",
    0x1B: "7 Suspended 4th",
    0x1C: "Reserved"
};

exports.alterType = {
    0x00: "No alteration",
    0x01: "Add degree",
    0x02: "Subtract degree",
    0x03: "Raise degree, adding if needed",
    0x04: "Lower degree, adding if needed",
    0x5: "Reserved"
};