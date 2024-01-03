/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */

const {JsonPointer: ptr } = require('json-ptr');
const commonmark = require('commonmark');
const stringify = require("json-stringify-pretty-compact");
const {shell} = require('electron');
const midi2Tables = require('../../libs/midiCITables.js');

const path = require('path');
const {prettyPrintJson} = require("pretty-print-json");
const d = require("../../libs/debugger");
const t = require("../../libs/translations");
const {messageType} = require("../../libs/messageTypes");


let ipccallbacks={};
let ipccallbacksSubs={};
let ipcRenderer;
let resourceCache={};
let localSubscriptionData={};
let roles = {

};





exports.setipc = function(ipcRendererSet,ipccallbacksSet,ipccallbacksSubsSet){
    ipcRenderer=ipcRendererSet;
    ipccallbacks=ipccallbacksSet;
    ipccallbacksSubs=ipccallbacksSubsSet;
};

exports.setValueOnChange = function (){
    $('[data-path]').off('change.datapath').on('change.datapath', function () {
        const path = this.dataset.path, configpath = path.match(/^\/config(\/.*)/);
        if (!path) return;
        let val = $(this).val();
        const hexinput7 = $(this).hasClass('hexinput7');
        const type = $(this).attr('type');
        if (type === 'checkbox') {
            val = $(this).prop('checked');
        }
        if (type === 'number') {
            val = val * 1;
            if($(this).attr('data-zerobased')){
                val--;
            }
        }

        if(hexinput7){
            //val = val * 1;
            val = parseInt(val,16);
            if(val>127)val=127;
            if(val<0)val=0;
        }
        if(configpath){
            exports.setConfig(configpath[1], val);
            // ptr.set(window.configSetting, configpath[1], val, true);
            // ipcRenderer.send('asynchronous-message', 'setConfigSetting', {p: configpath[1], v: val});
        }else{
            ptr.set(window.settings, path, val, true);
            ipcRenderer.send('asynchronous-message', 'setSetting', {p: path, v: val,...window.ump});
        }

        exports.updateView();
    });

    $('[data-ipcmsg]').off('click').on('click',function(e){
        let xData = this.dataset['xdata'] || '';
        if(xData.match(/^(\{|\[)/)){
            xData = JSON.parse(xData);
        }
        ipcRenderer.send('asynchronous-message', this.dataset['ipcmsg'],{xData:xData,...window.ump});
    });


};

exports.setConfig = function(path, val){
    ptr.set(window.configSetting, path, val, true);
    ipcRenderer.send('asynchronous-message', 'setConfigSetting', {p: path, v: val,...window.ump});
}

exports.setValues = function(){
    $("[data-path]").each(function () {
        const path = $(this)[0].dataset['path'];
        let val, configpath = path.match(/^\/config(\/.*)/);
        if(configpath){
            val = ptr.get(window.configSetting, configpath[1]);
        }else{
            val = ptr.get(settings, path);
        }

        if(val!==undefined && $(this).attr('data-zerobased')){
            val++;
        }

        const hexinput7 = $(this).hasClass('hexinput7');
        if ($(this).is('input') && $(this).attr('type') === 'checkbox') {
            $(this).prop('checked', val || false);
        } else if(val !== undefined){
            if(hexinput7){
                //val = val * 1;
                val = "0x"+("00" + val.toString(16)).slice (-2).toUpperCase();
            }
            $(this).val(val);
        }
    });

    $("[data-pathText]").each(function () {
        const path = $(this)[0].dataset['pathtext'];
        let val, configpath = path.match(/^\/config(\/.*)/);
        if(configpath){
            val = ptr.get(window.configSetting, configpath[1]);
        }else{
            val = ptr.get(window.settings, path);
        }
        if(val!==undefined && $(this).attr('data-zerobased')){
            val++;
        }
        if(val!==undefined && $(this).attr('data-bool')){
            val = val?'true':'false';
        }
        const hexinput7 = $(this).hasClass('hexinput7');
        const hexinput16 = $(this).hasClass('hexinput16');
        if(val !== undefined) {
            if(hexinput7){
                //val = val * 1;
                val = "0x"+("00" + val.toString(16)).slice (-2).toUpperCase();
            }
            if(hexinput16){
                //val = val * 1;
                val = "0x"+("0000" + val.toString(16)).slice (-4).toUpperCase();
            }
            $(this).text(val.toString());
        }

    });
};

exports.updateView = function (){

    $('[data-visibleiftrue]')
        .css({display:'none'})
        .each(function(){
            $(this)[0].dataset['visibleiftrue'].split(',').map(path=>{
                let val, configpath = path.match(/^\/config(\/.*)/);
                if(configpath){
                    val = ptr.get(window.configSetting, configpath[1]);
                }else{
                    val = ptr.get(settings, path.trim());
                }
                if(val){
                    $(this).css({display:''});
                }
            });
    });

    $('[data-visibleifalltrue]')
        .css({display:'none'})
        .each(function(){
            let show = true;
            $(this)[0].dataset['visibleifalltrue'].split(',').map(path=>{
                let val, configpath = path.match(/^\/config(\/.*)/);
                if(configpath){
                    val = ptr.get(window.configSetting, configpath[1]);
                }else{
                    val = ptr.get(settings, path.trim());
                }
                if(!val){
                    show = false;
                }
            });
            if(show)$(this).css({display:''});
        });

    $('[data-visibleifequal]')
        .css({display:'none'})
        .each(function(){
            let show = true;
            $(this)[0].dataset['visibleifequal'].split(',').map(pathwithvalue=>{
                let [,path,check,checkval] = pathwithvalue.match(/([^!<>=]+)([!<>=]+)(.*)/);
                let val, configpath = path.match(/^\/config(\/.*)/);
                if(configpath){
                    val = ptr.get(window.configSetting, configpath[1]);
                }else{
                    val = ptr.get(settings, path.trim());
                }
                if(checkval.match(/^\d+$/)){
                    checkval = parseInt(checkval,10);
                }
                switch(check){
                    case '=':
                        if(val !== checkval)show = false;
                        break
                    case '!=':
                        if(val == checkval)show = false;
                        break
                    case '>=':
                        if(val < checkval)show = false;
                        break
                }

            });
            if(show)$(this).css({display:''});
        });


};

exports.umpLog = function(jqtd,ump){
    //show first byte with info
    const mess = ump[0];
    const mt = mess >>> 28;

    let status;
    const mtDetails = messageType[mt];
    const group= mess >> 24 & 0xF;

    let outarr = [];
    ump.map(function(d){
        outarr = outarr.concat((d>>>0).toString(2).padStart(32,'0').split(''));
    });

    highlight(0,3,'Message Type', mtDetails.title,'text-danger bg-warning');

    let parts;

    if(mtDetails.status10bit){
        const form = mess >>> 26 & 0x3;
        highlight(4,5,'Form', mtDetails.form[form],'text-danger');
        status = mess >>> 16 & 0x3FF;
        highlight(6,15,'Status', mtDetails.status[status]?.title,'text-white bg-dark');
    }else if(mtDetails.status8bit){
        if(!mtDetails.noGroup)highlight(4,7,'Group', group+1,'text-danger');
        status = mess >> 16 & 0xFF;
        highlight(8,15,'Status', mtDetails.status[status]?.title,'text-white bg-dark');
    }else if(mtDetails.statusMSBLSB){
        highlight(4,7,'Group', group+1,'text-danger');
        const form = mess >>> 22 & 0x3;
        highlight(8,9,'Form', mtDetails.form[form],'text-white bg-dark');
        const addr = mess >>> 20 & 0x3;
        highlight(10,11,'Address', mtDetails.addr[addr],'text-white bg-success');
        const channel = mess >>> 16 & 0xF;
        highlight(12,15,'Channel', 'Channel '+ (channel+1),'text-danger');

        status = mess >> 8 & 0xFF;
        let status2 = mess & 0xFF;
        highlight(16,23,'Status Bank', mtDetails.status[status]?.title,'text-white bg-info');
        highlight(24,31,'Status', mtDetails.status[status]?.status[status2]?.title || '','text-white bg-dark');
        parts = mtDetails.status[status]?.status[status2]?.parts || [];
    }else{
        if(!mtDetails.noGroup)highlight(4,7,'Group', group+1,'text-danger');
        status = mess >> 20 & 0xF;
        highlight(8,11,'Status', mtDetails.status[status]?.title,'text-white bg-dark');
    }

    if(!parts)parts = ((mtDetails.status[status]||{}).parts ||[]);

    parts.map(p=>{
        let val=0;
        //if(p.title=='Channel')debugger;
        for(let i = p.range[0]; i<p.range[1]+1;i++){
            val = (val<<1) + parseInt(outarr[i],2);
        }
        if(p.list){
            val = p.list[val];
        }

        switch(p.format ||''){
            case '':
                break;
            case 'hex':
                val = "0x"+("00" + val.toString(16)).slice (-2).toUpperCase();
                break;
            case 'twosComplement':
                val = t.UpscaleTwosComplement(val, p.range[1] - p.range[0] + 1);
                break;
            case '+1':
                val = val+1;
                break;
            case 'pitch7.25':
                const note = val >> 25;
                const cent = (val & 33554431) / 33554431;
                val = note  + cent;
                break;
            default:
                debugger;
                break;
        }

        if(val===0) val = val.toString();

        highlight(p.range[0],p.range[1],p.title, val,p.classes||'');
    });



    function highlight(start,end,title,val,classes){
        const text = outarr.slice(start,end+1).join('');
        val = (val || '').toString().replace(/"/g,'&quot;');
        if(val===true){
            val="_true_";
        }
        if(val===false){
            val="_false_";
        }
        outarr[start++] = $('<span/>',{
            'class':classes
            ,'data-toggle':'popover'
            ,'title':title
            ,'data-content':val})
            .text(text)
            .wrap('<div>').parent().html();
        for(start; start<end+1;start++){
            outarr[start]='';
        }
    }

    if(outarr.length>96){
        outarr.splice(96,0,'<br/><span class="umpvalnum">0x'
            +ump[3].toString(16).padStart(8,'0') +'</span> = ');
    }
    if(outarr.length>64){
        outarr.splice(64,0,'<br/><span class="umpvalnum">0x'
            +ump[2].toString(16).padStart(8,'0')+'</span> = ');
    }
    if(outarr.length>32){
        outarr.splice(32,0,'<br/><span class="umpvalnum">0x'
            +ump[1].toString(16).padStart(8,'0')+'</span> = ')
    }

    jqtd.append('<span class="umpvalnum">0x'
        +ump[0].toString(16).padStart(8,'0')+'</span> = '+ outarr.join(''));



    $('[data-toggle="popover"]').popover({trigger:'hover',placement:'top',boundary:'viewport',animation:false});
    //Math.floor((inOut=='out'?process.hrtime():message.timeStamp) *1000)/1000
};

exports.peRefresh = function(){
    $('#peDeviceLinks').empty();
    $('#peModeListTable').empty();
    $('#peChannelList').empty();
    $("#petabRaw").empty();
    localSubscriptionData={}; //Todo proper Unsub
    ipcRenderer.send('asynchronous-message', 'peRefresh',window.ump);
};

exports.peStateListRefresh = function(){
    //const jqpeSL = $('#peStateList').show();
    getResourceWithSchemaRef("StateList").then(([StateListResourceObj])=> {
        sendPE(0x34, {resource: "StateList"}, null).then(([resHead, stateList]) => {
            const jSLBody = $("#peStateListTable").empty();
            const html = prettyPrintJson.toHtml(stateList, {quoteKeys: true});
            $('#peStateListHeading')
                .attr('data-content',html);
            const oOpts = {columns:[
                    {"property": "title", "title": "Title"},
                    {"property": "description", "title": "Description"},
                    {title:"Locally Stored",display:function(row,td){
                            if(!row.oldTimestamp && !row.oldStateRev){
                                td.text('No stored data');
                                return;
                            }
                            if(row.oldTimestamp){
                                const d = new Date(row.oldTimestamp*1000)
                                const datestring =   d.getFullYear() + "-"
                                    + ("0"+(d.getMonth()+1)).slice(-2) + "-"
                                    + ("0" + d.getDate()).slice(-2) + " " +
                                    ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                                td.append(datestring);
                            }
                            if(row.oldStateRev){
                                td.append('Last State Revision: ' + row.oldStateRev);
                            }
                        }},
                    {title:"Stored on Device",display:function(row,td){
                            if(row.timestamp){
                                const d = new Date(row.timestamp*1000)
                                const datestring =   d.getFullYear() + "-"
                                    + ("0"+(d.getMonth()+1)).slice(-2) + "-"
                                    + ("0" + d.getDate()).slice(-2) + " " +
                                    ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                                td.append(datestring);
                            }
                            if(row.stateRev){
                                td.append('Last State Revision: ' + row.stateRev);
                            }
                        }},
                    {title:"Action",display:function(row,td){
                            $('<button/>',{type:"button"/*, 'data-ipcmsg':"getState", 'data-xdata': row.stateId*/})
                                .addClass("btn btn-outline-secondary btn-sm")
                                .data('stateId',row.stateId)
                                .text('Get')
                                .on('click',function(){
                                    const stateId = $(this).data('stateId');
                                    if(stateId){
                                        $(this).text('Getting...');
                                        ipcRenderer.send('asynchronous-message', 'getState',{stateId,...window.ump});
                                        $(this).data('stateId',null);
                                    }
                                })
                                .appendTo(td);


                            if(row.oldTimestamp || row.oldStateRev){
                                $('<button/>',{type:"button"/*, 'data-ipcmsg':"setState", 'data-xdata': row.stateId*/})
                                    .addClass("btn btn-outline-secondary btn-sm")
                                    .text('Set')
                                    .data('stateId',row.stateId)
                                    .on('click',function(){
                                        const stateId = $(this).data('stateId');
                                        if(stateId){
                                            $(this).text('Setting...');
                                            ipcRenderer.send('asynchronous-message', 'setState',{stateId,...window.ump});
                                            $(this).data('stateId',null);
                                        }
                                    })
                                    .appendTo(td);
                            }
                            exports.setValueOnChange();
                        }},
                ], resourceObj:StateListResourceObj};
            const jqtbody = buildTable(jSLBody, StateListResourceObj, oOpts);

            (stateList||[]).map(state=>{
                let oldState = ptr.get(window.settings, '/peStates/'+state.stateId) || false;
                if(oldState){
                    state.oldTimestamp = oldState.timestamp;
                    state.oldStateRev = oldState.stateRev;
                }
            });

            buildTableOutput(jqtbody,stateList,oOpts);
        });
    });
};

exports.setPESetup = function(retry=0) {
    const resListOrder = ptr.get(window.settings, '/pe/resListOrder') || [];
    if(!resListOrder.length){
        if(retry<6)setTimeout(exports.setPESetup,1000,++retry);
        return;
    }
    const jqpeDi = $('#peDeviceLinks');
    sendPE(0x34, {resource:"DeviceInfo"}, null).then(([resHead, deviceInfo]) => {
        $('#peDeviceLinks').empty();
        const html = prettyPrintJson.toHtml(deviceInfo, {quoteKeys: true});
        $('#peDeviceInfoHeading')
            .attr('data-content',html);
        const jqDIDet = $('#peDeviceInfoDetails').empty();
        $('<div/>',{'data-tooltip':"tooltip", title:"Manufacturer"})
            .append(deviceInfo.manufacturer + " ("+ d.arrayToHex(deviceInfo.manufacturerId)+")")
            .appendTo(jqDIDet);
        $('<div/>',{'data-tooltip':"tooltip", title:"Family"})
            .append(deviceInfo.family + " ("+ d.arrayToHex(deviceInfo.familyId)+")")
            .appendTo(jqDIDet);
        $('<div/>',{'data-tooltip':"tooltip", title:"Model"})
            .append(deviceInfo.model + " ("+ d.arrayToHex(deviceInfo.modelId)+")")
            .appendTo(jqDIDet);
        $('<div/>',{'data-tooltip':"tooltip", title:"Version"})
            .append("Ver: ")
            .append(deviceInfo.version + " ("+ d.arrayToHex(deviceInfo.versionId)+")")
            .appendTo(jqDIDet);
        if(deviceInfo.serialNo){
            $('<div/>',{'data-tooltip':"tooltip", title:"Serial Number"})
                .append(deviceInfo.serialNo)
                .appendTo(jqDIDet);
        }


        (deviceInfo.links || []).map(link => {
            const jqRow = $('<tr/>').appendTo(jqpeDi);
            displayResource(jqRow, {}, link.resource, link);
        });

    });

    //*** Simple Resources
    const jqSimpRE = $('#peSimpleResources').empty();
    Object.values(midi2Tables.resourceSchema).forEach(simpResource => {
        if(resListOrder.indexOf(simpResource.resource)===-1
            || simpResource.requireResId
            || ['CurrentMode','FileAction'].indexOf(simpResource.resource) !== -1
            || ['string','boolean','number'].indexOf(simpResource.schema.type) === -1
        ) return;


        jqSimpRE.append('<br/>');
        const jqRow = $('<div/>',{class:"border rounded p-2"})
            .append('<h4>'+simpResource.resource+' Resource</h4>')
            .appendTo(jqSimpRE);
        displayResource(jqRow, {}, simpResource.resource);

    });


    const jpeMLDiv = $('#peModeListLinks').show();
    const jqpeML = $('#peModeListTable').on('peSub',function(e,subDetail){
        //currentMode===mode.modeId?'btn-primary':
        $('button',this).removeClass('btn-primary').addClass('btn-light');
        $('button[data-id='+subDetail.resBody+']',this).addClass('btn-primary').removeClass('btn-light');
    });
    if(resListOrder.indexOf("ModeList")!==-1) {
        getResourceWithSchemaRef("CurrentMode").then(([CurrentModeResourceObj])=> {
            if(CurrentModeResourceObj.canSubscribe){
                $('<i/>',{class:"fa fa-handshake", 'data-tooltip':"tooltip", title:"Subscribed"})
                    .css({position:'absolute',top:'0.5em',right:'0.5em'}).appendTo(jpeMLDiv);
            }
            sendPE(0x34, {resource: "ModeList"}, null).then(([resHead, modeList]) => {
                jqpeML.empty();
                const html = prettyPrintJson.toHtml(modeList, {quoteKeys: true});
                $('#peModeListHeading')
                    .attr('data-content', html);

                if (modeList) {
                    sendPE(0x34, {resource: "CurrentMode"}, null, true).then(([resHead, CurrentMode]) => {
                        $('button[data-id=' + CurrentMode + ']', jqpeML).addClass('btn-primary').removeClass('btn-light');
                    });
                    const jqRow = $('<tr/>').appendTo(jqpeML);
                    const jqtdMList = $('<tr/>', {colspan: 2}).appendTo(jqRow);
                    modeList.map(function (mode) {
                        const desc = commonMarkParsing(mode.description);

                        //const desc = writer.render(parsed); // result is a String

                        $('<button/>', {
                            "class": "btn", 'data-toggle': "popover"
                            , 'data-content': desc, 'data-id': mode.modeId, 'data-html': true
                        })
                            .addClass('btn-light')
                            .text(mode.title)
                            .data('mode', mode)
                            .appendTo(jqtdMList)
                            .on('click', function () {
                                const mode = $(this).data('mode');
                                sendPE(0x36, {resource: "CurrentMode"}, mode.modeId);
                                // 	h.getChannelList();
                            });
                    });
                }
            });
        });
    }else{
        jpeMLDiv.hide();
    }

    const jqpeCL = $('#peChannelList').on('peSub',function(e,subDetail){
        $(this).empty();
        const ChannelListResourceObj = $(this).data('ChannelListResourceObj');
        const jqtbody = buildTable($(this),ChannelListResourceObj);
        buildTableOutput(jqtbody,subDetail.resBody,{resourceObj:ChannelListResourceObj});
        const html = prettyPrintJson.toHtml(subDetail.resBody, {quoteKeys: true});
        $('#peChannelListHeading')
            .attr('data-content',html);
    });

    if(resListOrder.indexOf("ChannelList")!==-1) {
        jqpeCL.parent().show();
        getResourceWithSchemaRef("ChannelList").then(([ChannelListResourceObj])=>{
            jqpeCL.data('ChannelListResourceObj',ChannelListResourceObj);
            sendPE(0x34, {resource: "ChannelList"}, null,true).then(([resHead, ChannelList]) => {
                jqpeCL.empty();
                if(ChannelListResourceObj.canSubscribe){
                    $('<i/>',{class:"fa fa-handshake", 'data-tooltip':"tooltip", title:"Subscribed"})
                        .css({position:'absolute',top:'0.5em',right:'0.5em'}).appendTo(jqpeCL);
                }
                const html = prettyPrintJson.toHtml(ChannelList, {quoteKeys: true});
                $('#peChannelListHeading')
                    .attr('data-content',html);
                const jqtbody = buildTable(jqpeCL, ChannelListResourceObj);
                buildTableOutput(jqtbody, ChannelList, {resourceObj: ChannelListResourceObj});
            });
        });
    }else{
        jqpeCL.parent().hide();
    }

    const jqpeACtL = $('#peAllCtrlList').on('peSub',function(e,subDetail){
        $(this).empty();
        const AllCtrlListResourceObj = $(this).data('AllCtrlListResourceObj');
        const jqtbody = buildTable($(this),AllCtrlListResourceObj);
        buildTableOutput(jqtbody,subDetail.resBody,{resourceObj:AllCtrlListResourceObj});
        const html = prettyPrintJson.toHtml(subDetail.resBody, {quoteKeys: true});
        $('#peAllCtrlListHeading')
            .attr('data-content',html);
    });

    if(resListOrder.indexOf("AllCtrlList")!==-1) {
        jqpeACtL.parent().show();
        getResourceWithSchemaRef("AllCtrlList").then(([AllCtrlListResourceObj])=>{
            jqpeACtL.data('AllCtrlListResourceObj',AllCtrlListResourceObj);
            sendPE(0x34, {resource: "AllCtrlList"}, null,true).then(([resHead, AllCtrlList]) => {
                jqpeACtL.empty();
                if(AllCtrlListResourceObj.canSubscribe){
                    $('<i/>',{class:"fa fa-handshake", 'data-tooltip':"tooltip", title:"Subscribed"})
                        .css({position:'absolute',top:'0.5em',right:'0.5em'}).appendTo(jqpeACtL);
                }
                const html = prettyPrintJson.toHtml(AllCtrlList, {quoteKeys: true});
                $('#peAllCtrlListHeading')
                    .attr('data-content',html);
                const jqtbody = buildTable(jqpeACtL, AllCtrlListResourceObj);
                buildTableOutput(jqtbody, AllCtrlList, {resourceObj: AllCtrlListResourceObj});
            });
        });
    }else{
        jqpeACtL.parent().hide();
    }

    //******************

    if(resListOrder.indexOf("StateList")!==-1){
        exports.peStateListRefresh();
    }else{
        $('#peStateList').hide();
    }


    //**********************

    const ResourceList = ptr.get(window.settings, '/pe/ResourceList') || false;
    const jqpeRaw = $("#petabRaw").empty();
    if(jqpeRaw.length && ResourceList){
        jqpeRaw.data('isBuilt',true);
        const resourceList = ptr.get(window.settings, '/pe/ResourceList') || {};
        const resourceListRaw = ptr.get(window.settings, '/pe/ResourceListRaw') || {};

        const jqtRL = $('#petabResourceList').empty();
        const oOpts = {columns:[
                {"title": "Resource",display:function(row,td){
                        let title = row.resource;
                        if(resourceList[row.resource] && resourceList[row.resource].schema && resourceList[row.resource].schema.title){
                            title = resourceList[row.resource].schema.title + " (" +row.resource+")";
                        }
                        const html = prettyPrintJson.toHtml(row, {quoteKeys: true});
                        const jqRes = $('<span/>',{'data-toggle':"popover", 'data-content':html
                            ,title: "Resource Entry"
                            ,'data-html':true
                        }).css('cursor','pointer').text(title);
                        td.append(jqRes);
                    }},
                {"title": "ResId",display:function(row,td){
                        let requireResId = resourceList[row.resource].requireResId;
                        td.text(requireResId);
                    }},
                {"title": "Type",display:function(row,td){
                    let type = resourceList[row.resource].schema?.type;
                    if(!type && resourceList[row.resource].mediaTypes){
                        type = 'file';
                    }

                    if(type==='array' && resourceList[row.resource].canPaginate){
                        type += ' (paginated)';
                    }
                    const html = prettyPrintJson.toHtml(resourceList[row.resource].schema, {quoteKeys: true});
                    const jqRes = $('<span/>',{'data-toggle':"popover", 'data-content':html
                        ,title: "Schema"
                        ,'data-html':true
                    }).css('cursor','pointer').text(type);
                    td.append(jqRes);
                }},
                {"title": "Supported",display:function(row,td){
                        let sup = midi2Tables.resourceSchema[row.resource]?'Yes':'No';
                        if(sup === 'No' && row.resource.match(/^X-/)){
                            sup = "Manufacturer"
                        }

                        td.text(sup);
                }},
                {"title": "Subscribable",property:'canSubscribe'},
                {"title": "Get",display:function(row,td){
                        let get = resourceList[row.resource].canGet ?? true;
                        td.text(get);
                    }},
                {"title": "Set",display:function(row,td){
                        let set = resourceList[row.resource].canSet;
                        td.text(set);
                    }}

            ], resourceObj:midi2Tables.resourceSchema.ResourceList};
        const jqtbody = buildTable(jqtRL,oOpts);
        buildTableOutput(jqtbody,resourceListRaw,oOpts);
        //**************

        function buildRawEntry(resource, r, raw){
            const jqCardHead = $('<div/>',{"class":'card'}).appendTo(jqpeRaw);
            const jqCardHead2 = $('<div/>',{"class":'card-header'}).appendTo(jqCardHead);
            const jqCardh2 = $('<h2/>',{"class":'mb-0'}).appendTo(jqCardHead2);
            $('<button/>',{"class":"btn btn-link", type:"button",
                'data-toggle':"collapse", 'data-target':"#collapse"+r.resource})
                .appendTo(jqCardh2)
                .text(r.resource);

            const jqAccCard =  $('<div/>',{"class":'collapse',id:"collapse"+r.resource,'data-parent':'#petabRaw'})
                .appendTo(jqpeRaw);
            const jqAccCardB = $('<div/>',{"class":'card-body'}).appendTo(jqAccCard);

            $('<pre/>').appendTo(jqAccCardB).text(stringify(raw));

            if(!(r.canGet===false)){
                //Yes I can get this
                let jqGet = $('<div/>',{"class":'input-group'}).appendTo(jqAccCardB);

                if(r.requireResId){
                    let jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqGet);
                    $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("resId");
                    $('<input/>',{class:"form-control resid"}).appendTo(jqGet);
                }



                if(r.canPaginate){
                    let jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqGet);
                    $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Offset");
                    $('<input/>',{class:"form-control offset",type:'number',min:0}).appendTo(jqGet);
                    jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqGet);
                    $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Limit");
                    $('<input/>',{class:"form-control limit",type:'number',min:1}).appendTo(jqGet);
                }

                if(r.encodings){
                    let jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqGet);
                    $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Mutual Encoding");
                    let jqmeSel = $('<select/>',{class:"form-control mutualEncoding"}).appendTo(jqGet);
                    r.encodings.map(function(encoding){
                        $('<option/>',{value:encoding}).text(encoding).appendTo(jqmeSel);
                    });
                }

                // if(r.mediaTypes){
                //     const jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqGet);
                //     $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Media Type");
                //     const jqmeSel = $('<select/>',{class:"form-control mediaType"}).appendTo(jqGet);
                //     r.mediaTypes.map(function(mt){
                //         $('<option/>',{value:mt}).text(mt).appendTo(jqmeSel);
                //     });
                // }

                $('<button/>',{class:"form-control",type:'button'}).text("GET")
                    .appendTo(jqGet)
                    .data('r',r)
                    .on("click",function(){
                        const r = $(this).data('r');
                        let reqHeader = {
                            resource:r.resource
                        };
                        if(r.requireResId){
                            reqHeader.resId = $(this).parent().find('.resid').val();
                        }

                        if(r.encodings){
                            reqHeader.mutualEncoding = $(this).parent().find('.mutualEncoding').val();
                        }
                        if(r.canPaginate){
                            reqHeader.offset = parseInt($(this).parent().find('.offset').val(),10);
                            reqHeader.limit = parseInt($(this).parent().find('.limit').val(),10);
                        }
                        const jqout = $(this).parent().parent().find('.getoutput').empty();
                        sendPE(0x34, reqHeader).then(([resHead, resBody])=>{
                                //let formatter = new JSONFormatter(resHead,{sortPropertiesBy:function(){return 0}});
                            const htmlReqHead = prettyPrintJson.toHtml(reqHeader, {quoteKeys: true});
                            jqout.append(htmlReqHead);
                            jqout.append('<hr/><br/>');

                            const htmlHead = prettyPrintJson.toHtml(resHead, {quoteKeys: true});
                                jqout.append(htmlHead);

                                if(resBody!==null && resBody!==undefined){
                                    jqout.append('<br/><br/>');
                                    if(!resHead.mediaType || resHead.mediaType==='application/json'){
                                        const htmlBody = prettyPrintJson.toHtml(resBody, {quoteKeys: true});
                                        jqout.append(htmlBody);
                                    }else{

                                        const blBody = new Blob([resBody], {type: resHead.mediaType});
                                        $("<button/>",{type:"button", class:"btn btn-primary"})
                                            .append('<i class="fas fa-download"></i> Download').appendTo(jqout)
                                            .data('blBody',blBody)
                                            .data('name',path.basename(reqHeader.path || reqHeader.resId))
                                            .on('click',function(){
                                                const url = window.URL.createObjectURL($(this).data('blBody'));
                                                const a = document.createElement('a');
                                                a.href = url;
                                                // the filename you want
                                                a.download = $(this).data('name');
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                            });

                                    }


                                }
                            }
                        );
                    });


            }

            if(r.canSet==='full' || r.canSet==='partial'){
                $('<hr/>').appendTo(jqAccCardB);
                //Yes I can get this


                let jqSetSchemaForm = $('<div/>');
                let jqSetPartialForm =  $('<div/>',{class:'form-group'});
                let jqfile = $('<input/>',{type:"file",class:'custom-file-input',id:r.resource+"_upload"})
                    .on('change', function (e) {
                        e.stopPropagation();
                        //debugger;
                        const jqThisFile = $(this);
                        exports.uploadFile(e, function (fileName,mediaType,data) {
                            jqThisFile.data('fileUpload',{
                                mediaType:mediaType,
                                data:data
                            });
                        });
                    });




                if(!r.schema.type){
                    const jqSetFile = $('<div/>',{"class":'input-group'}).appendTo(jqAccCardB);
                    const jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqSetFile);
                    $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Upload");
                    const jqfilegr = $('<div/>',{"class":'custom-file'})
                        .appendTo(jqSetFile)
                        .append(jqfile)
                        .append('<label class="custom-file-label" for="'+r.resource+'_upload">Choose file</label>');
                    /*<div class="custom-file">
    <input type="file" class="custom-file-input" id="inputGroupFile01">
    <label class="custom-file-label" for="inputGroupFile01">Choose file</label>
  </div>*/
                }

                const jqSet = $('<div/>',{"class":'input-group'}).appendTo(jqAccCardB);

                if(r.requireResId){
                    const jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqSet);
                    $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("resId");
                    $('<input/>',{class:"form-control resid"}).appendTo(jqSet);
                }

                if(r.canSet==='partial'){
                    const jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqSet);
                    const jqcdpartial = $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text(" Set Partial");
                    $('<input/>',{type:'checkbox',class:"setPartial"}).prependTo(jqcdpartial)
                        .data('jqSetSchemaForm',jqSetSchemaForm)
                        .data('jqSetPartialForm',jqSetPartialForm)
                        .on('change',function(){
                            const jqSetSchemaForm = $(this).data('jqSetSchemaForm');
                            const jqSetPartialForm = $(this).data('jqSetPartialForm');
                            if($(this).is(':checked')){
                                jqSetSchemaForm.hide();
                                jqSetPartialForm.show();
                            }else{
                                jqSetSchemaForm.show();
                                jqSetPartialForm.hide();
                            }
                        });

                }

                if(r.encodings){
                    const jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqSet);
                    $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Mutual Encoding");
                    const jqmeSel = $('<select/>',{class:"form-control mutualEncoding"}).appendTo(jqSet);
                    r.encodings.map(function(encoding){
                        $('<option/>',{value:encoding}).text(encoding).appendTo(jqmeSel);
                    });
                }

                if(r.mediaTypes){
                    const jqtextgr = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqSet);
                    $('<div/>',{"class":'input-group-text'}).appendTo(jqtextgr).text("Media Type");
                    $('<input/>',{class:"form-control mediaType",list:r.resource+"_mediatypes"}).appendTo(jqSet);
                    const jqmeSel = $('<datalist/>',{id:r.resource+"_mediatypes"}).appendTo(jqSet);
                    r.mediaTypes.map(function(mt){
                        $('<option/>',{value:mt}).appendTo(jqmeSel);
                    });
                }


                const jqButton = $('<button/>',{class:"form-control",type:'button'}).text("SET")
                    .appendTo(jqSet)
                    .data('r',r)
                    .data('jqfile',jqfile)
                    .on("click",function(){
                        const r = $(this).data('r');

                        const reqHeader = {
                            resource:r.resource
                        };
                        if(r.requireResId){
                            reqHeader.resId = $(this).parent().find('.resid').val();
                        }

                        if(r.encodings){
                            reqHeader.mutualEncoding = $(this).parent().find('.mutualEncoding').val();
                        }
                        if(r.mediaTypes){
                            reqHeader.mediaType = $(this).parent().find('.mediaType').val();
                        }
                        if(r.canSet==="partial"){
                            reqHeader.setPartial = !!$(this).parent().find('.setPartial').is(':checked');
                        }

                        let reqBody;

                        if(r.schema.type){
                            const jqSetPartialForm = $(this).data('jqSetPartialForm');
                            const jqSetSchemaForm = $(this).data('jqSetSchemaForm');
                            const bForm = jqSetSchemaForm.data('bForm');
                            if(reqHeader.setPartial){
                                reqBody = jqSetPartialForm.find('textarea').val();
                                try {
                                    reqBody = JSON.parse(reqBody);
                                }
                                catch(e){
                                    debugger;
                                    return;
                                }
                            }else{
                                if(!bForm.validate()){
                                   return;
                                }
                                reqBody = bForm.getData();
                            }
                        }else{
                            //file
                            const jqfile = $(this).data('jqfile');
                            const fileUpload = jqfile.data('fileUpload');
                            reqBody = fileUpload.data;
                            if(!reqHeader.mediaType || reqHeader.mediaType === '*/*'){
                                reqHeader.mediaType = fileUpload.mediaType;
                            }

                        }

                        //Deal with Encoding and data!
                        const jqout = $(this).parent().parent().find('.getoutput').empty();
                        sendPE(0x36, reqHeader,reqBody).then(([resHead])=>{
                                //const formatter = new JSONFormatter(resHead,{sortPropertiesBy:function(){return 0}});
                                //jqout.append(formatter.render());
                            const htmlReqHead = prettyPrintJson.toHtml(reqHeader, {quoteKeys: true});
                            jqout.append(htmlReqHead);
                            jqout.append('<hr/><br/>');
                            const htmlHead = prettyPrintJson.toHtml(resHead, {quoteKeys: true});
                            jqout.append(htmlHead);

                            }
                        );
                    });


                if(r.schema.type){
                    // TODO Show JSON Editors
                    jqSetSchemaForm.appendTo(jqAccCardB);

                    //jqEditBox.empty();
                    getResourceWithSchemaRef(r.resource,jqSetSchemaForm).then(([resourceObj,jqSetSchemaForm])=>{
                        const schemaCP = JSON.parse(JSON.stringify(resourceObj.schema));
                        const bForm = BrutusinForms.create(schemaCP);
                        bForm.render(jqSetSchemaForm[0]);
                        jqSetSchemaForm.data('bForm',bForm);
                    });


                    jqSetPartialForm.appendTo(jqAccCardB).hide();
                    $('<label/>').text("Set Partial Property Data").appendTo(jqSetPartialForm);
                    $('<textarea/>',{class:"form-control"}).text("{}").appendTo(jqSetPartialForm);

                    jqButton.data('jqSetSchemaForm',jqSetSchemaForm)
                        .data('jqSetPartialForm',jqSetPartialForm);

                }else{
                    // Show Upload form Button
                    jqfile
                        .data('mediaTypeDef',r.mediaTypes[0])
                        .prop('accept',r.mediaTypes.join(','));
                        //.appendTo(jqAccCardB);
                }


            }
            $('<hr/>').appendTo(jqAccCardB);
            $('<div/>',{"class":'getoutput'}).css({'white-space': 'pre', 'font-size': '8pt'
                , 'line-height': '8pt'}).appendTo(jqAccCardB);
        }

        buildRawEntry("ResourceList", midi2Tables.resourceSchema.ResourceList, {resource:"ResourceList"});

        for(let i=0; i<resListOrder.length;i++){
            let resource = resListOrder[i];
            let r = resourceList[resource];
            let raw = resourceListRaw[i];
            buildRawEntry(resource, r, raw);


        }

      //  $('.collapse').collapse();
    }

    // if (!resource || resource == "StateList") {
    //
    //     const StateList = ptr.get(window.settings, '/pe/StateList') || false;
    //
    // }

};

exports.setProfileSetup = function () {
    //$('#profileCapability').trigger('click');
    const jqTooltip = $('[data-toggle="tooltip"]').tooltip('dispose');

    const jqProfOpt = $('#profileOptions').empty();

    //debugger;
    const profileConfig = ptr.get(window.settings, '/profiles') || {};

    let pfListRow = [];
    for(let pfid in profileConfig) {
        let profile = profileConfig[pfid];
        for (let sourceDestination in profile.sourceDestinations) {
            //let [group, channel] = sourceDestination.split('_').map(v => parseInt(v));
            if(pfListRow.indexOf(sourceDestination)===-1){
                pfListRow.push(sourceDestination);
            }
        }
    }

    pfListRow = pfListRow.sort((a,b)=>{
        let [agroup, achannel] = a.split('_').map(v => parseInt(v));
        let [bgroup, bchannel] = b.split('_').map(v => parseInt(v));
        if(agroup > bgroup)return 1;
        if(bgroup > agroup)return -1;

        if(achannel===0x7F) return -1;
        if(achannel===0x7E && bchannel===0x7F) return 1;
        if(bchannel===0x7E && achannel===0x7F) return -1;
        if(achannel===0x7E) return -1;
        if(bchannel===0x7E) return 1;

        if(achannel > bchannel)return 1;
        if(bchannel > achannel)return -1;

        return 0;

    });

    pfListRow.map(sourceDestinations=>{
        let [group, channel] = sourceDestinations.split('_').map(v=>parseInt(v));
        let chDisplay =  channel===0x7F?'Function Block':channel===0x7E?'Group':channel+1;
        $('<tr/>',{id:`profile_${sourceDestinations}`})
            .appendTo(jqProfOpt)
            .append('<td>'+ (group+1)+'</td>')
            .append('<td>'+ chDisplay+'</td>')
            .append('<td></td>');
    })


    for(let pfid in profileConfig){
        let profile = profileConfig[pfid];
        for(let sourceDestination in  profile.sourceDestinations){

            let [group, channel] = sourceDestination.split('_').map(v=>parseInt(v));
            let jqpf = $(`#profile_${sourceDestination} td:eq(2)`);
            if(!jqpf.length){
                let chDisplay =  channel===0x7F?'Function Block':channel===0x7E?'Group':channel+1;
                const jqrow = $('<tr/>',{id:`profile_${sourceDestination}`})
                    .appendTo(jqProfOpt)
                    .append('<td>'+ (group+1)+'</td>')
                    .append('<td>'+ chDisplay+'</td>');
                jqpf = $('<td/>').appendTo(jqrow);
            }
            buildProfileTab(profile);
            buildProfileButton(jqpf,sourceDestination,profile.sourceDestinations[sourceDestination]?.active,profile);
        }
    }



    jqTooltip.tooltip();
};

exports.uploadFile = (e,cb,labelClass) => {
    if(!window.FileReader){
        return;
    }

    const filesSelected = e.target.files;
    if (filesSelected.length > 0)
    {
        const fileToLoad = filesSelected[0];
        const mediaType=fileToLoad.type;
        const fileName=fileToLoad.name;
        const fileReader = new FileReader();
        fileReader.onload = (fileLoadedEvent) => {

            cb(fileName,mediaType,fileLoadedEvent.target.result);

        };

        fileReader.readAsDataURL(fileToLoad);
    }
}

function displayResource(jqRootObj,channelListData={},resource='',link={}){

    const resId = link.resId;
    let jqAppendText = jqRootObj;
    let jqAppendElem = jqRootObj;
    let isInTable = false;
    let isInTableRow = false;
    const isLink = !!(Object.values(link).length);
    if(jqRootObj.is('tr')){
        jqAppendText = $("<td/>").appendTo(jqRootObj);
        jqAppendElem = $("<td/>").appendTo(jqRootObj);
        isInTableRow = true;
    }else if(jqRootObj.is('td')){
        isInTable = true
        jqAppendText = $("<td/>"); // leave this a floating do not attach
        isInTableRow = true;
    }

    let jqGr = $('<div/>',{"class":'input-group'}).appendTo(jqAppendElem);
    jqAppendElem = $('<div/>',{"class":'input-group-prepend'}).appendTo(jqGr);

    if(!isInTableRow){
        jqAppendText = $('<span class="input-group-text"/>').prependTo(jqGr);
    }


    //const muidString = currentMUID.join('_');
    //const resourceObj = remoteDevices[currentMUID].peResourceList[resource];
    getResourceWithSchemaRef(resource).then(([resourceObj])=>{
        if(!resourceObj)return;
        const schema = resourceObj.schema;
        let title = link.title || schema.title;
        let jqLink;

        const jqIconSub = $('<i/>',{class:"fa fa-handshake", 'data-tooltip':"tooltip", title:"Subscribed"});
        //const jqLinkSub = $('<span class="input-group-text pl-1 pr-1"/>').append(jqIconSub);
        if(resourceObj.canSubscribe){
            //$('<div/>',{"class":'input-group-append'}).appendTo(jqGr).append(jqLinkSub);
            $('<div/>',{"style":'position: absolute;top: 0;left: 0;opacity: 0.5;'}).appendTo(jqAppendElem.parent()).append(jqIconSub);
        }

        if(isLink){
            const html = prettyPrintJson.toHtml(link, {quoteKeys: true});
            const jqIcon = $('<i/>',{class:"fa fa-link", 'data-toggle':"popover", 'data-content':html
                    ,title: "Link Details"
                    ,'data-html':true
            })
                ;
            jqLink = $('<span class="input-group-text"/>').append(jqIcon);

        }

        let reqHeader = {resource: resourceObj.resource};

        if(resourceObj.requireResId){
            if(!resId){
                debugger;
            }
            reqHeader.resId =resId;
        }

        if(resourceObj.mediaTypes ){
            jqAppendText.remove();
            if(!isInTable)jqAppendElem.attr('colspan',2);

            $('<button/>',{"class":"btn btn-outline-secondary",'data-toggle':"popover",'data-content':schema.description || ''})
                .append(title)
                .data('resourceObj',resourceObj)
                .data('reqHeader',reqHeader)
                .appendTo(jqAppendElem)
                .on('click',function(e){
                    e.stopPropagation();
                    buildFileModal($(this).data('reqHeader'));
                });
        }

        if(link.role){
            if( roles[link.role] ){
                jqAppendText.remove();
                if(!isInTable)jqAppendElem.closest('td').attr('colspan',2);
                jqAppendElem.css({flex: '1 1 auto', width: '1%'});
                $('<button/>',{"class":"btn btn-outline-secondary w-100",'data-toggle':"popover",'data-content':schema.description || ''})
                    .append(title)
                    .data('resourceObj',resourceObj)
                    .data('link',link)
                    .data('channelListData',channelListData)
                    .appendTo(jqAppendElem)
                    .on('click',function(e){
                        e.stopPropagation();
                        exports.clickLinkWithRole($(this),$(this).data('link'),$(this).data('channelListData'));
                    });
            }
            if(isLink){
                $('<div/>',{"class":'input-group-append'}).appendTo(jqGr).append(jqLink);
            }
            return;
        }

        switch(schema.type){
            case 'string': {
                const jqAppendElemParent = jqAppendElem.parent();
                jqAppendElem.remove();
                jqAppendElem = jqAppendElemParent;
                let minLength = schema.minLength || 0;
                let maxLength = schema.maxLength || 4000;
                let jqval = $('<input/>', {
                    type: "text", pattern: ".{" + minLength + "," + maxLength + "}",
                    "data-resource":reqHeader.resource,
                    "data-resid": reqHeader.resid||""
                })
                    .addClass('form-control')
                    .appendTo(jqAppendElem)
                    .on('change', function () {
                        sendPE(0x36, reqHeader, (this).val());
                    }).on('peSub', function (e,subDetail) {
                        //debugger;
                        $(this).val(subDetail.resBody);
                    });
                if(resourceObj.canSet==="none"){
                    jqval.prop('disabled',true);
                }
                // if(resourceObj.canSubscribe){
                //     //$('<div/>',{"class":'input-group-append'}).appendTo(jqGr).append(jqLinkSub);
                //     $('<div/>',{"class":''}).appendTo(jqAppendElem).append(jqIconSub);
                // }
                sendPE(0x34, reqHeader, null,resourceObj.canSubscribe).then(([resHead, resBody]) => {
                    jqval.val(resBody);
                });


                break;
            }
            case 'boolean': {
                //schema = getSchema(resource);
               // debugger;
                jqAppendElem = $('<div class="input-group-text"/>').appendTo(jqAppendElem);
                let jqval = $('<input/>', {
                        type: "checkbox",
                        "data-resource":reqHeader.resource,
                        "data-resid": reqHeader.resid||""
                    })
                    .appendTo(jqAppendElem)
                    .on('change', function () {
                        sendPE(0x36, reqHeader, $(this).prop('checked'));
                    })
                    .on('peSub', function (e,subDetail) {
                        //debugger;
                        $(this).prop('checked', subDetail.resBody);
                    });
                if(resourceObj.canSet==="none"){
                    jqval.prop('disabled',true);
                }
                // if(resourceObj.canSubscribe){
                //     //$('<div/>',{"class":'input-group-append'}).appendTo(jqGr).append(jqLinkSub);
                //     //$('<div/>',{"style":'position: absolute;top: 0;left: 0;opacity: 0.5;'}).appendTo(jqAppendElem.parent()).append(jqIconSub);
                // }
                sendPE(0x34, reqHeader, null, resourceObj.canSubscribe).then(([resHead, resBody]) => {
                    jqval.prop('checked', resBody);
                });
                break;
            }
            case 'integer':
            //resourceObj.multipleOf = 1;
            case 'number': {
                const jqAppendElemParent = jqAppendElem.parent();
                jqAppendElem.remove();
                jqAppendElem = jqAppendElemParent;
                const minimum = schema.minimum || 0;
                const maximum = schema.maximum || "";
                const multipleOf = schema.multipleOf || 1;
                const jqval = $('<input/>', {
                    type: "number", min: minimum, max: maximum, step: multipleOf,
                    "data-resource": reqHeader.resource,
                    "data-resid": reqHeader.resid || ""
                })
                    .addClass('form-control')
                    .appendTo(jqAppendElem)
                    .on('change', function () {
                        let val = $(this).val();
                        if (multipleOf === 1) {
                            val = parseInt(val, 10);
                        } else {
                            val = parseFloat(val);
                        }
                        sendPE(0x36, reqHeader, val);
                    }).on('peSub', function (e, subDetail) {
                        //debugger;
                        $(this).val(subDetail.resBody);
                    });
                if(resourceObj.canSet==="none"){
                    jqval.prop('disabled',true);
                }

                // if(resourceObj.canSubscribe){
                //     $('<div/>',{"class":'input-group-append'}).appendTo(jqGr).append(jqLinkSub);
                // }
                sendPE(0x34, reqHeader, null, resourceObj.canSubscribe).then(([resHead, resBody]) => {
                    jqval.val(resBody);
                });


                break;
            }
            case 'object':
                //jqObj
                jqAppendText.remove();
                if(!isInTable)jqAppendElem.attr('colspan',2);
                $('<button/>',{"class":"btn btn-outline-secondary w-100",'data-toggle':"popover",'data-content':schema.description})
                    .append(title)
                    .data('resourceObj',resourceObj)
                    .appendTo(jqAppendElem)
                    .on('click',function(e){
                        e.stopPropagation();
                        buildModalAlert("This Resource has no clear method of Display");
                        // buildComplexModal({
                        //     resource: resourceObj.resource
                        //     , resId: reqHeader.resId || null
                        // });
                    });

                break;

            case 'array':
                jqAppendText.remove();
                if(!isInTable)jqAppendElem.attr('colspan',2);
                const jqButton = $('<button/>',{"class":"btn btn-outline-secondary w-100",'data-toggle':"popover",'data-content':schema.description})
                    .append(title)
                    .data('resourceObj',resourceObj)
                    .data('channelListData',channelListData)
                    .appendTo(jqAppendElem)
                    .on('click',function(e){
                        e.stopPropagation();
                        const channelListData = $(this).data('channelListData');

                        if(resourceObj.resource==='ChCtrlList'){
                            showChCtrlList({
                                link:link
                                ,channelListData:channelListData
                            });
                            return;
                        }


                        const jqModal = buildListModal({
                            resource:resourceObj.resource
                            ,resourceObj:resourceObj
                            ,resId:reqHeader.resId||null
                            ,title:link.title || resourceObj.schema.title || ''
                            ,channelListData:channelListData
                            ,umpGroup:/*row.umpGroup ||*/ 1
                            ,cbSelect:(data)=>{

                                if(resourceObj.resource==="ProgramList"){
                                    link.role="programSelect";
                                }

                                if(link.role){
                                    switch(link.role){
                                        case "programSelect":
                                            ipcRenderer.send('asynchronous-message'
                                                , 'changePC'
                                                ,{channel:channelListData.channel - 1 , bankPC : data.bankPC,...window.ump}
                                            );
                                            break;
                                        case "selectionResource":
                                            const val = data[link.selectResourceValue];
                                            sendPE(0x36,{resource:link.selected.resource},val);
                                            jqModal.modal('hide');
                                            break;

                                    }
                                }
                            }
                            ,cbClose:()=>{
                                if(resourceObj.canSubscribe){
                                    //End Subscription?
                                }
                            }
                            ,setupSub: resourceObj.canSubscribe
                        });

                        if(resourceObj.canSubscribe){
                            sendPE(0x34, reqHeader, null,true).then(([resHead, resBody]) => {
//                                debugger;
                            });
                        }
                    });

                if(link.class){
                    jqButton.css('line-height','inherit')
                    $('<i/>',{class:link.class}).appendTo(jqButton);
                }

                break;

            default:
        }
        if(isLink){
            $('<div/>',{"class":'input-group-append'}).appendTo(jqGr).append(jqLink);
        }
        $('[data-toggle="popover"]').popover({trigger:'hover',placement:'top',boundary:'viewport',animation:false});
    });

}

function buildFileModal(oOpts={}){
    //{title:"bbb",resource: "ProgramList","id":chData._collection,cbSelect:function(){},cbClose:function(){}}

    getResourceWithSchemaRef(resource).then(([resourceObj])=> {
        const schema = resourceObj.schema;


        const jqModal = $('<div>', {"class": "modal fade bd-example-modal-lg"})
            .appendTo('body');
        const jqModalMain = $('<div>', {"class": "modal-dialog modal-lg modal-dialog-centered"})
            .appendTo(jqModal);
        const jqModalContent = $('<div>', {"class": "modal-content"})
            .appendTo(jqModalMain);

        $('<div/>', {"class": "modal-header"})
            .append('<h5 class="modal-title">' + schema.title + '</h5>')
            .append('<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>')
            .appendTo(jqModalContent);

        const jqbody = $('<div/>', {"class": "modal-body"})
            .append('<p>' + (schema.description || '') + '</p>');


        $('<button/>', {class: "getRawBuffer"})
            .text(schema.title)
            .appendTo(jqbody)
            .on('click', e => {
                e.preventDefault();

                jqStatus.text('requested');

                const reqHeader = {resource: oOpts.resource};
                if (oOpts.resId) {
                    reqHeader.resId = oOpts.resId;
                }
                debugger; //TODO Make it a main function
                /*sendPE(0x34, reqHeader, null
                    , function (resHead, resBody, reqHead) {
                        jqStatus.text('received!');
                       // saveJSON(reqHead.filename || schema.title, resBody, resHead.mediaType);
                    }
                );*/

            });

        jqbody.append('<br/><b>Upload Raw Buffer</b><br/>')
            .appendTo(jqModalContent);

        $('<input/>', {type: "file", accept: resourceObj.mediaTypes.join(',')})
            .appendTo(jqbody)
            .on('change', function (e) {
                jqStatus.text('uploading');
                e.stopPropagation();
                debugger; //make this a main func
                /*uploadFile(e, function (fileName, mediaType, data) {
                    jqStatus.text('uploaded - sending');
                    //debugger;
                    var reqHeader = {
                        resource: oOpts.resource,
                        resId: oOpts.resId
                        , mediaType: mediaType
                        , fileName: fileName
                        //,encoding:'Mcoded7'
                    };
                    h.sendPE(0x36, 0x7F, currentMUID
                        , reqHeader, data
                        , function (sourceDestination, muid, resHead, resBody, reqHead) {
                            if (resHead.status == 200) {
                                jqStatus.text('uploaded - sent!');
                            } else {
                                jqStatus.text('uploaded - error!');
                            }
                        });

                });*/
            });

        const jqStatus = $('<span/>').appendTo(jqbody);

        $('<div/>', {"class": "modal-footer"})
            .appendTo(jqModalContent);
        /*<button class="getRawBuffer">Get Raw buffer</button><br/>
                                <b>Upload Raw Buffer</b>
                                <input type="file" class="uploadRawBuffer"/> <span class="rawBuffferState"/>
                            </form>*/

        jqModal
            .modal({show: true})
            .on('hidden.bs.modal', function () {
                jqModal.modal('dispose').remove();
                if (oOpts.cbClose) {
                    oOpts.cbClose();
                }
            });

    });

}

function getResourceWithSchemaRef(resource,xPassthru){

    return new Promise( (resolve,reject) => {
        //var muidString = currentMUID.join('_');
        if(resourceCache[resource]){
            resolve([resourceCache[resource],xPassthru]);
            return;
        }

        const id=getcallBackId();
        //console.log("Get Schema "+id +" " +resource);
        ipccallbacks[id] = (resourceObj)=>{
            resourceCache[resource]=resourceObj;
            resolve([resourceObj,xPassthru]);
        };

        ipcRenderer.send('asynchronous-message'
            , 'getResourceWithSchemaRef'
            ,{resource:resource, callbackId:id,...window.ump}
        );
    });
}
exports.getResourceWithSchemaRef =getResourceWithSchemaRef;

function getcallBackId(){
    return performance.now().toString().replace('.','')+Math.random().toString(36).substr(2, 9);
}

function sendPE (subId,reqHeader,reqBody,subscribe){
    //resHead, resBody, reqHead
    return new Promise((resolve, reject)=>{
        const data = {
            subId:subId
            ,reqHeaderJSON:JSON.stringify(reqHeader)
            ,reqBody:reqBody
            ,callbackId: getcallBackId()
            ,subscribe:subscribe
        };

        if(subscribe && localSubscriptionData[reqHeader.resource+':'+reqHeader.resId]){
            const subdata = localSubscriptionData[reqHeader.resource+':'+reqHeader.resId];
            resolve([subdata.resHead, subdata.resBody, subdata.reqHeader]);
            return;
        }

        ipccallbacks[data.callbackId]=(retdata)=>{
            if(subscribe){localSubscriptionData[reqHeader.resource+':'+reqHeader.resId] = retdata;}
            resolve([retdata.resHead, retdata.resBody, retdata.reqHeader]);
        };

        //console.log("Send PE "+data.callbackId +" " +reqHeader.resource);
        //console.log(data);
        ipcRenderer.send('asynchronous-message'
            , 'sendPE'
            ,{...data,...window.ump}
        );
    });


}
exports.sendPE =sendPE;

function commonMarkParsing(md,jq=false){
    const reader = new commonmark.Parser();
    const writer = new commonmark.HtmlRenderer();
    const parsed = reader.parse(md); // parsed is a 'Node' tree
    // transform parsed if you like...
    const walker = parsed.walker();
    let event, node;

    while ((event = walker.next())) {
        node = event.node;
        if (event.entering && node.type === 'image' && node.destination.match(/^midi\+file:\/\//)) {
            node.destination += '?uiWinId='+window.uiWinId
        }
    }
    const desc = writer.render(parsed); // result is a String
    if(jq){
        jq.append(desc);
    }else{
        return desc;
    }

}
exports.commonMarkParsing = commonMarkParsing;

function showChCtrlList(opts) {
    ipcRenderer.send('asynchronous-message'
        , 'showCtrlList'
        , {...opts,...window.ump}
    );
}

function buildListModal(oOpts){
    //{title:"bbb",resource: "ProgramList","id":chData._collection,cbSelect:function(){},cbClose:function(){}}
    const pageSize=oOpts.limit || 10;
    let jqpage;
    let currentOffset=0;

    const getData = (offset,limit)=>{
        jqtbody.empty();
        currentOffset=offset;


        const reqHeader = {resource: oOpts.resource};
        if(oOpts.resourceObj.canPaginate){
            jqpage.empty();
            reqHeader.offset = offset;
            reqHeader.limit = limit;
        }
        if(oOpts.resId){
            reqHeader.resId = oOpts.resId;
        }
        if(oOpts.data){
            buildTableOutput(jqtbody,oOpts.data,oOpts);
            return;
        }

        sendPE(0x34, reqHeader,null).then(([resHead, resBody, reqHead])=>{
            jqtbody.empty();
            buildTableOutput(jqtbody,resBody,oOpts);

            if(!oOpts.resourceObj.canPaginate){
                return;
            }
            jqpage.empty();

            const nTotal = resHead.totalCount;
            $('.totalCount',jqModal).text(nTotal);

            const pages = Math.ceil(nTotal  / pageSize);
            const limitNavigation=5;
            const paginationDist = Math.ceil(limitNavigation/2);
            const currentPage = Math.round(offset/pageSize) ;

            let from = currentPage-limitNavigation + paginationDist;
                if(from < 0)from=0;
                let to = from+limitNavigation;

                if(to > pages){
                    to=pages;
                    from=to-limitNavigation;
                }
                if(from < 0)from=0;

            const jqfirst = $('<li/>',{"class":"page-item " +(currentPage===0?'disabled':'')})
                    .appendTo(jqpage);
                $('<a/>',{"class":'page-link'}).appendTo(jqfirst).text('<<')
                    .on('click',function(e){
                        getData(0,pageSize);
                    });

            const jqprev = $('<li/>',{"class":"page-item " +(currentPage===0?'disabled':'')})
                    .appendTo(jqpage);
                $('<a/>',{"class":'page-link'}).appendTo(jqprev).text('<')
                    .on('click',function(){
                        const offset = (currentPage-1)*pageSize;
                        getData(offset<0?0:offset,pageSize);
                    });

                for(let i=from;i<to;i++){
                    const jqpli = $('<li/>',{"class":"page-item " +(i===currentPage?'active':'')})
                        .appendTo(jqpage);
                    $('<a/>',{"class":'page-link',"data-index":i}).appendTo(jqpli).text(i+1)
                        .on('click',function(e){
                            const offset = e.target.dataset.index*pageSize;
                            getData(offset,pageSize);
                        });
                }

            const jqpnext = $('<li/>',{"class":"page-item " +((pages-1)===currentPage?'disabled':'')})
                    .appendTo(jqpage);
                $('<a/>',{"class":'page-link'}).appendTo(jqpnext).text('>')
                    .on('click',function(e){
                        const offset = (currentPage+1)*pageSize;
                        getData(offset>(pages-1)*pageSize?pages*pageSize:offset,pageSize);
                    });

                const jqplast = $('<li/>',{"class":"page-item " +((pages-1)===currentPage?'disabled':'')})
                        .appendTo(jqpage);
                    $('<a/>',{"class":'page-link'}).appendTo(jqplast).text('>>')
                        .on('click',function(e){
                            const offset = (pages-1)*pageSize;
                            getData(offset,pageSize);
                        });
                setTimeout(()=>{
                    $('[data-toggle="popover"]').popover({
                        trigger: 'hover',
                        placement: 'top',
                        boundary: 'viewport',
                        animation: false,
                        html: true
                    });
                },500);
            }
        );
    }

    const jqModal = $('<div>',{"class":"modal fade bd-example-modal-lg"})
        .appendTo('body');
    const jqModalMain = $('<div>',{"class":"modal-dialog modal-lg modal-dialog-centered"})
        .appendTo(jqModal);
    const jqModalContent = $('<div>',{"class":"modal-content"})
        .appendTo(jqModalMain);

    $('<div/>',{"class":"modal-header"})
        .append('<h5 class="modal-title">'+oOpts.title+'</h5>')
        .append('<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>')
        .appendTo(jqModalContent);

    const jqbody = $('<div/>',{"class":"modal-body"}).appendTo(jqModalContent);

    oOpts.jqModal = jqModal;
    const jqtbody = buildTable(jqbody,oOpts.resourceObj,oOpts);

    if(oOpts.setupSub){
        jqtbody
            .attr("data-resource",oOpts.resource)
            .attr("data-resid",oOpts.resId||'')
            .on('peSub', function (e,subDetail) {
                //debugger;
                getData(currentOffset,pageSize);
            });
    }




    if(!oOpts.data && oOpts.resourceObj.canPaginate){
        const jqfooter = $('<div/>',{"class":"modal-footer"})
            .append('<div class="input-group"><div class="input-group-append pagelist"><ul class="pagination" style="margin-bottom: 0;"></ul> </div><div class="input-group-prepend"><div class="input-group-text">Total:'
                +'<span class="totalCount"/></div> </div> </div>')
            .appendTo(jqModalContent);
        jqpage = $('.pagination',jqfooter);
    }



    jqModal
        .modal({show:true})
        .on('hidden.bs.modal', function (e) {
            jqModal.modal('dispose').remove();
            if(oOpts.cbClose){
                oOpts.cbClose();
            }
        });

    getData(0,pageSize);

    return jqModal;

    //get DATA and put it in here

}
exports.buildListModal =buildListModal;

function buildTableOutput(jqtbody,resBody,oOpts={}){

    //var muidString = currentMUID.join('_');
    const resourceObj = oOpts.resourceObj;
    const columns = oOpts.columns || resourceObj.columns;
    const schema = resourceObj.schema;

    let cmthOffset=-1;
    if(resourceObj.resource==="ChannelList"){
        const jqthCM = jqtbody.parent().find('th[data-ChCtrlList]');
        if(jqthCM.length)
         cmthOffset = jqthCM.prevAll().length;
    }

    (resBody||[]).map(row=>{

        const jqrow = $('<tr/>').appendTo(jqtbody)
            .on('click',()=>{
                if(oOpts.cbSelect)oOpts.cbSelect(row);
                if(oOpts.jqModal)oOpts.jqModal.modal('hide');
            });
        if(oOpts.cbSelect){
            jqrow.css('cursor','pointer');
        }
        let ChCtrlListShown=false;
        columns.map(colObj=>{
            //var jqOut='';
            const jqtd = $('<td/>').appendTo(jqrow);
            if(colObj.display){
                colObj.display(row,jqtd);
            }else
            if(colObj.property){

                if(resourceObj.resource==="ChCtrlList" && colObj.property==="value"){
                    //This is to display a slider
                    row.minMax = row.minMax || [0,4294967295];
                    row.numSigBits = row.numSigBits || 32;

                    let value = row[colObj.property] || row.minMax[0] ;
                    if(resourceObj.resource==="ChCtrlList"){
                        value = row.default;
                    }

                    function onChangeInput(e){
                        const cm = $(this).data('row');
                        const ch = oOpts.channel || 0;
                        const umpGroup = oOpts.umpGroup || 0 ;
                        let val = parseInt($(this).val(),10)>>>0;
                        if($(this).is('[type=checkbox]')){
                            val = $(this).is(':checked')?4294967295:0;
                        }else
                        if($(this).is('[type=button]')){
                            val = e.type==="mousedown"?4294967295:0;
                        }
                        if(cm.ctrlType==='cc'){
                            //cmMax=127;
                            if(!Array.isArray(cm.ctrlIndex)){
                                return;
                            }

                            let out1 = ((0x04 << 4) + umpGroup) << 24;
                            out1 += (0xB0 + ch)<<16;
                            out1 += cm.ctrlIndex[0] <<8;
                            if(cm.ctrlIndex.length>1 ){
                                //flag that this is a 14 bit CC
                                out1 += 1;
                            }
                            let out2 =t.scaleDown(val,32,cm.numSigBits)  >>>0;
                            out2 =t.scaleUp(out2,cm.numSigBits,32)  >>>0;
                            const ump=[out1,out2];
                            //console.log('sl:'+out2);
                            ipcRenderer.send('asynchronous-message', 'sendUMP',{ump,...window.ump});

                        }else if(cm.ctrlType==='nrpn') {
                            if(!Array.isArray(cm.ctrlIndex)){
                                return;
                            }
                            let out1 = ((0x04 << 4) + umpGroup) << 24;
                            out1 += ((0b0011<<4) + ch) << 16;
                            out1 += cm.ctrlIndex[0] << 8;
                            out1 += cm.ctrlIndex[1];
                            const out2 = t.scaleUp($(this).val(),14,32) >>>0;
                            const ump = [out1,out2];
                            ipcRenderer.send('asynchronous-message', 'sendUMP',{ump,...window.ump});
                        }else if(cm.ctrlType==='rpn') {
                            if(!Array.isArray(cm.ctrlIndex)){
                                return;
                            }
                            let out1 = ((0x04 << 4) + umpGroup) << 24;
                            out1 += ((0b0010<<4) + ch) << 16;
                            out1 += cm.ctrlIndex[0] << 8;
                            out1 += cm.ctrlIndex[1];
                            const out2 = t.scaleUp($(this).val(),14,32) >>>0;
                            const ump = [out1,out2];
                            ipcRenderer.send('asynchronous-message', 'sendUMP',{ump,...window.ump});
                        }
                    }

                    switch(row.typeHint){
                        case "switch":
                            $('<input/>'
                                ,{
                                    type:'checkbox',
                                    'value': 1
                                }
                            )
                                .data("row",row)
                                .appendTo(jqtd)
                                .on('change',onChangeInput);
                            break;
                        case "button":
                            $('<input/>'
                                ,{
                                    type:'button',
                                    'value': 'on/off'
                                }
                            )
                                .data("row",row)
                                .appendTo(jqtd)
                                .on('mousedown',onChangeInput)
                                .on('mouseup',onChangeInput);
                            break;
                        case "number":
                            $('<input/>'
                                ,{
                                    type:'number',
                                    'min':  row.minMax[0],
                                    'max': row.minMax[1],
                                    'step': 1,
                                    'value': value
                                }
                            )
                                .data("row",row)
                                .appendTo(jqtd)
                                .on('change',onChangeInput);
                            break;
                        case "valueSelect":
                            const jqValSel = $('<select/>')
                                .data("row",row)
                                .appendTo(jqtd)
                                .append('<option>--</option>')
                                .on('change',onChangeInput);
                            if(row.contMapList){
                                row.contMapList.map(cml=>{
                                   $('<option/>',{value:cml.value}).text(cml.title).appendTo(jqValSel);
                                });
                            }
                            break;
                        default:
                            $('<input/>'
                                ,{
                                    type:'range',
                                    'min':  row.minMax[0],
                                    'max': row.minMax[1],
                                    'step': 1,
                                    'value': value
                                }
                            )
                                .data("row",row)
                                .appendTo(jqtd)
                                .on('input',onChangeInput);
                            break;
                    }




                }
                else
                if(Array.isArray(row[colObj.property])){
                    jqtd.text(row[colObj.property].join(', '));
                }else if(row[colObj.property]!==undefined){
                    jqtd.text(row[colObj.property]);
                }

            } else
            if(colObj.link){
                if(colObj.link==="ChCtrlList"){
                    ChCtrlListShown=true;
                    //jqHead.attr("data-CtrlList","1");
                }
                for(let i=0;i< (row.links ||[]).length;i++){
                    if(row.links[i].resource===colObj.link){
                        displayResource(jqtd,row,colObj.link,row.links[i]);
                    }
                }
            }
        });
        if(resourceObj.resource==="ChannelList" && !ChCtrlListShown){
            const jqtd = $('<td/>').appendTo(jqrow);
            for(let i=0;i< (row.links ||[]).length;i++){
                if(row.links[i].resource==="ChCtrlList"){
                    row.links[i].title=" ";
                    row.links[i].class="fa fa-sliders-h fa-rotate-90";
                    displayResource(jqtd,row,"ChCtrlList",row.links[i]);
                }
            }
        }
    });
}

function buildTable(jqbody,resourceObj,oOpts = {}){

    const columns = oOpts.columns || resourceObj.columns;
    const schema = resourceObj.schema;


    const jqtable = $('<table/>',{"class":"table table-hover table-sm "})
            .append('<thead/>')
            .appendTo(jqbody);

    const jqtheadTr = $('<tr/>')
            .appendTo($('thead',jqtable));

        let ChCtrlListShown=false;
        //Extra headers
    (columns||[]).map(colObj=>{
            let heading='';
            const jqHead =  $('<th/>',{scope:'col'}).appendTo(jqtheadTr);
            if(colObj.property){
                //debugger;
                heading = colObj.title ||  ((((schema||{}).items||{}).properties||{})[colObj.property]||{}).title || colObj.property;
                jqHead.text(heading);
            }else if(colObj.link){
                if(colObj.link==="ChCtrlList"){
                    ChCtrlListShown=true;
                    jqHead.attr("data-ChCtrlList","1");
                }

                //TODO Look up the link and make sure the Resource Exists - otherwise trigger an error

                getResourceWithSchemaRef(colObj.link).then(([resourceObj])=>{
                    jqHead.text(resourceObj.schema.title);
                })
            }else{
                jqHead.text(colObj.title || '');
            }
        });

        if(resourceObj.resource==="ChannelList" && !ChCtrlListShown){
            $('<th data-ChCtrlList="1"/>',{scope:'col'}).appendTo(jqtheadTr).text("");
        }

        return $('<tbody/>').appendTo(jqtable);
}

//*******************************************************************

// exports.displayProtocols = function(){
//     return;
//     const jqprL = $('#protocolListLinks').empty();
//     const protocolList = ptr.get(window.settings, '/protocolList') || [];
//
//     protocolList.map(pr=>{
//         const jqtr = $('<tr/>').appendTo(jqprL);
//         const jqtd1 = $('<td/>').appendTo(jqtr);
//         if(pr.type===1){
//             $('<h3/>').text('MIDI 1.0').appendTo(jqtd1);
//         }else if(pr.type===2){
//             $('<h3/>').text('MIDI 2.0').appendTo(jqtd1);
//         }else{
//             $('<h3/>').text('UNKNOWN Protocol').appendTo(jqtd1);
//         }
//
//         if(pr.jr){
//             $('<div/>').text('Jitter Reduction').appendTo(jqtd1);
//         }
//         if(pr.sExt){
//             $('<div/>').text('Size Extension').appendTo(jqtd1);
//         }
//
//         const jqtd2 = $('<td/>').appendTo(jqtr);
//         $('<button/>',{type:'button'})
//             .appendTo(jqtd2)
//             .text('Set To This Protocol')
//             .data('protocol',pr)
//             .on('click',function(){
//                 const pr = $(this).data('protocol');
//                 ipcRenderer.send('asynchronous-message', 'setNewProtocol',pr);
//             });
//     });
// };

exports.clickLinkWithRole = async function(jq, link,channelListData){
    const trLink = ()=>{
        const reqHeader = {
            resource:link.resource,
        };
        if(link.resId){
            reqHeader.resId = link.resId;
        }
        sendPE(0x36, reqHeader,link.propData).then(([resHead])=>{
                if(resHead.message){
                    alert(resHead.message);
                }
            }
        );
    }

    if( roles[link.role] ){
        roles[link.role](link, channelListData, trLink, jq);
    }

};



exports.getType = function(number) {
    //from https://github.com/edwardball/midi-logger/blob/master/js/midi-logger.js (Apache Licence)
    switch (Math.floor(number / 16)) {
        case 8:
            return "Note off";
        case 9:
            return "Note on";
        case 10:
            return "Polyphonic key pressure";
        case 11:
            return "Control change";
        case 12:
            return "Program change";
        case 13:
            return "Monophonic key pressure";
        case 14:
            return "Pitch bend";
        default:
            return number;
    }
}


function buildProfileTab(pf){
    //debugger;
    let jqTestTab = $('#profileUserTestTabli');
    midi2Tables.profiles.map(function(pfLookup){
        if(pfLookup.bank===pf.bank && pfLookup.number===pf.number && pfLookup.interoperability){
            let id='pftest_'+pf.bank+'_'+pf.number;
            if(!pf.isMMA || $('#'+id).length)return;

            let jqPFTab = $('<li/>').addClass('nav-item pf-test '+id).insertAfter(jqTestTab);
            $('<a/>',{'data-toggle':'tab',href:'#'+id}).addClass('nav-link ml-3')
                .append(pf.name)
                .appendTo(jqPFTab);
            const jqPFTabContent = $('<div/>',{id:id}).addClass('tab-pane fade pf-test '+id)
                .appendTo('#pageTabContent');
            exports.buildinteroperability(jqPFTabContent,pfLookup.interoperability,{profileLevels:true,level:pf.level});
        }
    });
    common.setValues();
    common.setValueOnChange(ipcRenderer);

}

function buildProfileButton(jqtd,sourceDestination,isEnabled,pf){
    const pfid = pf.sysex.join('_');
    const existingButton = $('[pfid='+pfid+']',jqtd);
    if(existingButton.length){
        existingButton .data('isEnabled',isEnabled);
        if(isEnabled){
            existingButton.removeClass('btn-light').addClass('btn-primary');
        }else{
            existingButton.addClass('btn-light').removeClass('btn-primary');
        }
        return;
    }

    let title = (isEnabled?'Enabled':'Disabled')+ ". Level "+pf.level+": "+ (pf.profileLevels || {})[pf.level];
    let name = pf.name || "Unknown Profile";

    if(!pf.isMMA){
        title = (isEnabled?'Enabled':'Disabled')+ ' Manufacturer Defined Profile';
        name = pf.manufacturerName + " " +pf.id1+"/"+pf.id2;
    }

    const jdWrapDiv = $('<div/>').appendTo(jqtd);
    let [group, channel] = sourceDestination.split('_').map(v=>parseInt(v));
    $('<button/>',{
        type:"button"
        ,"class":"btn btn-sm btn-" +(isEnabled?'primary':'light text-secondary')
    })
        .attr('pfid',pfid)
        .data('group',group)
        .data('channel',channel)
        .data('profile',pf)
        .data('isEnabled',isEnabled)
        .attr("data-toggle","tooltip")
        .attr("title",title)
        .on('click',function(e){


            const group = $(this).data('group');
            const channel = $(this).data('channel');
            const profile = $(this).data('profile');
            const isEnabled = $(this).data('isEnabled');

            if(!isEnabled){
                ipcRenderer.send('asynchronous-message', 'profileOn',{
                    ...window.ump,
                    group,
                    channel,
                    profile,
                });

            }else{
                ipcRenderer.send('asynchronous-message', 'profileOff',{
                    ...window.ump,
                    group,
                    channel,
                    profile
                });
            }

        })
        .text(name)
        .appendTo(jdWrapDiv);

    if(pf.isMMA){
        let matchedProfile={};
        midi2Tables.profiles.map(rawPF=>{
            if(rawPF.bank===pf.bank && rawPF.number===pf.number){
                //Great Found match
                matchedProfile=rawPF;

            }
        });

        const existingContButton = $('[pfContid='+pf.bank+'_'+pf.number+']',jqtd);
        if(isEnabled && matchedProfile.CtrlList && !existingContButton.length){

            $('<button/>',{
                type:"button"
                ,"class":"btn btn-sm btn-outline-secondary fa fa-sliders-h fa-rotate-90"
                ,pfContid: pf.bank+'_'+pf.number
            }).data('sourceDestination',sourceDestination)
                .data('pf',pf)
                .data('CtrlList',matchedProfile.CtrlList)
                .data('isEnabled',isEnabled)
                .on('click',function(e){
                    const sourceDestination = parseInt($(this).data('sourceDestination'),10);
                    const ChCtrlList = $(this).data('CtrlList')
                    const pf = $(this).data('pf')

                    showChCtrlList({
                        link:{title: pf.name + ' Profile Controller Messages'}
                        ,ChCtrlList
                        ,group, channel,
                        profile: true
                    });
                })
                .appendTo(jdWrapDiv);
        }

        const existingExtButton = $('[pfExtid='+pf.bank+'_'+pf.number+']',jqtd);
        if(isEnabled && !existingExtButton.length
            && (matchedProfile.profileSpecificData || matchedProfile.extendedUI)
        ){

            $('<button/>',{
                type:"button"
                ,"class":"btn btn-sm btn-outline-secondary fa fa-cog fa-rotate-90"
                ,pfExtid: pf.bank+'_'+pf.number
            }).data('sourceDestination',sourceDestination)
                .data('matchedProfile',matchedProfile)
                .data('isEnabled',isEnabled)
                .on('click',function(e){
                    const sourceDestination = parseInt($(this).data('sourceDestination'),10);
                    const matchedProfile = $(this).data('matchedProfile')
                    ipcRenderer.send('asynchronous-message', 'openInstrument',{
                        sourceDestination,
                        bank: matchedProfile.bank,
                        number: matchedProfile.number,
                        level: pf.level,
                        version: pf.version,
                        profileSysex: pf.sysex,
                        ...window.ump
                    });
                })
                .appendTo(jdWrapDiv);
        }
    }



}


function buildModalAlert(msg, type="warning"){
    const jqModal = $('<div>',{"class":"modal fade bd-example-modal-lg"})
        .appendTo('body');
    const jqModalMain = $('<div>',{"class":"modal-dialog modal-lg modal-dialog-centered"})
        .appendTo(jqModal);
    const jqModalContent = $('<div>',{"class":"modal-content"})
        .appendTo(jqModalMain);
    $('<div/>',{"class":"modal-body alert alert-"+ type+ " fade show mb-0"})
        .appendTo(jqModalContent)
        .html(msg);


    jqModal
        .modal({show:true})
        .on('hidden.bs.modal', function (e) {
            jqModal.modal('dispose').remove();
        });
}
exports.buildModalAlert = buildModalAlert;

//*********************************************************************

exports.buildProfilePage = function(pf){
    const jqMain = $('#main')
        .append('<h1 class="col-md-12 m-1 p-0">'+ pf.name + '</h1>')
        .append('<h4 class="col-md-12 m-2 p-0">Profile Version: '+ pf.version + '</h4>');

    const jqLevels = $('<div class="col-md-12 m-2 p-0"/>').appendTo(jqMain);
    for (const profileLevelsKey in pf.profileLevels) {
        const jqLevel = $('<div/>',{class:'badge '+ (profileLevelsKey===pf.level?'badge-success':'badge-light')})
            .append(pf.profileLevels[profileLevelsKey])
            .appendTo(jqLevels);
    }

    const jqSpecificData = $('<div class="col-md-12 m-2 p-0"/>').appendTo(jqMain);
    for (const opCode in pf.profileDetailsInquiry){
        $('<button/>',{"class":"btn"})
            .addClass('btn-light')
            .text(pf.profileDetailsInquiry[opCode])
            .data('opCode',opCode)
            .appendTo(jqSpecificData)
            .on('click',function(){
                const opCode = $(this).data('opCode');
                ipcRenderer.send('asynchronous-message'
                    , 'sendProfileDetailInquiry'
                    , {
                        sourceDestination: window.sourceDestination,
                        inquiryTarget: opCode,
                        profile: {
                            bank: window.matchedProfile.bank,
                            number: window.matchedProfile.number,
                            version: window.matchedProfile.version,
                            level: window.matchedProfile.level,
                            name: window.matchedProfile.name,
                        },
                        ...window.ump
                    }
                );
            });
    }


    for (const profileSpecificDataKey in pf.profileSpecificData){
        const pfSpecData = pf.profileSpecificData[profileSpecificDataKey];
        $('<button/>',{"class":"btn"})
            .addClass('btn-light')
            .text(pfSpecData.title)
            .data('profileSpecificDataKey',profileSpecificDataKey)
            .appendTo(jqSpecificData)
            .on('click',function(){
                const profileSpecificDataKey = $(this).data('profileSpecificDataKey');
                ipcRenderer.send('asynchronous-message'
                    , 'sendProfileSpecificData'
                    , {
                        //sysex: pfSpecData.sysex,
                        sourceDestination: window.sourceDestination,
                        profileSpecificData: profileSpecificDataKey,
                        profile: {
                            bank: window.matchedProfile.bank,
                            number: window.matchedProfile.number,
                            version: window.matchedProfile.version,
                            level: window.matchedProfile.level,
                            name: window.matchedProfile.name,
                        },
                        ...window.ump
                    }
                );
            });
    }

}

exports.buildinteroperability = function(jqTabRef,topic){

    const jqTab = $(jqTabRef).empty();
    if(window.isReport){
        $('<h2/>').text(topic.title||'')
            .appendTo(jqTab);
    }
    const jqtable = $('<table/>',{"class":"table table-hover table-sm table-borderless"})
        .append('<thead/>')
        .appendTo(jqTab);

    $('<tr/>')
        .addClass('bg-light')
        .append('<th scope="col"></th>')
        .append('<th scope="col">Requirement</th>')
        .append('<th scope="col"></th>')
        .append('<th scope="col">Compliant</th>')
        .append('<th scope="col" class="text-danger pl-3" style="min-width: 300px;">'
            + (window.isReport?'Notes':'If not compliant, please explain why requirement is not met')
            +'</th>')
        .appendTo($('thead',jqtable));


    if(!topic.sections)debugger;
    topic.sections.map(section=>{
        if(section.visibleiftrue){
            let skip=true;

            section.visibleiftrue.split(',').map(path=> {
                let val = ptr.get(window.settings, path);
                if (val) {
                    skip = false;
                }
            });
            if(skip)return;
        }
        const jqtBody = $('<tbody/>').appendTo(jqtable);

        if(section.showIf){
            jqtBody.attr('data-visibleiftrue',qs.showIf.join(','));
        }

        $('<tr/>')
            .append('<th scope="row" colspan="5">'+section.title+'</th>')
            .appendTo(jqtBody);



        section.questions.map(qs=>{
            const jqrow = $('<tr/>').appendTo(jqtBody);
            $('<td/>')
                .addClass('text-danger')
                .append(qs.required?'*':'')
                .appendTo(jqrow);
            const tdTitle = $('<td/>')
                .append(/*''+qs.id+'. '+*/qs.text+'')
                .appendTo(jqrow);
            if(qs.showIf){
                jqrow.attr('data-visibleiftrue',qs.showIf.join(','));
            }
            if(qs.extra){
                tdTitle
                    .append('<br/>')
                    .append('<span class="text-secondary">'+qs.extra+'</span>')
            }
            const tdtest = $('<td/>').appendTo(jqrow);
            if(!window.isReport&& qs.test){
                $('<button/>',{type:'button','class':'btn btn-link','data-qsid':qs.id})
                    .text('Test')
                    .appendTo(tdtest)
                    .on('click',function(){
                        const qsid = this.dataset.qsid;
                        ipcRenderer.send('asynchronous-message', 'interoperabilityAutoTest',{qsid,...window.ump});
                        const jqModal = $('<div>', {"class": "modal fade bd-example-modal-lg "})
                            .appendTo('body');
                        let jqModalMain = $('<div>', {"class": "modal-dialog modal-lg modal-dialog-centered"})
                            .appendTo(jqModal);
                        let jqModalContent = $('<div>', {"class": "modal-content"})
                            .appendTo(jqModalMain);
                        $('<div/>', {"class": "modal-header"})
                            .append('<h5 class="modal-title">' + qs.text + '</h5>')
                            .append('<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>')
                            .appendTo(jqModalContent);

                        let jqbody = $('<div/>', {"class": "modal-body interoperabilityAutoTest"})
                            .appendTo(jqModalContent);
                        if(qs.extra){
                            $('<div/>').append('<span class="text-secondary">'+qs.extra+'</span>')
                                .appendTo(jqbody);
                        }

                        jqModal
                            .modal({show: true})
                            .on('hidden.bs.modal', function () {
                                jqModal.modal('dispose').remove();
                            });
                    });
            }


            const tdcomp = $('<td/>').appendTo(jqrow);
            let tdtext;
            if(qs.type){
                switch(qs.type){
                    case 'textarea':
                        tdcomp.attr('colspan',2);
                        if(!window.isReport){
                            $('<textarea/>',{'class':'form-control form-control-sm','data-path':'/interoperability/'+qs.id})
                                .appendTo(tdcomp);
                        }else{
                            $('<span/>',{'data-pathText':'/interoperability/'+qs.id,style: "white-space: pre;"})
                                .appendTo(tdcomp);
                        }

                        break;
                }
            }else{
                if(!window.isReport){
                    $('<input/>',{type:'checkbox','class':'form-control form-control-sm','data-path':'/interoperability/'+qs.id})
                        .appendTo(tdcomp);

                    tdtext = $('<td/>').appendTo(jqrow);
                    $('<textarea/>',{'class':'form-control form-control-sm','data-path':'/interoperabilityText/'+qs.id})
                        .appendTo(tdtext);
                }else{
                    $('<input/>',{type:'checkbox','class':'form-control form-control-sm','data-path':'/interoperability/'+qs.id})
                        .appendTo(tdcomp);

                    tdtext = $('<td/>').appendTo(jqrow);
                    $('<span/>',{'data-pathText':'/interoperabilityText/'+qs.id,style: "white-space: pre;"})
                        .appendTo(tdtext);
                }

            }



        });
        $('<tr/>')
            .append('<th scope="row" colspan="4">&nbsp;</th>')
            .appendTo(jqtBody);

    });

}

function confirmDialog(confirmObj,cb){

    let jqModal = $('<div>', {"class": "modal fade",role:"dialog"})
        .appendTo('body');
    let jqModalMain = $('<div>', {"class": "modal-dialog modal-sm modal-dialog-centered"})
        .appendTo(jqModal);
    let jqModalContent = $('<div>', {"class": "modal-content"})
        .appendTo(jqModalMain);

    $('<div/>', {"class": "modal-body"})
        .append('<p>' + (confirmObj.confirmMsg || '') + '</p>')
        .appendTo(jqModalContent);

    const jqFooter = $('<div/>', {"class": "modal-footer"})
        .appendTo(jqModalContent);

    $('<a/>',{class:"btn btn-danger btn-ok"})
        .text(confirmObj.confirmType==="yesno"?"Yes":"Ok")
        .appendTo(jqFooter)
        .on('click',(e)=>{
            e.stopPropagation();
            e.preventDefault();
            cb();
            jqModal.modal('hide');
        });

    $('<button/>',{type:"button", class:"btn btn-default", 'data-dismiss':"modal"})
        .text(confirmObj.confirmType==="yesno"?"No":"Cancel")
        .appendTo(jqFooter);

    jqModal
        .modal({show: true})
        .on('hidden.bs.modal', () => {
            jqModal.modal('dispose').remove();
        });

};

//**********************************************************************
document.addEventListener("keydown", function (e) {
    if (e.which === 68 && e.ctrlKey===true) {
        ipcRenderer.send('asynchronous-message', 'openDebug');
    } else if (e.which === 82 && e.ctrlKey===true) {
        ipcRenderer.send('asynchronous-message', 'openReport');
    } else if (e.which === 123) {
        ipcRenderer.send('asynchronous-message', 'toggleDevTools');
    } else if (e.which === 116) {
        location.reload();
    }
});

//open links externally by default
$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});
