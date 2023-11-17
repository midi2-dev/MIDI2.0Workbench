/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
//const JSONFormatter = require('json-formatter-js').default;
let debugWin;
//const jqDebugList;
const loki = require('lokijs');
const midiDB = new loki('midiDB');
let dbs={};
//dbs.midi1 = midiDB.addCollection('midi1', { indices: ['tp'] });
dbs.ump = midiDB.addCollection('ump', { indices: ['tp'] });
dbs.sysex = midiDB.addCollection('sysex', { indices: ['tp'] });
dbs.pe = midiDB.addCollection('pe', { indices: ['tp'] });
dbs.udp = midiDB.addCollection('udp', { indices: ['tp'] });

exports.new = function(newtitle){
	if ( !(this instanceof exports.new) ) {
		return new exports.new(newtitle);
	}
	const debugObj={
		title:newtitle||''
		,peMsg:''
		,errors:[]
		,warnings:[]
		,sysexBreakdown:[]
		,sysex:[]
	};
	
	return{
		setTitle:function(title){debugObj.title=title;}
		,setSysex:function(sysex){debugObj.sysex=sysex;}
		,hasErrors : function (){
			return debugObj.errors.length;
		}
		,addError : function (msg,errorCode){
			debugObj.errors.push(msg);
			debugObj.errorCode = errorCode;
		}
		,addWarning : function (msg,errorCode){
			debugObj.warnings.push(msg);
			debugObj.warnCode = errorCode;
		}
		,getWarnings : function (){
			return debugObj.warnings;
		}
		,getErrors : function (){
			return debugObj.errors;
		}
		,getErrorCode : function (){
			return debugObj.errorCode;
		}
		,addDebug : function (offset,length,msg,value,opts){
			opts = opts || {};
			
			opts.start=offset;
			opts.end=offset+length;
			opts.msg=msg;
			opts.value=value;
			debugObj.sysexBreakdown.push(opts);
		}
		,msg:function(){
			exports.msg(debugObj);
		},
		getDebug:function(){
			return debugObj;
		}
	};
	
};


exports.setDebugWindow = function(newdebugWin){
	debugWin = newdebugWin;
};




exports.msg= function(type,data,dir,umpDev,group,errors,warnings) {
	const ts =new Date();
	const end = process.hrtime.bigint();
	const deviceName = global.umpDevices[umpDev]?.name || umpDev || '';
	let ins = {ts: ts.getTime(), data, dir
		,errors:errors || null
		,warnings: warnings || null,
		tp:end
		,deviceName
		,group
	};
	if(!dbs[type])debugger;

	if(type==='ump'){
		//debugActiveSenseClock
		const mt = data[0] >>> 28;
		if(mt===0x3 && !global.configSetting.debugUMPSysEx){
			return;
		}

		const status = (data[0] >>> 16) & 0xFF;
		if(mt===0x1 && [0xFE,0xF80].indexOf(status)!==-1 && !global.configSetting.debugActiveSenseClock){
			return;
		}

		if(warnings && warnings.length){
			warnings.map(e=>{
				global.logfile.write(' WARN:'+e+ "\n");
			});
			if(global.indexWindow)global.indexWindow.webContents.send('asynchronous-reply', 'increaseWarn',
				warnings.length);
			global._editWin.map(editWin=>{
				if(editWin._umpDev.umpDev === umpDev){
					editWin.webContents.send('asynchronous-reply', 'increaseWarn', warnings.length);
				}
			});
		}
		if(errors && errors.length){
			errors.map(e=>{
				global.logfile.write(' ERROR:'+e+ "\n");
			});
			if(global.indexWindow)global.indexWindow.webContents.send('asynchronous-reply', 'increaseError',
				errors.length);
			global._editWin.map(editWin=>{
				if(editWin._umpDev.umpDev === umpDev){
					editWin.webContents.send('asynchronous-reply', 'increaseError',
						errors.length);
				}
			});
		}

	}


	dbs[type].insert(ins);
	if (debugWin) debugWin.webContents.send('asynchronous-reply', 'debugMsg', {type, data:ins});

	if(type==='udp'){

		return;
	}

	if(data.warnings && data.warnings.length){
		data.warnings.map(e=>{
			global.logfile.write(' WARN:'+e+ "\n");
		});
		if(global.indexWindow)global.indexWindow.webContents.send('asynchronous-reply', 'increaseWarn', data.warnings.length);
		global._editWin.map(editWin=>{
			if(editWin._umpDev.umpDev === umpDev){
				editWin.webContents.send('asynchronous-reply', 'increaseWarn', data.warnings.length);
			}
		});
	}
	if(data.errors && data.errors.length){
		data.errors.map(e=>{
			global.logfile.write(' ERROR:'+e+ "\n");
		});
		if(global.indexWindow)global.indexWindow.webContents.send('asynchronous-reply', 'increaseError', data.errors.length);
		global._editWin.map(editWin=>{
			if(editWin._umpDev.umpDev === umpDev){
				editWin.webContents.send('asynchronous-reply', 'increaseError', data.errors.length);
			}
		});
	}

	if(!global.logfile || type==='pe'){

		return;
	}

	const datestring =  ("0" + ts.getMinutes()).slice(-2)
		+ ":" + ("0" + ts.getSeconds()).slice(-2)
		+ "." + ts.getMilliseconds()
	;
	let outData='';
	if(type ==='ump'){
		let outarr = []
		data.map(function(d){
			outarr = outarr.concat((d>>>0).toString(2).padStart(32,'0').split(''));
		});
		outData = outarr.join();
	}

	if(type==='sysex'  ){
		outData = arrayToHex(data.sysex);
	}

	if(type==='pe'){
		outData = JSON.stringify(data.header || data.headerText);
	}

	global.logfile.write([datestring,deviceName,group, dir, type, data.title].join("\t")+ "\n");
	global.logfile.write(outData+ "\n");


	if(type==='pe' && data.body){
		global.logfile.write(JSON.stringify(data.body,2,2)+ "\n");
	}
	if(type==='pe' && data.bodyText){
		global.logfile.write(data.bodyText+ "\n");
	}

	if(type==='sysex' && data.sysexBreakdown && data.sysexBreakdown.length > 1){

		data.sysexBreakdown.sort(function (a, b) {
			return a.start - b.start;
		});

		data.sysexBreakdown.map(function(syspart){
			let text = '[';
			if(syspart.compact){
				text +=arrayToHex(data.sysex.slice(syspart.start,syspart.start+2));
				text +='...';
				text +=arrayToHex(data.sysex.slice(syspart.end-2,syspart.end));
			}else{
				text +=arrayToHex(data.sysex.slice(syspart.start,syspart.end));
			}
			text +=']';
			let val = (syspart.value || '').toString();
			if(val==="true"){
				val="_true_";
			}
			if(val==="false"){
				val="_false_";
			}
			global.logfile.write(text+ "\t"+val+"\t"+syspart.msg+"\n");
		});
	}
	global.logfile.write('***********************************'+ "\n");
};

exports.msgUMPBreakUp = function(ump,dir,umpDev,group,errors,warnings){
	for(let i=0; i<ump.length;i++){
		const mt = ump[i] >>> 28;

		switch (mt) {
			case 0: //32 bits Utility Messages
			case 1: //32 bits Utility Messages
			case 2: //32 bits Utility Messages
			case 6: //32 bits Utility Messages
			case 7: //32 bits Utility Messages
				exports.msg('ump', [ump[i]],dir,umpDev,group,errors,warnings);
				break;
			case 3: //64 bits Utility Messages
			case 4: //64 bits Utility Messages
			case 8: //64 bits Utility Messages
			case 9: //64 bits Utility Messages
			case 0xA: //64 bits Utility Messages
				exports.msg('ump',  [ump[i++], ump[i]],dir,umpDev,group,errors,warnings);
				break;
			case 0xB: //96 bits Utility Messages
			case 0xC: //96 bits Utility Messages
				exports.msg('ump', [ump[i++],ump[i++], ump[i]],dir,umpDev,group,errors,warnings);
				break;
			default:
				exports.msg('ump',  [ump[i++],ump[i++],ump[i++], ump[i]],dir,umpDev,group,errors,warnings);
				break;

		}
	}
}


exports. getDebug = function(type, offset, limit){
	if(!dbs[type]) return [];

	return dbs[type].chain()
		.simplesort("tp",true)
		.offset(offset||0)
		.limit(limit||25)
		.data().reverse();

};

exports. clearDebug = function(type){
	if(!dbs[type]) return [];
	return dbs[type].clear({removeIndices:true});
};

function arrayToHex(arrHex, joinStr = ' '){
	//const arrHex = Array.from(arrHex);
	if(!arrHex)return '';
	return arrHex.map(function(v){return v==undefined?'??':/*"0x"+*/("00" + v.toString(16)).slice (-2).toUpperCase();}).join(joinStr);
	
}
exports.arrayToHex = arrayToHex;
