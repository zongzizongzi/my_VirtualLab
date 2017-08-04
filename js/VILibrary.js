/**
 * Created by Fengma on 2016/11/10.
 */

'use strict';

let VILibrary = {REVISION: '1.0'};

VILibrary.InnerObjects = {
	
	fixNumber: function (num) {
		
		let strLab;
		if (Math.abs(num) >= 1000) {
			
			num = num / 1000;
			strLab = num.toFixed(1).toString() + 'k';
		}
		else if (Math.abs(num) < 1000 && Math.abs(num) >= 100) {
			
			strLab = num.toFixed(0).toString();
		}
		else if (Math.abs(num) < 100 && Math.abs(num) >= 10) {
			
			if (Math.abs(num) - Math.abs(num).toFixed(0) < 0.01) {
				
				strLab = num.toFixed(0).toString();
			}
			else {
				
				strLab = num.toFixed(1).toString();
			}
		}
		else if (Math.abs(num) < 10) {
			
			if (Math.abs(num) - Math.abs(num).toFixed(0) < 0.01) {
				
				strLab = num.toFixed(0).toString();
			}
			else {
				
				strLab = num.toFixed(2).toString();
			}
		}
		return strLab;
	},
	
	getDomObject: function (obj) {
		
		obj = typeof obj === "string" ? document.getElementById(obj) : obj;
		return (obj instanceof HTMLElement) ? obj : (obj instanceof jQuery) ? obj[0] : false;
	},
	
	getVIById: function (id) {

		for (let VI of this.existingVIArray) {
			
			if (VI.id === id) {
				return VI;
			}
		}
		return false;
	},
	
	getVIcnName: function (VIName) {
		
		if (VILibrary.VI.hasOwnProperty(VIName)) {
			
			return VILibrary.VI[VIName].cnName;
		}
		return false;
	},
	
	/**
	 * 查询某个VI已绑定的其他VI(默认包含自己)，调用后查询结果会存在boundVIArray中，
	 * @param VI 需查询的VI
	 */
	findBoundVI: function (VI) {
		
		let boundVIArray = [];
		boundVIArray.push(VI);
		if (VI.sourceInfoArray) {
			
			if (VI.sourceInfoArray.length > 0) {
				
				for (let sourceInfo of VI.sourceInfoArray) {
					
					let tempSourceVI = this.getVIById(sourceInfo[0]);
					if (boundVIArray.indexOf(tempSourceVI) === -1) {
						
						this.findBoundVI(tempSourceVI, boundVIArray);
					}
				}
			}
		}
		if (VI.targetInfoArray) {
			
			if (VI.targetInfoArray.length > 0) {
				
				for (let targetInfo of VI.targetInfoArray) {
					
					let tempTargetVI = this.getVIById(targetInfo[0]);
					
					if (boundVIArray.indexOf(tempTargetVI) === -1) {
						
						this.findBoundVI(tempTargetVI, boundVIArray);
					}
				}
			}
		}
		return boundVIArray;
	},
	
	bindDataLine: function (sourceId, targetId, sourceOutputType, targetInputType) {
		
		let sourceVI = this.getVIById(sourceId);
		let targetVI = this.getVIById(targetId);
		let sourceInfo = [sourceId, sourceOutputType, targetInputType];
		let targetInfo = [targetId, sourceOutputType, targetInputType];
		if (sourceVI.targetInfoArray.indexOf(targetInfo) !== -1 || targetVI.sourceInfoArray.indexOf(sourceInfo) !== -1) {
			
			console.log('Already bound!');
			return
		}
		sourceVI.targetInfoArray.push(targetInfo);
		targetVI.sourceInfoArray.push(sourceInfo);
		
		//******************************分配dataLine*******************************************//
		if (!sourceVI.dataLine && !targetVI.dataLine) {//均未赋过值说明未与其他VI连接，赋一个未被占用的dataLine
			
			let newDataLine = this.dataLineArray.length > 0 ?
				(Math.max.apply(null, this.dataLineArray) + 1 ) : 1;
			this.dataLineArray.push(newDataLine);
			sourceVI.dataLine = newDataLine;
			targetVI.dataLine = newDataLine;
		}
		else if (!sourceVI.dataLine && targetVI.dataLine) {//将已有dataLine赋给无dataLine的
			
			sourceVI.dataLine = targetVI.dataLine;
		}
		else if (sourceVI.dataLine && !targetVI.dataLine) {
			
			targetVI.dataLine = sourceVI.dataLine;
		}
		else if (sourceVI.dataLine > targetVI.dataLine) {//均有dataLine，合并较大的那个到较小的
			
			for (let VI of this.existingVIArray) {
				
				VI.dataLine = VI.dataLine === sourceVI.dataLine ? targetVI.dataLine : VI.dataLine;
			}
		}
		else if (sourceVI.dataLine < targetVI.dataLine) {
			
			for (let VI of this.existingVIArray) {
				
				VI.dataLine = VI.dataLine === targetVI.dataLine ? sourceVI.dataLine : VI.dataLine;
			}
		}
	},
	
	//解绑默认将与targetVI相关的VI赋新dataLine值
	unbindDataLine: function (sourceId, targetId) {
		
		let sourceVI = this.getVIById(sourceId);
		let targetVI = this.getVIById(targetId);
		
		//**********************************删除绑定信息**************************************//
		for (let targetInfo of sourceVI.targetInfoArray) {
			
			if (targetInfo[0] === targetId) {
				
				sourceVI.targetInfoArray.splice(sourceVI.targetInfoArray.indexOf(targetInfo), 1);
				break;
			}
		}
		for (let sourceInfo of targetVI.sourceInfoArray) {
			
			if (sourceInfo[0] === sourceId) {
				
				targetVI.sourceInfoArray.splice(targetVI.sourceInfoArray.indexOf(sourceInfo), 1);
				break;
			}
		}
		
		//*****************************重分配dataLine*************************************//
		let sourceVIBoundVIArray, targetVIBoundVIArray;
		
		sourceVIBoundVIArray = this.findBoundVI(sourceVI);
		targetVIBoundVIArray = this.findBoundVI(targetVI);
		
		if (sourceVIBoundVIArray.length === 1) {//无其他VI相连
			
			sourceVI.dataLine = 0;
		}
		//检测sourceVI与targetVI断开后有没有间接与targetVI相连，仍然相连则无需赋新dataLine值
		if (targetVIBoundVIArray.indexOf(sourceVI) === -1) {
			
			if (targetVIBoundVIArray.length === 1) {//无其他VI相连
				
				targetVI.dataLine = 0;
			}
			else {
				
				let newDataLine = Math.max.apply(null, this.dataLineArray) + 1;
				for (let VI of targetVIBoundVIArray) {
					
					VI.dataLine = newDataLine;
				}
			}
		}
	},
	
	dataUpdater: function (dataLine) {
		
		if (!dataLine) {
			
			return;
		}
		for (let VI of this.existingVIArray) {
			
			if (VI.dataLine === dataLine && VI.hasOwnProperty('updater')) {
				
				VI.updater();
			}
		}
	},
	
	//双击VI弹出框
	showBox: function (VI) {
		
		if (VI.boxTitle) {
			
			layer.open({
				type: 1,
				title: VI.boxTitle,
				area: ['auto', 'auto'],
				shade: 0.3,
				shadeClose: true,
				closeBtn: false,
				zIndex: layer.zIndex,
				content: VI.boxContent,
				btnAlign: 'c',
				btn: ['确定', '取消'],
				yes: function (index) {
					VI.setInitialData();
					layer.close(index);
				},
				btn2: function (index) {
					layer.close(index);
				},
				success: function (layero) {
					layer.setTop(layero);
				}
			});
		}
	},
	
	/**
	 * FFT算法
	 * @param dir
	 * @param m 采样点数，多余输入数据时剩余部分置0
	 * @param realPart
	 * @param imgPart   对于实数据时留空
	 * @returns {Array}
	 */
	fft: function (dir, m, realPart, imgPart) {
		
		let n, i, i1, j, k, i2, l, l1, l2, c1, c2, tx, ty, t1, t2, u1, u2, z;
		n = 1;
		for (i = 0; i < m; i += 1) {
			
			n *= 2;
		}
		let real = realPart.slice(0);
		let img;
		if (imgPart === undefined) {
			
			img = [];
			for (i = 0; i < n; i += 1) {
				img.push(0);
			}
		}
		else {
			
			img = imgPart.slice(0);
		}
		
		/* Do the bit reversal */
		i2 = n >> 1;
		j = 0;
		for (i = 0; i < n - 1; i += 1) {
			if (i < j) {
				tx = real[i];
				ty = img[i];
				real[i] = real[j];
				img[i] = img[j];
				real[j] = tx;
				img[j] = ty;
			}
			k = i2;
			while (k <= j) {
				j -= k;
				k >>= 1;
			}
			j += k;
		}
		/* Compute the FFT */
		c1 = -1.0;
		c2 = 0.0;
		l2 = 1;
		for (l = 0; l < m; l += 1) {
			l1 = l2;
			l2 <<= 1;
			u1 = 1.0;
			u2 = 0.0;
			for (j = 0; j < l1; j += 1) {
				for (i = j; i < n; i += l2) {
					i1 = i + l1;
					t1 = u1 * real[i1] - u2 * img[i1];
					t2 = u1 * img[i1] + u2 * real[i1];
					real[i1] = real[i] - t1;
					img[i1] = img[i] - t2;
					real[i] += t1;
					img[i] += t2;
				}
				z = u1 * c1 - u2 * c2;
				u2 = u1 * c2 + u2 * c1;
				u1 = z;
			}
			c2 = Math.sqrt((1.0 - c1) * 0.5);
			if (dir === 1) {
				
				c2 = -c2;
			}
			c1 = Math.sqrt((1.0 + c1) * 0.5);
		}
		/* Scaling for forward transform */
		if (dir === 1) {
			for (i = 0; i < n; i += 1) {
				real[i] /= n;
				img[i] /= n;
			}
		}
		
		let output = [];
		for (i = 0; i < n / 2; i += 1) {
			
			output[i] = 2 * Math.sqrt(real[i] * real[i] + img[i] * img[i]);
		}
		return output;
	},
	
	loadModule: function (MTLUrl, OBJUrl) {
		
		let objLoader = new THREE.OBJLoader();
		let mtlLoader = new THREE.MTLLoader();
		return new Promise(function (resolve, reject) {
			mtlLoader.load(MTLUrl, function (material) {
				objLoader.setMaterials(material);
				objLoader.load(OBJUrl, function (a) {
					
					a.traverse(function (child) {
						if (child instanceof THREE.Mesh) {
							
							child.material.side = THREE.DoubleSide;
						}
					});
					resolve(a);
				});
			})
		})
	},
	existingVIArray: [],
	dataLineArray: []
};

class TemplateVI {
	
	constructor(VICanvas) {
		
		if (new.target === TemplateVI) {
			
			throw new Error('本VI为模版，不能实例化');
		}
		let domElement = VILibrary.InnerObjects.getDomObject(VICanvas);
		const _this = this;
		this.container = domElement;
		this.id = domElement.id;
		this.fillStyle = 'orange';
		this.timer = 0;
		this.index = 0;
		this.dataLength = 1024;
		this.output = [0];
		this.outputPointCount = -1;//-1为无限制输出
		this.inputPointCount = 1;
		//与其他VI的连接信息
		this.sourceInfoArray = [];//[sourceVIId, sourceOutputType,thisInputType]二维数组，第二维分别存储sourceVI的ID、sourceVI输出类型、自己的输入类型
		this.targetInfoArray = [];//[targetVIId, thisOutputType,targetInputType]二维数组，第二维分别存储targetVI的ID、自己的输出类型、targetVI的输入类型
		this.dataLine = 0;
		
		VILibrary.InnerObjects.existingVIArray.push(this);
		this.constructor.logCount++;
		
		this.toggleObserver = function (flag) {
			
			if (flag) {
				
				if (!this.timer && this.dataLine) {
					
					this.fillStyle = 'red';
					this.draw();
					this.timer = window.setInterval(function () {
						
						VILibrary.InnerObjects.dataUpdater(_this.dataLine);
					}, 50);
				}
			}
			else {
				
				if (this.timer) {
					
					window.clearInterval(this.timer);
					this.timer = 0;
				}
				this.fillStyle = 'orange';
				this.draw();
			}
		};
		
		this.updater = function () {
			
			if (this.sourceInfoArray.length > 0) {
				
				for (let sourceInfo of this.sourceInfoArray) {
					
					let sourceVI = VILibrary.InnerObjects.getVIById(sourceInfo[0]);
					let sourceOutputType = sourceInfo[1];
					let inputType = sourceInfo[2];
					let sourceData = sourceVI.getData(sourceOutputType);
					this.setData(sourceData, inputType);
				}
			}
		};
		
		this.destroy = function () {
			
			let index = VILibrary.InnerObjects.existingVIArray.indexOf(this);
			if (index !== -1) {
				
				VILibrary.InnerObjects.existingVIArray.splice(index, 1);
			}
			if (this.timer) {
				
				window.clearInterval(this.timer);
				this.timer = 0;
			}
			this.dataLine = 0;
		};
		
		this.setData = function () {
		};
		
		this.getData = function () {
			
			return this.output;
		};
		
		this.reset = function () {
			
			this.toggleObserver(false);
			this.index = 0;
			this.output = [0];
		};
		
		this.draw = function () {
			
			this.ctx = this.container.getContext("2d");
			this.ctx.font = 'normal 14px Microsoft YaHei';
			this.ctx.fillStyle = this.fillStyle;
			this.ctx.fillRect(0, 0, this.container.width, this.container.height);
			this.ctx.fillStyle = 'black';
			let length = this.constructor.cnName.length;
			if (length > 4) {
				
				this.ctx.fillText(this.constructor.cnName.substring(0, 4), this.container.width / 2 - 14 * 4 / 2, this.container.height / 4 + 6);
				this.ctx.fillText(this.constructor.cnName.substring(4), this.container.width / 2 - 14 * (length - 4) / 2, this.container.height * 3 / 4);
				
			}
			else {
				
				this.ctx.fillText(this.constructor.cnName, this.container.width / 2 - 14 * length / 2, this.container.height / 2 + 6);
			}
		};
		
		this.handleDblClick = function (e) {
			
			VILibrary.InnerObjects.showBox(_this);
		};
		
		this.container.addEventListener('dblclick', this.handleDblClick, false);
	}
	
	static get cnName() {
		
		return 'VI模版';
	}
	
	static get defaultWidth() {
		
		return '65px';
	}
	
	static get defaultHeight() {
		
		return '50px';
	}
}
//因ES6定义Class内只有静态方法没有静态属性，只能在Class外定义
TemplateVI.logCount = 0;

VILibrary.VI = {
	
	AudioVI: class AudioVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			let audioCtx = new (window.AudioContext || webkitAudioContext)(),
				analyser = audioCtx.createAnalyser(), source, timeStamp = 0, point = {};
			
			this.name = 'AudioVI';
			this.ctx = this.container.getContext("2d");
			this.inputPointCount = 0;
			this.fillStyle = 'silver';
			
			this.toggleObserver = function (flag) {
				
				if (flag) {
					
					if (!this.timer) {
						
						// Older browsers might not implement mediaDevices at all, so we set an empty object first
						if (navigator.mediaDevices === undefined) {
							navigator.mediaDevices = {};
						}
						
						// Some browsers partially implement mediaDevices. We can't just assign an object
						// with getUserMedia as it would overwrite existing properties.
						// Here, we will just add the getUserMedia property if it's missing.
						if (navigator.mediaDevices.getUserMedia === undefined) {
							navigator.mediaDevices.getUserMedia = function (constraints) {
								
								// First get ahold of the legacy getUserMedia, if present
								let getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
								
								// Some browsers just don't implement it - return a rejected promise with an error
								// to keep a consistent interface
								if (!getUserMedia) {
									return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
								}
								
								// Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
								return new Promise(function (resolve, reject) {
									getUserMedia.call(navigator, constraints, resolve, reject);
								});
							};
						}
						
						navigator.mediaDevices.getUserMedia({audio: true}).then(function (stream) {
								console.log('AudioVI: getUserMedia supported.');
								
								//音频输出
								source = audioCtx.createMediaStreamSource(stream);
								analyser.fftSize = _this.dataLength * 2;
								source.connect(analyser);
								analyser.connect(audioCtx.destination);
								
								let bufferLength = analyser.frequencyBinCount;
								console.log(bufferLength);
								let dataArray = new Uint8Array(bufferLength);
								
								function getAudioData() {
									
									if (_this.dataLine) {
										
										_this.timer = window.requestAnimationFrame(getAudioData);
										
										analyser.getByteTimeDomainData(dataArray);
										_this.output = Array.from(dataArray);
										
										//定时更新相同数据线VI的数据
										VILibrary.InnerObjects.dataUpdater(_this.dataLine);
									}
									else {
										
										_this.toggleObserver(false);
									}
								}
								
								getAudioData();
								
								_this.fillStyle = 'red';
								_this.draw();
							}
						).catch(function (err) {
							_this.timer = 0;
							console.log('AudioVI: ' + err.name + ": " + err.message);
						});
					}
				}
				else {
					if (this.timer) {
						
						//切断音频输出
						analyser.disconnect(audioCtx.destination);
						window.cancelAnimationFrame(_this.timer);
						_this.timer = 0;
					}
					_this.fillStyle = 'silver';
					_this.draw();
				}
			};
			
			this.draw = function () {
				
				let img = new Image();
				new Promise(function (resolve, reject) {
					
					img.src = 'img/mic.png';
					img.onload = resolve;
					img.onerror = reject;
				}).then(function () {
					
					_this.ctx.fillStyle = _this.fillStyle;
					_this.ctx.fillRect(0, 0, _this.container.width, _this.container.height);
					_this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
				}).catch(function (e) {
					console.log('AudioVI:' + e);
				});
			};
			
			this.draw();
			
			this.container.addEventListener('mousedown', function (e) {
				
				timeStamp = e.timeStamp;
				point.x = e.clientX;
				point.y = e.clientY;
			}, false);
			
			this.container.addEventListener('mouseup', function (e) {
				
				//X、Y移动距离小于5，点击间隔小于200，默认点击事件
				if ((e.timeStamp - timeStamp) < 200 && (point.x - e.clientX) < 5 && (point.y - e.clientY) < 5) {
					
					if (_this.dataLine) {
						
						_this.toggleObserver(!_this.timer);
					}
				}
			}, false);
		}
		
		static get cnName() {
			
			return '麦克风';
		}
		
		static get defaultWidth() {
			
			return '80px';
		}
		
		static get defaultHeight() {
			
			return '80px';
		}
	},
	
	KnobVI: class KnobVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			let spinnerFlag = false, startX, startY, stopX, stopY, roundCount = 0;
			let knob_Base = new Image(), knob_Spinner = new Image();
			let _mouseOverFlag = false, _mouseOutFlag = false, _dragAndDropFlag = false,
				_mouseUpFlag = false, _onclickFlag = false, _mouseMoveFlag = false;
			let p1 = new Promise(function (resolve, reject) {
				
				knob_Base.src = "img/knob_Base.png";
				knob_Base.onload = resolve;
				knob_Base.onerror = reject;
			});
			let p2 = new Promise(function (resolve, reject) {
				
				knob_Spinner.src = "img/knob_Spinner.png";
				knob_Spinner.onload = resolve;
				knob_Spinner.onerror = reject;
			});
			let dataTip = $('');
			
			this.name = 'KnobVI';
			this.ctx = this.container.getContext("2d");
			this.inputPointCount = 0;
			this.output = [100];
			this.minValue = 0;
			this.maxValue = 100;
			this.defaultValue = 100;
			this.ratio = (this.maxValue - this.minValue) / (Math.PI * 1.5);
			this.radian = (this.defaultValue - this.minValue) / this.ratio;
			//VI双击弹出框
			this.boxTitle = '请输入初始值';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">最小值:</span><input type="number" id="KnobVI-input-1" value="' + this.minValue + '" class="normal-input">' +
				'<span class="normal-span">最大值:</span><input type="number" id="KnobVI-input-2" value="' + this.maxValue + '" class="normal-input">' +
				'<span class="normal-span">初值:</span><input type="number" id="KnobVI-input-3" value="' + this.defaultValue + '" class="normal-input"></div>';
			
			//设置旋钮初始参数
			this.setDataRange = function (minValue, maxValue, startValue) {
				
				let minVal = Number.isNaN(minValue) ? 0 : minValue;
				let maxVal = Number.isNaN(maxValue) ? 1 : maxValue;
				let startVal = Number.isNaN(startValue) ? 0 : startValue;
				if (minVal >= maxVal || startVal < minVal || startVal > maxVal) {
					
					console.log('KnobVI: DataRange set error!');
					return false;
				}
				
				this.minValue = minVal;
				this.maxValue = maxVal;
				this.defaultValue = startVal;
				
				this.ratio = (this.maxValue - this.minValue) / (Math.PI * 1.5);
				this.setData(this.defaultValue);
				this.radian = (this.defaultValue - this.minValue) / this.ratio;
				
				this.draw();
				
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">最小值:</span><input type="number" id="KnobVI-input-1" value="' + this.minValue + '" class="normal-input">' +
					'<span class="normal-span">最大值:</span><input type="number" id="KnobVI-input-2" value="' + this.maxValue + '" class="normal-input">' +
					'<span class="normal-span">初值:</span><input type="number" id="KnobVI-input-3" value="' + this.defaultValue + '" class="normal-input"></div>';
			};
			
			this.setData = function (data) {
				
				if (Number.isNaN(data)) {
					
					console.log('KnobVI: Not a number!');
					return false;
				}
				if (data < this.minValue || data > this.maxValue) {
					
					console.log('KnobVI: Out of range!');
					return false;
				}
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = data;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = data;
				}
			};
			
			this.setInitialData = function () {
				
				let minValue = Number($('#KnobVI-input-1').val());
				let maxValue = Number($('#KnobVI-input-2').val());
				let defaultValue = Number($('#KnobVI-input-3').val());
				this.setDataRange(minValue, maxValue, defaultValue);
			};
			
			this.reset = function () {
				
				this.index = 0;
				this.output = [100];
				this.minValue = 0;
				this.maxValue = 100;
				this.defaultValue = 100;
			};
			
			this.draw = function () {
				
				let xPos = this.container.width / 2;
				let yPos = this.container.height / 2;
				this.ctx.clearRect(0, 0, this.container.width, this.container.height);
				this.ctx.drawImage(knob_Base, 0, 0, this.container.width, this.container.height);
				this.ctx.save();   //保存之前位置
				this.ctx.translate(xPos, yPos);
				this.ctx.rotate(this.radian - 135 / 180 * Math.PI);  //旋转, 初始位置为左下角
				this.ctx.translate(-xPos, -yPos);
				this.ctx.drawImage(knob_Spinner, 0, 0, this.container.width, this.container.height);
				this.ctx.restore();  //恢复之前位置
				this.ctx.beginPath();
				this.ctx.font = "normal 14px Calibri";
				this.ctx.fillText(this.minValue.toString(), 0, this.container.height);
				this.ctx.fillText(this.maxValue.toString(), this.container.width - 7 * this.maxValue.toString().length, this.container.height); //字体大小为14
				this.ctx.closePath();
			};
			
			Promise.all([p1, p2]).then(function () {
				_this.draw();
			})
				.catch(function (e) {
					console.log('KnobVI:' + e);
				});
			
			this.dragAndDrop = function () {
			};// this.container.style.cursor = 'move';
			this.mouseOver = function () {
			}; // this.container.style.cursor = 'pointer';
			this.mouseOut = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseUp = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseMove = function () {
			};
			this.onclick = function () {
			};
			
			this.attachEvent = function (event, handler) {
				
				switch (event) {
					case 'mouseOver':
						this.mouseOver = handler;
						_mouseOverFlag = true;
						break;
					case 'mouseOut':
						this.mouseOut = handler;
						_mouseOutFlag = true;
						break;
					case 'dragAndDrop':
						this.dragAndDrop = handler;
						_dragAndDropFlag = true;
						break;
					case 'mouseUp':
						this.mouseUp = handler;
						_mouseUpFlag = true;
						break;
					case 'onclick':
						this.onclick = handler;
						_onclickFlag = true;
						break;
					case 'mouseMove':
						this.mouseMove = handler;
						_mouseMoveFlag = true;
						break;
				}
			};
			
			this.detachEvent = function (event) {
				
				switch (event) {
					case 'mouseOver':
						_mouseOverFlag = false;
						break;
					case 'mouseOut':
						_mouseOutFlag = false;
						break;
					case 'dragAndDrop':
						_dragAndDropFlag = false;
						break;
					case 'mouseUp':
						_mouseUpFlag = false;
						break;
					case 'onclick':
						_onclickFlag = false;
						break;
					case 'mouseMove':
						_mouseMoveFlag = false;
						break;
				}
				
			};
			
			function onMouseDown(e) {
				
				let tempData = rotateAxis(e.offsetX - _this.container.width / 2, -(e.offsetY - _this.container.height / 2), 135);
				startX = tempData[0];
				startY = tempData[1];
				if ((startX * startX + startY * startY) <= _this.container.width / 2 * _this.container.width / 2 * 0.5) {
					
					spinnerFlag = true;
				}
			}
			
			function onMouseMove(e) {
				
				let tempData = rotateAxis(e.offsetX - _this.container.width / 2, -(e.offsetY - _this.container.height / 2), 135);
				stopX = tempData[0];
				stopY = tempData[1];
				if ((stopX * stopX + stopY * stopY) <= _this.container.width / 2 * _this.container.width / 2 * 0.5 && !spinnerFlag) {
					_this.container.style.cursor = 'pointer';
				}
				else if (!spinnerFlag) {
					_this.container.style.cursor = 'auto';
				}
				if (spinnerFlag) {
					
					if (startY > 0 && stopY > 0) {
						if (startX < 0 && stopX >= 0) {
							roundCount += 1;
						}
						else if (startX > 0 && stopX <= 0) {
							roundCount--;
						}
					}
					
					_this.radian = calculateRadian(0, 0, stopX, stopY) + Math.PI * 2 * roundCount;
					if (_this.radian < 0) {
						_this.radian = 0;
					}
					else if (_this.radian > 270 / 360 * 2 * Math.PI) {
						_this.radian = 270 / 180 * Math.PI;
					}
					_this.setData(_this.radian * _this.ratio + parseFloat(_this.minValue));
					//旋钮数据更新后全局更新一次
					if (_this.dataLine) {
						
						VILibrary.InnerObjects.dataUpdater(_this.dataLine);
					}
					_this.draw();
					startX = stopX;
					startY = stopY;
					
					if (_mouseMoveFlag) {
						
						_this.mouseMove();
					}
				}
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">输出值:' + _this.output[_this.output.length - 1].toFixed(2) + '</span></div>');
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}
			
			function onMouseUp() {
				
				spinnerFlag = false;
				roundCount = 0;
				
				if (_mouseUpFlag) {
					
					_this.mouseUp();
				}
			}
			
			function onMouseOut() {
				
				dataTip.remove();
			}
			
			function calculateRadian(x1, y1, x2, y2) {
				// 直角的边长
				let x = x2 - x1;
				let y = y2 - y1;
				// 斜边长
				let z = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
				// 余弦
				let cos = y / z;
				// 弧度
				let radian;
				if (x >= 0) {
					radian = Math.acos(cos);
				}
				else {
					radian = Math.PI * 2 - Math.acos(cos);
				}
				return radian;
			}
			
			/**
			 * 坐标系转换
			 * @param x
			 * @param y
			 * @param angle
			 * @returns {[x1, y1]}
			 */
			function rotateAxis(x, y, angle) {
				let radian = angle / 180 * Math.PI;
				return [Math.sin(radian) * y + Math.cos(radian) * x, Math.cos(radian) * y - Math.sin(radian) * x];
			}
			
			this.container.addEventListener('mousemove', onMouseMove, false);
			this.container.addEventListener('mousedown', onMouseDown, false);
			this.container.addEventListener('mouseup', onMouseUp, false);
			this.container.addEventListener('mouseout', onMouseOut, false);
		}
		
		static get cnName() {
			
			return '旋钮';
		}
		
		static get defaultWidth() {
			
			return '150px';
		}
		
		static get defaultHeight() {
			
			return '150px';
		}
	},
	
	DCOutputVI: class DCOutputVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let timeStamp = 0, point = {}, checkClickTimer = null;
			let dataTip = $('');
			
			this.name = 'DCOutputVI';
			this.inputPointCount = 0;
			
			//VI双击弹出框
			this.boxTitle = '请设置输出值';
			this.boxContent = '<div class="input-div"><span class="normal-span">输出值:</span>' +
				'<input type="number" id="DCOutputVI-input" value="' + this.output[this.output.length - 1] + '" class="normal-input"></div>';
			
			this.updater = function () {
				
				this.setData(this.output);
			};
			
			this.setData = function (input) {
				
				let temp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(temp)) {
					
					return false;
				}
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = temp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = temp;
				}
				this.boxContent = '<div class="input-div"><span class="normal-span">输出值:</span>' +
					'<input type="number" id="DCOutputVI-input" value="' + temp + '" class="normal-input"></div>';
			};
			
			this.setInitialData = function () {
				
				this.setData($('#DCOutputVI-input').val());
			};
			
			this.draw();
			
			this.container.addEventListener('mousedown', function (e) {
				
				timeStamp = e.timeStamp;
				point.x = e.clientX;
				point.y = e.clientY;
			}, false);
			this.container.addEventListener('mouseup', function (e) {
				
				//X、Y移动距离小于5，点击间隔小于200，默认点击事件
				if ((e.timeStamp - timeStamp) < 200 && (point.x - e.clientX) < 5 && (point.y - e.clientY) < 5) {
					
					if (_this.dataLine) {
						
						clearTimeout(checkClickTimer);
						checkClickTimer = setTimeout(function () {
							
							_this.toggleObserver(!_this.timer);
						}, 250);
					}
				}
			}, false);
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">输出值:' + _this.output[_this.output.length - 1].toFixed(2) + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
			
			//重写双击事件，先去除模版VI旧的绑定再添加新的
			this.container.removeEventListener('dblclick', this.handleDblClick);
			
			this.handleDblClick = function (e) {
				
				clearTimeout(checkClickTimer);
				VILibrary.InnerObjects.showBox(_this);
			};
			
			this.container.addEventListener('dblclick', this.handleDblClick, false);
		}
		
		static get cnName() {
			
			return '直流输出';
		}
		
	},
	
	AddVI: class AddVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'AddVI';
			this.inputPointCount = 2;
			this.originalInput = 0;
			this.latestInput = 0;
			
			//多输入选择弹出框
			this.inputBoxTitle = '请选择加法器输入参数';
			this.inputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="input-type" value="1" alt="初值">' +
				'<label class="input-label" for="type1">初值</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="input-type" value="2" alt="反馈值">' +
				'<label class="input-label" for="type2">反馈值</label></div></div>';
			//VI双击弹出框
			this.boxTitle = '请输入初始值';
			this.boxContent = '<div class="input-div"><span class="normal-span">初值:</span>' +
				'<input type="number" id="AddVI-input" value="' + this.originalInput + '" class="normal-input"></div>';
			
			this.setData = function (input, inputType) {
				
				let inputValue = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputValue)) {
					
					console.log('AddVI: Input value error');
					return false;
				}
				
				if (inputType === 1) {
					
					this.originalInput = inputValue;
					this.boxContent = '<div class="input-div"><span class="normal-span">初值:</span>' +
						'<input type="number" id="AddVI-input" value="' + this.originalInput + '" class="normal-input"></div>';
				}
				else {
					
					this.latestInput = inputValue;
					let temp = parseFloat(this.originalInput - this.latestInput).toFixed(2);
					
					if (this.index <= (this.dataLength - 1)) {
						
						this.output[this.index] = temp;
						this.index += 1;
					}
					else {
						
						let i;
						for (i = 0; i < this.dataLength - 1; i += 1) {
							
							this.output[i] = this.output[i + 1];
						}
						this.output[this.dataLength - 1] = temp;
					}
				}
				
			};
			
			this.setInitialData = function () {
				
				this.setData(Number($('#AddVI-input').val()), 1);
			};
			
			this.reset = function () {
				
				this.originalInput = 0;
				this.latestInput = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">输入值:' + _this.originalInput.toFixed(2) + '</span>' +
					'<span class="normal-span">反馈值:' + _this.latestInput.toFixed(2) + '</span>' +
					'<span class="normal-span">输出值:' + _this.output[_this.output.length - 1].toFixed(2) + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '加法器';
		}
	},
	
	FFTVI: class FFTVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			this.name = 'FFTVI';
			this.setData = function (input) {
				
				if (!Array.isArray(input)) {
					
					return;
				}
				this.output = VILibrary.InnerObjects.fft(1, 10, input);
				return this.output;
				
			};
			
			this.draw = function () {
				
				this.ctx = this.container.getContext("2d");
				this.ctx.font = 'normal 14px Microsoft YaHei';
				this.ctx.fillStyle = 'orange';
				this.ctx.fillRect(0, 0, this.container.width, this.container.height);
				this.ctx.fillStyle = 'black';
				this.ctx.fillText(this.constructor.cnName, this.container.width / 2 - 7 * 3 / 2, this.container.height / 2 + 6);
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return 'FFT';
		}
	},
	
	PIDVI: class PIDVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'PIDVI';
			this.lastInput = 0;
			this.P = 1;
			this.I = 1;
			this.D = 1;
			this.Fs = 100;
			this.temp1 = 0;
			
			//VI双击弹出框
			this.boxTitle = '请输入PID参数';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">P:</span><input type="number" id="PIDVI-input-1" value="' + this.P + '" class="normal-input">' +
				'<span class="normal-span">I:</span><input type="number" id="PIDVI-input-2" value="' + this.I + '" class="normal-input">' +
				'<span class="normal-span">D:</span><input type="number" id="PIDVI-input-3" value="' + this.D + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let temp1 = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(temp1)) {
					
					console.log('PIDVI: Input value error');
					return false;
				}
				
				let v1, v2, v3, v21;
				
				v1 = this.P * temp1;
				
				v21 = this.temp1 + 0.5 * (Number(temp1) + Number(this.lastInput)) / this.Fs;
				this.temp1 = v21;
				v2 = this.I * v21;
				
				v3 = this.D * (temp1 - this.lastInput) * this.Fs;
				
				this.lastInput = Number(parseFloat(temp1).toFixed(2));
				let temp2 = Number(parseFloat(v1 + v2 + v3).toFixed(2));
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = temp2;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = temp2;
				}
				
			};
			
			this.setPID = function (P, I, D) {
				
				if (isNaN(P) || isNaN(I) || isNaN(D)) {
					
					return
				}
				this.P = P;
				this.I = I;
				this.D = D;
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">P:</span><input type="number" id="PIDVI-input-1" value="' + this.P + '" class="normal-input">' +
					'<span class="normal-span">I:</span><input type="number" id="PIDVI-input-2" value="' + this.I + '" class="normal-input">' +
					'<span class="normal-span">D:</span><input type="number" id="PIDVI-input-3" value="' + this.D + '" class="normal-input"></div>';
			};
			
			this.setInitialData = function () {
				
				let P = Number($('#PIDVI-input-1').val());
				let I = Number($('#PIDVI-input-2').val());
				let D = Number($('#PIDVI-input-3').val());
				this.setPID(P, I, D);
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.P = 1;
				this.I = 1;
				this.D = 1;
				this.Fs = 100;
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw = function () {
				
				this.ctx = this.container.getContext("2d");
				this.ctx.font = 'normal 14px Microsoft YaHei';
				this.ctx.fillStyle = 'orange';
				this.ctx.fillRect(0, 0, this.container.width, this.container.height);
				this.ctx.fillStyle = 'black';
				this.ctx.fillText(this.constructor.cnName.substring(0, 3), this.container.width / 2 - 7 * 3 / 2, this.container.height / 4 + 6);
				this.ctx.fillText(this.constructor.cnName.substring(3), this.container.width / 2 - 14 * 3 / 2, this.container.height * 3 / 4);
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">P:' + _this.P + '</span>' +
					'<span class="normal-span">I:' + _this.I + '</span>' +
					'<span class="normal-span">D:' + _this.D + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return 'PID控制器';
		}
	},
	
	VibrateSystemVI: class VibrateSystemVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			let Fs = 200, freedom = 1, dt, fremax;
			let g1 = [], h1 = [], y1 = [], y2 = [], u1 = [], u2 = [];
			
			this.name = 'VibrateSystemVI';
			
			function inverse(n, a) {
				
				let i, j, k, e, f, b = [];
				for (i = 0; i <= n; i++) {
					b.push([]);
					for (j = 0; j <= n; j++) {
						b[i].push(0);
					}
					b[i][i] = 1;
				}
				for (i = 1; i <= n; i++) {
					for (j = i; j <= n; j++) {
						if (a[i][j] != 0) {
							for (k = 1; k <= n; k++) {
								e = a[i][k];
								a[i][k] = a[j][k];
								a[j][k] = e;
								e = b[i][k];
								b[i][k] = b[j][k];
								b[j][k] = e;
							}
							f = 1.0 / a[i][i];
							for (k = 1; k <= n; k++) {
								a[i][k] = f * a[i][k];
								b[i][k] = f * b[i][k];
							}
							for (j = 1; j <= n; j++) {
								if (j != i) {
									f = -a[j][i];
									for (k = 1; k <= n; k++) {
										a[j][k] = a[j][k] + f * a[i][k];
										b[j][k] = b[j][k] + f * b[i][k];
									}
								}
							}
						}
					}
				}
				for (i = 1; i <= n; i++) {
					for (j = 1; j <= n; j++) {
						a[i][j] = b[i][j];
					}
				}
			}
			
			function setInitData() {
				let i, j, l, x, y, z, ss = 0;
				let m = [], c = [], k = [], a = [], b = [], e = [], f = [];
				let m1 = [], c1 = [], k1 = [];
				
				for (i = 0; i < 8; i++) {
					
					y1[i] = 0;
					y2[i] = 0;
					u1[i] = 0;
					u2[i] = 0;
					m1[i] = 0;
					c1[i] = 0;
					k1[i] = 0;
				}
				m1[1] = 1;
				c1[1] = 10;
				k1[1] = 20;
				// 传递矩阵求模型最大频率
				dt = 1.0 / Fs;
				for (i = 0; i <= 2 * freedom; i++) {
					
					g1.push([]);
					h1.push([]);
					m.push([]);
					c.push([]);
					k.push([]);
					a.push([]);
					b.push([]);
					e.push([]);
					f.push([]);
					for (j = 0; j < 2 * freedom; j++) {
						
						g1[i].push(0);
						h1[i].push(0);
						m[i].push(0);
						c[i].push(0);
						k[i].push(0);
						a[i].push(0);
						b[i].push(0);
						e[i].push(0);
						f[i].push(0);
					}
				}
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						m[i][j] = 0;
						c[i][j] = 0;
						k[i][j] = 0;
					}
					m[i][i] = m1[i];
					c[i][i - 1] = -c1[i];
					c[i][i] = c1[i] + c1[i + 1];
					c[i][i + 1] = -c1[i + 1];
					k[i][i - 1] = -k1[i];
					k[i][i] = k1[i] + k1[i + 1];
					k[i][i + 1] = -k1[i + 1];
				}
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						g1[i][j] = k[i][j];
					}
				}
				
				//******************************************************************
				inverse(freedom, g1);
				//******************************************************************
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						h1[i][j] = g1[i][j] * m[j][j];
					}
				}
				
				for (i = 1; i <= freedom; i++) {
					m1[i] = 1;
				}
				for (i = 1; i <= freedom; i++) {
					c1[i] = 0;
					for (j = 1; j <= freedom; j++) {
						c1[i] += m1[j] * h1[i][j];
					}
				}
				for (j = 1; j <= freedom; j++) {
					m1[j] = c1[j];
					if (c1[freedom] != 0) {
						m1[j] = c1[j] / c1[freedom];
					}
				}
				for (i = 1; i <= freedom; i++) {
					ss = ss + m1[i] * m1[i] * m[i][i];
				}
				ss = Math.sqrt(ss);
				for (i = 1; i <= freedom; i++) {
					m1[i] = m1[i] / ss;
				}
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						g1[i][j] = c1[freedom] * m1[i] * m1[j] * m[j][j];
						h1[i][j] -= g1[i][j];
					}
				}
				fremax = Math.sqrt(1.0 / Math.abs(c1[freedom])) / 2 * Math.PI;
				
				//==生成状态空间矩阵=====================================================
				for (i = 1; i <= freedom; i++) {
					for (j = 1; j <= freedom; j++) {
						a[i][j] = 0;
						a[i][j + freedom] = m[i][j];
						a[i + freedom][j] = m[i][j];
						a[i + freedom][j + freedom] = c[i][j];
						b[i][j] = -m[i][j];
						b[i][j + freedom] = 0;
						b[i + freedom][j] = 0;
						b[i + freedom][j + freedom] = k[i][j];
					}
				}
				i = 2 * freedom;
				//*********************************************************************
				inverse(i, a);//g.inverse(i,a);
				//*********************************************************************
				//   return;
				for (i = 1; i <= 2 * freedom; i++) {
					for (j = 1; j <= 2 * freedom; j++) {
						e[i][j] = 0;
						for (l = 1; l <= 2 * freedom; l++) {
							e[i][j] = e[i][j] - a[i][l] * b[l][j];
						}
					}
				}
				for (x = 1; x <= 2 * freedom; x++) {
					for (y = 1; y <= 2 * freedom; y++) {
						g1[x][y] = 0;
						f[x][y] = 0;
					}
					f[x][x] = 1;
				}
				//求E^At
				for (i = 1; i < 20; i++) {
					for (x = 1; x <= 2 * freedom; x++) {
						for (y = 1; y <= 2 * freedom; y++) {
							g1[x][y] = g1[x][y] + f[x][y];
						}
					}
					for (x = 1; x <= 2 * freedom; x++) {
						for (y = 1; y <= 2 * freedom; y++) {
							h1[x][y] = 0;
							for (z = 1; z <= 2 * freedom; z++) {
								h1[x][y] = h1[x][y] + e[x][z] * f[z][y];
							}
							h1[x][y] = h1[x][y] * dt / i;
						}
					}
					for (x = 1; x <= 2 * freedom; x++) {
						for (y = 1; y <= 2 * freedom; y++) {
							f[x][y] = h1[x][y];
						}
					}
				}
				for (x = 1; x <= 2 * freedom; x++) {
					for (y = 1; y <= 2 * freedom; y++) {
						h1[x][y] = 0;
						for (z = 1; z <= 2 * freedom; z++) {
							h1[x][y] = h1[x][y] + g1[x][z] * a[z][y];
						}
					}
				}
			}
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				if (this.index === 0) {
					setInitData();
				}
				let i, j;
				//计算过程
				u2[freedom + 1] = inputTemp;
				for (i = 1; i <= 2 * freedom; i++) {
					y2[i] = 0;
					for (j = 1; j <= 2 * freedom; j++) {
						y2[i] = y2[i] + g1[i][j] * y1[j] + h1[i][j] * (u1[j] + u2[j]) * 0.5 * dt;
					}
				}
				for (i = 1; i <= 2 * freedom; i++) {
					u1[i] = u2[i];
					y1[i] = y2[i];
				}
				//输出值
				let outputTemp = y2[1 + freedom];
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.reset = function () {
				
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return 'n自由度振动系统';
		}
	},
	
	RelayVI: class RelayVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			this.name = 'RelayVI';
			
			this.setData = function (input) {
				
				let tempInput = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(tempInput)) {
					
					return false;
				}
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = tempInput;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = tempInput;
				}
				return tempInput;
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return '存储器';
		}
	},
	
	SignalGeneratorVI: class SignalGeneratorVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let timeStamp = 0, point = {}, checkClickTimer = null;
			let dataTip = $('');
			let signalName = ['正弦波', '方波', '三角波', '白噪声'];
			
			this.name = 'SignalGeneratorVI';
			this.inputPointCount = 2;
			this.phase = 0;
			this.amp = 1;
			this.frequency = 256;
			this.signalType = 1;
			
			//多输入选择弹出框
			this.inputBoxTitle = '请选择信号发生器输入参数';
			this.inputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="input-type" value="1" alt="幅值">' +
				'<label class="input-label" for="type1">幅值</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="input-type" value="2" alt="频率">' +
				'<label class="input-label" for="type2">频率</label></div></div>';
			
			//VI双击弹出框
			this.boxTitle = '请选择信号类型';
			this.boxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="SignalGeneratorVI-type" value="1">' +
				'<label class="input-label" for="type1">正弦波</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="SignalGeneratorVI-type" value="2">' +
				'<label class="input-label" for="type2">方波</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="SignalGeneratorVI-type" value="3">' +
				'<label class="input-label" for="type3">三角波</label></div>' +
				'<div><input type="radio" id="type4" class="radio-input" name="SignalGeneratorVI-type" value="4">' +
				'<label class="input-label" for="type4">白噪声</label></div></div>';
			
			this.updater = function () {
				
				if (this.sourceInfoArray.length > 0) {
					
					for (let sourceInfo of this.sourceInfoArray) {
						
						let sourceVI = VILibrary.InnerObjects.getVIById(sourceInfo[0]);
						let sourceOutputType = sourceInfo[1];
						let inputType = sourceInfo[2];
						let sourceData = sourceVI.getData(sourceOutputType);
						this.setData(sourceData, inputType);
					}
					//更新完幅值频率后刷新一遍数据
					this.setData();
				}
			};
			
			// 采样频率为11025Hz
			this.setData = function (input, inputType) {
				
				if (inputType === 1) {
					
					let temp = Number(Array.isArray(input) ? input[input.length - 1] : input);
					if (Number.isNaN(temp)) {
						
						console.log('SignalGeneratorVI: Input value error');
						return false;
					}
					this.amp = temp;
				}
				else if (inputType === 2) {
					
					let temp = Number(Array.isArray(input) ? input[input.length - 1] : input);
					if (Number.isNaN(temp)) {
						
						console.log('SignalGeneratorVI: Input value error');
						return false;
					}
					this.frequency = temp;
				}
				else {
					
					if (Number.isNaN(this.amp) || Number.isNaN(this.frequency) || Number.isNaN(this.phase)) {
						
						return false;
					}
					let FS = 11025;
					let i, j;
					let T = 1 / this.frequency;//周期
					let dt = 1 / FS;//采样周期
					let t, t1, t2, t3;
					
					if (this.frequency <= 0) {
						
						for (i = 0; i < this.dataLength; i += 1) {
							
							this.output[i] = 0;
						}
						return this.output;
					}
					
					switch (parseInt(this.signalType)) {
						case 1://正弦波
							for (i = 0; i < this.dataLength; i += 1) {
								
								this.output[i] = this.amp * Math.sin(2 * Math.PI * this.frequency * i * dt + (2 * Math.PI * this.phase) / 360);
							}
							break;
						
						case 2://方波
							t1 = T / 2;//半周期时长
							t3 = T * this.phase / 360.0;
							for (i = 0; i < this.dataLength; i += 1) {
								
								t = i * dt + t3;
								t2 = t - Math.floor(t / T) * T;
								if (t2 >= t1) {
									
									this.output[i] = -this.amp;
								}
								else {
									
									this.output[i] = this.amp;
								}
							}
							break;
						
						case 3://三角波
							t3 = T * this.phase / 360.0;
							for (i = 0; i < this.dataLength; i += 1) {
								
								t = i * dt + t3;
								t2 = parseInt(t / T);
								t1 = t - t2 * T;
								if (t1 <= T / 2) {
									this.output[i] = 4 * this.amp * t1 / T - this.amp;
								}
								else {
									this.output[i] = 3 * this.amp - 4 * this.amp * t1 / T;
								}
							}
							break;
						
						case 4://白噪声
							t2 = 32767;// 0 -- 0x7fff
							for (i = 0; i < this.dataLength; i += 1) {
								t1 = 0;
								for (j = 0; j < 12; j += 1) {
									
									t1 += (t2 * Math.random());
								}
								this.output[i] = this.amp * (t1 - 6 * t2) / (3 * t2);
							}
							break;
						
						default://正弦波
							for (i = 0; i < this.dataLength; i += 1) {
								
								this.output[i] = this.amp * Math.sin(2 * Math.PI * this.frequency * i * dt + (2 * Math.PI * this.phase) / 360);
							}
					}
					this.phase += 10;
				}
			};
			
			this.setInitialData = function () {
				
				this.setSignalType(Number($('input[name=SignalGeneratorVI-type]:checked').val()));
			};
			
			this.setSignalType = function (type) {
				
				if (isNaN(type)) {
					return false;
				}
				this.signalType = type;
				this.setData();
				//全局更新一次
				if (this.dataLine) {
					
					VILibrary.InnerObjects.dataUpdater(this.dataLine);
				}
				
			};
			
			this.draw();
			
			this.container.addEventListener('mousedown', function (e) {
				
				timeStamp = e.timeStamp;
				point.x = e.clientX;
				point.y = e.clientY;
			}, false);
			this.container.addEventListener('mouseup', function (e) {
				
				//X、Y移动距离小于5，点击间隔小于200，默认点击事件
				if ((e.timeStamp - timeStamp) < 200 && (point.x - e.clientX) < 5 && (point.y - e.clientY) < 5) {
					
					if (_this.dataLine) {
						
						clearTimeout(checkClickTimer);
						checkClickTimer = setTimeout(function () {
							
							_this.toggleObserver(!_this.timer);
						}, 250);
					}
				}
			}, false);
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">信号类型:' + signalName[_this.signalType - 1] + '</span>' +
					'<span class="normal-span">幅值:' + _this.amp.toFixed(2) + '</span>' +
					'<span class="normal-span">频率:' + _this.frequency.toFixed(2) + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
			
			//重写双击事件，先去除模版VI旧的绑定再添加新的
			this.container.removeEventListener('dblclick', this.handleDblClick);
			this.handleDblClick = function (e) {
				
				clearTimeout(checkClickTimer);
				VILibrary.InnerObjects.showBox(_this);
			};
			this.container.addEventListener('dblclick', this.handleDblClick, false);
		}
		
		static get cnName() {
			
			return '信号发生器';
		}
	},
	
	BallBeamVI: class BallBeamVI extends TemplateVI {
		
		constructor(VICanvas, draw3DFlag) {
			
			super(VICanvas);
			
			const _this = this;
			
			let camera, scene, renderer, controls, markControl, switchControl, resetControl,
				base, beam, ball, mark, offButton, onButton, resetButton;
			let dataTip = $('');
			
			this.name = 'BallBeamVI';
			this.Fs = 50;
			this.markPosition = 0;  //记录标记移动位置
			this.PIDAngle = 0;
			this.PIDPosition = 0;
			this.limit = true;
			this.angle1 = 0;
			this.angle2 = 0;
			this.position1 = 0;
			this.position2 = 0;
			this.angelOutput = [0];
			this.positionOutput = [0];
			
			//多输出选择弹出框
			this.outputBoxTitle = '请选择球杆模型输出参数';
			this.outputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="output-type" value="1">' +
				'<label class="input-label" for="type1">反馈角度</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="output-type" value="2">' +
				'<label class="input-label" for="type2">反馈位置</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="output-type" value="3">' +
				'<label class="input-label" for="type3">标记位置</label></div></div>';
			
			this.toggleObserver = function (flag) {
				
				if (flag) {
					
					if (!this.timer && this.dataLine) {
						
						markControl.detach(mark);
						scene.remove(offButton);
						switchControl.detach(offButton);
						scene.add(onButton);
						switchControl.attach(onButton);
						this.timer = window.setInterval(function () {
							VILibrary.InnerObjects.dataUpdater(_this.dataLine);
						}, 50);
					}
				}
				else {
					
					if (this.timer) {
						
						window.clearInterval(this.timer);
						this.timer = 0;
					}
					markControl.attach(mark);
					scene.remove(onButton);
					switchControl.detach(onButton);
					scene.add(offButton);
					switchControl.attach(offButton);
				}
			};
			/**
			 * 三维绘图
			 */
			function ballBeamDraw() {
				
				renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
				renderer.setClearColor(0x6495ED);
				renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);
				
				camera = new THREE.PerspectiveCamera(30, _this.container.clientWidth / _this.container.clientHeight, 1, 100000);
				camera.position.z = 400;
				camera.lookAt(new THREE.Vector3(0, 0, 0));
				
				controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.rotateSpeed = 0.8;
				controls.enableZoom = true;
				controls.zoomSpeed = 1.2;
				controls.enableDamping = true;
				
				scene = new THREE.Scene();
				
				let light = new THREE.AmbientLight(0x555555);
				scene.add(light);
				let light1 = new THREE.DirectionalLight(0xffffff, 1);
				light1.position.set(4000, 4000, 4000);
				scene.add(light1);
				let light2 = new THREE.DirectionalLight(0xffffff, 1);
				light2.position.set(-4000, 4000, -4000);
				scene.add(light2);
				
				//use as a reference plane for ObjectControl
				let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400));
				
				//标记拖动控制
				markControl = new ObjectControls(camera, renderer.domElement);
				markControl.map = plane;
				markControl.offsetUse = true;
				
				markControl.attachEvent('mouseOver', function () {
					
					renderer.domElement.style.cursor = 'pointer';
				});
				
				markControl.attachEvent('mouseOut', function () {
					
					renderer.domElement.style.cursor = 'auto';
				});
				
				markControl.attachEvent('dragAndDrop', onBallBeamDrag);
				
				markControl.attachEvent('mouseUp', function () {
					
					controls.enabled = true;
					renderer.domElement.style.cursor = 'auto';
				});
				
				//开关控制
				switchControl = new ObjectControls(camera, renderer.domElement);
				switchControl.map = plane;
				switchControl.offsetUse = true;
				
				switchControl.attachEvent('mouseOver', function () {
					
					renderer.domElement.style.cursor = 'pointer';
				});
				
				switchControl.attachEvent('mouseOut', function () {
					
					renderer.domElement.style.cursor = 'auto';
				});
				
				switchControl.attachEvent('onclick', function () {
					
					_this.toggleObserver(!_this.timer);
				});
				
				//重置
				resetControl = new ObjectControls(camera, renderer.domElement);
				resetControl.map = plane;
				resetControl.offsetUse = true;
				
				resetControl.attachEvent('mouseOver', function () {
					
					renderer.domElement.style.cursor = 'pointer';
				});
				
				resetControl.attachEvent('mouseOut', function () {
					
					renderer.domElement.style.cursor = 'auto';
				});
				
				resetControl.attachEvent('onclick', function () {
					_this.reset();
				});
				
				scene.add(base);
				scene.add(beam);
				scene.add(ball);
				scene.add(mark);
				scene.add(offButton);
				scene.add(resetButton);
				markControl.attach(mark);
				switchControl.attach(offButton);
				resetControl.attach(resetButton);
				
				ballBeamAnimate();
				
				// window.addEventListener('resize', function () {
				//
				//     camera.aspect = domElement.clientWidth / domElement.clientHeight;
				//     camera.updateProjectionMatrix();
				//     renderer.setSize(domElement.clientWidth, domElement.clientHeight);
				// });
			}
			
			function onBallBeamDrag() {
				
				controls.enabled = false;
				renderer.domElement.style.cursor = 'pointer';
				this.focused.position.y = this.previous.y;  //lock y direction
				if (this.focused.position.x < -120) {
					
					this.focused.position.x = -120;
				}
				else if (this.focused.position.x > 120) {
					
					this.focused.position.x = 120;
				}
				_this.markPosition = parseInt(this.focused.position.x);
			}
			
			window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
				|| window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
			
			function ballBeamAnimate() {
				
				window.requestAnimationFrame(ballBeamAnimate);
				markControl.update();
				controls.update();
				renderer.render(scene, camera);
				
			}
			
			function setPosition(ang, pos) {
				
				let angle = -ang;//角度为逆时针旋转
				beam.rotation.z = angle;
				ball.rotation.z = angle;
				mark.rotation.z = angle;
				ball.position.y = pos * Math.sin(angle);
				ball.position.x = pos * Math.cos(angle);
				mark.position.y = _this.markPosition * Math.sin(angle);
				mark.position.x = _this.markPosition * Math.cos(angle);
			}
			
			/**
			 *
			 * @param input 输入端口读取角度
			 */
			this.setData = function (input) {
				
				let inputAngle = Number(Array.isArray(input) ? input[input.length - 1] : input);
				
				if (Number.isNaN(inputAngle)) {
					
					console.log('BallBeamVI: Input value error');
					return;
				}
				let outputPosition, Ts = 1 / this.Fs, angleMax = 100 * Ts;
				if (this.limit) {
					if ((inputAngle - this.PIDAngle) > angleMax) {
						
						inputAngle = this.PIDAngle + angleMax;
					}
					if ((this.PIDAngle - inputAngle) > angleMax) {
						
						inputAngle = this.PIDAngle - angleMax;
					}
					if (inputAngle > 30) {
						
						inputAngle = 30;
					}
					if (inputAngle < -30) {
						
						inputAngle = -30;
					}
				}
				
				this.PIDAngle = inputAngle;//向输出端口上写数据
				
				outputPosition = this.position1 + 0.5 * Ts * (inputAngle + this.angle1);
				this.angle1 = inputAngle;
				this.position1 = outputPosition;
				inputAngle = outputPosition;
				outputPosition = this.position2 + 0.5 * Ts * (inputAngle + this.angle2);
				this.angle2 = inputAngle;
				this.position2 = outputPosition;
				
				outputPosition = outputPosition < -120 ? -120 : outputPosition;
				outputPosition = outputPosition > 120 ? 120 : outputPosition;
				this.PIDPosition = parseFloat(outputPosition).toFixed(2);//向输出端口上写数据
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.angelOutput[this.index] = this.PIDAngle;
					this.positionOutput[this.index] = this.PIDPosition;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.angelOutput[i] = this.angelOutput[i + 1];
						this.positionOutput[i] = this.positionOutput[i + 1];
					}
					this.angelOutput[this.dataLength - 1] = this.PIDAngle;
					this.positionOutput[this.dataLength - 1] = this.PIDPosition;
				}
				setPosition(this.PIDAngle * Math.PI / 180, this.PIDPosition);
			};
			
			this.getData = function (dataType) {
				
				if (dataType === 1) {
					
					return this.angelOutput;  //输出角度数组
				}
				if (dataType === 2) {
					
					return this.positionOutput;  //输出位置数组
					
				}
				if (dataType === 3) {
					
					return this.markPosition;  //输出标记位置
				}
			};
			
			this.reset = function () {
				
				this.toggleObserver(false);
				this.PIDAngle = 0;
				this.PIDPosition = 0;
				this.angelOutput = [0];
				this.positionOutput = [0];
				this.limit = true;
				this.angle1 = 0;
				this.angle2 = 0;
				this.position1 = 0;
				this.position2 = 0;
				this.index = 0;
				this.markPosition = 0;
				setPosition(0, 0);
			};
			
			this.draw = function () {
				
				if (draw3DFlag) {
					
					let loadingImg = document.createElement('img');
					loadingImg.src = 'img/loading.gif';
					loadingImg.style.width = '64px';
					loadingImg.style.height = '64px';
					loadingImg.style.position = 'absolute';
					loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
					loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
					loadingImg.style.zIndex = '10001';
					this.container.parentNode.appendChild(loadingImg);
					
					let promiseArr = [
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/base.mtl', 'assets/BallBeamControl/base.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/beam.mtl', 'assets/BallBeamControl/beam.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/ball.mtl', 'assets/BallBeamControl/ball.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/mark.mtl', 'assets/BallBeamControl/mark.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/offButton.mtl', 'assets/BallBeamControl/offButton.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/resetButton.mtl', 'assets/BallBeamControl/resetButton.obj'),
						VILibrary.InnerObjects.loadModule('assets/BallBeamControl/onButton.mtl', 'assets/BallBeamControl/onButton.obj')
					];
					Promise.all(promiseArr).then(function (objArr) {
						
						base = objArr[0];
						beam = objArr[1];
						ball = objArr[2];
						mark = objArr[3];
						offButton = objArr[4];
						resetButton = objArr[5];
						onButton = objArr[6];
						loadingImg.style.display = 'none';
						ballBeamDraw();
					}).catch(e => console.log('BallBeanVIError: ' + e));
				}
				else {
					
					this.ctx = this.container.getContext("2d");
					let img = new Image();
					img.src = 'img/BallBeam.png';
					img.onload = function () {
						
						_this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
					};
				}
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">标记位置:' + _this.markPosition + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '球杆模型';
		}
		
		static get defaultWidth() {
			
			return '550px';
		}
		
		static get defaultHeight() {
			
			return '300px';
		}
	},
	
	DoubleTankVI: class DoubleTankVI extends TemplateVI {
		
		constructor(VICanvas, draw3DFlag) {
			
			super(VICanvas);
			
			const _this = this;
			
			let camera, scene, renderer, controls, tank, sinkWater, tapWater1, tapWater2, tapWater3, tankWater1,
				tankWater2;
			let waterMaterial = new THREE.MeshBasicMaterial({color: 0x00a0e3, opacity: 0.9});
			let dataTip = $('');
			
			this.name = 'DoubleTankVI';
			this.Fs = 50;
			this.h1 = 0;
			this.h2 = 0;
			this.waterInput = 0;
			this.waterOutput1 = [0];    //水箱1流量输出
			this.waterOutput2 = [0];    //水箱2流量输出
			this.tankHeight1 = [0];    //水箱1水位高度
			this.tankHeight2 = [0];    //水箱2水位高度
			
			//多输出选择弹出框
			this.outputBoxTitle = '请选择双容水箱输出参数';
			this.outputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="output-type" value="1">' +
				'<label class="input-label" for="type1">水箱1输出流量</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="output-type" value="2">' +
				'<label class="input-label" for="type2">水箱2输出流量</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="output-type" value="3">' +
				'<label class="input-label" for="type3">水箱1水位</label></div> ' +
				'<div><input type="radio" id="type4" class="radio-input" name="output-type" value="4">' +
				'<label class="input-label" for="type4">水箱2水位</label></div></div>';
			
			function setWater() {
				
				scene.remove(tapWater1);
				scene.remove(tankWater1);
				scene.remove(tapWater2);
				scene.remove(tankWater2);
				scene.remove(tapWater3);
				scene.remove(sinkWater);
				
				let h3 = 200 - (_this.h1 + _this.h2) / 10;
				sinkWater = new THREE.Mesh(new THREE.BoxGeometry(3180, h3, 1380), waterMaterial);
				sinkWater.position.x = 30;
				sinkWater.position.y = -900 + h3 / 2;
				scene.add(sinkWater);
				if (_this.waterInput > 0) {
					
					tapWater1 = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 800, 20), waterMaterial);
					tapWater1.position.x = -400;
					tapWater1.position.y = 600;
					
					scene.add(tapWater1);
				}
				
				if (_this.h1 > 0) {
					
					tankWater1 = new THREE.Mesh(new THREE.CylinderGeometry(290, 290, _this.h1, 50), waterMaterial);
					tankWater1.position.x = -200;
					tankWater1.position.y = _this.h1 / 2 + 200;
					
					tapWater2 = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 800, 20), waterMaterial);
					tapWater2.position.x = 400;
					tapWater2.position.y = -220;
					
					scene.add(tankWater1);
					scene.add(tapWater2);
				}
				
				if (_this.h2 > 0) {
					
					tankWater2 = new THREE.Mesh(new THREE.CylinderGeometry(290, 290, _this.h2, 50), waterMaterial);
					tankWater2.position.x = 600;
					tankWater2.position.y = _this.h2 / 2 - 620;
					
					tapWater3 = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 200, 20), waterMaterial);
					tapWater3.position.x = 1350;
					tapWater3.position.y = -900 + 200 / 2;
					
					scene.add(tankWater2);
					scene.add(tapWater3);
				}
			}
			
			function doubleTankDraw() {
				
				renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
				renderer.setClearColor('wheat');
				renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);
				
				camera = new THREE.PerspectiveCamera(30, _this.container.clientWidth / _this.container.clientHeight, 1, 100000);
				camera.position.z = 5000;
				camera.lookAt(new THREE.Vector3(0, 0, 0));
				
				controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.rotateSpeed = 0.8;
				controls.enableZoom = true;
				controls.zoomSpeed = 1.2;
				controls.enableDamping = true;
				
				scene = new THREE.Scene();
				
				let light = new THREE.AmbientLight(0x555555);
				scene.add(light);
				let light1 = new THREE.DirectionalLight(0xffffff, 1);
				light1.position.set(4000, 4000, 4000);
				scene.add(light1);
				let light2 = new THREE.DirectionalLight(0xffffff, 1);
				light2.position.set(-4000, 4000, -4000);
				scene.add(light2);
				
				tank.position.x = -500;
				tank.position.y = 1000;
				scene.add(tank);
				
				sinkWater = new THREE.Mesh(new THREE.BoxGeometry(3180, 200, 1380), waterMaterial);
				sinkWater.position.x = 30;
				sinkWater.position.y = -900 + 200 / 2;
				scene.add(sinkWater);
				
				animate();
				
				// window.addEventListener('resize', function () {
				//
				//     camera.aspect = domElement.clientWidth / domElement.clientHeight;
				//     camera.updateProjectionMatrix();
				//     renderer.setSize(domElement.clientWidth, domElement.clientHeight);
				// });
			}
			
			window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
				|| window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
			
			function animate() {
				
				window.requestAnimationFrame(animate);
				controls.update();
				
				renderer.render(scene, camera);
				
			}
			
			this.setData = function (input) {
				
				let waterInput = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(waterInput)) {
					
					return false;
				}
				waterInput = waterInput < 0 ? 0 : waterInput;
				
				let u11, u12, dh1, u21, u22, dh2;
				u11 = waterInput;
				u12 = Math.sqrt(2 * 9.8 * this.h1); //伯努利方程
				dh1 = (u11 - u12) / this.Fs;
				this.h1 = this.h1 + dh1;
				this.h1 = this.h1 > 800 ? 800 : this.h1;    //800为水箱高度
				this.waterInput = u11;
				
				u21 = Math.sqrt(2 * 9.8 * this.h1);
				u22 = Math.sqrt(2 * 9.8 * this.h2);
				dh2 = (u21 - u22) / this.Fs;
				this.h2 = this.h2 + dh2;
				this.h2 = this.h2 > 800 ? 800 : this.h2;    //800为水箱高度
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.waterOutput1[this.index] = u12;
					this.waterOutput2[this.index] = u22;
					this.tankHeight1[this.index] = this.h1;
					this.tankHeight2[this.index] = this.h2;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.waterOutput1[i] = this.waterOutput1[i + 1];
						this.waterOutput2[i] = this.waterOutput2[i + 1];
						this.tankHeight1[i] = this.tankHeight1[i + 1];
						this.tankHeight2[i] = this.tankHeight2[i + 1];
					}
					this.waterOutput1[this.dataLength - 1] = u12;
					this.waterOutput2[this.dataLength - 1] = u22;
					this.tankHeight1[this.dataLength - 1] = this.h1;
					this.tankHeight2[this.dataLength - 1] = this.h2;
				}
				setWater();
			};
			
			this.getData = function (dataType) {
				
				if (dataType === 1) {
					
					return this.waterOutput1;  //输出
				}
				if (dataType === 2) {
					
					return this.waterOutput2;  //输出
					
				}
				if (dataType === 3) {
					
					return this.tankHeight1;  //输出水箱1水位高度
				}
				if (dataType === 4) {
					
					return this.tankHeight2;  //输出水箱2水位高度
				}
			};
			
			this.reset = function () {
				
				this.toggleObserver(false);
				this.Fs = 50;
				this.h1 = 0;
				this.h2 = 0;
				this.index = 0;
				this.waterInput = 0;
				this.waterOutput1 = [0];
				this.waterOutput2 = [0];
				this.tankHeight1 = [0];
				this.tankHeight2 = [0];
				setWater();
			};
			
			this.draw = function () {
				
				if (draw3DFlag) {
					
					let loadingImg = document.createElement('img');
					loadingImg.src = 'img/loading.gif';
					loadingImg.style.width = '64px';
					loadingImg.style.height = '64px';
					loadingImg.style.position = 'absolute';
					loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
					loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
					loadingImg.style.zIndex = '10001';
					this.container.parentNode.appendChild(loadingImg);
					
					VILibrary.InnerObjects.loadModule('assets/DoubleTank/tank.mtl', 'assets/DoubleTank/tank.obj')
						.then(function (obj) {
							
							tank = obj;
							loadingImg.style.display = 'none';
							doubleTankDraw();
						}).catch(e => console.log('DoubleTankVIError: ' + e));
				}
				else {
					
					this.ctx = this.container.getContext("2d");
					let img = new Image();
					img.src = 'img/BallBeam.png';
					img.onload = function () {
						
						_this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
					};
				}
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">水箱1水位:' + _this.h1.toFixed(2) + '</span>' +
					'<span class="normal-span">水箱2水位:' + _this.h2.toFixed(2) + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '双容水箱';
		}
		
		static get defaultWidth() {
			
			return '550px';
		}
		
		static get defaultHeight() {
			
			return '300px';
		}
	},
	
	RotorExperimentalRigVI: class RotorExperimentalRigVI extends TemplateVI {
		
		constructor(VICanvas, draw3DFlag) {
			
			super(VICanvas);
			
			const _this = this;
			
			let camera, scene, renderer, controls, base, rotor, offSwitch, onSwitch, switchControl,
				phase = 0, sampleFrequency = 8192, dt = 1 / sampleFrequency;
			
			this.name = 'RotorExperimentalRigVI';
			this.signalType = 1;
			this.rotateSpeed = 2399;
			this.rotateFrequency = this.rotateSpeed / 60;  //旋转频率
			this.dataLength = 2048;
			this.signalOutput = [0];
			this.frequencyOutput = [0];
			this.orbitXOutput = [0];
			this.orbitYOutput = [0];
			
			//多输出选择弹出框
			this.outputBoxTitle = '请选择转子实验台输出参数';
			this.outputBoxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="output-type" value="1">' +
				'<label class="input-label" for="type1">时域信号</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="output-type" value="2">' +
				'<label class="input-label" for="type2">频域信号</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="output-type" value="3">' +
				'<label class="input-label" for="type3">轴心轨迹</label></div>' +
				'<div><input type="radio" id="type4" class="radio-input" name="output-type" value="4">' +
				'<label class="input-label" for="type4">旋转频率</label></div></div>';
			
			//VI双击弹出框
			this.boxTitle = '请设置输出信号类型';
			this.boxContent = '<div class="input-div">' +
				'<div><input type="radio" id="type1" class="radio-input" name="RotorExperimentalRigVI-type" value="1">' +
				'<label class="input-label" for="type1">转速信号</label></div>' +
				'<div><input type="radio" id="type2" class="radio-input" name="RotorExperimentalRigVI-type" value="2">' +
				'<label class="input-label" for="type2">加速度信号</label></div>' +
				'<div><input type="radio" id="type3" class="radio-input" name="RotorExperimentalRigVI-type" value="3">' +
				'<label class="input-label" for="type3">轴心位移X信号</label></div>' +
				'<div><input type="radio" id="type4" class="radio-input" name="RotorExperimentalRigVI-type" value="4">' +
				'<label class="input-label" for="type4">轴心位移Y信号</label></div></div>';
			
			this.toggleObserver = function (flag) {
				
				if (flag) {
					
					if (!this.timer) {
						
						scene.remove(offSwitch);
						switchControl.detach(offSwitch);
						scene.add(onSwitch);
						switchControl.attach(onSwitch);
						this.timer = window.setInterval(function () {
							
							phase += 36;
							generateData();
							
							rotor.rotation.x += 2 * Math.PI * _this.rotateSpeed / 10;
							//定时更新相同数据线VI的数据
							if (_this.dataLine) {
								
								VILibrary.InnerObjects.dataUpdater(_this.dataLine);
							}
						}, 100);
					}
				}
				else {
					
					if (this.timer) {
						
						window.clearInterval(this.timer);
						this.timer = 0;
					}
					scene.remove(onSwitch);
					switchControl.detach(onSwitch);
					scene.add(offSwitch);
					switchControl.attach(offSwitch);
				}
			};
			
			/**
			 *设置转速
			 * @param input 输入端口读取转速
			 */
			this.setData = function (input) {
				
				let temp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(temp)) {
					
					return false;
				}
				this.rotateSpeed = temp;
				this.rotateFrequency = this.rotateSpeed / 60;
			};
			
			this.setInitialData = function () {
				
				_this.signalType = Number($('input[name=RotorExperimentalRigVI-type]:checked').val());
			};
			
			this.getData = function (dataType) {
				
				if (dataType === 1) {
					
					return this.signalOutput;  //输出时域信号
					
				}
				if (dataType === 2) {
					
					return this.frequencyOutput;  //输出频域信号
					
				}
				if (dataType === 3) {
					
					return [this.orbitXOutput, this.orbitYOutput];  //输出轴心位置
					
				}
				if (dataType === 4) {
					
					return this.rotateFrequency;  //输出旋转频率
					
				}
			};
			
			function generateData() {
				
				let i;
				for (i = 0; i < _this.dataLength; i += 1) {
					
					_this.orbitXOutput[i] = 7.5 * Math.sin(2 * Math.PI * _this.rotateFrequency * i * dt + 2 * Math.PI * phase / 360) +
						4 * Math.sin(4 * Math.PI * _this.rotateFrequency * i * dt + 4 * Math.PI * phase / 360) + 2 * Math.random();
				}
				for (i = 0; i < _this.dataLength; i += 1) {
					
					_this.orbitYOutput[i] = 7.5 * Math.sin(2 * Math.PI * _this.rotateFrequency * i * dt + 2 * Math.PI * (phase + 90) / 360) +
						4 * Math.sin(4 * Math.PI * _this.rotateFrequency * i * dt + 4 * Math.PI * (phase + 90) / 360) + 2 * Math.random();
				}
				if (_this.signalType == 1) {//转速信号    正弦波
					
					for (i = 0; i < _this.dataLength; i += 1) {
						
						_this.signalOutput[i] = 5 * Math.sin(2 * Math.PI * _this.rotateFrequency * i * dt + 2 * Math.PI * phase / 360);
					}
				}
				else if (_this.signalType == 2) {//加速度信号
					
					for (i = 0; i < _this.dataLength; i += 1) {
						
						_this.signalOutput[i] = 5 * Math.sin(2 * Math.PI * _this.rotateFrequency * i * dt + 2 * Math.PI * phase / 360) +
							6 * Math.sin(4 * Math.PI * _this.rotateFrequency * i * dt + 4 * Math.PI * phase / 360) + 2 * Math.random();
					}
				}
				else if (_this.signalType == 3) {//位移X信号
					
					for (i = 0; i < _this.dataLength; i += 1) {
						
						_this.signalOutput[i] = _this.orbitXOutput[i];
					}
				}
				else if (_this.signalType == 4) {//位移Y信号
					
					for (i = 0; i < _this.dataLength; i += 1) {
						
						_this.signalOutput[i] = _this.orbitYOutput[i];
					}
				}
				_this.frequencyOutput = VILibrary.InnerObjects.fft(1, 11, _this.signalOutput);
			}
			
			/**
			 * 三维绘图
			 * @constructor
			 */
			function rotorExperimentalRigDraw() {
				
				renderer = new THREE.WebGLRenderer({
					canvas: _this.container,
					antialias: true
				});
				renderer.setClearColor(0x6495ED);
				renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);
				
				camera = new THREE.PerspectiveCamera(30, _this.container.clientWidth / _this.container.clientHeight, 1, 100000);
				camera.position.z = 400;
				camera.lookAt(new THREE.Vector3(0, 0, 0));
				
				controls = new THREE.OrbitControls(camera, renderer.domElement);
				controls.rotateSpeed = 0.8;
				controls.enableZoom = true;
				controls.zoomSpeed = 1.2;
				controls.enableDamping = true;
				
				scene = new THREE.Scene();
				
				let light = new THREE.AmbientLight(0x555555);
				scene.add(light);
				let light1 = new THREE.DirectionalLight(0xffffff, 1);
				light1.position.set(4000, 4000, 4000);
				scene.add(light1);
				let light2 = new THREE.DirectionalLight(0xffffff, 1);
				light2.position.set(-4000, 4000, -4000);
				scene.add(light2);
				
				//use as a reference plane for ObjectControl
				let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400));
				
				//开关控制
				switchControl = new ObjectControls(camera, renderer.domElement);
				switchControl.map = plane;
				switchControl.offsetUse = true;
				
				switchControl.attachEvent('mouseOver', function () {
					
					renderer.domElement.style.cursor = 'pointer';
				});
				
				switchControl.attachEvent('mouseOut', function () {
					
					renderer.domElement.style.cursor = 'auto';
				});
				
				switchControl.attachEvent('onclick', function () {
					
					_this.toggleObserver(!_this.timer);
				});
				
				scene.add(base);
				scene.add(rotor);
				scene.add(offSwitch);
				switchControl.attach(offSwitch);
				
				rotorAnimate();
				
				// window.addEventListener('resize', function () {
				//
				//     camera.aspect = domElement.clientWidth / domElement.clientHeight;
				//     camera.updateProjectionMatrix();
				//     renderer.setSize(domElement.clientWidth, domElement.clientHeight);
				// });
			}
			
			window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
				|| window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
			function rotorAnimate() {
				
				window.requestAnimationFrame(rotorAnimate);
				switchControl.update();
				controls.update();
				renderer.render(scene, camera);
				
			}
			
			this.reset = function () {
				
				_this.signalType = 1;
				_this.rotateSpeed = 0;
				_this.index = 0;
				_this.rotateFrequency = 0;  //旋转频率
				_this.signalOutput = [0];
				_this.frequencyOutput = [0];
				_this.orbitXOutput = [0];
				_this.orbitYOutput = [0];
			};
			
			this.draw = function () {
				
				if (draw3DFlag) {
					
					let loadingImg = document.createElement('img');
					loadingImg.src = 'img/loading.gif';
					loadingImg.style.width = '64px';
					loadingImg.style.height = '64px';
					loadingImg.style.position = 'absolute';
					loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
					loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
					loadingImg.style.zIndex = '1001';
					this.container.parentNode.appendChild(loadingImg);
					
					let promiseArr = [
						VILibrary.InnerObjects.loadModule('assets/RotorExperimentalRig/base.mtl', 'assets/RotorExperimentalRig/base.obj'),
						VILibrary.InnerObjects.loadModule('assets/RotorExperimentalRig/rotor.mtl', 'assets/RotorExperimentalRig/rotor.obj'),
						VILibrary.InnerObjects.loadModule('assets/RotorExperimentalRig/offSwitch.mtl', 'assets/RotorExperimentalRig/offSwitch.obj'),
						VILibrary.InnerObjects.loadModule('assets/RotorExperimentalRig/onSwitch.mtl', 'assets/RotorExperimentalRig/onSwitch.obj')
					];
					Promise.all(promiseArr).then(function (objArr) {
						
						base = objArr[0];
						rotor = objArr[1];
						offSwitch = objArr[2];
						onSwitch = objArr[3];
						loadingImg.style.display = 'none';
						rotorExperimentalRigDraw();
					}).catch(e => console.log('BallBeanVIError: ' + e));
				}
				else {
					
					this.ctx = this.container.getContext("2d");
					let img = new Image();
					img.src = 'img/RotorExperimentalRig.png';
					img.onload = function () {
						
						_this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
					};
				}
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return '转子实验台';
		}
		
		static get defaultWidth() {
			
			return '550px';
		}
		
		static get defaultHeight() {
			
			return '300px';
		}
	},
	
	TextVI: class TextVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			this.name = 'TextVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			this.latestInput = 0;
			this.decimalPlace = 1;
			//VI双击弹出框
			this.boxTitle = '请输入保留小数位数';
			this.boxContent = '<div class="input-div">' +
				'<input type="number" id="TextVI-input" value="' + this.decimalPlace + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				this.latestInput = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(this.latestInput)) {
					
					return false;
				}
				
				let str = parseFloat(this.latestInput).toFixed(this.decimalPlace);
				this.ctx.font = "normal 12px Microsoft YaHei";
				this.ctx.fillStyle = 'orange';
				this.ctx.fillRect(0, 0, this.container.width, this.container.height);
				this.ctx.fillStyle = 'black';
				this.ctx.fillText(str, this.container.width / 2 - 6 * str.length, this.container.height / 2 + 6);
			};
			
			this.setDecimalPlace = function (decimalPlace) {
				
				this.decimalPlace = parseInt(decimalPlace);
				this.setData(this.latestInput);
				this.boxContent = '<div class="input-div">' +
					'<input type="number" id="TextVI-input" value="' + this.decimalPlace + '" class="normal-input"></div>';
			};
			
			this.setInitialData = function () {
				
				this.setDecimalPlace($('#TextVI-input').val());
			};
			
			this.reset = function () {
				
				this.latestInput = 0;
				this.decimalPlace = 1;
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return '文本显示';
		}
		
		static get defaultWidth() {
			
			return '100px';
		}
		
		static get defaultHeight() {
			
			return '40px';
		}
	},
	
	RoundPanelVI: class RoundPanelVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			this.name = 'RoundPanelVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			this.latestInput = 0;
			this.handAngle = Math.PI * 5 / 6;
			this.panelRangeAngle = Math.PI * 4 / 3;
			this.minValue = 0;
			this.maxValue = 100;
			this.bigSectionNum = 10;
			this.smallSectionNum = 10;
			this.unit = '';
			this.title = '';
			this.bgColor = "RGB(249, 250, 249)";
			this.screenColor = "RGB(61, 132, 185)";
			this.borderColor = "RGB(100,100,100)";
			this.fontColor = "RGB(0, 0, 0)";
			this.fontSize = parseInt(16 * this.radius / 150);
			this.R = this.container.width > this.container.height ? this.container.height / 2 : this.container.width / 2;
			this.radius = this.R * 0.9;
			//VI双击弹出框
			this.boxTitle = '请设置初始参数';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">标题:</span><input type="text" id="RoundPanelVI-input-1" value="' + this.title + '" class="normal-input">' +
				'<span class="normal-span">单位:</span><input type="text" id="RoundPanelVI-input-2" value="' + this.unit + '" class="normal-input">' +
				'<span class="normal-span">最小值:</span><input type="number" id="RoundPanelVI-input-3" value="' + this.minValue + '" class="normal-input">' +
				'<span class="normal-span">最大值:</span><input type="number" id="RoundPanelVI-input-4" value="' + this.maxValue + '" class="normal-input"></div>';
			
			function parsePosition(angle) {
				
				let position = [];
				position[0] = _this.radius * 0.82 * Math.cos(angle);
				position[1] = _this.radius * 0.82 * Math.sin(angle);
				return position;
			}
			
			function dataFormation(data) {
				
				data = parseFloat(data);
				if (data == 0) {
					
					return '0';
				}
				if (Math.abs(data) >= 1000) {
					
					data = data / 1000;
					data = data.toFixed(1).toString() + 'k';
				}
				else if (Math.abs(data) < 1000 && Math.abs(data) >= 100) {
					
					data = data.toFixed(0).toString();
				}
				else if (Math.abs(data) < 100 && Math.abs(data) >= 10) {
					
					data = data.toFixed(1).toString();
				}
				else if (Math.abs(data) < 10) {
					
					data = data.toFixed(2).toString();
				}
				return data;
			}
			
			this.setRange = function (minVal, maxVal, unitText, titleText) {
				
				minVal = Array.isArray(minVal) ? minVal[minVal.length - 1] : minVal;
				if (Number.isNaN(minVal)) {
					
					return false;
				}
				maxVal = Array.isArray(maxVal) ? maxVal[maxVal.length - 1] : maxVal;
				if (Number.isNaN(maxVal)) {
					
					return false;
				}
				if (maxVal < minVal) {
					
					return false;
				}
				this.minValue = minVal;
				this.maxValue = maxVal;
				
				if (typeof unitText === 'string') {
					
					this.unit = unitText;
				}
				
				if (typeof titleText === 'string') {
					
					this.title = titleText;
				}
				this.draw();
				
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">标题:</span><input type="text" id="RoundPanelVI-input-1" value="' + this.title + '" class="normal-input">' +
					'<span class="normal-span">单位:</span><input type="text" id="RoundPanelVI-input-2" value="' + this.unit + '" class="normal-input">' +
					'<span class="normal-span">最小值:</span><input type="number" id="RoundPanelVI-input-3" value="' + this.minValue + '" class="normal-input">' +
					'<span class="normal-span">最大值:</span><input type="number" id="RoundPanelVI-input-4" value="' + this.maxValue + '" class="normal-input"></div>';
			};
			
			this.setData = function (input) {
				
				this.latestInput = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(this.latestInput)) {
					
					return false;
				}
				this.latestInput = this.latestInput < this.minValue ? this.minValue : this.latestInput;
				this.latestInput = this.latestInput > this.maxValue ? this.maxValue : this.latestInput;
				this.latestInput = parseFloat(this.latestInput).toFixed(2);
				this.handAngle = Math.PI * 5 / 6 + this.latestInput / this.maxValue * this.panelRangeAngle;
				this.draw();
			};
			
			this.setInitialData = function () {
				
				let title = Number($('#RoundPanelVI-input-1').val());
				let unit = Number($('#RoundPanelVI-input-2').val());
				let minValue = Number($('#RoundPanelVI-input-3').val());
				let maxValue = Number($('#RoundPanelVI-input-4').val());
				this.setRange(minValue, maxValue, unit, title);
			};
			
			this.reset = function () {
				
				this.latestInput = 0;
			};
			this.drawHand = function () {
				
				this.ctx.save();
				// 位移到目标点
				this.ctx.translate(this.R, this.R);
				this.ctx.rotate(this.handAngle);
				this.ctx.moveTo(-this.radius * 0.05, 0);
				this.ctx.lineTo(0, -this.radius * 0.02);
				this.ctx.lineTo(this.radius * 0.75, 0);
				this.ctx.lineTo(0, this.radius * 0.02);
				this.ctx.lineTo(-this.radius * 0.05, 0);
				this.ctx.fillStyle = this.screenColor;
				this.ctx.fill();
				this.ctx.restore();
				
			};
			
			this.draw = function () {
				
				// 画出背景边框
				this.ctx.beginPath();
				this.ctx.arc(this.R, this.R, this.R, 0, 360, false);
				this.ctx.lineTo(this.R * 2, this.R);
				this.ctx.fillStyle = this.borderColor;//填充颜色
				this.ctx.fill();//画实心圆
				this.ctx.closePath();
				// 画出背景圆
				this.ctx.beginPath();
				this.ctx.arc(this.R, this.R, this.R * 0.97, 0, 360, false);
				this.ctx.fillStyle = this.bgColor;//填充颜色
				this.ctx.fill();//画实心圆
				this.ctx.closePath();
				// 保存
				this.ctx.save();
				// 位移到目标点
				this.ctx.translate(this.R, this.R);
				// 画出圆弧
				this.ctx.beginPath();
				this.ctx.arc(0, 0, this.radius * 0.98, Math.PI * 5 / 6, Math.PI / 6, false);
				this.ctx.arc(0, 0, this.radius, Math.PI / 6, Math.PI * 5 / 6, true);
				this.ctx.lineTo(this.radius * 0.98 * Math.cos(Math.PI * 5 / 6), this.radius * 0.98 * Math.sin(Math.PI * 5 / 6));
				this.ctx.restore();
				this.ctx.fillStyle = this.screenColor;
				this.ctx.fill();
				this.ctx.beginPath();
				this.ctx.lineCap = "round";
				this.ctx.lineWidth = 2;
				if (this.radius < 150) {
					
					this.ctx.lineWidth = 1;
				}
				this.ctx.strokeStyle = this.screenColor;
				let i, j;
				// 保存
				this.ctx.save();
				// 位移到目标点
				this.ctx.translate(this.R, this.R);
				
				let rotateAngle = Math.PI * 5 / 6, position, markStr, fontSize;
				this.ctx.font = 'normal ' + this.fontSize / 2 + 'px Microsoft YaHei';
				fontSize = /\d+/.exec(this.ctx.font)[0];
				for (i = 0; i <= this.bigSectionNum; i += 1) {
					
					this.ctx.save();
					this.ctx.rotate(rotateAngle);
					this.ctx.moveTo(this.radius * 0.99, 0);
					this.ctx.lineTo(this.radius * 0.9, 0);
					this.ctx.restore();
					
					if (this.R > 100) {
						for (j = 1; j < this.smallSectionNum; j += 1) {
							
							if (i == this.bigSectionNum) {
								break;
							}
							this.ctx.save();
							this.ctx.rotate(rotateAngle);
							this.ctx.rotate(j * this.panelRangeAngle / this.smallSectionNum / this.bigSectionNum);
							this.ctx.moveTo(this.radius * 0.99, 0);
							this.ctx.lineTo(this.radius * 0.95, 0);
							this.ctx.restore();
						}
						
						if (i > 0 && i < this.bigSectionNum) {
							
							markStr = dataFormation((this.maxValue - _thisminValue) / this.bigSectionNum * i + this.minValue);
							position = parsePosition(rotateAngle);
							this.ctx.fillText(markStr, position[0] - fontSize / 4 * markStr.length, position[1]);
						}
					}
					rotateAngle += this.panelRangeAngle / this.bigSectionNum;
				}
				markStr = dataFormation(this.minValue);
				position = parsePosition(Math.PI * 5 / 6);
				this.ctx.fillText(markStr, position[0] - fontSize / 4 * markStr.length, position[1]);
				markStr = dataFormation(this.maxValue);
				position = parsePosition(Math.PI * 5 / 6 + this.panelRangeAngle);
				this.ctx.fillText(markStr, position[0] - fontSize / 3 * markStr.length, position[1]);
				this.ctx.restore();
				
				this.ctx.font = 'bold ' + this.fontSize + 'px Microsoft YaHei';
				fontSize = /\d+/.exec(this.ctx.font)[0];
				markStr = this.latestInput.toString() + this.unit;
				this.ctx.fillText(markStr, this.R - fontSize / 4 * markStr.length, this.R * 3 / 2);
				markStr = this.title;
				this.ctx.fillText(markStr, this.R - fontSize / 4 * markStr.length, this.R * 1 / 2);
				this.ctx.stroke();
				this.ctx.closePath();
				this.drawHand();
			};
			
			this.draw();
		}
		
		static get cnName() {
			
			return '圆表盘';
		}
		
		static get defaultWidth() {
			
			return '150px';
		}
		
		static get defaultHeight() {
			
			return '150px';
		}
	},
	
	BarVI: class BarVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			this.name = 'BarVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			this.labelX = [];
			this.maxValY = 100;
			this.minValY = 0;
			this.autoZoom = true;
			this.pointNum = 100;
			this.drawRulerFlag = true;
			//网格矩形四周边距 TOP RIGHT BOTTOM LEFT//
			this.offsetT = 10;
			this.offsetR = 10;
			this.offsetB = 10;
			this.offsetL = 10;
			if ((this.container.height >= 200) && (this.container.width >= 200)) {
				
				this.offsetB = 35;
				this.offsetL = 42;
			}
			this.waveWidth = this.container.width - this.offsetL - this.offsetR;
			this.waveHeight = this.container.height - this.offsetT - this.offsetB;
			this.ratioX = this.waveWidth / this.pointNum;
			this.ratioY = this.waveHeight / (this.maxValY - this.minValY);
			
			//颜色选型//
			this.bgColor = "RGB(255, 255, 255)";
			this.screenColor = 'RGB(255,253,246)';
			this.gridColor = "RGB(204, 204, 204)";
			this.fontColor = "RGB(0, 0, 0)";
			this.signalColor = "RGB(255, 100, 100)";
			this.rulerColor = "RGB(255, 100, 100)";
			
			//缓冲数组
			this.bufferVal = [];
			this.curPointX = this.offsetL;
			this.curPointY = this.offsetT;
			
			this.setData = function (data) {
				
				if (!Array.isArray(data)) {
					
					console.log('BarVI: input type error');
					return false;
				}
				this.pointNum = data.length > this.pointNum ? data.length : this.pointNum;
				
				let YMax = 0, YMin = 0, i;
				for (i = 0; i < this.pointNum; i += 1) {
					
					this.bufferVal[i] = data[i] == undefined ? 0 : data[i];
					YMax = YMax < this.bufferVal[i] ? this.bufferVal[i] : YMax;
					YMin = YMin > this.bufferVal[i] ? this.bufferVal[i] : YMin;
				}
				if (this.autoZoom) {
					
					this.setAxisRangY(YMin, 1.2 * YMax);
				}
				this.ratioX = this.waveWidth / this.pointNum;
				this.ratioY = this.waveHeight / (this.maxValY - this.minValY);
				this.draw();
			};
			
			this.draw = function () {
				
				this.drawBackground();
				this.drawWave();
				if (this.drawRulerFlag) {
					
					this.drawRuler();
				}
			};
			
			this.drawWave = function () {
				
				let i, barHeight, x, y;
				//绘制柱状图
				for (i = 0; i < this.pointNum; i += 1) {
					
					x = this.offsetL + i * this.ratioX;
					barHeight = this.bufferVal[i] * this.ratioY;
					y = this.offsetT + this.waveHeight - barHeight;
					this.ctx.beginPath();
					this.ctx.fillStyle = this.signalColor;
					this.ctx.fillRect(x + 0.1 * this.ratioX, y, this.ratioX * 0.8, barHeight);
					this.ctx.closePath();
				}
			};
			
			this.drawBackground = function () {
				
				let ctx = this.ctx;
				//刷背景//
				ctx.beginPath();
				/* 将这个渐变设置为fillStyle */
				// ctx.fillStyle = grad;
				ctx.fillStyle = this.bgColor;
				ctx.lineWidth = 3;
				ctx.strokeStyle = "RGB(25, 25, 25)";
				ctx.fillRect(0, 0, this.container.width, this.container.height);
				ctx.strokeRect(3, 3, this.container.width - 6, this.container.height - 6);
				ctx.closePath();
				
				//画网格矩形边框和填充
				ctx.beginPath();
				ctx.fillStyle = this.screenColor;
				ctx.lineWidth = 1;
				ctx.strokeStyle = 'RGB(0, 0, 0)';
				ctx.fillRect(this.offsetL, this.offsetT, this.waveWidth, this.waveHeight);
				ctx.strokeRect(this.offsetL, this.offsetT, this.waveWidth, this.waveHeight);
				ctx.closePath();
				
				//网格行数
				let nRow = this.container.height / 50;
				let divY = this.waveHeight / nRow;
				
				ctx.beginPath();
				ctx.lineWidth = 1;
				ctx.lineCap = "round";
				ctx.strokeStyle = this.gridColor;
				
				let i;
				//绘制横向网格线
				for (i = 1; i < nRow; i += 1) {
					
					ctx.moveTo(this.offsetL, divY * i + this.offsetT);
					ctx.lineTo(this.container.width - this.offsetR, divY * i + this.offsetT);
				}
				ctx.stroke();
				ctx.closePath();
				
				if ((this.container.height >= 200) && (this.container.width >= 200)) {
					
					//绘制横纵刻度
					let scaleYNum = this.container.height / 50;
					let scaleXNum = this.container.width / 50;
					let scaleYStep = this.waveHeight / scaleYNum;
					let scaleXStep = this.waveWidth / scaleXNum;
					ctx.beginPath();
					ctx.lineWidth = 1;
					ctx.strokeStyle = this.fontColor;
					//画纵刻度
					let k;
					for (k = 2; k <= scaleYNum; k += 2) {
						
						ctx.moveTo(this.offsetL - 6, this.offsetT + k * scaleYStep);
						ctx.lineTo(this.offsetL, this.offsetT + k * scaleYStep);
						
					}
					// //画横刻度
					// for (k = 0; k < scaleXNum; k += 2) {
					//
					//
					//     ctx.moveTo(this.offsetL + k * scaleXStep, this.offsetT + this.waveHeight);
					//     ctx.lineTo(this.offsetL + k * scaleXStep, this.offsetT + this.waveHeight + 7);
					//
					// }
					ctx.stroke();
					ctx.closePath();
					////////////////画数字字体////////////////
					ctx.font = "normal 12px Calibri";
					
					let valStepX = this.pointNum / scaleXNum;
					let valStepY = (this.maxValY - this.minValY) / scaleYNum;
					
					ctx.fillStyle = this.fontColor;
					let temp = 0;
					if (this.labelX.length < this.pointNum) {
						
						for (i = 0; i < this.pointNum; i += 1) {
							
							this.labelX[i] = i;
						}
					}
					//横坐标刻度//
					for (i = 0; i < scaleXNum; i += 2) {
						
						temp = this.labelX[parseInt(valStepX * i)];
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), this.offsetL + scaleXStep * i - 9 + this.ratioX / 2, this.container.height - 10);
					}
					//纵坐标刻度//
					for (i = 2; i <= scaleYNum; i += 2) {
						
						temp = this.maxValY - valStepY * i;
						
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), this.offsetL - 35, this.offsetT + scaleYStep * i + 5);
					}
					ctx.closePath();
					ctx.save();
				}
			};
			
			this.drawBackground();
			
			this.drawRuler = function () {
				
				//是否缝隙间不绘制标尺
				// if ((this.curPointX + 0.1 * this.ratioX - this.offsetL ) % this.ratioX < 0.2 * this.ratioX) {
				//
				//     return;
				// }
				
				if (this.curPointX >= (this.container.width - this.offsetR)) {
					return;
				}
				//画标尺//
				this.ctx.beginPath();
				this.ctx.lineWidth = 1;
				this.ctx.lineCap = "round";
				this.ctx.strokeStyle = this.rulerColor;
				this.ctx.font = "normal 14px Calibri";
				this.ctx.fillStyle = this.rulerColor;
				
				//竖标尺//
				this.ctx.moveTo(this.curPointX + 0.5, this.offsetT);
				this.ctx.lineTo(this.curPointX + 0.5, this.container.height - this.offsetB);
				this.ctx.stroke();
				let curPointX = parseInt((this.curPointX - this.offsetL + this.ratioX / 2) * this.pointNum / this.waveWidth);
				curPointX = curPointX === this.pointNum ? curPointX - 1 : curPointX;
				let curPointY = VILibrary.InnerObjects.fixNumber(this.bufferVal[curPointX]);
				this.ctx.fillText('(' + this.labelX[curPointX] + ',' + curPointY + ')',
					this.container.width - this.curPointX < 80 ? this.curPointX - 80 : this.curPointX + 4, this.offsetT + 15);
				this.ctx.closePath();
			};
			
			this.reset = function () {
				
				this.bufferVal = [];
				this.drawBackground();
			};
			
			this.setAxisRangY = function (yMin, yMax) {
				
				this.minValY = yMin;
				this.maxValY = yMax;
				this.drawBackground();
			};
			
			this.setAxisX = function (labelX) {
				
				this.labelX = labelX;
				this.drawBackground();
			};
			
			this.setPointNum = function (num) {
				
				this.pointNum = num;
				this.drawBackground();
			};
			
			this.setLabel = function (xLabel, yLabel) {
				
				this.strLabelX = xLabel;
				this.strLabelY = yLabel;
				this.drawBackground();
			};
			
			this.setRowColNum = function (row, col) {
				
				this.nRow = row;
				this.nCol = col;
				this.drawBackground();
			};
			
			let _mouseOverFlag = false;
			let _mouseOutFlag = false;
			let _dragAndDropFlag = false;
			let _mouseUpFlag = false;
			let _onclickFlag = false;
			let _mouseMoveFlag = false;
			
			this.dragAndDrop = function () {
			};// this.container.style.cursor = 'move';
			this.mouseOver = function () {
			}; // this.container.style.cursor = 'pointer';
			this.mouseOut = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseUp = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseMove = function () {
			};
			this.onclick = function () {
			};
			
			this.attachEvent = function (event, handler) {
				
				switch (event) {
					case 'mouseOver':
						this.mouseOver = handler;
						_mouseOverFlag = true;
						break;
					case 'mouseOut':
						this.mouseOut = handler;
						_mouseOutFlag = true;
						break;
					case 'dragAndDrop':
						this.dragAndDrop = handler;
						_dragAndDropFlag = true;
						break;
					case 'mouseUp':
						this.mouseUp = handler;
						_mouseUpFlag = true;
						break;
					case 'onclick':
						this.onclick = handler;
						_onclickFlag = true;
						break;
					case 'mouseMove':
						this.mouseMove = handler;
						_mouseMoveFlag = true;
						break;
				}
			};
			
			this.detachEvent = function (event) {
				
				switch (event) {
					case 'mouseOver':
						_mouseOverFlag = false;
						break;
					case 'mouseOut':
						_mouseOutFlag = false;
						break;
					case 'dragAndDrop':
						_dragAndDropFlag = false;
						break;
					case 'mouseUp':
						_mouseUpFlag = false;
						break;
					case 'onclick':
						_onclickFlag = false;
						break;
					case 'mouseMove':
						_mouseMoveFlag = false;
						break;
				}
				
			};
			
			function onMouseMove(event) {
				
				if (!_this.drawRulerFlag || _this.bufferVal.length == 0) {
					
					return;
				}
				_this.curPointX = event.offsetX == undefined ? event.layerX : event.offsetX - 1;
				_this.curPointY = event.offsetY == undefined ? event.layerY : event.offsetY - 1;
				
				if (_this.curPointX <= _this.offsetL) {
					
					_this.curPointX = _this.offsetL;
				}
				if (_this.curPointX >= (_this.container.width - _this.offsetR)) {
					
					_this.curPointX = _this.container.width - _this.offsetR;
				}
				_this.draw();
				if (_mouseMoveFlag) {
					_this.mouseMove();
				}
			}
			
			this.container.addEventListener('mousemove', onMouseMove, false);   // mouseMoveListener
		}
		
		static get cnName() {
			
			return '柱状图';
		}
		
		static get defaultWidth() {
			
			return '500px';
		}
		
		static get defaultHeight() {
			
			return '250px';
		}
	},
	
	WaveVI: class WaveVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			this.name = 'WaveVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			//坐标单位//
			this.strLabelX = 'X';
			this.strLabelY = 'Y';
			//坐标数值//
			this.maxValX = 1023;
			this.minValX = 0;
			this.maxValY = 10;
			this.minValY = -10;
			this.autoZoom = true;
			//网格行列数//
			this.nRow = 4;
			this.nCol = 8;
			this.pointNum = 1023;
			this.drawRulerFlag = true;
			
			//网格矩形四周边距 TOP RIGHT BOTTOM LEFT//
			this.offsetT = 10;
			this.offsetR = 10;
			this.offsetB = 10;
			this.offsetL = 10;
			if ((_this.container.height >= 200) && (_this.container.width >= 200)) {
				
				_this.offsetB = 30;
				_this.offsetL = 35;
			}
			this.waveWidth = this.container.width - this.offsetL - this.offsetR;
			this.waveHeight = this.container.height - this.offsetT - this.offsetB;
			
			//颜色选型//
			this.bgColor = "RGB(249, 250, 249)";
			this.screenColor = "RGB(61, 132, 185)";
			this.gridColor = "RGB(200, 200, 200)";
			this.fontColor = "RGB(0, 0, 0)";
			this.signalColor = "RGB(255, 255, 0)";
			this.rulerColor = "RGB(255, 255, 255)";
			
			//缓冲数组
			this.bufferVal = [];
			this.curPointX = this.offsetL;
			this.curPointY = this.offsetT;
			
			this.draw = function () {
				
				this.drawBackground();
				this.drawWave();
				if (this.drawRulerFlag) {
					
					this.drawRuler();
				}
			};
			
			this.drawWave = function () {
				
				let ratioX = this.waveWidth / (this.pointNum - 1);
				let ratioY = this.waveHeight / (this.maxValY - this.minValY);
				let pointX = [];
				let pointY = [];
				
				let i;
				for (i = 0; i < this.pointNum; i += 1) {
					
					pointX[i] = this.offsetL + i * ratioX;
					pointY[i] = this.offsetT + (this.maxValY - this.bufferVal[i]) * ratioY;
					if (pointY[i] < this.offsetT) {
						
						pointY[i] = this.offsetT;
					}
					if (pointY[i] > (this.offsetT + this.waveHeight)) {
						
						pointY[i] = this.offsetT + this.waveHeight;
					}
				}
				//绘制波形曲线
				this.ctx.beginPath();
				this.ctx.lineWidth = 2;
				this.ctx.lineCap = "round";
				this.ctx.strokeStyle = this.signalColor;
				this.ctx.moveTo(pointX[0], pointY[0]);
				for (i = 1; i < this.pointNum; i += 1) {
					
					this.ctx.lineTo(pointX[i], pointY[i]);
				}
				this.ctx.stroke();
				this.ctx.closePath();
				this.ctx.save();
			};
			
			this.drawBackground = function () {
				
				let ctx = this.ctx;
				//刷背景//
				ctx.beginPath();
				/* 将这个渐变设置为fillStyle */
				// ctx.fillStyle = grad;
				ctx.fillStyle = this.bgColor;
				ctx.lineWidth = 3;
				ctx.strokeStyle = "RGB(25, 25, 25)";
				ctx.fillRect(0, 0, this.container.width, this.container.height);
				ctx.strokeRect(3, 3, this.container.width - 6, this.container.height - 6);
				ctx.closePath();
				
				//画网格矩形边框和填充
				ctx.beginPath();
				ctx.fillStyle = this.screenColor;
				ctx.lineWidth = 1;
				ctx.strokeStyle = this.gridColor;
				ctx.fillRect(this.offsetL, this.offsetT, this.waveWidth, this.waveHeight);
				ctx.strokeRect(this.offsetL + 0.5, this.offsetT + 0.5, this.waveWidth, this.waveHeight);
				ctx.closePath();
				
				let nRow = this.nRow;
				let nCol = this.nCol;
				let divX = this.waveWidth / nCol;
				let divY = this.waveHeight / nRow;
				
				ctx.beginPath();
				ctx.lineWidth = 1;
				ctx.lineCap = "round";
				ctx.strokeStyle = this.gridColor;
				
				let i, j;
				//绘制横向网格线
				for (i = 1; i < nRow; i += 1) {
					
					ctx.moveTo(this.offsetL, divY * i + this.offsetT);
					ctx.lineTo(this.container.width - this.offsetR, divY * i + this.offsetT);
				}
				//绘制纵向网格线
				for (j = 1; j < nCol; j += 1) {
					
					ctx.moveTo(divX * j + this.offsetL, this.offsetT);
					ctx.lineTo(divX * j + this.offsetL, this.container.height - this.offsetB);
				}
				ctx.stroke();
				ctx.closePath();
				
				if ((this.container.height >= 200) && (this.container.width >= 200)) {
					
					let scaleYNum = 8;
					let scaleXNum = 16;
					let scaleYStep = this.waveHeight / scaleYNum;
					let scaleXStep = this.waveWidth / scaleXNum;
					
					////////////////画数字字体////////////////
					ctx.font = "normal 12px Calibri";
					
					let strLab;
					//横标签//
					strLab = this.strLabelX;
					ctx.fillText(strLab, this.container.width - this.offsetR - strLab.length * 6 - 10, this.container.height - this.offsetB + 20);
					
					//纵标签//
					strLab = this.strLabelY;
					ctx.fillText(strLab, strLab.length * 6, this.offsetT + 12);
					
					let valStepX = (this.maxValX - this.minValX) / scaleXNum;
					let valStepY = (this.maxValY - this.minValY) / scaleYNum;
					
					ctx.fillStyle = this.fontColor;
					let temp = 0;
					//横坐标刻度//
					for (i = 2; i < scaleXNum; i += 2) {
						
						temp = this.minValX + valStepX * i;
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), this.offsetL + scaleXStep * i - 9, this.container.height - 12);
					}
					//纵坐标刻度//
					for (i = 2; i < scaleYNum; i += 2) {
						
						temp = this.maxValY - valStepY * i;
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), this.offsetL - 28, this.offsetT + scaleYStep * i + 5);
					}
					ctx.closePath();
					ctx.save();
				}
			};
			
			this.drawBackground();
			
			this.drawRuler = function () {
				
				//画标尺//
				this.ctx.beginPath();
				this.ctx.lineWidth = 1;
				this.ctx.lineCap = "round";
				this.ctx.strokeStyle = this.rulerColor;
				this.ctx.font = "normal 14px Calibri";
				this.ctx.fillStyle = this.rulerColor;
				
				//竖标尺//
				this.ctx.moveTo(this.curPointX + 0.5, this.offsetT);
				this.ctx.lineTo(this.curPointX + 0.5, this.container.height - this.offsetB);
				this.ctx.stroke();
				let curPointX = parseFloat((this.curPointX - this.offsetL) * (this.maxValX - this.minValX) / this.waveWidth)
					.toFixed(2);
				let curPointY = parseFloat(this.bufferVal[parseInt((this.curPointX - this.offsetL) * this.pointNum / this.waveWidth)])
					.toFixed(2);
				this.ctx.fillText('(' + curPointX + ',' + curPointY + ')',
					this.container.width - this.curPointX < 80 ? this.curPointX - 80 : this.curPointX + 4, this.offsetT + 15);
				this.ctx.closePath();
			};
			
			this.reset = function () {
				
				this.bufferVal = [];
				this.drawBackground();
			};
			
			this.setData = function (data) {
				
				if (!Array.isArray(data)) {
					
					console.log('WaveVI: input type error');
					return false;
				}
				this.pointNum = data.length > this.pointNum ? data.length : this.pointNum;
				let YMax = 0, YMin = 0, i;
				for (i = 0; i < this.pointNum; i += 1) {
					
					this.bufferVal[i] = data[i] == undefined ? 0 : data[i];
					YMax = YMax < this.bufferVal[i] ? this.bufferVal[i] : YMax;
					YMin = YMin > this.bufferVal[i] ? this.bufferVal[i] : YMin;
				}
				if (this.autoZoom) {
					
					if ((this.maxValY <= YMax) || (this.maxValY - YMax > 5 * (YMax - YMin))) {
						
						this.maxValY = 2 * YMax - YMin;
						this.minValY = 2 * YMin - YMax;
					}
					if ((this.minValY >= YMin) || (YMin - this.maxValY > 5 * (YMax - YMin))) {
						
						this.maxValY = 2 * YMax - YMin;
						this.minValY = 2 * YMin - YMax;
					}
					if (YMax < 0.01 && YMin > -0.01) {
						
						this.maxValY = 1;
						this.minValY = -1;
					}
				}
				this.draw();
			};
			
			this.setAxisRangX = function (xMin, xNax) {
				
				this.minValX = xMin;
				this.maxValX = xNax;
				this.drawBackground();
			};
			
			this.setAxisRangY = function (yMin, yMax) {
				
				this.minValY = yMin;
				this.maxValY = yMax;
				this.drawBackground();
			};
			
			this.setPointNum = function (num) {
				
				this.pointNum = num;
				this.drawBackground();
			};
			
			this.setLabel = function (xLabel, yLabel) {
				
				this.strLabelX = xLabel;
				this.strLabelY = yLabel;
				this.drawBackground();
			};
			
			this.setRowColNum = function (row, col) {
				
				this.nRow = row;
				this.nCol = col;
				this.drawBackground();
			};
			
			let _mouseOverFlag = false;
			let _mouseOutFlag = false;
			let _dragAndDropFlag = false;
			let _mouseUpFlag = false;
			let _onclickFlag = false;
			let _mouseMoveFlag = false;
			
			this.dragAndDrop = function () {
			};// this.container.style.cursor = 'move';
			this.mouseOver = function () {
			}; // this.container.style.cursor = 'pointer';
			this.mouseOut = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseUp = function () {
			}; // this.container.style.cursor = 'auto';
			this.mouseMove = function () {
			};
			this.onclick = function () {
			};
			
			this.attachEvent = function (event, handler) {
				
				switch (event) {
					case 'mouseOver':
						this.mouseOver = handler;
						_mouseOverFlag = true;
						break;
					case 'mouseOut':
						this.mouseOut = handler;
						_mouseOutFlag = true;
						break;
					case 'dragAndDrop':
						this.dragAndDrop = handler;
						_dragAndDropFlag = true;
						break;
					case 'mouseUp':
						this.mouseUp = handler;
						_mouseUpFlag = true;
						break;
					case 'onclick':
						this.onclick = handler;
						_onclickFlag = true;
						break;
					case 'mouseMove':
						this.mouseMove = handler;
						_mouseMoveFlag = true;
						break;
				}
			};
			
			this.detachEvent = function (event) {
				
				switch (event) {
					case 'mouseOver':
						_mouseOverFlag = false;
						break;
					case 'mouseOut':
						_mouseOutFlag = false;
						break;
					case 'dragAndDrop':
						_dragAndDropFlag = false;
						break;
					case 'mouseUp':
						_mouseUpFlag = false;
						break;
					case 'onclick':
						_onclickFlag = false;
						break;
					case 'mouseMove':
						_mouseMoveFlag = false;
						break;
				}
				
			};
			
			function onMouseMove(event) {
				
				if (!_this.drawRulerFlag || _this.bufferVal.length == 0) {
					
					return;
				}
				_this.curPointX = event.offsetX == undefined ? event.layerX : event.offsetX - 1;
				_this.curPointY = event.offsetY == undefined ? event.layerY : event.offsetY - 1;
				
				if (_this.curPointX <= _this.offsetL) {
					_this.curPointX = _this.offsetL;
				}
				if (_this.curPointX >= (_this.container.width - _this.offsetR)) {
					_this.curPointX = _this.container.width - _this.offsetR;
				}
				_this.draw();
				if (_mouseMoveFlag) {
					_this.mouseMove();
				}
			}
			
			this.container.addEventListener('mousemove', onMouseMove, false);   // mouseMoveListener
			
		}
		
		static get cnName() {
			
			return '波形显示';
		}
		
		static get defaultWidth() {
			
			return '500px';
		}
		
		static get defaultHeight() {
			
			return '300px';
		}
	},
	
	OrbitWaveVI: class OrbitWaveVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			this.name = 'OrbitWaveVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			
			//坐标单位//
			this.strLabelX = 'X';
			this.strLabelY = 'Y';
			
			//坐标数值//
			this.MaxVal = 20;
			this.MinVal = -20;
			this.autoZoom = true;
			
			//网格行列数//
			this.nRow = 10;
			this.nCol = 10;
			this.pointNum = 0;
			this.borderWidth = 5;
			this.drawRulerFlag = true;
			
			//网格矩形四周边距 TOP RIGHT BOTTOM LEFT//
			this.offsetT = 5 + this.borderWidth;
			this.offsetR = 5 + this.borderWidth;
			
			this.offsetB = 5 + this.borderWidth;
			this.offsetL = 5 + this.borderWidth;
			if ((this.container.height >= 200) && (this.container.width >= 200)) {
				
				this.offsetB = 25 + this.borderWidth;
				this.offsetL = 38 + this.borderWidth;
			}
			this.waveWidth = this.container.width - this.offsetL - this.offsetR;
			this.waveHeight = this.container.height - this.offsetT - this.offsetB;
			
			//颜色选型//
			this.bgColor = "RGB(249, 250, 249)";
			this.screenColor = "RGB(61, 132, 185)";
			this.gridColor = "RGB(200, 200, 200)";
			this.fontColor = "RGB(0, 0, 0)";
			this.signalColor = "RGB(255, 255, 0)";
			this.rulerColor = "RGB(255, 255, 255)";
			
			//缓冲数组
			this.bufferValX = [];
			this.bufferValY = [];
			this.curPointX = this.offsetL;
			this.curPointY = this.offsetT;
			
			this.draw = function () {
				
				_this.drawBackground();
				_this.drawWave();
				if (_this.drawRulerFlag) {
					
					_this.drawRuler();
				}
			};
			
			this.drawWave = function () {
				
				let ratioX = _this.waveWidth / (_this.MaxVal - _this.MinVal);
				let ratioY = _this.waveHeight / (_this.MaxVal - _this.MinVal);
				let pointX = [];
				let pointY = [];
				
				let i;
				for (i = 0; i < _this.pointNum; i += 1) {
					
					pointX[i] = _this.offsetL + (_this.bufferValX[i] - _this.MinVal) * ratioX;
					pointY[i] = _this.offsetT + (_this.MaxVal - _this.bufferValY[i]) * ratioY;
					if (pointY[i] < _this.offsetT) {
						
						pointY[i] = _this.offsetT;
					}
					if (pointY[i] > (_this.offsetT + _this.waveHeight)) {
						
						pointY[i] = _this.offsetT + _this.waveHeight;
					}
				}
				//绘制波形曲线
				_this.ctx.beginPath();
				_this.ctx.lineWidth = 2;
				_this.ctx.lineCap = "round";
				_this.ctx.strokeStyle = _this.signalColor;
				for (i = 1; i < _this.pointNum; i += 1) {
					
					_this.ctx.moveTo(pointX[i - 1], pointY[i - 1]);
					_this.ctx.lineTo(pointX[i], pointY[i]);
				}
				_this.ctx.stroke();
				_this.ctx.closePath();
				_this.ctx.save();
			};
			
			this.drawBackground = function () {
				
				let ctx = _this.ctx;
				//刷背景//
				ctx.beginPath();
				/* 将这个渐变设置为fillStyle */
				// ctx.fillStyle = grad;
				ctx.fillStyle = _this.bgColor;
				ctx.lineWidth = 3;
				ctx.strokeStyle = "RGB(25, 25, 25)";
				ctx.fillRect(0, 0, _this.container.width, _this.container.height);
				ctx.strokeRect(3, 3, _this.container.width - 6, _this.container.height - 6);
				ctx.closePath();
				
				//刷网格背景//
				//画网格矩形边框和填充
				ctx.beginPath();
				ctx.fillStyle = _this.screenColor;
				ctx.lineWidth = 1;
				ctx.strokeStyle = _this.gridColor;
				ctx.fillRect(_this.offsetL, _this.offsetT, _this.waveWidth, _this.waveHeight);
				ctx.strokeRect(_this.offsetL + 0.5, _this.offsetT + 0.5, _this.waveWidth, _this.waveHeight);
				ctx.closePath();
				
				let nRow = _this.nRow;
				let nCol = _this.nCol;
				let divX = _this.waveWidth / nCol;
				let divY = _this.waveHeight / nRow;
				ctx.beginPath();
				ctx.lineWidth = 1;
				ctx.lineCap = "round";
				ctx.strokeStyle = _this.gridColor;
				
				let i, j;
				//绘制横向网格线
				for (i = 1; i < nRow; i += 1) {
					if (i == 4) {
						
						ctx.lineWidth = 10;
					}
					else {
						
						ctx.lineWidth = 1;
					}
					ctx.moveTo(_this.offsetL, divY * i + _this.offsetT);
					ctx.lineTo(_this.container.width - _this.offsetR, divY * i + _this.offsetT);
				}
				//绘制纵向网格线
				for (j = 1; j < nCol; j += 1) {
					
					if (i == 4) {
						
						ctx.lineWidth = 10;
					}
					else {
						
						ctx.lineWidth = 1;
					}
					ctx.moveTo(divX * j + _this.offsetL, _this.offsetT);
					ctx.lineTo(divX * j + _this.offsetL, _this.container.height - _this.offsetB);
				}
				ctx.stroke();
				ctx.closePath();
				//////////////////////////////////////////////////////
				
				if ((_this.container.height >= 200) && (_this.container.width >= 200)) {
					//绘制横纵刻度
					let scaleYNum = 20;
					let scaleXNum = 20;
					let scaleYStep = _this.waveHeight / scaleYNum;
					let scaleXStep = _this.waveWidth / scaleXNum;
					////////////////画数字字体////////////////
					ctx.beginPath();
					ctx.lineWidth = 1;
					ctx.strokeStyle = _this.fontColor;
					ctx.font = "normal 14px Calibri";
					
					let xValStep = (_this.MaxVal - _this.MinVal) / scaleXNum;
					let yValStep = (_this.MaxVal - _this.MinVal) / scaleYNum;
					
					ctx.fillStyle = _this.fontColor;
					let temp = 0;
					//横坐标刻度//
					for (i = 2; i < scaleXNum; i += 4) {
						
						temp = _this.MinVal + xValStep * i;
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), _this.offsetL + scaleXStep * i - 9, _this.container.height - 10);
					}
					//纵坐标刻度//
					for (i = 2; i < scaleYNum; i += 4) {
						
						temp = _this.MaxVal - yValStep * i;
						ctx.fillText(VILibrary.InnerObjects.fixNumber(temp), _this.offsetL - 30, _this.offsetT + scaleYStep * i + 5);
					}
					ctx.closePath();
					ctx.save();
				}
			};
			
			this.drawBackground();
			
			this.drawRuler = function () {
				
				//画标尺//
				_this.ctx.beginPath();
				_this.ctx.lineWidth = 1;
				_this.ctx.lineCap = "round";
				_this.ctx.strokeStyle = _this.rulerColor;
				_this.ctx.font = "normal 14px Calibri";
				_this.ctx.fillStyle = _this.rulerColor;
				
				//竖标尺//
				_this.ctx.moveTo(_this.curPointX + 0.5, _this.offsetT);
				_this.ctx.lineTo(_this.curPointX + 0.5, _this.container.height - _this.offsetB);
				_this.ctx.stroke();
				let i;
				let curPointX = parseFloat((_this.curPointX - _this.offsetL) * (_this.MaxVal - _this.MinVal) / _this.waveWidth + _this.MinVal)
					.toFixed(1);
				let curPointY = [];
				for (i = 0; i < _this.pointNum; i += 1) {
					
					if (parseFloat(_this.bufferValX[i]).toFixed(1) === curPointX) {
						
						curPointY.push(parseFloat(_this.bufferValY[i]).toFixed(1));
						if (curPointY.length >= 5) {
							
							break;
						}
					}
				}
				for (i = 0; i < curPointY.length; i += 1) {
					
					_this.ctx.fillText('(' + curPointX + ', ' + curPointY[i] + ')',
						_this.container.width - _this.curPointX < 80 ? _this.curPointX - 80 : _this.curPointX + 4, _this.offsetT + 15 + i * 15);
				}
				_this.ctx.closePath();
			};
			
			this.setAxisRange = function (min, max) {
				
				_this.MinVal = min;
				_this.MaxVal = max;
				_this.drawBackground();
			};
			
			this.setRowColNum = function (row, col) {
				
				_this.nRow = row;
				_this.nCol = col;
				_this.drawBackground();
			};
			
			this.setData = function (input) {
				
				let dataX = input[0];
				let dataY = input[1];
				if ((dataX == null || undefined) || (dataY == null || undefined)) {
					
					return false;
				}
				
				_this.pointNum = dataX.length > dataY.length ? dataY.length : dataX.length; //取较短的数据长度
				if (Number.isNaN(_this.pointNum)) {
					
					return false;
				}
				let XMax = 0, XMin = 0, YMax = 0, YMin = 0;
				let i;
				for (i = 0; i < _this.pointNum; i += 1) {
					
					_this.bufferValY[i] = dataY[i] == undefined ? 0 : dataY[i];
					YMax = YMax < _this.bufferValY[i] ? _this.bufferValY[i] : YMax;
					YMin = YMin > _this.bufferValY[i] ? _this.bufferValY[i] : YMin;
				}
				for (i = 0; i < _this.pointNum; i += 1) {
					
					_this.bufferValX[i] = dataX[i] == undefined ? 0 : dataX[i];
					XMax = XMax < _this.bufferValX[i] ? _this.bufferValX[i] : XMax;
					XMin = XMin > _this.bufferValX[i] ? _this.bufferValX[i] : XMin;
				}
				if (_this.autoZoom) {
					
					let XYMax = YMax > XMax ? YMax : XMax;
					let XYMin = YMin > XMin ? XMin : YMin;
					if ((_this.MaxVal <= XYMax) || (_this.MaxVal - XYMax > 5 * (XYMax - XYMin))) {
						
						_this.MaxVal = 2 * XYMax - XYMin;
						_this.MinVal = 2 * XYMin - XYMax;
					}
					if ((_this.MinVal >= XYMin) || (XYMin - _this.MaxVal > 5 * (XYMax - XYMin))) {
						
						_this.MaxVal = 2 * XYMax - XYMin;
						_this.MinVal = 2 * XYMin - XYMax;
					}
					if (XYMax < 0.01 && XYMin > -0.01) {
						
						_this.MaxVal = 1;
						_this.MinVal = -1;
					}
				}
				_this.draw();
			};
			
			this.reset = function () {
				let i;
				for (i = 0; i < _this.pointNum; i += 1) {
					
					_this.bufferValY[i] = 0.0;
					_this.bufferValX[i] = 0.0;
				}
				_this.drawBackground();
			};
			
			let _mouseOverFlag = false;
			let _mouseOutFlag = false;
			let _dragAndDropFlag = false;
			let _mouseUpFlag = false;
			let _onclickFlag = false;
			let _mouseMoveFlag = false;
			
			this.attachEvent = function (event, handler) {
				
				switch (event) {
					case 'mouseOver':
						this.mouseOver = handler;
						_mouseOverFlag = true;
						break;
					case 'mouseOut':
						this.mouseOut = handler;
						_mouseOutFlag = true;
						break;
					case 'dragAndDrop':
						this.dragAndDrop = handler;
						_dragAndDropFlag = true;
						break;
					case 'mouseUp':
						this.mouseUp = handler;
						_mouseUpFlag = true;
						break;
					case 'onclick':
						this.onclick = handler;
						_onclickFlag = true;
						break;
					case 'mouseMove':
						this.mouseMove = handler;
						_mouseMoveFlag = true;
						break;
				}
			};
			
			this.detachEvent = function (event) {
				
				switch (event) {
					case 'mouseOver':
						_mouseOverFlag = false;
						break;
					case 'mouseOut':
						_mouseOutFlag = false;
						break;
					case 'dragAndDrop':
						_dragAndDropFlag = false;
						break;
					case 'mouseUp':
						_mouseUpFlag = false;
						break;
					case 'onclick':
						_onclickFlag = false;
						break;
					case 'mouseMove':
						_mouseMoveFlag = false;
						break;
				}
				
			};
			
			function onMouseMove(event) {
				
				if (!_this.drawRulerFlag || _this.bufferValY.length == 0) {
					
					return;
				}
				_this.curPointX = event.offsetX == undefined ? event.layerX : event.offsetX - 5;
				_this.curPointY = event.offsetY == undefined ? event.layerY : event.offsetY - 5;
				
				if (_this.curPointX <= _this.offsetL) {
					_this.curPointX = _this.offsetL;
				}
				if (_this.curPointX >= (_this.container.width - _this.offsetR)) {
					_this.curPointX = _this.container.width - _this.offsetR;
				}
				_this.draw();
			}
			
			this.container.addEventListener('mousemove', onMouseMove, false);   // mouseMoveListener
			
		}
		
		static get cnName() {
			
			return '二维波形';
		}
		
		static get defaultWidth() {
			
			return '400px';
		}
		
		static get defaultHeight() {
			
			return '370px';
		}
	},
	
	ButtonVI: class ButtonVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			
			let timeStamp = 0, point = {};
			
			this.name = 'ButtonVI';
			this.ctx = this.container.getContext("2d");
			this.outputPointCount = 0;
			
			this.draw();
			
			this.container.addEventListener('mousedown', function (e) {
				
				timeStamp = e.timeStamp;
				point.x = e.clientX;
				point.y = e.clientY;
			}, false);
			
			this.container.addEventListener('mouseup', function (e) {
				
				//X、Y移动距离小于5，点击间隔小于200，默认点击事件
				if ((e.timeStamp - timeStamp) < 200 && (point.x - e.clientX) < 5 && (point.y - e.clientY) < 5) {
					
					if (_this.dataLine) {
						
						_this.toggleObserver(!_this.timer);
					}
				}
			}, false);
		}
		
		static get cnName() {
			
			return '开关';
		}
		
		static get defaultWidth() {
			
			return '100px';
		}
	},
	
	ProportionResponseVI: class ProportionResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'ProportionResponseVI';
			this.k1 = 1.5;
			//VI双击弹出框
			this.boxTitle = '比例响应';
			this.boxContent = '<div class="input-div"><span class="normal-span">K1:</span>' +
				'<input type="number" id="ProportionResponseVI-input" value="' + this.k1 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let temp1 = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(temp1)) {
					
					return false;
				}
				
				let temp2 = this.k1 * temp1;
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = temp2;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = temp2;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#ProportionResponseVI-input').val());
				this.boxContent = '<div class="input-div"><span class="normal-span">K1:</span>' +
					'<input type="number" id="ProportionResponseVI-input" value="' + this.k1 + '" class="normal-input"></div>';
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '比例响应';
		}
	},
	
	IntegrationResponseVI: class IntegrationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'IntegrationResponseVI';
			this.k2 = 5;
			this.Fs = 1000;
			this.lastInput = 0;
			this.temp1 = 0;
			//VI双击弹出框
			this.boxTitle = '积分响应';
			this.boxContent = '<div class="input-div"><span class="normal-span">K2:</span>' +
				'<input type="number" id="IntegrationResponseVI-input" value="' + this.k2 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v2, v21;
				
				v21 = this.temp1 + 0.5 * (inputTemp + this.lastInput) / this.Fs;
				this.temp1 = v21;
				v2 = this.k2 * v21;
				
				let outputTemp = v2;
				this.lastInput = inputTemp;
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k2 = Number($('#IntegrationResponseVI-input').val());
				this.boxContent = '<div class="input-div"><span class="normal-span">K2:</span>' +
					'<input type="number" id="IntegrationResponseVI-input" value="' + this.k2 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				this.lastInput = 0;
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k2:' + _this.k2 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '积分响应';
		}
	},
	
	DifferentiationResponseVI: class DifferentiationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'DifferentiationResponseVI';
			this.k3 = 0.0025;
			this.Fs = 1000;
			this.lastInput = 0;
			//VI双击弹出框
			this.boxTitle = '微分响应';
			this.boxContent = '<div class="input-div"><span class="normal-span">K3:</span>' +
				'<input type="number" id="DifferentiationResponseVI-input" value="' + this.k3 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let outputTemp = this.k3 * (inputTemp - this.lastInput) * this.Fs;
				this.lastInput = inputTemp;
				
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k3 = Number($('#DifferentiationResponseVI-input').val());
				this.boxContent = '<div class="input-div"><span class="normal-span">K3:</span>' +
					'<input type="number" id="DifferentiationResponseVI-input" value="' + this.k3 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k3:' + _this.k3 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '微分响应';
		}
	},
	
	InertiaResponseVI: class InertiaResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'InertiaResponseVI';
			this.k1 = 0.025;
			this.Fs = 1000;
			this.temp1 = 0;
			//VI双击弹出框
			this.boxTitle = '惯性响应';
			this.boxContent = '<div class="input-div"><span class="normal-span">K1:</span>' +
				'<input type="number" id="InertiaResponseVI-input" value="' + this.k1 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v, E;
				
				//一阶 1/(TS+1)
				E = Math.exp(-1 / (this.k1 * this.Fs));
				v = E * this.temp1 + (1.0 - E) * inputTemp;
				this.temp1 = v;
				let outputTemp = v;//输出
				
				if (this.index <= (this.dataLength - 1)) {
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#InertiaResponseVI-input').val());
				this.boxContent = '<div class="input-div"><span class="normal-span">K1:</span>' +
					'<input type="number" id="InertiaResponseVI-input" value="' + this.k1 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '惯性响应';
		}
	},
	
	OscillationResponseVI: class OscillationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'OscillationResponseVI';
			this.k1 = 50;
			this.k2 = 0.05;
			this.Fs = 1000;
			this.temp1 = 0;
			this.temp2 = 0;
			//VI双击弹出框
			this.boxTitle = '震荡响应';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">K1:</span><input type="number" id="OscillationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
				'<span class="normal-span">K2:</span><input type="number" id="OscillationResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v, a1, b1;
				
				//二阶 W^2/(S^2+2gWS+W^2)
				if (this.k2 > 1) {
					
					this.k2 = 1;
				}
				b1 = Math.exp(-2 * 6.28 * this.k1 * this.k2 / this.Fs);
				a1 = 2 * Math.exp(-6.28 * this.k1 * this.k2 / this.Fs) * Math.cos(6.28 * this.k1 * Math.sqrt(1 - this.k2 * this.k2) / this.Fs);
				v = a1 * this.temp1 - b1 * this.temp2 + 1 * (1 - a1 + b1) * inputTemp;
				this.temp2 = this.temp1;
				this.temp1 = v;
				let outputTemp = v;//输出
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#OscillationResponseVI-input-1').val());
				this.k2 = Number($('#OscillationResponseVI-input-2').val());
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">K1:</span><input type="number" id="OscillationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
					'<span class="normal-span">K2:</span><input type="number" id="OscillationResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.temp1 = 0;
				this.temp2 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k2:' + _this.k2 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '震荡响应';
		}
	},
	
	ProportionIntegrationResponseVI: class ProportionIntegrationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'ProportionIntegrationResponseVI';
			this.k1 = 1.5;
			this.k2 = 1;
			this.Fs = 1000;
			this.lastInput = 0;
			this.temp1 = 0;
			//VI双击弹出框
			this.boxTitle = '比例积分响应';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">K1:</span><input type="number" id="ProportionIntegrationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
				'<span class="normal-span">K2:</span><input type="number" id="ProportionIntegrationResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v1, v2, v21;
				
				v1 = this.k1 * inputTemp;
				
				v21 = this.temp1 + 0.5 * (inputTemp + this.lastInput) / this.Fs;
				this.temp1 = v21;
				v2 = this.k2 * v21;
				
				let outputTemp = v1 + v2;
				this.lastInput = inputTemp;
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#ProportionIntegrationResponseVI-input-1').val());
				this.k2 = Number($('#ProportionIntegrationResponseVI-input-2').val());
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">K1:</span><input type="number" id="ProportionIntegrationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
					'<span class="normal-span">K2:</span><input type="number" id="ProportionIntegrationResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k2:' + _this.k2 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '比例积分响应';
		}
	},
	
	ProportionDifferentiationResponseVI: class ProportionDifferentiationResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'ProportionDifferentiationResponseVI';
			this.k1 = 1;
			this.k3 = 0.0025;
			this.Fs = 1000;
			this.lastInput = 0;
			//VI双击弹出框
			this.boxTitle = '比例微分响应';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">K1:</span><input type="number" id="ProportionDifferentiationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
				'<span class="normal-span">K3:</span><input type="number" id="ProportionDifferentiationResponseVI-input-2" value="' + this.k3 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v1, v3;
				
				v1 = this.k1 * inputTemp;
				
				v3 = this.k3 * (inputTemp - this.lastInput) * this.Fs;
				
				let outputTemp = v1 + v3;
				this.lastInput = inputTemp;
				
				//将输出数保存在数组内
				let i = 0;
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#ProportionDifferentiationResponseVI-input-1').val());
				this.k3 = Number($('#ProportionDifferentiationResponseVI-input-2').val());
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">K1:</span><input type="number" id="ProportionDifferentiationResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
					'<span class="normal-span">K3:</span><input type="number" id="ProportionDifferentiationResponseVI-input-2" value="' + this.k3 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k3:' + _this.k3 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '比例微分响应';
		}
	},
	
	ProportionInertiaResponseVI: class ProportionInertiaResponseVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'ProportionInertiaResponseVI';
			this.k1 = 0.025;
			this.k2 = 1;
			this.Fs = 1000;
			this.temp1 = 0;
			//VI双击弹出框
			this.boxTitle = '比例惯性响应';
			this.boxContent = '<div class="input-div">' +
				'<span class="normal-span">K1:</span><input type="number" id="ProportionInertiaResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
				'<span class="normal-span">K2:</span><input type="number" id="ProportionInertiaResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				
				let v, E;
				
				//一阶 X+1/(TS+1)
				E = Math.exp(-1 / (this.k1 * this.Fs));
				v = E * this.temp1 + (1.0 - E) * inputTemp;
				this.temp1 = v;
				let outputTemp = v + this.k2 * inputTemp;//输出
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setInitialData = function () {
				
				this.k1 = Number($('#ProportionInertiaResponseVI-input-1').val());
				this.k2 = Number($('#ProportionInertiaResponseVI-input-2').val());
				this.boxContent = '<div class="input-div">' +
					'<span class="normal-span">K1:</span><input type="number" id="ProportionInertiaResponseVI-input-1" value="' + this.k1 + '" class="normal-input">' +
					'<span class="normal-span">K2:</span><input type="number" id="ProportionInertiaResponseVI-input-2" value="' + this.k2 + '" class="normal-input"></div>';
			};
			
			this.reset = function () {
				
				this.temp1 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k2:' + _this.k2 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '比例惯性响应';
		}
	},
	
	StepResponseGeneratorVI: class StepResponseGeneratorVI extends TemplateVI {
		
		constructor(VICanvas) {
			
			super(VICanvas);
			
			const _this = this;
			let dataTip = $('');
			
			this.name = 'StepResponseGeneratorVI';
			this.signalType = 0;
			this.k1 = 1;
			this.k2 = 1;
			this.k3 = 1;
			this.Fs = 1000;
			this.input = 0;
			this.lastInput = 0;
			this.temp1 = 0;
			this.temp2 = 0;
			
			this.setData = function (input) {
				
				let inputTemp = Number(Array.isArray(input) ? input[input.length - 1] : input);
				if (Number.isNaN(inputTemp)) {
					
					return false;
				}
				let v, v1, v2, v21, v3, E, a1, b1, outputTemp = 0;
				
				if (this.signalType < 6) {
					v1 = this.k1 * inputTemp;
					
					v21 = this.temp1 + 0.5 * (inputTemp + this.lastInput) / this.Fs;
					this.temp1 = v21;
					v2 = this.k2 * v21;
					
					v3 = this.k3 * (inputTemp - this.lastInput) * this.Fs;
					
					outputTemp = v1 + v2 + v3;
					this.lastInput = inputTemp;
				}
				else if (this.signalType < 9) {
					
					if (this.signalType == 6) { //一阶 1/(TS+1)
						
						E = Math.exp(-1 / (this.k1 * this.Fs));
						v = E * this.temp1 + (1.0 - E) * inputTemp;
						this.temp1 = v;
						outputTemp = v;//输出
					}
					if (this.signalType == 7) { //二阶 W^2/(S^2+2gWS+W^2)
						
						if (this.k2 > 1) {
							
							this.k2 = 1;
						}
						b1 = Math.exp(-2 * 6.28 * this.k1 * this.k2 / this.Fs);
						a1 = 2 * Math.exp(-6.28 * this.k1 * this.k2 / this.Fs) * Math.cos(6.28 * this.k1 * Math.sqrt(1 - this.k2 * this.k2) / this.Fs);
						v = a1 * this.temp1 - b1 * this.temp2 + 1 * (1 - a1 + b1) * inputTemp;
						this.temp2 = this.temp1;
						this.temp1 = v;
						outputTemp = v;//输出
					}
					if (this.signalType == 8) { //一阶 X+1/(TS+1)
						
						E = Math.exp(-1 / (this.k1 * this.Fs));
						v = E * this.temp1 + (1.0 - E) * inputTemp;
						this.temp1 = v;
						outputTemp = v + this.k2 * inputTemp;//输出
					}
				}
				
				//将输出数保存在数组内
				if (this.index <= (this.dataLength - 1)) {
					
					this.output[this.index] = outputTemp;
					this.index += 1;
				}
				else {
					
					let i;
					for (i = 0; i < this.dataLength - 1; i += 1) {
						this.output[i] = this.output[i + 1];
					}
					this.output[this.dataLength - 1] = outputTemp;
				}
			};
			
			this.setStepType = function (type) {
				
				this.signalType = type;
				
				//PID控制器
				if (this.signalType == 0) {
					this.k1 = 1;
					this.k2 = 1;
					this.k3 = 1;
				}
				
				//比例控制器
				if (this.signalType == 1) {
					this.k1 = 1;
					this.k2 = 0;
					this.k3 = 0;
				}
				
				//积分控制器
				if (this.signalType == 2) {
					this.k1 = 0;
					this.k2 = 1;
					this.k3 = 0;
				}
				
				//微分控制器
				if (this.signalType == 3) {
					this.k1 = 0;
					this.k2 = 0;
					this.k3 = 1;
				}
				
				//比例积分控制器
				if (this.signalType == 4) {
					this.k1 = 1;
					this.k2 = 1;
					this.k3 = 0;
				}
				
				//比例微分控制器
				if (this.signalType == 5) {
					this.k1 = 1;
					this.k2 = 0;
					this.k3 = 1;
				}
				
				//惯性环节
				if (this.signalType == 6) {
					this.k1 = 1;
					this.k2 = 0;
				}
				
				//振荡环节
				if (this.signalType == 7) {
					this.k1 = 1;
					this.k2 = 1;
				}
				
				//比例惯性环节
				if (this.signalType == 8) {
					this.k1 = 1;
					this.k2 = 1;
				}
				
			};
			
			this.reset = function () {
				
				this.lastInput = 0;
				this.temp1 = 0;
				this.temp2 = 0;
				this.index = 0;
				this.output = [0];
			};
			
			this.draw();
			
			this.container.addEventListener('mousemove', function (e) {
				//************************************数据提示****************************************//
				dataTip.remove();
				dataTip = $('<div class="rowFlex-div dataTip">' +
					'<span class="normal-span">k1:' + _this.k1 + '</span>' +
					'<span class="normal-span">k2:' + _this.k2 + '</span>' +
					'<span class="normal-span">k3:' + _this.k3 + '</span></div>');
				
				if (e.target.parentElement.id === 'VIContainer') {
					
					$(e.target.parentElement).append(dataTip);
				}
				else {
					dataTip.css('position', 'fixed');
					dataTip.css('top', '0');
					dataTip.css('left', '0');
					dataTip.css('z-index', '100');
					dataTip.css('width', '100%');
					$('body').prepend(dataTip);
				}
			}, false);
			this.container.addEventListener('mouseout', function () {
				dataTip.remove();
			}, false);
		}
		
		static get cnName() {
			
			return '阶跃响应';
		}
	},

    RRToothRingVI: class  RRToothRingVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;
            let camera, scene, renderer, controls, sliderControl, testerControl, gearControl,holderControl,leftControl,rightControl,
                base, gear, slider, tester,testerMark,sliderMark,left,right;
            let testerDown=true;
            this.errorArray=[22,29,40,40,47,53,56,63,64,71,77,89,84,90,101,105,113,101,104,89,66,49,43,32,28,25,21,9,9,4,-11,-21,-25,-13,-9,7,8,17,21,26];
            let gearNo=0,error=0,sliderDown=false,gearPos=false;

            /**
             *
             * @param input 输入端口读取角度
             */
            this.reset=function(){
                gear.rotateX(-gearNo*Math.PI/20);
                slider.position.y=sliderMark.position.y=0;
                if(!testerDown)tester.rotateX(Math.PI/4);
                gearNo=0,error=0,testerDown=true,sliderDown=false;
            }

            this.getData = function (dataType) {
                if (dataType === 1) {
                    error=(testerDown&&sliderDown)?_this.errorArray[gearNo]:0;
                    return error;  //输出误差
                }
            };

            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/base.mtl', 'assets/RadialRunout_of_ToothRing/base.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/gear.mtl', 'assets/RadialRunout_of_ToothRing/gear.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/slider.mtl', 'assets/RadialRunout_of_ToothRing/slider.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/tester.mtl', 'assets/RadialRunout_of_ToothRing/tester.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/testerMark.mtl', 'assets/RadialRunout_of_ToothRing/testerMark.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/sliderMark.mtl', 'assets/RadialRunout_of_ToothRing/sliderMark.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/left.mtl', 'assets/RadialRunout_of_ToothRing/left.obj'),
                        VILibrary.InnerObjects.loadModule('assets/RadialRunout_of_ToothRing/right.mtl', 'assets/RadialRunout_of_ToothRing/right.obj'),
                    ];
                    Promise.all(promiseArr).then(function (objArr) {


                        base = objArr[0];
                        gear = objArr[1];
                        slider = objArr[2];
                        tester = objArr[3];
                        testerMark = objArr[4];
                        sliderMark = objArr[5];
                        left=objArr[6];
                        right=objArr[7];
                        loadingImg.style.display = 'none';
                        RRDraw();
                    }).catch(e => console.log('RRToothRingVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/RR_ToothRing.png';
                    img.onload = function () {

                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }

               /* mtlLoader.load('assets/RadialRunout_of_ToothRing/base.mtl', function (materials){
                    materials.preload();

                    objLoader.setMaterials(materials);
                    objLoader.load('assets/RadialRunout_of_ToothRing/base.obj', function (a){
                        a.traverse(function (child) {
                            if (child instanceof THREE.Mesh) {

                                child.material.side = THREE.DoubleSide;
                            }
                        });
                        base=a;
                        mtlLoader.load('assets/RadialRunout_of_ToothRing/gear.mtl', function (materials){
                            materials.preload();

                            objLoader.setMaterials(materials);
                            objLoader.load('assets/RadialRunout_of_ToothRing/gear.obj', function (b){
                                b.traverse(function (child) {
                                    if (child instanceof THREE.Mesh) {

                                        child.material.side = THREE.DoubleSide;
                                    }
                                });
                                gear=b;

                                mtlLoader.load('assets/RadialRunout_of_ToothRing/slider.mtl', function (materials){
                                    materials.preload();

                                    objLoader.setMaterials(materials);
                                    objLoader.load('assets/RadialRunout_of_ToothRing/slider.obj', function (c){
                                        c.traverse(function (child) {
                                            if (child instanceof THREE.Mesh) {

                                                child.material.side = THREE.DoubleSide;
                                            }
                                        });
                                        slider=c;

                                        mtlLoader.load('assets/RadialRunout_of_ToothRing/tester.mtl', function (materials){
                                            materials.preload();

                                            objLoader.setMaterials(materials);
                                            objLoader.load('assets/RadialRunout_of_ToothRing/tester.obj', function (d){
                                                d.traverse(function (child) {
                                                    if (child instanceof THREE.Mesh) {

                                                        child.material.side = THREE.DoubleSide;
                                                    }
                                                });
                                                tester=d;

                                                mtlLoader.load('assets/RadialRunout_of_ToothRing/testerMark.mtl', function (materials) {
                                                    materials.preload();

                                                    objLoader.setMaterials(materials);
                                                    objLoader.load('assets/RadialRunout_of_ToothRing/testerMark.obj', function (e) {
                                                        e.traverse(function (child) {
                                                            if (child instanceof THREE.Mesh) {

                                                                child.material.side = THREE.DoubleSide;
                                                            }
                                                        });
                                                        testerMark = e;
                                                        mtlLoader.load('assets/RadialRunout_of_ToothRing/sliderMark.mtl', function (materials) {
                                                            materials.preload();

                                                            objLoader.setMaterials(materials);
                                                            objLoader.load('assets/RadialRunout_of_ToothRing/sliderMark.obj', function (f) {
                                                                f.traverse(function (child) {
                                                                    if (child instanceof THREE.Mesh) {

                                                                        child.material.side = THREE.DoubleSide;
                                                                    }
                                                                });
                                                                sliderMark = f;
                                                                RRDraw();
                                                            })
                                                        })
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    });
                });*/
				/*let p1=new Promise(function (resolve,reject) {
				 /!*THREE.DefaultLoadingManager.onLoad=resolve;
				 THREE.DefaultLoadingManager.onLoad=reject;*!/
				 //base.onload=resolve;
				 base.onerror=reject;
				 });
				 p1.then(function () {
				 renderScene();
				 })
				 p1.catch(function () {
				 //console.log('RRToothRingVI:' + e);
				 })*/

            };
            this.draw();

            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            //相机、渲染、灯光、控制等初始设置
            function RRDraw () {
                scene = new THREE.Scene();

                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 1000);
                camera.position.set(50,80,150);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                tester.translateZ(-14);//测量头初始位置（测量头以转轴中点为原点）
                tester.translateY(34);
                base.add(gear);
                base.add(slider,sliderMark,left,right);
                slider.add(tester);
                tester.add(testerMark);
                scene.add(base);
                // base.position.y=-10;
                gear.rotation.z=Math.PI/2;
                // gear.rotation.x=Math.PI*0.1;
                gear.position.set(-80,-40,20);

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                //plane.rotateY(30/180*Math.PI);

                //拖动控制
                sliderControl = new ObjectControls(camera, renderer.domElement);
                sliderControl.map = plane;
                sliderControl.offsetUse = true;

                sliderControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                sliderControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                sliderControl.attachEvent('dragAndDrop', onSliderDrag);

                sliderControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                //左支架拖动控制
                leftControl = new ObjectControls(camera, renderer.domElement);
                leftControl.map = plane;
                leftControl.offsetUse = true;

                leftControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                leftControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                leftControl.attachEvent('dragAndDrop', onHolderDrag);

                leftControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });
                //右支架拖动控制
                rightControl = new ObjectControls(camera, renderer.domElement);
                rightControl.map = plane;
                rightControl.offsetUse = true;

                rightControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                rightControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                rightControl.attachEvent('dragAndDrop', onHolderDrag);

                rightControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                //测量头点击抬起、放下
                testerControl = new ObjectControls(camera, renderer.domElement);
                testerControl.offsetUse = true;

                testerControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                testerControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                testerControl.attachEvent('onclick', function () {
                    sliderControl.enabled =false;
                    if(testerDown)tester.rotateX(-Math.PI/4);
                    else tester.rotateX(Math.PI/4);
                    testerDown=!testerDown;
                    sliderControl.enabled =true;
                    // error=(testerDown&&sliderDown)?_this.errorArray[gearNo]:0;
                });

                //齿轮点击旋转一个齿
                gearControl = new ObjectControls(camera, renderer.domElement);
                gearControl.offsetUse = true;

                gearControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                gearControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                gearControl.attachEvent('onclick',onGearClick);


                //绑定控制对象
                sliderControl.attach(sliderMark);
                testerControl.attach(testerMark);
                gearControl.attach(gear);
                leftControl.attach(left);
                rightControl.attach(right);

                RRAnimate();
            }

            function onSliderDrag () {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.x = this.previous.x;  //lock x direction
                if (this.focused.position.y < -7.71) {

                    this.focused.position.y = -7.71;
                }
                else if (this.focused.position.y > 20) {

                    this.focused.position.y = 20;
                }
                slider.position.y = this.focused.position.y;
                sliderDown=slider.position.y< -7?true:false;
                // error=(testerDown&&sliderDown)?_this.errorArray[gearNo]:0;
            }

            function onHolderDrag() {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.y = this.previous.y;  //lock x direction
                if (this.focused.position.x < -10) {

                    this.focused.position.x = -10;
                }
                else if (this.focused.position.x > 10) {

                    this.focused.position.x = 10;
                }
                let focusedX=this.focused.position.x;
                console.log(this.focused.materialLibraries[0])
				if(this.focused.materialLibraries[0]=="left.mtl"){
                    right.position.x=-focusedX;
				}
				else {
                    left.position.x=-focusedX;
				}
            }

            function onGearClick(){
            	if(!gearPos){
            		gearPos=true;
            		gear.position.set(0,0,0);
            		gear.rotation.set(0,0,0);
				}
				else {
                    if(!(testerDown&&sliderDown)){
                        gear.rotateX(Math.PI/20);
                        gearNo+=1;
                        if(gearNo>=40)gearNo=0;
                    }
				}


            }

            function RRAnimate() {
                window.requestAnimationFrame(RRAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

        }
    },

    DialVI:class DialVI extends TemplateVI{
        constructor (VICanvas) {
            super(VICanvas);

            const _this = this;
            this.name = 'DialVI';
            this.ctx = this.container.getContext("2d");
            // this.outputPointCount = 0;
            // this.latestInput = 0;
            this.angle=0;

            this.shorter=Math.min(this.container.height,this.container.width);

            this.CENTER_X=this.shorter/2;
            this.CENTER_Y=this.shorter/2;
            this.RADIUS=this.shorter*0.45;//表盘半径


            this.LONG_TICK=this.RADIUS*0.1;//40;//长刻度
            this.SHORT_TICK=this.RADIUS*0.07;//短刻度
            this.START_ANGLE = 0; // Starting point on circle
            this.END_ANGLE = Math.PI*2; // End point on circle
            this.STROKE_STYLE= "rgba(0,0,0,1)";
            this.FILL_STYLE= "rgba(80,80,80,0.6)";
            this.ctx.lineWidth=1;
            this.MAX_NUMBER=120;//最大刻度值
			let lineNUM;

            this.draw=function (angle) {

                if(150>this.MAX_NUMBER&&this.MAX_NUMBER>=50)lineNUM=5;
                else if(this.MAX_NUMBER<50)lineNUM=0.5;
                else lineNUM=10;
                console.log("lineNUM",lineNUM);
                this.ctx.clearRect(0,0,this.container.width,this.container.height);//清空画布
                //画指针
                this.rotateAngle=angle;
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.translate(this.CENTER_X,this.CENTER_Y);
                this.ctx.rotate(this.rotateAngle);
                this.ctx.moveTo(-this.RADIUS*0.03,this.RADIUS*0.1);
                this.ctx.lineTo(+this.RADIUS*0.03,this.RADIUS*0.1);
                this.ctx.lineTo(0,-this.RADIUS*0.9);
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.fillStyle="rgba(200,100,100,1)";
                this.ctx.fill();
                this.ctx.restore();
                //画表盘外圆环
                this.ctx.fillStyle=this.FILL_STYLE;
                this.ctx.strokeStyle=this.STROKE_STYLE;
                this.ctx.beginPath();
                this.ctx.arc(this.CENTER_X, this.CENTER_Y, this.RADIUS, this.START_ANGLE, this.END_ANGLE, false);
                this.ctx.arc(this.CENTER_X, this.CENTER_Y, this.RADIUS*1.1, this.START_ANGLE, this.END_ANGLE, true);
                this.ctx.fill();
                this.ctx.closePath();

                //表盘刻度线和数字
                this.ctx.fillStyle="rgba(0,0,0,1)";
                this.ctx.textAlign = "center";//文本对齐
                this.ctx.font=this.RADIUS/10+"px Times new roman";
                this.ctx.textBaseline="middle";//文字居中定位
                let delta=Math.PI/_this.MAX_NUMBER;
                let i=0;
                for(i;i<=(_this.MAX_NUMBER/lineNUM);i++){
                    let angle0=-Math.PI/2+delta*i*lineNUM;
                    let angle1=-Math.PI/2-delta*i*lineNUM;
                    // if(!(i%(lineNUM/2))){
                        this.line(i*lineNUM,angle0);//顺时针方向
                        if(i*lineNUM<_this.MAX_NUMBER){
                            this.line(i*lineNUM,angle1);//逆时针方向
                        }
					// }
                }

                this.ctx.font=this.RADIUS/6+"px Verdana";
                this.ctx.fillText("+",this.CENTER_X+this.RADIUS*0.4,this.RADIUS);
                this.ctx.fillText("-",this.CENTER_X-this.RADIUS*0.4,this.RADIUS);
                this.ctx.font=this.RADIUS/8+"px Verdana";
                this.ctx.fillText("μm",this.CENTER_X,this.CENTER_Y+this.RADIUS*0.4);




                //画小圆
                this.r0=this.RADIUS*0.04;//20;
                this.ctx.fillStyle="rgba(255,255,255,1)";
                this.ctx.strokeStyle=this.STROKE_STYLE;
                this.ctx.beginPath();
                this.ctx.arc(this.CENTER_X, this.CENTER_Y, this.r0, this.START_ANGLE, this.END_ANGLE, false);
                this.ctx.stroke();
                this.ctx.closePath();
                this.ctx.fill();
            };
            this.line=function (i, angle){
                this.ctx.save();
                this.ctx.translate(this.CENTER_X,this.CENTER_Y);//坐标系移至圆心
                this.ctx.rotate(angle);
                this.ctx.beginPath();
                this.ctx.moveTo(this.RADIUS,0);
                if(i%(lineNUM*2)) this.ctx.lineTo(this.RADIUS-this.SHORT_TICK,0);
                else {
                    this.ctx.lineTo(this.RADIUS-this.LONG_TICK,0);
                    if(!(i%(lineNUM*4))){
                        this.ctx.translate(this.RADIUS*0.8,0);//坐标系移至文字中心
                        this.ctx.rotate(-angle);//逆向旋转，恢复文字方向
                        this.ctx.fillText(i, 0, 0);
					}
                }
                this.ctx.stroke();
                this.ctx.closePath();
                this.ctx.restore();
            };
			//拖动控制指针
			/*this.drag=function () {
			 this.container.addEventListener("mousedown",function() {event.preventDefault();IS_DOWN=true;},false);
			 this.container.addEventListener("mousemove",function () {
			 event.preventDefault();
			 if (IS_DOWN == false) return;
			 let x=event.offsetX;
			 let y=event.offsetY;
			 let dx = x- _this.CENTER_X+Number.MIN_VALUE;
			 let dy = y - _this.CENTER_Y;
			 if(dx>=0){ this.angle = Math.atan( dy/ dx)+Math.PI/2;}
			 else { this.angle=Math.atan(dy/dx)+Math.PI*3/2;}
			 _this.draw(this.angle);
			 },false);
			 this.container.addEventListener("mouseup",function (){IS_DOWN=false;},false);
			 this.container.addEventListener("mouseout",function (){IS_DOWN=false;},false);

			 };*/




            this.setData = function (input){
                let inputError = Number(Array.isArray(input) ? input[input.length - 1] : input);

                if (Number.isNaN(inputError)) {

                    console.log('DialVI: Input value error');
                    return;
                }
                //this.PIDAngle = inputAngle;//向输出端口上写数据
                this.angle=inputError*Math.PI/_this.MAX_NUMBER;
                this.draw(this.angle);
            }

//调用函数

            this.draw(this.angle);



        }
    },
    GearCompositeErrorVI: class  GearCompositeErrorVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {

            super(VICanvas);

            const _this = this;

            let camera, scene, renderer, controls,base,gear1,gear2,handleUp,handleDown,lead_screw,onSwitch,offSwitch,slider2,lead_screwControl,
				handleControl,switchControl,gear2Control;
            let handleDownMark=false,gearMesh=false,gearPos=false;
            let errorArray=[0,-2,-7,-3,-8,-7,-12,-10,-15,-12,-14,-10,-11,-9,-11,-8,-9,-5,-6,-2,-5,0,-1,3,-1,7,5,11,10,14,12,13,9,11,8,9,5,6,2,3,0];
            this.eA=errorArray;
            this.errOutput=[];
            _this.timer=0;
            let index=0;

            /**
             *
             * @param input 输入端口读取角度
             */

            this.toggleObserver = function (flag) {

                if (flag) {
                    if (!_this.timer ) {
                        if(!gearPos)  layer.open({
                            title: '系统提示'
                            ,content: '未正确安装被测齿轮，请点击被测齿轮进行安装'
                        });
                        else if(!gearMesh){
                            layer.open({
                                title: '系统提示'
                                ,content: '齿轮未正确啮合,请调整后再开始测量'
                            });
                        }
                        else if(!handleDownMark)layer.open({
                            title: '系统提示'
                            ,content: '固定拖板未锁紧，请锁紧后再开始测量'
                        });
                        else {
                            if(!index){_this.errOutput=[0];}
                            scene.remove(offSwitch);
                            switchControl.detach(offSwitch);
                            scene.add(onSwitch);
                            switchControl.attach(onSwitch);
                            let delta =360/20/180*Math.PI  ;//一齿的弧度
                            _this.timer = window.setInterval(function () {
                                openWave();
                                gear1.rotation.y -= delta * 0.5*2/3;
                                index+=1;
                                gear2.rotation.y += delta *0.5;//0.5个齿的弧度

                                _this.errOutput[index]=errorArray[index];
                                console.log("errOutput",_this.errOutput[index]);
                                //定时更新相同数据线VI的数据
                                if (_this.dataLine) {
                                    VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                                }
                                if(index>=40){
                                    window.clearInterval(_this.timer);
                                    index=0;
                                    scene.remove(onSwitch);
                                    switchControl.detach(onSwitch);
                                    scene.add(offSwitch);
                                    switchControl.attach(offSwitch);
                                    _this.timer = 0;
                                    this.errOutput=[];
                                }
                            }, 100);
                        }
                    }
                }
				else{
					scene.remove(onSwitch);
					switchControl.detach(onSwitch);
					scene.add(offSwitch);
					switchControl.attach(offSwitch);
					window.clearInterval(_this.timer);
					_this.timer = 0;
				}
            };
            this.getData=function () {
            	return _this.errOutput;

            }
            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/base_slider1.mtl', 'assets/GearCompositeError/base_slider1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/gear1.mtl', 'assets/GearCompositeError/gear1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/gear2.mtl', 'assets/GearCompositeError/gear2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/lead_screw.mtl', 'assets/GearCompositeError/lead_screw.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/slider2.mtl', 'assets/GearCompositeError/slider2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/handle_up.mtl', 'assets/GearCompositeError/handle_up.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/handle_down.mtl', 'assets/GearCompositeError/handle_down.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/button-off.mtl', 'assets/GearCompositeError/button-off.obj'),
                        VILibrary.InnerObjects.loadModule('assets/GearCompositeError/button-on.mtl', 'assets/GearCompositeError/button-on.obj'),
                    ];
                    Promise.all(promiseArr).then(function (objArr) {
                        base = objArr[0];
                        gear1 = objArr[1];
                        gear2 = objArr[2];
                        lead_screw = objArr[3];
                        slider2 = objArr[4];
                        handleUp = objArr[5];
                        handleDown=objArr[6];
                        offSwitch=objArr[7];
                        onSwitch=objArr[8];
                        loadingImg.style.display = 'none';
                        GCEDraw();
                    }).catch(e => console.log('GearCompositeErrorVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/GearCompositeError.png';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }
            };
            this.draw();

            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            //相机、渲染、灯光、控制等初始设置
            function GCEDraw () {
                scene = new THREE.Scene();
                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 1000);
                camera.position.set(0,100,300);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

               //测量头初始位置（测量头以转轴中点为原点）
                gear1.position.x=-83;
                gear1.position.y=66;

                gear2.position.set(100,-50,80);

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);




                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane1 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));

                //拖动旋转
                let plane2 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                 plane2.rotateY(0.5*Math.PI);
                lead_screwControl =new ObjectControls(camera, renderer.domElement);
                lead_screwControl.map = plane2;
                lead_screwControl.offsetUse = true;
                lead_screwControl.attachEvent('mouseOver', function () {
                    renderer.domElement.style.cursor = 'pointer';
                });

                lead_screwControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                lead_screwControl.attachEvent('dragAndDrop', onRotateDrag);

                lead_screwControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });
                //测量头点击抬起、放下
                handleControl = new ObjectControls(camera, renderer.domElement);
                handleControl.offsetUse = true;

                handleControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                handleControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                handleControl.attachEvent('onclick',onHandleClick);

                //开关
                switchControl = new ObjectControls(camera, renderer.domElement);
                switchControl.offsetUse = true;

                switchControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                switchControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                switchControl.attachEvent('onclick',function () {

                    _this.toggleObserver(!_this.timer);
                });

                gear2Control = new ObjectControls(camera, renderer.domElement);
                gear2Control.offsetUse = true;

                gear2Control.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                gear2Control.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                gear2Control.attachEvent('onclick',function () {
                    gear2.position.x=slider2.position.x;
                    gear2.position.y=66;
                    gear2.position.z=0;
                    gearPos=true;
                });
                //绑定控制对象
                scene.add(base,lead_screw,gear1,slider2,gear2,handleUp,offSwitch);
                handleControl.attach(handleUp);
                lead_screwControl.attach(lead_screw);
                switchControl.attach(offSwitch);
                gear2Control.attach(gear2);

                GCEAnimate();
            }

            function onRotateDrag () {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';

                let offsetY=this.focused.position.y-this.previous.y;
                this.focused.position.y = this.previous.y;  //lock x direction
                this.focused.position.x = this.previous.x;
                let angle=-Math.atan(offsetY/1.5);
                slider2.position.x+=offsetY;
                if (slider2.position.x< -20.5) {

                    slider2.position.x = -20.5;
                }
                else if (slider2.position.x > 83) {

                    slider2.position.x = 83;
                }
                else {lead_screw.rotateX(angle);}
                gearMesh=slider2.position.x< -20?true:false;
                if(gearPos)gear2.position.x=slider2.position.x;

            }
            function onHandleClick() {
                handleDownMark=!handleDownMark;
                if(handleDownMark){
                    lead_screwControl.enabled =false;
                    scene.remove(handleUp);
                    handleControl.detach(handleUp);
                    scene.add(handleDown);
                    handleControl.attach(handleDown);
                }
                else {
                    lead_screwControl.enabled =true;
                    scene.remove(handleDown);
                    handleControl.detach(handleDown);
                    scene.add(handleUp);
                    handleControl.attach(handleUp);

                }

            }

            function GCEAnimate() {
                // gear2.position.x=slider2.position.x;
                handleDown.position.x=slider2.position.x;
                handleUp.position.x=slider2.position.x;
                offSwitch.position.x=slider2.position.x;
                onSwitch.position.x=slider2.position.x;
                window.requestAnimationFrame(GCEAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

        }
    },

    RoughnessVI:class RoughnessVI extends TemplateVI{
        constructor(VICanvas, draw3DFlag) {

            super(VICanvas);

            const _this = this;


            let camera, scene, renderer,
				base, slider,slider0,handwheel,cylinder,cylinder_off,button_off,button_on,machineRay,sliderST,
				controls, sliderControl,slider0Control,buttonControl,cylinderControl;
            let onPos=false;
            this.onFlag=false,

            this.toggleObserver = function (flag) {

                if(!onPos){
                	_this.onFlag=!_this.onFlag;
                    layer.open({
                        title: '系统提示'
                        ,content: '请先点击安装被测工件，再开始测量'
                    });
                }
                else {

                    if (flag) {
                        base.remove(button_off);
                        buttonControl.detach(button_off);
                        base.add(button_on);
                        buttonControl.attach(button_on);
                        // sliderControl.enabled=true;
                        slider.add(machineRay);
                        _this.timer = window.setInterval(function () {

                            VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                        }, 100);
                    }
                    else{
                        base.remove(button_on);
                        buttonControl.detach(button_on);
                        base.add(button_off);
                        buttonControl.attach(button_off);
                        // sliderControl.enabled=false;
                        slider.remove(machineRay);
                        sliderST=3;
                        setTimeout(function (){window.clearInterval(_this.timer);
                            _this.timer = 0;},200);
                    }
				}

            };

            /**
             *
             * @param input 输入端口读取角度
             */
            this.reset=function(){
               /* gear.rotateX(-gearNo*Math.PI/20);
                slider.position.y=sliderMark.position.y=0;
                if(!testerDown)tester.rotateX(Math.PI/4);
                gearNo=0,error=0,testerDown=true,sliderDown=false;*/
            }

            this.getData = function (dataType) {
                if (_this.onFlag){

                    // console.log("move",)
					let posY=slider.position.y
                    if(-6<=posY&&posY<=(-4))sliderST=0;
                    else if(-8<=posY&&posY<=-2)sliderST=1;
                    else if(-10<=posY&&posY<=-0)sliderST=2;
                    else sliderST=3;
                }
                else sliderST=3;
                return sliderST;

            };


            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/Roughness/base.mtl', 'assets/Roughness/base.obj'),

                        VILibrary.InnerObjects.loadModule('assets/Roughness/slider.mtl', 'assets/Roughness/slider.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/button_off.mtl', 'assets/Roughness/button_off.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/button_on.mtl', 'assets/Roughness/button_on.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/slider0.mtl', 'assets/Roughness/slider0.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/cylinder.mtl', 'assets/Roughness/cylinder.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/handwheel.mtl', 'assets/Roughness/handwheel.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roughness/cylinder_off.mtl', 'assets/Roughness/cylinder_off.obj'),
                    ];
                    Promise.all(promiseArr).then(function (objArr) {


                        base = objArr[0];
                        slider = objArr[1];
                        button_off = objArr[2];
                        button_on = objArr[3];
                        slider0=objArr[4];
                        cylinder=objArr[5];
                        handwheel=objArr[6];
                        cylinder_off=objArr[7];
                        loadingImg.style.display = 'none';
                        RoughnessDraw();
                    }).catch(e => console.log('RRToothRingVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/RR_ToothRing.png';
                    img.onload = function () {

                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }


            };
            this.draw();


            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            //相机、渲染、灯光、控制等初始设置
            function RoughnessDraw () {
                scene = new THREE.Scene();

                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 15000);
                camera.position.set(-100,200,700);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                scene.add(base);
                base.add(cylinder_off,button_off,slider0);
                slider0.add(slider,handwheel);
                base.position.y=-180;
                slider.position.y=5;
                slider0.position.y=-46;
                // cylinder.rotateOnAxis((Math.sqrt(0.5),Math.sqrt(0.5),0),Math.PI/2);

                //射线
                var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
                var color1 = new THREE.Color( 0x6495ED );//顶点1的颜色
                var color2 = new THREE.Color( 0xFF0000 );//顶点2的颜色
                // 线的材质可以由2点的颜色决定
                var x = new THREE.Vector3( 0,-10,0);//定义顶点的位置
                var y = new THREE.Vector3(0,50,0);//定义顶点的位置
                var geometry = new THREE.Geometry();//创建一个几何体
                geometry.vertices.push(x); //vertices是用来存放几何体中的点的集合
                geometry.vertices.push(y);
                geometry.colors.push( color1, color2);//color是用来存放颜色的,有两个点说明这两个颜色对应两个点
                //geometry中colors表示顶点的颜色，必须材质中vertexColors等于THREE.VertexColors 时，颜色才有效，如果vertexColors等于THREE.NoColors时，颜色就没有效果了。那么就会去取材质中color的值
				machineRay = new THREE.Line( geometry, material, THREE.LinePieces );
                machineRay.rotation.z = -Math.PI / 4;
                machineRay.rotation.y =-33.8 /180 * Math.PI;
                machineRay.position.set(-52,183,-7);

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, -4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-2000, 4000, 4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                //plane.rotateY(30/180*Math.PI);


                /*//拖动控制
                slider0Control = new ObjectControls(camera, renderer.domElement);
                slider0Control.map = plane;
                slider0Control.offsetUse = true;
                slider0Control.attachEvent('mouseOver', function () {
                    renderer.domElement.style.cursor = 'pointer';
                });
                slider0Control.attachEvent('mouseOut', function () {
                    renderer.domElement.style.cursor = 'auto';
                });

                slider0Control.attachEvent('dragAndDrop', onSlider0Drag);

                slider0Control.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });
*/
				//拖动控制
                sliderControl = new ObjectControls(camera, renderer.domElement);
                sliderControl.map = plane;
                sliderControl.offsetUse = true;

                sliderControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                sliderControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                sliderControl.attachEvent('dragAndDrop', onSliderDrag);

                sliderControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                cylinderControl= new ObjectControls(camera, renderer.domElement);
                cylinderControl.offsetUse = true;

                cylinderControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                cylinderControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                cylinderControl.attachEvent('onclick',function () {
                    base.remove(cylinder_off);
                    base.add(cylinder);
                    cylinderControl.detach(cylinderControl);
                    onPos=true;
                });

                buttonControl = new ObjectControls(camera, renderer.domElement);
                buttonControl.offsetUse = true;

                buttonControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                buttonControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                buttonControl.attachEvent('onclick',function () {
                    _this.onFlag=!_this.onFlag;
                    _this.toggleObserver(!_this.timer);
                });

                //绑定控制对象
                sliderControl.attach(slider);
                // slider0Control.attach(slider0);
                buttonControl.attach(button_off);
                cylinderControl.attach(cylinder_off);

                RoughnessAnimate();
            }

           /* function onSlider0Drag () {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.x = this.previous.x;  //lock x direction
                if (this.focused.position.y < -50) {

                    this.focused.position.y = -50;
                }
                else if (this.focused.position.y > 40) {

                    this.focused.position.y = 40;
                }
                // slider0.position.y = this.focused.position.y;
                console.log("slider0",slider0.position.y)
            }*/
            function onSliderDrag () {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.x = this.previous.x;  //lock x direction
                if (this.focused.position.y < -10) {

                    this.focused.position.y = -10;
                }
                else if (this.focused.position.y > 10) {

                    this.focused.position.y = 10;
                }
                console.log("slider",slider.position.y)
                // if(slider.position.y<-)
            }

            function RoughnessAnimate() {
                window.requestAnimationFrame(RoughnessAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

        }
	},
	/*PanelVI:class PanelVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {

            super(VICanvas);

            const _this = this;

            let camera, scene, renderer,
                scrollMesh,rulerMesh,panelMesh,markLine,
				panelControl, formerY=0;

            // let rulerPosition = -400;

            //crossMark in renderer
            let crossMarkTexture = new THREE.TextureLoader().load('img/crossMark.png');
            let crossMarkMaterial = new THREE.MeshBasicMaterial({map: crossMarkTexture});
            crossMarkMaterial.transparent = true;
            let crossMark = new THREE.Mesh(new THREE.PlaneGeometry(128, 128), crossMarkMaterial);
            crossMark.position.x = -160;
            crossMark.position.z = 1;

            let indexMark,indexMark1;
            // let raycaster = new THREE.Raycaster();
            let indexLines = [], indexNumbers = [];
            let objects = [], mouse = new THREE.Vector2(), SELECTED, mouseY = 0, rulerPosition = -400;

            let requestAnimationFrame = window.requestAnimationFrame
                || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame
                || window.msRequestAnimationFrame;
            window.requestAnimationFrame = requestAnimationFrame;



            panelDraw();
            panelAnimate();

            function panelDraw() {
                let panelCanvas = document.getElementById('panelCanvas')
                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setClearAlpha(0);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);


                camera = new THREE.PerspectiveCamera(30, _this.container.clientWidth / _this.container.clientHeight, 1, 2000);
                camera.position.z = 1000;
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                scene = new THREE.Scene();

                let light = new THREE.DirectionalLight(0xffffff, 1);
                light.position.set(0, 0, 1000);
                scene.add(light);

                let scrollTexture = new THREE.TextureLoader().load('img/1.png');
                let scrollGeometry = new THREE.BoxGeometry(32 * 2.5, 128 * 2.5, 10);
                 scrollMesh = new THREE.Mesh(scrollGeometry,
                    new THREE.MeshBasicMaterial({map: scrollTexture}));
                scrollMesh.position.x = 330;

                 rulerMesh = new THREE.Mesh(new THREE.PlaneGeometry(180, 400),
                    new THREE.MeshBasicMaterial({color: 0xffffff}));
                rulerMesh.position.x = 180;

                drawIndexLine();

                 panelMesh = new THREE.Mesh(new THREE.CircleGeometry(220, 40, 0, Math.PI * 2),
                    new THREE.MeshBasicMaterial({color: 0x66FF00}));

                panelMesh.position.x = -160;
                //add zoomIndex
                drawZoomIndexLine();

                let markGeometry = new THREE.Geometry();
                let markMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 0.5});
                markGeometry.vertices.push(new THREE.Vector3(200, 0.5, 0));
                markGeometry.vertices.push(new THREE.Vector3(90, 0.5, 0));
                 markLine = new THREE.Line(markGeometry, markMaterial, THREE.LineSegments);

                /!*let indexMarkGeometry = new THREE.Geometry();
                indexMarkGeometry.vertices.push(new THREE.Vector3(-380, 0, 0));
                indexMarkGeometry.vertices.push(new THREE.Vector3(60, 0, 0));

                indexMark = new THREE.Line(indexMarkGeometry, new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 0.5
                }), THREE.LineSegments);
                indexMark1 = new THREE.Line(indexMarkGeometry, new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 0.5
                }), THREE.LineSegments);*!/
                 drawIndexMark();

                indexMark.position.z = 2;
                scene.add(indexMark);
                indexMark.add(indexMark1);
                scene.add(scrollMesh);
                scene.add(rulerMesh);
                scene.add(panelMesh);
                scene.add(markLine);
                objects.push(scrollMesh);

                let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(800, 800),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                //plane.rotateY(30/180*Math.PI);
                plane.position.x = 330;

                //拖动控制
                panelControl = new ObjectControls(camera, renderer.domElement);
                panelControl.map = plane;
                panelControl.offsetUse = true;

                panelControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                panelControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                panelControl.attachEvent('dragAndDrop', onScrollDrag);

                panelControl.attachEvent('mouseUp', function () {

                    // controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });
               /!* panelControl.attachEvent('mousedown', function () {

                    renderer.domElement.style.cursor = 'pointer';
                    formerY=this.focused.position.y;
                });*!/
                panelControl.attach(scrollMesh);



                panelAnimate();
            }
            function panelAnimate() {
                window.requestAnimationFrame(panelAnimate);
                renderer.render(scene, camera);
            }

            function drawIndexMark() {

                scene.remove(indexMark);

                let indexMarkGeometry = new THREE.Geometry();
                indexMarkGeometry.vertices.push(new THREE.Vector3(-160 - Math.sqrt(220 * 220 - (rulerPosition + 400) * (rulerPosition + 400)), rulerPosition + 400, 0));
                indexMarkGeometry.vertices.push(new THREE.Vector3(-160 + Math.sqrt(220 * 220 - (rulerPosition + 400) * (rulerPosition + 400)), rulerPosition + 400, 0));

                indexMark = new THREE.Line(indexMarkGeometry, new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 0.5
                }), THREE.LineSegments);
                // indexMark.position.z = 2;

                let indexMarkGeometry1 = new THREE.Geometry();
                indexMarkGeometry1.vertices.push(new THREE.Vector3( -160-(rulerPosition + 400), - Math.sqrt(220 * 220 - (rulerPosition + 400) * (rulerPosition + 400)),0));
                indexMarkGeometry1.vertices.push(new THREE.Vector3( -160-(rulerPosition + 400),   Math.sqrt(220 * 220 - (rulerPosition + 400) * (rulerPosition + 400)),0));

                indexMark1 = new THREE.Line(indexMarkGeometry1, new THREE.LineBasicMaterial({
                    color: 0x000000,
                    linewidth: 0.5
                }), THREE.LineSegments);

                scene.add(indexMark);
                indexMark.add(indexMark1);

//        console.log('y: ' + rulerPosition);
            }
            function drawIndexLine() {

                for (let i = 0; i < 100; i++) {
                    let indexGeometry = new THREE.Geometry();
                    let xPosition = 170;
                    let yPosition = -199 + 15 * i + rulerPosition;
                    if (yPosition >= 199 || yPosition <= -199) continue;

                    if (i % 5 == 0) xPosition = 180;

                    if (i % 10 == 0) {

                        xPosition = 190;
                        let indexCanvas = document.createElement('canvas');
                        indexCanvas.style.width = "128px";
                        indexCanvas.style.height = "256px";
                        let context1 = indexCanvas.getContext('2d');
                        context1.font = "30px Arial";
                        context1.fillStyle = "rgba(0,0,0,1)";
                        context1.fillText(i.toString(), 0, 25);
                        // canvas contents will be used for a texture
                        let texture1 = new THREE.Texture(indexCanvas);
                        texture1.needsUpdate = true;
                        let material1 = new THREE.MeshBasicMaterial({map: texture1});
                        material1.transparent = true;
                        let indexNumber = new THREE.Mesh(new THREE.PlaneGeometry(indexCanvas.width, indexCanvas.height), material1);
                        indexNumber.position.set(350, yPosition - 60, 0);
                        scene.add(indexNumber);
                        indexNumbers.push(indexNumber);
                    }

                    indexGeometry.vertices.push(new THREE.Vector3(150, yPosition, 0));
                    indexGeometry.vertices.push(new THREE.Vector3(xPosition, yPosition, 0));
                    let indexLine = new THREE.Line(indexGeometry, new THREE.LineBasicMaterial({
                        color: 0x000000,
                        linewidth: 0.5
                    }), THREE.LineSegments);
                    scene.add(indexLine);
                    indexLines.push(indexLine);
                }
            }
            function drawZoomIndexLine() {
                for (let i = 0; i < 100; i++) {
                    let indexGeometry = new THREE.Geometry();
                    let xPosition = -250;
                    let yPosition = -200 + 20 * i;
                    if (yPosition >= 200 || yPosition <= -200) continue;

                    if (i % 5 == 0) {

                        xPosition = -270;
                        let zoomIndexCanvas = document.createElement('canvas');
                        let context1 = zoomIndexCanvas.getContext('2d');
                        context1.font = "40px Arial";
                        context1.fillStyle = "rgba(0,0,0,1)";
                        context1.fillText(i.toString(), 0, 90);
                        // canvas contents will be used for a texture
                        let texture1 = new THREE.Texture(zoomIndexCanvas)
                        texture1.needsUpdate = true;
                        let material1 = new THREE.MeshBasicMaterial({map: texture1});
                        material1.transparent = true;
                        let zoomIndexNumber = new THREE.Mesh(
                            new THREE.PlaneGeometry(zoomIndexCanvas.width, zoomIndexCanvas.height), material1);
                        zoomIndexNumber.position.set(-180, yPosition, 0);
                        scene.add(zoomIndexNumber);
                    }
                    indexGeometry.vertices.push(new THREE.Vector3(-210, yPosition, 0));
                    indexGeometry.vertices.push(new THREE.Vector3(xPosition, yPosition, 0));
                    let zoomIndexLine = new THREE.Line(indexGeometry, new THREE.LineBasicMaterial({
                        color: 0x000000,
                        linewidth: 0.5
                    }), THREE.LineSegments);
                    scene.add(zoomIndexLine);
                }
            }

            function onScrollDrag() {
                renderer.domElement.style.cursor = 'pointer';
                console.log( ( this.focused.position.y - formerY)/2 );

                // rulerPosition += ( this.focused.position.y - formerY)/2 ;
                // rulerPosition += ( this.focused.position.y - this.previous.y) ;
                rulerPosition=400+this.focused.position.y/100;
                formerY=this.focused.position.y;

                this.focused.position.x = this.previous.x;  //lock x direction
                scrollMesh.position.y = this.previous.y;  //lock x direction

                while (indexNumbers.length > 0) {
                    scene.remove(indexNumbers[0]);
                    indexNumbers.shift();
                }

                while (indexLines.length > 0) {
                    scene.remove(indexLines[0]);
                    indexLines.shift();
                }
                drawIndexLine();
                drawIndexMark();
            }



        }
    }*/

    PanelVI:class PanelVI extends TemplateVI{
        constructor (VICanvas) {
            super(VICanvas);
            const _this = this;
            this.name = 'PanelVI';
            let ctx = this.container.getContext("2d"),img;
            let canvasW=this.container.width,canvasH=this.container.height,
				panelX=canvasW*0.3,panelY=canvasH/2,R=canvasW*0.3,
				rulerW=canvasW*0.15,rulerH=canvasH*0.7,rulerX=panelX+R+canvasW*0.05,rulerY=(canvasH-rulerH)/2,
			    scrollW=canvasW*0.1,scrollH=canvasH*0.5,scrollX=rulerX+rulerW,scrollY=(canvasH-scrollH)/2,
                IS_DOWN=false,formerY=0,testNum=0,formerInput=0,
                imgSRC='img/Roughness/Transparent.png',img2,
				BLACK="#000000",
				RED="#ff0000";
            ctx.textBaseline="middle";//文字居中定位
            ctx.lineWidth=1;


            this.setData = function (input){

                let inputST = Number(Array.isArray(input) ? input[input.length - 1] : input);

                if (Number.isNaN(inputST)) {

                    console.log('panelVI: Input value error');
                    return;
                }
                if(input!=formerInput){
                    switch (input)
                    {
                        case 0:imgSRC='img/Roughness/Clear.png';break;
                        case 1:imgSRC='img/Roughness/Blurred1.png';break;
                        case 2:imgSRC='img/Roughness/Blurred2.png';break;
                        case 3:imgSRC='img/Roughness/Transparent.png';break;
                    }
                    drawImg2();
				}
                formerInput=input;
            };

            function scrollDraw() {
                //手轮
                img = new Image();
                img.onload = function(){
                    ctx.drawImage(img, scrollX,scrollY,scrollW,scrollH);

                }
                img.src = 'img/1.png';

            }
            function drawImg2() {
                img2 = new Image();
                img2.onload = function(){
                    draw(0);
                }
                img2.src=imgSRC;
            }



            function draw(i) {

                ctx.clearRect(0,0,scrollX,canvasH);//清空画布
				/*静态部分*/
                ctx.save();
				ctx.fillStyle=BLACK;
                ctx.beginPath();
                ctx.arc(panelX, panelY,R, 0, Math.PI*2, false);
                ctx.fill();
                ctx.closePath();
                ctx.drawImage(img2, panelX-R,panelY-R,2*R,2*R);
                ctx.fillStyle=RED;
                ctx.strokeStyle=RED;
                ctx.beginPath();
                ctx.translate(panelX,panelY);//坐标系移至圆心
                ctx.rotate(-Math.PI/4);
                for(let i=0;i<10;i++){
                    ctx.moveTo(0.3*R,-(0.7-0.16*i)*R);
                    ctx.lineTo(0.4*R,-(0.7-0.16*i)*R);
                    ctx.fillText(i, 0.5*R, -(0.7-0.16*i)*R);
                }
                ctx.stroke();
                ctx.closePath();
                ctx.restore();

                // 刻度尺
                let my_gradient=ctx.createLinearGradient(0,0,0,canvasH);
                my_gradient.addColorStop(0,"#555555");
                my_gradient.addColorStop(0.5,"#cccccc");
                my_gradient.addColorStop(1,"#555555");
                ctx.fillStyle=my_gradient;
                ctx.fillRect(rulerX,rulerY,rulerW,rulerH);
                ctx.strokeStyle=BLACK;
                ctx.beginPath();
                ctx.moveTo(rulerX,panelY);
                ctx.lineTo(rulerX+rulerW,panelY);
                ctx.stroke();
                ctx.closePath();




				/*可动部分*/
                ctx.save();//目镜视场内移动刻度线
                ctx.translate(panelX,panelY);//坐标系移至圆心
                ctx.strokeStyle=RED;
                ctx.beginPath();
                ctx.moveTo(-Math.sqrt(R*R-i*i),-i);//十字线
                ctx.lineTo(Math.sqrt(R*R-i*i),-i);
                ctx.moveTo(-i,Math.sqrt(R*R-i*i));
                ctx.lineTo(-i,-Math.sqrt(R*R-i*i));
                // ctx.moveTo(-i+R/2,-i-R/2);
                // ctx.lineTo(-i+R/2+R/4*Math.sin(Math.PI/4),-(i+R/2+R/4*Math.sin(Math.PI/4)));
                ctx.rotate(-Math.PI/4); // 画目镜刻度
                ctx.moveTo(0.6*R,0.16*i*R*0.01);
                ctx.lineTo(0.8*R,0.16*i*R*0.01);
                ctx.moveTo(0.6*R,0.16*i*R*0.01+3);
                ctx.lineTo(0.8*R,0.16*i*R*0.01+3);
                ctx.stroke();
                ctx.closePath();
                ctx.restore();

                //刻度尺刻度及数字
                ctx.save();
                ctx.beginPath();
                let rulerLineX=rulerX+rulerW*0.2,//刻度线左侧起点
                    rulerMin=rulerH*0.03,//刻度线间距
                    rulerLineYp,
                    rulerLineYn;
                ctx.translate(rulerLineX,panelY);
                ctx.fillStyle=BLACK;
                for(let j=0;j<=50;j++){
                    rulerLineYp=i+j*rulerMin;
                    rulerLineYn=i-j*rulerMin;
                    let lineLen = (j % 5) ? rulerW * 0.2 : rulerW * 0.3;
                    if((rulerLineYp>(-rulerH/2))&&(rulerLineYp<rulerH/2)) {
                        ctx.moveTo(0, rulerLineYp);
                        ctx.lineTo(lineLen, rulerLineYp);
                        if ((j % 10) == 0&&Math.abs(rulerLineYp)<(0.5*rulerH-10))ctx.fillText(50-j, lineLen + 1, rulerLineYp);
                        //    被十整除而且不在标尺的边缘（保证数字不会超出标尺范围）
                    }
                    if(((-rulerH/2)<rulerLineYn)&&(rulerLineYn<rulerH/2)){
                        ctx.moveTo(0,rulerLineYn);
                        ctx.lineTo(lineLen,rulerLineYn);
                        if((j%10)==0&&Math.abs(rulerLineYn)<(0.5*rulerH-10))ctx.fillText(50+j,lineLen+1,rulerLineYn);
                    }
                }

                ctx.stroke();
                ctx.closePath();
                ctx.restore();






            }

            //拖动控制
            _this.container.addEventListener("mousedown",function() {
                event.preventDefault();this.style.cursor = 'pointer';IS_DOWN=true;formerY=event.offsetY;/*formerX=event.offsetX;*/},false);
            _this.container.addEventListener("mousemove",function () {
                event.preventDefault();
                if (IS_DOWN == false) return;
                let x=event.offsetX;
                let y=event.offsetY;

                if((scrollX<x<(scrollX+scrollW))&&(scrollY<y<(scrollY+scrollH))){
                    this.style.cursor = 'pointer';
                    testNum+=(y-formerY)*0.2;

                    formerY=y;

                }
                draw(testNum);

            },false);
            _this.container.addEventListener("mouseup",function (){IS_DOWN=false;},false);
            _this.container.addEventListener("mouseout",function (){IS_DOWN=false;this.style.cursor = 'auto';},false);
            _this.container.addEventListener("mouseover",function (){this.style.cursor = 'pointer';},false);




//调用函数

            scrollDraw();
            drawImg2();






        }
    },

    CircleRunoutVI:class CircleRunoutVI extends TemplateVI{
        constructor (VICanvas,draw3DFlag) {
            super(VICanvas);
            const _this = this;
            this.name = 'CircleRunoutVI';

            let camera,scene,renderer,
				controls,base1Control,rotator1Control,rotator2Control,stickControl,buttonControl,
				base1,base,axis,rotator1,rotator2,stick,onButton,offButton,
				onFlag=false,exmStyle=0,index=0,offset,tolerance,result,
                errArray1=[0,1.5,3,4.5,6,7.5,9,10.5,10.5,9,7.5,6,4.5,3,1.5,0,-1.5,-3,-1,0],
                errArray2=[0,1,2,3,4,5,6,7,8,9,8,7,6,5,4,3,2,1,0.5,0],
                errOutput=[0];

            _this.timer=0;

            this.toggleObserver = function (flag) {

                if (flag) {

                    if (!_this.timer&&exmStyle) {
                         if(!index){errOutput=[0];}
                        scene.remove(offButton);
                        buttonControl.detach(offButton);
                        scene.add(onButton);
                        buttonControl.attach(onButton);
                        document.getElementById("exmSelect").disabled=true;
                        let delta =0.1*Math.PI  ;//一齿的弧度
                        _this.timer = window.setInterval(function () {
                        	if(exmStyle==1)errOutput[index]=errArray1[index]+Math.random();
                            if((exmStyle==2)||(exmStyle==3))errOutput[index]=errArray2[index]-Math.random();
                        	index++;
                            //定时更新相同数据线VI的数据


                            axis.rotation.x = index*delta;
                            if(axis.rotation.x>=Math.PI*2){
                                window.clearInterval(_this.timer);
                                document.getElementById("exmSelect").disabled=false;
                                document.getElementById('data'+(exmStyle*4-1)).innerText =offset;
                                document.getElementById('data'+exmStyle*4).innerText =result;
                                axis.rotation.x=0;
                                index=0;
                                _this.timer = 0;
                                scene.remove(onButton);
                                buttonControl.detach(onButton);
                                scene.add(offButton);
                                buttonControl.attach(offButton);
                                errOutput[20]=0;

                            }
                            if (_this.dataLine) {

                                VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                            }
                        }, 100);
                    }
                }
                else{
                    scene.remove(onButton);
                    buttonControl.detach(onButton);
                    scene.add(offButton);
                    buttonControl.attach(offButton);
                    window.clearInterval(this.timer);
                    _this.timer = 0;
                    // index=0;
                    // errOutput=[0];
                    // axis.rotation.x =0;
                }
            };
            this.getData=function (dataType) {
				if(exmStyle==1||exmStyle==2||exmStyle==3){
					let max=Math.max.apply(Math,errOutput).toFixed(1);
                    let min=Math.min.apply(Math,errOutput).toFixed(1);
                    offset=(max-min).toFixed(1);
					tolerance=parseFloat(document.getElementById('tol'+exmStyle).innerText);
					result=offset<=tolerance?"合格":"不合格";
                    document.getElementById('data'+(exmStyle*4-3)).innerText =max;
                    document.getElementById('data'+(exmStyle*4-2)).innerText =min;
                    /*document.getElementById('data'+(exmStyle*4-1)).innerText =offset;
                    document.getElementById('data'+exmStyle*4).innerText =result;*/

				}
				else errOutput=[0];
                    console.log(errOutput);
                return errOutput;

            }

            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/base1.mtl', 'assets/CircleRunout/base1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/base2.mtl', 'assets/CircleRunout/base2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/axis.mtl', 'assets/CircleRunout/axis.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/Rotator1.mtl', 'assets/CircleRunout/Rotator1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/stick.mtl', 'assets/CircleRunout/stick.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/Rotator2.mtl', 'assets/CircleRunout/Rotator2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/onButton.mtl', 'assets/CircleRunout/onButton.obj'),
                        VILibrary.InnerObjects.loadModule('assets/CircleRunout/offButton.mtl', 'assets/CircleRunout/offButton.obj'),

                    ];
                    Promise.all(promiseArr).then(function (objArr) {


                        base = objArr[0];
                        base1 = objArr[1];
                        axis = objArr[2];
                        rotator1 = objArr[3];
                        stick = objArr[4];
                        rotator2 = objArr[5];
                        onButton=objArr[6];
                        offButton=objArr[7];


                        loadingImg.style.display = 'none';
                        CRDraw();
                    }).catch(e => console.log('CircleRunoutVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/RR_ToothRing.png';
                    img.onload = function () {

                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }


            };
            this.draw();


            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            //相机、渲染、灯光、控制等初始设置
            function CRDraw () {
                scene = new THREE.Scene();

                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 1000);
                camera.position.set(0,0,180);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                scene.add(base1,base,axis,offButton);
                base1.add(rotator1);
				rotator1.add(stick);
				stick.add(rotator2);

                stick.position.set(0,0,0);
				rotator1.position.set(50,-46.26,50);
                rotator2.position.set(-27,58.76,-8);

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                // plane.rotateX(0.5*Math.PI);

                //拖动控制
                base1Control = new ObjectControls(camera, renderer.domElement);
                base1Control.map = plane;
                base1Control.offsetUse = true;


                base1Control.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                base1Control.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                base1Control.attachEvent('dragAndDrop', onBase1Drag);

                base1Control.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });


                //双向孔套1
                rotator1Control = new ObjectControls(camera, renderer.domElement);
                rotator1Control.map = plane;
                rotator1Control.offsetUse = true;
                rotator1Control.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                rotator1Control.attachEvent('mouseOut', function () {
                    renderer.domElement.style.cursor = 'auto';
                });
                rotator1Control.attachEvent('dragAndDrop', onRotator1Drag);
                rotator1Control.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    stickControl.enabled=true;
                    renderer.domElement.style.cursor = 'auto';
                });

                stickControl = new ObjectControls(camera, renderer.domElement);
                stickControl.map = plane;
                stickControl.offsetUse = true;
                stickControl.attachEvent('dragAndDrop', onStick1Drag);
                stickControl.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                rotator2Control = new ObjectControls(camera, renderer.domElement);
                rotator2Control.map = plane;
                rotator2Control.offsetUse = true;
                rotator2Control.attachEvent('dragAndDrop', onRotator2Drag);
                rotator2Control.attachEvent('mouseUp', function () {
                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                buttonControl = new ObjectControls(camera, renderer.domElement);
                buttonControl.map = plane;
                buttonControl.offsetUse = true;
                buttonControl.attachEvent('onclick', function () {
                    _this.toggleObserver(!_this.timer);
                });
                buttonControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                buttonControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                //绑定控制对象
                base1Control.attach(base1);
                rotator1Control.attach(rotator1);
                stickControl.attach(stick);
                rotator2Control.attach(rotator2);
                buttonControl.attach(offButton);



                CRAnimate();
            }

            function onBase1Drag () {
                if(this.focused.materialLibraries=="base2.mtl"){
                    controls.enabled = false;
                    renderer.domElement.style.cursor = 'pointer';
                    /*if (this.focused.position.y < -20) {

                        this.focused.position.y = -20;
                    }
                    else if (this.focused.position.y > 5) {

                        this.focused.position.y = 5;
                    }*/
                    if (this.focused.position.x < -120) {

                        this.focused.position.x = -120;
                    }
                    else if (this.focused.position.x > 30) {

                        this.focused.position.x = 30;
                    }

                    // base1.position.z =- this.focused.position.y;
                    this.focused.position.y = this.previous.y;
				}
				else {
                    this.focused.position.x = this.previous.x;
                    this.focused.position.y = this.previous.y;
				}
            }
            function onRotator1Drag () {
                if(this.focused.materialLibraries=="Rotator1.mtl"){
                	stickControl.enabled=false;
                    controls.enabled = false;
                    renderer.domElement.style.cursor = 'pointer';
                    let formerX=this.previous.x;
                    let offsetX=this.focused.position.x-formerX,flg=0;
                    if(offsetX>0) flg=1;
                    else if (offsetX<0) flg=-1;
                    else  flg=0;
                    // formerX=this.focused.position.x;
                    rotator1.position.x = this.previous.x;
                    rotator1.rotateY(flg*0.005);
                    console.log("rotator1Control.enabled",rotator1Control.enabled);
				}
                else {
                    this.focused.position.x = this.previous.x;
                    this.focused.position.y = this.previous.y;
                }
            }
            function onStick1Drag () {
                if(this.focused.materialLibraries=="stick.mtl"){
                    controls.enabled = false;
                    renderer.domElement.style.cursor = 'pointer';
                    if (this.focused.position.x < -120) {

                        this.focused.position.x = -120;
                    }
                    else if (this.focused.position.x > 30) {

                        this.focused.position.x = 30;
                    }
                    this.focused.position.y = this.previous.y;
				}
                else {
                    this.focused.position.x = this.previous.x;
                    this.focused.position.y = this.previous.y;
                }
            }
            function onRotator2Drag () {
                    controls.enabled = false;
                    renderer.domElement.style.cursor = 'pointer';
                    let offsetY=this.focused.position.y-this.previous.y,flg=0;
                    if(offsetY>0) flg=1;
                    else if (offsetY<0) flg=-1;
                    else  flg=0;
                    this.focused.position.x= this.previous.x;
                    this.focused.position.y= this.previous.y;
                    rotator2.rotateX(-flg*0.003);
            }

            function CRAnimate() {
                window.requestAnimationFrame(CRAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

            this.changeStyle=function (i) {
                exmStyle=i;
                console.log(exmStyle);
				switch (i){
					case 0:{
                        base1.position.set(0,0,-10);
                        rotator1.position.set(50,-46.26,50);
                        rotator2.position.set(-27,58.76,-8);
                        stick.position.set(20,0,0);
                        rotator1.rotation.y=0;
                        rotator2.rotation.x=0;

                        base1Control.enabled=true;
                        rotator1Control.enabled=true;
                        stickControl.enabled=true;
                        rotator2Control.enabled=true;

                        break;
					}
					case 1:{
						base1.position.set(-70,0,-6);
                        rotator1.position.set(50,-46.26,50);
                        rotator2.position.set(-27,58.76,-8);
                        stick.position.set(-10,0,0);
                        rotator2.rotation.x=0;
                        rotator1.rotation.y=-Math.PI/2;

                        base1Control.enabled=false;
                        rotator1Control.enabled=false;
                        stickControl.enabled=false;
                        rotator2Control.enabled=false;

                        break;
					}
					case 2:{
                        base1Control.enabled=false;
                        rotator1Control.enabled=false;
                        stickControl.enabled=false;
                        rotator2Control.enabled=false;

                        stick.position.set(-10,0,0);
                        base1.position.set(-63.88,0,-6);
                        rotator1.position.set(50,-46.5,50);
                        rotator2.position.set(-27,58.76,-8);
                        rotator1.rotation.y=-Math.PI/2;
                        rotator2.rotation.x=Math.PI/6;
                        break;
					}
					case 3:{
                        base1.position.set(-35.69,0,-6);
                        rotator1.position.set(50,-55.76,50);
                        rotator2.position.set(-27,58.76,-8);
                        stick.position.set(-10,0,0);
                        rotator1.rotation.y=-Math.PI/2;
                        rotator2.rotation.x=-Math.PI/3;

                        base1Control.enabled=false;
                        rotator1Control.enabled=false;
                        stickControl.enabled=false;
                        rotator2Control.enabled=false;
                        break;
					}
					default: console.log("examStyle error");break;
				}
            }




        }
    },

    RoundnessVI:class CircleRunoutVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;
            this.name = 'RoundnessVI';

            let camera, scene, renderer,index = 0,
				base,slider,tester,rotator,onSwitch,offSwitch,
                controls,sliderControl,testerControl,switchControl,
				xOn=false,yOn=true;
               /*  base1Control, rotator1Control, rotator2Control, stickControl, buttonControl,
                base1, base, axis, rotator1, rotator2, stick, onButton, offButton,
                _this.onFlag = false, exmStyle = 0,;*/
			let dataOutput = [0];
			let errOutput=[0],R=70;//基准圆半径
			

            this.timer = 0;

            this.toggleObserver = function (flag) {
                if (flag) {
                    console.log(xOn,yOn)
                    if (!this.timer&&xOn&&yOn) {

                        // if(!index){dataOutput=[0];}
                        scene.remove(offSwitch);
                        switchControl.detach(offSwitch);
                        scene.add(onSwitch);
                        switchControl.attach(onSwitch);

                        let delta =0.05*Math.PI;
                        let  table = document.getElementById("roundnessData");

                        if(index==0){
                        	let d= document.getElementsByClassName("exm_data");
                        	for (let i=0; i<d.length;i++){d[i].innerText="";}
                        }
                        this.timer = window.setInterval(function () {
                            //dataOutput[index]=50+10*Math.random();
							errOutput[index]=10*Math.random();
							dataOutput[index]=R+errOutput[index];
							
                            if(index>table.rows.length-2){

                                let  oneRow = table.insertRow();//插入一行
                                let  cell1= oneRow.insertCell();//单单插入一行是不管用的，需要插入单元格
                                let  cell2=oneRow.insertCell();
                                let  cell3=oneRow.insertCell();
                                cell1.innerText = index;
                                cell2.className="exm_data";
                                cell3.className="exm_data";
                                cell2.id="a"+index;
                                cell3.id="e"+index;


							}

                            document.getElementById("a"+index).innerText=index*9;//以角度表示
                            document.getElementById("e"+index).innerText=errOutput[index].toFixed(2);


                            index++;
                            rotator.rotation.y = index*delta;
                            if (_this.dataLine) {
                                VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                            }
                            if(rotator.rotation.y>=Math.PI*2){
                                scene.remove(onSwitch);
                                switchControl.detach(onSwitch);
                                scene.add(offSwitch);
                                switchControl.attach(offSwitch);
                                window.clearInterval(_this.timer);
                                rotator.rotation.y =0;
                                    index=0;
                                _this.timer = 0;
                                dataOutput=[0];
								errOutput=[0];
                                // dataOutput[20]=0;
                            }
                            //定时更新相同数据线VI的数据

                        }, 50);
                    }
                }
                else{
                    scene.remove(onSwitch);
                    switchControl.detach(onSwitch);
                    scene.add(offSwitch);
                    switchControl.attach(offSwitch);
                    window.clearInterval(this.timer);
                    this.timer = 0;
                }
            }
            this.getData=function(dataType){
                return errOutput;

			}

            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/Roundness/base.mtl', 'assets/Roundness/base.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/rotator.mtl', 'assets/Roundness/rotator.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/slider.mtl', 'assets/Roundness/slider.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/tester.mtl', 'assets/Roundness/tester.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/offSwitch.mtl', 'assets/Roundness/offSwitch.obj'),
                        VILibrary.InnerObjects.loadModule('assets/Roundness/onSwitch.mtl', 'assets/Roundness/onSwitch.obj'),
                    ];
                    Promise.all(promiseArr).then(function (objArr) {
                        base = objArr[0];
                        rotator = objArr[1];
                        slider = objArr[2];
                        tester = objArr[3];
                        offSwitch=objArr[4];
                        onSwitch=objArr[5];
                        loadingImg.style.display = 'none';
                        RoundnessDraw();
                    }).catch(e => console.log('RoundnessVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/Roundness.png';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }
            };
            this.draw();

			//相机、渲染、灯光、控制等初始设置
            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            function RoundnessDraw () {
                scene = new THREE.Scene();

                scene.add(base,rotator,offSwitch,slider);
                slider.add(tester);
                //初始位置

                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 1000);
                camera.position.set(0,100,250);
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;
                let plane1 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));

                //拖动旋转
                let plane2 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 400),new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ));
                plane2.rotateY(0.5*Math.PI);

                sliderControl =new ObjectControls(camera, renderer.domElement);
                sliderControl.map = plane2;
                sliderControl.offsetUse = true;
                sliderControl.attachEvent('mouseOver', function () {
                    renderer.domElement.style.cursor = 'pointer';
                });
                sliderControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });
                sliderControl.attachEvent('dragAndDrop', onSliderDrag);
                sliderControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                testerControl =new ObjectControls(camera, renderer.domElement);
                testerControl.map = plane2;
                testerControl.offsetUse = true;
                testerControl.attachEvent('mouseOver', function () {
                    renderer.domElement.style.cursor = 'pointer';
                });
                testerControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });
                testerControl.attachEvent('dragAndDrop', onTesterDrag);
                testerControl.attachEvent('mouseUp', function () {

                    controls.enabled = true;
                    renderer.domElement.style.cursor = 'auto';
                });

                //开关
                switchControl = new ObjectControls(camera, renderer.domElement);
                switchControl.offsetUse = true;

                switchControl.attachEvent('mouseOver', function () {

                    renderer.domElement.style.cursor = 'pointer';
                });

                switchControl.attachEvent('mouseOut', function () {

                    renderer.domElement.style.cursor = 'auto';
                });

                switchControl.attachEvent('onclick',function () {

                    _this.toggleObserver(!_this.timer);
                });


                sliderControl.attach(slider);
                switchControl.attach(offSwitch);
                testerControl.attach(tester);

                RoundnessAnimate();
            }
            //上下移动
            function onSliderDrag() {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';

                this.focused.position.x = this.previous.x;  //lock x direction
				if(tester.position.x<-0.85){if (this.focused.position.y< -1.4) {this.focused.position.y = -1.4;}}
				else {if (this.focused.position.y< -5) {this.focused.position.y = -5;}}
                if (this.focused.position.y> 15) {this.focused.position.y =15;}

                if(this.focused.position.y>=-1.5&&this.focused.position.y<=7)yOn=true;
                else yOn=false;
            }
            //左右拖动
            function onTesterDrag() {
                controls.enabled = false;
                renderer.domElement.style.cursor = 'pointer';
                this.focused.position.y = this.previous.y;  //lock x direction
				if(slider.position.y<-1.4){if (this.focused.position.x< -0.85) {this.focused.position.x = -0.85;}}
                else{if (this.focused.position.x< -6) {this.focused.position.x = -6;}}
                if (this.focused.position.x> 18) {this.focused.position.x =18;}
                if(this.focused.position.x<-5)xOn=true;
				else xOn=false;
            }
            function RoundnessAnimate() {
                window.requestAnimationFrame(RoundnessAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }

        }
        static get cnName() {

            return '圆度误差实验';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },

    NyquistVI:class NyquistVI extends TemplateVI{

        constructor (VICanvas) {
            super(VICanvas);

            const _this = this;
            this.name = 'NyquistVI';
            this.ctx = this.container.getContext("2d");

            this.angle=0;
            let HEIGHT=this.container.height,
                WIDTH=this.container.width;
            // shorter=Math.min(HEIGHT,WIDTH);

            let e=[0],R=70,len,u1,u2;

            let CENTER_X=WIDTH/2,
                CENTER_Y=HEIGHT/2,
                START_ANGLE = 0, // Starting point on circle
                END_ANGLE = Math.PI*2; // End point on circle

            let BGColor="rgba(220,220,230,0.6)",
                BLACK= "rgba(0,0,0,1)",
                GREEN ="rgba(10,200,10,1)",
                RED="rgba(200,10,10,1)";

            this.draw=function (inputR) {
                this.ctx.textAlign = "center";//文本对齐
                this.ctx.font="10px Times new roman";
                this.ctx.textBaseline="middle";//文字居中定位

                this.ctx.clearRect(0,0,WIDTH,HEIGHT);//清空画布

                this.ctx.fillStyle=BGColor;
                this.ctx.strokeStyle=BLACK;
                this.ctx.fillRect(0,0,WIDTH,HEIGHT);
                this.ctx.strokeRect(0,0,WIDTH,HEIGHT);

                if(e.length>1){
                    this.ctx.beginPath();
                    this.ctx.moveTo(10,CENTER_Y);
                    this.ctx.lineTo(WIDTH-10,CENTER_Y);
                    this.ctx.moveTo(CENTER_X,10);
                    this.ctx.lineTo(CENTER_X,HEIGHT-10);
                    this.ctx.strokeStyle=GREEN;
                    this.ctx.stroke();
                    this.ctx.closePath();


                    this.ctx.save();
                    this.ctx.translate(CENTER_X,CENTER_Y);//坐标系移至圆心
                    this.ctx.beginPath();
                    let len=e.length,
                        delta=Math.PI*2/40;
                    if(e.length>=40)e[40]=e[0];
                    this.ctx.moveTo(e[0]+R,0);
                    for(let i=1;i<=len;i++)//画当前数组的Nyquist图
                    {
                        this.ctx.rotate(delta);
                        this.ctx.lineTo(e[i]+R,0);this.ctx.stroke();
                    }
                    this.ctx.closePath();
                    this.ctx.restore();

                    this.ctx.beginPath();//图注
                    this.ctx.moveTo(0.6*WIDTH,HEIGHT-25);
                    this.ctx.lineTo(0.7*WIDTH,HEIGHT-25);
                    this.ctx.fillStyle=BLACK;
                    this.ctx.fillText("极坐标图",0.8*WIDTH,HEIGHT-25);
                    this.ctx.fillText("误差放大1000倍",0.8*WIDTH,20);

                    this.ctx.stroke();
                    this.ctx.closePath();
                }//有数据输入时

                if(inputR>0){
                    this.ctx.beginPath();
                    this.ctx.strokeStyle=RED;
                    this.ctx.arc(CENTER_X+u1, CENTER_Y+u2,inputR, START_ANGLE, END_ANGLE, false);
                    this.ctx.moveTo(0.6*WIDTH,HEIGHT-10);
                    this.ctx.lineTo(0.7*WIDTH,HEIGHT-10);
                    this.ctx.fillText("最小二乘图",0.83*WIDTH,HEIGHT-10);

                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            };
            this.draw();
            this.setData = function (input){
                if (Number.isNaN(input)) {
                    console.log('NyquistVI: Input value error');
                    return;
                }
                e=input;
               /* console.log(e)*/
                this.draw();
            };

            this.square=function(){
                u1=0,u2=0;
                let r0=0;
                len=e.length;
                len--;
                console.log(len);
                for (let i=0; i<=len-1;i++){
                    r0+=e[i]/len;
                    u1+=-2/len*e[i]*Math.cos(Math.PI*2/len*i);
                    u2+=-2/len*e[i]*Math.sin(Math.PI*2/len*i);
                }

                document.getElementById("u1").innerHTML=u1.toFixed(2);
                document.getElementById("u2").innerHTML=u2.toFixed(2);
                document.getElementById("r").innerHTML=(r0/1000+R).toFixed(4);
                let deltaR=[0];
                for (let i=0; i<=len-2;i++){//计算圆度误差
                    let dr=e[i]+R-(r0+u1*Math.cos(Math.PI*2/len*i)+u2*Math.sin(Math.PI*2/len*i));
                    deltaR.push(dr);
                }
                let f= Math.max.apply(Math,deltaR)-Math.min.apply(Math,deltaR);
                document.getElementById("f").innerHTML=f.toFixed(2);
                this.draw(r0+R);
                console.log(r0)
            }
            this.area=function () {

            }
            this.outside=function () {

            }
            this.inside=function () {

            }


        }
    },
	RobotVI:class RobotVI extends TemplateVI {
        constructor(VICanvas, draw3DFlag) {
            super(VICanvas);
            const _this = this;
            this.name = 'RobotVI';

            let camera, scene, renderer,controls,
				base,link1,link2,link3,link4,link5,link6,
				diff=[0];

            this.jointsControl=function (ang) {
                let onPos1=false,onPos2=false,onPos3=false,onPos4=false,onPos5=false,onPos6=false

                 diff[1]=ang[1]-link1.rotation.y;
                 diff[2]=ang[2]-link2.rotation.z;
                 diff[3]=ang[3]-link3.rotation.z;
                 diff[4]=ang[4]-link4.rotation.x;
                 diff[5]=ang[5]-link5.rotation.z;
                 diff[6]=ang[6]-link6.rotation.x;
                let step=5/180*Math.PI;
                _this.timer = window.setInterval(function () {

                    if(diff[1]>0){if(link1.rotation.y<ang[1])link1.rotation.y+=step;/*else link1.rotation.y=ang[1];*/}
                    if(diff[2]>0){if(link2.rotation.z<ang[2])link2.rotation.z+=step;/*else link2.rotation.z=ang[2];*/}
                    if(diff[3]>0){if(link3.rotation.z<ang[3])link3.rotation.z+=step;/*else link3.rotation.z=ang[3];*/}
                    if(diff[4]>0){if(link4.rotation.x<ang[4])link4.rotation.x+=step;/*else link4.rotation.x=ang[4];*/}
                    if(diff[5]>0){if(link5.rotation.z<ang[5])link5.rotation.z+=step;/*else link5.rotation.z=ang[5];*/}
                    if(diff[6]>0){if(link6.rotation.x<ang[6])link6.rotation.x+=step;/*else link6.rotation.x=ang[6];*/}

                    if(diff[1]<0){if(link1.rotation.y>ang[1])link1.rotation.y-=step;/*else link1.rotation.y=ang[1];*/}
                    if(diff[2]<0){if(link2.rotation.z>ang[2])link2.rotation.z-=step;/*else link2.rotation.z=ang[2];*/}
                    if(diff[3]<0){if(link3.rotation.z>ang[3])link3.rotation.z-=step;/*else link3.rotation.z=ang[3];*/}
                    if(diff[4]<0){if(link4.rotation.x>ang[4])link4.rotation.x-=step;/*else link4.rotation.x=ang[4];*/}
                    if(diff[5]<0){if(link5.rotation.z>ang[5])link5.rotation.z-=step;/*else link5.rotation.z=ang[5];*/}
                    if(diff[6]<0){if(link6.rotation.x>ang[6])link6.rotation.x-=step;/*else link6.rotation.x=ang[6];*/}

                    if(Math.abs(ang[1]-link1.rotation.y)<step){link1.rotation.y=ang[1];onPos1=true;}
                    if(Math.abs(ang[2]-link2.rotation.z)<step){link2.rotation.z=ang[2];onPos2=true;}
                    if(Math.abs(ang[3]-link3.rotation.z)<step){link3.rotation.z=ang[3];onPos3=true;}
                    if(Math.abs(ang[4]-link4.rotation.x)<step){link4.rotation.x=ang[4];onPos4=true;}
                    if(Math.abs(ang[5]-link5.rotation.z)<step){link5.rotation.z=ang[5];onPos5=true;}
                    if(Math.abs(ang[6]-link6.rotation.x)<step){link6.rotation.x=ang[6];onPos6=true;}

                    if(onPos1&&onPos2&&onPos3&&onPos4&&onPos5&&onPos6){
                        window.clearInterval(_this.timer);
                        _this.timer=0;
					}
                    if (_this.dataLine) {
                        VILibrary.InnerObjects.dataUpdater(_this.dataLine);
                    }
                    /*if(rotator.rotation.y>=Math.PI*2){
                        window.clearInterval(_this.timer);
                        _this.timer = 0;
                        // dataOutput[20]=0;
                    }*/
                    //定时更新相同数据线VI的数据

                }, 50);
            }

            this.draw=function () {
                if (draw3DFlag) {

                    let loadingImg = document.createElement('img');
                    loadingImg.src = 'img/loading.gif';
                    loadingImg.style.width = '64px';
                    loadingImg.style.height = '64px';
                    loadingImg.style.position = 'absolute';
                    loadingImg.style.top = this.container.offsetTop + this.container.offsetHeight / 2 - 32 + 'px';
                    loadingImg.style.left = this.container.offsetLeft + this.container.offsetWidth / 2 - 32 + 'px';
                    loadingImg.style.zIndex = '10001';
                    this.container.parentNode.appendChild(loadingImg);

                    let promiseArr = [
                        VILibrary.InnerObjects.loadModule('assets/ABB/base.mtl', 'assets/ABB/base.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link1.mtl', 'assets/ABB/link1.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link2.mtl', 'assets/ABB/link2.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link3.mtl', 'assets/ABB/link3.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link4.mtl', 'assets/ABB/link4.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link5.mtl', 'assets/ABB/link5.obj'),
                        VILibrary.InnerObjects.loadModule('assets/ABB/link6.mtl', 'assets/ABB/link6.obj'),

                    ];
                    Promise.all(promiseArr).then(function (objArr) {
                        base = objArr[0];
                        link1 = objArr[1];
                        link2 = objArr[2];
                        link3 = objArr[3];
                        link4=objArr[4];
                        link5=objArr[5];
                        link6=objArr[6];
                        loadingImg.style.display = 'none';
                        RobotDraw();
                    }).catch(e => console.log('RobotVI: ' + e));
                }
                else {

                    this.ctx = this.container.getContext("2d");
                    let img = new Image();
                    img.src = 'img/Robot.png';
                    img.onload = function () {
                        _this.ctx.drawImage(img, 0, 0, _this.container.width, _this.container.height);
                    };
                }
            };
            this.draw();

            //相机、渲染、灯光、控制等初始设置
            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
                || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            function RobotDraw () {
                scene = new THREE.Scene();

                scene.add(base);
                base.add(link1);
                link1.add(link2);
                link2.add(link3);
                link3.add(link4);
                link4.add(link5);
                link5.add(link6);

                base.position.set(0,-500,0);
                link2.position.set(0,290,0);
                link3.position.set(0,270,0);
                link4.position.set(302,70,0);
                link5.position.set(0,0,0);
                link6.position.set(59,0,0);
                /*link3.position.set(0,560,0);
                link4.position.set(302,630,0);
                link5.position.set(302,630,0);
                link6.position.set(361,630,0);*/
                renderer = new THREE.WebGLRenderer({canvas: _this.container, antialias: true});
                renderer.setClearColor(0x6495ED);
                renderer.setSize(_this.container.clientWidth, _this.container.clientHeight);

                camera = new THREE.PerspectiveCamera(45, _this.container.clientWidth / _this.container.clientHeight, 1, 4000);
                camera.position.set(0,500,1000);
                camera.lookAt(new THREE.Vector3(0, 300, 0));

                let light = new THREE.AmbientLight(0x555555);
                scene.add(light);
                let light1 = new THREE.DirectionalLight(0xffffff, 1);
                light1.position.set(4000, 4000, 4000);
                scene.add(light1);
                let light2 = new THREE.DirectionalLight(0xffffff, 1);
                light2.position.set(-4000, 4000, -4000);
                scene.add(light2);

                controls = new THREE.OrbitControls(camera, renderer.domElement);//鼠标对整个三维模型（相机）的控制
                controls.rotateSpeed = 0.8;
                controls.enableZoom = true;
                controls.zoomSpeed = 1.2;
                controls.enableDamping = true;

                RobotAnimate();
            }
            function RobotAnimate() {
                window.requestAnimationFrame(RobotAnimate);//回调
                controls.update();
                renderer.render(scene, camera);
            }


        }
        static get cnName() {

            return '机器人控制';
        }

        static get defaultWidth() {

            return '550px';
        }

        static get defaultHeight() {

            return '300px';
        }
    },
    ToleranceVI:class ToleranceVI extends TemplateVI{
        constructor (VICanvas) {
            super(VICanvas);
            const _this = this;
            this.name = 'ToleranceVI';
            this.ctx = this.container.getContext("2d");


            this.ctx.font="20px Times new roman";
            this.ctx.textBaseline="middle";//文字居中定位
			this.ctx.lineWidth=1;

            let HEIGHT=this.container.height,
                WIDTH=this.container.width;
            let CENTER_X=WIDTH/2,
                CENTER_Y=HEIGHT/2;
			let holeOffset=0,
			    shaftOffset=0,
                holeTol,
				shaftTol,
                DELTAW=WIDTH/20,
				TIMES=parseInt(WIDTH/100),
				IT6=13,
				IT7=21,
				holeMark="",
				shaftMark="";
			let holeX, holeY, rectWidth=60,holeH,
                shaftX, shaftY,shaftH;

            let BGColor="rgba(240,240,255,0.6)",
                BLACK= "rgba(0,0,0,1)",
                RED="#ff6666",
				BLUE="#6699ff"

            this.draw=function () {
            	 holeTol=holeOffset>=0?IT7:-IT7;
                if(holeOffset==6) holeTol=-IT7;
            	 shaftTol=shaftOffset>0?IT6:-IT6;
            	 holeX=3*DELTAW;
            	 holeY=-holeOffset*TIMES;
            	 holeH=-holeTol*TIMES;
            	 shaftX=rectWidth+holeX+DELTAW;
            	 shaftY=-shaftOffset*TIMES;
            	 shaftH=-shaftTol*TIMES;

                this.ctx.textAlign = "center";//文本对齐
                this.ctx.clearRect(0,0,WIDTH,HEIGHT);//清空画布
                this.ctx.fillStyle=BGColor;
                this.ctx.strokeStyle=BLACK;
                this.ctx.fillRect(0,0,WIDTH,HEIGHT);//背景
                this.ctx.strokeRect(0,0,WIDTH,HEIGHT);
                this.ctx.beginPath();
                this.ctx.moveTo(DELTAW,CENTER_Y);//中心线
                this.ctx.lineTo(WIDTH-DELTAW,CENTER_Y);
                this.ctx.stroke();
                this.ctx.fillStyle=BLACK;
                this.ctx.fillText("0",DELTAW/2,CENTER_Y);
                this.ctx.fillText("+",DELTAW/2,CENTER_Y-20);
                this.ctx.fillText("-",DELTAW/2,CENTER_Y+20);
                this.ctx.font="15px Times new roman";
                this.ctx.textAlign = "left";//文本对齐
                this.ctx.fillText("轴公差带",DELTAW*17,HEIGHT-DELTAW*2.5);
                this.ctx.fillText("孔公差带",DELTAW*17,HEIGHT-DELTAW*4.5);
                this.ctx.fillStyle=BLUE;
                this.ctx.fillRect(DELTAW*15,HEIGHT-DELTAW*5,DELTAW*1.5,DELTAW);
                this.ctx.fillStyle=RED;
                this.ctx.fillRect(DELTAW*15,HEIGHT-DELTAW*3,DELTAW*1.5,DELTAW);
                this.ctx.closePath();
                this.ctx.font="20px Times new roman";
                this.ctx.textAlign = "center";//文本对齐


                this.arrow(DELTAW*2,HEIGHT-20,DELTAW*2,CENTER_Y,false,"φ20");//基准尺寸标注

                if(holeOffset||shaftOffset){
                    this.ctx.save();
                    this.ctx.translate(0,CENTER_Y);//坐标系移至Y中心
                    //前面计算的公差带是以向上为正，而canvas中以向下为正，故以下纵坐标均取负
                    this.ctx.fillStyle=BLUE;

                    this.ctx.fillRect(holeX,holeY,rectWidth,holeH) ;  //孔公差带
                    this.ctx.fillStyle=RED;
                    this.ctx.fillRect(shaftX,shaftY,rectWidth,shaftH) ;  //轴公差带
                    this.ctx.fillStyle=BLACK;
                    this.ctx.fillText(holeMark,holeX+rectWidth/2,holeY+holeH/2);
                    this.ctx.fillText(shaftMark,shaftX+rectWidth/2,shaftY+shaftH/2);
                    this.ctx.restore();
				}


            };

            this.setData = function (typ,offset){

                if (!typ) {//基孔制
					holeOffset=0;holeMark="H7"
					switch(offset){//g=7,k=2,s=35;
						case "g":shaftOffset=-7;shaftMark="g6";break;
						case "k":shaftOffset=2;shaftMark="k6";break;
						case "s":shaftOffset=35;shaftMark="s6";break;
						default:alert("offsetERR")
					}
                }
                else {//基轴制
                    shaftOffset=0;shaftMark="h6";
                    switch(offset){//g=7,k=2,s=35;
                        case "g":holeOffset=7;holeMark="G7";break;
                        case "k":holeOffset=6;holeMark="K7";break;//基本偏差代号为K,IT<=IT8,ES=-ei+△
                        case "s":holeOffset=-35;holeMark="S7";break;
                        default:alert("offsetERR")
                    }
                }
                this.draw();
            }
            this.arrow=function(x1,y1,x2,y2,doubleS,s) {//第一点，第二点，是否双向箭头，箭头文字
                this.ctx.lineWidth=1;
                this.ctx.fontsize=15;
                this.ctx.textAlign="center"
                let a=x2-x1,b=y2-y1,len=Math.sqrt(a*a+b*b),ang;
                if(a==0){if(b<0)ang=-Math.PI/2;else ang=Math.PI/2}
                ang=Math.atan(b/a);
                if(a<0){ang+=Math.PI;}


                this.ctx.save();
                this.ctx.translate(x1,y1);
                this.ctx.rotate(ang);
                this.ctx.beginPath();
                this.ctx.moveTo(0,0);//中心线
                if(doubleS){
                    this.ctx.lineTo(10,3);
                    this.ctx.lineTo(10,-3);
                    this.ctx.lineTo(0,0);
                }
                this.ctx.lineTo(len,0);  this.ctx.stroke();

                this.ctx. lineTo(len-10,-3);  this.ctx.stroke();
                this.ctx. lineTo(len-10,+3);  this.ctx.stroke();
                this.ctx. lineTo(len,0);  this.ctx.stroke();
                // this.ctx.moveTo(len/2,10);
                this.ctx.fillStyle=BGColor;
                this.ctx.clearRect((len/2-s.length*this.ctx.fontsize/4),(-10-this.ctx.fontsize/2),(s.length*this.ctx.fontsize/2),(this.ctx.fontsize));
                this.ctx.fillRect((len/2-s.length*this.ctx.fontsize/4),(-10-this.ctx.fontsize/2),(s.length*this.ctx.fontsize/2),(this.ctx.fontsize));
                this.ctx.fillStyle=BLACK;
                if(ang>=-Math.PI/2&&ang<=Math.PI/2)this.ctx.fillText(s,len/2,-10);
                else {
                    this.ctx.translate(len/2,0);
                    this.ctx.rotate(Math.PI);
                    this.ctx.fillText(s,0,10);
                }
                // this.ctx.stroke();
                this.ctx.fill();
                this.ctx.closePath();
                this.ctx.restore();
            }
            this.esei=function () {
            	this.ctx.fillStyle=BLACK;
                this.ctx.save();
                this.ctx.translate(0,CENTER_Y);
                this.ctx.textAlign = "left";//文本对齐
                this.ctx.textBaseline="middle";//文字居中定位
                if(holeOffset)this.ctx.fillText(offsetS(holeOffset),holeX+rectWidth+DELTAW/5,holeY-holeH*0.1);//孔上下偏差
                this.ctx.fillText(offsetS(holeOffset+holeTol),holeX+rectWidth+DELTAW/5,holeY+holeH*1.1);
                if(shaftOffset)this.ctx.fillText(offsetS(shaftOffset),shaftX+rectWidth+DELTAW/5,shaftY-shaftH*0.15);//轴上下偏差
                this.ctx.fillText(offsetS(shaftOffset+shaftTol),shaftX+rectWidth+DELTAW/5,shaftY+shaftH*1.15);
                this.ctx.restore();
            }
            function offsetS(n) {
                if(n>0) return "+"+n;
                else if(n<0)return n;
                else return "";
            }
            this.maxXY=function () {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.translate(0,CENTER_Y);
                // this.ctx.textAlign = "left";//文本对齐
				let ES=holeTol>0?(holeOffset+holeTol):holeOffset;
				let EI=holeTol<0?(holeOffset+holeTol):holeOffset;
				let es=shaftTol>0?(shaftOffset+shaftTol):shaftOffset;
                let ei=shaftTol<0?(shaftOffset+shaftTol):shaftOffset;
                let s1,s2,n1=EI-es,n2=ES-ei,
					arrow1Y1,arrow1Y2,arrow2Y1,arrow2Y2,
                    arrow1X=shaftX+rectWidth+DELTAW*2.5,
                    arrow2X=arrow1X+DELTAW*2.5;
                if(n1>0){
                	s1="Xmin= +"+n1;arrow1Y1=-es*TIMES;arrow1Y2 =-EI*TIMES;
                }
                else {
                	s1="Ymax= "+n1; arrow1Y2=-es*TIMES;arrow1Y1 =-EI*TIMES;
                }
                if(n2>0){
                	s2="Xmax= +"+n2;arrow2Y1=-ei*TIMES;arrow2Y2=-ES*TIMES;
                }
                else {
                	s2="Ymin= "+n2;arrow2Y2=-ei*TIMES;arrow2Y1=-ES*TIMES;
                }
                this.ctx.font="15px Times new roman";

                this.ctx.moveTo(holeX+rectWidth+DELTAW*0.3,-EI*TIMES);
                this.ctx.lineTo(arrow1X+DELTAW*0.5,-EI*TIMES);
                this.ctx.moveTo(shaftX+rectWidth+DELTAW*0.3,-es*TIMES);
                this.ctx.lineTo(arrow1X+DELTAW*0.5,-es*TIMES);
                this.ctx.moveTo(holeX+rectWidth+DELTAW*0.3,-ES*TIMES);
                this.ctx.lineTo(arrow2X+DELTAW*0.5,-ES*TIMES);
                this.ctx.moveTo(shaftX+rectWidth+DELTAW*0.3,-ei*TIMES);
                this.ctx.lineTo(arrow2X+DELTAW*0.5,-ei*TIMES);
                // this.ctx.fill();
                this.ctx.stroke();
                this.ctx.closePath();
                this.arrow(arrow1X,arrow1Y1,arrow1X,arrow1Y2,true,s1);
                this.arrow(arrow2X,arrow2Y1,arrow2X,arrow2Y2,true,s2);

                this.ctx.restore();
            }

//调用函数
            this.draw();
        }
    },
    StraightnessVI:class StraightnessVI extends TemplateVI{
        constructor (VICanvas) {
            super(VICanvas);
            const _this = this;
            this.name = 'StraightnessVI';
            this.ctx = this.container.getContext("2d");
            let eChartDiv = document.getElementById('eChart-div');

            let  methodSelected,error,
				myChart,option,markLineOpt;
            let data = [], sumData = [], dataSeries=[],sum = 0.0,dataArray = [];

            setEChartData();

            this.setData = function (typ){
                methodSelected=typ;
                dataArray = [];
                option.series.markLine = {
                    data: []
                };
                myChart.setOption(option);
				/*；最小二乘法*/
                if(methodSelected==3){
                    let a,b,sumXY=0,sumX=0,sumY=0,sumX2=0;
                    for(let i=0;i<=8;i++){
                        sumX+=i;
                        sumY+=sumData[i];
                        sumXY+=i*sumData[i];
                        sumX2+=i*i;
                    }
                    b=(sumXY-1/8*sumX*sumY)/(sumX2-1/8*sumX*sumX);
                    a=1/8*(sumY-b*sumX);
                    let coords1 = [{
                        coord: [0, a],
                        symbol: 'none'
                    }, {
                        coord: [8, a+8*b],
                        symbol: 'none'
                    }];
                    let y=[],errorArray=[];
                    for(let i=0;i<=7;i++){
                    	y[i]=a+b*i
                        errorArray[i]=y[i]-sumData[i];
                    }
                    let errorMax=Math.max.apply(Math, errorArray);
                    let errorMin=Math.min.apply(Math, errorArray);
                    error=errorMax-errorMin;
                    let maxIndex=errorArray.indexOf(errorMax);
                    let minIndex=errorArray.indexOf(errorMin);
                    document.getElementById('error').innerText =errorMax.toFixed(2)+"-("+errorMin.toFixed(2)+")= "+ error.toFixed(2);
                    let coords2 = [{
                        coord: [maxIndex, y[maxIndex]],
                        symbol: 'none'
                    }, {
                        coord: [maxIndex, sumData[maxIndex]],
                        symbol: 'none'
                    }];
                    let coords3 = [{
                        coord: [minIndex, y[minIndex]],
                        symbol: 'none'
                    }, {
                        coord: [minIndex, sumData[minIndex]],
                        symbol: 'none'
                    }];
                    markLineOpt.data = [coords1,coords2,coords3];
                    option.series.markLine = markLineOpt;
                    myChart.setOption(option);
				}
            }

            function setEChartData() {/*输入数据*/
                for (let i = 0; i < 9; i++) {
                    let temp = parseFloat(document.getElementById('data' + i).innerHTML);
                    if (isNaN(temp)) {
                        alert('读数未完成，请检查实验步骤是否正确');
                        return;
                    }
                    else {
                        data.push(temp);
						sum += parseFloat(data[i]);
						sumData.push(sum);
						document.getElementById('sumData' + i).innerText = sum.toFixed(1);
                        dataSeries.push([i,sum]);
                    }

                }
                /*Y轴范围*/
                let MAX = (sumData.slice(0).sort(function (a, b) {//按大小排序
                        return a - b;
                    })[8] / 10 ).toFixed(0) * 10+10;
                let MIN = (sumData.slice(0).sort(function (a, b) {
                        return a - b;
                    })[0] / 10 ).toFixed(0) * 10-10;


                option = {
                    title: {
                        text: '直线度误差相对累加折线',
                        x: 'center',
                        y: 0
                    },
                    tooltip: {
                        trigger: 'axis',
                        formatter: '{b}: {c}'
                    },
                    toolbox: {
                        feature: {
                            myTool1: {
                                show: true,
                                title: '重绘包容线',
                                icon: 'image://img/reset.png',
                                onclick: function () {
                                    dataArray = [];
                                    option.series.markLine = {
                                        data: []
                                    };
                                    myChart.setOption(option);
                                }
                            },
                            saveAsImage: {}
                        }
                    },
                    grid: {
                        show: true
                    },
                    xAxis: {
                        type: 'value',
						interval:1,
                        name: '序号',
                        // data: ['初始','第一次', '第二次', '第三次', '第四次', '第五次', '第六次', '第七次', '第八次', '']
                    },
                    yAxis: {
                        name: '读数',
                        min: MIN,
                        max: MAX
                    },
                    series: {
                        name: '误差折线图',
                        type: 'line'
                    }
                };


                //coords3为包容线距离
                let coords1, coords2, coords3, k;
                markLineOpt = {
                    label: {
                        normal: {
                            show: false
                        }
                    },
                    tooltip: {
                        show: false
                    },
                    silent: true
                };

                // option.series.data = sumData;
                option.series.data =dataSeries;

				myChart = echarts.init(eChartDiv);
                myChart.setOption(option);
                myChart.on('click', function (params) {

                    switch (methodSelected){
                        case 0:alert('请选择评估方法');return;
						/*最小区域法*/
                        case 1:{
                            if (dataArray.length > 6)   return;
                            dataArray.push(params.dataIndex);
                            dataArray.push(params.data[1]);
                            console.log(params.data[1],dataArray);
                            if (dataArray.length == 4) {/*两个点*/
                                if (Math.abs(dataArray[0] - dataArray[2]) == 1) {
                                    dataArray.pop();
                                    dataArray.pop();
                                    dataArray.pop();
                                    dataArray.pop();
                                    alert('选点错误！请重新选择');
                                    return;
                                }
                                k = (dataArray[3] - dataArray[1]) / (dataArray[2] - dataArray[0]);
                                let x0 = 0, x1 = 8, y0 = dataArray[1] - k * dataArray[0], y1 = dataArray[3] - k * (dataArray[2] - 8);
                                if (y0<MIN){y0=MIN;x0=dataArray[0]-(dataArray[1]-MIN)/k;}
                                if (y0>MAX){y0=MAX;x0=dataArray[0]-(dataArray[1]-MAX)/k;}
                                if (y1<MIN){y1=MIN;x1=dataArray[0]-(dataArray[1]-MIN)/k;}
                                if (y1>MAX){y1=MAX;x1=dataArray[0]-(dataArray[1]-MAX)/k;}
                                console.log(k + ', x0:' + x0 + ', x1:' + x1 + ', y0:' + y0 + ', y1:' + y1 + '\n');
                                coords1 = [{
                                    coord: [x0, y0],
                                    symbol: 'none'
                                }, {
                                    coord: [x1, y1],
                                    symbol: 'none'
                                }];
                                markLineOpt.data = [coords1];
                                option.series.markLine = markLineOpt;
                                myChart.setOption(option);/*第一条包容线*/
                            }
                            if (dataArray.length == 6) {
                                if ((dataArray[4] <= dataArray[2] && dataArray[4] <= dataArray[0]) || (dataArray[4] >= dataArray[2] && dataArray[4] >= dataArray[0])) {
                                    dataArray.pop();
                                    dataArray.pop();
                                    alert('选点错误！请重新选择');/*X不在前两点之间*/
                                    return;
                                }
                                let x3 = 0, x4 = 8, x5 = dataArray[4],
                                    y3 = dataArray[5] - k * dataArray[4],
                                    y4 = dataArray[5] - k * (dataArray[4] - 8),//只能减不能加，加的时候加数会缩小为0.001
                                    y5 = dataArray[3] - k * (dataArray[2] - dataArray[4]);
                                error = y5 - dataArray[5];
                                if (y3<MIN){y3=MIN;x3=dataArray[4]-(dataArray[5]-MIN)/k;}
                                if (y3>MAX){y3=MAX;x3=dataArray[4]-(dataArray[5]-MAX)/k;}
                                if (y4<MIN){y4=MIN;x4=dataArray[4]-(dataArray[5]-MIN)/k;}
                                if (y4>MAX){y4=MAX;x4=dataArray[4]-(dataArray[5]-MAX)/k;}
                                document.getElementById('error').innerText = error.toFixed(2);
//                console.log('x3:' + x3 + ', x4:' + x4 + ', y3:' + y3 + ', y4:' + y4 + ', error:' + error + '\n');
                                coords2 = [{
                                    coord: [x3, y3],
                                    symbol: 'none'
                                }, {
                                    coord: [x4, y4],
                                    symbol: 'none'
                                }];

                                coords3 = [{
                                    coord: [dataArray[4], dataArray[5]],
                                    symbol: 'none'
                                },
                                    {
                                        coord: [x5, y5],
                                        symbol: 'none'
                                    }];
                                markLineOpt.data = [coords1, coords2, coords3];
                                option.series.markLine = markLineOpt;
                                myChart.setOption(option);
                                let y=[],yy=[],product;
                                for(let i=0;i<=8;i++){
                                    y[i]=dataArray[1]-k*(dataArray[0]-i);//第一条包容线
                                    yy[i]=dataArray[5]-k*(dataArray[4]-i);//第二条包容线
                                    product=(y[i]-sumData[i])*(yy[i]-sumData[i]);
                                    if(product>0){
                                        alert('未包容所有数据点！请重绘包容线');
                                        document.getElementById('error').innerText = "ERROR";
                                        return;
                                    }
                                }
                            }
                            break;
                        }
						/*；两端点法*/
                        case 2:{
                            if (dataArray.length >=4)   return;
                            dataArray.push(params.dataIndex);
                            dataArray.push(params.data[1]);
                            console.log(dataArray);
                            if (dataArray.length ==2){
                                if(dataArray[0]!=0&&dataArray[0]!=8){
                                    dataArray.pop();
                                    dataArray.pop();
                                    alert('选点错误！请重新选择');
                                    return;
                                }
                            }
                            if (dataArray.length == 4) {//第二个点
                                if (Math.abs(dataArray[0]-dataArray[2])==8) {//首尾两点
                                    coords1 = [{
                                        coord: [dataArray[0], dataArray[1]],
                                        symbol: 'none'
                                    }, {
                                        coord: [dataArray[2],dataArray[3]],
                                        symbol: 'none'
                                    }];
									/*计算最大偏差并绘制偏差线*/
                                    k = (dataArray[3] - dataArray[1]) / (dataArray[2] - dataArray[0]);
                                    let y=[],errorArray=[];
                                    for(let i=0;i<=8;i++){
                                        y[i]=dataArray[1]-k*(dataArray[0]-i);//dataArray[]只能减不能加
                                        errorArray[i]=y[i]-sumData[i];
                                    }
                                    let errorMax=Math.max.apply(Math, errorArray);
                                    let errorMin=Math.min.apply(Math, errorArray);
                                    error=errorMax-errorMin;
                                    let maxIndex=errorArray.indexOf(errorMax);
                                    let minIndex=errorArray.indexOf(errorMin);
                                    document.getElementById('error').innerText =errorMax.toFixed(2)+"-("+errorMin.toFixed(2)+")= "+ error.toFixed(2);
                                    coords2 = [{
                                        coord: [maxIndex, y[maxIndex]],
                                        symbol: 'none'
                                    }, {
                                        coord: [maxIndex, sumData[maxIndex]],
                                        symbol: 'none'
                                    }];
                                    coords3 = [{
                                        coord: [minIndex, y[minIndex]],
                                        symbol: 'none'
                                    }, {
                                        coord: [minIndex, sumData[minIndex]],
                                        symbol: 'none'
                                    }];
                                    markLineOpt.data = [coords1, coords2, coords3];
                                    option.series.markLine = markLineOpt;
                                    myChart.setOption(option);


                                }
                                else {
                                    dataArray.pop();
                                    dataArray.pop();
                                    dataArray.pop();
                                    dataArray.pop();
                                    alert('选点错误！请重新选择');
                                    return;
                                }

                            }
                            break;
                        }
                        case 3:{

                        	break;
                        }
                        default:alert('评估方法错误');return;
                    }
                });
            }

        }
	},
    DimChainVI:class DimChainVI extends TemplateVI {
        constructor(VICanvas) {
            super(VICanvas);
            const _this = this;
            this.name = 'DimChainVI';


            this.ctx = this.container.getContext("2d");
            this.ctx.font = "20px Times new roman";
            this.ctx.textBaseline = "middle";//文字居中定位
            this.ctx.lineWidth = 1;

            let HEIGHT = this.container.height,
                WIDTH = this.container.width;
            let /*CENTER_X = WIDTH / 2,*/
                CENTER_Y = HEIGHT / 2;
            let deltaY=20,deltaX=20;
            let step=1;

            let BGColor="rgba(240,240,255,0.6)",
                BLACK= "rgba(0,0,0,1)",
                GREEN="green",
                RED="#ff6666";

            this.setData=function(i){
                step=i;
                _this.draw();
			}


            this.draw=function () {
                this.ctx.clearRect(0,0,WIDTH,HEIGHT);
                this.ctx.save();
                this.ctx.translate(0, CENTER_Y);

                this.ctx.beginPath();
                this.ctx.strokeStyle = BLACK;
                this.ctx.lineWidth = 2;
                this.ctx.moveTo(deltaX, -deltaY * 2);
                this.ctx.lineTo(deltaX, deltaY * 2);
                this.ctx.moveTo(deltaX * 3, -deltaY * 2);
                this.ctx.lineTo(deltaX * 3, 0);
                this.ctx.moveTo(deltaX * 4.5, -deltaY * 2);
                this.ctx.lineTo(deltaX * 4.5, 0);
                this.ctx.moveTo(deltaX * 12, -deltaY * 2);
                this.ctx.lineTo(deltaX * 12, 0);
                this.ctx.moveTo(deltaX * 16, -deltaY * 2);
                this.ctx.lineTo(deltaX * 16, deltaY * 2);
                this.ctx.stroke();
                this.ctx.lineWidth = 1;



            	switch (step){
					case 1:
						this.ctx.moveTo(deltaX,-deltaY);
                        this.ctx.lineTo(deltaX*16,-deltaY);
                        this.ctx.moveTo(deltaX,deltaY);
                        this.ctx.lineTo(deltaX*16,deltaY);
                        this.ctx.stroke();
                        break;
					case 2:
                        this.arrow(deltaX,-deltaY,deltaX*3,-deltaY,false,"");
                        this.arrow(deltaX*3,-deltaY,deltaX*4.5,-deltaY,false,"");
                        this.arrow(deltaX*4.5,-deltaY,deltaX*12,-deltaY,false,"");
                        this.arrow(deltaX*12,-deltaY,deltaX*16,-deltaY,false,"");
                        this.arrow(deltaX*16,deltaY,deltaX*1,deltaY,false,"");
                        /*this.arrow(0,0,deltaX*5,0,false,"0");
                        this.arrow(0,0,deltaX*5,deltaX*5,false,"1");
                        this.arrow(0,0,0,deltaX*5,false,"2");
                        this.arrow(0,0,-deltaX*5,deltaX*5,false,"3");
                        this.arrow(0,0,-deltaX*5,0,false,"4");
                        this.arrow(0,0,-deltaX*5,-deltaX*5,false,"5");
                        this.arrow(0,0,0,-deltaX*5,false,"6");
                        this.arrow(0,0,deltaX*5,-deltaX*5,false,"7");*/
                        break;
					case 3:
						this.ctx.lineWidth=3;
                        this.arrow(deltaX*3,-deltaY,deltaX*4.5,-deltaY,false,"A0");
                        this.ctx.lineWidth=1;
                        this.arrow(deltaX,-deltaY,deltaX*3,-deltaY,false,"A4");
                        this.ctx.clearRect(deltaX*4.5+1,-deltaY-2,10,4);
                        this.arrow(deltaX*4.5,-deltaY,deltaX*12,-deltaY,false,"A1");
                        this.arrow(deltaX*12,-deltaY,deltaX*16,-deltaY,false,"A2");
                        this.arrow(deltaX*16,deltaY,deltaX*1,deltaY,false,"A3");
                        break;
					case 4:
                        this.ctx.lineWidth=3;
                        this.arrow(deltaX*3,-deltaY,deltaX*4.5,-deltaY,false,"A0");
                        this.ctx.lineWidth=1;
                        this.ctx.strokeStyle=GREEN;
                        this.ctx.fillStyle=GREEN;
                        this.arrow(deltaX,-deltaY,deltaX*3,-deltaY,false,"A4");
                        this.ctx.clearRect(deltaX*4.5+1,-deltaY-2,10,4);
                        this.arrow(deltaX*4.5,-deltaY,deltaX*12,-deltaY,false,"A1");
                        this.arrow(deltaX*12,-deltaY,deltaX*16,-deltaY,false,"A2");
                        this.ctx.strokeStyle=RED;
                        this.ctx.fillStyle=RED;
                        this.arrow(deltaX*16,deltaY,deltaX*1,deltaY,false,"A3");
                        this.ctx.strokeStyle=BLACK;this.ctx.fillStyle=BLACK;

                        break;
					default:return;
				}

            	this.ctx.closePath();
                this.ctx.restore();
			}
            this.draw();
            this.arrow=function(x1,y1,x2,y2,doubleS,s) {//第一点，第二点，是否双向箭头，箭头文字

                this.ctx.fontsize=8;
                this.ctx.textAlign="center";
                let a=x2-x1,b=y2-y1,len=Math.sqrt(a*a+b*b),ang;
                if(a==0){if(b<0)ang=-Math.PI/2;else ang=Math.PI/2}
                ang=Math.atan(b/a);
                if(a<0){ang+=Math.PI;}

                this.ctx.save();
                this.ctx.translate(x1,y1);
                this.ctx.rotate(ang);
                this.ctx.beginPath();
                this.ctx.moveTo(0,0);//中心线
                if(doubleS){
                    this.ctx.lineTo(10,3);
                    this.ctx.lineTo(10,-3);
                    this.ctx.lineTo(0,0);
                }
                this.ctx.lineTo(len,0);  this.ctx.stroke();

                this.ctx. lineTo(len-10,-3);  this.ctx.stroke();
                this.ctx. lineTo(len-10,+3);  this.ctx.stroke();
                this.ctx. lineTo(len,0);  this.ctx.stroke();
                this.ctx.fill();
                this.ctx.fillStyle=BGColor;
                this.ctx.clearRect((len/2-s.length*this.ctx.fontsize/4),(-10-this.ctx.fontsize/2),(s.length*this.ctx.fontsize/2),(this.ctx.fontsize));
                this.ctx.fillRect((len/2-s.length*this.ctx.fontsize/4),(-10-this.ctx.fontsize/2),(s.length*this.ctx.fontsize/2),(this.ctx.fontsize));
                this.ctx.fillStyle=BLACK;
                this.ctx.lineWidth=1;
                if(ang>=-Math.PI/2&&ang<=Math.PI/2)this.ctx.fillText(s,len/2,-20);
                else {
                    this.ctx.translate(len/2,0);
                    this.ctx.rotate(Math.PI);
                    this.ctx.fillText(s,0,20);
				}
                this.ctx.closePath();
                this.ctx.restore();
            }
        }
    },
    RoundnessEvalVI:class RoundnessEvalVI extends TemplateVI {
        constructor (VICanvas) {
            super(VICanvas);

            const _this = this;
            this.name = 'NyquistVI';
            this.ctx = this.container.getContext("2d");

            this.angle=0;
            let HEIGHT=this.container.height,
                WIDTH=this.container.width;
            // shorter=Math.min(HEIGHT,WIDTH);

            let r=[0];

            let CENTER_X=WIDTH/2,
                CENTER_Y=HEIGHT/2,
                START_ANGLE = 0, // Starting point on circle
                END_ANGLE = Math.PI*2; // End point on circle

            let BGColor="rgba(200,200,200,0.6)",
                BLACK= "rgba(0,0,0,1)",
                GREEN ="rgba(10,200,10,1)",
                RED="rgba(200,10,10,1)";

            this.draw=function (inputR) {
                this.ctx.textAlign = "center";//文本对齐
                this.ctx.font="10px Times new roman";
                this.ctx.textBaseline="middle";//文字居中定位

                this.ctx.clearRect(0,0,WIDTH,HEIGHT);//清空画布

                this.ctx.fillStyle=BGColor;
                this.ctx.strokeStyle=BLACK;
                this.ctx.fillRect(0,0,WIDTH,HEIGHT);
                this.ctx.strokeRect(0,0,WIDTH,HEIGHT);

                if(r.length>1){
                    this.ctx.beginPath();
                    this.ctx.moveTo(10,CENTER_Y);
                    this.ctx.lineTo(WIDTH-10,CENTER_Y);
                    this.ctx.moveTo(CENTER_X,10);
                    this.ctx.lineTo(CENTER_X,HEIGHT-10);
                    this.ctx.strokeStyle=GREEN;
                    this.ctx.stroke();
                    this.ctx.closePath();


                    this.ctx.save();
                    this.ctx.translate(CENTER_X,CENTER_Y);//坐标系移至圆心
                    this.ctx.beginPath();
                    let len=r.length,
                        delta=Math.PI*2/40;
                    if(r.length>=40)r[40]=r[0];
                    this.ctx.moveTo(r[0],0);
                    for(let i=1;i<=len;i++)//画当前数组的Nyquist图
                    {
                        this.ctx.rotate(delta);
                        this.ctx.lineTo(r[i],0);this.ctx.stroke();
                    }
                    this.ctx.closePath();
                    this.ctx.restore();

                    this.ctx.beginPath();//图注
                    this.ctx.moveTo(0.6*WIDTH,HEIGHT-25);
                    this.ctx.lineTo(0.7*WIDTH,HEIGHT-25);
                    this.ctx.fillStyle=BLACK;
                    this.ctx.fillText("极坐标图",0.8*WIDTH,HEIGHT-25);
                    this.ctx.fillText("误差放大1000倍",0.8*WIDTH,20);

                    this.ctx.stroke();
                    this.ctx.closePath();
                }//有数据输入时

                if(inputR>0){
                    this.ctx.beginPath();
                    this.ctx.strokeStyle=RED;
                    this.ctx.arc(CENTER_X, CENTER_Y,inputR, START_ANGLE, END_ANGLE, false);
                    this.ctx.moveTo(0.6*WIDTH,HEIGHT-10);
                    this.ctx.lineTo(0.7*WIDTH,HEIGHT-10);
                    this.ctx.fillText("最小二乘图",0.83*WIDTH,HEIGHT-10);

                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            };

            this.setData = function (input){
                if (Number.isNaN(input)) {
                    console.log('NyquistVI: Input value error');
                    return;
                }
                r=input;
                console.log(r)
                this.draw();
            };
            let u1=0,u2=0,r0=0,R=70,len,deltaR=[0];
            this.square=function(){
            	len=r.length;
            	len--;
            	console.log(len);
                for (let i=0; i<=len-1;i++){
                    r0+=r[i]/len;
                    u1+=-2/len*r[i]*Math.cos(Math.PI*2/len*i);
                    u2+=-2/len*r[i]*Math.sin(Math.PI*2/len*i);
                }
                r0+=r0+R;
                document.getElementById("u1").innerHTML=u1.toFixed(2);
                document.getElementById("u2").innerHTML=u2.toFixed(2);
                document.getElementById("r").innerHTML=r0.toFixed(2);
                for (let i=0; i<=len-2;i++){//计算圆度误差
                    let dr=r[i]-(r0+u1*Math.cos(Math.PI*2/len*i)+u2*Math.sin(Math.PI*2/len*i));
                    deltaR.push(dr);
                }
                let f= Math.max.apply(Math,deltaR)-Math.min.apply(Math,deltaR);
                document.getElementById("f").innerHTML=f.toFixed(2);
                this.draw(r0);
                console.log(r0)
			}
//调用函数
            this.draw();
        }
    },


};
