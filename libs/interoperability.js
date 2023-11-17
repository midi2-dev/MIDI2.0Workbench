/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

const d = require("./debugger");
const {whichGlobalMIDICI} = require("./umpDevices");

exports.interoperability=[
    {
        tab: "piInteroperability",
        title: "Process Inquiry",
        sections: [
            {
                title: "Process Inquiry Capabilities",
                questions: [
                    {id:"pInq1.1",required:true,text:"Process Inquiry Capabilities shall always set the Destination to 0x7F."},
                    {id:"pInq1.2",required:true,text:"A Responder which supports Process Inquiry and which receives an Inquiry: Process Inquiry Capabilities message shall send Reply to Process Inquiry message to the Initiator."}
                ]
            },
            {
                title: "MIDI Message Report",
                questions: [
                    {id:"pInq2.1",required:true,text:"If Device ID is 0x7F when Channel Controller and/or Note Data Message types are requested, the Responder shall report all supported Groups and Channels."},
                    {id:"pInq2.2",required:true,text:"The Responder shall return a MIDI-CI NAK Message if Device ID is set between 00-0F (channel 1-16) and that MIDI Channel is not in use."},
                    {id:"pInq2.3",required:true,text:"If MDC = 0x00 then do not report any data, send Begin / End replies only."},
                    {id:"pInq2.4",required:true,text:"If MDC = 0x01 then report only controllers with non-default values, active notes, and per-note controllers with non-default values."},
                    {id:"pInq2.5",required:true,text:"If MDC = 0x7F then Full report of all requested and supported controllers, notes, and supported per-note controllers. Do not report Controllers not in use."},
                    {id:"pInq2.6",required:true,text:"If MDC = 0x7F and note data is requested, a Responder should report Note On / Off messages for all active and inactive notes."},
                    {id:"pInq2.7",required:true,text:"If a Responder which supports Process Inquiry receives an Inquiry: MIDI Message Report, then Responder shall start its reply by sending a Reply to MIDI Message Report message."},
                    {id:"pInq2.8",required:true,text:"Reply to MIDI Message Report: The Responder shall not set any additional bits and shall not report messages that were not requested."},
                    {id:"pInq2.9",required:true,text:"The Responder shall set the Device ID field to the same value as in the Inquiry: MIDI Message Report message received."},
                    {id:"pInq2.10",required:true,text:"If Device ID is 0x7E (Group) or 0x7F (Function Block), the Responder shall not send individual Reply to MIDI Message Report (Begin) and End Messages for each individual supported channel."},
                    {id:"pInq2.11",required:true,text:"After the Responder declares the supported MIDI messages in Reply to MIDI Message Report the Responder shall send the MIDI messages it has declared with the current value for each of the supported messages."},
                    {id:"pInq2.12",required:true,text:"The Order of Messages matches the order described in MIDI-CI."},
                    {id:"pInq2.13",required:true,text:"After all requested messages have been reported, the Responder shall complete the reply by sending an End of MIDI Message Report message."},
                ]
            }
        ]
    },
    {
        tab:"midiCiChecklist",
        title:"MIDI-CI",
        sections:[
            {
                "title":"CI1: Start up",
                questions:[
                    {
                        id:"ci1.1",required:true,
                        text:"Generate new Device MUID on start up"
                    },
                    {
                        id:"ci1.2",required:true,
                        text:"Good Random Number Generator",
                        extra:"On subsequent restarts a new MUID is generated. This must be tested a minimum of 10 times and the MUID must not be repeated.",
                        test:function(opts){

                            opts.sendToInteroperabilityModal({
                                msg:"Start Test - Please make sure no other MIDI-CI devices are connected to this MIDI transport :",
                                proceedCheck:true
                            });

                            opts.ev.once('interoperabilityData',()=>{
                                opts.sendToInteroperabilityModal({
                                    msg:"Starting Test..."
                                });
                                whichGlobalMIDICI(opts.umpDev).ev.on('discoveryRequest',processDiscovery);
                                opts.indexWindow.webContents.send('asynchronous-reply', 'removeMUID', {
                                    muid:opts.currentMuid,umpDev:opts.umpDev
                                });
                                whichGlobalMIDICI(opts.umpDev).sendInvalidate(opts.currentMuid);

                            });

                            let muidList=[];
                            let oldMuid = opts.currentMuid;

                            const processDiscovery = (umpDev, group, muidRemote, device, ciSupport, maxSysex,outputPathId,fbIdx) =>{

                                opts.sendToInteroperabilityModal({msg:"New MUID: "+muidRemote},oldMuid);
                                opts.setMUID(oldMuid, muidRemote);
                                oldMuid = muidRemote;
                                if(muidList.indexOf(muidRemote)!==-1){
                                    //Duplicate/// bad mkay
                                    opts.cbComplete(false,"Got duplicate MUID");
                                    whichGlobalMIDICI(opts.umpDev).ev.removeListener('discoveryRequest',processDiscovery);
                                    return;
                                }
                                muidList.push(muidRemote);
                                if(muidList.length<10){
                                    opts.sendToInteroperabilityModal({msg:"Sending invalidate MUID"});

                                    const newResponse = whichGlobalMIDICI(opts.umpDev).createMIDICIMsg(whichGlobalMIDICI(opts.umpDev)._muid, 0x7E,0x7F, 0xFFFFFFF,{
                                        targetMuid: muidRemote, group:opts.group
                                    });
                                    whichGlobalMIDICI(umpDev).completeMIDICIMsg(newResponse, whichGlobalMIDICI(opts.umpDev).remoteDevicesInternal[muidRemote].umpDev);
                                    return;
                                }
                                whichGlobalMIDICI(opts.umpDev).loadMUID(muidRemote, opts.homedir,()=>{
                                    opts.cbComplete(true,null, muidRemote);
                                    whichGlobalMIDICI(opts.umpDev).ev.removeListener('discoveryRequest',processDiscovery);
                                });
                            };
                        }
                    },
                    {
                        id:"ci1.3",required:true,
                        text:"MUID's generated are in the range of 0x0000000 and 0xFFFFEFF"
                    }
                ]
            },
            {
                "title":"CI2: Discovery",
                questions:[
                    {
                        id:"ci2.1",required:true,
                        text:"Discovery Message sent. After start-up is completed a Discovery MIDI-CI message is sent."
                    },
                    {
                        id:"ci2.2",
                        text:"Device ID has same SysEx field values as declared in the Details page"
                    },
                    {
                        id:"ci2.3",
                        text:"Capability Inquiry Category Supported byte matches MIDI-CI table in Introduction Sheet"
                    },
                    {
                        id:"ci2.4",required:true,
                        text:"Discovery Message on start-up uses 0xFFFFFFF as the Destination address"
                    },
                    {
                        id:"ci2.5",required:true,
                        text:"The SysEx Max is >= 128 bytes",
                        test:function(opts){
                            if(whichGlobalMIDICI(opts.umpDev).getData(opts.currentMuid,'/maxSysex')>=128){
                                opts.cbComplete(true);
                            } else {
                                opts.cbComplete(false, "Max Sysex size is too small");
                            }
                        }
                    }
                ]
            },
            {
                "title": "CI3: Reply To Discovery",
                questions: [
                    {
                        id: "ci3.1",required:true,
                        text: "Reply to Discovery is only sent if Dest MUID is 0xFFFFFFF ; or matches the current Device MUID."
                    },
                    {
                        id: "ci3.2",required:true,
                        text: "The Reply to Discovery Message sets Destination Device MUID to the same as in the Source MUID declared in the received Discovery Message."
                    }
                ]
            },
            {
                "title": "CI4: Collision handling",
                questions: [
                    {
                        id: "ci4.1",required:true,
                        text: "On receiving an Invalidate MUID for the given MUID the device disconnects all existing transactions including Subscriptions."
                    },
                    {
                        id: "ci4.2",required:true,
                        text: "On receiving an Invalidate MUID for the devices current MUID the device will change it's MUID and initiate a new Discovery.",
                        test:function(opts) {
                            const oldMuid = opts.currentMuid;
                            opts.sendToInteroperabilityModal({
                                msg: "Start Test - Please make sure no other MIDI-CI devices are connected to this MIDI transport :",
                                proceedCheck: true
                            });

                            opts.ev.once('interoperabilityData', () => {
                                opts.sendToInteroperabilityModal({msg: "Starting Test..."});
                                whichGlobalMIDICI(opts.umpDev).ev.once('discoveryRequest', (umpDev, group, muidRemote, device, ciSupport, maxSysex,outputPathId,fbIdx) => {


                                    opts.sendToInteroperabilityModal({msg: "New MUID: " + muidRemote});
                                    opts.setMUID(oldMuid, muidRemote);
                                    if(muidRemote===oldMuid){
                                        opts.cbComplete(false, "Got duplicate MUID");
                                        return;
                                    }

                                    whichGlobalMIDICI(opts.umpDev).loadMUID(muidRemote, opts.homedir, () => {
                                        opts.cbComplete(true,'',muidRemote);
                                    });
                                });
                                //whichGlobalMIDICI(opts.umpDev).sendInvalidate(opts.currentMuid);
                                const newResponse = whichGlobalMIDICI(opts.umpDev).createMIDICIMsg(whichGlobalMIDICI(opts.umpDev)._muid, 0x7E,0x7F, 0xFFFFFFF,{
                                    targetMuid: opts.currentMuid, group:opts.group
                                });
                                whichGlobalMIDICI(opts.umpDev).completeMIDICIMsg(newResponse, whichGlobalMIDICI(opts.umpDev).remoteDevicesInternal[opts.currentMuid].umpDev);
                             });
                        }
                    }
                ]
            },
            {
                "title": "CI5: Turning off the device",
                questions: [
                    {
                        id: "ci5.1",
                        text: "On shutdown a Invalidate Device MUID message is sent",
                        extra:"Device that have a hard on/off switch are unlikely to send this message this should be noted in the not complete column"
                    }
                ]
            },
            {
                "title": "CI6: Order of Processing",
                questions: [
                    {
                        id: "ci6.1",required:true,
                        text: "A Discovery inquiry and Reply Transaction is performed before any other MIDI-CI Inquiry"
                    },
                    {
                        id: "ci6.2",
                        text: "An initial Protocol Negotiation enquiry is completed before any Profile Configuration and Property Exchange"
                    },
                    {
                        id: "ci6.3",
                        text: "An initial Profile Configuration enquiry is completed before any Property Exchange"
                    }

                ]
            }
        ]

    },
    {
        tab:'profileInteroperability',
        title:"Profiles",
        sections:[
            {
                title:'PF1: Profiles Supported',
                questions:[
                    {
                        id:"pf1.1",
                        text:'List MMA/AMEI defined Profiles supported',
                        type:'textarea'
                    },
                    {
                        id:"pf1.2",
                        text:'Does each Profile meet the tests of that Profile?',
                        extra:'Please include the tests results for each Profile'
                    },
                    {
                        id:"pf1.3",
                        text:'List Manufacturer Profiles and their function',
                        type:'textarea'
                    },
                    {
                        id:"pf1.4",
                        text:'Do all Manufacturer Profiles follow the CC Messages list in Appendix A of Common Rules for Profiles'
                    },
                    {
                        id:"pf1.5",
                        text:'The MIDI-CI SysEx Max is >= 512 bytes',
                        test:function(opts){
                            if(whichGlobalMIDICI(opts.umpDev).getData(opts.currentMuid,'/maxSysex')>=512){
                                opts.cbComplete(true);
                            } else {
                                opts.cbComplete(false, "Max SysEx size is too small");
                            }
                        }
                    }
                ]
            },
            {
                title:'PF2: Reply to Profile Inquiry Message',
                questions:[
                    {
                        id:"pf2.1",required:true,
                        text:'If Destination byte = 0-15. The response return profile on the corresponding channel.',
                    },
                    {
                        id:"pf2.2",required:true,
                        text:'If Destination byte = 127. The response returns a port wide profile and also provides response for each channel',
                    },
                    {
                        id:"pf2.3",required:true,
                        text:'Profiles are returned as Enabled or Disabled correctly',
                    }
                ]
            },
            {
                title:'PF3: Profile Enabled/Disabled',
                questions:[
                    {
                        id:"pf3.1",required:true,
                        text:'A Set Profile On Message for a listed Profile that can be turned on returns a Profile Enabled message.',
                    },
                    {
                        id:"pf3.2",required:true,
                        text:'A Set Profile Off Message for a listed Profile that can be turned off returns a Profile Disabled message',
                    },
                    {
                        id:"pf3.3",required:true,
                        text:'A Set Profile On Message for a listed Profile that cannot be turned on (and is currently off) returns a Profile Disabled message',
                    },
                    {
                        id:"pf3.4",required:true,
                        text:'A Set Profile Off Message for a listed Profile that cannot be turned off (and is Currently On) returns a Profile Enabled message',
                    },
                    {
                        id:"pf3.5",required:true,
                        text:'A Set Profile On Message for a non-listed Profile returns a MIDI-CI NAK',
                    },
                    {
                        id:"pf3.6",required:true,
                        text:'A Set Profile Off Message for a non-listed Profile returns a MIDI-CI NAK',
                    }
                ]
            }
        ]
    },
    {
        tab:'peInteroperability',
        title:"Property Exchange",
        sections:[
            {
                title: 'PE1: Number of Simultaneous Property Exchange Requests Supported',
                questions: [
                    {
                        id:"pe1.1",required:true,
                        text:"Number of Simultaneous Property Exchange Requests Supported >= 1",
                        test:function(opts){
                            if(whichGlobalMIDICI(opts.umpDev).getData(opts.currentMuid,'/simultaneousPERequests')>=1){
                                opts.cbComplete(true);
                            } else {
                                opts.cbComplete(false, "Simultaneous Requests is set to 0");
                            }
                        }
                    },
                    {
                        id:"pe1.2",
                        text:"Device is able to support the number of streams reported.",
                        extra: "This must be test by an Initiator making simultaneous request."
                    }
                ]
            },
            {
                title: 'PE2: Chunking Mechanisms',
                questions: [
                    {
                        id:"pe2.1",required:true,
                        text:"Device is able to receive chunks where expected number of chunks is known"
                    },
                    {
                        id:"pe2.2",required:true,
                        text:"Device is able to receive chunks where expected number of chunks is known but changes during transmission"
                    },
                    {
                        id:"pe2.3",required:true,
                        text:"Device is able to stop processing request if Number of this chunk = 0"
                    },
                    {
                        id:"pe2.4",required:true,
                        text:"The MIDI-CI SysEx Max is >= 512 bytes",
                        test:function(opts){
                            if(whichGlobalMIDICI(opts.umpDev).getData(opts.currentMuid,'/maxSysex')>=512){
                                opts.cbComplete(true);
                            } else {
                                opts.cbComplete(false, "Max SysEx size is too small");
                            }
                        }
                    }
                ]
            }
        ]
    },
    {
        tab:"midiCvmtabCheck",
        title:"MIDI Channel Voice Messages",
        sections:[
            {
                title:"Common",
                questions:[
                    {id:"m1cvm1.2",text:"Middle C is assigned to Note 60",
                        test:function(opts){
                            opts.sendToInteroperabilityModal({msg:"Start Test - Please press Middle C"});
                            const checkMIDINote = (o)=>{
                                for(let i=0; i<o.ump.length;i++) {
                                    const mess = o.ump[i];
                                    const mt = mess >>> 28;
                                    const status = mess >> 16 & 0xF0;

                                    switch (mt) {
                                        case 4:
                                            ++i;
                                        case 2: {
                                            if (status !== 0x90) continue;
                                            const val1 = mess >> 8 & 0x7F;
                                            whichGlobalMIDICI(o.umpDev).ev.removeListener('inUMP', checkMIDINote);
                                            if (val1 === 60) {
                                                opts.cbComplete(true);
                                            } else {
                                                opts.cbComplete(false, "Got different key: "+val1);
                                            }
                                        }

                                    }
                                }
                            };
                            whichGlobalMIDICI(opts.umpDev).ev.on('inUMP',checkMIDINote);
                        }

                    },
                    {id:"m1cvm1.3"
                        ,text:"A Received Note On message with a velocity of 0 is processed as a Note Off Message"
                        ,required:true,
                        extra: "Devices may send this and support is required.",
                        test:function(opts){
                            opts.sendToInteroperabilityModal({
                                msg:"Start Test - Please Choose a Channel :",
                                field:{type:"number","min":1,max:16,value:1,name:"channel1"}
                            });

                            opts.ev.once('interoperabilityData',(xData)=>{
                                opts.sendToInteroperabilityModal({
                                    msg:"Sending Middle C Note On Message channel"+ xData +", Velocity of 100"
                                });
                                let ch = (parseInt(xData,10) - 1) << 16;
                                global.umpDevices[opts.umpDev].midiOutFunc(opts.umpDev, [1083194368 + ch,4294901760]);

                                setTimeout(()=>{
                                    opts.sendToInteroperabilityModal({
                                        msg:"Sending Middle C Note On Message channel "+ xData +", Velocity of 0"
                                    });
                                    global.umpDevices[opts.umpDev].midiOutFunc(opts.umpDev, [1083194368 + ch,0]);

                                    opts.sendToInteroperabilityModal({
                                        msg:"Has the Note Stopped", "getConfirm":true
                                    });
                                },1000);

                                opts.ev.once('interoperabilityData',(xData)=>{
                                   if(xData){
                                       opts.cbComplete(true);
                                   } else {
                                       opts.cbComplete(false, "Please recheck");
                                   }
                                });
                            });
                        }
                    },
                    // {
                    //     id:"m1cvm1.4"
                    //     ,text:"Note Off messages are sent using 0x8n and not using a Note On with Velocity 0."
                    //     , extra: "It is recommended that newer Devices does not use the Note On velocity=0 method for note off."
                    //     ,test:function(opts){
                    //         opts.sendToInteroperabilityModal({msg:"Start Test - Please trigger a note"});
                    //         const checkMIDINote = (o)=>{
                    //             for(let i=0; i<o.ump.length;i++) {
                    //                 const mess = o.ump[i];
                    //                 const mt = mess >>> 28;
                    //                 const status = mess >> 16 & 0xF0;
                    //                 const val1 = mess >> 8 & 0x7F;
                    //                 let val2;
                    //
                    //                 switch (mt) {
                    //                     case 4:
                    //                         val2 = o.ump[++i];
                    //                     case 2: {
                    //                         if(mt===2) val2 = mess & 0x7F;
                    //
                    //                         if (status === 0x80){
                    //                             whichGlobalMIDICI(opts.umpDev).ev.removeListener('inUMP', checkMIDINote);
                    //                             opts.cbComplete(true);
                    //                         }else if (status === 0x90 && val2===0){
                    //                             whichGlobalMIDICI(opts.umpDev).ev.removeListener('inUMP', checkMIDINote);
                    //                             opts.cbComplete(false, "Received Note On with a velocity of 0");
                    //                         }
                    //                     }
                    //
                    //                 }
                    //             }
                    //         };
                    //         whichGlobalMIDICI(opts.umpDev).ev.on('inUMP',checkMIDINote);
                    //     }
                    // },
                    {
                        id:"m1cvm1.6"
                        ,required:true
                        ,text:"Pitch Bend message the data byte 1 is the LSB and Data byte 2 is the MSB"
                        ,showIf:["/implementation/pitchBend/transmit","/implementation/pitchBend/recognize"]
                    },
                    {id:"m1cvm1.9",required:true,text:"Control Change Messages only use CC 0-119. CC's 120-127 are only used as defined in the MIDI 1.0 Specification."},
                    {id:"m1cvm1.10",required:true,text:"When a receiver is switching between Omni On/Off and Poly or Mono modes, all notes should be turned off"},
                    {id:"m1cvm1.11",required:true,text:"A Hold or Sustain pedal 'On' message takes priority over Note Off and All Notes Off until it is released."},
                ]
            },
            // {
            //     title:"Serial Transports (Bytestreams, including 5 Pin DIN  and BLE MIDI v1.0)",
            //     visibleiftrue: "/bleTransport,/dinTransport",
            //     questions:[
            //         {id:"m1cvm1.1",required:true,text:"MIDI Receive Supports Running Status"},
            //         {
            //             id:"m1cvm1.5"
            //             ,required:true,text:"Program Change Messages only send 2 bytes"
            //         },
            //         {
            //             id:"m1cvm1.6"
            //             ,required:true
            //             ,text:"Pitch Bend message the data byte 1 is the LSB and Data byte 2 is the MSB"
            //             ,showIf:["/implementation/pitchBend/transmit","/implementation/pitchBend/recognize"]
            //         },
            //         {
            //             id:"m1cvm1.7"
            //             ,required:true,text:"Channel Pressure Messages only send 2 bytes"
            //         },
            //         {id:"m1cvm1.8",required:true,text:"Undefined Statuses are never sent."},
            //     ]
            // },
            // {
            //     title:"Packet Based Transports (USB or any that use UMP Format) except BLE MIDI v1.0\n",
            //     visibleiftrue: "/rtpTransport,/usbmidi1Transport",
            //     questions:[
            //         {id:"m1cvm2.1",text:"Note Off messages are sent using 0x8n and not using a Note On with Velocity 0."},
            //     ]
            // }
        ]
    },
    {
        tab: "midi20cvmtab",
        title: "MIDI 2.0 Channel Voice Messages",
        sections: [
            {
                title: "Common",
                questions: []
            }
        ]
    },
    {
        tab: "umptabCheck",
        title: "UMP",
        sections: [
            {
                title: "UMP Packet Format",
                questions: [
                    {
                        id:"ump2.1",required:true,
                        text:"Device knows the UMP size (32, 64, 96, or 128 bits) of Message Types 0x0 to 0xF, even " +
                            "if it does not use all Message Types, and ignores the correct number of bits for packets " +
                            "it does not understand."
                    },
                    {
                        id:"ump2.2",required:true,
                        text:"Does not send any messages using Message Types or Status Types that are Reserved or " +
                            "not defined by MIDI Specifications."
                    },
                    {
                        id:"ump2.3",required:true,
                        text:"Does not send messages with any value other than zero in any reserved fields or bits."
                    }
                ]
            }
        ]
    },
    {
        tab: "protocolInteroperability",
        title: "Protocols",
        sections: [
            {
                title: "Common",
                questions: [
                    {id:"proto1.1",required:true,text:"Listed of Supported Protocols in Initiate Protocol Negotiation Message match only specified Protocols."},
                    {id:"proto1.2",required:true,text:"List of Supported Protocols includes MIDI 2.0 Protocols only " +
                            " when connected by a transport which uses the UMP Format"},
                    {id:"proto1.3",required:true,text:"List of Supported Protocols includes protocols with Jitter " +
                            "Reduction only supported when connected by a transport which uses the UMP Format."},
                    {id:"proto1.4",required:true,text:"If using MIDI 1.0 Protocol, UMP packets larger than 64 bits " +
                            "are only sent if the Size of Packet extension flag is set in the preceding Protocol " +
                            "Negotiation transaction."},
                    {id:"proto1.5",required:true,text:"If the Device receives a Set New Protocol Message with a " +
                            "Protocol that is not supported, the Device will respond with a MIDI-CI NAK"},
                    {id:"proto1.6",required:true,text:"The list of Supported Protocol is in the order of Preference"},
                    {
                        id:"ump1.1",required:true,
                        text:"Following Protocol Negotiation, Device sends only the Message Types allowed in that " +
                            "Protocol. If the Device sends Channel Voice Messages, the Device sends all as Message " +
                            "Type 0x2 or all as Message Type 0x4"
                    }
                ]
            }
        ]
    },
    {
        tab: "systemstabCheck",
        title: "System Messages",
        sections: [
            {
                title: "Timing Clock (sync)",
                visibleiftrue: "/implementation/midiClock/transmit,/implementation/midiClock/recognize",
                questions: [
                    {id:"tc1.1",required:true,text:"The receipt of a Start (FAH) or Continue (FBH) message does not start the sequence until the next Timing Clock (F8H) is received"},
                    {id:"tc1.2",required:true,text:"The Start (FAH) and Clock (F8H) should be sent with at least 1 millisecond time between them so the receiver has time to respond"},
                    {id:"tc1.2",required:true,text:"When a manager sequencer is stopped it should send out the Stop message (FCH) immediately."},
                    {id:"tc1.3",required:true,text:"If any Note-Off messages have not been sent for corresponding Note-Ons sent before Stop was pressed, the transmitter should send the correct Note-Off messages to shut off those notes"},
                    {id:"tc1.4",required:true,text:"When a manager sequencer is stopped any controllers not in their initialized position (pitch wheels, sustain pedal, etc.) should be returned to their normal positions."},
                    {id:"tc1.5",required:true,text:"When the Device is set to transmit Timing Clock (F8H) messages it does so continuously and not just when a sequence is playing."},
                ]
            },
            {
                title: "Song Position Pointer",
                visibleiftrue: "/implementation/songPosPoint/transmit,/implementation/songPosPoint/recognize",
                questions: [
                    {id:"spp1.1",required:true,text:"SPP messages should only be recognized if the receiver is set to MIDI sync (external) mode"},
                    {id:"spp1.2",required:true,text:"Receiver continues to accept MIDI clocks after a Start has been received, and increment its Song Position while it is computing and locating to the correct address in memory for playback"},
                    {id:"spp1.3",required:true,text:"Upon receiving a Stop message (FCH), a receiver should stop playing and not increment its Song Position when subsequent Timing Clock messages are received."},
                ]
            },
            {
                title: "Song Select",
                visibleiftrue: "/implementation/songSelect/transmit,/implementation/songSelect/recognize",
                questions: [
                    {id:"ss1.1",required:true,text:"Song Select message should be ignored if the receiver is not set to respond to incoming Real Time messages (MIDI Sync)"},
                ]
            },
            {
                title: "Tune Request",
                visibleiftrue: "/implementation/tuneRequest/transmit,/implementation/tuneRequest/recognize",
                questions: [
                    {id:"tr1.1",required:true,text:"All oscillators are tuned upon receiving this message."},
                ]
            },
            {
                title: "System Reset",
                visibleiftrue: "/implementation/systemReset/transmit,/implementation/systemReset/recognize",
                questions: [
                    {id:"sr1.1",required:true,text:"This Message should be sent by manual control only"},
                    {id:"sr1.2",required:true,text:"This Message should not be sent automatically upon power-up"},
                    {id:"sr1.3",required:true,text:"This Message must not be echoed"},
                    {id:"sr1.4",required:true,text:"If this messages is received the following occurs:<br/>" +
                            "1)Set Omni On, Poly mode (if implemented)<br/>" +
                            "2)Set Local On<br/>" +
                            "3)Turn Voices Off<br/>" +
                            "4)Reset all controllers<br/>" +
                            "5)Set Song Position to 0<br/>" +
                            "6)Stop playback<br/>" +
                            "7)Clear Running Status<br/>" +
                            "8)Reset the instrument to its power-up condition<br/>"
                    },
                ]
            }
        ]
    },
    {
        tab: "sysexCheckList",
        title: "System Exclusive",
        sections: [
            {
                title: "common",
                visibleiftrue: "/bleTransport,/dinTransport,/rtpTransport,/usbmidi1Transport",
                questions: [
                    {
                        id: "sysex1.1.1", required: true,
                        text: "The Device does not use any System Exclusive IDs other than 0x7D, 0x7E, 0x7F, " +
                            "and those which have been specifically assigned to the manufacturer by the MIDI " +
                            "Association or the Association of Musical Electronics Industry.",
                        extraText: "0x7D is for Research and Development purposes while 0x7E and 0x7F are Universal" +
                            " System Exclusive Messages"
                    }
                ]
            },
            {
                title: "System Exclusive In Byte Stream Format",
                visibleiftrue: "/bleTransport,/dinTransport,/rtpTransport,/usbmidi1Transport",
                questions: [
                    {id:"sysex1.1",required:true,
                        text:"The receiver will continue to wait for data until an End Of SysEx message (F7H)"
                    },
                    {id:"sysex1.1.5",required:true,
                        text:"The receiver will continue to wait for data until any other non-Real Time status " +
                            "byte is received"
                    },
                    {id:"sysex1.2",required:true,text:"Real time messages may be inserted between data bytes of an " +
                            "Exclusive message in order to maintain synchronization, and can not be used to " +
                            "terminate an exclusive message"
                    },
                ]
            },
            {
                title: "System Exclusive In UMP Format",
                visibleiftrue: "/usbmidi2Transport",
                questions: [
                    {id:"sysex1.2.2",required:true,
                        text:"Device does not send 0xF0 Start and 0xF7 End Status bytes."
                    },
                    {id:"sysex1.2.3",required:true,
                        text:"Device does not send data bytes with value greater than 0x7F."
                    },
                    {id:"sysex1.2.4",required:true,text:"The receiver reads payload data in each packet according to " +
                            "the \"# of bytes\" field and ignores subsequent bytes in the packet."
                    },
                    {id:"sysex1.2.5",required:true,text:"Device does not assume a packet with \"# of bytes\" less " +
                            "than 6 is an End of message. Device recognizes that End of message occurs after " +
                            "receiving a packet with Status of 0x0 or 0x3."
                    },
                    {id:"sysex1.2.6",required:true,text:"Device does send interleaved Messages, and the complete " +
                            "SysEx Packet is sent before sending the next packet."
                    }
                ]
            },
            {
                title: "Universal System Exclusive",
                visibleiftrue:"/implementation/deviceInquiry",
                questions: [
                    {id:"sysex2.1",required:true,
                        text:"The Device Inquiry returns the same details as listed.",
                        test: function(opts){
                            opts.sendToInteroperabilityModal({msg:"Start Test - Sending Device Identity SysEx Request"});
                            // global.currentMidiOut._ev.once('deviceIdentityResponse',(xData)=>{
                            //     opts.sendToInteroperabilityModal({msg:"Received Device Identity SysEx Response"});
                            //     opts.sendToInteroperabilityModal({msg:"Manufacturer:" + xData.manufacturer});
                            //     opts.sendToInteroperabilityModal({msg:"Manufacturer Id:" + d.arrayToHex(xData.manufacturerId)});
                            //     opts.sendToInteroperabilityModal({msg:"Family Id:" + d.arrayToHex(xData.familyId)});
                            //     opts.sendToInteroperabilityModal({msg:"Model Id:" + d.arrayToHex(xData.modelId)});
                            //     opts.sendToInteroperabilityModal({msg:"Version:" + d.arrayToHex(xData.versionId)});
                            //     let projDevice = whichGlobalMIDICI(opts.umpDev).getData(opts.currentMuid,"/device")
                            //         || {};
                            //     if(
                            //         xData.manufacturerId.join() === (projDevice.manufacturerId || []).join()
                            //         	&& xData.familyId.join() === (projDevice.familyId || []).join()
                            //         	&& xData.modelId.join() === (projDevice.modelId || []).join()
                            //         ){
                            //         opts.cbComplete(true);
                            //     } else {
                            //         opts.sendToInteroperabilityModal({
                            //             msg:"Device Details don't match. Would you Like to set these values as the Device Details?", "getConfirm":true
                            //         });
                            //         opts.ev.once('interoperabilityData',(xDataAdd)=>{
                            //             if(xDataAdd){
                            //                 whichGlobalMIDICI(opts.umpDev).setData(opts.currentMuid,"/device",{...projDevice,...xData});
                            //                 opts.cbComplete(true);
                            //             } else {
                            //                 opts.cbComplete(false, "Device Details don't match please check debug");
                            //             }
                            //         });
                            //
                            //
                            //     }
                            // });
                            // global.currentMidiOut._u.sendProcessIdentityRequest();
                        }
                    },

                ]
            },
            {
                title: "Non-Universal System Exclusive",
                visibleiftrue: "/implementation/manuSysex/recognize,/implementation/manuSysex/transmit",
                questions: [
                    {id:"sysex1.3",required:true,text:"Non-universal Exclusive messages should include a Manufacturer Id and be in the format of F0H &lt;ID number&gt; &lt;device ID&gt; &lt;sub-ID#1&gt; &lt;sub-ID#2&gt; . . . F7H"},
                    {id:"sysex1.4",required:true,text:"The Exclusive format which is used under that Manufacturer Id number must be published within one year."},

                ]
            }
        ]
    },
    {
        tab: "tanslationtab",
        title: "MIDI 2.0<->1.0 Channel Voice Messages translation",
        sections: [
            {
                title: "Common",
                questions: []
            }
        ]
    },
    {
        tab: "mixeddataCheckList",
        title: "System Exclusive 8 and Mixed Data",
        sections: [
            {
                title: "System Exclusive 8",
                questions: [
                    {
                        id:"sysex81.1",required:true,
                        text:"The Device does not use any System Exclusive IDs other than those which have been " +
                            "specifically assigned to the manufacturer by the MIDI Association or the Association of " +
                            "Musical Electronics Industry"
                    },
                    {
                        id:"sysex81.2",required:true,
                        text:"Sender does not send simultaneous SysEx8 messages unless it has previously negotiated" +
                            " with the Receiver to confirm support for more than one Stream ID"
                    },
                    {
                        id:"sysex81.3",required:true,
                        text:"The receiver reads payload data according to the \"# of bytes\" field and ignores " +
                            "subsequent bytes in the packet."
                    },
                    {
                        id:"sysex81.4",required:true,
                        text:"Device does not assume a packet with \"# of bytes\" less than 14 is an End of message." +
                            " Device recognizes than End of message occurs after receiving a packet with Status of" +
                            " 0x0 or 0x3"
                    }

                ]
            },
            {
                title: "Mixed Data",
                questions: [
                    {
                        id:"mixeddata1.1",required:true,
                        text:"The Device does not use any System Exclusive IDs other than those which have been " +
                            "specifically assigned to the manufacturer by the MIDI Association or the Association of " +
                            "Musical Electronics Industry"
                    }

                ]
            }
        ]
    },
    {
        tab: "jrCheckList",
        title: "Jitter Reduction",
        sections: [
            {
                title: "Common",
                questions: [
                    {id:"jr1.1",required:true,text:"If Protocol Negotiation selects to use a Protocol with JR Timestamps, the Device sends a JR Clock message at least once every 250 milliseconds."},
                    {id:"jr1.2",required:true,text:"If Protocol Negotiation selects to use a Protocol with JR Timestamps, the device sends a JR Timestamp immediately preceding every MIDI Message."},
                ]
            }
        ]
    },
    {
        tab: "uarttabCheck",
        title: "UART Transport",
        sections: [
            {
                title: "Hardware Consideration",
                questions: [
                    {id:"uart1.1",required:true,text:"The interface is 31.25KBaud"
                        , extra:"The hardware MIDI interface operates at 31.25 (+/- 1%) Kbaud, asynchronous, with a start bit, 8 data bits (D0 to D7), and a stop bit"}
                    ,{id:"uart1.2",required:true,text:"Ground loops are avoided by using an OptoIsolator"
                        ,extra:"To avoid ground loops, and subsequent data errors, the transmitter\n" +
                            "circuitry and receiver circuitry are internally separated by an opto-isolator. The receiver must require\n" +
                            "less than 5 mA to turn on. Rise and fall times should be less than 2 microseconds."}
                    ,{id:"uart1.3",
                        text:"MIDI Ports are clearly marked in, out and through",
                        extra:"TRS MIDI connections use connections as shown in RP54 (Type A)"}
                ]
            }
        ]
    },
    {
        tab: "rtptab",
        title: "RTP MIDI",
        sections: [
            {
                title: "Common",
                questions: []
            }
        ]
    }
];

exports.implementation=[
    // {
    //     title: "Basic Information",
    //     questions:[
    //         // {id:"midiChannels","title":"MIDI channels"},
    //         // {id:"noteNumbers","title":"Note Numbers"},
    //         // {id:"programChange","title":"Program change"},
    //         // {
    //         //     id:"bankSelect","title":"Bank Select Response"
    //         //     ,type:"checkbox"
    //         //     ,extra:"If yes, list banks utilized in remarks column"
    //         //     ,noTransmit:true
    //         // },
    //         // {
    //         //     id:"modeSupported","title":"Modes Supported"
    //         //     ,type:"subList"
    //         //     ,questions:[
    //         //         {id:"mode1","title":"Mode 1: Omni-On, Poly",type:"checkbox",noTransmit:true},
    //         //         {id:"mode2","title":"Mode 2: Omni-On, Mono",type:"checkbox",noTransmit:true},
    //         //         {id:"mode3","title":"Mode 3: Omni-Off, Poly",type:"checkbox",noTransmit:true},
    //         //         {id:"mode4","title":"Mode 4: Omni-Off, Mono",type:"checkbox",noTransmit:true},
    //         //         {id:"modeMulti","title":"Multi Mode",type:"checkbox",noTransmit:true}
    //         //     ]
    //         // },
    //         // {id:"noteOnVelocity","title":"Note On Velocity",type:"checkbox"},
    //         // {id:"noteOfVelocity","title":"Note Off Velocity",type:"checkbox"},
    //         // {id:"channelAfterTouch","title":"Channel AfterTouch",type:"checkbox"},
    //         // {id:"polyTouch","title":"Poly (Key) Aftertouch",type:"checkbox"},
    //         // {id:"pitchBend","title":"Pitch Bend",type:"checkbox"},
    //         // {id:"activeSense","title":"Active Sense",type:"checkbox"},
    //         // {id:"systemReset","title":"System Reset",type:"checkbox"},
    //         // {id:"tuneRequest","title":"Tune Request",type:"checkbox"},
    //         // {
    //         //     id:"unviersalSysex","title":"Universal System Exclusive"
    //         //     ,type:"subList"
    //         //     ,questions:[
    //         //         {id:"sds","title":"Sample Dump Standard",type:"fullPartial"},
    //         //         {id:"deviceInquiry","title":"Device Inquiry",type:"fullPartial"},
    //         //         {id:"fileDump","title":"File Dump",type:"fullPartial"},
    //         //         {id:"midiTuning","title":"MIDI Tuning",type:"fullPartial"},
    //         //         {id:"masterVolume","title":"Master Volume",type:"fullPartial"},
    //         //         {id:"masterBalance","title":"Master Balance",type:"fullPartial"},
    //         //         {id:"notationInfo","title":"Notation Information",type:"fullPartial"},
    //         //         {id:"gm1On","title":"Turn GM1 System On",type:"fullPartial"},
    //         //         {id:"gm2On","title":"Turn GM2 System On",type:"fullPartial"},
    //         //         {id:"gmOff","title":"Turn GM System Off",type:"fullPartial"},
    //         //         {id:"dls1","title":"DLS-1",type:"fullPartial"},
    //         //         {id:"fileRef","title":"File Reference",type:"fullPartial"},
    //         //         {id:"controllerDest","title":"Controller Destination",type:"fullPartial"},
    //         //         {id:"keyBasedInstCtrl","title":"Key-based Instrument Ctrl",type:"fullPartial"},
    //         //         {id:"fineCoarseTune","title":"Fine/Coarse Tune",type:"fullPartial"},
    //         //         {id:"otherUniSysex","title":"Other Universal System Exclusive"},
    //         //     ]
    //         // },
    //         // {id:"manuSysex","title":"Manufacturer or Non-Commercial System Exclusive"},
    //         // {id:"nrpns","title":"NRPNs",type:"checkbox"},
    //         // {
    //         //     id:"rpns"
    //         //     ,"title":"RPNs"
    //         //     ,type:"subList"
    //         //     ,questions:[
    //         //         {id:"rpn00","title":"RPN 00 (Pitch Bend Sensitivity)",type:"checkbox"},
    //         //         {id:"rpn01","title":"RPN 01 (Channel Fine Tune)",type:"checkbox"},
    //         //         {id:"rpn02","title":"RPN 02 (Channel Coarse Tune)",type:"checkbox"},
    //         //         {id:"rpn03","title":"RPN 03 (Tuning Program Select)",type:"checkbox"},
    //         //         {id:"rpn04","title":"RPN 04 (Tuning Bank Select)",type:"checkbox"},
    //         //         {id:"rpn05","title":"RPN 05 (Modulation Depth Range)",type:"checkbox"}
    //         //     ]
    //         // }
    //     ]
    // },
    // {
    //     title: "MIDI Timing and Synchronization",
    //     questions:[
    //         // {id:"midiClock","title":"MIDI Clock",type:"checkbox"},
    //         // {id:"songPosPoint","title":"Song Position Pointer",type:"checkbox"},
    //         // {id:"songSelect","title":"Song Select",type:"checkbox"},
    //         // {
    //         //     id:"ssc"
    //         //     ,type:"subList"
    //         //     ,questions:[
    //         //         {id:"start","title":"Start",type:"checkbox"},
    //         //         {id:"continue","title":"Continue",type:"checkbox"},
    //         //         {id:"stop","title":"Stop",type:"checkbox"}
    //         //     ]
    //         // },
    //         // {id:"mtc","title":"MIDI Time Code",type:"checkbox"},
    //         // {id:"mmc","title":"MIDI Machine Control",type:"checkbox"},
    //         // {
    //         //     id:"msc"
    //         //     ,type:"subList"
    //         //     ,"title":"MIDI Show Control"
    //         //     ,questions:[
    //         //         {id:"midiShowControl","title":"Available",type:"checkbox"},
    //         //         {id:"mscLevel","title":" MSC Level supported"}
    //         //     ]
    //         // }
    //     ]
    // },
    {
        title: "Extensions Compatibility",
        questions: [
            {
                id:"gm"
                ,type:"subList"
                ,"title":"General MIDI"
                ,questions:[
                    {id: "gmCompatible", "title": "General MIDI compatible? (level)"},
                    {id:"gmDefPowerUp","title":" Is GM default power-up mode? (level)"}
                ]
            },
            {
                id:"dls"
                ,"title":"DLS"
                ,type:"subList"
                ,questions:[
                    {id: "dlsCompatible", "title": "DLS compatible? (level)"},
                    {id:"dlsFileType","title":" DLS File Type(s)"}
                ]
            },
            {id: "stdMidiFiles", "title": "Standard MIDI Files (Type(s))"},
            {id: "xmfFiles", "title": "XMF Files (Type(s))"},
            {id: "spMIDI", "title": "SP-MIDI compatible?",type:"checkbox"}
        ]
    }
];
