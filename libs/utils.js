const {BrowserWindow} = require("electron");
const {JsonPointer: ptr } = require('json-ptr');
module.exports = {getRandomInt, createPopoupWin, processPacket, sendOutUMPBrokenUp, setRemoteEndpointValueFromMUID};


const startPacket = 0x4D494449; //“MIDI”

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max+1));
}


function createPopoupWin(oOpt){
    const id = Math.random().toString(36).substr(2, 9);
    const editWin = new BrowserWindow({
        parent: oOpt.parentWindow,
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            backgroundThrottling: false,
            autoplayPolicy: 'no-user-gesture-required'
        }
    });
    editWin.setMenuBarVisibility(false);
    //From https://github.com/electron/electron/pull/573
    //Allows for YouTube embeds
    editWin.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({responseHeaders: Object.fromEntries(Object.entries(details.responseHeaders).filter(header => !/x-frame-options/i.test(header[0])))});
    });
    editWin.on('closed', () => {
        if(oOpt.onClose)oOpt.onClose();
        global._editWin = global._editWin.filter(w=>w._id!==editWin._id);
        editWin.destroy()
    });
    if(oOpt.openDebug ) editWin.webContents.openDevTools();

    if(oOpt.finishLoad || oOpt._umpDev) {
        editWin.webContents.on('did-finish-load', () => {
            editWin.webContents.send('asynchronous-reply', 'firstLoad',
                {
                    ...oOpt.finishLoad ||{},
                    ...oOpt._umpDev ||{},
                    uiWinId:id
                }
            );
        });
    }

    if(oOpt.fileToLoad) editWin.loadFile(oOpt.fileToLoad );
    if(oOpt._umpDev) editWin._umpDev = oOpt._umpDev;



    editWin._id = id;
    global._editWin.push(editWin);



    return [id,editWin];
}


function processPacket(msg,oOpts={}){
    let length = msg.length;
    if(!msg.readUInt32BE){
        msg = new DataView(msg.buffer.slice(msg.byteOffset, msg.byteLength + msg.byteOffset));
    }
    let data32Bit;
    let state='startPacket';
    let seqNum=0, payloadLength=0, cCode, stringCharArr=[], stringNonceArr=[];
    let umpArr=[];
    let wordcount = 0;
    let origHeader;
    for(let i=0; i<length;i+=4) {
        data32Bit = msg.readUInt32BE?msg.readUInt32BE(i):msg.getUint32(i);
        switch (state){
            case 'startPacket':
                if(data32Bit===startPacket){
                    state='header1';
                }else{
                    if(oOpts.badPacket)oOpts.badPacket();
                    return; //Bad Packet no 'startPacket'
                }
                break;
            case 'header1':
                origHeader = data32Bit;
                seqNum = data32Bit & 0xFFFF;
                cCode = (data32Bit >>> 24) & 0xFF;
                payloadLength = (data32Bit >> 16) & 0xFF;
                wordcount = 0;
                stringCharArr=[];
                stringNonceArr=[];
                umpArr=[];
                switch (cCode){
                    case 0xFF:
                        state='umpBody';
                        break;
                    case 0x01:
                        state='reqAccessBody';
                        break;
                    case 0x02:
                        state='reqAccessSHABody';
                        break;
                    case 0x03:
                        state='reqAccessUserSHABody';
                        break;

                    case 0x10: //Invitation Reply: Accepted
                        state='invAccepted';
                        if(!payloadLength && oOpts.approved){
                            oOpts.approved('');
                            return;
                        }
                        break;
                    case 0x11://Invitation Reply: Pending
                        state='invPending';
                        if(!payloadLength && oOpts.pending){
                            oOpts.pending('');
                            return;
                        }
                        break;
                    case 0x12: //Invitation Reply: Authentication Required
                        state='reqSHAPasscode';
                        break;
                    case 0x13: //Invitation Reply: User Authentication required
                        state='reqUserSHAPasscode';
                        break;

                    case 0x20:
                        state='pingRequest';
                        break;
                    case 0x21:
                        state='pingResponse';
                        break;

                    case 0x80: //Retransmit
                        state='retransmit';
                        break;
                    case 0x81: //Retransmit Error
                        state='retransmitError';
                        break;
                    case 0x82: //Report
                        state='report';
                        break;

                    case 0x8F: //NAK
                        state='NAK';
                        break;

                    case 0xF0: //BYE End and Remove Endpoint
                        if(!payloadLength && oOpts.bye){
                            oOpts.bye(0,'');
                            return;
                        }
                        state='bye';
                        break;
                    case 0xF1: //byeReply

                        if(!payloadLength && oOpts.byeReply){
                            oOpts.byeReply();
                            return;
                        }
                        break;
                    default:
                        if(oOpts.unknown)oOpts.unknown();
                }
                break;


            case 'reqAccessBody':
            case 'invAccepted':
            case 'invPending':
            case 'bye':
                if ((data32Bit >> 24) & 0xFF) stringCharArr.push((data32Bit >> 24) & 0xFF);
                if ((data32Bit >> 16) & 0xFF) stringCharArr.push((data32Bit >> 16) & 0xFF);
                if ((data32Bit >> 8) & 0xFF) stringCharArr.push((data32Bit >> 8) & 0xFF);
                if (data32Bit & 0xFF) stringCharArr.push(data32Bit & 0xFF);

                if(++wordcount === payloadLength){
                    let name = new TextDecoder().decode(new Uint8Array(stringCharArr));
                    if(state==='reqAccessBody' && oOpts.reqAccess) {
                        oOpts.reqAccess(
                            name
                        );
                    }
                    if(state==='bye' && oOpts.bye) {
                        oOpts.bye(
                            seqNum >> 8 //Reason code
                            ,name //Reason text
                        );
                    }
                    if(state==='invAccepted' && oOpts.approved) {
                        oOpts.approved(name);
                    }
                    if(state==='invPending' && oOpts.pending) {
                        oOpts.pending(name);
                    }
                    if(state==='reqAccessSHABody' && oOpts.reqAccessSHABody) {
                        oOpts.reqAccessSHABody(stringCharArr, origHeader);
                    }
                    return;
                }
                break;
            case 'reqSHAPasscode':
            case 'reqUserSHAPasscode':
                if(wordcount<4) {
                    if ((data32Bit >> 24) & 0xFF) stringNonceArr.push((data32Bit >> 24) & 0xFF);
                    if ((data32Bit >> 16) & 0xFF) stringNonceArr.push((data32Bit >> 16) & 0xFF);
                    if ((data32Bit >> 8) & 0xFF) stringNonceArr.push((data32Bit >> 8) & 0xFF);
                    if (data32Bit & 0xFF) stringNonceArr.push(data32Bit & 0xFF);
                }else{
                    if ((data32Bit >> 24) & 0xFF) stringCharArr.push((data32Bit >> 24) & 0xFF);
                    if ((data32Bit >> 16) & 0xFF) stringCharArr.push((data32Bit >> 16) & 0xFF);
                    if ((data32Bit >> 8) & 0xFF) stringCharArr.push((data32Bit >> 8) & 0xFF);
                    if (data32Bit & 0xFF) stringCharArr.push(data32Bit & 0xFF);
                }

                if(++wordcount === payloadLength){
                    let cryptoNonce = new TextDecoder().decode(new Uint8Array(stringNonceArr));
                    let name = new TextDecoder().decode(new Uint8Array(stringCharArr));
                    if(state==='reqSHAPasscode' && oOpts.reqSHAPasscode) oOpts.reqSHAPasscode(cryptoNonce, origHeader);
                    if(state==='reqUserSHAPasscode' && oOpts.reqUserSHAPasscode) oOpts.reqUserSHAPasscode(cryptoNonce,name, origHeader);
                    return;
                }
                break;

            case 'reqAccessUserSHABody':
            case 'reqAccessSHABody':
                if(wordcount<8) {
                    if ((data32Bit >> 24) & 0xFF) stringNonceArr.push((data32Bit >> 24) & 0xFF);
                    if ((data32Bit >> 16) & 0xFF) stringNonceArr.push((data32Bit >> 16) & 0xFF);
                    if ((data32Bit >> 8) & 0xFF) stringNonceArr.push((data32Bit >> 8) & 0xFF);
                    if (data32Bit & 0xFF) stringNonceArr.push(data32Bit & 0xFF);
                }else{
                    if ((data32Bit >> 24) & 0xFF) stringCharArr.push((data32Bit >> 24) & 0xFF);
                    if ((data32Bit >> 16) & 0xFF) stringCharArr.push((data32Bit >> 16) & 0xFF);
                    if ((data32Bit >> 8) & 0xFF) stringCharArr.push((data32Bit >> 8) & 0xFF);
                    if (data32Bit & 0xFF) stringCharArr.push(data32Bit & 0xFF);
                }

                if(++wordcount === payloadLength){
                    let name = new TextDecoder().decode(new Uint8Array(stringCharArr));
                    if(state==='reqAccessSHABody' && oOpts.reqAccessSHABody) oOpts.reqAccessSHABody(stringNonceArr, origHeader);
                    if(state==='reqAccessUserSHABody' && oOpts.reqAccessUserSHABody) oOpts.reqAccessUserSHABody(stringNonceArr,name, origHeader);
                    return;
                }
                break;

            case 'pingRequest':
                if(oOpts.pingReq)oOpts.pingReq(
                    data32Bit
                );
                break;
            case 'pingResponse':
                if(oOpts.pingRes)oOpts.pingRes(
                    data32Bit
                );
                break;

            case 'NAK':
                if(wordcount<1) {
                    stringNonceArr = data32Bit;
                }else{
                    if ((data32Bit >> 24) & 0xFF) stringCharArr.push((data32Bit >> 24) & 0xFF);
                    if ((data32Bit >> 16) & 0xFF) stringCharArr.push((data32Bit >> 16) & 0xFF);
                    if ((data32Bit >> 8) & 0xFF) stringCharArr.push((data32Bit >> 8) & 0xFF);
                    if (data32Bit & 0xFF) stringCharArr.push(data32Bit & 0xFF);
                }

                if(++wordcount === payloadLength){

                    let error = new TextDecoder().decode(new Uint8Array(stringCharArr));
                    if(state==='NAK' && oOpts.NAK) oOpts.NAK(
                        seqNum >> 8 //reason
                        ,stringNonceArr // Original header
                        ,error
                    );
                    return;
                }
                break;
            case 'report':
                if(state==='report' && oOpts.report)oOpts.report(
                    data32Bit >> 16
                    ,data32Bit &0xFFFF
                );

                break;


            case 'umpBody':
                umpArr.push(data32Bit);
                if(++wordcount === payloadLength){
                    if(oOpts.ump)oOpts.ump(seqNum,umpArr);
                    state='header1'; //Next lot of Packets
                }
                break;
        }
    }
}

async function sendOutUMPBrokenUp(ump,sleep,cb){
    for(let i=0; i<ump.length;i++){
        const mt = ump[i] >>> 28;
        const group = ump[i] >> 24 & 0xF;
        switch (mt) {
            case 0: //32 bits Utility Messages
            case 1: //32 bits Utility Messages
            case 2: //32 bits Utility Messages
            case 6: //32 bits Utility Messages
            case 7: //32 bits Utility Messages
                cb( [ump[i]],group);
                if(sleep)await _sleep(sleep);
                break;
            case 3: //64 bits Utility Messages
            case 4: //64 bits Utility Messages
            case 8: //64 bits Utility Messages
            case 9: //64 bits Utility Messages
            case 0xA: //64 bits Utility Messages
                cb(  [ump[i++],ump[i]],group);
                if(sleep)await _sleep(5);
                break;
            case 0xB: //96 bits Utility Messages
            case 0xC: //96 bits Utility Messages
                cb( [ump[i++],ump[i++], ump[i]],group);
                if(sleep)await _sleep(5);
                break;
            default:
                cb([ump[i++],ump[i++],ump[i++], ump[i]],group);
                if(sleep)await _sleep(5);
                break;

        }
    }
}

function setRemoteEndpointValueFromMUID(muid, path, val, force=false){
    let umpDev = global._midici.remoteDevicesInternal[muid]?.umpDev || global._midiciM1.remoteDevicesInternal[muid]?.umpDev;
    if(!umpDev || !global.umpDevices[umpDev]) return;
    if(force || ptr.get(global.umpDevices[umpDev],path)!==undefined)return;
    ptr.set(global.umpDevices[umpDev],path,val,true);
}


