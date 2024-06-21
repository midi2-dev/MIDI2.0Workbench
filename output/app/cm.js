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
                let controllerMsg = {
                    notes:{}, cc:{}, rpn:{},
                    nrpn:{}, pnac:{}, pnrc:{}, pnp:{}, pPress:{}
                };
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
                                    controllerMsg.pPress[val1]=mess2;
                                    break;
                                case 0xB0: //CC
                                    controllerMsg.cc[val1]=mess2;
                                    break;
                                case 0xD0: //Channel Pressure
                                    controllerMsg.chPress = mess2>>>0
                                    break;
                                case 0b00100000: //rpn
                                    controllerMsg.rpn[(val1<<7)+val2]=mess2;
                                    break;
                                case 0b00110000: //nrpn
                                    controllerMsg.nrpn[(val1<<7)+val2]=mess2;
                                    break;
                                case 0b00010000: //pnac
                                    if(!controllerMsg.pnac[val1])controllerMsg.pnac[val1]={};
                                    controllerMsg.pnac[val1][val2]=mess2;
                                    break;
                                case 0b00000000: //pnrc
                                    if(!controllerMsg.pnrc[val1])controllerMsg.pnrc[val1]={};
                                    controllerMsg.pnrc[val1][val2]=mess2;
                                    break;
                                case 0b01100000: //pnp
                                    controllerMsg.pnp[val1]=mess2;
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
                    const notenumber = el.data('notenumber');
                    let idx = (cm.ctrlIndex[0]<<7) + cm.ctrlIndex[1];
                    switch (cm.ctrlType){
                        case 'pBend':{
                            if(controllerMsg.pitch){
                                el.val(controllerMsg.pitch);
                            }
                            break;
                        }
                        case 'chPress':{
                            if(controllerMsg.chPress){
                                el.val(controllerMsg.chPress);
                            }
                            break;
                        }
                        case 'cc':{
                            if(controllerMsg.cc[cm.ctrlIndex[0]]){
                                el.val(controllerMsg.cc[cm.ctrlIndex[0]]);
                            }
                            break;
                        }
                        case 'nrpn':{
                            if(controllerMsg.nrpn[idx]){
                                el.val(controllerMsg.nrpn[idx]);
                            }
                            break;
                        }
                        case 'rpn':{
                            if(controllerMsg.rpn[idx]){
                                el.val(controllerMsg.rpn[idx]);
                            }
                            break;
                        }

                        case 'pPress':{
                            if(controllerMsg.pPress[notenumber]){
                                el.val(controllerMsg.pPress[notenumber]);
                            }
                            break;
                        }
                        case 'pnp':{
                            if(controllerMsg.pnp[notenumber]){
                                el.val(controllerMsg.pnp[notenumber]);
                            }
                            break;
                        }
                        case 'pnrc':{
                            if(controllerMsg.pnrc[notenumber] && controllerMsg.pnrc[notenumber][idx]){
                                el.val(controllerMsg.pnrc[notenumber][idx]);
                            }
                            break;
                        }
                        case 'pnac':{
                            if(controllerMsg.pnrc[notenumber] && controllerMsg.pnac[notenumber][idx]){
                                el.val(controllerMsg.pnac[notenumber][idx]);
                            }
                            break;
                        }

                        default:
                            debugger;
                            break;
                    }
                });

                break;

            case 'settings':{
                if(window.pf){

                    $('#profileDetails').empty();
                    window.pf = xData.profiles[window.pf.sysex.join('_')];
                    common.buildProfilePage(window.pf);

                }
                break;
            }
            case 'firstLoad':{
                window.ump = {group:xData.group,umpDev:xData.umpDev,muid:xData.muid,funcBlock:xData.funcBlock};
                window.link = xData.link;
                window.channel = xData.channel;
                window.uiWinId = xData.uiWinId;
                if(xData.profile){
                    window.sourceDestination = `${xData.channel}`;
                    window.pf = xData.pf;
                    common.buildProfilePage(xData.pf);
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

    CtrlList.map(cm=> {

        let jqCMEntries = $('#main');

        if(['pnac','pnrc','pPress','pnp'].indexOf(cm.ctrlType)!==-1){
            jqCMEntries = $('<div/>').appendTo($('#main').parent());
        }

        const jqCard = $('<div/>', {"class": 'card ml-3',style:'min-width: 150px;'})
            .appendTo(jqCMEntries);
        const jqHead = $('<div/>', {"class": 'card-header p-3 '})
            .css({padding: 0})
            .append('<h4>' + cm.title + '</h4>')
            .append('<div>' + cm.ctrlType + ' ' + (Array.isArray(cm.ctrlIndex) ? cm.ctrlIndex.join() : '') + '</div>')
            .appendTo(jqCard);
        if (cm.priority) {
            jqHead.append('<div>Priority: ' + (cm.priority || '') + '</div>')
        }
        if (cm.paramPath) {
            jqHead.append('<div>' + cm.paramPath + '</div>');
        }
        //default transmit recognize minMax signifBits typeHint uiMapId stepCount

        const jqBody = $('<div/>', {"class": 'card-body'})
            .appendTo(jqCard);

        if(['pnac','pnrc','pPress','pnp'].indexOf(cm.ctrlType)!==-1){
            jqBody.css({'overflow-x': 'scroll','overflow-y': 'hidden','height': '17em',padding: 0});
            let jqKeys = $('<ul/>',{class:'pianokeys'}).appendTo(jqBody);
            let key = ['c','cs','d','ds','e','f','fs','g','gs','a','as','b'];
            for(let i=0;i<88;i++){
                let jqli = $('<li/>',{class:`${[0,2,4,5,7,9,11].indexOf(i%12)!==-1?'white':'black'} ${key[i%12]}`}).appendTo(jqKeys);

                buildInput(jqli, cm,null, i+12);
            }

        }else  if (cm.ctrlMapId) {
            common.sendPE(0x34, {resource: "CtrlMapList", resId: cm.ctrlMapId}, null).then(([resHead, ctrlMapList]) => {
                buildInput(jqBody, cm, ctrlMapList);
            });
        } else {
            buildInput(jqBody, cm);
        }
    });
}


function buildInput(jqBody, cm, ctrlMapList,notenumber){
    const id = Math.random().toString(36).substr(2, 9);
    let value = 0;
    const createButton = (toggle)=>{
        if(!toggle){
            const jqInput = $('<button/>'
                , {
                    'min': cm.minMax[0],
                    'max': cm.minMax[1],
                    'step': 1,
                    'value': (((MIDIReportMessage?.controllerMsg || {})[channel] || {})[cm.ctrlType] || {})[cm.idx] || 0,
                    list:id
                }
            )
                .append("0x"+("0000000" + cm.minMax[0].toString(16)).slice (-8).toUpperCase())
                .appendTo(jqBody)
                .on('mousedown', (e)=>{
                    const cm = $(e.currentTarget).data('cm');
                    $(e.currentTarget).empty().append("0x"+("0000000" + cm.minMax[1].toString(16)).slice (-8).toUpperCase());
                    _jqValChange(e);
                })
                .on('mouseup', (e)=>{
                    const cm = $(e.currentTarget).data('cm');
                    $(e.currentTarget).empty().append("0x"+("0000000" + cm.minMax[0].toString(16)).slice (-8).toUpperCase());
                    _jqValChange(e);
                })
                .data('cm', cm);
            _elementLookup.push(jqInput);
        }else{
            const jqInput = $('<input/>'
                , {
                    type:'checkbox',
                    'min': cm.minMax[0],
                    'max': cm.minMax[1],
                    'step': 1,
                    'value': (((MIDIReportMessage?.controllerMsg || {})[channel] || {})[cm.ctrlType] || {})[cm.idx] || 0,
                    list:id
                }
            )
                .appendTo(jqBody)
                .on('onChange', (e)=>{
                    const cm = $(e.currentTarget).data('cm');
                    $(e.currentTarget).val($(e.currentTarget).isChecked()?cm.minMax[1]:cm.minMax[0]);
                    _jqValChange(e);
                })
                .data('cm', cm);
            _elementLookup.push(jqInput);
        }


    };

    const createSlider = () => {
        jqBody.addClass('slider');
        const jqInput = $('<input/>'
            , {
                type: 'range',
                'min': cm.minMax[0],
                'max': cm.minMax[1],
                'step': 1,
                'value': (((MIDIReportMessage?.controllerMsg || {})[channel] || {})[cm.ctrlType] || {})[cm.idx] || 0,
                'orient': 'vertical',
                list:id
            }
        )
            .appendTo(jqBody)
            .on('input', _jqValChange)
            .data('cm', cm)
            .data('notenumber', notenumber);
        _elementLookup.push(jqInput);
        if (cm.ctrlMapId && ctrlMapList) {
            let jqdl = $('<datalist/>',{id:id}).appendTo(jqBody);
            ctrlMapList.map(cml=>{
                $('<option\>',{value:cml.value,label:cml.title, style:'--val:'+cml.value}).appendTo(jqdl);
            });
        }
    };

    const createValueSelect = () => {
        let defVal = (((MIDIReportMessage?.controllerMsg || {})[channel] || {})[cm.ctrlType] || {})[cm.idx] || 0;
        const jqInput = $('<select/>')
            .appendTo(jqBody)
            .data('cm', cm)
            .data('notenumber', notenumber);
        _elementLookup.push(jqInput);
        ctrlMapList.map(cml=>{
            $('<option\>',{value:cml.value, style:'--val:'+cml.value})
                .append(cml.title)
                .appendTo(jqInput);
        });
        jqInput.val(defVal);
        jqInput.on('change', _jqValChange);
    };

    cm.minMax = cm.minMax || [0, 4294967295];
    switch (cm.ctrlType){
        case 'rpn':
        case 'nrpn':
        case 'cc':{
            cm.idx = cm.ctrlIndex[0];

            if (cm.ctrlIndex.length > 1) {
                cm.idx = cm.idx << 7;
                cm.idx += cm.ctrlIndex[1];
            }

            switch (cm.typeHint) {
                case 'toggle':
                    createButton(true);
                    break;
                case 'momentary':
                    createButton(false);
                    break;
                case 'valueSelect':
                    if(ctrlMapList){
                        createValueSelect();
                    }else{
                        createSlider();
                    }
                //case 'relative':
                case 'continuous':
                default:
                    createSlider();
                    break;
            }

            break;
        }
        case 'pBend':
        case 'chPress':{
            createSlider();
            break;
        }

        case 'pnp':
        case 'pPress':
        case 'pnac':
        case 'pnrc':{
            createSlider();
            break;
        }
    }

       
        if(cm.description){
            jqBody .append('<hr/>' + cm.description + '');
        }
    }

const _jqValChange = (e)=>{
    const cmVal = parseInt($(e.currentTarget).val(),10);
    const cm = $(e.currentTarget).data('cm');
    const notenumber = parseInt($(e.currentTarget).data('notenumber'),10);
    const ch = window.channel;
    const umpGroup = window.umpGroup|| 0;
    let ump = [];

//  pnp

    if (cm.ctrlType === 'pBend') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b1110<<4) + ch) << 16;
        ump=[out1,cmVal];
    } else if (cm.ctrlType === 'chPress') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b1101<<4) + ch) << 16;
        ump=[out1,cmVal];
    } else if (cm.ctrlType === 'cc') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += (0xB0 + ch)<<16;
        out1 += cm.ctrlIndex[0] <<8;

        ump=[out1,cmVal];
    } else if (cm.ctrlType === 'nrpn') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b0011<<4) + ch) << 16;
        out1 += cm.ctrlIndex[0] <<8;
        out1 += cm.ctrlIndex[1];
        ump=[out1,cmVal];
    }else if (cm.ctrlType === 'rpn') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b0010<<4) + ch) << 16;
        out1 += cm.ctrlIndex[0] <<8;
        out1 += cm.ctrlIndex[1];
        ump=[out1,cmVal];
    }else if (cm.ctrlType === 'pPress') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b1010<<4) + ch) << 16;
        out1 += notenumber <<8;
        ump=[out1,cmVal];
    } else if (cm.ctrlType === 'pnp') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b0110<<4) + ch) << 16;
        out1 += notenumber <<8;
        ump=[out1,cmVal];
    } else if (cm.ctrlType === 'pnac') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b0001<<4) + ch) << 16;
        out1 += notenumber <<8;
        out1 += cm.ctrlIndex[0];
        ump=[out1,cmVal];
    } else if (cm.ctrlType === 'pnrc') {

        let out1 = ((0x04 << 4) + umpGroup) << 24;
        out1 += ((0b0000<<4) + ch) << 16;
        out1 += notenumber <<8;
        out1 += cm.ctrlIndex[0];
        ump=[out1,cmVal];
    } else {
        //TODO Send MIDI 2.0 CVM if set to MIDI 2.0 CVM?
        if(!Array.isArray(cm.ctrlIndex)){
            return;
        }
        debugger;
    }

    ipcRenderer.send('asynchronous-message', 'sendUMP',{ump,...window.ump});


};

