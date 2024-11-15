/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');

const common = require('./app/common.js');
const JSONPath = require("JSONPath");
const {prettyPrintJson} = require("pretty-print-json");



//debugger;
window.settings={};
window.configSetting={};
let firstLoad = true;
window.uiWinId = null;
window.isReport = window.location.href.match(/([^\/]*)$/)[1]==="report.html"?1:0;

const ipccallbacks={};
const ipccallbacksSubs={};

let printMode=false;

const BrutusinForms = brutusin["json-forms"];
BrutusinForms.bootstrap.addFormatDecorator("inputstream", "file", "bi-search", null, function (element) {
    alert("user callback on element " + element)
});
BrutusinForms.bootstrap.addFormatDecorator("color", "color");
BrutusinForms.bootstrap.addFormatDecorator("date", "date");
//Title decorator
BrutusinForms.bootstrap.addFormatDecorator(null, null, null, ":");

let schema;
let configData;
let bf;



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

                window.ump = {group:xData.group,umpDev:xData.umpDev,muid:xData.muid,funcBlock:xData.funcBlock, openMIDICI:xData.openMIDICI || false};
                window.uiWinId = xData.uiWinId;



                ipcRenderer.send('asynchronous-message', 'getConfig');
                ipcRenderer.send('asynchronous-message', 'getSettings',window.ump);

                configData = xData.devData;

                launch();

                if(xData.printMode){
                    printMode=true;
                    setTimeout(generateOutput,100);
                    //generateOutput();
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



                common.updateView();
                common.setValues();

                //common.displayProtocols();


                common.setValueOnChange();


                if(printMode){
                    $('input').each(function() {
                        $(this).css('width',($(this).val().length + 1) + 'em');
                    })
                }
                break;
            case 'remoteEndpoint':
                window.settings.remoteEndpoint = xData;
                common.updateView();
                common.setValues();
                common.setValueOnChange();
                break;

        }
    });



    $('#print').on('click',()=>{
       window.print();

    });


    common.setValueOnChange(ipcRenderer);


});




const fetchJson = async (url) => {
    try {
        const data = await fetch(url);
        return await data.json();
    } catch (error) {
        console.log(error);
        return {};
    }
};

function generateForm() {

    let textdata = JSON.stringify(configData);
    $("#jsonAlert").hide();
    try{
        configData = JSON.parse(textdata);
        //$('#formLink').click();
        bf = BrutusinForms.create(schema);

        let container = document.getElementById('container');
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        bf.render(container, configData);

    }catch (e) {

    }

}


async function launch(){
    schema = await fetchJson("./js/configSchema.json");
    //schema = await fetchJson("./20240311_AMEI_checklist_schema.json");
    //configData = await fetchJson("./config.json");

    // codeMirror = new EditorView({
    //     value: JSON.stringify(configData, null, 4),
    //     mode: "javascript",
    //     parent: document.getElementById("data"),
    //     lineNumbers: true
    // });

    generateForm();
}


function generateOutput(){
    if (bf.validate()) {
        configData = bf.getData();

       ipcRenderer.send('asynchronous-message', 'setSetting', {p: '/devData', v: configData,...window.ump});


        $("[data-jsonpath]").each(function () {
            const path = $(this)[0].dataset['jsonpath'].replaceAll("''",'"');
            $(this).empty();
            let val = JSONPath({path: path, json:configData})[0] ;

            const hexinput7 = $(this).hasClass('hexinput7');
            const boolCheck = $(this).hasClass('boolCheck');
            const joinTransport = $(this).hasClass('joinTransport');
            if(val !== undefined){

                if(joinTransport && val){
                    val = JSONPath({path: path, json:configData}).map(o=>{
                        return  JSONPath({path:`$.properties.transports.items.oneOf[?(@.const == "${o}")].title`,json:schema});
                    }).join();
                }

                if(boolCheck && val){
                    val = "Yes";
                }

                if(boolCheck && !val){
                    val = "-";
                }

                if(hexinput7){
                    val = "0x"+("00" + val.toString(16)).slice (-2).toUpperCase();
                }
                $(this).text(val);
            } else  if(boolCheck && !val){
                $(this).text("-");
            }
        });

        $('#ReportOut').click();

        $('#data').empty().append(prettyPrintJson.toHtml(configData, {quoteKeys: true}))


    }
}



