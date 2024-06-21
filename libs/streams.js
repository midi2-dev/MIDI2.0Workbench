/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
function now() {
	const end = process.hrtime();
	return Math.round((end[0]*1000) + (end[1]/1000000));
}

exports.now = now;
exports.streamIn = function(){
	const currentStreams={};
	return {
		add:function(streamId){
			currentStreams[streamId] = {header:[],propertyData:[],currentChunk:0};
		}
		,update:function(streamId,headerPayload,bodyPayload,currentChunk){
			currentStreams[streamId].currentChunk = currentChunk;
			if(headerPayload && headerPayload.length){
				currentStreams[streamId].header.push(...headerPayload)
			}
			if(bodyPayload && bodyPayload.length){
				currentStreams[streamId].propertyData.push(...bodyPayload)
			}
		}
		
		,get:function(streamId){
			return  currentStreams[streamId] || {header: [], propertyData: [], currentChunk:0};
		}
		,close:function(streamId){
			delete currentStreams[streamId];
		}
	}
	
};

exports.streamOut = function(numberOfStreams,timeOut=5,sysexTimer = 20){
	const streamAmount = numberOfStreams;

	if(!sysexTimer){
		//debugger;
	}
	
	let streamList = Array.apply(null, {length: streamAmount}).map(Number.call, Number);

	let queue = [];

	let currentStreams = {};



	const closeStream = (streamId,_reason) => {
		const reason = _reason || 'close';
		const stream = currentStreams[streamId];
		if(stream){
			stream.cb(streamId,reason,stream);
		}
		delete currentStreams[streamId];
		streamList.push(streamId);
		addToStreams();
	}

	const sendNextChunk = (streamId,streamObj) =>{
		let totalPayloadLeft = streamObj.data.maxPayload;
		let payloadHeaderChunk = [];
		let payloadBodyChunk = [];
		if(streamObj.chunkNumber > streamObj.data.chunkTotal){
			return; //Stop sending a duplicate last chunk upon a MIDI Receipt message
		}

		if(!streamObj.headerSent){
			payloadHeaderChunk = streamObj.data.payloadHeader.slice(streamObj.start, streamObj.start + streamObj.data.maxPayload);
			totalPayloadLeft -= payloadHeaderChunk.length;
			streamObj.start+=payloadHeaderChunk.length;
			if(streamObj.start + streamObj.data.maxPayload > streamObj.data.payloadHeader.length){
				streamObj.headerSent=true;
				streamObj.start=0;
			}
		}

		if(totalPayloadLeft>0){
			payloadBodyChunk = streamObj.data.payloadBody.slice(streamObj.start, streamObj.start + totalPayloadLeft );
			streamObj.start+=payloadBodyChunk.length;
		}

		payloadHeaderChunk.map(function (v) {
			if(v > 127 ) debugger;
		});

		streamObj.cb(
			parseInt(streamId,10)
			,"chunk",
			{
				...streamObj
				,payloadHeaderChunk:payloadHeaderChunk
				,payloadBodyChunk:payloadBodyChunk
				,streamId:parseInt(streamId,10)
			}
		);

		if(payloadBodyChunk.length){
			//console.log("payload size :"+payloadBodyChunk.length);
//				console.log((Array.from(payloadBodyChunk)).join());
		}

		if(streamObj.data.chunkTotal>1){
			console.log("sent sysex:"+now()+'--' +streamId+ ':' + streamObj.chunkNumber+" "+ streamObj.data.chunkTotal);
			//await timer(700);

		}
		if(streamObj.chunkNumber!==streamObj.data.chunkTotal){
			streamObj.lastUpdate = now();
			currentStreams[streamId].lastUpdate = now();
			if(!streamObj.data.awaitAck){
				//console.log("next sysex:"+ (now()+sysexTimer));
				setTimeout(sendNextChunk,sysexTimer,streamId,streamObj);
			}
		}
		streamObj.chunkNumber++;
	};

	const addToStreams = () => {
		if(!streamList.length || !queue.length) return;
		//debugger;

		const streamId=streamList.shift();

		//cLog('starting stream '+streamId);

		//Found a free stream
		const nextJob = queue.shift();
		currentStreams[streamId] = {
			lastUpdate:now()
			,data:nextJob[0]
			,cb:nextJob[1]
			,retry:nextJob[2]
			,responseHeader:[]
			,responsePayload:[]
			,errors:[]
			,warnings:[]
			,id:streamId
			,headerSent:false
			,start:0
			,chunkNumber:1
			,currentChunk:0
			,currentChunkResp:0
			,totalChunkResp:0
		};
		nextJob[1](streamId, 'startChunking', currentStreams[streamId]);
		sendNextChunk(streamId,currentStreams[streamId]);
	}

	const checkStream = () => {
		for(let streamId in currentStreams){
			const stream = currentStreams[streamId];
			if((now() - stream.lastUpdate) /1000 >= timeOut){
				//Older than 5 seconds
				let newqueue;
				if(stream.retry<3){
					newqueue= [stream.data,stream.cb,stream.retry+1];
				}

				closeStream(streamId,"timeout");

				if(newqueue){
					queue.push(newqueue);
					addToStreams();
				}

			}
		}
	}

	let intervalTimer = setInterval(checkStream,timeOut*1000);

	return {
		addToQueue:(data,streamIDCB)=>{
			queue.push([data,streamIDCB,0]);
			//cLog('new stream queue');
			addToStreams();
		}
		,timeoutWait:(streamId, timeoutIncrease = 3000)=>{
			const stream = currentStreams[streamId];
			if(!stream){
				closeStream(streamId,'terminate');
				return;
			}
			stream.lastUpdate = now() + timeoutIncrease; //Eventually cleanup after x secs
		}

		,terminate:(streamId)=>{
			closeStream(streamId,'terminate');
		}
		,updateStream:(streamId,chunkTotal,currentChunk,header,payload)=>{
			//cLog('updating stream '+streamId+' '+chunkTotal+' '+currentChunk);
			const stream = currentStreams[streamId];

			stream.lastUpdate = now();
			stream.totalChunkResp = chunkTotal;
			stream.currentChunkResp = currentChunk;
			if(Array.isArray(header)){
				stream.responseHeader.push(...header);
			}
			if(Array.isArray(payload)) {
				stream.responsePayload.push(...payload);
			}

			return stream;
		}
		,getStream:(streamId)=>{
			return  currentStreams[streamId] || false;
		}
		,closeStream:closeStream
		,createDummyStream:(streamId,data={reqHeader:{}}) => {

			currentStreams[streamId] = {
				data,
				cb:()=>{},
				lastUpdate:now()
				,responseHeader:[]
				,responsePayload:[]
				,errors:[]
				,warnings:[]
				,id:streamId
				,headerSent:false
				,start:0
				,chunkNumber:1
				,currentChunk:0
				,currentChunkResp:0
				,totalChunkResp:0
			};
		}
	};

};


