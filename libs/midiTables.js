/**
 * midiTables.js
 * This is a list of helpful data when using MIDI Calls
 *
 *
 * @license MIT
 * @version 0.4
 * @author  Andrew Mee, https://github.com/starfishmod/
 * @created 2017-06-20
 * @updated 2017-12-08
 *
 *
 */




exports.controlChangeTypes =[
	'Bank Select(MSB)'
	,'Modulation(MSB)'
	,'Breath Controller(MSB)'
	,''
	,'Foot Controller(MSB)'
	,'Portamento Time(MSB)'
	,'Data Entry (MSB)'
	,'Volume(MSB)'
	,'Balance(MSB)'
	,''
	,'Pan(MSB)'
	,'Expression(MSB)'
	,'Effect Controller 1(MSB)'
	,'Effect Controller 2(MSB)'
	,''
	,''
	,'General Purpose Controller 1(MSB)'
	,'General Purpose Controller 2(MSB)'
	,'General Purpose Controller 3(MSB)'
	,'General Purpose Controller 4(MSB)'
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,'Bank Select (LSB)'
	,'Modulation Wheel (LSB)'
	,'Breath Controller (LSB)'
	,''
	,'Foot Controller (LSB)'
	,'Portamento Time (LSB)'
	,'Data Entry (LSB)'
	,'Channel Volume (LSB)'
	,'Balance (LSB)'
	,''
	,'Pan (LSB)'
	,'Expression (LSB)'
	,'Effect Control 1 (LSB)'
	,'Effect Control 2 (LSB)'
	,''
	,''
	,'General Purpose Controller 1(LSB)'
	,'General Purpose Controller 2(LSB)'
	,'General Purpose Controller 3(LSB)'
	,'General Purpose Controller 4(LSB)'
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,'Sustain Pedal'
	,'Portamento On/Off'
	,'Sostenuto'
	,'Soft Pedal'
	,'Legato FootSwitch'
	,'Hold 2'
	,'Sound Controller 1 (default: Sound Variation)'
	,'Sound Controller 2 (default: Timbre / Harmonic Quality)'
	,'Sound Controller 3 (default: Release Time)'
	,'Sound Controller 4 (default: Attack)'
	,'Sound Controller 5 (default: Brightness)'
	,'Sound Controller 6 (GM2 default: Decay Time)'
	,'Sound Controller 7 (GM2 default: Vibrato Rate)'
	,'Sound Controller 8 (GM2 default: Vibrato Depth)'
	,'Sound Controller 9 (GM2 default: Vibrato Delay)'
	,'Sound Controller 10 (GM2 default: Undefined) '
	,'General Purpose Controller 5'
	,'General Purpose Controller 6'
	,'General Purpose Controller 7'
	,'General Purpose Controller 8'
	,'Portamento Control'
	,''
	,''
	,''
	,''
	,''
	,''
	,'Effects 1 Depth (default: Reverb Send)'
	,'Effects 2 Depth (default: Tremolo Depth)'
	,'Effects 3 Depth (default: Chorus Send)'
	,'Effects 4 Depth (default: Celeste [Detune] Depth)'
	,'Effects 5 Depth (default: Phaser Depth)'
	,'Data Increment (NRPN)'
	,'Data Decrement (NRPN)'
	,'Non-Registered Parameter Number (LSB)'
	,'Non-Registered Parameter Number(MSB)'
	,'Registered Parameter Number (LSB)'
	,'Registered Parameter Number(MSB)'
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,''
	,'All Sound Off'
	,'Reset All Controllers'
	,'Local On/Off'
	,'All Notes Off'
	,'Omni Mode Off'
	,'Omni Mode On'
	,'Mono Mode'
	,'Poly Mode'
];


exports.RPNList=[
	['Pitch Bend Sensitivity','0,0']
	,['Fine Tuning','0,1']
	,['Coarse Tuning','0,2']
	,['Modulation Depth Range','0,5']
	,['RPN null','127,127']
];

exports.clockTicksByNote = [
	['1/64 Note','6']
	,['1/32 Note','12']
	,['1/16 Note','24']
	,['1/8 Note','48']
	,['1/4 Note','96']
	,['1/2 Note','192']
	,['1 bar','384']
] ;


