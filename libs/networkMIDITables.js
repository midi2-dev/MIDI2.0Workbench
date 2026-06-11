const networkMIDICodes = {
    0x01:{
        title: 'Invitation',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'capabilities',length:1, title:'Capabilities'},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'reqAccess',
        oOptArgs: ['epName', 'prodInstId','capabilities']
    },
    0x02:{
        title: 'Invitation with Authentication',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:8, maxV:8},
            {key:'csd1',length:2, },
            {key:'authDigest',length: 32,title:'Digest', type:'array'}
        ],
        oOptName: 'reqAccess',
        oOptArgs: ['authDigest', 'cCode']
    },
    0x03:{
        title: 'Invitation with User Authentication',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:9, maxV:255},
            {key:'csd1',length:2, },
            {key:'authDigest',length: 32,title:'Digest', type:'array'},
            {key:'username',length: (keys)=>((keys['pl']*4)-32),title:'Username', type:'text'},
        ],
        oOptName: 'reqAccess',
        oOptArgs: ['authDigest', 'username','cCode']
    },
    0x10:{
        title: 'Invitation Reply: Accepted',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'csd2',length:1},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'approved',
        oOptArgs: ['epName', 'prodInstId']
    },
    0x11:{
        title: 'Invitation Reply: Pending',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'csd2',length:1},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'pending',
        oOptArgs: ['epName', 'prodInstId']
    },
    0x12:{
        title: 'Invitation Reply: Authentication Required',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'resend',length:1, minV:0, maxV:2, title:'State'},
            {key:'cryptoNonce',length: 16,title:'CryptoNonce', type:'array'},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'reqAccess',
        oOptArgs: ['cryptoNonce','epName', 'prodInstId','csd2']
    },
    0x13:{
        title: 'Invitation Reply: User Authentication Required',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'resend',length:1, minV:0, maxV:2, title:'State'},
            {key:'cryptoNonce',length: 16,title:'Crypto Nonce', type:'array'},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'reqUserSHAPasscode',
        oOptArgs: ['cryptoNonce','epName', 'prodInstId','resend']
    },
    0x20:{
        title: 'Ping',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:1, maxV:1},
            {key:'csd1',length:2 },
            {key:'pingId',length: 4,title:'Ping Id'}
        ],
        oOptName: 'pingReq',
        oOptArgs: ['pingId']
    },
    0x21:{
        title: 'Ping Reply',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:1, maxV:1},
            {key:'csd1',length:2 },
            {key:'pingId',length: 4,title:'Ping Id'}
        ],
        oOptName: 'pingRes',
        oOptArgs: ['pingId']
    },
    0x22:{
        title: 'Device Info',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:0},
            {key:'csd1',length:2 }
        ],
        oOptName: 'deviceInfo'
    },
    0x23:{
        title: 'Device Info Reply',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:3, maxV:37},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'csd2',length:1},
            {key:'props',length:2, title:'Properties'},
            {key:'maxSess',length: 2, title:'Max Sessions'},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength']-1)*4),title:'Product Instance Id', type:'text'}
        ],
        oOptName: 'deviceInfoReply',
        oOptArgs: ['props','maxSess','epName','prodInstId'],
    },
    0x24:{
        title: 'Session Info',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:0},
            {key:'csd1',length:2 }
        ],
        oOptName: 'deviceInfo'
    },
    0x25:{
        title: 'Session Info Reply',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:3, maxV:37},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'sessState',length:1, title:'State'},
            {key:'sessIdx',length:2, title:'Session Index'},
            {key:'activeSess',length: 2, title:'Active Session Count'},
            {key:'ipType',length:1, title:'IP Type'},
            {key:'res',length:1},
            {key:'port',length: 2, title:'Port'},
            {key:'address',length: 16, title:'Address', type:'function', cval: (keys, val)=>{
                    if(keys['ipType'] === 0){
                        return `${val[0]}.${val[1]}.${val[2]}.${val[3]}`
                    }else{
                        let segments = [];
                        for (let i = 0; i < 16; i += 2) {
                            segments.push(val.toString(16));
                        }
                        return segments.join(':');
                    }
                }},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'pII',length: (keys)=>((keys['pl']-keys['epNameLength']-6)*4),title:'Product Instance Id', type:'text'}
        ],
        oOptName: 'deviceInfoReply',
        oOptArgs: ['sessState','sessIdx','activeSess','ipType','address','port','epName','pII'],
    },
    0x31:{
        title: 'Remote Invitation',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:10, maxV:10},
            {key:'res',length:1},
            {key:'sessCapabilities',length:1, title:'Capabilities'},
            {key:'ipType',length:1, title:'IP Type'},
            {key:'res',length:1},
            {key:'port',length: 2, title:'Port'},
            {key:'address',length: 16, title:'Address', type:'function', cval: (keys, val)=>{
                    if(keys['ipType'] === 0){
                        return `${val[0]}.${val[1]}.${val[2]}.${val[3]}`
                    }else{
                        let segments = [];
                        for (let i = 0; i < 16; i += 2) {
                            segments.push(val.toString(16));
                        }
                        return segments.join(':');
                    }
                }}
        ],
        oOptName: 'remoteInvite',
        oOptArgs: ['sessCapabilities','ipType','address','port'],
    },
    0x32:{
        title: 'Remote Invitation with Authentication',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:8, maxV:8},
            {key:'res',length:1},
            {key:'sessCapabilities',length:1, title:'Capabilities'},
            {key:'ipType',length:1, title:'IP Type'},
            {key:'res',length:1},
            {key:'port',length: 2, title:'Port'},
            {key:'address',length: 16, title:'Address', type:'function', cval: (keys, val)=>{
                    if(keys['ipType'] === 0){
                        return `${val[0]}.${val[1]}.${val[2]}.${val[3]}`
                    }else{
                        let segments = [];
                        for (let i = 0; i < 16; i += 2) {
                            segments.push(val.toString(16));
                        }
                        return segments.join(':');
                    }
                }},
            {key:'authDigest',length: 32,title:'Digest', type:'array'}
        ],
        oOptName: 'remoteReqAccess',
        oOptArgs: ['sessCapabilities','ipType','address','port','authDigest', 'cCode']
    },
    0x33:{
        title: 'Remote Invitation with User Authentication',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:9, maxV:255},
            {key:'res',length:1},
            {key:'sessCapabilities',length:1, title:'Capabilities'},
            {key:'ipType',length:1, title:'IP Type'},
            {key:'res',length:1},
            {key:'port',length: 2, title:'Port'},
            {key:'address',length: 16, title:'Address', type:'function', cval: (keys, val)=>{
                    if(keys['ipType'] === 0){
                        return `${val[0]}.${val[1]}.${val[2]}.${val[3]}`
                    }else{
                        let segments = [];
                        for (let i = 0; i < 16; i += 2) {
                            segments.push(val.toString(16));
                        }
                        return segments.join(':');
                    }
                }},
            {key:'authDigest',length: 32,title:'Digest', type:'array'},
            {key:'username',length: (keys)=>((keys['pl']*4)-52),title:'Username', type:'text'},
        ],
        oOptName: 'remoteReqAccess',
        oOptArgs: ['sessCapabilities','ipType','address','port','authDigest', 'username','cCode']
    },
    0x40:{
        title: 'Remote Invitation Reply: Accepted',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'csd2',length:1},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'remoteApproved',
        oOptArgs: ['epName', 'prodInstId']
    },
    0x41:{
        title: 'Remote Invitation Reply: Pending',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'csd2',length:1},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'remoteApproved',
        oOptArgs: ['epName', 'prodInstId']
    },
    0x42:{
        title: 'Remote Invitation Reply: Authentication Required',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'resend',length:1, minV:0, maxV:2, title:'State'},
            {key:'cryptoNonce',length: 16,title:'CryptoNonce', type:'array'},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'reqAccess',
        oOptArgs: ['cryptoNonce','epName', 'prodInstId','csd2']
    },
    0x43:{
        title: 'Remote Invitation Reply: User Authentication Required',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:2, maxV:36},
            {key:'epNameLength',length:1, minV:1, maxV:25},
            {key:'resend',length:1, minV:0, maxV:2, title:'State'},
            {key:'cryptoNonce',length: 16,title:'Crypto Nonce', type:'array'},
            {key:'epName',length: (keys)=>(keys['epNameLength']*4),title:'Endpoint Name', type:'text'},
            {key:'prodInstId',length: (keys)=>((keys['pl']-keys['epNameLength'])*4),title:'Product Instance Id', type:'text'},
        ],
        oOptName: 'reqUserSHAPasscode',
        oOptArgs: ['cryptoNonce','epName', 'prodInstId','resend']
    },
    0x80:{
        title: 'Retransmit Request',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:1, maxV:1},
            {key:'seq',length:2, title:'Sequence #'},
            {key:'numOfComm',length: 2, title:'Number Of Commands'},
            {key:'res',length: 2},
        ],
        oOptName: 'retransmit',
        oOptArgs: ['seq','numOfComm']
    },
    0x81:{
        title: 'Retransmit Error',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:1, maxV:1},
            {key:'csd1',length:1, title:'ErrorCode', type:'enum'},
            {key:'csd2',length:1},
            {key:'seqNum',length:2, title:'Sequence #'},
            {key:'res',length: 2},
        ],
        oOptName: 'retransmitError',
        oOptArgs: ['csd1','seqNum']
    },
    0x82:{
        title: 'Session Reset',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:0},
            {key:'csd1',length:2 }
        ],
        oOptName: 'sessionReset'
    },
    0x83:{
        title: 'Session Reset Reply',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:0},
            {key:'csd1',length:2 }
        ],
        oOptName: 'sessionResetReply'
    },
    0x8E:{
        title: 'Remote NAK',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:1, maxV:255},
            {key:'reason',length:1, title:'Reason', type:'enum'},
            {key:'csd2',length:1},
            {key:'ipType',length:1, title:'IP Type'},
            {key:'res',length:1},
            {key:'port',length: 2, title:'Port'},
            {key:'address',length: 16, title:'Address', type:'function', cval: (keys, val)=>{
                    if(keys['ipType'] === 0){
                        return `${val[0]}.${val[1]}.${val[2]}.${val[3]}`
                    }else{
                        let segments = [];
                        for (let i = 0; i < 16; i += 2) {
                            segments.push(val.toString(16));
                        }
                        return segments.join(':');
                    }
                }},
            {key:'nakHeader',length: 4,title:'NAK\'ed Header'},
            {key:'msg',length: (keys)=>((keys['pl']-6)*4), title:'Message', type:'text'}
        ],
        oOptName: 'NAK',
        oOptArgs: ['reason','ipType','address','port','nakHeader', 'msg']
    },
    0x8F:{
        title: 'NAK',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:1, maxV:255},
            {key:'reason',length:1, title:'Reason', type:'enum'},
            {key:'csd2',length:1},
            {key:'nakHeader',length: 4,title:'NAK\'ed Header'},
            {key:'msg',length: (keys)=>((keys['pl']-1)*4), title:'Message', type:'text'}
        ],
        oOptName: 'NAK',
        oOptArgs: ['reason','nakHeader', 'msg']
    },
    0xF0:{
        title: 'Bye',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:255},
            {key:'reason',length:1, title:'Reason', type:'enum'},
            {key:'csd2',length:1},
            {key:'msg',length: (keys)=>((keys['pl'])*4), title:'Message', type:'text'}
        ],
        oOptName: 'bye',
        oOptArgs: ['reason','msg']
    },
    0xF1:{
        title: 'Bye Reply',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:0},
            {key:'csd1',length:2 }
        ],
        oOptName: 'byeReply'
    },
    0xF2:{
        title: 'Remote Bye',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:255},
            {key:'reason',length:1, title:'Reason', type:'enum'},
            {key:'csd2',length:1},
            {key:'ipType',length:1, title:'IP Type'},
            {key:'res',length:1},
            {key:'port',length: 2, title:'Port'},
            {key:'address',length: 16, title:'Address', type:'function', cval: (keys, val)=>{
                    if(keys['ipType'] === 0){
                        return `${val[0]}.${val[1]}.${val[2]}.${val[3]}`
                    }else{
                        let segments = [];
                        for (let i = 0; i < 16; i += 2) {
                            segments.push(val.toString(16));
                        }
                        return segments.join(':');
                    }
                }},
            {key:'msg',length: (keys)=>((keys['pl']-5)*4), title:'Message', type:'text'}
        ],
        oOptName: 'remoteBye',
        oOptArgs: ['reason','ipType','address','port','msg']
    },
    0xF3:{
        title: 'Remote Bye Reply',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:0},
            {key:'csd1',length:2 }
        ],
        oOptName: 'remoteByeReply'
    },
    0xFF:{
        title: 'UMP Data Command',
        bytes:[
            {key:'cCode',length:1},
            {key:'pl',length:1, minV:0, maxV:64},
            {key:'seq',length:2, title:'Sequence #'},
            {key:'ump',length: (keys)=>((keys['pl'])*4), title:'Message', type:'wordArray'}
        ],
        oOptName: 'ump',
        oOptArgs: ['seq','ump']
    }
}

module.exports = {networkMIDICodes};