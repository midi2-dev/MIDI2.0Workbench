/* (C) Copyright 2020 Yamaha Corporation.
 * Licensed under the MIT License (see LICENSE.txt in this project)
 * Contributors:
 *     Andrew Mee
 */
const {JsonPointer: ptr } = require('json-ptr');
// const stringify = require("json-stringify-pretty-compact");
const t = require("./translations");
const commonmark = require('commonmark');
const common = require("../output/app/common.js");
window.guis={};
jQuery.cssNumber.gridColumnStart = true;

const sheet = (function() {
	const style = document.createElement("style");
	style.appendChild(document.createTextNode(""));
	document.head.appendChild(style);
	return style.sheet;
})();

function addCSSRule(selector, rules) {
	let index =-1;
	if(sheet.cssRules) {
		for (let i in sheet.cssRules) {
			if (sheet.cssRules[i].selectorText === selector) {
				index = i;
				break;
			}
		}
	}
	if(index<0)index=sheet.cssRules.length;
	if("insertRule" in sheet) {
		sheet.insertRule(selector + "{" + rules + "}", index);
	}
	else if("addRule" in sheet) {
		sheet.addRule(selector, rules, index);
	}
}

module.exports  = class guibuilder {
	
	constructor(jqEd,opts/*UIList,data,cbUp,CbupdatedGUI*/){
		this.jqEd = jqEd;
		this.opts = opts;
	
	
		this._gridPx;
		this._marginPx=5;
		this._gridHpx = 40;
		this._schemaName = opts.schemaName||'test';
		this._maxCols = 0;
		this._maxRows = 0;
		this._patchUpdates={};
		this._cmsTx={};
		this._cmsRx={};
		this._maps={};
		this._ranges={};
		this._timerUp=0;
		this._editMode=false;
		this._cctorpn={timeout:0};

		const hidden = jqEd.is(':hidden');
		if(hidden){
			//jqEd.hide();
		}
		jqEd.css({
			'position':'relative',
			'text-align': 'center',
			'line-height': 1
		});
	
		this.rebuild();
			}
			
	editMode(sEd){
		this._editMode = sEd;
		this.rebuild();
			}
			
	update(path,v){
			
		for(let id in this._elementLookup){
			const el = this._elementLookup[id];
			if(el.path===path){
				el._noUpdate=true;

				if(el.jqInput){
					if(el.jqInput.is('[type=checkbox]')){
						el.jqInput.prop('checked',v);
					}else if(el.jqInput.is('select,[type=number],[type=text]')){
						el.jqInput.val(v);
					}else{
						const setVal = (v - el.gui.minMax[0]  ) / (el.gui.minMax[1]  - el.gui.minMax[0]) * 100;
						el.jqInput.val(setVal);
					}
				}
				if(el.jqSpan){
					el.jqSpan.empty().append(v);
				}
				
				if(el.nexusui /*&& el.nexusui._noUpdate!==true*/){
					el.nexusui.value = (v - el.gui.minMax[0]  ) / (el.gui.minMax[1]  - el.gui.minMax[0]) * 100;
				}
				el._noUpdate=false;
			}
			else if(false && el.nexEnv /*&& el.nexusui._noUpdate!==true*/){
				for(let id=0;id< el.nexEnv._group.elements.length;id++){
					const envEl = el.nexEnv._group.elements[id];
					if(((envEl||{}).doc ||{}).path===path){
						const p = envEl.group.point;
						const doc = envEl.doc || {};
						const min = doc.range[0]||0;
						const max = doc.range[1]||127;
						el.nexEnv._noUpdate=true;
						if(envEl.group.role==='x'){
							const pSplit = 1/el.nexEnv.points.length,pCurr=pSplit*p;
							el.nexEnv.movePoint(p,pCurr + (v - min  ) / (max  - min)*pSplit,el.nexEnv.points[p].y);
						}else{
							el.nexEnv.movePoint(p,el.nexEnv.points[p].x,(v - min  ) / (max  - min));
						}
						el.nexEnv._noUpdate=false;
					}
					
				}
			}
			else if(el.nexADSR /*&& el.nexusui._noUpdate!==true*/){
				el.nexADSR._noUpdate=true;
				if(el.path + el.gui.attack.paramPath === path){
					el.nexADSR.movePoint(1,
						((v - el.gui.attack.minMax[0]  ) / (el.gui.attack.minMax[1]  - el.gui.attack.minMax[0])) * 0.33
						,el.nexADSR.points[1].y
					);
				}

				if(el.path + el.gui.decay.paramPath === path){
					let x = ((v - el.gui.decay.minMax[0]  ) / (el.gui.decay.minMax[1]  - el.gui.decay.minMax[0])) * 0.33;
					x += el.nexADSR.points[1].x;
					el.nexADSR.movePoint(2,	x,el.nexADSR.points[2].y);
				}

				if(el.path + el.gui.sustain.paramPath === path){
					let y = (v - el.gui.sustain.minMax[0]  ) / (el.gui.sustain.minMax[1]  - el.gui.sustain.minMax[0]);
					el.nexADSR.movePoint(2,	el.nexADSR.points[2].x	,y);
					el.nexADSR.movePoint(3,	el.nexADSR.points[3].x	,y);
				}

				if(el.path + el.gui.release.paramPath === path){
					el.nexADSR.nodes[4].r = (v - el.gui.release.minMax[0]  ) / (el.gui.release.minMax[1]  - el.gui.release.minMax[0]);
					el.nexADSR.movePoint(3,	1 - el.nexADSR.nodes[4].r*0.34	,el.nexADSR.points[3].y	);
				}

				el.nexADSR._noUpdate=false;
			}
			else{
				//debugger;
			}
			
		}
		//debugger;
	}
	rebuild(NewUIList){
		this.jqEd.empty();
		this._elementLookup={};
		this._ranges={};
		this._rebuildStyle();
	
		if(NewUIList){
			this.opts.UIList = NewUIList;
		}
		this._updateMawRowsCols();
		this._updateCtrlListMatch();
		
		this._buildFromUIList(this.opts.UIList);


		}
	updateData(newdata){
		this.opts.data = newdata;
		this.rebuild();
	}
	updateViaUMP(UMP){
		for(let i=0; i<UMP.length;i++){
			const mess = UMP[i];
			const mt = mess >>> 28;
			const group= mess >> 24 & 0xF;
			const status= mess >> 16 & 0xF0;
			const channel= mess >> 16 & 0xF;

			if(channel !== this.opts.channelListData.channel - 1){
				if(mt>2){i++;}
				continue;
			}

			switch(mt){
				case 2: {
					const val1 = mess >> 8 & 0x7F;
					const val2 = mess & 0x7F;

					if(status === 0x90 || status === 0x80){
						//note on
						for(const [id, el] of Object.entries(this._elementLookup)) {
							if (el.nexPiano) {
								el.nexPiano._noUpdate=true;
								el.nexPiano.toggleKey(val1, status === 0x90 && val2 > 0);
								el.nexPiano._noUpdate=false;
							}
						}
					}

					if (status !== 0xB0) continue;
					//Convert! /32bits->64bits


					switch (val1) {
						case 101:
							this._cctorpn.type = 'rpn';
							this._cctorpn.valueMSB = null;
							this._cctorpn.valueLSB = null;
							this._cctorpn.MSB = val2;

							break;
						case 100:
							this._cctorpn.type = 'rpn';
							this._cctorpn.valueMSB = null;
							this._cctorpn.valueLSB = null;
							this._cctorpn.LSB = val2;

							break;
						case 99:
							this._cctorpn.type = 'nrpn';
							this._cctorpn.valueMSB = null;
							this._cctorpn.valueLSB = null;
							this._cctorpn.MSB = val2;

							break;
						case 98:
							this._cctorpn.type = 'nrpn';
							this._cctorpn.valueMSB = null;
							this._cctorpn.valueLSB = null;
							this._cctorpn.LSB = val2;

							break;
						case 6:
							if (this._cctorpn.valueMSB) {
								//So sometimes 38 is optional grrrr... handle this
								let val = (this._cctorpn.valueMSB << 7) + this._cctorpn.valueLSB;
								this.updateViaCC(this._cctorpn.type,
									(this._cctorpn.MSB << 7) + this._cctorpn.LSB,
									t.scaleUp(val, 7, 32) >>> 0);
								this._cctorpn.valueMSB = null;
								this._cctorpn.valueLSB = null;
								clearTimeout(this._cctorpn.timeout);

							}
							this._cctorpn.valueMSB = val2;
							this._cctorpn.timeout = setTimeout(() => {
								debugger; // need to rethink this!
								let val = (this._cctorpn.valueMSB << 7);
								this.updateViaCC(this._cctorpn.type,
									(this._cctorpn.MSB << 7) + this._cctorpn.LSB,
									t.scaleUp(val, 7, 32) >>> 0);
								this._cctorpn.valueMSB = null;
								this._cctorpn.valueLSB = null;
								clearTimeout(this._cctorpn.timeout);

							}, 11);
							break;
						case 38:
							this._cctorpn.valueLSB = val2;
							//clearTimeout(this.timeout);
							break;
						default:
							this.updateViaCC('cc', val1, t.scaleUp(val2, 7, 32) >>> 0);
							break;
					}
					if (this._cctorpn.valueLSB !== null && this._cctorpn.valueMSB !== null) {
						const val = (this._cctorpn.valueMSB << 7) + this._cctorpn.valueLSB;
						this.updateViaCC(this._cctorpn.type,
							(this._cctorpn.MSB << 7) + this._cctorpn.LSB,
							t.scaleUp(val, 7, 32) >>> 0);

						this._cctorpn.valueMSB = null;
						this._cctorpn.valueLSB = null;
						clearTimeout(this._cctorpn.timeout);
					}
					break;
				}
				case 4: {
					const mess2 = UMP[++i];
					const val1 = mess >> 8 & 0xFF;
					const val2 = mess & 0xFF;
					switch (status) {
						case 0xB0: //CC
							this.updateViaCC('cc', val1, mess2);
							break;
						case 0b00100000: //rpn
							this.updateViaCC('rpn', (val1 << 7) + val2, mess2);
							break;
						case 0b00110000: //nrpn
							this.updateViaCC('nrpn', (val1 << 7) + val2, mess2);
							break;
					}
					break;
				}
			}
		}
	}
	updateViaCC(ctrlType,contNo,contVal){
		
		let cm = (this._cmsRx[ctrlType]||{})[contNo];
		if(!cm){
			return;
		}
			//GET CC value ready
		cm.minMax = cm.minMax || [0,4294967295];
		const cMin = cm.minMax[0] ;
		const cMax = cm.minMax[1] ;

		for(let id in this._elementLookup) {
			const el = this._elementLookup[id];

			if(el.nexADSR){
				['attack','decay','sustain','release'].map(envPart=>{
					if(el.path + el.gui[envPart].paramPath === cm.paramPath){
						const v = Math.round((contVal - cMin) * (el.gui[envPart].minMax[1] - el.gui[envPart].minMax[0]) / (cMax - cMin) + el.gui[envPart].minMax[0]);
						this.update(cm.paramPath,v);
					}
				});
			}


			if (el.path !== cm.paramPath) continue;
			const guiMin = el.gui.minMax[0];
			const guiMax = el.gui.minMax[1];

			const v = Math.round((contVal - cMin) * (guiMax - guiMin) / (cMax - cMin) + guiMin);
			this.update(cm.paramPath,v);

		}

	}

	async _buildFromUIList(UIList,pathPrepend="", xOffset=0, yOffset=0){

		for(let idx=0; idx<UIList.length;idx++){
			let ui = UIList[idx];
			//let newElemCh = $('<div/>').appendTo(this.jqEd);

			this._buildElement(this.jqEd, ui, pathPrepend, xOffset, yOffset);

			/*if(this._editMode){
				$('<div/>').css({position:'absolute','z-index':idx,height: '100%',width: '100%',top:0,left:0}).appendTo(newElemCh);
				newElemCh
					.draggable({
						grid:[this._gridHpx,this._gridHpx],
						cursor: "crosshair",
						start: function (event, ui) {
							$(this).data('preventBehaviour', true);
						},
						stop: ( event, ui )=> {
							const xOffsetCalc = Math.round(ui.position.left/this._gridHpx);
							const yOffsetCalc = Math.round(ui.position.top/this._gridHpx);
							const gui =ui.helper.data('gui');
							gui.rect[0]=xOffsetCalc - xOffset;
							gui.rect[1]=yOffsetCalc - yOffset;

							this.opts.CbupdatedGUI(UIList);
						}
					})
					.resizable({
						grid:[this._gridHpx,this._gridHpx],
						handles: "se",
						zIndex: idx+1,
						stop: ( event, ui )=> {
							const width = Math.round(ui.size.width/this._gridHpx);
							const height = Math.round(ui.size.height/this._gridHpx);
							const gui =ui.helper.data('gui');
							gui.rect[2]=width;
							gui.rect[3]=height;

							this.opts.CbupdatedGUI(UIList);
						}
					})
					.on('mousedown.selectidx',()=>{
						this.opts.CbselectElem(ui,idx);
					});



			}*/


		}
	}
		
	_rebuildStyle(){
		const schemaRegexp = new RegExp('\.'+this._schemaName);
		if(sheet.cssRules && sheet.cssRules.length) {
			for (let i=0; i< sheet.cssRules.length;i++) {
				if (sheet.cssRules[i].selectorText.match(schemaRegexp)) {
					sheet.deleteRule(i);
				}
			}
	}
	
		(this.opts.UIStyleList || []).map(style=>{
			const rule=[];
	
			for(let prop in style){
				let val = style[prop];
				switch(prop){
					case 'textColor':
						rule.push('color:'+val);
						break;
					case 'textAlign':
						rule.push('text-align:'+val);
						break;
					case 'textSize':
						const sizeconvert = [8,12,15,20,30,35,40];
						rule.push('font-size:'+sizeconvert[val-1]+'px');
						break;
					case 'bgColor':
						rule.push('background-color:'+val,'border-radius:5px');
						break;
					case 'controlColor':
						rule.push('--control-color:'+val);
						break;
				}
			}
			addCSSRule('.'+this._schemaName+'_'+style.styleId,rule.join(';')+';');
		});
		}
		
	_updateCtrlListMatch(){
		this._cmsTx={};
		this._cmsRx={};
		(this.opts.CtrlList||[]).map(cm=>{
			if(!cm.paramPath)return ;
			if(cm.transmit!=='none'){
				this._cmsTx[cm.paramPath] = cm;
			}
		
			if(cm.recognize!=='none'){
				let ctrlIndex = cm.ctrlIndex.length>1?(cm.ctrlIndex[0]<<7) + cm.ctrlIndex[1]:cm.ctrlIndex[0];
				if(!this._cmsRx[cm.ctrlType])this._cmsRx[cm.ctrlType]={};
				this._cmsRx[cm.ctrlType][ctrlIndex]= cm;
			}
		});
	}
		
	_updateMawRowsCols(){
		this._maxCols = parseInt($('#maxCols').val()) || 0;
		this.opts.UIList.map(ui=>{
			if(!ui.rect)return;
			const newMax = ui.rect[0]+ui.rect[2];
			if(newMax>this._maxCols){
				this._maxCols=newMax;
				$('#maxCols').val(newMax);
			}

			const nmr = ui.rect[1]+ui.rect[3];
			if(nmr>this._maxRows){
				this._maxRows=nmr;
	//	height = height< 20*gui.rect[3]?20*gui.rect[3]:height;
			}
		});
		if(this._editMode){
			this.jqEd.css({
				width:(this._maxCols+1) * this._gridHpx
				,height:(this._maxRows+1)*this._gridHpx
				,display:'block'
				,border:'1px grey solid',
				'box-sizing': 'content-box'
			});
		}else{
			const gap=0.5;
			//const width = (((99.8-gap*2) - this._maxCols*gap)/(this._maxCols));
			this.jqEd.css({
				display: 'grid',
				'grid-gap': gap+'% '+gap+'%',
				//'grid-template-columns': '0.1% '+Array(this._maxCols).fill(width+'%').join(' ')+' 0.1%',
				'grid-template-columns': 'repeat(auto-fit, minmax(20px, 1fr))',
				'grid-template-rows':'repeat('+this._maxRows+', '+this._gridHpx+'px)',
				'grid-auto-flow': 'dense',
				//width: '100%',
				//height:'auto',
				border:'none'
			});
		}
		
		
	}
		
	async _buildElement(jqAppend,gui, pathPrepend, xOffset, yOffset){
		const id = Math.random().toString(36).substr(2, 9);
		const newElem = $('<div/>',{id:'uie_'+id})
			.appendTo(jqAppend)
			.data('gui',gui);
		let titleElem;

		// if(this._editMode){
		// 	newElem.css({
		// 		left:(xOffset+ui.rect[0])*this._gridHpx,
		// 		top:(yOffset+ui.rect[1])*this._gridHpx,
		// 		width:ui.rect[2]*this._gridHpx - 4,
		// 		height:ui.rect[3]*this._gridHpx - 4,
		// 		border:'1px grey dashed',
		// 		position:'absolute',
		// 		padding:2,
		// 		'box-sizing': 'content-box'
		// 	});
		// }else{
			newElem.css({
				// 'grid-column-start': ui.rect[0]+2 + xOffset,
				// 'grid-column-end': ui.rect[0]+ui.rect[2]+2 + xOffset,
				// 'grid-row-start':  ui.rect[1]+1 + yOffset,
				// 'grid-row-end':  ui.rect[1]+ ui.rect[3]+1 + yOffset,

				'grid-column':( gui.rect[0]+2 + xOffset) + ' / '+ (gui.rect[0]+gui.rect[2]+2 + xOffset),
				'grid-row':  (gui.rect[1]+1 + yOffset) + ' / '+  (gui.rect[1]+ gui.rect[3]+1 + yOffset),
				padding:2
			});
		//}

		if(gui.titleRect && gui.title){
			titleElem = $('<div/>',{for:'uie_'+id})
				.appendTo(jqAppend)
				.css({
					'grid-column':( gui.titleRect[0]+2 + xOffset) + ' / '+ (gui.titleRect[0]+gui.titleRect[2]+2 + xOffset),
					'grid-row':  (gui.titleRect[1]+1 + yOffset) + ' / '+  (gui.titleRect[1]+ gui.titleRect[3]+1 + yOffset),
					padding:2,
					display: 'flex',
					'justify-content': 'center', /* align horizontal */
					'align-items': 'center'
				});
			$('<span/>').append(gui.title).appendTo(titleElem).css({
				display: 'block',
				width:'100%'
			});
		}


		if(gui.styleIds){
			newElem.addClass(this._schemaName+'_'+gui.styleIds.join(' '+this._schemaName+'_'));
			if(titleElem)titleElem.addClass(this._schemaName+'_'+gui.styleIds.join(' '+this._schemaName+'_'));
		}
		


		let controlColor = getComputedStyle(newElem[0]).getPropertyValue('--control-color');
		let nexusControl,pathData,mapData,subUIList,path=pathPrepend;

		if(gui.paramPath){
			path=pathPrepend+ gui.paramPath;
			newElem.attr('data-path',path);
			newElem.data('path',path);
			pathData = this._getDataPath(path,null);
		}

		if(gui.uiMapId){
			if(!this._maps[gui.uiMapId]){
				let map = await new Promise((resolve, reject) => {
					this.opts.onFileRequest('UIMapList',gui.uiMapId,(data)=>{
						resolve(data);
					})
				});
				if(map){
					this._maps[gui.uiMapId] = map;
				}
			}
			mapData = this._maps[gui.uiMapId] || [];
		}

		if(gui.subUIListId){
			if(!this._maps[gui.subUIListId]){
				this._maps[gui.subUIListId] = await new Promise((resolve, reject) => {
					this.opts.onFileRequest('UIList',gui.subUIListId,function(data){
						resolve(data);
					});
				});
			}
			subUIList = this._maps[gui.subUIListId];
		}

		this._elementLookup[id]={
			gui:gui,
			elem:newElem,
			self:this,
			path: path
		};
		
		newElem.addClass('gui-element gui-'+gui.ui)
			.attr('id',id);
		
		switch(gui.ui){
			case 'valueSelect':
				this._elementLookup[id].jqInput = $('<select/>').appendTo(newElem);
				(mapData || []).map(item=>{
					$('<option/>',{value:item.value,selected: (item.value === pathData) })
								.data('item',item)
								.text(item.title)
						.appendTo(this._elementLookup[id].jqInput);
					});
					// });
				this._elementLookup[id].jqInput.on('change',this._jqValChange);
				this._elementLookup[id].jqInput.data('_ref',this._elementLookup[id]);
				this._elementLookup[id].jqInput.css({width: '100%',height: '100%'});
					
				newElem.css({padding:this._marginPx/2});
				break;
			case 'text':
				this._elementLookup[id].jqInput = $('<input/>',{'value': pathData,type:"text"}).appendTo(newElem);
				this._elementLookup[id].jqInput.on('change',this._jqValChange);
				this._elementLookup[id].jqInput.data('_ref',this._elementLookup[id]);
				this._elementLookup[id].jqInput.css({width: '100%',height: '100%'});
				break;
			
			case 'number':
				gui.minMax = gui.minMax || [0,null];
				this._elementLookup[id].jqInput = $('<input/>'
					,{
						type:'number',
						'min': gui.minMax[0] ,
						'max': gui.minMax[1] ,
						'step': gui.precision || 1,
						'value': pathData
					}
					).appendTo(newElem);
				this._elementLookup[id].jqInput.on('change',this._jqValChange);
				this._elementLookup[id].jqInput.data('_ref',this._elementLookup[id]);
				this._elementLookup[id].jqInput.css({width: '100%',height: '100%'});
				
				break;
			case 'label':
				const text = pathData || gui.title || '';
				newElem.css({
					display: 'flex',
				'justify-content': 'center', /* align horizontal */
				'align-items': 'center'
				});
				this._elementLookup[id].jqSpan = $('<span/>').append(text).appendTo(newElem).css({
				 	display: 'block',
					width:'100%'
				});
				break;
			case 'knob': {

				if (this._editMode) {
					$('<img/>', {src: 'img/knob.png', width: '100%', height: '100%'}).appendTo(newElem);
					break;
				}

				const min = gui.minMax[0];
				const max = gui.minMax[1];

				this._elementLookup[id].nexusui = new Nexus.Dial('#' + id, {
					'size': [gui.rect[2] * 30, gui.rect[3] * 30],
					'interaction': 'radial', // "radial", "vertical", or "horizontal"
					'mode': 'relative', // "absolute" or "relative"
					'min': 0,
					'max': 100,
					'step': 0.01,
					'value': (pathData - min) / (max - min) * 100
				});
				this._elementLookup[id].nexusui.on('change', this._nexusValChange);
				this._elementLookup[id].nexusui._ref = this._elementLookup[id];
				if (controlColor) this._elementLookup[id].nexusui.colorize('accent', controlColor);
				newElem.css({padding: this._marginPx / 2});
				break;
			}
			case 'slider': {
				const min = gui.minMax[0];
				const max = gui.minMax[1];
				this._elementLookup[id].jqInput = $('<input/>'
					, {
						type: 'range',
						'min': 0,
						'max': 100,
						'step': 0.01,
						'value': (pathData - min) / (max - min) * 100,
						'orient': gui.rect[2] < gui.rect[3] ? 'vertical' : '',
						disabled: !!this._editMode
					}
				).appendTo(newElem);
				this._elementLookup[id].jqInput.on('input', this._jqValChange);
				this._elementLookup[id].jqInput.data('_ref', this._elementLookup[id]);
				this._elementLookup[id].jqInput.css({width: '100%', height: '100%'});
				break;
			}
			case 'block':
				if(subUIList){
					this._buildFromUIList(subUIList,path, xOffset + gui.rect[0], yOffset  +gui.rect[1]);
				}
				break;
				
			case 'buttonLink':
				this._elementLookup[id].jqInput = $('<button/>',{})
					.append(gui.title)
					.appendTo(newElem);
				
				this._elementLookup[id].jqInput.on('click',function(e){
					const _ref = $(this).data('_ref');
					_ref.self.opts.buttonClick($(this), _ref.gui.onClickLink,_ref.self.opts.channelListData);
				});
				this._elementLookup[id].jqInput.data('_ref',this._elementLookup[id]);
				this._elementLookup[id].jqInput.css({width: '100%',height: '100%'});
				//buildTabLayout(newElem,gui);
				break;
			case 'switch':
				this._elementLookup[id].jqInput = $('<input/>',{type:'checkbox',checked:!!pathData}).appendTo(newElem);
			
				this._elementLookup[id].jqInput.on('change',this._jqValChange);
				this._elementLookup[id].jqInput.data('_ref',this._elementLookup[id]);
				this._elementLookup[id].jqInput.css({width: '100%',height: '100%'});
			
				//keyRange(newElem,gui);
				break;
			case 'momentary':

				const jqC = this._buildControlDiv(id,newElem,gui,[1,1]);
				nexusControl = new Nexus.Button('#'+id,{
					'size': [jqC.width(),jqC.height()],
					'state': pathData
				});
				newElem.css({padding:marginPx/2});
				break;
			case 'adsr': {

				let aPathVal = this._getDataPath(gui.paramPath + gui.attack.paramPath, 0),
					dPathVal = this._getDataPath(gui.paramPath + gui.decay.paramPath, 0),
					sPathVal = this._getDataPath(gui.paramPath + gui.sustain.paramPath, 0),
					rPathVal = this._getDataPath(gui.paramPath + gui.release.paramPath, 0);
				let a = ((aPathVal - gui.attack.minMax[0]) / (gui.attack.minMax[1] - gui.attack.minMax[0])),
					d = ((dPathVal - gui.decay.minMax[0]) / (gui.decay.minMax[1] - gui.decay.minMax[0])),
					s = ((sPathVal - gui.sustain.minMax[0]) / (gui.sustain.minMax[1] - gui.sustain.minMax[0])),
					r = ((rPathVal - gui.release.minMax[0]) / (gui.release.minMax[1] - gui.release.minMax[0]));

				const points = [
					{x: 0, y: 0, xMax: 0, yMax: 0},
					{x: a * 0.33, y: 1, xMax: 0.33, yMin: 1, xRelativeGroup: 'decay'},
					{x: a * 0.33 + d * 0.33, y: s, xMax: 0.66, yMatchGroup: 'sustain', xRelativeGroup: 'decay'},
					{x: 1 - r * 0.34, y: s, xMax: 1, xMin: 0.66, yMatchGroup: 'sustain'},
					{x: 1, y: 0, xMin: 1, yMax: 0}
				];


				setTimeout((newElemResize, elemLookup) => {
					elemLookup.nexADSR = new Nexus.Envelope('#' + id, {
						'size': [newElem.width() - 5, newElem.height()],
						'points': points,
						'noNewPoints': true
					});

					elemLookup.nexADSR._ref = elemLookup;
					elemLookup.nexADSR.on('change', function (v) {
						if (this._noUpdate) return;

						const gui = this._ref.gui;

						const at = Math.round(v[1].x * 100 / 0.33) / 100;
						const attackVal = Math.round((gui.attack.minMax[1] - gui.attack.minMax[0]) * at);
						this._ref.self._sendUpdate({
							...this._ref,
							gui: gui.attack,
							path: this._ref.path + gui.attack.paramPath
						}, attackVal, attackVal);

						const de = Math.round((v[2].x - v[1].x) * 100 / 0.33) / 100;
						const decayVal = Math.round((gui.decay.minMax[1] - gui.decay.minMax[0]) * de);
						this._ref.self._sendUpdate({
							...this._ref,
							gui: gui.decay,
							path: this._ref.path + gui.decay.paramPath
						}, decayVal, decayVal);

						const su = v[2].y;
						const sustainVal = Math.round((gui.sustain.minMax[1] - gui.sustain.minMax[0]) * su);
						this._ref.self._sendUpdate({
							...this._ref,
							gui: gui.sustain,
							path: this._ref.path + gui.sustain.paramPath
						}, sustainVal, sustainVal);

						const re = Math.round((1 - v[3].x) * 100 / 0.34) / 100;
						const releaseVal = Math.round((gui.sustain.minMax[1] - gui.sustain.minMax[0]) * re);
						this._ref.self._sendUpdate({
							...this._ref,
							gui: gui.release,
							path: this._ref.path + gui.release.paramPath
						}, releaseVal, releaseVal);


					});


				}, 1000, newElem, this._elementLookup[id]);


				//	newElem.css({padding:marginPx/2});
				break;
			}
			case 'envelope':
				const points =[];
				let pSplit = 1/gui.pointsX.length,pCurr=0;
				for(let i =0 ; i<gui.pointsX.length;i++) {
				
					points[i]={};
					const minX = gui.pointsX[i].minMax[0];
					const maxX = gui.pointsX[i].minMax[1];
					const pathDataX = this._getDataPath(path + gui.pointsX[i].paramPath,0);
				// const jqC = buildControlDiv(id,newElem,gui,[1,1]);
				// nexuiElems[id] = new Nexus.Toggle('#'+id,{
					const minY = gui.pointsY[i].minMax[0];
					const maxY = gui.pointsY[i].minMax[1];
					const pathDataY = this._getDataPath(path + gui.pointsY[i].paramPath,0);
				// 	'size': [jqC.width(),jqC.height()],
					points[i].y=(pathDataY - minY  ) / (maxY  - minY);
					points[i].x=pCurr + (pathDataX - minX  ) / (maxX  - minX)*pSplit;
					points[i].xMin=pCurr;
					pCurr+=pSplit;
					points[i].xMax=pCurr;
				}
				// 	'state': pathData
				this._elementLookup[id].nexEnv = new Nexus.Envelope('#'+id,{
					'size':  [newElem.width(),newElem.height()],
					'points': points,
					'noNewPoints':true
				});
				this._elementLookup[id].nexEnv._ref = this._elementLookup[id];
				this._elementLookup[id].nexEnv.on('change',function(v) {
					if (this._noUpdate) return;
				// });
				// newElem.css({padding:marginPx/2});
					for(let i =0 ; i<this._ref.gui.pointsX.length;i++) {
						const guiX = {...this._ref.gui.pointsX[i]};
						const minX = guiX.minMax[0];
						const maxX = guiX.minMax[1];
						const xMin = (1/v.length)*i;
						const xValue = Math.round(((maxX - minX) * (v[i].x - xMin ) * v.length) + minX);
						this._ref.self._sendUpdate({...this._ref,gui:guiX,path:this._ref.path +guiX.paramPath},xValue,xValue);
				// break;
						const guiY = {...this._ref.gui.pointsY[i]};
						const minY = guiY.minMax[0];
						const maxY = guiY.minMax[1];
						const yValue = Math.round(((maxY - minY) * v[i].y ) + minY);
						this._ref.self._sendUpdate({...this._ref,gui:guiY,path:this._ref.path +guiY.paramPath},yValue,yValue);
					}
			
				});
				
				break;

			case 'commonmark': {
				newElem.css({
					display: 'flex',
					'justify-content': 'center', /* align horizontal */
					'align-items': 'center'
				});
				this._elementLookup[id].jqSpan = $('<span/>').appendTo(newElem).css({
					display: 'block',
					width: '100%',
					height: '100%',
					overflow: 'auto',
					'text-align': 'left'
				});
				const text = pathData || gui.text || '';
				if(text.match(/^midi\+file:\/\//)){
					common.sendPE(0x34,{resource:"File", path:text.replace(/^midi\+file:\/\//,"")}).then(([resHead,resBody])=> {
						this._renderCommonMark(this._elementLookup[id].jqSpan,resBody);
					});
				}else{
					this._renderCommonMark(this._elementLookup[id].jqSpan,text);
				}

				break;
			}
			case 'keys': {
				setTimeout((newElemResize, elemLookup) => {
					elemLookup.nexPiano = new Nexus.Piano('#' + id, {
						'size': [newElem.width() - 5, newElem.height()],
						'mode': 'button',  // 'button', 'toggle', or 'impulse'
						'lowNote': elemLookup.gui.noteRange[0] || 24,
						'highNote': elemLookup.gui.noteRange[1] || 60
					});

					elemLookup.nexPiano._ref = elemLookup;
					elemLookup.nexPiano.on('change', function (v) {
						if (this._noUpdate) return;
						this._ref.self._sendNote(this._ref, v.note, v.state?0x90:0x80);
					});


				}, 1000, newElem, this._elementLookup[id]);


				//	newElem.css({padding:marginPx/2});
				break;
			}
			default:
				debugger;
		}
	}

	_renderCommonMark(jqSpan,text){
		common.commonMarkParsing(text,jqSpan);
	}

	
		//return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
	_sendUpdate(_ref,docVal,contVal = null ,pathOverride = null){
		const out={
			value:docVal
		};
	
		if(pathOverride){
			out.path=pathOverride;
		}else if(_ref.path){
			out.path=_ref.path;
		}

		if(this._cmsTx[out.path]) {
			let cm = this._cmsTx[out.path], cmMax = 0;
			_ref.gui.minMax = _ref.gui.minMax || [0,4294967295];
			let min = _ref.gui.minMax[0];
			let max = _ref.gui.minMax[1];
			let ch = this.opts.channelListData.channel - 1;
			let umpGroup = this.opts.channelListData.umpGroup||0;
			if (cm.ctrlType === 'cc') {
				cmMax = 127;
				let cmVal = (contVal - min) / (max - min) * cmMax;
				cmVal = roundPrecision(cmVal, 1);
				// out.midi = [
				// 	[0xB0 | ch, cm.ctrlIndex[0], cmVal]
				// ];
				let out1 = ((0x04 << 4) + umpGroup) << 24;
				out1 += (0xB0 + ch)<<16;
				out1 += cm.ctrlIndex[0] <<8;
				let out2 = t.scaleUp(cmVal,7,32);
				out.ump=[out1 >>> 0,out2 >>> 0];
			} else if (cm.ctrlType === 'nrpn') {
				cmMax = 16383;

				let cmVal = (contVal - min) / (max - min) * cmMax;
				cmVal = roundPrecision(cmVal, 1);
				//let msb = cmVal >> 7;
				//let lsb = 0x7F & cmVal;
				// out.midi = [
				// 	[0xB0 | ch, 99, cm.ctrlIndex[0]],
				// 	[0xB0 | ch, 98, cm.ctrlIndex[1]],
				// 	[0xB0 | ch, 6, msb],
				// 	[0xB0 | ch, 38, lsb]
				// ]

				let out1 = ((0x04 << 4) + umpGroup) << 24;
				out1 += ((0b0011<<4) + ch) << 16;
				out1 += cm.ctrlIndex[0] <<8;
				out1 += cm.ctrlIndex[1];
				let out2 = Math.round(cmVal);
				out2 = t.scaleUp(out2,14,32);
				out.ump=[out1 >>> 0,out2 >>> 0];
			} else if (cm.ctrlType === 'rpn') {
				cmMax = 16383;

				let cmVal = (contVal - min) / (max - min) * cmMax;
				cmVal = roundPrecision(cmVal, 1);
				//let msb = cmVal >> 7;
				//let lsb = 0x7F & cmVal;
				// out.midi = [
				// 	[0xB0 | ch, 101, cm.ctrlIndex[0]],
				// 	[0xB0 | ch, 100, cm.ctrlIndex[1]],
				// 	[0xB0 | ch, 6, msb],
				// 	[0xB0 | ch, 38, lsb]
				// ]

				let out1 = ((0x04 << 4) + umpGroup) << 24;
				out1 += ((0b0010<<4) + ch) << 16;
				out1 += cm.ctrlIndex[0] <<8;
				out1 += cm.ctrlIndex[1];
				let out2 = Math.round(cmVal);
				out2 = t.scaleUp(out2,14,32);
				out.ump=[out1 >>> 0,out2 >>> 0];
			} else {
				debugger;
			}
		}
		_ref.self.opts.updateData(out);
	}


	_sendNote(_ref,note,status, velo=127){
		let out={};
		let ch = this.opts.channelListData.channel - 1;
		let umpGroup = this.opts.channelListData.umpGroup||0;

		// out.midi = [
		// 	[status | ch, note, velo]
		// ];
		let out1 = ((0x04 << 4) + umpGroup) << 24;
		out1 += (status + ch)<<16;
		out1 += note <<8;
		let out2 = t.scaleUp(velo,7,32);
		out.ump=[out1  >>> 0 ,out2 >>> 0];
		_ref.self.opts.updateData(out);
	}

	_nexusPanChange(v) {
		const gui = this._ref.gui;
		const val = Math.round((((v.value + 1)/2) * (gui.maximum - gui.minimum)) + gui.minimum);
		this._ref.self._sendUpdate(this._ref,val,val);
	}
	
	_nexusValChange(v) {
		if(this._ref._noUpdate)return;
		//v to docVal
		let docVal = ((this._ref.gui.minMax[1] - this._ref.gui.minMax[0]) * v/100 ) + this._ref.gui.minMax[0];
		docVal =roundPrecision(docVal,this._ref.gui.precision || 1);

		this._ref.self._sendUpdate(this._ref,docVal,docVal);
	}
	
	_jqValChange(e){
		let docVal = $(this).val();
		let contVal = docVal;
		const _ref = $(this).data('_ref');
		if(_ref._noUpdate)return;
		
		if(_ref.gui.ui==='number' || _ref.gui.ui==='slider'){
			const min = _ref.gui.minMax[0];
			const max = _ref.gui.minMax[1];
			docVal= docVal * 1;
			if(_ref.gui.ui==='slider'){
				docVal= ((max - min) * docVal/100 ) +min;
			}
			docVal =roundPrecision(docVal,_ref.gui.precision || 1);
			contVal = docVal;
		}
		if(_ref.gui.ui==='switch'){
			docVal= $(this).prop('checked');
			contVal = docVal?4294967295:0;
		}
		if($(this).is('select')){
			const item = $('[value="'+docVal+'"]',this).data('item');
			docVal= item.value;
			contVal= item.value;
			if(("contValue" in item)){
				contVal = item.contValue;
			}
		}
		
		_ref.self._sendUpdate(_ref,docVal,contVal);
	}
	
	_keyRange(jqEd,gui){
		const self=this;
		jqEd.data('gui',gui);
		jqEd.data('repeatData',Object.assign({},repeatData));
		const startKey = buildPath(gui.keys[0].path);
		const id = 'PitchEnv'+startKey+uniqueid;
		jqEd.attr('id',id);

		const startValue = getDataPath(startKey,0);
		const endValue = getDataPath(gui.keys[1].path,127);
		
		//const keyContainer = jqEd[0];
		const piano = new Nexus.Piano('#'+id,{
			'size': [900 ,60],
			'mode': 'button',  // 'button', 'toggle', or 'impulse'
			'lowNote': 0,
			'highNote': 127,
			lowRangeNote: startValue,
			highRangeNote: endValue
			
		});
		
		this._elementLookup[startKey]={
			gui:gui,
			keyControl:{key:'start',keyControl:piano}
		};
		this._elementLookup[this._buildPath(gui.keys[1].path)]={
			gui:gui,
			keyControl:{key:'end',keyControl:piano}
		};
		piano.on('change',function(v) {
			//console.log(v);
			const jqCont = $(this.parent);
			const gui = jqCont.data('gui');
			const repeatDataOverride = jqCont.data('repeatData');
			if(v.action && v.action==='down'){
				const pathRate =this._buildPath(gui.keys[0].path,0,repeatDataOverride);
				self._sendUpdate(pathRate,v.note,v.note);
				this.settings.lowRangeNote = v.note;
				//this.render();
			}
			
			if(v.action && v.action==='up'){
				const pathRate =this._buildPath(gui.keys[1].path,0,repeatDataOverride);
				self._sendUpdate(pathRate,v.note,v.note);
				this.settings.highRangeNote = v.note;
				this.parent.removeChild(this.element);
				this.empty();
				this.init();
				this.render();
			}
			
		});
		
	}
	
	
	//****************
	_buildControlDiv(id,newElem,gui,defaultsize,tagType = 'div'){
		let text=false;
		const titlePosition = gui.titlePosition || 'below';
		const textGridSize = gui.textGridSize || 1;
		const size = [gui.rect[2],gui.rect[3]] || defaultsize;
		
		if(gui.title){
			text = buildPath(gui.title,1);
		}
		
		const jqControl = $("<"+tagType+"/>",{id:id}).appendTo(newElem).css({marginLeft: 'auto',marginRight:'auto',width:'100%',height:'100%'});
		return jqControl;
	}


	
	_getDataPath(path,defValue){
		if(!path)return defValue;
		const value = ptr.get(this.opts.data, path);
		return value!==undefined?value : defValue;
	}

	_buildControllers(){
		gui.controlMessages.map(cm=>{
			oDetails.controllers
			controllers[cm.path]={
			};
		});
	}
	
};


function roundPrecision(value, precision) {
	return Math.round(value / precision) * precision
	//return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}
