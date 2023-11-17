/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');

const common = require('./app/common.js');
const t = require('./../libs/translations.js');

let ipccallbacks={};
let ipccallbacksSubs={};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

let gui,MIDIReportMessage,CtrlList,_elementLookup=[];
window.gui = gui;
window.link=null;
window.channel=null;
window.uiWinId=null;

document.addEventListener('DOMContentLoaded', () => {

    ipcRenderer.on('asynchronous-reply', (event, arg, xData) => {

        switch (arg) {
            case 'callback':
                if(ipccallbacks[xData.callbackId]){
                    ipccallbacks[xData.callbackId](xData.data);
                    delete ipccallbacks[xData.callbackId];//called once and removed
                }else {
                    debugger;
                }

                break;
            case 'callbackSub':
                if(xData.command==="end"){
                    delete ipccallbacksSubs[xData.callbackId];
                }else
                if(ipccallbacksSubs[xData.callbackId]){
                    ipccallbacksSubs[xData.callbackId](xData.data); //maybe called several tiimes
                }else {
                    debugger;
                }

                break;
            case 'controlUpdate':
                if(xData.umpDev !== window.ump.umpDev)break;

                //gui.updateViaUMP(xData.ump);

                const ump = t.ump10To20(xData.ump,'conv');
                let controllerMsg = {notes:{}, cc:{}, rpn:{},nrpn:{}};
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
                            if(channelUMP!==window.channel)continue;

                            switch(status){
                                case 0x80: //note off
                                    break;
                                case 0x90: //note on
                                    controllerMsg.notes[val1] = {
                                        ...controllerMsg.notes[val1]||{},
                                        velocity: mess2 >>> 16,
                                        attributes:null //TODO
                                    };
                                    break;
                                case 0xA0: //poly aftertouch
                                    controllerMsg.notes[val1] = {
                                        ...controllerMsg.notes[val1]||{},
                                        aftertouch: mess2
                                    };
                                    break;
                                case 0xB0: //CC
                                    controllerMsg.cc[val1]=mess2;
                                    break;
                                case 0xD0: //Channel Pressure
                                    //controllerMsg[channel].chPress = mess2>>>0
                                    break;
                                case 0b00100000: //rpn
                                    controllerMsg.rpn[(val1<<7)+val2]=mess2;
                                    break;
                                case 0b00110000: //nrpn
                                    controllerMsg.nrpn[(val1<<7)+val2]=mess2;
                                    break;
                                case 0xC0: //Program change
                                    if(mess & 0x1){
                                        controllerMsg.bank = [mess2 >> 8 & 0x7F, mess2  & 0x7F];
                                    }
                                    controllerMsg.PC = mess2 >> 24 & 0x7F;
                                    break;
                                case 0xE0: //Pitch bend
                                    controllerMsg.pitch = mess2;
                                    break;
                            }



                            break;
                        default:
                            break;
                    }
                }

                _elementLookup.map(el=>{
                    const cm = el.data('cm');
                    switch (cm.ctrlType){
                        case 'cc':{
                            if(controllerMsg.cc[cm.idx]){
                                el.val(controllerMsg.cc[cm.idx]);
                            }
                            break;
                        }
                        default:
                            debugger;
                            break;
                    }
                });

                break;


            case 'firstLoad':{
                window.ump = {group:xData.group,umpDev:xData.umpDev,muid:xData.muid,funcBlock:xData.funcBlock};
                window.link = xData.link;
                window.channel = xData.channel;
                window.uiWinId = xData.uiWinId;
                if(xData.profile){
                    buildCtrlListOutput(xData)
                }else{
                    ipcRenderer.send('asynchronous-message', 'getChCtrlList',xData);
                }

                break;
            }
            case 'CtrlListInfo':
                //debugger;
                buildCtrlListOutput(xData)
                break;
        }
    });
});

function buildCtrlListOutput(xData){
    CtrlList = xData.ChCtrlList || [];
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

        if([ "chPress", "pPress", "pBend", "pnp"].indexOf(cm.ctrlType)===-1) {

            cm.idx = cm.ctrlIndex[0]
            cm.minMax = cm.minMax || [0, 4294967295]
            if (cm.ctrlIndex.length > 1) {
                cm.idx = cm.idx << 7;
                cm.idx += cm.ctrlIndex[1];
            }


            switch (cm.typeHint) {
                case 'toggle':
                case 'momentary':
                case 'valueSelect':
                case 'relative':
                case 'continuous':
                default:
                    const min = cm.minMax[0];
                    const max = cm.minMax[1];
                    const jqInput = $('<input/>'
                        , {
                            type: 'range',
                            'min': min,
                            'max': max,
                            'step': 0.01,
                            'value': (((MIDIReportMessage?.controllerMsg || {})[channel] || {})[cm.ctrlType] || {})[cm.idx] || 0,
                            'orient': 'vertical'
                        }
                    )
                        .appendTo(jqBody)
                        .on('input', _jqValChange)
                        .data('cm', cm);
                    _elementLookup.push(jqInput);
                    break;

            }
        }
        if(cm.description){
            jqBody .append('<hr/>' + cm.description + '');
        }
    });
}

const _jqValChange = (e)=>{
    const cmVal = parseInt($(e.currentTarget).val(),10);
    const cm = $(e.currentTarget).data('cm');
    const ch = window.channel;
    const umpGroup = window.umpGroup|| 0;
    let ump = [];

    //TODO Send MIDI 2.0 CVM if set to MIDI 2.0 CVM?
    if(!Array.isArray(cm.ctrlIndex)){
        return;
    }

    if (cm.ctrlType === 'cc') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += (0xB0 + ch)<<16;
        out1 += cm.ctrlIndex[0] <<8;

        ump=[out1,cmVal];
    } else if (cm.ctrlType === 'nrpn') {

        let msb = cmVal >> 7;
        let lsb = 0x7F & cmVal;

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b0011<<4) + ch) << 16;
        out1 += cm.ctrlIndex[0] <<8;
        out1 += cm.ctrlIndex[1];
        ump=[out1,cmVal];
    } else {
        debugger;
    }

    ipcRenderer.send('asynchronous-message', 'sendUMP',{ump,...window.ump});


};

