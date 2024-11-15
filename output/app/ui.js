/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');

const midi2Tables = require('./../libs/midiCITables.js');
const guiBuilder = require('./../libs/guiBuilder.js');
const common = require('./app/common.js');
const {JsonPointer: ptr } = require('json-ptr');

let ipccallbacks={};
let ipccallbacksSubs={};
window.configSetting={};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

let gui,uiData,uiList;
window.gui = gui;
window.uiWinId = null;

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
                if(xData.command==="end"){
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
                break;


            case 'firstLoad':
                let patchUpdates={},timerUp;
                window.ump = {group:xData.group,umpDev:xData.umpDev,muid:xData.muid,funcBlock:xData.funcBlock};
                uiData = xData.dataObj;
                uiList = xData.uiList;
                window.uiWinId = xData.uiWinId;
                gui = new guiBuilder($('#main'), {
                    UIList: uiList,
                    data: uiData,
                    UIStyleList: xData.uiStyleList,
                    CtrlList: xData.ChCtrlList,
                    channelListData:{...xData.channelListData,umpGroup:window.ump.group+1},
                    schemaName:'GUI',//+opts.link.resId+opts.link.data.resId,
                    onFileRequest: function (type, resId, cb) {
                        common.sendPE(0x34, {resource:type, resId:resId})
                            .then(([resHead, resBody, reqHead])=>{
                                cb(resBody);
                            });
                    },
                    buttonClick:function(jq, link,channelListData){
                        common.clickLinkWithRole(jq, link,channelListData);
                    },
                    updateData:function(oUp){
                        if(oUp.path){
                            ptr.set(uiData, oUp.path, oUp.value, true);
                        }

                        if(oUp.ump){
                            //debugger;
                            ipcRenderer.send('asynchronous-message', 'sendUMP',{ump:oUp.ump,...window.ump});
                        }else{
                            //send SET Inquiry instead
                            patchUpdates[oUp.path]=oUp.value;

                            clearTimeout(timerUp);
                            timerUp = setTimeout(function(){
                               if(Object.keys(patchUpdates).length){
                                   const reqSetHead = {
                                        resource:xData.link.resource,
                                        resId:xData.link.resId
                                        , setPartial:true};
                                    common.sendPE(0x36,  reqSetHead,patchUpdates);
                                    patchUpdates={};
                                }
                            },200);
                        }
                    }
                });
                break;
            case 'dataUpdate':

                if(xData.partialOrFull==='full'){
                    uiData=xData.updateBody;
                    gui.updateData(uiData);
                }else{
                    for(let path in xData.patch){
                        ptr.set(uiData, path, xData.patch[path], true);
                        gui.update(path, xData.patch[path]);
                    }
                }
                break;
            case 'uiUpdate':
                if(xData.partialOrFull==='full'){
                    uiList=xData.updateBody;

                }else{
                    for(let path in xData.patch){
                        ptr.set(uiList, path, xData.patch[path], true);
                    }
                }
                gui.rebuild(uiList);
                break;
            case 'configSettings':
                window.configSetting = xData;
                common.setValues();
                common.setValueOnChange();
                break;
        }
    });

    ipcRenderer.send('asynchronous-message', 'getConfig');
});

