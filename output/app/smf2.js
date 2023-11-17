/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');


const {processUMP} = require('./../libs/translations.js');
const {sendOutUMPBrokenUp} = require('./../libs/utils.js');
const common = require('./app/common.js');
const { prettyPrintJson }= require('pretty-print-json');
const {arrayToHex} = require("./../libs/debugger");
const {midici} = require("./../libs/midici");


let jqdWarn, jqdError;

let _midici = new midici({ciEventHandler:()=>{},
    configSetting:{experimentalSpecs:0, maxSysex:8192}
});
_midici.debug =  false;
_midici._muid = 0xFFFFFFF;
_midici.device =  {};
_midici.ciVer =  2;

document.addEventListener('DOMContentLoaded', () => {

    const jqFileInput = $('#input-file-smf2').on('change',(e) => {
        e.stopPropagation();
        jqFileInput[0].setAttribute("data-title", "Uploading...");
        //debugger;

        common.uploadFile(e,  (fileName, mediaType, data) => {
            const midiData = new Buffer(data.replace(/^data.*base64,/, ''), 'base64');
            jqFileInput[0].setAttribute("data-title", "Processing...");

            const tbody = $('#clip > tbody').empty();

            let head1 = midiData.readUInt32BE(0);
            let head2 = midiData.readUInt32BE(4);

            if(head1!==0x534d4632 || head2!==0x434c4950){
                $('<tr><td colspan="2">File Header is incorrect</td></tr>').appendTo(tbody);
                return;
            }
            $('<tr bgcolor="#f08080"><td style="text-align: center; font-family:monospace">0</td>' +
                '<td style="font-family:monospace">0x534d4632<br/>0x434c4950</td>' +
                '<td>File Header is correct: SMF2CLIP</td></tr>')
                .appendTo(tbody);
            $('<tr><td colspan="3"><hr/></td></tr>').appendTo(tbody);

            let i=8;
            let dcs=0;

            //common.umpLog(jqtd,ump);

            let ump = [];
            for(;i<midiData.length;i+=4){
                ump.push(midiData.readUInt32BE(i));
            }

            let pos = 8;

            sendOutUMPBrokenUp(ump,0,(umpSplit,group)=>{
                let jqTr = $('<tr><td style="text-align: center; font-family:monospace">'+pos+'</td></tr>').appendTo(tbody);
                pos += umpSplit.length*4;
                let jqtd = $('<td style="font-family:monospace"/>').appendTo(jqTr);
                let jqtd2 = $('<td/>').appendTo(jqTr);
                common.umpLog(jqtd,umpSplit);

                if(umpSplit.length === 4) {
                    if(umpSplit[0]===0xf0200000){
                        //Start of Clip
                        $('<tr><td colspan="3"><hr/></td></tr>').appendTo(tbody);
                    }
                }

                processUMP(umpSplit,'smf2',(type,group,data, errors, warnings)=>{
                    if(errors && errors.length){
                         jqtd2.append('<b>Errors</b><br/>' + errors.join('<br/>') + '<hr/>');
                    }
                    if(warnings && warnings.length){
                        jqtd2.append('<b>Warnings</b><br/>' + warnings.join('<br/>')+ '<hr/>');
                    }
                    switch (type){
                        case 'sysex': {

                            if (data.msgObj) {
                                //let jqTr = $('<tr><td>Sysex:</td></tr>').appendTo(tbody);


                                if (data.msgObj.sysex[3] === 0xD) {
                                    _midici.processCI(data.msgObj, group, 'smf2');
                                    data.msgObj.sysexBreakdown = data.msgObj.debug.getDebug().sysexBreakdown;
                                    if (data.msgObj.sysexBreakdown && data.msgObj.sysexBreakdown.length) {
                                        data.msgObj.sysexBreakdown.sort(function (a, b) {
                                            return a.start - b.start;
                                        });
                                        data.msgObj.sysexBreakdown.map(function (syspart) {
                                            let text = '[';
                                            if (syspart.compact) {
                                                text += arrayToHex(data.msgObj.sysex.slice(syspart.start, syspart.start + 2));
                                                text += '...';
                                                text += arrayToHex(data.msgObj.sysex.slice(syspart.end - 2, syspart.end));
                                            } else {
                                                text += arrayToHex(data.msgObj.sysex.slice(syspart.start, syspart.end));
                                            }
                                            text += ']';
                                            let val = (syspart.value || '').toString().replace(/"/g, '&quot;');
                                            if (val === "true") {
                                                val = "_true_";
                                            }
                                            if (val === "false") {
                                                val = "_false_";
                                            }
                                            const jqspan = $('<span/>', {
                                                'data-toggle': 'popover'
                                                , 'title': syspart.msg
                                                , 'data-content': val
                                            })
                                                .text(text)
                                                .css({display: 'inline-block'})
                                                .appendTo(jqtd2);

                                            if (syspart.type) {
                                                jqspan.addClass('btn btn-' + syspart.type)
                                            }

                                            jqtd.append('&nbsp;');
                                        });
                                        $('[data-toggle="popover"]').popover({
                                            trigger: 'hover',
                                            placement: 'top',
                                            boundary: 'viewport',
                                            animation: false,
                                            html: true
                                        });
                                    }
                                } else {
                                    jqtd2.append(arrayToHex(data.msgObj.sysex));
                                }
                            }

                            break;
                        }
                        case 'umpFlexData':{

                            if(data.txt){
                                jqtd2.append(`<b>Text:</b> ${data.txt}`);
                            }
                            break;
                        }
                        case 'ump':
                            break;
                        case 'umpEndpoint':
                            break;
                        case 'umpEndpointProcess':
                            break;
                    }
                })
            });

            for(;i<midiData.length;i+=4){

            }

        })

    });

    $('.emptyTable').on('click',function(e){
        const jqTable=$(this).closest('table');
        ipcRenderer.send('asynchronous-message', 'clearDebugMsg',{type:jqTable.parent().attr('id')});
        jqTable.find('tbody').empty()
    });



    jqdWarn = $('#warnNotif')
        .on('dblclick',(e)=>{
            $(e.currentTarget).text('');
            e.stopPropagation();
        })
        .on('click',(e)=>{e.stopPropagation();})
    jqdError = $('#errNotif').on('dblclick',(e)=>{
        $(e.currentTarget).text('');
        e.stopPropagation();
    })
        .on('click',(e)=>{e.stopPropagation();})

    ipcRenderer.on('asynchronous-reply', (event, arg, xData) => {
        //console.log(arg);
        switch (arg) {
            case 'debugMsg':
                logRun(xData);

                break;
            case 'debugTable':
                xData.data.map(function(xd){
                    logRun({type:xData.type,data:xd});
                });

                break;
        }
    });

    $('.emptyTable').on('click',function(e){
        const jqTable=$(this).closest('table');
        ipcRenderer.send('asynchronous-message', 'clearDebugMsg',{type:jqTable.parent().attr('id')});
        jqTable.find('tbody').empty()
    });

    common.setipc(ipcRenderer);
    common.setValueOnChange();

});

function getRow(xData, type=''){
    const row=xData.data;
    type = type || xData.type;
    const jqMidilist = $('#' + type +' tbody');
    const dte = new Date(row.ts);
    const datestring =  ("0" + dte.getMinutes()).slice(-2)
        + ":" + ("0" + dte.getSeconds()).slice(-2)
        + "." + dte.getMilliseconds()
    ;
    const jqRow = $('<tr/>')
        .addClass('text-monospace')
        .append('<td>'+row.deviceName+'</td>');
    if(xData.type==='pe' || xData.type==='sysex'){
        jqRow.append('<td>'+(row.group+1)+'</td>')
    }
    jqRow.append('<td>'+datestring+'</td>')
        .append('<td>'+(row.dir==='out'?'Out':'In')+'</td>')
        .prependTo(jqMidilist);
    const id=performance.now().toString().replace('.','');
    const jqtd = $('<td/>',{'id':"td"+id}).appendTo(jqRow);

    if(jqMidilist.children().length>50){
        jqMidilist.find('tr:last').remove();
    }

    return jqtd;
}



function buildRowCard(jqtd,data,noWarn){
    const id = jqtd.attr("id").replace(/^td/,'');
    const jqDebugCard = $('<div/>',{"class":'card','id':"heading"+id}).appendTo(jqtd);
    const jqHead = $('<div/>',{"class":'card-header'})
        .css({padding:0})
        .appendTo(jqDebugCard);

    const jqHeadH5 = $('<h5/>',{"class":'btn btn-link mb-0','data-toggle':"collapse"
        ,'data-target':"#collapse"+id, 'aria-expanded':"true", 'aria-controls':"collapse"+id})
        .text(data.data.title)
        .appendTo(jqHead);

    const jqCollapse = $('<div/>',{"class":'collapse',id:'collapse'+id
        ,'aria-labelledby':"heading"+id
        ,'data-parent':"#td"+id
    }).appendTo(jqDebugCard);
    const jqBody = $('<div/>',{"class":'card-body'})
        .css({
            overflow: 'auto'
            ,'max-height': '20em'
        })
        .appendTo(jqCollapse);

    if(!noWarn && data.data.warnings && data.data.warnings.length){
        //console.log(data.data.errors);
        jqHead.removeClass('alert-info');
        jqHead.addClass('alert-warning');
        jqtd.parent().addClass('bg-warning');

        const jqspan = $('<span/>')
            .css({'white-space':'pre','background-color':'#ff00001c',display: 'inherit'})
            .prependTo(jqBody);
        jqspan.append(data.data.warnings.join('<br/>'));

        jqdWarn.text(parseInt(jqdWarn.text() || 0,10)+1);

        const jqtdWarn = getRow({data},'warn');
        data.data.title = data.data.title || '';
        const jqCardBody = buildRowCard(jqtdWarn, data,true);
        jqCardBody.append(data.data.warnings.join('<br/>'));
    }

    if(!noWarn && data.data.errors && data.data.errors.length){
       //console.log(data.data.errors);
        jqHead.removeClass('alert-info');
        jqHead.addClass('alert-warning');
        jqtd.parent().addClass('bg-danger');

        $('<span/>')
            .css({'white-space': 'pre', 'background-color': '#ff00001c', display: 'inherit'})
            .prependTo(jqBody)
            .append(data.data.errors.join("\n"));

        jqdError.text(parseInt(jqdError.text() || 0,10)+1);

        const jqtdWarn = getRow(data,'error');
        data.data.title = data.data.title || '';
        const jqCardBody = buildRowCard(jqtdWarn, data,true);
        jqCardBody.append(data.data.errors.join('<br/>'));
    }




    return jqBody;
}

function logRun(xData){
    const jqtd = getRow(xData);
    switch(xData.type){
        case "sysex": {
            data.msgObj.title = data.msgObj.title || 'Unknown Sysex';
            const jqCardBody = buildRowCard(jqtd, xData.data);
            jqCardBody.append("<b>SysEx:</b>&nbsp;");

            if (data.msgObj.sysexBreakdown && data.msgObj.sysexBreakdown.length > 1) {

                data.msgObj.sysexBreakdown.sort(function (a, b) {
                    return a.start - b.start;
                });

                //data-toggle="popover" title="Popover title" data-content="And here's some amazing content. It's very engaging. Right?"
                data.msgObj.sysexBreakdown.map(function (syspart) {
                    let text = '[';
                    if (syspart.compact) {
                        text += arrayToHex(data.msgObj.sysex.slice(syspart.start, syspart.start + 2));
                        text += '...';
                        text += arrayToHex(data.msgObj.sysex.slice(syspart.end - 2, syspart.end));
                    } else {
                        text += arrayToHex(data.msgObj.sysex.slice(syspart.start, syspart.end));
                    }
                    text += ']';
                    let val = (syspart.value || '').toString().replace(/"/g, '&quot;');
                    if (val === "true") {
                        val = "_true_";
                    }
                    if (val === "false") {
                        val = "_false_";
                    }
                    const jqspan = $('<span/>', {
                        'data-toggle': 'popover'
                        , 'title': syspart.msg
                        , 'data-content': val
                    })
                        .text(text)
                        .css({display: 'inline-block'})
                        .appendTo(jqCardBody);

                    if (syspart.type) {
                        jqspan.addClass('btn btn-' + syspart.type)
                    }

                    jqCardBody.append('&nbsp;');
                });
                $('[data-toggle="popover"]').popover({
                    trigger: 'hover',
                    placement: 'top',
                    boundary: 'viewport',
                    animation: false,
                    html: true
                });
            } else {
                jqCardBody.append(arrayToHex(data.msgObj.sysex));
            }
            break;
        }
        case "ump":
            common.umpLog(jqtd,data.msgObj);
            break;
        case "pe": {
            const jqCardBody = buildRowCard(jqtd, xData.data);
            const jqspan = $('<div/>')
                .css({'white-space': 'pre', fontSize: '8pt', lineHeight: '8pt'})
                .appendTo(jqCardBody);

            if (data.msgObj.header) {
                const html = prettyPrintJson.toHtml(data.msgObj.header, {quoteKeys: true});
                jqspan.append(html);
            }
            if (data.msgObj.headerText) {
                jqspan.append(data.msgObj.headerText);
            }


            if (data.msgObj.body) {
                const html2 = prettyPrintJson.toHtml(data.msgObj.body, {quoteKeys: true});
                jqspan.append('<hr/>');
                jqspan.append(html2);
            }

            if (data.msgObj.bodyText) {
                jqspan.append(data.msgObj.bodyText);
            }

            break;
        }
    }
}


