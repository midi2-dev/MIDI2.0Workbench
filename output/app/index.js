/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');
const common = require('./app/common.js');
const d = require('./../libs/debugger.js');
const path = require("path");
const ipccallbacks={};
const ipccallbacksSubs={};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

let firstLoad = true;

document.addEventListener('DOMContentLoaded', () => {

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
        .on('click',(e)=>{e.stopPropagation();})

    ipcRenderer.on('asynchronous-reply', (event, arg, xData) => {
        //console.log(arg);
        switch (arg) {
            case 'clearMIDICIList':{
                $('#umpDevices').children().not('#manualprojects').remove();
                break;
            }

            case 'removeMUID':{
                $('[data-muid='+xData.muid+']').remove();
                break;
            }
            case 'umpDevRemove': {
                $('[data-umpDev="' + xData.umpDev + '"]').remove();

                break;
            }
            case 'umpDev': {
                createUMPCard(xData.umpDev);
                addUMPDevHead(xData.umpDev,xData.endpoint);
                addUMPDevFBs(xData.umpDev,xData.endpoint.blocks);
                break;
            }



            case 'MIDIDevices':
                //console.log($('#deviceInList,#deviceOutList,#deviceLocalList'));

                window.m1Devices = xData.midiDevices;

                $('.deviceIn,.deviceOut')
                    .empty()
                    .append(
                        '<option value="">-- Select a MIDI connection --</option>'
                    );

                xData.midiDevices.in.map(o=>{
                    $('<option/>',{value:o.inName} )
                        .text(o.inName).appendTo('.deviceIn');


                });
                xData.midiDevices.out.map(name=>{
                    $('<option/>',{value:name} )
                        .text(name).appendTo('.deviceOut');
                });
                common.setValues();
                common.setValueOnChange();

                break;
            case 'configSettings':
                window.configSetting = xData;
                if(!xData.hidehelpPopup && firstLoad){
                    $('#getStarted').modal({show:true});
                    firstLoad = false;
                }
                buildUMPDevice();


                common.setValues();
                common.setValueOnChange();
                common.updateView();
                break;
            case 'alert':
                common.buildModalAlert(xData.msg, xData.type);
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

    ipcRenderer.send('asynchronous-message', 'getConfig');
    ipcRenderer.send('asynchronous-message', 'getMIDIDevices');

    $('#configModal,#m1Modal').on('hidden.bs.modal', function (e) {
        // do something...
        //$('#discoverAllUMPMIDICI').trigger("click");
        ipcRenderer.send('asynchronous-message', 'getAllUMPDevicesFunctionBlocks');
    });

    $('#showAbout').on('click',()=>{
        $('#getStarted').modal({show:true});
    })





    setTimeout(()=>{
        //jqDiscover.trigger('click');
        ipcRenderer.send('asynchronous-message', 'getAllUMPDevicesFunctionBlocks');
        },500);

    $(function () {
        $('[data-tooltip="tooltip"]').tooltip()
    })

});

function buildMIDICIDevice(jqCard, xData){

    let jqGrEntry = jqCard.find('[data-muid="'+xData.muidRemote+'"]');
    if(jqGrEntry.length){
        return;
    }

    const jqMUID = $('<button/>',{"class": 'btn','data-muid': xData.muidRemote})
        .addClass(jqCard.data()['ismidi1']?'btn-info':'btn-success')
        .data('xData', xData)
        .append('MUID : ' + xData.muidRemote)
        .appendTo(jqCard)
        .on('click', e => {
            const xData = $(e.currentTarget).data('xData');
            ipcRenderer.send('asynchronous-message', 'openMIDICI',
                {
                    umpDev:jqCard.parent().parent().data()['umpdev'],
                    fbIdx: jqCard.data()['fbIdx'],
                    muid: xData.muidRemote,
                    group: jqCard.data()['groupstart'],
                    //funcBlock: xData.funcBlock
                }
            );
        });


    let sup = [];
    if(xData.supported){
        if (xData.supported.protocol) {
            sup.push('Protocol Negotiation');
        }
        if (xData.supported.profile) {
            sup.push('Profile Configuration');
        }
        if (xData.supported.pe) {
            sup.push('Property Exchange');
        }
        if (xData.supported.procInq) {
            sup.push('Process Inquiry');
        }
    }

    $('<div/>',{class:'small',style:"line-height: 0.8;"}).append(sup.join('<br/>')).appendTo(jqMUID);

}


function buildUMPDevice(){
    $('#midi1DevicesList').empty();

    window.configSetting.umpVirtualMIDI1.map((vm1,idx)=>{
        const jqSelIn = $("<select/>",{class:'deviceIn form-control','data-path':'/config/umpVirtualMIDI1/'+idx+'/in'})
            .append(
                '<option value="">-- Select a MIDI IN connection --</option>'
            );
        const jqSelOut = $("<select/>",{class:'deviceOut form-control','data-path':'/config/umpVirtualMIDI1/'+idx+'/out'})
            .append(
                '<option value="">-- Select a MIDI Out connection --</option>'
            );

        const jqRow = $('<tr/>').appendTo('#midi1DevicesList');
        const jqGRIn = $('<input/>',{type:"number", min:1, max:16,'data-path':'/config/umpVirtualMIDI1/'+idx+'/group',value:vm1.group,'data-zerobased':true})
            .data('idx',idx)
            .data('vm1',vm1)
            .on('change.checkGroup',function(e){
                const idx = $(this).data('idx');
                const newValue = parseInt($(this).val()) - 1;
                const groupsInUse = window.configSetting.umpVirtualMIDI1
                    .filter((v,i)=>i!==idx).map(v=>v.group);
                if(~groupsInUse.indexOf(newValue)){
                   e.preventDefault();
                   e.stopPropagation();
                   $(this).val(newValue+1).trigger('change');
                }else{
                    $(this).trigger('change.datapath');

                    ipcRenderer.send('asynchronous-message', 'getAllUMPDevicesFunctionBlocks',{resetMUID:true});
                }
            });

        const jqGRName = $('<input/>',
            {'data-path':'/config/umpVirtualMIDI1/'+idx+'/name',value:vm1.name});


        const jqButtonRem = $("<button/>",{type:"button", class:"btn btn-primary"})
            .append('<i class="fas fa-trash"></i>')
            .data('idx',idx)
            .on('click',function(){
                window.configSetting.umpVirtualMIDI1.splice($(this).data('idx'),1);
                common.setConfig('/umpVirtualMIDI1', window.configSetting.umpVirtualMIDI1);
                buildUMPDevice();
            });

        $('<td/>')
            .append(jqGRIn)
            .appendTo(jqRow);
        $('<td/>')
            .append(jqGRName)
            .appendTo(jqRow);
        $('<td/>')
            .append(jqSelIn)
            .appendTo(jqRow);
        $('<td/>')
            .append(jqSelOut)
            .appendTo(jqRow);
        $('<td/>')
            .append(jqButtonRem)
            .appendTo(jqRow);
    });

    const jqRowAdd = $('<tr/>').appendTo('#midi1DevicesList');
    const jqButtonAdd = $("<button/>",{type:"button", class:"btn btn-primary"})
        .append('<i class="fas fa-plus"></i> Add MIDI 1.0 Device')
        .on('click',function(){
            window.configSetting.umpVirtualMIDI1.push({group:0});
            common.setConfig('/umpVirtualMIDI1', window.configSetting.umpVirtualMIDI1);
            buildUMPDevice();
        });
    $('<td/>',{colspan:3})
        .append(jqButtonAdd)
        .appendTo(jqRowAdd);

    const jqButtonRefresh = $("<button/>",{type:"button", class:"btn btn-secondary"})
        .append('Refresh list of available MIDI 1.0 In/Out')
        .on('click',function(){
            ipcRenderer.send('asynchronous-message', 'refreshMIDIDevices');
        });
    $('<td/>',{colspan:2, align:'right'})
        .append(jqButtonRefresh)
        .appendTo(jqRowAdd);

    ipcRenderer.send('asynchronous-message', 'refreshMIDIDevices');
}

function createUMPCard(umpDev){
    const jqMidiCiDevices = $('#umpDevices');
    let jqCard = $('[data-umpDev="' + umpDev + '"]');
    if (!jqCard.length) {
        jqCard = $('<div/>', {
            "class": 'card ml-3',
            'data-umpDev': umpDev
        }).appendTo(jqMidiCiDevices);
        $('<div/>', {"class": 'card-header p-3 '})
            .css({padding: 0})
            // .append('<h3>' + xData.midiOutName + '</h3>')
            // .append('<h4>Initiator MUID: ' + xData.midiOutMuid + '</h4>')
            .appendTo(jqCard);
        const jqBody = $('<div/>', {"class": 'card-body'})
            .css({
                display: 'grid',
                'grid-template-columns': '30px auto',
                'grid-template-rows': 'repeat(16, auto)',
                'grid-column-gap': '2px',
                'grid-row-gap': '2px'
            })
            .appendTo(jqCard);
        $('<div/>', {})
            .css({
                'grid-area': '1/1/1/1',
                margin: 'auto'
            }).text(umpDev==='umpVirtualMIDI1'?'Port':"Grp.")
            .appendTo(jqBody);

        if(umpDev!=='umpVirtualMIDI1'){
            $('<div/>', {})
                .css({
                    'grid-area': '1/2/1/26',
                    margin: 'auto'
                }).text("Blocks")
                .appendTo(jqBody);
        }
        for(let i=1; i<17;i+=1){
            $('<div/>', {})
                .css({
                    'grid-area': (i+1) +'/1/' + (i+1) +'/16',
                    'border-bottom': '1px dashed #ddd',
                    transform: 'translate3d(0, 2px, 0)',
                    'z-index': 1
                })
                .appendTo(jqBody);
        }
        for(let i=1; i<17;i++){
            $('<div/>', {})
                .css({
                    'grid-area': (i+1) +'/1/' + (i+1) +'/1',
                    margin: 'auto'
                }).text(i)
                .appendTo(jqBody);
        }

    }
}
function addUMPDevHead(umpDev,info){
    let jqCardHead = $('[data-umpDev="' + umpDev + '"] > .card-header').empty();

    if(umpDev!=='umpVirtualMIDI1'){
        const jqntitle = $('<b/>').appendTo(jqCardHead);
        $('<button/>',{type:"button"})
            .addClass("btn btn-success btn-sm w-100 pt-0 pb-0")
            .append(info.name)
            .appendTo(jqntitle)
            .on('click', e => {
                ipcRenderer.send('asynchronous-message', 'openMIDIEndpoint',
                    {
                        umpDev,
                        remoteEndpoint: true,
                        umpStream: true
                    }
                );
            });
    }

    if(umpDev==='umpVirtualMIDI1'){
        jqCardHead.append('<b>' + info.name + '</b>');
        jqCardHead.append('<br/>');
        const jqsub = $('<sub/>').appendTo(jqCardHead);
        $('<a/>',{href:'#'})
            .text('Configure')
            .on('click',function(){
                $('#m1Modal')
                    .modal({show:true})
                    .on('hidden.bs.modal', function (e) {
                        $('#m1Modal').modal('dispose');

                    });
            })
            .appendTo(jqsub);
        jqsub.append('  and set-up MIDI 1.0 Devices here.')

    }else if(info.extraText){
        jqCardHead.append('<br/><sub>' + info.extraText + '</sub>');
    }



    $('<a/>',{href:'#'})
        .css({position: 'absolute', bottom: '5px', left:'5px', fontSize:'0.8em'})
        .text('Bridge '+ (configSetting.bridging.indexOf(umpDev)!==-1?`Off`:'On'))
        .on('click',function(){
            if(configSetting.bridging.indexOf(umpDev)!==-1){
                $(this).text('Bridge On');
                ipcRenderer.send('asynchronous-message', 'removeMIDI2Bridge', umpDev );
            }else{
                $(this).text('Bridge Off');
                ipcRenderer.send('asynchronous-message', 'addMIDI2Bridge', umpDev );
            }
        })
        .appendTo(jqCardHead);

}
function addUMPDevFBs(umpDev,FBList){
    let jqBody = $('[data-umpDev="' + umpDev + '"]').find('.card-body');
    jqBody.find('.funcBlock').remove();

    FBList.map((fb,idx)=>{
        let gridPos = 2;
        FBList.slice(0,idx).map((fbo)=>{
            if((fbo.firstGroup) <=  (fb.firstGroup + fb.numberGroups-1)
                && (fbo.firstGroup + fbo.numberGroups-1) >= fb.firstGroup){
                gridPos++;
            }
        });
        const jqFB = $('<div/>', {
                "class": 'border rounded p-1 funcBlock',
//                'data-idx': idx,
                'data-isMIDI1':fb.isMIDI1,
                'data-fbIdx':fb.fbIdx,
                'data-groupStart':fb.firstGroup
            })
            .css({
                'grid-area': (fb.firstGroup +2) +'/'+gridPos+'/' + (fb.firstGroup +2 + fb.numberGroups ) +'/' + (gridPos+1),
                'z-index': 4
            })
            .addClass('border-warning')
            .appendTo(jqBody)
        ;
        if(!fb.active){
            jqFB.css('opacity',0.3);
        }

        const jqName = $('<div/>',{class:'fbName'}).append(fb.name).appendTo(jqFB);
        $('<span/>',{class:'fa fa-sync fa-xs',style:'float:right; opacity:0.6'})
            .appendTo(jqName)
            .on('click',(e)=>{
                $(e.currentTarget).closest('.funcBlock').find("[data-muid]").remove();
                $(e.currentTarget).addClass('fa-spin');

                ipcRenderer.send('asynchronous-message', 'refreshMIDICI',
                    {
                        umpDev:umpDev,
                        group: jqFB.data()['groupstart'],
                        //funcBlock: xData.funcBlock
                    }
                );
                setTimeout(()=>{
                    $(e.currentTarget).removeClass('fa-spin');
                },1000)
            });

        Object.keys(fb.muids||{}).map(muid=>{
            buildMIDICIDevice(jqFB, fb.muids[muid]);
        });
    });
}