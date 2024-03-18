/*
Code adapted from https://github.com/mosmeh/syntw under MIT License
mosmeh.github.io/syntw/
Modified by Andrew Mee 2021 for MIDI 2.0 Workbench
*/

const Tone = require('tone');
const {Macro_ChorusNode} = require("../webaudio-macronodes");

const NUM_DRAWBARS = 9;

class Synth {
    async setup() {
        const context = Tone.getContext();
        await context.addAudioWorkletModule(__dirname+'/synth.js','main');


        // await context.addAudioWorkletModule(worklet, 'main');
        const workletNode = context.createAudioWorkletNode('main', {
            numberOfInputs: 0,
            numberOfOutputs: 2,
            outputChannelCount: [2, 2],
        });
        this._port = workletNode.port;

        const rotaryReverb = new Tone.Reverb().set({
            wet: 0.3,
            decay: 0.5,
            preDelay: 0.01,
        });

        const masterReverb = new Tone.Reverb().set({
            wet: 0.5,
            decay: 0.5,
            preDelay: 0.01,
        });
        this._gain = new Tone.Gain(1);

        this._chorus =  new Macro_ChorusNode(context._context._nativeContext);
        this._chorus.effect = true;
        this._chorus.depth.value = 0;
        this._chorus.rate.value = 7;
        this._chorus.delay.value = 0;

        workletNode._nativeAudioNode
            .connect(this._chorus)
            .connect(context._context._nativeAudioContext.destination);
        this._chorusType='V1';
        this._chorusOn=false;
    }

    setChorusVibrato(chorusVibrato) {
        //{on: true, type: 'V1'}
        if(!chorusVibrato.on) {
            this._chorus.depth.value = 0;
            this._chorus.delay.value = 0;
        }else {

            switch (chorusVibrato.type) {
                /*
                V1 Small Vibrato V2 Wide Vibrato V3 Full Vibrato
                C1 Small Chorus C2 Wide Chorus C3 Full Chorus
                */
                case 'C1':
                    this._chorus.delay.value = 0.03;
                    this._chorus.depth.value = 0.1;
                    break;
                case 'C2':
                    this._chorus.delay.value = 0.03;
                    this._chorus.depth.value = 0.25;
                    break;
                case 'C3':
                    this._chorus.delay.value = 0.03;
                    this._chorus.depth.value = 0.4;
                    break;
                case 'V1':
                    this._chorus.delay.value = 0;
                    this._chorus.depth.value = 0.1;
                    break;
                case 'V2':
                    this._chorus.delay.value = 0;
                    this._chorus.depth.value = 0.25;
                    break;
                case 'V3':
                    this._chorus.delay.value = 0;
                    this._chorus.depth.value = 0.4;
                    break;
            }
        }
    }

    volume(value) {
        this._gain.gain.value = value;
    }

    drawbars(value) {
        this._port.postMessage({
            type: 'drawbars',
            drawbars: value,
        });
    }

    crosstalk(value) {
        this._port.postMessage({
            type: 'crosstalk',
            crosstalk: value,
        });
    }

    keyClickVolume(volume) {
        this._port.postMessage({
            type: 'keyClick',
            volume,
        });
    }

    setPercussionState({ on, volume, decay, harmonic }) {
        this._port.postMessage({
            type: 'percussion',
            on,
            volume,
            decay,
            harmonic,
        });
    }

    setRotaryState({ on, speed }) {
        this._port.postMessage({
            type: 'rotarySpeaker',
            on,
            speed,
        });
    }

    noteOn(note) {
        this._port.postMessage({
            type: 'noteOn',
            note,
        });
    }

    noteOff(note) {
        this._port.postMessage({
            type: 'noteOff',
            note,
        });
    }

    sustain(down) {
        this._port.postMessage({
            type: 'sustain',
            down,
        });
    }
}

exports.setupSynth = class setupSynth {

   constructor() {
       this.midiChannel = 0;
       Tone.start();
       this.setup();

    }

    async setup (){
       this.synth = new Synth();
        await this.synth.setup();
        this.volume = 1;
        this.expression = 1;
        this.synth.volume(1);
        this.synth.keyClickVolume(0.5);
        this.crosstalk = 0;


        this.drawbars = new Array(NUM_DRAWBARS);
        for (let i = 0; i < NUM_DRAWBARS; ++i) {
            this.drawbars[i] = 4;
        }
        this.synth.drawbars(this.drawbars);
        this.percState = {on: true, volume: 'soft', decay: 'fast', harmonic: 'third'};
        this.synth.setPercussionState(this.percState);
        this.setRotaryState(false, 2);

        this.chorusVibrato = {on: true, type: 'V1'};
        this.synth.setChorusVibrato(this.chorusVibrato);

        this.rpn={};
    }

    setPercOn(onOff){ //bool
        this.percState.on = onOff;
        this.synth.setPercussionState(this.percState);
    }

    setPercVolume(softNormal){ //['soft', 'normal']
        this.percState.volume = softNormal;
        this.synth.setPercussionState(this.percState);
    }

    setPercDecay(decay){ //['fast', 'slow']
        this.percState.decay = decay;
        this.synth.setPercussionState(this.percState);
    }

    setPercHarmonic(harmonic){ //['third', 'second']
        this.percState.harmonic = harmonic;
        this.synth.setPercussionState(this.percState);
    }

    setChorusOnOff(onOff){ //bool
        this.chorusVibrato.on = onOff;
        this.synth.setChorusVibrato(this.chorusVibrato);
    }

    setChorusType(type){ //bool
        this.chorusVibrato.type = type;
        this.synth.setChorusVibrato(this.chorusVibrato);
    }

    setVolume(vol){ //0 - 1
        this.volume = vol;
        this.synth.volume(this.volume * this.expression);
    }

    setExpression(vol){ //0 - 1
        this.expression = vol;
        this.synth.volume(this.volume * this.expression);
    }

    setKeyClick(vol){ //0 - 1
        this.synth.keyClickVolume(vol);
    }

    setDrawbar(idx, lvl){ //0 - 8
        this.drawbars[idx] = lvl;
        this.synth.drawbars(this.drawbars);
        //this.setCrossTalk(this.crosstalk);
    }

    setCrossTalk(lvl){
       this.crosstalk = lvl;
       this.synth.crosstalk(lvl);
    }

    setRotaryState(rotaryOn,rotarySpeed ) {
        this.synth.setRotaryState({
            on: rotaryOn,
            speed: +rotarySpeed, //0-4
        });
    }

    noteOnMidi(note) {
        this.synth.noteOn(+note);
    }
    noteOffMidi(note) {
        this.synth.noteOff(+note);
    }

    setMidiChannel(channel){
        this.midiChannel = channel;
    }

    onMidiMessage(data) {
       if(this.midiChannel !== (data[0] & 0xf)){
           return;
       }
        switch (data[0] & 0xf0) {
            case 0x90:
                if (data[2] > 0) {
                    this.noteOnMidi(data[1]);
                } else {
                    this.noteOffMidi(data[1]);
                }
                break;
            case 0x80:
                this.noteOffMidi(data[1]);
                break;
            case 0xB0:
                if (data[1] === 64) { //Sustain
                    this.synth.sustain(data[2] >= 64);
                }
                if (data[1] === 7) { //Sustain
                    this.setVolume(data[2] /127);
                }
                if (data[1] ===11) { //Expression
                    this.setExpression(data[2] /127);
                }
                //setExpression
                if(~[6,38,98,99,100,101].indexOf(data[1])){
                    switch(data[1]) {
                        case 101:
                            this.rpn.type='RPN';
                            this.rpn.msbIndex=data[2];
                            break;
                        case 100:
                            this.rpn.type='RPN';
                            this.rpn.lsbIndex=data[2];
                            break;
                        case 99:
                            this.rpn.type='NRPN';
                            this.rpn.msbIndex=data[2];
                            break;
                        case 98:
                            this.rpn.type='NRPN';
                            this.rpn.lsbIndex=data[2];
                            break;
                        case 6:
                            if(this.rpn.type==='RPN'){
                                if(this.rpn.msbIndex===0x40){
                                    switch(this.rpn.lsbIndex){
                                        case 0x39:{ //Vibrato / Chorus Type
                                            if(data[2]<0x16){
                                                this.setChorusType('V1');
                                            }else if(data[2]<0x2B){
                                                this.setChorusType('C1');
                                            }else if(data[2]<0x40){
                                                this.setChorusType('V2');
                                            }else if(data[2]<0x55){
                                                this.setChorusType('C2');
                                            }else if(data[2]<0x70){
                                                this.setChorusType('V3');
                                            }else{
                                                this.setChorusType('C3');
                                            }
                                            break;
                                        }
                                        case 0x3A:{ //Vibrato Chorus Off/On
                                            this.setChorusOnOff(data[2]>=64);
                                            break;
                                        }
                                        case 0x3B:{ //Percussion Off/On
                                            this.setPercOn(data[2]>=64);
                                            break;
                                        }
                                        case 0x3C:{ //Percussion Normal/Soft
                                            this.setPercVolume(data[2]>=64?'soft':'normal');
                                            break;
                                        }
                                        case 0x3D:{ //Percussion Slow/Fast
                                            this.setPercDecay(data[2]>=64?'fast':'slow');
                                            break;
                                        }
                                        case 0x3E:{ //Percussion Type 2nd/3rd
                                            this.setPercHarmonic(data[2]>=64?'third':'second');
                                            break;
                                        }
                                        default:
                                            this.rpn.msbValue=data[2];
                                            break;

                                    }
                                }
                            }
                            break;
                        case 38:
                            if(this.rpn.type==='RPN') {
                                if (this.rpn.msbIndex === 0x40) {
                                    switch (this.rpn.lsbIndex) {
                                        case 0x30:
                                        case 0x31:
                                        case 0x32:
                                        case 0x33:
                                        case 0x34:
                                        case 0x35:
                                        case 0x36:
                                        case 0x37:
                                        case 0x38:
                                        { //Amount of Key Click
                                            this.setDrawbar( this.rpn.lsbIndex - 0x30,
                                                ((this.rpn.msbValue<< 7) + data[2])/16838
                                            );
                                            break;
                                        }
                                        case 0x41: { //Amount of Key Click
                                            this.setKeyClick(
                                                ((this.rpn.msbValue<< 7) + data[2])/16838
                                            );
                                            break;
                                        }
                                        case 0x42: { //Amount of Crosstalk/Leakage
                                            this.setCrossTalk(
                                                ((this.rpn.msbValue<< 7) + data[2])/16838
                                            );
                                            break;
                                        }
                                    }
                                }
                            }

                            break;
                    }
                }
                break;
        }
    }
}


