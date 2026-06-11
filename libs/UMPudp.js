// ------ UDP MIDI 2 Experimental------
const dgram = require("dgram");
const { createHash } = require('crypto');

const {Bonjour} = require('bonjour-service');
const {removeUMPDevice, addUMPDevice} = require("./umpDevices");
const d = require("./debugger");
const {getRandomInt, processPacket} = require("./utils");
const { networkInterfaces } = require('os');
const {networkMIDICodes} = require("./networkMIDITables");
const {hostname} = require("node:os");

let mdnsAnswers = {};
let mdnsServers = {};

let remoteControlled = {};

const startPacket = 0x4D494449; //“MIDI”

const instance = new Bonjour();

module.exports = {
    setupMIDI2UDPHost,
    removeMIDI2Host,
    search_mDNS,
    connectToHost,
    sendSHAPassToHost,
    disconnectUDPHost,
    connectToHostViaIp,
    sendUMPOut,
    pendingClientAccept,
    pendingClientDeny,
    terminate: () => {
        instance.unpublishAll();
    }
}


//--------------------
//common stuff
//-----------------------
function int16(v) {
    return (v << 16) >> 16;
}

function createUDPMessage(cCode, opts={}/*seq=0,payloadLength = 0, data = null, fec=null*/){
    let mType = networkMIDICodes[cCode];
    let buff = [];

    const writeWord = (w,a)=>{
        a.push((w>>24)&0xFF);
        a.push((w>>16)&0xFF);
        a.push((w>>8)&0xFF);
        a.push(w&0xFF);
    }

    writeWord(startPacket,buff);

    if(!mType){
        return;
    }

    if(cCode === 0xFF){
        //add FEC
        if(opts.fec && opts.fec.length){
            opts.fec.slice(-2).map(f=>{
                buff.push(...f);
            });

        }
    }
    let msg =[];
    opts.cCode = cCode;
    mType.bytes.map(d=> {
        let v = opts[d.key] || 0;
        if (d.valOut) {
            v = d.valOut(opts);
        }

        if (d.key === 'pl') {
            v = 0;
            mType.bytes.map(dl => {
                if (dl.type === 'text') {
                    v += Math.ceil((opts[dl.key] || "").length / 4) * 4;
                } else if (dl.type === 'wordArray') {
                    v += (opts[dl.key] || []).length*4;
                } else {
                    v += dl.length;
                }
            });
            v /= 4;
            v--;
        }

        if (d.key === 'epNameLength') {
            v = 0;
            mType.bytes.map(dl => {
                if (dl.type === 'text' && dl.key==-'epName') {
                    v += Math.ceil((opts[dl.key] || "").length / 4) * 4;
                }
            });
            v /= 4;
        }

        let length = d.length;

        switch (d.type) {
            case 'text':
                length = Math.ceil((v || "").length / 4) * 4;
                v = (v || "").padEnd(length * 4, '\0').split('');
                break;
            case 'wordArray': {
                let vc = v;
                v = [];
                for (let i = 0; i < vc.length; i++){
                    writeWord(vc[i],v);
                }
                length = vc.length*4;
                break;
            }
            case 'array':
                break;
            default: {
                let vc = v;
                v = [];
                for (let i = 0; i < length; i++)
                    v[i] = (vc >> ((length - i - 1) * 8)) & 0xFF;
                break;
            }
        }

        for(let i=0;i<length;i++){
            msg.push(v[i] & 0xFF);
        }
    });

    return [
        new Uint8Array([...buff,...msg]),
        [...(opts.fec||[]).slice(-2),msg]
    ];

}


//---------------------

function pendingClientAccept(umpDev, id){
    const epName = global.umpDevices[umpDev].name;
    const prodInstId = global.umpDevices[umpDev].remoteEndpoint.prodInstId ? global.umpDevices[umpDev].remoteEndpoint.prodInstId : global.configSetting.productInstanceId;

    if(mdnsServers[umpDev]._currentRemoteDevices[id].waitingApproval){
        mdnsServers[umpDev]._currentRemoteDevices[id].approved = true;
        setUpHostPing(umpDev, id);
        let [buf, fec] = createUDPMessage(0x10, {epName,prodInstId});


        mdnsServers[umpDev].send(buf,
            mdnsServers[umpDev]._currentRemoteDevices[id].port,
            mdnsServers[umpDev]._currentRemoteDevices[id].address);
//console.log("reqAccess Reply:"+ buf.join());
//d.msg('udp',buf,'out',umpDev);
        mdnsServers[umpDev].createDebug(buf, 'out', id);
    }
}

function pendingClientDeny(umpDev, id){

    if(mdnsServers[umpDev]._currentRemoteDevices[id]?.waitingApproval){
        mdnsServers[umpDev]._currentRemoteDevices[id].approved = true;
        setUpHostPing(umpDev, id);
        const [buf, fec] = createUDPMessage(0xF0, {reason:0x42});


        mdnsServers[umpDev].send(buf,
            mdnsServers[umpDev]._currentRemoteDevices[id].port,
            mdnsServers[umpDev]._currentRemoteDevices[id].address);
        mdnsServers[umpDev].createDebug(buf, 'out', id);

        delete mdnsServers[umpDev]._currentRemoteDevices[id];
    }
}

function setUpHostPing(umpDev, id){
    if ((typeof mdnsServers[umpDev] === 'undefined')
        || (typeof mdnsServers[umpDev]._currentRemoteDevices[id] === 'undefined')
        || mdnsServers[umpDev]._currentRemoteDevices[id]._checkTimer

    ){
        // TODO: kill timer
        return;
    }

    mdnsServers[umpDev]._currentRemoteDevices[id]._lastPingError=0;
    mdnsServers[umpDev]._currentRemoteDevices[id]._lastPingOk=true;
    mdnsServers[umpDev]._currentRemoteDevices[id]._pingAccepted = false;
    mdnsServers[umpDev]._currentRemoteDevices[id]._checkTimer = setInterval(()=>{
        if ((typeof mdnsServers[umpDev] === 'undefined')
            || (typeof mdnsServers[umpDev]._currentRemoteDevices[id] === 'undefined')){
            // TODO: kill timer
            return;
        }

        if(/*mdnsServers[umpDev]._currentRemoteDevices[id]._pingAccepted &&*/ mdnsServers[umpDev]._currentRemoteDevices[id]._lastPingError >= 3){
            mdnsServers[umpDev].removeClient(id,0x42);
            return;
        }

        if(!mdnsServers[umpDev]._currentRemoteDevices[id]._lastPingOk){
            mdnsServers[umpDev]._currentRemoteDevices[id]._lastPingError++;
        }
        mdnsServers[umpDev]._currentRemoteDevices[id]._lastPingOk = false;

        mdnsServers[umpDev]._currentRemoteDevices[id]._lastPing =  getRandomInt(0xFFFFFFFF);
        const [buf, fec] = createUDPMessage(0x20,{pingId:mdnsServers[umpDev]._currentRemoteDevices[id]._lastPing});

       mdnsServers[umpDev].send(buf,
           mdnsServers[umpDev]._currentRemoteDevices[id].port,
           mdnsServers[umpDev]._currentRemoteDevices[id].address);

       //d.msg('udp',buf,'out',umpDev);
        mdnsServers[umpDev].createDebug(buf, 'out', id);
    },10000);
}

function setupMIDI2UDPHost(umpDev){
    const epName = global.umpDevices[umpDev].name;
    // TODO: check why remoteEndpoint.prodInstId is not set. Also, if that should really be the "remote" id.
    const prodInstId = global.umpDevices[umpDev].remoteEndpoint.prodInstId ? global.umpDevices[umpDev].remoteEndpoint.prodInstId : global.configSetting.productInstanceId;
    if(global.umpDevices[umpDev].udpServer){
        return;
    }else{
        global.umpDevices[umpDev].udpServer = true;
    }
    global.umpDevices[umpDev].sendUMPOutNetwork = sendUMPOut;
    mdnsServers[umpDev] = dgram.createSocket('udp6');
    mdnsServers[umpDev]._currentRemoteDevices = {};

    mdnsServers[umpDev].on('error', (err) => {
        removeMIDI2Host(umpDev);
    });

    mdnsServers[umpDev].createDebug = (buf, dir, id)=>{
        let info ='';
        if(dir==='in'){
            info = `${id} -> ${mdnsServers[umpDev].address().address}:${mdnsAnswers[umpDev].port} (${global.umpDevices[umpDev].name})`;
        }else{
            info = `${mdnsServers[umpDev].address().address}:${mdnsAnswers[umpDev].port} (${global.umpDevices[umpDev].name}) -> ${id}`;
        }
        d.msg('udp',buf,dir ,info);
    };


    mdnsServers[umpDev].removeClient = (id,reasonCode)=>{
        if(!mdnsServers[umpDev]._currentRemoteDevices[id]){
            return;
        }

        clearInterval(mdnsServers[umpDev]._currentRemoteDevices[id]._checkTimer);

        const [buf, fec] = createUDPMessage(0xF0, {reason:reasonCode});

        mdnsServers[umpDev].send(buf,
            mdnsServers[umpDev]._currentRemoteDevices[id].port,
            mdnsServers[umpDev]._currentRemoteDevices[id].address);

        //d.msg('udp',buf,'out',umpDev);
        mdnsServers[umpDev].createDebug(buf, 'out', id);

        delete mdnsServers[umpDev]._currentRemoteDevices[id];
    };

    mdnsServers[umpDev].on('message', (msg, rinfo) => {
        //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

        const id = `${rinfo.address}:${rinfo.port}`;

        //d.msg('udp',msg,'in',id);
        mdnsServers[umpDev].createDebug(msg, 'in', id);

        processPacket(msg,{
            sessionReset:() =>{
                mdnsServers[umpDev]._currentRemoteDevices[id].remoteSeq = 0;
                mdnsServers[umpDev]._currentRemoteDevices[id].seq = 0;
                mdnsServers[umpDev]._currentRemoteDevices[id].fec = [];

                let [buf, fec] = createUDPMessage(0x83);
                mdnsServers[umpDev].send(buf,
                    mdnsServers[umpDev]._currentRemoteDevices[id].port,
                    mdnsServers[umpDev]._currentRemoteDevices[id].address);

                mdnsServers[umpDev].createDebug(buf, 'out', id);
            },
            sessionResetReply:() =>{
                mdnsServers[umpDev]._currentRemoteDevices[id].remoteSeq = 0;
                mdnsServers[umpDev]._currentRemoteDevices[id].seq = 0;
                mdnsServers[umpDev]._currentRemoteDevices[id].fec = [];
            },
            bye:()=>{
                // Send case 0xF1 Bye Reply
                if(!mdnsServers[umpDev]._currentRemoteDevices[id])return;
                let [buf, fec] = createUDPMessage(0xF1);
                mdnsServers[umpDev].send(buf,
                    mdnsServers[umpDev]._currentRemoteDevices[id].port,
                    mdnsServers[umpDev]._currentRemoteDevices[id].address);

                //d.msg('udp',buf,'out',umpDev);
                mdnsServers[umpDev].createDebug(buf, 'out', id);

                delete mdnsServers[umpDev]._currentRemoteDevices[id];
            },
            pingReq:(pingId)=>{
                //if(!mdnsServers[umpDev]._currentRemoteDevices[id])return;
                let [buf, fec] = createUDPMessage(0x21,{pingId});
                mdnsServers[umpDev].send(buf,
                    rinfo.port,
                    rinfo.address);
                //console.log("ping Reply:"+ buf.join());
                //d.msg('udp',buf,'out',umpDev);
                mdnsServers[umpDev].createDebug(buf, 'out', id);

            },

            pingRes:(pingId)=>{
                if(!mdnsServers[umpDev]._currentRemoteDevices[id])return
                mdnsServers[umpDev]._currentRemoteDevices[id]._pingAccepted=true;
                if(mdnsServers[umpDev]._currentRemoteDevices[id]._lastPing===pingId) {
                    mdnsServers[umpDev]._currentRemoteDevices[id]._lastPingOk = true;
                    mdnsServers[umpDev]._currentRemoteDevices[id]._lastPingError=0;
                }else {
                    // send NAK 0x21
                    let [buf, fec] = createUDPMessage(0x8F,{reason:0x21});
                    mdnsServers[umpDev].send(buf,
                        mdnsServers[umpDev]._currentRemoteDevices[id].port,
                        mdnsServers[umpDev]._currentRemoteDevices[id].address);
                    mdnsServers[umpDev].createDebug(buf, 'out', id);
                }
            },

            reqAccessUserSHABody: (stringNonceArr,user, origHeader) =>{
                const sha256 = createHash('sha256')
                    .update(mdnsServers[umpDev]._currentRemoteDevices[id].tempEncrypt
                        +global.configSetting.umpUDP.username
                        +global.configSetting.umpUDP.passcode
                    )
                    .digest();
                let buf;
                //let sha256Check = new TextDecoder().decode(new Uint8Array(stringNonceArr));
                if (!Buffer.compare(Buffer.from(stringNonceArr), sha256) && user === global.configSetting.umpUDP.username){
                    mdnsServers[umpDev]._currentRemoteDevices[id].approved = true;
                    setUpHostPing(umpDev, id);
                    [buf, ] = createUDPMessage(0x10, {epName,prodInstId});
                }else if(mdnsServers[umpDev]._currentRemoteDevices[id].attempts>3) {
                    [buf, ] = createUDPMessage(0xF0,{reason:0x43});
                }else{
                    //Send auth again and new bitmap
                    [buf, ] = createUDPMessage(0x13, {
                        epName,prodInstId,
                        cryptoNonce: mdnsServers[umpDev]._currentRemoteDevices[id].tempEncrypt,
                        resend:
                            user !== global.configSetting.umpUDP.username ? 0x01 : 0x02,
                    });
                    mdnsServers[umpDev]._currentRemoteDevices[id].attempts++;
                }

                mdnsServers[umpDev].send(buf,
                    mdnsServers[umpDev]._currentRemoteDevices[id].port,
                    mdnsServers[umpDev]._currentRemoteDevices[id].address);
                //d.msg('udp',buf,'out',umpDev);
                mdnsServers[umpDev].createDebug(buf, 'out', id);

            },

            reqAccessSHABody: (stringNonceArr, origHeader) =>{
                const sha256 = createHash('sha256')
                    .update(mdnsServers[umpDev]._currentRemoteDevices[id].tempEncrypt+global.configSetting.umpUDP.passcode)
                    .digest();
                let buf;
                //let sha256Check = new TextDecoder().decode(new Uint8Array(stringNonceArr));
                if (!Buffer.compare(Buffer.from(stringNonceArr), sha256)){
                    mdnsServers[umpDev]._currentRemoteDevices[id].approved = true;
                    setUpHostPing(umpDev, id);
                    [buf, ] = createUDPMessage(0x10, {epName,prodInstId});
                }else if(mdnsServers[umpDev]._currentRemoteDevices[id].attempts>3) {
                    [buf, ] = createUDPMessage(0xF0,{reason:0x43});
                }else{
                    //Send auth again and new bitmap
                    [buf, ] = createUDPMessage(0x12, {
                        cryptoNonce: mdnsServers[umpDev]._currentRemoteDevices[id].tempEncrypt,
                        resend: 0x01,
                        epName,prodInstId
                    });
                    mdnsServers[umpDev]._currentRemoteDevices[id].attempts++;
                }

                mdnsServers[umpDev].send(buf,
                    mdnsServers[umpDev]._currentRemoteDevices[id].port,
                    mdnsServers[umpDev]._currentRemoteDevices[id].address);
                //d.msg('udp',buf,'out',umpDev);
                mdnsServers[umpDev].createDebug(buf, 'out', id);


            },
            reqAccess: (clientName, productInstId, authOpt) => {
                if(mdnsServers[umpDev]._currentRemoteDevices[id])return;
                mdnsServers[umpDev]._currentRemoteDevices[id] = {
                    ...rinfo,
                    epName: clientName,
                    productInstId: productInstId,
                    remoteSeq: -1,
                    seq:0
                };
                let buf;
                let authMethod = (configSetting.umpUDP||{}).authMethod;
                if(authMethod==='sha256' && (authOpt & 0b1)){
                    mdnsServers[umpDev]._currentRemoteDevices[id].tempEncrypt = Math.random().toString(16).substr(2, 8) +  Math.random().toString(16).substr(2, 8);
                    mdnsServers[umpDev]._currentRemoteDevices[id].attempts=0;
                    [buf, ] = createUDPMessage(0x12, {epName, prodInstId, cryptoNonce: mdnsServers[umpDev]._currentRemoteDevices[id].tempEncrypt});
                }
                else if(authMethod==='userAuth' && (authOpt & 0b10)){
                    mdnsServers[umpDev]._currentRemoteDevices[id].tempEncrypt = Math.random().toString(16).substr(2, 8) +  Math.random().toString(16).substr(2, 8);
                    mdnsServers[umpDev]._currentRemoteDevices[id].attempts=0;
                    [buf, ] = createUDPMessage(0x13, {epName, prodInstId, cryptoNonce: mdnsServers[umpDev]._currentRemoteDevices[id].tempEncrypt});

                }
                else if(authMethod === "pending"){
                    //Send Pending Notification to Index Window

                    mdnsServers[umpDev]._currentRemoteDevices[id].waitingApproval = true;
                    //setUpHostPing(umpDev, id);
                    [buf, ] = createUDPMessage(0x11, {epName,prodInstId});

                    mdnsServers[umpDev]._currentRemoteDevices[id].connectTo = `${epName}`;
                    mdnsServers[umpDev]._currentRemoteDevices[id].umpDev = umpDev;
                    mdnsServers[umpDev]._currentRemoteDevices[id].id = id;

                    global.indexWindow.webContents.send('asynchronous-reply', 'udpPendingAuthCheck', mdnsServers[umpDev]._currentRemoteDevices[id]);


                }else{
                    mdnsServers[umpDev]._currentRemoteDevices[id].approved = true;
                    setUpHostPing(umpDev, id);
                    [buf, ] = createUDPMessage(0x10, {epName,prodInstId});
                }

                mdnsServers[umpDev].send(buf,
                    mdnsServers[umpDev]._currentRemoteDevices[id].port,
                    mdnsServers[umpDev]._currentRemoteDevices[id].address);
                //console.log("reqAccess Reply:"+ buf.join());
                //d.msg('udp',buf,'out',umpDev);
                mdnsServers[umpDev].createDebug(buf, 'out', id);

            },
            NAK: (reason, originalHeader, error) =>{
                if(reason===0x01 && ((originalHeader>>> 24) & 0xFF)===0x80){
                    if(!mdnsServers[umpDev]._currentRemoteDevices[id])return;
                    let [buf, ] = createUDPMessage(0x82);
                    mdnsServers[umpDev].send(buf,
                        mdnsServers[umpDev]._currentRemoteDevices[id].port,
                        mdnsServers[umpDev]._currentRemoteDevices[id].address);
                    mdnsServers[umpDev].createDebug(buf, 'out', id);
                    mdnsServers[umpDev]._currentRemoteDevices[id].retransmitNotSupported=true;
                }
            },
            retransmit: (seq, numToRetranmit, origHeader)=>{
                if(!mdnsServers[umpDev]._currentRemoteDevices[id])return;
                //let buf = createUDPMessage(0x81,{seq, reason:0x01});
                let [buf, ] = createUDPMessage(0x8F,{reason: 0x01, nakHeader:origHeader});
                mdnsServers[umpDev].send(buf,
                    mdnsServers[umpDev]._currentRemoteDevices[id].port,
                    mdnsServers[umpDev]._currentRemoteDevices[id].address);
                mdnsServers[umpDev].createDebug(buf, 'out', id);
            },
            retransmitError:(error, oldestSeqNum) => {
                if(!mdnsServers[umpDev]._currentRemoteDevices[id])return;
                let [buf, ] = createUDPMessage(0x82);
                mdnsServers[umpDev].send(buf,
                    mdnsServers[umpDev]._currentRemoteDevices[id].port,
                    mdnsServers[umpDev]._currentRemoteDevices[id].address);
                mdnsServers[umpDev].createDebug(buf, 'out', id);
            },
            ump: (seqNum,umpArr) => {
                if(!mdnsServers[umpDev]._currentRemoteDevices[id])return;

                clearTimeout(mdnsServers[umpDev]._currentRemoteDevices[id]._umpErrorTimer);
                let diffSeq = int16(seqNum - mdnsServers[umpDev]._currentRemoteDevices[id].remoteSeq);

                if(!mdnsServers[umpDev]._currentRemoteDevices[id].approved) {
                    //UMP before Session started
                    let [buf, ] = createUDPMessage(0x8F, {reason: 0x21, nakHeader: 0x10});
                    mdnsServers[umpDev].send(buf,
                        mdnsServers[umpDev]._currentRemoteDevices[id].port,
                        mdnsServers[umpDev]._currentRemoteDevices[id].address);
                    mdnsServers[umpDev].createDebug(buf, 'out', id);
                }else if (diffSeq === 1) {
                    //console.log(`--Seq# ${seqNum}`);
                    if(umpArr.length && global.umpDevices[umpDev])global.umpDevices[umpDev].midiOutFunc(umpDev,umpArr,true);
                    mdnsServers[umpDev]._currentRemoteDevices[id].remoteSeq = seqNum;
                    //console.log(`--Finished Seq# ${seqNum}`);
                    // if(seqNum===0xFFFF){
                    //     mdnsServers[umpDev]._currentRemoteDevices[id].remoteSeq = seqNum;
                    // }
                }else if (diffSeq > 1) {
                    let buf;
                    if(mdnsServers[umpDev]._currentRemoteDevices[id].retransmitNotSupported){
                        [buf, ] = createUDPMessage(0x82); //Go Straight to Session Reset
                    }else{
                        [buf, ] = createUDPMessage(0x80,{seq:mdnsServers[umpDev]._currentRemoteDevices[id].remoteSeq});
                    }
                    mdnsServers[umpDev]._currentRemoteDevices[id]._umpErrorTimer = setTimeout(()=>{
                        mdnsServers[umpDev].send(buf,
                            mdnsServers[umpDev]._currentRemoteDevices[id].port,
                            mdnsServers[umpDev]._currentRemoteDevices[id].address);
                        mdnsServers[umpDev].createDebug(buf, 'out', id);
                    },20);

                }
            }
        });
    });

    mdnsServers[umpDev].on('listening', () => {
        const address = mdnsServers[umpDev].address();
        console.log(`server listening ${mdnsServers[umpDev].addrDisplay}:${address.port}`);
        global.umpDevices[umpDev].udpServer = `${mdnsServers[umpDev].addrDisplay}:${address.port}`;
        let authSupported = 'noAuth';
        let authMethod = (configSetting.umpUDP||{}).authMethod;
        if(authMethod === 'sha256') authSupported = 'auth';
        if(authMethod === 'userAuth') authSupported = 'userAuth';

        mdnsAnswers[umpDev] = instance.publish({
            name: umpDev+global.configSetting.productInstanceId,
            type: 'midi2',
            protocol: 'udp',
            address: address.address,
            port: address.port,
            host: hostname()+'.local',
            ttl:60,
            txt: {
                UMPEndpointName: epName,
                ProductInstanceId: global.configSetting.productInstanceId,
                roles: ['remoteControlled','host','client'].join(','),
                authSupported
            }
        });

        mdnsAnswers[umpDev].start();
        if (global.indexWindow && global.umpDevices[umpDev].display()) {
            global.umpDevices[umpDev].remoteEndpoint.udpServer = global.umpDevices[umpDev].udpServer;
            global.indexWindow.webContents.send('asynchronous-reply',
                'umpDev', {umpDev, endpoint: global.umpDevices[umpDev].remoteEndpoint});
        }
    });
    mdnsServers[umpDev].addrDisplay =  [].concat(...Object.values(networkInterfaces())).filter(n=>!n.internal && (n.family==='IPv4' || n.family ===4)).map(n=>n.address)[0] ;
    mdnsServers[umpDev].bind({address:'::'});

}

function removeMIDI2Host(umpDev){

    if(!mdnsServers[umpDev]){
        delete mdnsServers[umpDev];
        if(mdnsAnswers[umpDev]){
            mdnsAnswers[umpDev].stop(()=>{
                delete mdnsAnswers[umpDev];
            });
        }

        delete global.umpDevices[umpDev].udpServer;
        if (global.indexWindow && global.umpDevices[umpDev].display()) {
            global.umpDevices[umpDev].remoteEndpoint.udpServer = global.umpDevices[umpDev].udpServer;
            global.indexWindow.webContents.send('asynchronous-reply',
                'umpDev', {umpDev, endpoint: global.umpDevices[umpDev].remoteEndpoint});
        }
        return;
    }

    Object.keys(mdnsServers[umpDev]._currentRemoteDevices || []).map(id=> {
        const [buf, ] = createUDPMessage(0xF0);

        mdnsServers[umpDev].send(buf,
            mdnsServers[umpDev]._currentRemoteDevices[id].port,
            mdnsServers[umpDev]._currentRemoteDevices[id].address
        );
        console.log("BYE:"+ buf.join());
        //d.msg('udp',buf,'out',mdnsServers[umpDev]._currentRemoteDevices[id].address+':'+mdnsServers[umpDev]._currentRemoteDevices[id].port);
        mdnsServers[umpDev].createDebug(buf, 'out', id);
    });

    setTimeout(()=>{
        mdnsServers[umpDev].close();
        delete mdnsServers[umpDev];
        mdnsAnswers[umpDev].stop(()=>{
            delete mdnsAnswers[umpDev];
        });
        delete global.umpDevices[umpDev].udpServer;
        if (global.indexWindow && global.umpDevices[umpDev].display()) {
            global.umpDevices[umpDev].remoteEndpoint.udpServer = global.umpDevices[umpDev].udpServer;
            global.indexWindow.webContents.send('asynchronous-reply',
                'umpDev', {umpDev, endpoint: global.umpDevices[umpDev].remoteEndpoint});
        }
    },500);


}

function sendUMPOut(umpDev,umpOut){
    if(!mdnsServers[umpDev])return;

    Object.keys(mdnsServers[umpDev]._currentRemoteDevices).map(id=>{
        if(!mdnsServers[umpDev]._currentRemoteDevices[id].approved
        || mdnsServers[umpDev]._currentRemoteDevices[id].seq === undefined
        )return;

        let sendUMP = (ump)=> {
            let [buf, fec] = createUDPMessage(0xFF, {
                seq: int16(mdnsServers[umpDev]._currentRemoteDevices[id].seq++),
                ump,
                fec: mdnsServers[umpDev]._currentRemoteDevices[id].fec || []
            });

            mdnsServers[umpDev]._currentRemoteDevices[id].fec = fec;

            mdnsServers[umpDev].send(buf,
                mdnsServers[umpDev]._currentRemoteDevices[id].port,
                mdnsServers[umpDev]._currentRemoteDevices[id].address
            );
            //d.msg('udp',buf,'out',umpDev);
            mdnsServers[umpDev].createDebug(buf, 'out', id);
        }

        sendUMP(umpOut);

        clearTimeout(mdnsServers[umpDev]._currentRemoteDevices[id].emptyUMP);
        mdnsServers[umpDev]._currentRemoteDevices[id].emptyUMP = setTimeout(()=>{
            sendUMP([]);
            mdnsServers[umpDev]._currentRemoteDevices[id].emptyUMP = setTimeout(()=>{
                sendUMP([]);
                // mdnsServers[umpDev]._currentRemoteDevices[id].emptyUMP = setTimeout(()=>{
                //     sendUMP([]);
                // },600);
            },300);
        },200);


    });
}


//*************************** CLIENT STUFF
let mdnsRemoteAnswers = {};
let mdnsRemoteAnswersClients = {};

function clientCreateDebug(buf, dir, id){
    let info ='';
    let ipPort = `${mdnsRemoteAnswers[id].addresses[0]}:${mdnsRemoteAnswers[id].port}`;
    if(dir==='in'){
        info = `${ipPort} -> ${mdnsRemoteAnswersClients[id]._address.address}:${mdnsRemoteAnswersClients[id]._address .port} `;
    }else{
        info = `${mdnsRemoteAnswersClients[id]._address .address}:${mdnsRemoteAnswersClients[id]._address.port}  -> ${ipPort}`;
    }
    d.msg('udp',buf,dir ,info);
}

function disconnectUDPHost(id, reasonCode = 0x00){
    if(!mdnsRemoteAnswers[id] || mdnsRemoteAnswers[id].client){
        return;
    }
    if( mdnsRemoteAnswersClients[id]) {
        clearTimeout(mdnsRemoteAnswersClients[id]._checkTimer);
        const [buf, ] = createUDPMessage(0xF0, {reason:reasonCode});
        mdnsRemoteAnswersClients[id].send(buf, mdnsRemoteAnswers[id].port
            , mdnsRemoteAnswers[id].addresses[0]);
        //d.msg('udp',buf,'out',mdnsRemoteAnswers[id].addresses[0]+':'+mdnsRemoteAnswers[id].port);
        clientCreateDebug(buf, 'out', id);

        mdnsRemoteAnswersClients[id].byeReplyCheck = setTimeout(()=>{
            mdnsRemoteAnswersClients[id].send(buf, mdnsRemoteAnswers[id].port
                , mdnsRemoteAnswers[id].addresses[0]);
            mdnsRemoteAnswersClients[id].byeReplyCheck = setTimeout(()=>{
                mdnsRemoteAnswersClients[id].send(buf, mdnsRemoteAnswers[id].port
                    , mdnsRemoteAnswers[id].addresses[0]);
            },300);
        },200);

    }

    setTimeout(cleanupUDPHost,3000,id);

}

function cleanupUDPHost(id){
    if( mdnsRemoteAnswersClients[id]) {
        mdnsRemoteAnswersClients[id].close();
        delete mdnsRemoteAnswersClients[id];

    mdnsRemoteAnswers[id].access = false;
    mdnsRemoteAnswers[id].state = false;
    removeUMPDevice(id);
    global.configSetting.mdnsRemoteAnswers = mdnsRemoteAnswers;
    global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);
    }
}

function connectToHostViaIp(opts){
    const id = opts.ip+':'+opts.port;

    if(mdnsRemoteAnswers[id]){
        disconnectUDPHost(id,0x80);
    }

    if(!mdnsRemoteAnswers[id]){
        mdnsRemoteAnswers[id] = {
            directConnect: true,
            addresses:[opts.ip],
            port: parseInt(opts.port,10),
            data:{
                target:opts.ip,
                port:parseInt(opts.port,10)
            }
        }
    }

    connectToHost(id);

}

function sendSHAPassToHost(id, pass, username = null){
    if(!mdnsRemoteAnswers[id] ||
        (mdnsRemoteAnswers[id].state!=="Send Password" && mdnsRemoteAnswers[id].state!=="Send User/Password")
    ){
        return;
    }

    let buf;
    if(mdnsRemoteAnswers[id].state==="Send Password") {
        const sha256 = createHash('sha256').update(mdnsRemoteAnswers[id].cryptoNonce+pass).digest();
        [buf, ] = createUDPMessage(0x02, {authDigest:sha256});
        mdnsRemoteAnswersClients[id].send(buf,
            mdnsRemoteAnswers[id].port,
            mdnsRemoteAnswers[id].addresses[0]);
    }else {
        const sha256 = createHash('sha256').update(mdnsRemoteAnswers[id].cryptoNonce+username+pass).digest();
        [buf, ] = createUDPMessage(0x03, {authDigest:sha256,username});
        mdnsRemoteAnswersClients[id].send(buf,
            mdnsRemoteAnswers[id].port,
            mdnsRemoteAnswers[id].addresses[0]);
    }
    //d.msg('udp',buf,'out',mdnsRemoteAnswers[id].addresses[0]+':'+mdnsRemoteAnswers[id].port);
    clientCreateDebug(buf, 'out', id);


}

function connectToHost(id){
    if(!mdnsRemoteAnswers[id] || mdnsRemoteAnswers[id].state){
        return;
    }

    mdnsRemoteAnswers[id].state = 'Starting..'; //attempting connection
    global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);

    mdnsRemoteAnswersClients[id] = dgram.createSocket('udp4');
    mdnsRemoteAnswersClients[id].on('error', (err) => {
        console.log(`server error:\n${err.stack}`);
        mdnsRemoteAnswersClients[id].close();
        delete mdnsRemoteAnswersClients[id];
        delete mdnsRemoteAnswers[id];
        global.configSetting.mdnsRemoteAnswers = mdnsRemoteAnswers;
        global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);
    });
    mdnsRemoteAnswersClients[id].on('message', (msg, rinfo) => {
        //console.log(`client got: ${Array.from(msg).toString()} from ${rinfo.address}:${rinfo.port}`);

        if(!mdnsRemoteAnswers[id]
            || mdnsRemoteAnswers[id].port!==rinfo.port
            || mdnsRemoteAnswers[id].addresses.indexOf(rinfo.address)===-1){
            return;
        }

        //d.msg('udp',msg,'in',`${rinfo.address}:${rinfo.port}`);
        clientCreateDebug(msg, 'in', id);

        processPacket(msg,{
            sessionReset:() =>{
                mdnsRemoteAnswers[id].remoteSeq = 0;
                mdnsRemoteAnswers[id].seq = 0;
                mdnsRemoteAnswers[id].fec = [];
                let [buf, ] = createUDPMessage(0x83);
                mdnsRemoteAnswersClients[id].send(buf,
                    mdnsRemoteAnswers[id].port,
                    mdnsRemoteAnswers[id].addresses[0]);
                clientCreateDebug(buf, 'out', id);
            },
            sessionResetReply:() =>{
                mdnsRemoteAnswers[id].remoteSeq = 0;
                mdnsRemoteAnswers[id].seq = 0;
                mdnsRemoteAnswers[id].fec = [];
            },
            byeReply:()=>{
                if(mdnsRemoteAnswers[id]){
                    //mdnsRemoteAnswers[id].state = '';
                    clearTimeout(mdnsRemoteAnswersClients[id].byeReplyCheck)
                    cleanupUDPHost(id);
                }
            },
            bye:()=>{
                console.log(`server BYE ${id}`);
                clearInterval(mdnsRemoteAnswersClients[id]._checkTimer);

                let [buf, ] = createUDPMessage(0xF1);
                mdnsRemoteAnswersClients[id].send(buf,
                    mdnsRemoteAnswers[id].port,
                    mdnsRemoteAnswers[id].addresses[0]);
                //d.msg('udp',buf,'out',mdnsRemoteAnswers[id].addresses[0]+':'+mdnsRemoteAnswers[id].port);
                clientCreateDebug(buf, 'out', id);
                setTimeout(()=>{
                    mdnsRemoteAnswersClients[id].close();
                    delete mdnsRemoteAnswersClients[id];
                    // delete mdnsRemoteAnswers[id];

                    mdnsRemoteAnswers[id].access = false;
                    mdnsRemoteAnswers[id].state = false; //Sent Request
                    removeUMPDevice(id);

                    global.configSetting.mdnsRemoteAnswers = mdnsRemoteAnswers;
                    global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);

                },200);
            },
            approved: (epName, productInstId) => {
                if(!mdnsRemoteAnswers[id].access){
                    mdnsRemoteAnswers[id].access = true;
                    mdnsRemoteAnswers[id].remoteSeq = -1;
                    mdnsRemoteAnswers[id].seq = 0;
                    mdnsRemoteAnswers[id].productInstId = productInstId;
                    addDev(id);
                    mdnsRemoteAnswers[id].state = 'Connected'; //Sent Request
                    global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);
                }
            },
            reqSHAPasscode: (cryptoNonce,epName,productInstId,resend) => {
                mdnsRemoteAnswers[id].state = 'Send Password';
                mdnsRemoteAnswers[id].cryptoNonce = cryptoNonce;
                global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);

            },
            reqUserSHAPasscode: (cryptoNonce,epName,productInstId,resend) => {
                mdnsRemoteAnswers[id].state = 'Send User/Password';
                mdnsRemoteAnswers[id].cryptoNonce = cryptoNonce;
                global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);

            },
            pending: () => {
                mdnsRemoteAnswers[id].state = 'Pending'; //Pending
                global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);
            },
            pingReq:(pingId)=>{
                let [buf, ] = createUDPMessage(0x21, {pingId});
                mdnsRemoteAnswersClients[id].send(buf,
                    mdnsRemoteAnswers[id].port,
                    mdnsRemoteAnswers[id].addresses[0]);
                //d.msg('udp',buf,'out',mdnsRemoteAnswers[id].addresses[0]+':'+mdnsRemoteAnswers[id].port);
                clientCreateDebug(buf, 'out', id);
            },
            pingRes:(pingId)=>{
               mdnsRemoteAnswersClients[id]._pingAccepted=true;
               if(mdnsRemoteAnswersClients[id]._lastPing===pingId) {
                   mdnsRemoteAnswersClients[id]._lastPingOk = true;
                   mdnsRemoteAnswersClients[id]._lastPingError=0;
               }
            },
            NAK: (reason, originalHeader, error) =>{
                if(reason===0x01 && ((originalHeader>>> 24) & 0xFF)===0x80){
                    let [buf, ] = createUDPMessage(0x82);
                    mdnsRemoteAnswersClients[id].send(buf,
                        mdnsRemoteAnswers[id].port,
                        mdnsRemoteAnswers[id].addresses[0]);
                    clientCreateDebug(buf, 'out', id);
                    mdnsRemoteAnswers[id].retransmitNotSupported=true;
                }
            },
            retransmit: (seq, numToRetranmit, origHeader)=>{
                if(!mdnsRemoteAnswers[id])return;
                //let buf = createUDPMessage(0x81,{seq, reason:0x01});
                let [buf, ] = createUDPMessage(0x8F,{reason: 0x01, nakHeader:origHeader});
                mdnsRemoteAnswersClients[id].send(buf,
                    mdnsRemoteAnswers[id].port,
                    mdnsRemoteAnswers[id].addresses[0]);
                clientCreateDebug(buf, 'out', id);
            },
            retransmitError:(error, sentSeqNum) => {
                //Send a Session Reset!
                let [buf, ] = createUDPMessage(0x82);
                mdnsRemoteAnswersClients[id].send(buf,
                    mdnsRemoteAnswers[id].port,
                    mdnsRemoteAnswers[id].addresses[0]);
                clientCreateDebug(buf, 'out', id);
            },
            ump: (seqNum,umpArr) => {
                clearTimeout(mdnsRemoteAnswersClients[id]._umpErrorTimer);
                let diffSeq = int16(seqNum - mdnsRemoteAnswers[id].remoteSeq);
                if(mdnsRemoteAnswers[id].access !== true){
                    //UMP before Session started
                    let [buf, ] = createUDPMessage(0x8F,{reason:0x21, nakHeader: 0x10});
                    mdnsRemoteAnswersClients[id].send(buf,
                        mdnsRemoteAnswers[id].port,
                        mdnsRemoteAnswers[id].addresses[0]);
                    clientCreateDebug(buf, 'out', id);
                }else if (diffSeq === 1) {
                    mdnsRemoteAnswers[id].remoteSeq = seqNum;
                    // if (seqNum === 0xFFFF) {
                    //     mdnsRemoteAnswers[id].remoteSeq = -1;
                    // }
                    if (global.umpDevices[id]) global.umpDevices[id].midiToProc(id, umpArr);
                }else if (diffSeq > 1) {
                    //UMP Sequence is Higher than what we have - Send a Retransmit
                    let buf;
                    if(mdnsRemoteAnswers[id].retransmitNotSupported){
                        [buf, ] = createUDPMessage(0x82); //Go Straight to Session Reset
                    }else{
                        [buf, ] = createUDPMessage(0x80,{seq:mdnsRemoteAnswers[id].remoteSeq});
                    }
                    mdnsRemoteAnswersClients[id]._umpErrorTimer = setTimeout(()=>{
                        mdnsRemoteAnswersClients[id].send(buf,
                            mdnsRemoteAnswers[id].port,
                            mdnsRemoteAnswers[id].addresses[0]);
                        clientCreateDebug(buf, 'out', id);
                    },20);

                }
            }
        });
    });

    mdnsRemoteAnswersClients[id].on('listening', () => {
        mdnsRemoteAnswersClients[id]._address = mdnsRemoteAnswersClients[id].address();
        //console.log(`client listening ${ mdnsRemoteAnswersClients[id]._address.address}:${ mdnsRemoteAnswersClients[id]._address.port}`);

        const cliName = "MIDI 2.0 Workbench";

        const [buf, ] = createUDPMessage(0x01,{epName:cliName,prodInstId:global.configSetting.productInstanceId, authOpt:0b11}); //,Math.ceil(cliName.length/4)

        mdnsRemoteAnswersClients[id].send(buf, mdnsRemoteAnswers[id].port
            , mdnsRemoteAnswers[id].addresses[0]);

        //d.msg('udp',buf,'out',mdnsRemoteAnswers[id].addresses[0]+':'+mdnsRemoteAnswers[id].port);
        clientCreateDebug(buf, 'out', id);

        mdnsRemoteAnswers[id].state = 'Sent Request'; //Sent Request
        global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);

        setTimeout(()=>{
            if(mdnsRemoteAnswers[id] && mdnsRemoteAnswers[id].state === 'Sent Request'){
                disconnectUDPHost(id,0x42);
            }
        },5000);



        mdnsRemoteAnswersClients[id].mdns = instance.publish({
            name: cliName,
            type: 'midi2',
            protocol: 'udp',
            address: mdnsRemoteAnswersClients[id]._address.address,
            port: mdnsRemoteAnswersClients[id]._address.port,
            ttl:60,
            txt: {
                UMPEndpointName: cliName,
                ProductInstanceId: id,
                roles: ['remoteControlled','client'].join(','),
                authSupported: 'none'
            }
        });

    });

    mdnsRemoteAnswersClients[id].bind(0);
}

//------
// listen for response events from server
const browser = instance.find({type:'midi2',protocol: 'udp'}, (resp)=>{
    console.log('got Browser Service:');
    console.log(JSON.stringify(resp));

    if(!resp.addresses.length){
        resp.addresses.push(resp.referer.address)

    }

    const id = resp.addresses[0]+':'+resp.port;

    //TODO Add Remote Management Session Handling HERE

    if(!remoteControlled[id]){
        //debugger;
        remoteControlled[id] = {
            addresses: resp.addresses,
            port: resp.port,
            name: resp.name,
            fqdn: resp.fqdn,
            host: resp.host,
            UMPEndpointName: resp.txt.UMPEndpointName,
            ProductInstanceId: resp.txt.ProductInstanceId,
            roles: (resp.txt.roles||"").split(','),
            authSupported: (resp.txt.authSupported||"").split(','),
            connections:{},
        }
    }

    if([].concat(...Object.values(mdnsAnswers)).map(d=>d.name).indexOf(resp.name)!==-1){
        return;
    }

    if(mdnsRemoteAnswers[id]){
        return;
    }

    mdnsRemoteAnswers[id] = JSON.parse(JSON.stringify(resp));
    global.configSetting.mdnsRemoteAnswers = mdnsRemoteAnswers;
    if(global.indexWindow)global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);

});

browser.on('down',(resp)=> {
    const id = resp.addresses[0]+':'+resp.port;

    if(remoteControlled[id]){
        delete remoteControlled[id];
    }

    if(mdnsRemoteAnswersClients[id]){
        clearInterval(mdnsRemoteAnswersClients[id]._checkTimer);
        removeUMPDevice(id);
        delete mdnsRemoteAnswersClients[id];
    }
    delete mdnsRemoteAnswers[id];

    global.configSetting.mdnsRemoteAnswers = mdnsRemoteAnswers;
    if(global.indexWindow)global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);
})

browser.start();

function search_mDNS(){
    browser.update();
}

function addDev(name){
    const newDev = addUMPDevice(name,{
        name:name,
        remoteEndpoint:{
            name:name,
            udpClient:true,
            midi2Supp: {
                transOtherList:"Network",
                transOther:true
            }
        },
        extraTextGet: () =>{
            return "UMP UDP on " + mdnsRemoteAnswers[name].addresses[0]
                + ":"
                + mdnsRemoteAnswers[name].port;
        },
        midiOutFunc: (umpDev, umpOut) => {
            if(!mdnsRemoteAnswersClients[name])return;
            clearTimeout(mdnsRemoteAnswersClients[name].emptyUMP);

            let sendUMP = (ump)=> {
                let [buf, fec] = createUDPMessage(0xFF, {
                    seq: int16(mdnsRemoteAnswers[name].seq++),
                    ump,
                    fec: mdnsRemoteAnswersClients[name].fec || []
                });

                mdnsRemoteAnswersClients[name].fec = fec;
                mdnsRemoteAnswersClients[name].send(buf, mdnsRemoteAnswers[name].port, mdnsRemoteAnswers[name].addresses[0]);
                clientCreateDebug(buf, 'out', name);
                d.msgUMPBreakUp(ump, 'out', umpDev, 0);
            };

            sendUMP(umpOut);
            mdnsRemoteAnswersClients[name].emptyUMP = setTimeout(()=>{
                 sendUMP([]);
                mdnsRemoteAnswersClients[name].emptyUMP = setTimeout(()=>{
                    sendUMP([]);
                    // mdnsRemoteAnswersClients[name].emptyUMP = setTimeout(()=>{
                    //     sendUMP([]);
                    // },600);
                },300);
            },200);

        },

        remove:()=>{
            //debugger;
            try {
                if (mdnsRemoteAnswersClients[name]) {
                    const [buf, ] = createUDPMessage(0xF0);
                    mdnsRemoteAnswersClients[name].send(buf, mdnsRemoteAnswers[name].port, mdnsRemoteAnswers[name].addresses[0]);
                    //d.msg('udp', buf, 'out', mdnsRemoteAnswersClients[name].addresses[0] + ':' + mdnsRemoteAnswersClients[name].port);
                    clientCreateDebug(buf, 'out', name);
                    clearTimeout(mdnsRemoteAnswersClients[name]._checkTimer);
                }
            }catch (e) {
                //do nothing - can happen on close of app
            }
        },
        extendedProcessUMPEndpoint:(data) => {
            switch (data.status) {
                case 0x000: //Get MIDI Endpoint Info
                    let filter = data.ump[1] & 0xff;
                    if(filter & 0b1){
                        let ump = [
                            ((0xF << 28) >>> 0) + (1<<16) + (1<<8) + 2 , //Type F, status 1 ver 1.2
                            ((0x1 << 31) >>> 0) + ((0x1 << 24) >>> 0) + (0b11 << 8), //1 static FB, M1 and Mr Protocol
                            0,0];
                        global.umpDevices[name].midiOutFunc(name, ump);
                    }

                    if(filter & 0b10){
                        let ump = [
                            ((0xF << 28) >>> 0) + (2<<16) , //Type F, Dev Info
                            ((global.configSetting.deviceInfo.manufacturerId[0] << 16) >>> 0) + (global.configSetting.deviceInfo.manufacturerId[1] << 8)
                               + global.configSetting.deviceInfo.manufacturerId[2],
                            ((global.configSetting.deviceInfo.familyId[0] << 24) >>> 0) + (global.configSetting.deviceInfo.familyId[1] << 16)
                              + (global.configSetting.deviceInfo.modelId[0] << 8) + global.configSetting.deviceInfo.modelId[1],
                            ((global.configSetting.deviceInfo.versionId[0] << 24) >>> 0) + (global.configSetting.deviceInfo.versionId[1] << 16)
                            + (global.configSetting.deviceInfo.versionId[2] << 8) + global.configSetting.deviceInfo.versionId[3]

                        ];
                        global.umpDevices[name].midiOutFunc(name, ump);
                    }
                    if(filter & 0b100){
                        let nameArrr = Array.from("Workbench").map(letter => letter.charCodeAt(0));
                        let ump = [
                            ((0xF << 28) >>> 0) + (3<<16) + (nameArrr[0] << 8) +nameArrr[1] , //Type F, Name
                            ((nameArrr[2] << 24) >>> 0) + (nameArrr[3]<<16) + (nameArrr[4] << 8) +nameArrr[5] , //Type F, Name
                            ((nameArrr[6] << 24) >>> 0) + (nameArrr[7]<<16) + (nameArrr[8] << 8) +nameArrr[9] , //Type F, Name
                            0

                        ];
                        global.umpDevices[name].midiOutFunc(name, ump);
                    }

                    if(filter & 0b1000){
                        let nameArrr = Array.from(global.configSetting.productInstanceId).map(letter => letter.charCodeAt(0));
                        let ump = [
                            ((0xF << 28) >>> 0) + (4<<16) + (nameArrr[0] << 8) +nameArrr[1] , //Type F, Name
                            ((nameArrr[2] << 24) >>> 0) + (nameArrr[3]<<16) + (nameArrr[4] << 8) +nameArrr[5] , //Type F, Name
                            ((nameArrr[6] << 24) >>> 0) + (nameArrr[7]<<16)  , //Type F, Name
                            0

                        ];
                        global.umpDevices[name].midiOutFunc(name, ump);
                    }
                    if(filter & 0b10000){
                        let ump = [
                            ((0xF << 28) >>> 0) + (6<<16) + (2 << 8) , //Type F, Name
                            0,0,0

                        ];
                        global.umpDevices[name].midiOutFunc(name, ump);
                    }

                    break;
                case 0x005: { //Stream Configuration Request Message Format

                    let ump = [
                        ((0xF << 28) >>> 0) + (6<<16) + (data.protocol << 8) , //Type F, Name
                        0,0,0

                    ];
                    global.umpDevices[name].midiOutFunc(name, ump);

                    break;
                }
                case 0x0010: { //Get Function Block Info
                    let ump = [
                        ((0xF << 28) >>> 0) + (0x11<<16) + (1 << 15) + (0 << 8) + 0b11, //Type F, Name
                        ((0x0 << 24) >>> 0) + (16<<16),
                        0,0

                    ];
                    global.umpDevices[name].midiOutFunc(name, ump);


                    let nameArrr = Array.from("Workbench").map(letter => letter.charCodeAt(0));
                    ump = [
                        ((0xF << 28) >>> 0) + (0x12<<16) + (0 << 8) +nameArrr[0] , //Type F, Name
                        ((nameArrr[1] << 24) >>> 0) + (nameArrr[2]<<16) + (nameArrr[3] << 8) +nameArrr[4] , //Type F, Name
                        ((nameArrr[5] << 24) >>> 0) + (nameArrr[6]<<16) + (nameArrr[7] << 8) +nameArrr[8] , //Type F, Name
                        0

                    ];
                    global.umpDevices[name].midiOutFunc(name, ump);
                    break;
                }
            }
        }
    });

    mdnsRemoteAnswersClients[name]._lastPingError=0;
    mdnsRemoteAnswersClients[name]._lastPingOk = true;
    mdnsRemoteAnswersClients[name]._pingAccepted = false;
    mdnsRemoteAnswersClients[name]._checkTimer = setInterval(()=>{
        if ((typeof mdnsRemoteAnswersClients[name] === 'undefined')){
            // TODO: kill timer
            return;
        }
        if(/*mdnsRemoteAnswersClients[name]._pingAccepted && */mdnsRemoteAnswersClients[name]._lastPingError >= 3){
            disconnectUDPHost(name,0x42);
            return;
        }

        if(!mdnsRemoteAnswersClients[name]._lastPingOk){
            mdnsRemoteAnswersClients[name]._lastPingError++;
        }
        mdnsRemoteAnswersClients[name]._lastPingOk = false;

        mdnsRemoteAnswersClients[name]._lastPing =  getRandomInt(0xFFFFFFFF);
        const [buf, ] = createUDPMessage(0x20,{pingId:mdnsRemoteAnswersClients[name]._lastPing});

        mdnsRemoteAnswersClients[name].send(buf, mdnsRemoteAnswers[name].port
            , mdnsRemoteAnswers[name].addresses[0]);

        //d.msg('udp',buf,'out',mdnsRemoteAnswers[name].addresses[0]+':'+mdnsRemoteAnswers[name].port);
        clientCreateDebug(buf, 'out', name);
    },10000);
}

setInterval(search_mDNS,30000);


//----------- Handling Remote Endpoints
let remoteSessionManager = dgram.createSocket('udp4');
remoteSessionManager.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    //global.indexWindow.webContents.send('asynchronous-reply', 'configSettings', global.configSetting);
});
remoteSessionManager.on('message', (msg, rinfo) => {
    let id = rinfo.address+':'+rinfo.port

    let info = `${id} -> REMOTE MANAGER`;
    d.msg('udp',msg,'in' ,info);


    processPacket(msg,{

    });


});
remoteSessionManager.on('listening', () => {
    let address = remoteSessionManager.address();
    console.log(`server listening ${address.address}:${address.port}`);

    setInterval(remoteControlledEndpointCheck,10000);

});
function remoteControlledEndpointCheck(){
    Object.keys(remoteControlled).map(id=>{
        let r = remoteControlled[id];

    });

}