/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');

const midi2Tables = require('../../../../libs/midiCITables.js');
const guiBuilder = require('../../../../libs/guiBuilder.js');
const common = require('../../common.js');
const t = require('../../../../libs/translations.js');
const {JsonPointer: ptr } = require('json-ptr');

const setupSynth =require ('../../../../extensions/exp_ProfileDrawbarOrgan/sound').setupSynth;

const dbOrgan = new setupSynth();

let ipccallbacks={};
let ipccallbacksSubs={};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

let gui,MIDIReportMessage,CtrlList,_elementLookup=[];
window.gui = gui;
window.uiWinId = null;
window.sourceDestination=null;
window.matchedProfile={};

document.addEventListener('DOMContentLoaded', () => {

    ipcRenderer.on('asynchronous-reply', (event, arg, xData) => {
        //console.log(arg);

        switch (arg) {
            case 'callback':
                if(ipccallbacks[xData.callbackId]){
                    ipccallbacks[xData.callbackId](xData.data);
                    delete ipccallbacks[xData.callbackId];//called once and removed
                }else {
                    //debugger;
                }

                break;
            case 'callbackSub':
                if(xData.command=="end"){
                    delete ipccallbacksSubs[xData.callbackId];
                }else
                if(ipccallbacksSubs[xData.callbackId]){
                    ipccallbacksSubs[xData.callbackId](xData.data); //maybe called several tiimes
                }else {
                    //debugger;
                }

                break;
            case 'controlUpdate':
                if(xData.umpDev !== window.ump.umpDev)break;
                gui.updateViaUMP(xData.ump);

                let outpackets = t.umpToMidi10(xData.ump);
                outpackets.map(msg=>{
                    dbOrgan.onMidiMessage(msg);
                });
                break;

            case 'settings':{
                let optionFeatures = ptr.get(xData,`/profiles/${window.matchedProfile.profileSysex.join('_')}/sourceDestinations/${window.ump.group}_${window.sourceDestination}/detailsInquiry/1`)
                if(optionFeatures){
                    const supText = `Supported params: ${optionFeatures.softPedal?'Soft-Pedal ':''}${optionFeatures.vibratoChorus?'Vibrato/Chorus ':''}${optionFeatures.percussion?'Percussion ':''}${optionFeatures.keyClick?'Key-Click ':''}${optionFeatures.crosstalk?'Crosstalk/Leakage ':''}`;
                    $('#supported').remove();
                    $('<div/>',{id:'supported'}).text(supText).appendTo('#main');
                }
                break;
            }
            case 'firstLoad':{
                window.ump = {group:xData.group,umpDev:xData.umpDev,muid:xData.muid,funcBlock:xData.funcBlock};
                window.link = xData.link;
                window.sourceDestination = xData.sourceDestination;
                window.uiWinId = xData.uiWinId;

                midi2Tables.profiles.map(rawPF=>{
                    if(rawPF.bank===xData.bank && rawPF.index===xData.index){
                        //Great Found match
                        window.matchedProfile={
                            ...xData,
                            ...rawPF
                        };
                    }
                });

                //Build window.matchedProfile Titling etc
                common.buildProfilePage(
                    window.matchedProfile
                );

                dbOrgan.setMidiChannel(window.sourceDestination);

                gui = new guiBuilder($('#gui'), {
                    UIList: [
                        {"ui": "block", "rect": [0, 0, 16, 11], "styleIds": ["bg"]},

                        {"ui": "block", "rect": [0, 0, 10, 6], "styleIds": ["bgDrawbars"]},
                        {"ui": "slider", "rect": [1, 1, 1, 3], "title": "16'", "paramPath": "/drawbars/0", "minMax": [0, 8], precision:0.01},
                        {"ui": "slider", "rect": [2, 1, 1, 3], "title": "5 ⅓'", "paramPath": "/drawbars/1", "minMax": [0, 8], precision:0.01},
                        {"ui": "slider", "rect": [3, 1, 1, 3], "title": "8'", "paramPath": "/drawbars/2", "minMax": [0, 8], precision:0.01},
                        {"ui": "slider", "rect": [4, 1, 1, 3], "title": "4'", "paramPath": "/drawbars/3", "minMax": [0, 8], precision:0.01},
                        {"ui": "slider", "rect": [5, 1, 1, 3], "title": "2⅔'", "paramPath": "/drawbars/4", "minMax": [0, 8], precision:0.01},
                        {"ui": "slider", "rect": [6, 1, 1, 3], "title": "2'", "paramPath": "/drawbars/5", "minMax": [0, 8], precision:0.01},
                        {"ui": "slider", "rect": [7, 1, 1, 3], "title": "1⅗'", "paramPath": "/drawbars/6", "minMax": [0, 8], precision:0.01},
                        {"ui": "slider", "rect": [8, 1, 1, 3], "title": "1⅓'", "paramPath": "/drawbars/7", "minMax": [0, 8], precision:0.01},
                        {"ui": "slider", "rect": [9, 1, 1, 3], "title": "1'", "paramPath": "/drawbars/8", "minMax": [0, 8], precision:0.01},
                        {"ui": "label", "rect": [1, 4, 1, 1], "title": "16'"},
                        {"ui": "label", "rect": [2, 4, 1, 1], "title": "5 ⅓'"},
                        {"ui": "label", "rect": [3, 4, 1, 1], "title": "8'"},
                        {"ui": "label", "rect": [4, 4, 1, 1], "title": "4'"},
                        {"ui": "label", "rect": [5, 4, 1, 1], "title": "2 ⅔'"},
                        {"ui": "label", "rect": [6, 4, 1, 1], "title": "2'"},
                        {"ui": "label", "rect": [7, 4, 1, 1], "title": "1 ⅗'"},
                        {"ui": "label", "rect": [8, 4, 1, 1], "title": "1 ⅓'"},
                        {"ui": "label", "rect": [9, 4, 1, 1], "title": "1'"},

                        {"ui": "block", "rect": [10, 0, 6, 6], "styleIds": ["bgPerc"]},
                        {"ui": "label", "rect": [11, 1, 2, 1], "title": "Perc On"},
                        {"ui": "switch", "rect": [13, 1, 2, 1], "title": "Perc On", "paramPath": "/perc/on"},
                        {"ui": "label", "rect": [11, 2, 2, 1], "title": "Volume"},
                        {"ui": "valueSelect", "rect": [13, 2, 2, 1], "title": "Percussion Volume"
                            , "paramPath": "/perc/volume"
                            , "uiMapId": "MAPPERCVOL"
                        },
                        {"ui": "label", "rect": [11, 3, 2, 1], "title": "Decay"},
                        {"ui": "valueSelect", "rect": [13, 3, 2, 1], "title": "Decay", "paramPath": "/perc/decay"
                            , "uiMapId": "MAPPERCDECAY"},
                        {"ui": "label", "rect": [11, 4, 2, 1], "title": "Harmonic"},
                        {"ui": "valueSelect", "rect": [13, 4, 2, 1], "title": "Harmonic", "paramPath": "/perc/harmonic"
                            ,uiMapId: 'MAPPERCHARM'
                        },

                        {"ui": "block", "rect": [0, 5, 16, 3], "styleIds": ["bgVol"]},
                        {"ui": "label", "rect": [1, 5, 2, 1], "title": "Volume"},
                        {"ui": "slider", "rect": [3, 5, 3, 1], "title": "Volume", "paramPath": "/volume", "minMax": [0, 1], precision:0.01},
                        {"ui": "label", "rect": [8, 5, 2, 1], "title": "Expression"},
                        {"ui": "slider", "rect": [10, 5, 3, 1], "title": "Expression", "paramPath": "/expression", "minMax": [0, 1], precision:0.01},
                        {"ui": "label", "rect": [1, 6, 2, 1], "title": "Key Click"},
                        {"ui": "slider", "rect": [3, 6, 3, 1], "title": "Key Click", "paramPath": "/keyClick", "minMax": [0, 1], precision:0.01},
                        {"ui": "label", "rect": [8, 6, 2, 1], "title": "Crosstalk"},
                        {"ui": "slider", "rect": [10, 6, 3, 1], "title": "Crosstalk", "paramPath": "/crosstalk", "minMax": [0, 1], precision:0.01},

                        {"ui": "label", "rect": [1, 7, 3, 1], "title": "Chorus/Vibrato"},
                        {"ui": "switch", "rect": [4, 7, 2, 1], "title": "Chorus/Vibrato", "paramPath": "/chorusVibrato/on"},
                        {"ui": "label", "rect": [7, 7, 3, 1], "title": "Type"},
                        {"ui": "valueSelect", "rect": [10, 7, 3, 1], "title": "Chrorus/Vibrato Type", "paramPath": "/chorusVibrato/type"
                            , "uiMapId": "MAPCVTYPE"},

                        {"ui": "keys", "rect": [0, 8, 16, 3], "styleIds": ["bgKeys"], noteRange:[36,96]},
                    ],
                    data: {
                        drawbars:[4,4,4,4,4,4,4,4,4],
                        perc: {on: true, volume: 'soft', decay: 'fast', harmonic: 'third'},
                        volume: 1,
                        expression: 1,
                        keyClick: 0.5,
                        crosstalk: 0,
                        chorusVibrato: {
                            on : true,
                            type: 'V1'
                        }
                    },
                    UIStyleList: [],
                    CtrlList: window.matchedProfile.CtrlList || [],
                    channelListData:{channel:window.sourceDestination,umpGroup:window.ump.group},
                    schemaName:'GUI',//+opts.link.resId+opts.link.data.resId,
                    onFileRequest: function (type, resId, cb) {
                        if(type==='UIMapList'){
                            if(resId==='MAPPERCVOL'){
                                cb([
                                    {title:'Soft', value:'soft', contValue:0},
                                    {title:'Normal', value:'normal', contValue:4294967295}
                                ]);
                            }else if(resId==='MAPPERCDECAY'){
                                cb([
                                    {title:'Slow', value:'slow', contValue:0},
                                    {title:'Fast', value:'fast', contValue:4294967295}
                                ]);
                            }else if(resId==='MAPPERCHARM'){
                                cb([
                                    {title:'Second', value:'second', contValue:0},
                                    {title:'Third', value:'third', contValue:4294967295}
                                ]);
                            }else if(resId==='MAPCVTYPE'){
                                cb([
                                    {title:'V1', value:'V1', contValue:0},
                                    {title:'C1', value:'C1', contValue:771751936},
                                    {title:'V2', value:'V2', contValue:1509949440},
                                    {title:'C2', value:'C2', contValue:2249744774},
                                    {title:'V3', value:'V3', contValue:2999659698},
                                    {title:'C3', value:'C3', contValue:4294967295},
                                ]);
                            }
                        }
                    },
                    buttonClick:function(jq,link,channelListData){

                    },
                    updateData:function(oUp){
                        if(oUp.path){
                          //  ptr.set(uiData, oUp.path, oUp.value, true);
                        }
                        //TODO FiX MIDI No longer available
                        // if(oUp.midi){
                        //     oUp.midi.map(m=>{
                        //         dbOrgan.onMidiMessage(m);
                        //     });
                        // }

                        if(oUp.ump){
                            //debugger;
                            ipcRenderer.send('asynchronous-message', 'sendUMP',{ump:oUp.ump,...window.ump});
                        }else{

                        }
                    }
                });

                break;
            }
            case 'profileSpecificData':{
                if(
                    xData.sourceDestination !== window.sourceDestination
                    || xData.profile.bank !== window.matchedProfile.bank
                    || xData.profile.index !== window.matchedProfile.index
                ){
                    return; //unmatched Profile
                }

                if(xData.profileSpecificData.opCode === 1){
                    //We have the BMI
                    //debugger;
                    //TODO Build window.matchedProfile.profileSpecificData
                }


                break;
            }
            case 'CtrlListInfo':
                //debugger;
                CtrlList = xData.CtrlList;
                MIDIReportMessage = xData.MIDIReportMessage;
                const jqCMEntries = $('#main');

                CtrlList.map(cm=>{
                    const jqCard = $('<div/>', {"class": 'card ml-3'})
                        .appendTo(jqCMEntries);
                    const jqHead = $('<div/>', {"class": 'card-header p-3 '})
                        .css({padding: 0})
                        .append('<h4>' + cm.title + '</h4>')
                        .append('<div>' + cm.ctrlType  + ' ' + (Array.isArray(cm.ctrlIndex)?cm.ctrlIndex.join():'') + '</div>')
                        .appendTo(jqCard);
                    if(cm.priority){
                        jqHead.append('<div>Priority: ' + (cm.priority || '') + '</div>')
                    }
                    if(cm.paramPath){
                        jqHead .append('<div>' + cm.paramPath + '</div>');
                    }
                    //default transmit recognize minMax signifBits typeHint uiMapId stepCount

                    const jqBody = $('<div/>', {"class": 'card-body'})
                        .appendTo(jqCard);

                    const id = Math.random().toString(36).substr(2, 9);
                    let value=0;
                    cm.idx=cm.ctrlIndex[0]
                    cm.minMax = cm.minMax || [0,4294967295]
                    if(cm.ctrlIndex.length>1){
                        cm.idx = cm.idx << 7;
                        cm.idx += cm.ctrlIndex[1];
                    }


                    switch(cm.typeHint){
                        case 'toggle':
                        case 'momentary':
                        case 'valueSelect':
                        case 'relative':
                        case 'continuous':
                        default:
                            const min = cm.minMax[0];
                            const max = cm.minMax[1];
                            const jqInput = $('<input/>'
                                ,{
                                    type:'range',
                                    'min':  min,
                                    'max': max,
                                    'step': 0.01,
                                    'value': MIDIReportMessage.controllerMsg[channel][cm.ctrlType][cm.idx] ,
                                    'orient': 'vertical'
                                }
                            )
                                .appendTo(jqBody)
                                .on('input',_jqValChange)
                                .data('cm',cm);
                            _elementLookup.push(jqInput);
                            break;

                    }

                    if(cm.description){
                        jqBody .append('<hr/>' + cm.description + '');
                    }
                });






                break;
        }
    });


    //Todo Build Visualizer of Organ


});
