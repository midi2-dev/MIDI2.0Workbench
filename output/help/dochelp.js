/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {ipcRenderer} = require('electron');
const commonmark = require('commonmark');
const common = require('../app/common.js');
var fs = require('fs');


let ipccallbacks={};
let ipccallbacksSubs={};

common.setipc(ipcRenderer,ipccallbacks,ipccallbacksSubs);

document.addEventListener('DOMContentLoaded', () => {

    var queryDict = {}
    location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]})

    fs.readFile(__dirname + '/'+queryDict.page+'.md', 'utf-8', (err, data) => {
        if(err)return;
        let desc = common.commonMarkParsing(data);

        const linkRg = /\[\[([^/\]]*)]]/g;
        desc = desc.replaceAll(linkRg,(full , link) => {
            const splitLink = link.split('|');
            return '<a href="dochelp.html?page=' + (splitLink[1] || splitLink[0])+'">'
                + splitLink[0] +'</a>'
        });
        for(let i=1; i < 7; i++){
            const hRg = new RegExp('<h'+i+'>(.*)<\/h'+i+'>','gi');
            desc = desc.replaceAll(hRg,(full , title) => {
                return '<h'+i+' id="'
                    +  title.toLowerCase().replace(/(<([^>]+)>)/g, "")
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '')
                    + '">'+title
                    + '</h'+i+'>';
            });
        }


        $('#main').empty().append(desc);
    });


});

