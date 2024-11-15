/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');


const d = require('./../libs/debugger.js');
const common = require('./app/common.js');
const {sendOutUMPBrokenUp} = require("./../libs/utils.js");
const { prettyPrintJson }= require('pretty-print-json');

let jqdWarn, jqdError;


document.addEventListener('DOMContentLoaded', () => {

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
            case 'configSettings':
                window.configSetting = xData;

                break;
        }
    });

    $('.emptyTable').on('click',function(e){
        const jqTable=$(this).closest('table');
        ipcRenderer.send('asynchronous-message', 'clearDebugMsg',{type:jqTable.parent().attr('id')});
        jqTable.find('tbody').empty();
        if($(this).attr('data-logtype')==='warn'){
            $('#warnNotif').trigger('dblclick');
            ipcRenderer.send('asynchronous-message', 'clearErrors','warning');
        }
        if($(this).attr('data-logtype')==='error'){
            $('#errNotif').trigger('dblclick');
            ipcRenderer.send('asynchronous-message', 'clearErrors','error');
        }
    });

    common.setipc(ipcRenderer);
    common.setValueOnChange();

    ipcRenderer.send('asynchronous-message', 'getDebugMsg',{type:"ump",offset:0,limit:50});
    ipcRenderer.send('asynchronous-message', 'getDebugMsg',{type:"sysex",offset:0,limit:50});
    ipcRenderer.send('asynchronous-message', 'getDebugMsg',{type:"pe",offset:0,limit:50});
    ipcRenderer.send('asynchronous-message', 'getDebugMsg',{type:"udp",offset:0,limit:50});
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

        const jqtdWarn = getRow({data},'error');
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
            xData.data.data.title = xData.data.data.title || 'Unknown Sysex';
            const jqCardBody = buildRowCard(jqtd, xData.data);
            jqCardBody.append("<b>SysEx:</b>&nbsp;");

            if (xData.data.data.sysexBreakdown && xData.data.data.sysexBreakdown.length > 1) {

                xData.data.data.sysexBreakdown.sort(function (a, b) {
                    return a.start - b.start;
                });

                //data-toggle="popover" title="Popover title" data-content="And here's some amazing content. It's very engaging. Right?"
                xData.data.data.sysexBreakdown.map(function (syspart) {
                    let text = '[';
                    if (syspart.compact) {
                        text += d.arrayToHex(xData.data.data.sysex.slice(syspart.start, syspart.start + 2));
                        text += '...';
                        text += d.arrayToHex(xData.data.data.sysex.slice(syspart.end - 2, syspart.end));
                    } else {
                        text += d.arrayToHex(xData.data.data.sysex.slice(syspart.start, syspart.end));
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
                jqCardBody.append(d.arrayToHex(xData.data.data.sysex));
            }
            break;
        }
        case "ump":
            common.umpLog(jqtd,xData.data.data);

            if(xData.data.warnings && xData.data.warnings.length){
                //console.log(data.data.errors);
                jqtd.parent().addClass('bg-warning');

                const jqspan = $('<span/>')
                    .css({'white-space':'pre','background-color':'#ff00001c',display: 'inherit'})
                    .prependTo(jqtd);
                jqspan.append(xData.data.warnings.join('<br/>'));

                jqdWarn.text(parseInt(jqdWarn.text() || 0,10)+1);

                const jqtdWarn = getRow(xData,'warn');
                xData.data.title = 'UMP Warning';
                const jqCardBody = buildRowCard(jqtdWarn, xData,true);
                jqCardBody.append(xData.data.warnings.join('<br/>'));
            }

            if(xData.data.errors && xData.data.errors.length){
                //console.log(data.data.errors);
                jqtd.parent().addClass('bg-danger');

                $('<span/>')
                    .css({'white-space': 'pre', 'background-color': '#ff00001c', display: 'inherit'})
                    .prependTo(jqtd)
                    .append(xData.data.errors.join("\n"));

                jqdError.text(parseInt(jqdError.text() || 0,10)+1);

                const jqtdWarn = getRow(xData,'error');
                xData.data.title = 'UMP Error';
                const jqCardBody = buildRowCard(jqtdWarn, xData,true);
                jqCardBody.append(xData.data.errors.join('<br/>'));
            }

            break;
        case "pe": {
            const jqCardBody = buildRowCard(jqtd, xData.data);
            const jqspan = $('<div/>')
                .css({'white-space': 'pre', fontSize: '8pt', lineHeight: '8pt'})
                .appendTo(jqCardBody);

            if (xData.data.data.header) {
                const html = prettyPrintJson.toHtml(xData.data.data.header, {quoteKeys: true});
                jqspan.append(html);
            }
            if (xData.data.data.headerText) {
                jqspan.append(xData.data.data.headerText);
            }


            if (xData.data.data.body) {
                const html2 = prettyPrintJson.toHtml(xData.data.data.body, {quoteKeys: true});
                jqspan.append('<hr/>');
                jqspan.append(html2);
            }

            if (xData.data.data.bodyText) {
                jqspan.append(xData.data.data.bodyText);
            }

            break;
        }

    }
}



