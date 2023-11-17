/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');
const {JsonPointer: ptr } = require('json-ptr');
const common = require('./app/common.js');
const t = require('./../libs/translations.js');
const loki = require("lokijs");

const {Macro_ChorusNode, Macro_DelayNode} = require("./app/sound/webaudio-macronodes");
const setupOrganSynth =require ('./app/sound/organ/index.js').setupSynth;


const patchdbPath = require('os').homedir()+'/midi2workbench/patches.db';
let patchesDB;
const db = new loki(patchdbPath, {
    autoload: true,
    autoloadCallback : () => {
        patchesDB = db.getCollection("patches");
    },
    autosave: true,
    autosaveInterval: 4000
});


//debugger;
window.settings={};
window.devices={};
window.configSetting={};
let firstLoad = true,peSetup=false;
const actx = new AudioContext();

const ipccallbacks={};
const ipccallbacksSubs={};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

const soundEngines =  [];

document.addEventListener('DOMContentLoaded', () => {
    AWPF.polyfill(actx, []).then(function () {
        DX7.importScripts(actx).then(()=>{

            let ipcProcess = {};

            ipcRenderer.on('asynchronous-reply', (event, arg, xData) => {
                //console.log(arg);
                if(ipcProcess[arg]){
                    ipcProcess[arg](xData,common);
                }

                switch (arg) {

                    case 'MIDIDevices':
                        window.devices = xData;
                        break;


                    case 'callback':
                        if(ipccallbacks[xData.callbackId]){
                            ipccallbacks[xData.callbackId](xData.data);
                            delete ipccallbacks[xData.callbackId];//called once and removed
                        }else {
                            //debugger;
                        }

                        break;
                    case 'callbackSub':
                        if(xData.command==="end"){
                            delete ipccallbacksSubs[xData.callbackId];
                        }else
                        if(ipccallbacksSubs[xData.callbackId]){
                            ipccallbacksSubs[xData.callbackId](xData.data); //maybe called several tiimes
                        }else {
                            //debugger;
                        }

                        break;

                    case 'configSettings':
                        window.configSetting = xData;
                        common.setValues();
                        common.setValueOnChange();


                        break;
                    case 'controlUpdate':
                        //if(xData.umpDev !== window.ump.umpDev)break;
                        const ump = t.ump10To20(xData.ump,'conv');

                        for(let i=0; i<ump.length;i++) {
                            const mess = ump[i];
                            const mt = mess >>> 28;
                            switch (mt) {
                                case 4: //64 bits MIDI 2.0 Channel Voice Messages

                                    const mess2 =  ump[++i];
                                    const group= mess >> 24 & 0xF;
                                    const status= mess >> 16 & 0xF0;
                                    let channelUMP= mess >> 16 & 0xF;
                                    let val1 = mess >> 8 & 0xFF;
                                    let val2 = mess & 0xFF;
                                    const out = [mess >> 16 & 0xFF];
                                    //convert note on zero velocity to noteoff


                                    const grCh = channelUMP + group * 16;
                                    if(!soundEngines[grCh])break;

                                    switch(status){
                                        case 0x80: //note off
                                            soundEngines[grCh].tg.onMidiMessage([0x80,val1,
                                                mess2 >> 23]
                                            );
                                            break;
                                        case 0x90: //note on
                                            soundEngines[grCh].tg.onMidiMessage([0x90,val1,
                                                mess2 >> 23]
                                            );
                                            break;
                                        case 0xA0: //poly aftertouch
                                            soundEngines[grCh].tg.onMidiMessage([0xA0,val1,
                                                mess2 >> 23]
                                            );
                                            break;
                                        case 0xB0: //CC
                                            soundEngines[grCh].tg.onMidiMessage([0xB0,val1,
                                                mess2 >> 23]
                                            );
                                            break;
                                        case 0xD0: //Channel Pressure
                                            soundEngines[grCh].tg.onMidiMessage([0xD0,
                                                mess2 >> 23]
                                            );
                                            break;
                                        case 0b00100000: { //rpn
                                            soundEngines[grCh].tg.onMidiMessage([0xB0, 101, val1]);
                                            soundEngines[grCh].tg.onMidiMessage([0xB0, 100, val2]);
                                            const val14bit = t.scaleDown(mess2 >>> 0, 32, 14);
                                            soundEngines[grCh].tg.onMidiMessage([0xB0, 6, (val14bit >> 7) & 0x7F]);
                                            soundEngines[grCh].tg.onMidiMessage([0xB0, 38, (val14bit & 127) & 0x7F]);
                                            break;
                                        }
                                        case 0b00110000: { //nrpn
                                            soundEngines[grCh].tg.onMidiMessage([0xB0, 99, val1]);
                                            soundEngines[grCh].tg.onMidiMessage([0xB0, 98, val2]);
                                            const val14bit = t.scaleDown(mess2 >>> 0, 32, 14);
                                            soundEngines[grCh].tg.onMidiMessage([0xB0, 6, (val14bit >> 7) & 0x7F]);
                                            soundEngines[grCh].tg.onMidiMessage([0xB0, 38, (val14bit & 127) & 0x7F]);
                                            break;
                                        }
                                        case 0xC0: //Program change
                                            if (mess & 0x1) {
                                                soundEngines[grCh].tg.onMidiMessage([0xB0, 0, mess2 >> 8 & 0x7F]);
                                                soundEngines[grCh].tg.onMidiMessage([0xB0, 32, mess2 & 0x7F]);
                                                soundEngines[grCh].tg.onMidiMessage([0xC0, mess2 >> 24 & 0x7F]);
                                            } else {
                                                soundEngines[grCh].tg.onMidiMessage([0xC0, mess2 >> 24 & 0x7F]);
                                            }
                                            break;
                                        case 0xE0: //Pitch bend
                                            soundEngines[grCh].tg.onMidiMessage([0xE0,mess2 >> 18 & 0x7F,
                                                mess2 >> 25 & 0x7F]);
                                            break;
                                    }



                                    break;
                                default:
                                    break;
                            }
                        }

                        break;

                }
            });



            ipcRenderer.send('asynchronous-message', 'getMIDIDevices');
            ipcRenderer.send('asynchronous-message', 'getConfig');
            ipcRenderer.send('asynchronous-message', 'getSettings');
            //ipcRenderer.send('asynchronous-message', 'getAudio');

            //dbOrgan.setMidiChannel(0);

            common.setValueOnChange(ipcRenderer);



        });

    });


    const keys = new Nexus.Piano('#pianoKeys', {
       'mode': 'button',  // 'button', 'toggle', or 'impulse'
        'lowNote': 24,
        'highNote': 84
    });

    keys.on('change', function (v) {
        //this._ref.self._sendNote(this._ref, v.note, v.state?0x90:0x80);
        //debugger
    });
});

function buildGroupBlocks(){
    $('#GB > li').not('#addGB').remove();
    soundEngines.map(eng => {(eng||{}).remove=true});
    window.configSetting.groupBlocks.map((gb,idx) => {
        const gbJq = $('<li/>',{class:'list-group-item'})
            .insertBefore('#addGB')
        ;
        let jqTitle = $('<div/>',{"class":'input-group'}).appendTo(gbJq);

        $('<input/>',{class:"form-control",value: gb.name, placeholder:"Group Block Name",
            "data-path": '/config/groupBlocks/'+idx+'/name'
        }).appendTo(jqTitle);

        let jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqTitle);
        $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Type");
        let jqgrMode = $('<select/>',{class:"form-control",
            "data-path": '/config/groupBlocks/'+idx+'/mode'})
            .on('change.value', (e) => {
                setTimeout(()=>{
                    if($(e.currentTarget).val()==='m1port'){
                        common.setConfig('/groupBlocks/'+idx+'/groupLength',1);
                    }
                    buildGroupBlocks();
                },100);
            })
            .appendTo(jqTitle);
        $('<option/>',{value:'tg', selected: (gb.mode === 'tg')}).text('Tone Generator').appendTo(jqgrMode);
        $('<option/>',{value:'mpe', selected: (gb.mode === 'mpe')}).text('MPE').appendTo(jqgrMode);
        $('<option/>',{value:'m1port', selected: (gb.mode === 'm1port')}).text('MIDI 1 Port').appendTo(jqgrMode);

        jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqTitle);
        $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Group Start");
        $('<input/>',{class:"form-control",value: gb.groupStart,
            "type":'number', step:1, min:1, max:16,
            "data-path": '/config/groupBlocks/'+idx+'/groupStart'}).appendTo(jqTitle);

        jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqTitle);
        $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Group Length");
        $('<input/>',{class:"form-control",value: gb.mode === 'm1port'?1:gb.groupLength,
            "type":'number', step:1, min:1, max:15,
            "data-path": '/config/groupBlocks/'+idx+'/groupLength',
            disabled: (gb.mode === 'm1port')
            })
            .on('change.value', (e) => {
                setTimeout(()=>{
                    buildGroupBlocks();
                },100);
            })
            .appendTo(jqTitle);

        //TODO Delete Block


        switch(gb.mode){
            case "tg":
                const jqTable = $('<table/>',{class:'table'}).appendTo(gbJq);
                $('<thead/>')
                    .append('<tr style="text-align: center">' +
                        '<th style="width: 50px">Group</th>' +
                        '<th style="width: 125px">Channel</th>' +
                        '<th style="width: 50px">Enable</th>' +
                        '<th>Details</th><th>Profiles</th></tr>')
                    .appendTo(jqTable);
                const jqTbody = $('<tbody/>').appendTo(jqTable);
                //TODO Channels/Port
                const jqtr = $('<tr/>')
                    .append('<td colspan="2" style="text-align: center">Group Block (0x7F)</td>')
                    .append('<td/>')
                    .append('<td/>')

                    .appendTo(jqTbody);
                $('<td/>').appendTo(jqtr); //Profiles

                for(let i=0; i< gb.groupLength*16;i++){
                    if((i%16) === 0){
                        const jqtr = $('<tr/>')
                            .append('<td style="text-align: center">'+ (Math.floor(i/16) + gb.groupStart) +'</td>')
                            .append('<td style="text-align: center">Group (0x7E)</td>')
                            .append('<td/>')
                            .append('<td/>')

                            .appendTo(jqTbody);
                        $('<td/>').appendTo(jqtr); //Profiles
                    }
                    const jqtr = $('<tr/>')
                        .append('<td style="text-align: center">'+ (Math.floor(i/16) + gb.groupStart) +'</td>')
                        .append('<td style="text-align: center">'+ ((i%16) +1) +'</td>')
                        .appendTo(jqTbody);

                    const jqEnable = $('<td/>').appendTo(jqtr)
                    $('<input/>',{type:'checkbox',
                        "data-path": '/config/groupBlocks/'+idx+'/channel/'+i+'/enable',
                        checked: (gb.channel||[])[i]?.enable
                        })
                        .on('change.value', (e) => {
                            setTimeout(()=>{
                                buildGroupBlocks();
                            },100);
                        })
                        .appendTo(jqEnable);

                    const jqDetails = $('<td/>').appendTo(jqtr);
                    if((gb.channel||[])[i]?.enable){
                        jqDetails.append('Program:');

                        let jqProgramList = $('<select/>',{class:"form-control"})
                            .on('change.value', (e) => {
                                setTimeout(()=>{
                                    const val = $(e.currentTarget).val().match(/(\d+)_(\d+)_(\d+)/);
                                    common.setConfig('/groupBlocks/'+idx+'/channel/'+i+'/bankPC',val.slice(1).map(Number));
                                    buildGroupBlocks();
                                },100);
                            })
                            .appendTo(jqDetails);
                        const ch = i;
                        patchesDB.chain().data().map(p=>{
                            const value = p.bankPC.join('_');
                            const selected = ((gb.channel[i].bankPC||[]).join('_') === value);
                            $('<option/>',{value, selected } )
                                .text(p.name + ' ('+p.engine+')').appendTo(jqProgramList);

                            if(selected){
                                //Load up engine
                                const grCh = ch + (gb.groupStart-1) * 16;
                                if(!soundEngines[grCh])soundEngines[grCh]={};
                                delete soundEngines[grCh].remove;
                                if(soundEngines[grCh].engine !== p.engine){
                                    soundEngines[grCh].engine = p.engine;
                                    if(p.engine === 'dx7'){
                                        soundEngines[grCh].tg = new DX7(actx);
                                        soundEngines[grCh].tg.chorus=new Macro_ChorusNode(actx);
                                        soundEngines[grCh].tg.delay=new Macro_DelayNode(actx);
                                        soundEngines[grCh].tg
                                            .connect(soundEngines[grCh].tg.delay)
                                            .connect(soundEngines[grCh].tg.chorus)
                                            .connect(actx.destination);
                                        //TODO load up sound
                                    }
                                    if(p.engine === 'organ'){
                                        soundEngines[grCh].tg = new setupOrganSynth();
                                    }

                                }

                                if((soundEngines[grCh].bankPC||[]).join('_') !== value){
                                    soundEngines[grCh].bankPC = p.bankPC;
                                    if(soundEngines[grCh].engine === 'dx7'){
                                        soundEngines[grCh].tg.dx7PatchIntoBuffer(p);
                                        soundEngines[grCh].tg.chorus.effect = p.chorus.on;
                                        soundEngines[grCh].tg.chorus.depth.value = p.chorus.depth;
                                        soundEngines[grCh].tg.chorus.rate.value = p.chorus.rate;
                                        soundEngines[grCh].tg.delay.effect = p.delay.on;
                                        soundEngines[grCh].tg.delay.delayTime.value = p.delay.delayTime;
                                        soundEngines[grCh].tg.delay.feedback.value = p.delay.feedback;
                                        soundEngines[grCh].tg.delay.mix.value = p.delay.mix;
                                    }
                                }
                            }
                        });
                    }


                    const jqProfiles = $('<td/>').appendTo(jqtr); //Profiles

                }
                break;
            case "mpe":
                $('<div/>')
                    .append('In development, please be patient.')
                    .appendTo(gbJq);
                //TODO MPE System
                break;
            case "m1port":
                $('<div/>')
                    .append('Choose MIDI port to redirect to:')
                    .appendTo(gbJq);
                jqTitle = $('<div/>',{"class":'input-group'}).appendTo(gbJq);
                jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqTitle);

                $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("MIDI In Port");
                let jqgrMIn = $('<select/>',{class:"form-control",
                    "data-path": '/config/groupBlocks/'+idx+'/midiInPort'})
                    .appendTo(jqTitle);
                $('<option/>')
                    .text("--Please Choose--").appendTo(jqgrMIn);

                window.devices.in.map(o=>{
                    if(o.inName===window.configSetting.workbenchMIDI1VirtPortName) return;
                    $('<option/>',{value:o.inName, selected: (gb.midiInPort === o.inName)} )
                        .text(o.inName).appendTo(jqgrMIn);
                });


                jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqTitle);
                $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("MIDI Out Port");
                let jqgrMOut = $('<select/>',{class:"form-control",
                    "data-path": '/config/groupBlocks/'+idx+'/midiOutPort'})
                    .appendTo(jqTitle);
                $('<option/>')
                    .text("--Please Choose--").appendTo(jqgrMOut);
                window.devices.out.map(name=>{
                    if(name===window.configSetting.workbenchMIDI1VirtPortName) return;
                    $('<option/>',{value:name, selected: (gb.midiOutPort === name)} )
                        .text(name).appendTo(jqgrMOut);
                });
                break;

        }
        $('<hr/>',{style:'border: 2px dashed darkgrey;'}).appendTo(gbJq);
    });
    common.setValues();
    common.setValueOnChange();
}