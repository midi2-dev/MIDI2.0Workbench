// webDX7 (WAM)
// Jari Kleimola 2017-18 (jari@webaudiomodules.org)

class DX7 extends WAMController
{
  constructor (actx, options) {
    options = options || {};
    options.numberOfInputs  = 0;
    options.numberOfOutputs = 1;
    options.outputChannelCount = [1];

    super(actx, "DX7", options);
  }
  
  static importScripts (actx) {
    const origin = location.origin + location.pathname.replace(/(?!\/)([^/]+\.[^/]+)$/,'') + "app/sound/";
    return new Promise( (resolve) => {
      actx.audioWorklet.addModule(origin + "dx7/dx7.wasm.js").then(() => {
      actx.audioWorklet.addModule(origin + "dx7/dx7.js").then(() => {
      actx.audioWorklet.addModule(origin + "wam-processor.js").then(() => {
      actx.audioWorklet.addModule(origin + "dx7/dx7-awp.js").then(() => {
        resolve();
      }) }) }) });      
    })
  }

  dx7PatchIntoBuffer(data){
    const curves = ['-LIN', '-EXP', '+EXP', '+LIN'];
    const lfoWaves = ["triangle", "sawDown", "sawUp", "square","sine","sampleHold"];

    const patch = [
      data.operators[5].rates[0]
      ,data.operators[5].rates[1]
      ,data.operators[5].rates[2]
      ,data.operators[5].rates[3]
      ,data.operators[5].levels[0]
      ,data.operators[5].levels[1]
      ,data.operators[5].levels[2]
      ,data.operators[5].levels[3]
      ,data.operators[5].keyScale.breakpoint
      ,data.operators[5].keyScale.depthL
      ,data.operators[5].keyScale.depthR
      //11    0   0   0 |  RC   |   LC  | SCL LEFT CURVE 0-3   SCL RGHT CURVE 0-3
      ,(curves.indexOf(data.operators[5].keyScale.curveR)<<2) + curves.indexOf(data.operators[5].keyScale.curveL)
      //12  |      DET      |     RS    | OSC DETUNE     0-14  OSC RATE SCALE 0-7
      ,((data.operators[5].detune +7 )<< 3)
      + (data.operators[5].keyScale.rate << 2)
      //  13    0   0 |    KVS    |  AMS  | KEY VEL SENS   0-7   AMP MOD SENS   0-3
      , (data.operators[5].velocitySens << 2) + data.operators[5].lfoAmpModSens
      //  14                OL              OP6 OUTPUT LEV 0-99
      ,data.operators[5].volume
      //  15    0 |         FC        | M | FREQ COARSE    0-31  OSC MODE       0-1
      , (Math.floor(data.operators[5].freq) << 1) + (data.operators[5].oscMode==="fixed"?1:0)
      //  16                FF              FREQ FINE      0-99
      ,Math.round(data.operators[5].freq%1 *100)

      ,data.operators[4].rates[0]
      ,data.operators[4].rates[1]
      ,data.operators[4].rates[2]
      ,data.operators[4].rates[3]
      ,data.operators[4].levels[0]
      ,data.operators[4].levels[1]
      ,data.operators[4].levels[2]
      ,data.operators[4].levels[3]
      ,data.operators[4].keyScale.breakpoint
      ,data.operators[4].keyScale.depthL
      ,data.operators[4].keyScale.depthR
      //11    0   0   0 |  RC   |   LC  | SCL LEFT CURVE 0-3   SCL RGHT CURVE 0-3
      ,(curves.indexOf(data.operators[4].keyScale.curveR)<<2) + curves.indexOf(data.operators[4].keyScale.curveL)
      //12  |      DET      |     RS    | OSC DETUNE     0-14  OSC RATE SCALE 0-7
      ,((data.operators[4].detune +7 )<< 3)
      + (data.operators[4].keyScale.rate << 2)
      //  13    0   0 |    KVS    |  AMS  | KEY VEL SENS   0-7   AMP MOD SENS   0-3
      , (data.operators[4].velocitySens << 2) + data.operators[4].lfoAmpModSens
      //  14                OL              OP6 OUTPUT LEV 0-99
      ,data.operators[4].volume
      //  15    0 |         FC        | M | FREQ COARSE    0-31  OSC MODE       0-1
      , (Math.floor(data.operators[4].freq) << 1) + (data.operators[4].oscMode==="fixed"?1:0)
      //  16                FF              FREQ FINE      0-99
      ,Math.round(data.operators[4].freq%1 *100)


      ,data.operators[3].rates[0]
      ,data.operators[3].rates[1]
      ,data.operators[3].rates[2]
      ,data.operators[3].rates[3]
      ,data.operators[3].levels[0]
      ,data.operators[3].levels[1]
      ,data.operators[3].levels[2]
      ,data.operators[3].levels[3]
      ,data.operators[3].keyScale.breakpoint
      ,data.operators[3].keyScale.depthL
      ,data.operators[3].keyScale.depthR
      //11    0   0   0 |  RC   |   LC  | SCL LEFT CURVE 0-3   SCL RGHT CURVE 0-3
      ,(curves.indexOf(data.operators[3].keyScale.curveR)<<2) + curves.indexOf(data.operators[3].keyScale.curveL)
      //12  |      DET      |     RS    | OSC DETUNE     0-14  OSC RATE SCALE 0-7
      ,((data.operators[3].detune +7 )<< 3)
      + (data.operators[3].keyScale.rate << 2)
      //  13    0   0 |    KVS    |  AMS  | KEY VEL SENS   0-7   AMP MOD SENS   0-3
      , (data.operators[3].velocitySens << 2) + data.operators[3].lfoAmpModSens
      //  14                OL              OP6 OUTPUT LEV 0-99
      ,data.operators[3].volume
      //  15    0 |         FC        | M | FREQ COARSE    0-31  OSC MODE       0-1
      , (Math.floor(data.operators[3].freq) << 1) + (data.operators[3].oscMode==="fixed"?1:0)
      //  16                FF              FREQ FINE      0-99
      ,Math.round(data.operators[3].freq%1 *100)

      ,data.operators[2].rates[0]
      ,data.operators[2].rates[1]
      ,data.operators[2].rates[2]
      ,data.operators[2].rates[3]
      ,data.operators[2].levels[0]
      ,data.operators[2].levels[1]
      ,data.operators[2].levels[2]
      ,data.operators[2].levels[3]
      ,data.operators[2].keyScale.breakpoint
      ,data.operators[2].keyScale.depthL
      ,data.operators[2].keyScale.depthR
      //11    0   0   0 |  RC   |   LC  | SCL LEFT CURVE 0-3   SCL RGHT CURVE 0-3
      ,(curves.indexOf(data.operators[2].keyScale.curveR)<<2) + curves.indexOf(data.operators[2].keyScale.curveL)
      //12  |      DET      |     RS    | OSC DETUNE     0-14  OSC RATE SCALE 0-7
      ,((data.operators[2].detune +7 )<< 3)
      + (data.operators[2].keyScale.rate << 2)
      //  13    0   0 |    KVS    |  AMS  | KEY VEL SENS   0-7   AMP MOD SENS   0-3
      , (data.operators[2].velocitySens << 2) + data.operators[2].lfoAmpModSens
      //  14                OL              OP6 OUTPUT LEV 0-99
      ,data.operators[2].volume
      //  15    0 |         FC        | M | FREQ COARSE    0-31  OSC MODE       0-1
      , (Math.floor(data.operators[2].freq) << 1) + (data.operators[2].oscMode==="fixed"?1:0)
      //  16                FF              FREQ FINE      0-99
      ,Math.round(data.operators[2].freq%1 *100)
      ,data.operators[1].rates[0]
      ,data.operators[1].rates[1]
      ,data.operators[1].rates[2]
      ,data.operators[1].rates[3]
      ,data.operators[1].levels[0]
      ,data.operators[1].levels[1]
      ,data.operators[1].levels[2]
      ,data.operators[1].levels[3]
      ,data.operators[1].keyScale.breakpoint
      ,data.operators[1].keyScale.depthL
      ,data.operators[1].keyScale.depthR
      //11    0   0   0 |  RC   |   LC  | SCL LEFT CURVE 0-3   SCL RGHT CURVE 0-3
      ,(curves.indexOf(data.operators[1].keyScale.curveR)<<2) + curves.indexOf(data.operators[1].keyScale.curveL)
      //12  |      DET      |     RS    | OSC DETUNE     0-14  OSC RATE SCALE 0-7
      ,((data.operators[1].detune +7 )<< 3)
      + (data.operators[1].keyScale.rate << 2)
      //  13    0   0 |    KVS    |  AMS  | KEY VEL SENS   0-7   AMP MOD SENS   0-3
      , (data.operators[1].velocitySens << 2) + data.operators[1].lfoAmpModSens
      //  14                OL              OP6 OUTPUT LEV 0-99
      ,data.operators[1].volume
      //  15    0 |         FC        | M | FREQ COARSE    0-31  OSC MODE       0-1
      , (Math.floor(data.operators[1].freq) << 1) + (data.operators[1].oscMode==="fixed"?1:0)
      //  16                FF              FREQ FINE      0-99
      ,Math.round(data.operators[1].freq%1 *100)

      ,data.operators[0].rates[0]
      ,data.operators[0].rates[1]
      ,data.operators[0].rates[2]
      ,data.operators[0].rates[3]
      ,data.operators[0].levels[0]
      ,data.operators[0].levels[1]
      ,data.operators[0].levels[2]
      ,data.operators[0].levels[3]
      ,data.operators[0].keyScale.breakpoint
      ,data.operators[0].keyScale.depthL
      ,data.operators[0].keyScale.depthR
      //11    0   0   0 |  RC   |   LC  | SCL LEFT CURVE 0-3   SCL RGHT CURVE 0-3
      ,(curves.indexOf(data.operators[0].keyScale.curveR)<<2) + curves.indexOf(data.operators[0].keyScale.curveL)
      //12  |      DET      |     RS    | OSC DETUNE     0-14  OSC RATE SCALE 0-7
      ,((data.operators[0].detune +7 )<< 3)
      + (data.operators[0].keyScale.rate << 2)
      //  13    0   0 |    KVS    |  AMS  | KEY VEL SENS   0-7   AMP MOD SENS   0-3
      , (data.operators[0].velocitySens << 2) + data.operators[0].lfoAmpModSens
      //  14                OL              OP6 OUTPUT LEV 0-99
      ,data.operators[0].volume
      //  15    0 |         FC        | M | FREQ COARSE    0-31  OSC MODE       0-1
      , (Math.floor(data.operators[0].freq) << 1) + (data.operators[0].oscMode==="fixed"?1:0)
      //  16                FF              FREQ FINE      0-99
      ,Math.round(data.operators[0].freq%1 *100)

      ,data.pitchEnvelope.rates[0]
      ,data.pitchEnvelope.rates[1]
      ,data.pitchEnvelope.rates[2]
      ,data.pitchEnvelope.rates[3]
      ,data.pitchEnvelope.levels[0]
      ,data.pitchEnvelope.levels[1]
      ,data.pitchEnvelope.levels[2]
      ,data.pitchEnvelope.levels[3]
      // 110    0   0 |        ALG        | ALGORITHM     0-31
      ,data.algorithm - 1
      // 111    0   0   0 |OKS|    FB     | OSC KEY SYNC  0-1    FEEDBACK      0-7
      ,((data.oscKeySync?1:0)<<3)
      + data.feedback
      // 112               LFS              LFO SPEED     0-99
      ,data.lfoSpeed
      // 113               LFD              LFO DELAY     0-99
      ,data.lfoDelay
      // 114               LPMD             LF PT MOD DEP 0-99
      ,data.lfoPitchModDepth
      // 115               LAMD             LF AM MOD DEP 0-99
      ,data.lfoAmpModDepth
      // 116  |  LPMS |      LFW      |LKS| LF PT MOD SNS 0-7   WAVE 0-5,  SYNC 0-1
      ,(data.lfoPitchModSens<<4)
      + (lfoWaves.indexOf(data.lfoWaveform) << 1)
      + (data.lfoSync?1:0)
      // 117              TRNSP             TRANSPOSE     0-48
      ,data.transpose
      // 118          NAME CHAR 1           VOICE NAME 1  ASCII
      ,data.name.charCodeAt(0)
      ,data.name.charCodeAt(1)
      ,data.name.charCodeAt(2)
      ,data.name.charCodeAt(3)
      ,data.name.charCodeAt(4)
      ,data.name.charCodeAt(5)
      ,data.name.charCodeAt(6)
      ,data.name.charCodeAt(7)
      ,data.name.charCodeAt(8)
      ,data.name.charCodeAt(9)

    ];

    const buffer = new Uint8Array(patch);

    this.setPatch(buffer);
  }

  patch(patchObj){
    //debugger;
    const opParams=['rates/0','rates/1','rates/2','rates/3','levels/0','levels/1','levels/2','levels/3'
      ,'keyScale/breakpoint','keyScale/depthL','keyScale/depthR','keyScale/curveL','keyScale/curveR'
      ,'keyScale/rate','lfoAmpModSens','velocitySens','volume','oscMode','freq','-','detune'
    ];
    const commonParams=['/pitchEnvelope/rates/0','/pitchEnvelope/rates/1','/pitchEnvelope/rates/2','/pitchEnvelope/rates/3'
      ,'/pitchEnvelope/levels/0','/pitchEnvelope/levels/1','/pitchEnvelope/levels/2','/pitchEnvelope/levels/3'
      ,'/algorithm','/feedback','/oscKeySync','/lfo/speed','/lfo/delay','/lfo/pitchModDepth','/lfo/ampModDepth'
      ,'/lfo/sync','/lfo/waveform','/lfo/pitchModSens','/transpose','/name'
    ];
    const curves = ['-LIN', '-EXP', '+EXP', '+LIN'];
    const lfoWaves = ["triangle", "sawDown", "sawUp", "square","sine","sampleHold"];

    for(let path in patchObj){
      let value = patchObj[path];

      const opMatch = path.match(/operators\/(\d)\/(.*)/);
      const fxMatch = path.match(/(chorus|delay)\/(.*)/);
      let index;
      if(opMatch) {
        const opOff = (5 - parseInt(opMatch[1], 10)) * 21;
        const idx = opParams.indexOf(opMatch[2]);
        if (idx === -1)debugger;
        index = opOff + idx;
        switch (idx) {
          case 11:
          case 12:
            value = curves.indexOf(value);
            break;
          case 17:
            value = value === 'ratio' ? 0 : 1;
            break;
          case 18: //freq
            //send 2 values one for fine one for coarse
            const fine = Math.round(value % 1 * 100);
            this.setParam(19, fine);
            value = Math.floor(value);
            break;
          case 20:
            value += 7;
            break;
        }
      }
       else if(fxMatch){
        //debugger;
        if(fxMatch[2]==='on') {
          this[fxMatch[1]].effect = value;
        }else{
          this[fxMatch[1]].value = value;
        }
        continue;
      }
      else{
        const idx = commonParams.indexOf(path);
        if(idx===-1)debugger;
        index=126+idx;

        switch(index){
          case 134:
            //	value -=1;
            break;
          case 136:
          case 141:
            value =value?1:0;
            break;
          case 142:
            value =lfoWaves.indexOf(value );
            break;

          case 145:
            //split name into charcodes
            //_dx7Parts[part].setParam(146,value.charCodeAt(1));
            //_dx7Parts[part].setParam(147,value.charCodeAt(2));
            //_dx7Parts[part].setParam(148,value.charCodeAt(3));
            //_dx7Parts[part].setParam(149,value.charCodeAt(4));
            //_dx7Parts[part].setParam(150,value.charCodeAt(5));
            //_dx7Parts[part].setParam(151,value.charCodeAt(6));
            //_dx7Parts[part].setParam(152,value.charCodeAt(7));
            //_dx7Parts[part].setParam(153,value.charCodeAt(8));
            //_dx7Parts[part].setParam(154,value.charCodeAt(9));

            value = value.charCodeAt(0);
            break;
        }
      }

      this.setParam(index,value);

    }
  }

  onMidiMessage(data){
    //TODO add CC handling
    /*
    {
    "title": "Frequency",
    "rect": [2, 3, 2, 1],
    "ui": "number",
    "doc": {"path": "/operators/0/freq", "range": [0, 31.99], "multipleOf": 0.01},
    "cm": {"control": "NRPN", "controlNo": [0, 1], "ranges": [{"range": [0, 3199]}]},
    "group": {"idParent": "op1"}
  }
  {
    "ui": "slider",
    "rect": [2, 5, 3, 1],
    "bipolar": true,
    "doc": {"path": "/operators/0/detune", "range": [-7, 7]},
    "cm": {"control": "CC", "controlNo": [13]},
    "title": "Detune",
    "group": {"idParent": "op1"}
  },
  {
    "title": "Frequency",
    "rect": [2, 7, 2, 1],
    "ui": "number",
    "doc": {"path": "/operators/1/freq", "range": [0, 31.99], "multipleOf": 0.01},
    "cm": {"control": "NRPN", "controlNo": [0, 2], "ranges": [{"range": [0, 3199]}]},
    "group": {"idParent": "op2"}
  },
  {
    "ui": "slider",
    "rect": [2, 8, 3, 1],
    "bipolar": true,
    "doc": {"path": "/operators/1/detune", "range": [-7, 7]},
    "cm": {"control": "CC", "controlNo": [14]},
    "title": "Detune",
    "group": {"idParent": "op2"}
  },
  {
    "title": "Frequency",
    "rect": [2, 11, 2, 1],
    "ui": "number",
    "doc": {"path": "/operators/2/freq", "range": [0, 31.99], "multipleOf": 0.01},
    "cm": {"control": "NRPN", "controlNo": [0, 3], "ranges": [{"range": [0, 3199]}]},
    "group": {"idParent": "op3"}
  },
  {
    "ui": "slider",
    "rect": [2, 12, 3, 1],
    "bipolar": true,
    "doc": {"path": "/operators/2/detune", "range": [-7, 7]},
    "cm": {"control": "CC", "controlNo": [15]},
    "title": "Detune",
    "group": {"idParent": "op3"},
    "minimum": 0,
    "maximum": 127
  },
  {
    "title": "Frequency",
    "rect": [2, 15, 2, 1],
    "ui": "number",
    "doc": {"path": "/operators/3/freq", "range": [0, 31.99], "multipleOf": 0.01},
    "cm": {"control": "NRPN", "controlNo": [0, 5], "ranges": [{"range": [0, 3199]}]},
    "group": {"idParent": "op4"}
  },
{
    "ui": "slider",
    "rect": [2, 16, 3, 1],
    "bipolar": true,
    "doc": {"path": "/operators/3/detune", "range": [-7, 7]},
    "cm": {"control": "CC", "controlNo": [16]},
    "title": "Detune",
    "group": {"idParent": "op4"},
    "minimum": 0,
    "maximum": 127
  },{
    "title": "Frequency",
    "rect": [2, 19, 2, 1],
    "ui": "number",
    "doc": {"path": "/operators/4/freq", "range": [0, 31.99], "multipleOf": 0.01},
    "cm": {"control": "NRPN", "controlNo": [0, 6], "ranges": [{"range": [0, 3199]}]},
    "group": {"idParent": "op5"}
  },{
    "ui": "slider",
    "rect": [2, 20, 3, 1],
    "bipolar": true,
    "doc": {"path": "/operators/4/detune", "range": [-7, 7]},
    "cm": {"control": "CC", "controlNo": [17]},
    "title": "Detune",
    "group": {"idParent": "op5"},
    "minimum": 0,
    "maximum": 127
  },
  {
    "title": "Frequency",
    "rect": [2, 23, 2, 1],
    "ui": "number",
    "doc": {"path": "/operators/5/freq", "range": [0, 31.99], "multipleOf": 0.01},
    "cm": {"control": "NRPN", "controlNo": [0, 7], "ranges": [{"range": [0, 3199]}]},
    "group": {"idParent": "op6"}
  },
  {
    "ui": "slider",
    "rect": [2, 24, 3, 1],
    "bipolar": true,
    "doc": {"path": "/operators/5/detune", "range": [-7, 7]},
    "cm": {"control": "CC", "controlNo": [18]},
    "title": "Detune",
    "group": {"idParent": "op6"}
  },
     */


    this.onMidi(data);
  }
}
