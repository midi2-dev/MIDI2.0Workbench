/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');
const {JsonPointer: ptr } = require('json-ptr');
const midi2Tables = require('./../libs/midiCITables.js');
const interoperability = require('./../libs/interoperability.js');
const common = require('./app/common.js');
const t = require('./../libs/translations.js');
const d = require('./../libs/debugger.js');

const {messageType} = require("./../libs/messageTypes");


//debugger;
window.settings={};
window.configSetting={};
let firstLoad = true,peSetup=false;
window.uiWinId = null;
window.isReport = window.location.href.match(/([^\/]*)$/)[1]==="report.html"?1:0;
const isImplementation = window.location.href.match(/([^\/]*)$/)[1]==="implementation.html"?1:0;

const ipccallbacks={};
const ipccallbacksSubs={};

let printMode=false;

const GBDirection = ['bidirectional','in','out'];
const GBprotocol = {
    0x00: 'Unknown (Use MIDI-CI)',
    0x01: 'MIDI 1.0, 64 bits',
    0x02: 'MIDI 1.0, 64 bits, JR',
    0x03: 'MIDI 1.0, 128 bits',
    0x04: 'MIDI 1.0, 128 bits, JR',
    0x11: 'MIDI 2.0',
    0x12: 'MIDI 2.0, JR',
};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

document.addEventListener('DOMContentLoaded', () => {
    let ipcProcess = {};
    const jqdWarn = $('#ddbLink > .badge-warning')
        .on('dblclick',(e)=>{
            $(e.currentTarget).text('');
            e.stopPropagation();
        })
        .on('click',(e)=>{e.stopPropagation();})
    const jqdError = $('#ddbLink > .badge-danger').on('dblclick',(e)=>{
        $(e.currentTarget).text('');
        e.stopPropagation();
        })
        .on('click',(e)=>{e.stopPropagation();});

    ipcRenderer.on('asynchronous-reply', (event, arg, xData) => {
        //console.log(arg);
        if(ipcProcess[arg]){
            ipcProcess[arg](xData,common);
        }

        switch (arg) {
            case 'newumpData': {
                window.ump = {group:xData.group,umpDev:xData.umpDev,muid:xData.muid,funcBlock:xData.funcBlock};
                break;
            }
            case 'firstLoad': {
                window.ump = {group:xData.group,umpDev:xData.umpDev,muid:xData.muid,funcBlock:xData.funcBlock};
                window.uiWinId = xData.uiWinId;

                let rem = ['.remoteEndpoint', '.midiciDevice', '.functionBlock', '.umpStream',
                    '.isMidi1'];
                if(xData.umpStream){
                    rem = rem.filter(c=>c!=='.umpStream');
                }

                if(xData.muid){
                    rem = rem.filter(c=>c!=='.midiciDevice');
                }

                if(xData.funcBlock && xData.funcBlock.fbIdx!==0x7F && !xData.funcBlock.isMIDI1){
                    rem = rem.filter(c=>c!=='.functionBlock');
                }

                if(xData.funcBlock && xData.funcBlock.isMIDI1){
                    rem = rem.filter(c=>c!=='.isMidi1');
                }

                if(xData.remoteEndpoint ||  xData.funcBlock?.isMIDI1){
                    rem = rem.filter(c=>c!=='.remoteEndpoint');
                }
                $(rem.join(',')).remove();

                if(!$('#tbProjDet').length){
                    $('#midici-tab').trigger('click');
                }

                ipcRenderer.send('asynchronous-message', 'getConfig');
                ipcRenderer.send('asynchronous-message', 'getSettings',window.ump);

                $('#MDGroup1b')
                    .attr('min',xData.funcBlock?.firstGroup+1)
                    .attr('max',xData.funcBlock?.firstGroup+xData.funcBlock?.numberGroups)
                    .val(xData.funcBlock?.firstGroup+1);


                if(xData.printMode){
                    printMode=true;
                }

                break;
            }
            case 'MIDIReportMessage': {
                for(let i=0; i < 8; i++){
                    let ind = 1 << i;
                    if(ind & xData.systemTypesBitmap)
                        $('.systemTypesBitmap[value='+ind+']').parent().addClass('bg-success');

                    if(ind & xData.chanContTypeBitmap)
                        $('.chanContTypeBitmap[value='+ind+']').parent().addClass('bg-success');

                    if(ind & xData.noteDataTypeBitmap)
                        $('.noteDataTypeBitmap[value='+ind+']').parent().addClass('bg-success');

                }

                let midiMode = ptr.get(window.settings, '/midiMode');

                let outpackets = t.umpToMidi10(xData.ump, midiMode);
                outpackets.map(msg => {
                    let jqtr = $('<tr/>').appendTo('#midiReportResults');
                    $('<td/>')
                        .text((msg[0] % 16) + 1)
                        .appendTo(jqtr);
                    $('<td/>')
                        .text(common.getType(msg[0]) + (msg[2] === undefined ? '' : ' ' + msg[1]))
                        .appendTo(jqtr);
                    $('<td/>')
                        .text(msg[2] === undefined ? msg[1] : msg[2])
                        .appendTo(jqtr);
                });

                break;
            }
            case 'clearMIDICIList':{
               if(xData.isCurrent){
                   common.buildModalAlert("MUID has been Invalidated - Please exit and Refresh", "error");
               }
                break;
            }

            case 'callback':
                //console.log("CallBack "+xData.callbackId);
                //console.log(xData);
                if(ipccallbacks[xData.callbackId]){
                    if(xData.error){
                        //common.buildModalAlert(xData.error, "error");
                    }else{
                        ipccallbacks[xData.callbackId](xData.data);
                    }
                    delete ipccallbacks[xData.callbackId];//called once and removed
                }else {
                    console.log("CallBack NOTFOUND ");
                    console.log(xData);
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
            case 'updatePE':
                if(xData!=='ResourceList') common.setPESetup();
                break;
            case 'peSubUpdate':
                //debugger;
                $('[data-resource='+xData.subDetail.reqHead.resource+']'
                    + (xData.subDetail.reqHead.resId?'[data-resid='+xData.subDetail.reqHead.resId+']':'')
                ).trigger('peSub',xData.subDetail);

                break;
            case 'stateListUpdate':
                common.peStateListRefresh();
                break;
            case 'configSettings':
                window.configSetting = xData;
                common.setValues();
                common.setValueOnChange();
                break;
            case 'settings':
                window.settings = xData;

                if(firstLoad){
                    firstLoad=false;

                }

                interoperability.interoperability.map(topic=>{
                    common.buildinteroperability('#'+topic.tab,topic);
                    if(window.isReport && topic.tab==='profileInteroperability'){
                        const profileConfig = ptr.get(window.settings, '/profiles') || {};
                        for(let pfid in profileConfig){
                            let pf = profileConfig[pfid];
                            const jqPFTabContent = $('<div/>',{id:pfid}).insertAfter('#'+topic.tab);
                            midi2Tables.profiles.map(function(pfLookup){
                                if(pfLookup.bank===pf.bank && pfLookup.number===pf.number && pfLookup.interoperability){
                                    common.buildinteroperability(jqPFTabContent,pfLookup.interoperability,{profileLevels:true,level:pf.level});
                                }
                            });
                        }
                    }
                });
                //if(window.isReport)break;

                if(!peSetup && window.settings.pe?.ResourceListRaw){
                    common.setPESetup();
                    peSetup=true;
                }

                common.setProfileSetup();

                common.updateView();
                common.setValues();

                //common.displayProtocols();

                buildMIDIEndpoint();
                common.setValueOnChange();


                if(printMode){
                    $('input').each(function(e) {
                        //$('body').prepend("<div>4</div>");
                        $(this).css('width',($(this).val().length + 1) + 'em');
                    })
                }
                break;
            case 'remoteEndpoint':
                window.settings.remoteEndpoint = xData;
                common.updateView();
                common.setValues();
                buildMIDIEndpoint();
                common.setValueOnChange();
                break;

            case 'interoperabilityAutoTestLog':
                const jqLog = $('<div/>')
                    .appendTo('.interoperabilityAutoTest')
                    .append(xData.msg);
                switch(xData.status){
                    case 'error':
                        jqLog.addClass('text-danger');
                        break;
                    case 'success':
                        jqLog.addClass('text-success');
                        break;
                }
                if(xData.field){
                    const jqField = $('<input>',xData.field).appendTo(jqLog);
                    $("<button/>",{type:"button", class:"btn btn-primary", style:"width: 40px"})
                        .append('<i class="fas fa-arrow-circle-right"></i>').appendTo(jqLog)
                        .data('jqField',jqField)
                        .on('click',function(){
                            const jqField = $(this).data('jqField');
                            jqField.attr('disabled',true);
                            ipcRenderer.send('asynchronous-message', 'interoperabilityTestData',jqField.val());
                        });
                }
                if(xData.proceedCheck) {
                    $("<button/>", {type: "button", class: "btn btn-primary", style: "width: 160px"})
                        .append('Proceed').appendTo(jqLog)
                        .on('click', function () {
                            $(this).attr('disabled', true).off('click');
                            ipcRenderer.send('asynchronous-message', 'interoperabilityTestData', true);
                        });
                }
                if(xData.getConfirm){
                    $("<button/>",{type:"button", class:"btn btn-primary", style:"width: 60px"})
                        .append('Yes').appendTo(jqLog)
                        .on('click',function(){
                            $(this).attr('disabled',true).off('click');
                            $(this).next().attr('disabled',true).off('click');
                            ipcRenderer.send('asynchronous-message', 'interoperabilityTestData',true);
                        });
                    $("<button/>",{type:"button", class:"btn btn-warning", style:"width: 60px"})
                        .append('No').appendTo(jqLog)
                        .on('click',function(){
                            $(this).attr('disabled',true).off('click');
                            $(this).prev().attr('disabled',true).off('click');
                            ipcRenderer.send('asynchronous-message', 'interoperabilityTestData',false);
                        });
                }

                break;

            case 'increaseWarn':{
                if(xData === -1){
                    jqdWarn.text('');
                }else{
                    jqdWarn.text(parseInt(jqdWarn.text() || 0,10)+xData);
                }

                break
            }
            case 'increaseError':{
                if(xData === -1){
                    jqdError.text('');
                }else {
                    jqdError.text(parseInt(jqdError.text() || 0, 10) + 1);
                }
                break
            }
        }
    });

    $('#umpCCVal').on('change',function(e){
        const umpGroup = parseInt($('#umpKeyGr').val()) - 1;
        const ch = parseInt($('#umpKeyCh').val()) - 1;
        const cvm = parseInt($('#umpKeyCVM').val()) ;
        const cc = parseInt($('#umpCCNum').val()) ;
        const val = parseInt($(this).val())

        if(cvm===1){
            let out1 = ((0x02 << 4) + umpGroup) << 24;
            out1 += (0xB0 + ch)<<16;
            out1 += cc<<8;
            out1 += val;
            ipcRenderer.send('asynchronous-message', 'sendUMP',{ump:[out1],...window.ump});
        }else{
            let out1 = ((0x04 << 4) + umpGroup) << 24;
            out1 += (0xB0 + ch)<<16;
            out1 += cc<<8;
            let out2 = t.scaleUp(val,7,32) >>> 0 ;
            ipcRenderer.send('asynchronous-message', 'sendUMP',{ump:[out1,out2],...window.ump});
        }
    });

    $('#umpTesting').on('click.openTab',()=> {
        $('#umpTesting').off('click.openTab');
        setTimeout(()=>{
            const keys = new Nexus.Piano('#pianoKeys', {
                'mode': 'button',  // 'button', 'toggle', or 'impulse'
                'lowNote': 24,
                'highNote': 84
            });

            keys.on('change', function (v) {
                const umpGroup = parseInt($('#umpKeyGr').val()) - 1;
                const ch = parseInt($('#umpKeyCh').val()) - 1;
                const cvm = parseInt($('#umpKeyCVM').val()) ;

                if(cvm===1){
                    let out1 = ((0x02 << 4) + umpGroup) << 24;
                    out1 += ((v.state?0x90:0x80) + ch)<<16;
                    out1 += v.note<<8;
                    out1 += v.state?100:0;
                    ipcRenderer.send('asynchronous-message', 'sendUMP',{ump:[out1],...window.ump});
                }else{
                    let out1 = ((0x04 << 4) + umpGroup) << 24;
                    out1 += ((v.state?0x90:0x80) + ch)<<16;
                    out1 += v.note<<8;
                    let out2 = v.state?(t.scaleUp(100,7,16) << 16) >>> 0 : 0;
                    ipcRenderer.send('asynchronous-message', 'sendUMP',{ump:[out1,out2],...window.ump});
                }


            });
        },200);

    });

    $('#sendraw').on('click',()=>{
        let ump = [];
        for(let i=1; i< 5;i++){
            let v = parseInt($('#ump'+i).val());
            if(!isNaN(v)){
                ump.push(v);
            }
        }
        ipcRenderer.send('asynchronous-message', 'sendUMP',{ump,...window.ump});


    });

    $('#print').on('click',()=>{
       window.print();

    });
    $('#peRefresh').on('click',()=>{
       peSetup=false;
       common.peRefresh();

    });

    $('#profileCapability').on('click',function(){

        //Remove Profile Edit tabs
        $('.pf-test').remove();

       $('#profileOptions tr ').find('td:eq(1)').empty();

        ipcRenderer.send('asynchronous-message', 'profileCapability',window.ump);
    });

    $('.profileControllers').on('click',function(e){
        const ch = parseInt($(this).attr('pfch'),10) -1 ;
        const profileList = ptr.get(window.settings, '/profiles') || [];
       // debugger;
        const CtrlList = [];
        for (let pfid in  profileList){
            const pf = profileList[pfid];
            if(!pf.sourceDestinations[ch]?.active) continue;
            midi2Tables.profiles.map(rawPF=>{
                if(rawPF.bank===pf.bank && rawPF.number===pf.number){
                    //Great Found match
                    CtrlList.push(...rawPF.CtrlList);
                }
            });

        }
        if(!CtrlList.length){
            //TODO Alert no Controllers
            return;
        }
        common.getResourceWithSchemaRef("ChCtrlList").then(([resourceObj,xPassThru])=> {
            common.buildListModal({
                    resource: "ChCtrlList"
                    , resourceObj: resourceObj
                    , resId: null
                    , title: 'Enabled Profile Controller Messages'
                    , channel: ch
                    , umpGroup: 0 //TODO FIX This!
                    , data: CtrlList
                    , cbSelect: function (data) {

                    }
                }
            );
        });


    });

    $('#processInquiryTabMIDIGet').on('click',function(){
        //TODO Get bitmaps
        $('.systemTypesBitmap,.chanContTypeBitmap,.noteDataTypeBitmap').parent().removeClass('bg-success');

        $('#midiReportResults').empty();
        let systemTypesBitmap=0, chanContTypeBitmap=0, noteDataTypeBitmap=0;
        $('.systemTypesBitmap:checked').each(function(){
            systemTypesBitmap+= parseInt($(this).val(),10);
        });
        $('.chanContTypeBitmap:checked').each(function(){
            chanContTypeBitmap+= parseInt($(this).val(),10);
        });
        $('.noteDataTypeBitmap:checked').each(function(){
            noteDataTypeBitmap+= parseInt($(this).val(),10);
        });

        ipcRenderer.send('asynchronous-message', 'processInquiryMIDIGet'
            ,{
                noteDataTypeBitmap:noteDataTypeBitmap,
                chanContTypeBitmap:chanContTypeBitmap,
                systemTypesBitmap:systemTypesBitmap << 7,
                // callbackId:id,
                messageDataControl: parseInt($('#MDdataControl').val(),10) ,
                channel: parseInt($('#MDChannel').val(),10),
                groupToUse: parseInt($('#MDGroup1b').val(),10)-1,
                ...window.ump
            }
        );
    });

    messageType.map((mt,idx)=>{
        if(!mt.title)return;
        $('<option/>',{value:idx})
            .append(mt.title)
            .appendTo('#UBmessagetype');
    });

    $('#UBmessagetype').on('change', function(){
        const jqst = $('#UBstatus').empty()
            .append('<option value="-1">--please choose--</option>');
        const jqbu = $('#buildUMP').empty();

        const mt = parseInt($(this).val(),10);

        if(messageType[mt].statusMSBLSB) {
            $('#UBstatus').prev().text('Status Bank');
        }else{
            $('#UBstatus').prev().text('Status');
        }

        if(mt ===-1){ return;}

        Object.keys(messageType[mt].status).map(status=>{
            $('<option/>',{value:status})
                .append(messageType[mt].status[status].title)
                .appendTo(jqst);
        });
    });
    $('#UBstatus').on('change', function(){
        const jqbu = $('#buildUMP').empty();
        const mt = parseInt($('#UBmessagetype').val(),10);
        const status = parseInt($(this).val(),10);
        if(mt ===-1 || status=== -1){ return;}

        const parts =[];

        if(messageType[mt].statusMSBLSB){

            const jqP = $('<div/>',{class:'form-group status'}).appendTo(jqbu);
            $('<label class="col-form-label">Status</label>').appendTo(jqP);
            const jqstLSB = $('<select/>',{class:"form-control "})
                .appendTo(jqP)
                .append('<option value="-1">--please choose--</option>')
                .on('change',()=>{
                    const statusLSBval = parseInt(jqstLSB.val(),10);
                    jqbu.children().not('.status').remove();
                    (messageType[mt].status[status].status[statusLSBval].parts || []).map(p=>{
                        const jqP = $('<div/>',{class:'form-group'}).appendTo(jqbu);
                        $('<label class="col-form-label">'+p.title+'</label>').appendTo(jqP);
                        parts.push($('<input/>',{type:"number"
                            , class:"form-control "
                        })
                            .appendTo(jqP));
                    });

                    $('<button/>',{class:"form-control",type:'button'}).text("Send")
                        .appendTo(jqbu)
                        .on("click",()=>{

                            const umpGroup = parseInt($('#umpKeyGr').val()) - 1;
                            let ump = [0,0,0,0];
                            ump[0] = (mt<<28) //Message Type
                                + (!messageType[mt].noGroup? umpGroup<< 24: 0 ) //Group
                                + (status << 8)
                                + statusLSBval;
                            (messageType[mt].status[status].status[statusLSBval].parts || []).map((p,idx)=>{
                                const pval = parseInt(parts[idx].val(),10);
                                ump[Math.floor(p.range[1]/32)] += pval << (31 - (p.range[1]%32))
                            });
                            ump = ump.map(u=>u>>>0);
                            ipcRenderer.send('asynchronous-message', 'sendUMP',{ump,...window.ump});


                        });

                });
            Object.keys(messageType[mt].status[status].status).map(statusLSB=>{
                $('<option/>',{value:statusLSB})
                    .append(messageType[mt].status[status].status[statusLSB].title)
                    .appendTo(jqstLSB);
            });
        }

        (messageType[mt].status[status].parts || []).map(p=>{
            const jqP = $('<div/>',{class:'form-group'}).appendTo(jqbu);
            $('<label class="col-form-label">'+p.title+'</label>').appendTo(jqP);
            parts.push($('<input/>',{type:"number"
                , class:"form-control "
                 })
                .appendTo(jqP));
        });
        $('<button/>',{class:"form-control",type:'button'}).text("Send")
            .appendTo(jqbu)
            .on("click",()=>{
                const numofUMP = messageType[mt].bits/32;
                const umpGroup = parseInt($('#umpKeyGr').val()) - 1;
                let ump = [];
                ump[0] = (mt<<28) //Message Type
                    + (!messageType[mt].noGroup? umpGroup<< 24: 0 ) //Group
                    ;
                if(messageType[mt].status8bit){
                    ump[0] += status << 16;
                }else  if(messageType[mt].status10bit){
                    ump[0] += status << 16;
                }else if(messageType[mt].statusMSBLSB){
                    debugger; //Should not hit here
                }else {
                    ump[0] += status << 20;
                }
                if(numofUMP>1){ump[1]=0;}
                if(numofUMP>2){ump[2]=0;}
                if(numofUMP>3){ump[3]=0;}
                (messageType[mt].status[status].parts || []).map((p,idx)=>{
                    const pval = parseInt(parts[idx].val(),10);
                    ump[Math.floor(p.range[1]/32)] += pval << (31 - (p.range[1]%32))
                });
                ump = ump.map(u=>u>>>0);
                ipcRenderer.send('asynchronous-message', 'sendUMP',{ump,...window.ump});


            });



    });

    common.setValueOnChange(ipcRenderer);

    $('#topnav').tab();

});

function buildMIDIEndpoint(){
    const fbDL = ['res','IN','OUT','Both'];
    const jqFBList = $('#FBLIST').empty();
    if(jqFBList.length){
        (settings.remoteEndpoint?.rawFunctionBlocks||[]).map(fb=>{
            if(!fb.fbIdx && fb.fbIdx!==0)return;
            $('<tr/>')
                .appendTo(jqFBList)
                .append('<td>'+fb.fbIdx+'</td>')
                .append('<td>'+fb.name+'</td>')
                .append('<td>'+ (fb.active?'true':'false')+'</td>')
                .append('<td>'+(fb.firstGroup+1)+'</td>')
                .append('<td>'+fb.numberGroups+'</td>')
                .append('<td>'+("0b"+("00" + fb.direction.toString(2)).slice (-2))+' ('+fbDL[fb.direction]+')</td>')
                .append('<td>'+("0x"+("00" + fb.ciVersion.toString(16)).slice (-2).toUpperCase())+'</td>')
                .append('<td>'+("0x"+("00" + fb.isMIDI1.toString(16)).slice (-2).toUpperCase())+'</td>')
                .append('<td>'+(fb.sysex8Streams)+'</td>');
        });
    }

    const jqGBList = $('#GBLIST').empty();
    if(jqGBList.length){
        (settings.remoteEndpoint?.usbDetails?.groupBlocks||[]).map(gb=>{
            $('<tr/>')
                .appendTo(jqGBList)
                .append('<td>'+gb.gbIdx+'</td>')
                .append('<td>'+gb.name+'</td>')
                .append('<td>'+(gb.firstGroup+1)+'</td>')
                .append('<td>'+gb.numberGroups+'</td>')
                .append('<td>'+("0x"+("00" + gb.direction.toString(16)).slice (-2).toUpperCase())
                    +'('+ GBDirection[gb.direction]+')</td>')
                .append('<td>'+("0x"+("00" + gb.protocol.toString(16)).slice (-2).toUpperCase())
                    +'('+ GBprotocol[gb.protocol]+')</td>')
            ;
        });
    }

    const jqUSBEndPointList = $('#usbendpoints').empty();
    if(jqUSBEndPointList.length) {
        (settings.remoteEndpoint?.usbDetails?.descriptor?.endpoints || []).map((ep,idx) => {
            const inGtb =(settings.remoteEndpoint.usbDetails?.descriptor.groupTerminalBlocks?.groupTerminalBlocks||[]).filter(g=>g.bGrpTrmBlkType===0 || g.bGrpTrmBlkType===1)
            const outGtb =(settings.remoteEndpoint.usbDetails?.descriptor.groupTerminalBlocks?.groupTerminalBlocks||[]).filter(g=>g.bGrpTrmBlkType===0 || g.bGrpTrmBlkType===2)

            $('<tr/>')
                .appendTo(jqUSBEndPointList)
                .append('<th colspan="4">Endpoint Descriptor ('+idx+')</th>');

            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bLength</td>')
                .append('<td>'+numToHex(ep.bLength)+'</td>')
                .append('<td>0x07</td>')
                .append('<td>'+ (ep.bLength===7?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bDescriptorType</td>')
                .append('<td>'+numToHex(ep.bDescriptorType)+'</td>')
                .append('<td>ENDPOINT(0x05)</td>')
                .append('<td>'+ (ep.bDescriptorType===5?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bEndpointAddress</td>')
                .append('<td>'
                    +numToBin(ep.bEndpointAddress)
                    +'<br/>dir:'+ (ep.bEndpointAddress >> 7?'IN':'OUT')
                    +'<br/>ep Num:'+ (ep.bEndpointAddress & 0b111)
                    +'</td>')
                .append('<td></td>')
                .append('<td>'+ (ep.bEndpointAddress & 0b01110000?'N':'Y') +'</td>');
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bmAttributes</td>')
                .append('<td>'
                    +numToBin(ep.bmAttributes)
                    +'<br/>sync:'+ (ep.bmAttributes & 0b1100?'':'None')
                    +'<br/>trans. type:'+ (ep.bmAttributes === 0b10? 'Bulk': ep.bmAttributes === 0b11? 'Interrupt':'')
                    +'</td>')
                .append('<td></td>')
                .append('<td>'+ (
                    !(ep.bmAttributes & 0b11110000)
                    && (ep.bmAttributes === 0b10 || ep.bmAttributes === 0b11)
                    && ((ep.bmAttributes & 0x1100) ===0)
                        ?'Y':'N') +'</td>');

            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>wMaxPacketSize</td>')
                .append('<td>'+numToHex(ep.wMaxPacketSize,4)+'</td>')
                .append('<td></td>')
                .append('<td>-</td>');
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bInterval</td>')
                .append('<td>'+numToHex(ep.bInterval)+'</td>')
                .append('<td>'+ (ep.bmAttributes === 0b10? '0x00 if Bulk': ep.bmAttributes === 0b11? '&gt;= 0x01 if Interrupt':'')+ '</td>')
                .append('<td>'+ (
                    (ep.bInterval===0 && ep.bmAttributes === 0b10)
                    || (ep.bInterval>0 && ep.bmAttributes === 0b11)
                        ?'Y':'N') +'</td>');

            $('<tr/>')
                .appendTo(jqUSBEndPointList)
                .append('<th colspan="4">Class Specific Endpoint Descriptor ('+idx+')</th>');
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bLength</td>')
                .append('<td>'+numToHex(ep.extraDetail.bLength)+'</td>')
                .append('<td>0x04 + bNumGrpTrmBlock </td>')
                .append('<td>'+ (ep.extraDetail.bLength===4+ep.extraDetail.bNumGrpTrmBlock?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bDescriptorType</td>')
                .append('<td>'+numToHex(ep.extraDetail.bDescriptorType)+'</td>')
                .append('<td>CS_ENDPOINT(0x25)</td>')
                .append('<td>'+ (ep.extraDetail.bDescriptorType===0x25?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bDescriptorSubType</td>')
                .append('<td>'+numToHex(ep.extraDetail.bDescriptorSubType)+'</td>')
                .append('<td>MS_GENERAL_2_0(0x02)</td>')
                .append('<td>'+ (ep.extraDetail.bDescriptorSubType===0x02?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>bNumGrpTrmBlock</td>')
                .append('<td>'+numToHex(ep.extraDetail.bNumGrpTrmBlock)+'</td>')
                .append('<td></td>')
                .append('<td>'+ (
                    (ep.extraDetail.bNumGrpTrmBlock===inGtb.length && (ep.bEndpointAddress & 0b10000000))
                    ||(ep.extraDetail.bNumGrpTrmBlock===outGtb.length && !(ep.bEndpointAddress & 0b10000000))
                        ?'Y':'N') +'</td>');
            const expectedTRMIds = (ep.bEndpointAddress & 0b10000000? outGtb.map(e=>e.bGrpTrmBlkID).join(', '): inGtb.map(e=>e.bGrpTrmBlkID).join(', '));
            $('<tr/>').appendTo(jqUSBEndPointList)
                .append('<td>baAssoGrpTrmBlkID</td>')
                .append('<td>'+ep.extraDetail.baAssoGrpTrmBlkID.join(', ')+'</td>')
                .append('<td>'
                    + expectedTRMIds
                    + (ep.extraDetail.extrabytes.length? '<br><i>Note: EP has extra unused bytes: '+ ep.extraDetail.extrabytes.join(', ')+'</i>':'')
                    +'</td>')
                .append('<td>'+ (ep.extraDetail.baAssoGrpTrmBlkID.join(', ')===expectedTRMIds?'Y':'N') +'</td>');


        });

        const jqgrptrmblks = $('#grptrmblks').empty();
        $('<tr/>')
            .appendTo(jqgrptrmblks)
            .append('<th colspan="4">Class-Specific Group Terminal Block Descriptors</th>');

        const gb = settings.remoteEndpoint?.usbDetails?.descriptor?.groupTerminalBlocks || {groupTerminalBlocks:[]};
        $('<tr/>').appendTo(jqgrptrmblks)
            .append('<td>bLength</td>')
            .append('<td>'+numToHex(gb.bLength)+'</td>')
            .append('<td>0x05</td>')
            .append('<td>'+ (gb.bLength===5?'Y':'N') +'</td>');
        $('<tr/>').appendTo(jqgrptrmblks)
            .append('<td>bDescriptorType</td>')
            .append('<td>'+numToHex(gb.bDescriptorType)+'</td>')
            .append('<td>CS_GR_TRM_BLOCK(0x26)</td>')
            .append('<td>'+ (gb.bDescriptorType===38?'Y':'N') +'</td>');
        $('<tr/>').appendTo(jqgrptrmblks)
            .append('<td>bDescriptorSubtype</td>')
            .append('<td>'+numToHex(gb.bDescriptorSubtype)+'</td>')
            .append('<td>GR_TRM_BLOCK_HEADER(0x01)</td>')
            .append('<td>'+ (gb.bDescriptorSubtype===1?'Y':'N') +'</td>');
        $('<tr/>').appendTo(jqgrptrmblks)
            .append('<td>wTotalLength</td>')
            .append('<td>'+numToHex(gb.wTotalLength,4)+'</td>')
            .append('<td>5 + (bNumGrpTrmBlock * 13)</td>')
            .append('<td>'+ ((gb.groupTerminalBlocks.length*13) +5 ===gb.wTotalLength?'Y':'N') +'</td>');
        gb.groupTerminalBlocks.map((gtb)=>{
            $('<tr/>')
                .appendTo(jqgrptrmblks)
                .append('<th colspan="4">Group Terminal Block Descriptor ('+ gtb.bGrpTrmBlkID+')</th>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>bLength</td>')
                .append('<td>'+numToHex(gtb.bLength)+'</td>')
                .append('<td>0x0D</td>')
                .append('<td>'+ (gtb.bLength===13?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>bDescriptorType</td>')
                .append('<td>'+numToHex(gtb.bDescriptorType)+'</td>')
                .append('<td>CS_GR_TRM_BLOCK(0x26)</td>')
                .append('<td>'+ (gtb.bDescriptorType===38?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>bDescriptorSubtype</td>')
                .append('<td>'+numToHex(gtb.bDescriptorSubtype)+'</td>')
                .append('<td>GR_TRM_BLOCK(0x02)</td>')
                .append('<td>'+ (gtb.bDescriptorSubtype===2?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>bGrpTrmBlkID</td>')
                .append('<td>'+numToHex(gtb.bGrpTrmBlkID)+'</td>')
                .append('<td></td>')
                .append('<td>-</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>bGrpTrmBlkType</td>')
                .append('<td>'+numToHex(gtb.bGrpTrmBlkType)
                    +'<br/>dir:'
                    +GBDirection[gtb.bGrpTrmBlkType]+'</td>')
                .append('<td></td>')
                .append('<td>'+ (gtb.bGrpTrmBlkType<=2?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>nGroupTrm</td>')
                .append('<td>'+numToHex(gtb.nGroupTrm)+'</td>')
                .append('<td></td>')
                .append('<td>'+ (gtb.nGroupTrm<16?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>nNumGroupTrm</td>')
                .append('<td>'+numToHex(gtb.nNumGroupTrm)+'</td>')
                .append('<td></td>')
                .append('<td>'+ (gtb.nGroupTrm + gtb.nNumGroupTrm <= 16?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>iBlockItem</td>')
                .append('<td>'+numToHex(gtb.iBlockItem)+'</td>')
                .append('<td></td>')
                .append('<td>-</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>bMIDIProtocol</td>')
                .append('<td>'+numToHex(gtb.bMIDIProtocol)
                    +'<br/>proto.:'
                    +GBprotocol[gtb.bMIDIProtocol]+'</td>')
                .append('<td></td>')
                .append('<td>'+ (gtb.bMIDIProtocol<=4 || gtb.bMIDIProtocol===0x11  || gtb.bMIDIProtocol===0x12?'Y':'N') +'</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>wMaxInputBandwidth</td>')
                .append('<td>'+numToHex(gtb.wMaxInputBandwidth,4)+'</td>')
                .append('<td></td>')
                .append('<td>-</td>');
            $('<tr/>').appendTo(jqgrptrmblks)
                .append('<td>wMaxOutputBandwidth</td>')
                .append('<td>'+numToHex(gtb.wMaxOutputBandwidth,4)+'</td>')
                .append('<td></td>')
                .append('<td>-</td>');
        });
    }


}


function numToHex(num=0, length=2){
    return "0x"+(num.toString(16).padStart(length,0)).slice (-1*length).toUpperCase()
}
function numToBin(num=0){
    return "0b"+(num.toString(2).padStart(8,0)).slice (-8).toUpperCase()
}



