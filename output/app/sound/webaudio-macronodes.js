// Macro_Nodes
//https://github.com/g200kg/webaudio-macronodes
//

// Macro_ToneControlNode
//  Constructor ... new Macro_ToneControlNode(audioctx, options)
//  Parameters
//    AudioParam bass   ... gain for bass range in (dB)
//    AudioParam mid    ... gain for mid range in (dB)
//    AudioParam treble ... gain for treble range in (dB)
//    boolean effect    ... effect enable
//  Methods
//    getFrequencyResponse(Float32Array freq, Float32Array mag, Float32Array phase)
//   
exports.Macro_ToneControlNode =  class Macro_ToneControlNode extends GainNode {
  constructor(actx,opt){
    super(actx);

    // Internal nodes
    this._bass = new BiquadFilterNode(actx, {type:"lowshelf", frequency:300,q:0.1});
    this._mid = new BiquadFilterNode(actx, {type:"peaking", frequency:1000,q:0.1});
    this._treble= new BiquadFilterNode(actx, {type:"highshelf", frequency:3000,q:0.1});
    this._effect = true;
 
    // Export parameters
    this.bass = this._bass.gain;
    this.mid = this._mid.gain;
    this.treble = this._treble.gain;

    this._output = new GainNode(actx);
    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._bass).connect(this._mid).connect(this._treble).connect(this._output);

    // Options
    for(let k in opt){
      switch(k){
      case 'bass': this.bass.value = opt[k]; break;
      case 'mid':  this.mid.value = opt[k]; break;
      case 'treble': this.treble.value = opt[k]; break;
      case 'effect': this.effect = opt[k];
      }
    }
  }
  _outputConnect(to,output,input){
    return this._output.connect(to,output,input);
  }
  _outputDisconnect(to,output,input){
    return this._output.disconnect(to,output,input);
  }
  get effect() {
    return this._effect;
  }
  set effect(e) {
    if(e){
      this._treble.connect(this._output);
      this._inputDisconnect(this._output);
      this._effect = true;
    }
    else{
      this._treble.disconnect();
      this._inputConnect(this._output);
      this._effect = false;
    }
  }
  getFrequencyResponse(freq, mag, phase){
    const len = freq.length;
    const _mag = new Float32Array(len), _phase = new Float32Array(len);
    for(let i = 0; i < len; ++i)
      mag[i] = 1, phase[i] = 0;
    this._bass.getFrequencyResponse(freq, _mag, _phase);
    for(let j = 0; j < len; ++j){
      mag[j] *= _mag[j];
      phase[j] += _phase[j];
    }
    this._mid.getFrequencyResponse(freq, _mag, _phase);
    for(let j = 0; j < len; ++j){
      mag[j] *= _mag[j];
      phase[j] += _phase[j];
    }
    this._treble.getFrequencyResponse(freq, _mag, _phase);
    for(let j = 0; j < len; ++j){
      mag[j] *= _mag[j];
      phase[j] += _phase[j];
    }
  }
}

// Macro_GraphicEqNode
//   Constructor ... new Macro_GraphicEqNode(audioctx, options)
//   Parameters
//     AudioParam[] eq[] ... EQ gain for [100,200,400,800,1600,3200,6400] Hz in (dB)
//     boolean effect    ... effect enable
//   Methods
//     getFrequencyResponse(Float32Array freq, Float32Array mag, Float32Array phase)
//   
exports.Macro_GraphicEqNode =  class Macro_GraphicEqNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    const paramtable = [{t:"lowshelf",f:100}, {t:"peaking",f:200}, {t:"peaking",f:400}, {t:"peaking",f:800}
      ,{t:"peaking",f:1600}, {t:"peaking",f:3200}, {t:"highshelf",f:6400}];

    // Internal nodes && expose parameters
    this._filters = [];
    this.eq = [];
    this._effect = true;
    for(let i = 0; i < 7; ++i){
      this._filters[i] = new BiquadFilterNode(actx, {type:paramtable[i].t, frequency:paramtable[i].f});
      this.eq[i] = this._filters[i].gain;
    }
    this._output = new GainNode(actx);
    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._filters[0]).connect(this._filters[1]).connect(this._filters[2]).connect(this._filters[3])
      .connect(this._filters[4]).connect(this._filters[5]).connect(this._filters[6]).connect(this._output);

    // Options
    for(let k in opt){
      switch(k){
      case 'eq':
        for(let i=0;i<7;++i)
          this.eq[i].value = opt[k][i];
      case 'effect':
        this.effect = opt[k];
      }
    }
  }
  _outputConnect(to,output,input){
    return this._output.connect(to,output,input);
  }
  _outputDisconnect(to,output,input){
    return this._output.disconnect(to,output,input);
  }
  get effect() {
    return this._effect;
  }
  set effect(e) {
    if(e){
      this._filters[6].connect(this._output);
      if(!this._effect)
        this._inputDisconnect(this._output);
      this._effect = true;
    }
    else{
      this._effect = false;
      this._filters[6].disconnect();
      this._inputConnect(this._output);
    }
  }
  getFrequencyResponse(freq, mag, phase){
    const len = freq.length;
    const _mag = new Float32Array(len), _phase = new Float32Array(len);
    for(let i = 0; i < len; ++i)
      mag[i] = 1, phase[i] = 0;
    for(let i = 0; i < 7; ++i){
      this._filters[i].getFrequencyResponse(freq, _mag, _phase);
      for(let j = 0; j < len; ++j){
        mag[j] *= _mag[j];
        phase[j] += _phase[j];
      }
    }
  }
}

// Macro_ChorusNode
//   Constructor ... new Macro_ChorusNode(audioctx, options)
//   Parameters
//     AudioParam depth ... Chorus effect depth
//     AudioParam rate ... Chorus effect speed
//     boolean effect   ... Effect enable
//   
exports.Macro_ChorusNode =  class Macro_ChorusNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._effect = true;

    // Internal Nodes
    this._delay = new DelayNode(actx,{delayTime:0.03});
    this._depthRange = new GainNode(actx, {gain:0.003});
    this._depth = new GainNode(actx, {gain:0.5});
    this._output = new GainNode(actx);
    this._lfo = new OscillatorNode(actx,{frequency:4});

    // Expose paramters
    this.depth = this._depth.gain;
    this.rate = this._lfo.frequency;
    this.delay = this._delay.delayTime;

    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._delay).connect(this._output);
    this._inputConnect(this._output);
    this._lfo.connect(this._depth).connect(this._depthRange).connect(this._delay.delayTime);
    this._lfo.start();

    // Options setup
    for(let k in opt){
      switch(k){
      case 'depth': this.depth.value = opt[k];
        break;
      case 'rate': this.rate.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      case 'delay': this.delay.value = opt[k];
        break;
      }
    }
  }
  get effect() {
    return this._effect;
  }
  set effect(e) {
    if(e){
      this._delay.connect(this._output);
      this._effect = true;
    }
    else{
      this._delay.disconnect();
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}

// Macro_PhaserNode
//   Constructor ... new Macro_PhaserNode(audioctx, options)
//   Parameters
//     AudioParam depth ... Phaser effect depth
//     AudioParam rate ... Phaser effect speed
//     boolean effect   ... Effect enable
//   
exports.Macro_PhaserNode =  class Macro_PhaserNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._effect = true;

    // Internal Nodes
    this._filter1 = new BiquadFilterNode(actx, {type:"allpass", frequency:1100});
    this._filter2 = new BiquadFilterNode(actx, {type:"allpass", frequency:1100});
    this._depthRange = new GainNode(actx, {gain:1000});
    this._depth = new GainNode(actx, {gain:0.5});
    this._output = new GainNode(actx);
    this._lfo = new OscillatorNode(actx,{frequency:4});

    // Expose paramters
    this.depth = this._depth.gain;
    this.rate = this._lfo.frequency;
    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._filter1).connect(this._filter2).connect(this._output);
    this._inputConnect(this._output);
    this._lfo.connect(this._depth).connect(this._depthRange).connect(this._filter1.frequency);
    this._depthRange.connect(this._filter2.frequency);
    this._lfo.start();

    // Options setup
    for(let k in opt){
      switch(k){
      case 'depth': this.depth.value = opt[k];
        break;
      case 'rate': this.rate.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      }
    }
  }
  get effect() {
    return this._effect;
  }
  set effect(e) {
    if(e){
      this._filter2.connect(this._output);
      this._effect = true;
    }
    else{
      this._filter2.disconnect();
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}

// Macro_DeepPhaserNode
//   Constructor ... new Macro_ChorusNode(audioctx, options)
//   Parameters
//     AudioParam depth ... Phaser effect depth
//     AudioParam rate ... Phaser effect speed
//     AduioParam reso  ... Resonance
//     boolean effect   ... Effect enable
//   
exports.Macro_DeepPhaserNode =  class Macro_DeepPhaserNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._effect = true;

    // Internal Nodes
    this._filter1 = new BiquadFilterNode(actx, {type:"allpass", frequency:1100});
    this._filter2 = new BiquadFilterNode(actx, {type:"allpass", frequency:1100});
    this._filter3 = new BiquadFilterNode(actx, {type:"allpass", frequency:1100});
    this._reso = new GainNode(actx, {gain:0.5});
    this._delay = new DelayNode(actx, {delayTime:0.001});
    this._depthRange = new GainNode(actx, {gain:1000});
    this._depth = new GainNode(actx, {gain:0.5});
    this._output = new GainNode(actx);
    this._lfo = new OscillatorNode(actx,{frequency:4});

    // Expose paramters
    this.depth = this._depth.gain;
    this.rate = this._lfo.frequency;
    this.reso = this._reso.gain;

    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._filter1).connect(this._filter2).connect(this._filter3).connect(this._output);
    this._inputConnect(this._output);
    this._lfo.connect(this._depth).connect(this._depthRange).connect(this._filter1.frequency);
    this._depthRange.connect(this._filter2.frequency);
    this._depthRange.connect(this._filter3.frequency);
    this._filter3.connect(this._delay).connect(this._reso).connect(this._filter1);
    this._lfo.start();

    // Options setup
    for(let k in opt){
      switch(k){
      case 'depth': this.depth.value = opt[k];
        break;
      case 'rate': this.rate.value = opt[k];
        break;
      case 'reso': this._reso.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      }
    }
  }
  get effect() {
    return this._effect;
  }
  set effect(e) {
    if(e){
      this._filter3.connect(this._output);
      this._effect = true;
    }
    else{
      this._filter3.disconnect(this._output);
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}

// Macro_DelayNode
//   Constructor ... new Macro_DelayNode(audioctx, options)
//   Parameters
//     AudioParam delayTime ... Delay time in sec
//     AudioParam feedback  ... Delay feedback level
//     AudioParam mix       ... Delay mix ratio
//     boolean effect       ... Effect enable
//   
exports.Macro_DelayNode =  class Macro_DelayNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._effect = true;

    // Internal Nodes
    this._delay = new DelayNode(actx, {delayTime:0.5});
    this._mix = new GainNode(actx, {gain:0.5});
    this._feedback = new GainNode(actx, {gain:0.5});
    this._output = new GainNode(actx, {gain:1.0});

    // Export parameters
    this.delayTime = this._delay.delayTime;
    this.feedback = this._feedback.gain;
    this.mix = this._mix.gain;

    // Options setup
    for(let k in opt){
      switch(k){
      case 'delayTime': this.delayTime.value = opt[k];
        break;
      case 'feedback': this.feedback.value = opt[k];
        break;
      case 'mix': this.mix.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      }
    }

    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._delay).connect(this._mix).connect(this._output);
    this._inputConnect(this._output);
    this._delay.connect(this._feedback).connect(this._delay);
  }
  get effect() { return this._effect; }
  set effect(e) {
    if(e){
      this._mix.connect(this._output);
      this._effect = true;
    }
    else{
      this._mix.disconnect();
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}

// Macro_PingPongDelayNode
//   Constructor ... new Macro_DelayNode(audioctx, options)
//   Parameters
//     AudioParam delayTime ... Delay time in sec [0..1]
//     AudioParam feedback  ... Delay feedback level [0..1]
//     AudioParam mix       ... Delay mix ratio [0..1]
//     boolean effect       ... Effect enable
//   
exports.Macro_PingPongDelayNode =  class Macro_PingPongDelayNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._effect = true;

    // Internal Nodes
    this._delay1 = new DelayNode(actx, {delayTime:0.5});
    this._delay2 = new DelayNode(actx, {delayTime:0.5});
    this._merger = new ChannelMergerNode(actx);
    this._constant = new ConstantSourceNode(actx, {offset:0.5});
    this._mix = new GainNode(actx, {gain:0.5});
    this._feedback = new GainNode(actx, {gain:0.5});
    this._output = new GainNode(actx, {gain:1.0});

    // Export parameters
    this.delayTime = this._constant.offset;
    this.feedback = this._feedback.gain;
    this.mix = this._mix.gain;

    // Options setup
    for(let k in opt){
      switch(k){
      case 'delayTime': this.delayTime.value = opt[k];
        break;
      case 'feedback': this.feedback.value = opt[k];
        break;
      case 'mix': this.mix.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      }
    }

    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._delay1).connect(this._delay2).connect(this._merger,0,0).connect(this._mix).connect(this._output);
    this._delay1.connect(this._merger,0,1);
    this._inputConnect(this._output);
    this._delay2.connect(this._feedback).connect(this._delay1);
    this._constant.connect(this._delay1.delayTime);
    this._constant.connect(this._delay2.delayTime);
    this._constant.start();
  }
  get effect() { return this._effect; }
  set effect(e) {
    if(e){
      this._mix.connect(this._output);
      this._effect = true;
    }
    else{
      this._mix.disconnect();
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}

// Macro_BitCrusherNode
//   Constructor ... new Macro_BitCrusherNode(audioctx, options)
//   Parameters
//     AudioParam bits ... Bit Depth [0..1]
//     boolean effect  ... Effect enable
//   
exports.Macro_BitCrusherNode =  class Macro_BitCrusherNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._curve = new Float32Array(1023);
    for(let i = 0; i < 512; ++i){
      const v=((i / 512) * 128 | 0) / 128;
      this._curve[511+i]=v;
      this._curve[511-i]=-v;
    }
    this._incurve = new Float32Array(10);
    this._outcurve = new Float32Array(10);
    for(let i = 0, d = 64; i < 6; ++i, d *= 0.5){
      this._outcurve[4+i] = d; 
      this._incurve[4+i] = 1/d;
      this._outcurve[i] = 64;
      this._incurve[i] = 1/64;
    }
    this._effect = true;

    // Internal Nodes
    this._ingain = new GainNode(actx,{gain:0});
    this._shaper = new WaveShaperNode(actx,{curve:this._curve});
    this._incurve = new WaveShaperNode(actx,{curve:this._incurve});
    this._outcurve = new WaveShaperNode(actx,{curve:this._outcurve});
    this._outgain = new GainNode(actx, {gain:0});
    this._output = new GainNode(actx);
    this._bitsinput = new ConstantSourceNode(actx, {offset:0});
    this._bitsgain = new GainNode(actx, {gain:1/8});

    // Export parameters
    this.bits = this._bitsinput.offset;
    this.level = this._output.gain;

    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._ingain).connect(this._shaper).connect(this._outgain).connect(this._output);
    this._bitsinput.connect(this._bitsgain).connect(this._incurve).connect(this._ingain.gain);
    this._bitsgain.connect(this._outcurve).connect(this._outgain.gain);
    this._bitsinput.start();

    // Options setup
    for(let k in opt){
      switch(k){
      case 'bits': this.bits.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      }
    }
  }
  get effect() { return this._effect; }
  set effect(e) {
    if(e){
      this._outgain.connect(this._output);
      this._inputDisconnect(this._output);
      this._effect = true;
    }
    else{
      this._outgain.disconnect();
      this._inputConnect(this._output);
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}

// Macro_OverDriveNode
//   Constructor ... new Macro_OverDriveNode(audioctx, options)
//   Parameters
//     AudioParam drive ... Drive [0..1]
//     boolean effect   ... Effect enable
//   
exports.Macro_OverDriveNode = class Macro_OverDriveNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._curve = new Float32Array(1024);
    this._curve[511] = 0;
    for(let i = 0; i < 512; ++i){
      const r=Math.tanh(4*i/512)*0.5;
      this._curve[512+i]=r;
      this._curve[511-i]=-r;
    }
    this._ingaincurve = new Float32Array(101);
    this._outgaincurve = new Float32Array(3);
    for(let i = 0; i < 101; ++i){
      this._ingaincurve[i] = 0.25;
    }
    for(let i = 52, d1 = 0.25; i < 101; ++i, d1 *= 1.1){
      this._ingaincurve[i] = d1;
    }
    this._outgaincurve = new Float32Array([2,2,2,2,2,0.9,0.5,0.35,0.3]);
    this._effect = true;

    // Internal Nodes
    this._ingain = new GainNode(actx,{gain:0});
    this._outgain = new GainNode(actx,{gain:0});
    this._shaper = new WaveShaperNode(actx,{curve:this._curve});
    this._ingainshaper = new WaveShaperNode(actx,{curve:this._ingaincurve});
    this._outgainshaper = new WaveShaperNode(actx,{curve:this._outgaincurve});
    this._level = new GainNode(actx, {gain:1});
    this._output = new GainNode(actx);
    this._driveinput = new ConstantSourceNode(actx, {offset:0});

    // Export parameters
    this.drive = this._driveinput.offset;
    this.level = this._level.gain;

    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._ingain).connect(this._shaper).connect(this._outgain).connect(this._level).connect(this._output);
    this._driveinput.connect(this._ingainshaper).connect(this._ingain.gain);
    this._driveinput.connect(this._outgainshaper).connect(this._outgain.gain);
    this._driveinput.start();

    // Options setup
    for(let k in opt){
      switch(k){
      case 'drive': this.drive.value = opt[k];
        break;
      case 'level': this.level.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      }
    }
  }
  get effect() { return this._effect; }
  set effect(e) {
    if(e){
      this._level.connect(this._output);
      this._inputDisconnect(this._output);
      this._effect = true;
    }
    else{
      this._level.disconnect();
      this._inputConnect(this._output);
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}

// Macro_FuzzNode
//   Constructor ... new Macro_OverDriveNode(audioctx, options)
//   Parameters
//     AudioParam fuzz ... Fuzz [0..1]
//     boolean effect   ... Effect enable
//   
exports.Macro_FuzzNode = class Macro_FuzzNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._curve = new Float32Array(1024);
    this._curve[511] = 0;
    for(let i = 0; i < 512; ++i){
      const r = Math.tanh(4*i/512)*0.5;
      const v = 1-(i/512);
      this._curve[512+i]=r;
      this._curve[511-i]=r*Math.pow(v,4);
    }
    this._effect = true;

    // Internal Nodes
    this._ingain1 = new GainNode(actx,{gain:1});
    this._ingain2 = new GainNode(actx,{gain:-1});
    this._shaper1 = new WaveShaperNode(actx,{curve:this._curve});
    this._shaper2 = new WaveShaperNode(actx,{curve:this._curve});
    this._outgain1 = new GainNode(actx,{gain:1});
    this._outgain2 = new GainNode(actx,{gain:-1});
    this._level = new GainNode(actx, {gain:1});
    this._output = new GainNode(actx);
    this._outfilter = new BiquadFilterNode(actx,{type:"highpass",frequency:80});
    this._driveinput = new ConstantSourceNode(actx, {offset:0});

    // Export parameters
    this.fuzz = this._driveinput.offset;
    this.level = this._level.gain;

    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._ingain1).connect(this._shaper1).connect(this._outgain1).connect(this._outfilter).connect(this._level).connect(this._output);
    this._inputConnect(this._ingain2).connect(this._shaper2).connect(this._outgain2).connect(this._outfilter);
    this._driveinput.connect(this._outgain2.gain);
    this._driveinput.start();

    // Options setup
    for(let k in opt){
      switch(k){
      case 'fuzz': this.fuzz.value = opt[k];
        break;
      case 'level': this.level.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      }
    }
  }
  get effect() { return this._effect; }
  set effect(e) {
    if(e){
      this._level.connect(this._output);
      this._inputDisconnect(this._output);
      this._effect = true;
    }
    else{
      this._level.disconnect();
      this._inputConnect(this._output);
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}

// Macro_AutoWahNode
//  Constructor ... new Macro_AutoWahNode(audioctx, options)
//  Parameters
//    AudioParam frequency ... Frequency [0..1]
//    AudioParam sense     ... Sensitivity [0..1]
//    AudioParam Q         ... Filter Q [1..20]
//    boolean effect       ... Effect enable
//   
exports.Macro_AutoWahNode =  class Macro_AutoWahNode extends GainNode {
  constructor(actx,opt){
    super(actx);
    this._effect = true;

    // Internal Nodes
    this._shaper = new WaveShaperNode(actx, {curve:new Float32Array([1,1,1,0,1,1,1])});
    this._envfilt = new BiquadFilterNode(actx, {type:"lowpass", frequency:10, Q:0.7});
    this._envgain = new GainNode(actx, {gain:2});
    this._envrange = new GainNode(actx, {gain:1200});
    this._filter = new BiquadFilterNode(actx, {type:"bandpass", frequency:100, Q:0.5});
    this._output = new GainNode(actx);

    // Export parameters
    this.frequency = this._filter.frequency;
    this.Q = this._filter.Q;
    this.sense = this._envgain.gain;

    this._inputConnect = this.connect;        // input side, connect of super class
    this._inputDisconnect = this.disconnect;  // input disconnect of super class
    this.connect = this._outputConnect;       // connect() method of output
    this.disconnect = this._outputDisconnect; // disconnect() method of output

    this._inputConnect(this._filter).connect(this._output);
    this._inputConnect(this._shaper).connect(this._envfilt).connect(this._envgain).connect(this._envrange).connect(this._filter.detune);

    // Options setup
    for(let k in opt){
      switch(k){
      case 'frequency': this.frequency.value = opt[k];
        break;
      case 'Q': this.Q.value = opt[k];
        break;
      case 'sense': this.sense.value = opt[k];
        break;
      case 'effect': this.effect = opt[k];
        break;
      }
    }
  }
  get effect() { return this._effect; }
  set effect(e) {
    if(e){
      this._filter.connect(this._output);
      this._inputDisconnect(this._output);
      this._effect = true;
    }
    else{
      this._filter.disconnect();
      this._inputConnect(this._output);
      this._effect = false;
    }
  }
  _outputConnect(to,output,input){ return this._output.connect(to,output,input); }
  _outputDisconnect(to,output,input){ return this._output.disconnect(to,output,input); }
}




