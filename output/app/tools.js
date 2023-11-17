/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');

const t = require('./../libs/translations.js');
const d = require('./../libs/debugger.js');
const common = require('./app/common.js');
const { prettyPrintJson }= require('pretty-print-json');

//TODO Clear button

document.addEventListener('DOMContentLoaded', () => {

    ipcRenderer.on('asynchronous-reply', (event, arg, xData) => {
        //console.log(arg);

    });


    common.setipc(ipcRenderer);
    common.setValueOnChange();
    $('#midiToUMPConvert').find('input,select').on('change',function(){
        const message =[];
        $('#midiToUMPConvert > input').each(function(){
            let val = $(this).val();
            val = parseInt(val,16);
            if(val>255)val=255;
            if(val<0)val=0;
            message.push(val);
        });
        let out = t.midi10ToUMP(0,message);
        const midi1or2 =  parseInt($('#midiToUMPConvert > select').val());
        if(midi1or2===2){
            out = t.ump10To20(out,'tooltab');
        }
        common.umpLog($('#midiToUMPConvertOut').empty(),out);

    });

    $('#sysexToUMPConvert').find('input').on('change',function(e){
        let val = $('#sysexToUMPConvert > input:eq(0)').val();
        const sysex=[];

        val.replace(/[^0-9a-f\s]/ig,'').replace(/\s+/,' ')
            .split(' ')
            .map(function(v){
                if(v){
                    sysex.push(parseInt(v,16));
                }
            });
        const out = t.midi10ToUMP(sysex);
        const jqSysUMPConvert = $('#sysexToUMPConvertOut').empty();
        for(let i=0; i< out.length;){
            common.umpLog(jqSysUMPConvert,[out[i++],out[i++]]);
            jqSysUMPConvert.append('<br/>');
        }
    });



    $('#BitScale').find('input').on('change',function(e){
        const scale =[];
        $('#BitScale > input').each(function(e){
            let val = $(this).val();
            val = parseInt(val,10);
            scale.push(val);
        });
        let out;
        if(scale[1]<scale[2]){
            out = (t.scaleUp(scale[0],scale[1],scale[2])) >>>0;
        }else{
            out = t.scaleDown(scale[0],scale[1],scale[2]);
        }
        $('#BitScale > input:eq(3)').val(out);
    });


    $('#NumToBytes').find('input').on('change',function(e){
        const numby =[];
        $('#NumToBytes > input').each(function(e){
            let val = $(this).val();
            val = parseInt(val,10);
            numby.push(val);
        });

        const out = t.getBytesFromNumbers(numby[0],numby[1]);

        $('#NumToBytes > input:eq(2 )').val(d.arrayToHex(out));
    });

    $('#TextToMcoded7').find('input').on('change',function(e){
        let val = $('#TextToMcoded7 .input').val();
        const bytes = new TextEncoder("utf-8").encode(val);
        const arrHex = Array.from(bytes);
        const out = t.arrTobit7array(arrHex);
        $('#TextToMcoded7 > input:eq(1)').val(d.arrayToHex(out));
    });

    $('#mcoded7ToText').find('input').on('change',function(e){
        const val = $('#mcoded7ToText > input:eq(0)').val();
        let sysex=[];

        val.replace(/[^0-9a-f\s]/ig,'').replace(/\s+/,' ')
            .split(' ')
            .map(function(v){
                if(v){
                    sysex.push(parseInt(v,16));
                }
            });
        const bytes = t.arr7BitTo8Bit(sysex);

        const check = new TextDecoder("utf-8").decode(bytes);

        $('#mcoded7ToText > input:eq(1)').val(check);
    });

});




