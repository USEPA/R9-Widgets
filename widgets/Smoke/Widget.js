///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2018 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define(['dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/html', 'dojo/_base/array', 'dojo/_base/fx', "jimu/WidgetManager", 'dojo/dnd/move', 'dojo/on', 'dojo/query', 'dojo/Deferred', 'dojo/dom-geometry', 'jimu/LayerInfos/LayerInfos', 'jimu/BaseWidget', 'esri/TimeExtent', 'esri/dijit/TimeSlider', './SpeedMenu', 'jimu/utils', './TimeProcesser', './utils', "dojo/throttle", 'esri/moment', 'dojo/request', 'esri/layers/MapImageLayer', 'esri/layers/MapImage', 'dojo/string', 'jimu/PanelManager', 'dojo/dom-construct', 'dijit/Dialog', 'dojo/text!./WindDialog.html'], function (declare, lang, html, array, baseFx, WidgetManager, Move, on, query, Deferred, domGeometry, LayerInfos, BaseWidget, TimeExtent, TimeSlider, SpeedMenu, jimuUtils, TimeProcesser, utils, throttle, moment, request, MapImageLayer, MapImage, string, PanelManager, domConstruct, Dialog, windDialogContent) {

  var clazz = declare([BaseWidget], {
    baseClass: 'smoke',
    clasName: 'smoke',
    speedMenu: null,
    _showed: false,
    _timeHandles: null,
    layerInfosObj: null,

    _layerInfosDef: null,
    _timeSliderPropsDef: null,

    _miniModeTimer: null,

    root_url: 'https://r9.ercloud.org/r9wab/smoke_data/${start_timestamp}/${image_timestamp}.png',
    images: {},
    _getImages: function _getImages(start_timestamp, image_timestamp) {
      var vm = this,
          deferred = new Deferred();
      if (image_timestamp === undefined) {
        image_timestamp = start_timestamp.clone();
        image_timestamp.add(1, 'hour');
        this.start = start_timestamp;
        request(string.substitute(vm.root_url, {
          start_timestamp: start_timestamp.utc().format('YYYYMMDDHH'),
          image_timestamp: image_timestamp.utc().format('YYYYMMDDHHmm')
        })).then(function (response) {
          vm._getImages(start_timestamp, image_timestamp);
          deferred.resolve();
        }).catch(function () {
          start_timestamp.subtract(12, 'hours');
          vm._getImages(start_timestamp).then(function () {
            deferred.resolve();
          });
        });
      } else {

        try {
          // request(string.substitute(vm.root_url, {
          //     image_timestamp: image_timestamp.format('YYYYMMDDHHmm')
          //   })).then(function (response) {
          //   console.log(response);
          //           {
          //  "center_latitude": 37.0,
          //  "center_longitude": -119.0,
          //  "width_longitude": 13.0,
          //  "height_latitude": 11.0
          // }

          var map_image = new MapImage({
            extent: {
              'xmin': -13803616.86,
              'xmax': -12690421.95,
              'ymax': 5160979.44,
              'ymin': 3829123.84,
              'spatialReference': { 'wkid': 3857 }
            },
            href: string.substitute(vm.root_url, {
              start_timestamp: start_timestamp.utc().format('YYYYMMDDHH'),
              image_timestamp: image_timestamp.utc().format('YYYYMMDDHHmm')
            })
          });
          vm.images[image_timestamp.format('YYYYMMDDHHmm')] = map_image;
          image_timestamp.add(1, 'hours');
          if (image_timestamp.diff(start_timestamp, 'hours') <= 69) {
            vm._getImages(start_timestamp, image_timestamp);
          }
          // });
        } catch (err) {
          image_timestamp.subtract(12, 'hours');
          vm._getImages(image_timestamp);
        }
      }
      return deferred;
    },
    postCreate: function postCreate() {
      // this.inherited(arguments);
      // this._timeHandles = [];
      //
      var vm = this;
      // this.layerProcesser = new LayerProcesser({map: this.map});
      this.timeProcesser = new TimeProcesser({ map: this.map, nls: this.nls, config: this.config });
      //
      // this._initLayerInfosObj().then(lang.hitch(this, function () {
      //   this.timeProcesser.setLayerInfosObj(this.layerInfosObj);
      // this.layerProcesser.setLayerInfosObj(this.layerInfosObj);
      // this.layerProcesser.processTimeDisableLayer();
      // }));
      this.inherited(postCreate, arguments);
      console.log('Smoke::postCreate');
      // build MapImageLayer from https://haze.airfire.org/bluesky-daily/output/standard/CANSAC-2km/ based on date
      this.start = -moment().startOf('day').diff(moment(), 'hours') > 12 ? moment.utc().set({
        hours: 12,
        minutes: '00'
      }) : moment.utc().set({ hours: '00', minutes: '00' });

      this._getImages(this.start.clone()).then(function () {
        vm.timeExtent = new TimeExtent(vm.start.clone().add(1, 'hour').toDate(), vm.start.clone().add(69, 'hour').toDate());
        if (!vm.timeSlider) {
          vm.showTimeSlider();
          vm._getLegend();
        }
      });
      this.mapImageLayer = new MapImageLayer({ id: 'Smoke!' });
      // this.images.forEach(function (image) {
      //   mapImageLayer.addImage(image);
      // });
    },

    startup: function startup() {
      this.inherited(startup, arguments);
      this.own(on(this.map, 'resize', lang.hitch(this, this._onMapResize)));
      //close btn
      this.own(on(this.closeBtn, 'click', lang.hitch(this, this._closeHanlder)));

      //dw start
      this.executiveSummaryDialog = new Dialog({
        title: "Wind Widget Information",
        content: windDialogContent,
        style: "width: 30%"
      });
      this.own(on(this.infoBtn, 'click', lang.hitch(this, this.openDialog)));

      html.removeClass(this.domNode, 'mini-mode');
      //dw end

      //toggle mini-mode(desktop)
      this.own(on(this.domNode, 'mouseover', lang.hitch(this, function () {
        if (!utils.isRunInMobile()) {
          this._clearMiniModeTimer();
        }
      })));
      this.own(on(this.domNode, 'mouseout', lang.hitch(this, function () {
        if (!utils.isRunInMobile()) {
          this._setMiniModeTimer();
        }
      })));
      //toggle mini-mode(mobile)
      this.own(on(this.domNode, 'click', lang.hitch(this, function () {
        if (utils.isRunInMobile()) {
          this._clearMiniModeTimer();
          this._setMiniModeTimer();

          var isInMiniMode = html.hasClass(this.domNode, 'mini-mode');
          if (isInMiniMode) {
            html.removeClass(this.domNode, 'mini-mode');
            this._adaptResponsive();
          }
        }
      })));
    },

    // overwrite for dijit in header-controller
    setPosition: function setPosition() /*position, containerNode*/{
      if (!this._isSetPosition) {
        var containerNode = this.map.id;
        var style = jimuUtils.getPositionStyle(this.position);
        html.place(this.domNode, containerNode);
        html.setStyle(this.domNode, style);

        this._isSetPosition = true;
      }
    },

    resize: function resize() {
      throttle(lang.hitch(this, this._onMapResize), 200);
    },

    onOpen: function onOpen() {
      if (this._isTestSizeFlag) {
        return;
      }
      if (this.images[this.start.clone().add(1, 'hour').format('YYYYMMDDHHmm')] !== undefined) {
        this.mapImageLayer.addImage(this.images[this.start.clone().add(1, 'hour').format('YYYYMMDDHHmm')]);
      }
      var node = query("div[data-widget-name='Smoke']")[0];
      dojo.setStyle(node, 'border', 'solid 1px white');

      this.map.addLayer(this.mapImageLayer);
      // this._initLayerInfosObj().then(lang.hitch(this, function () {
      //   if (!this.layerProcesser.hasVisibleTemporalLayer()) {
      //     this._showNoTimeLayer();
      //   } else {
      //     if (!this._showed) {
      if (this.timeExtent) {
        this.showTimeSlider();
        this._getLegend();
      } //   }
      // }
      var vm = this;

      this.listeners = [this.map.on("extent-change", function () {
        vm._addToLegend();
      }), this.map.on("zoom-start", function () {
        vm._addToLegend();
      })];

      //initPosition
      utils.initPosition(this.map, this.domNode, this.position);
      this._adaptResponsive();
      console.log('Smoke::onOpen');

      //this domNode will be deleted when TimeSlider destroy
      //         this.sliderNode = html.create('div', {}, this.sliderNodeContainer);

      // this.timeSlider.play();
      // }));
    },

    onClose: function onClose() {
      // this._initLayerInfosObj().then(lang.hitch(this, function () {
      //   if (!this.layerProcesser.hasVisibleTemporalLayer()) {
      //     html.setStyle(this.noTimeContentNode, 'display', 'none');
      //     this._showed = false;
      //
      //     if (this.map.removeTimeSlider) {
      //       this.map.removeTimeSlider();
      //     }
      //   } else {
      //     if (this._showed) {
      //       this.closeTimeSlider();
      //     }
      //   }
      // }));
      var node = query("div[data-widget-name='Smoke']")[0];
      dojo.setStyle(node, 'border', '');
      this.closeTimeSlider();
      this.mapImageLayer.removeAllImages();
      this.map.removeLayer(this.mapImageLayer);
      this.listeners ? this.listeners.forEach(function (listener) {
        listener.remove();
      }) : null;
    },
    //on close btn click
    _closeHanlder: function _closeHanlder() {
      WidgetManager.getInstance().closeWidget(this);
    },
    // _showNoTimeLayer: function () {
    //   html.setStyle(this.noTimeContentNode, 'display', 'block');
    //   html.setStyle(this.timeContentNode, 'display', 'none');
    //   this._showed = true;
    // },

    showTimeSlider: function showTimeSlider() {
      html.setStyle(this.noTimeContentNode, 'display', 'none');

      this.createTimeSlider();
      if ("undefined" === typeof this.timeSlider) {
        this._showNoTimeLayer();
        return;
      }

      // this.timeProcesser.setTimeSlider(this.timeSlider);
      // this.layerProcesser.setTimeSlider(this.timeSlider);
      this._updateTimeSliderUI();

      //restore playBtn state
      if (this.playBtn && html.hasClass(this.playBtn, "pause")) {
        html.removeClass(this.playBtn, "pause");
      }
      //styles
      html.setStyle(this.domNode, 'display', 'block');
      html.setStyle(this.timeContentNode, 'display', 'block');
      html.addClass(this.domNode, 'show-time-slider');
      this._initSpeedMenu();

      baseFx.animateProperty({
        node: this.timeContentNode,
        properties: {
          opacity: {
            start: 0,
            end: 1
          }
        },
        onEnd: lang.hitch(this, function () {
          this._showed = true;
          //auto play when open
          if (false !== this.config.autoPlay && false === html.hasClass(this.playBtn, "pause")) {
            on.emit(this.playBtn, 'click', { cancelable: false, bubbles: true });
          }
          this._adaptResponsive();
        }),
        duration: 500
      }).play();
      // }));
    },

    closeTimeSlider: function closeTimeSlider() {
      this._draged = false;
      this._isSetPosition = false;
      this._showed = false;

      html.setStyle(this.domNode, 'display', 'none');

      this.removeTimeSlider();
      this._destroySpeedMenu();

      baseFx.animateProperty({
        node: this.timeContentNode,
        properties: {
          opacity: {
            start: 1,
            end: 0
          }
        },
        onEnd: lang.hitch(this, this._onCloseTimeSliderEnd),
        duration: 500
      }).play();
    },

    _onCloseTimeSliderEnd: function _onCloseTimeSliderEnd() {
      if (this._destroyed) {
        return;
      }
      html.removeClass(this.domNode, 'show-time-slider');
      if (this.state === 'closed') {
        html.removeClass(this.domNode, 'mobile-time-slider');
        html.removeClass(this.timeContentNode, 'mobile');
      }
    },

    getTimeSliderProps: function getTimeSliderProps() {
      if (!this._timeSliderPropsDef) {

        this._timeSliderPropsDef = new Deferred();
        this.own(this._timeSliderPropsDef);
        //var itemInfo = map && map.itemInfo;
        this.timeProcesser.getTsPros().then(lang.hitch(this, function (tsProps) {
          /*if (null !== tsProps &&
            (this.timeProcesser.needUpdateFullTime() || true === tsProps._needToFindDefaultInterval)) {
            this.timeProcesser._getUpdatedFullTime().then(lang.hitch(this, function (fullTimeExtent) {
              var start = fullTimeExtent.startTime.getTime();
              var end = fullTimeExtent.endTime.getTime();
               //TODO reset timeExtent:consider liveData
              if (tsProps.startTime > end || tsProps.endTime < start) {
                tsProps.startTime = start;
                tsProps.endTime = end;
              } else {
                // if (tsProps.startTime < start) {
                //   tsProps.startTime = start;
                // }
                // if (tsProps.endTime > end) {
                //   tsProps.endTime = end;
                // }
              }
               if (true === tsProps._needToFindDefaultInterval) {
                tsProps.timeStopInterval = this.timeProcesser.findDefaultInterval(fullTimeExtent);
              }
               this._timeSliderPropsDef.resolve(tsProps);
            }));
          } else {
            this._timeSliderPropsDef.resolve(tsProps);
          }*/
          this.timeProcesser._getUpdatedFullTime().then(lang.hitch(this, function (fullTimeExtent) {
            this._timeSliderPropsDef.resolve({
              prop: tsProps,
              fulltime: fullTimeExtent
            });
          }));
        }));
      }

      return this._timeSliderPropsDef;
    },
    createTimeSlider: function createTimeSlider() {
      if (this.timeSlider) {
        return this.timeSlider;
      }

      //this domNode will be deleted when TimeSlider destroy
      this.sliderNode = html.create('div', {}, this.sliderNodeContainer);
      this.timeSlider = new TimeSlider({ style: "width: 100%" }, this.sliderNode);
      this.timeSlider.createTimeStopsByTimeInterval(this.timeExtent, 1, 'esriTimeUnitsHours');
      this.timeSlider.setLoop(true);
      this.timeSlider.setThumbMovingRate(500);
      var vm = this;
      this.timeSlider.on('time-extent-change', function (timeExtent) {
        vm.mapImageLayer.removeAllImages();
        vm.mapImageLayer.addImage(vm.images[moment.utc(timeExtent.endTime).format('YYYYMMDDHHmm')]);var label = moment(timeExtent.endTime).format('ll hA');
        vm.timeSliceLabelNode.innerHTML = label;
        html.setAttr(vm.timeSliceLabelNode, 'title', label);
      });

      this.timeSlider.startup();
      return this.timeSlider;
    },
    // createTimeSlider: function() {
    //   // return this.getTimeSliderProps().then(lang.hitch(this, function(data) {
    //     var props = data.prop,
    //     fullTimeExtent = data.fulltime;
    //
    //     // if (!props) {
    //     //   return;
    //     // }
    //     if (this.timeSlider) {
    //       return this.timeSlider;
    //     }
    //     //this domNode will be deleted when TimeSlider destroy
    //     this.sliderNode = html.create('div', {}, this.sliderNodeContainer);
    //
    //     this.timeSlider = new TimeSlider({}, this.sliderNode);
    //     this.map.setTimeSlider(this.timeSlider);
    //     //////////////////////
    //     /*
    //     var fromTime = new Date(props.startTime);
    //     var endTime = new Date(props.endTime);
    //     var timeExtent = new TimeExtent(fromTime, endTime);
    //     this.timeSlider.setThumbCount(props.thumbCount);
    //     if (props.numberOfStops) {
    //       this.timeSlider.createTimeStopsByCount(timeExtent, (props.numberOfStops + 1));
    //     } else {
    //       this.timeSlider.createTimeStopsByTimeInterval(
    //         timeExtent,
    //         props.timeStopInterval.interval,
    //         props.timeStopInterval.units
    //       );
    //     }
    //     this.timeSlider.setThumbMovingRate(props.thumbMovingRate);
    //
    //     if (this.timeSlider.timeStops.length > 25) {
    //       this.timeSlider.setTickCount(0);
    //     }
    //     // if (this.timeSlider.thumbCount === 2) {
    //     //   this.timeSlider.setThumbIndexes([0, 1]);
    //     // }
    //     //////////////////////
    //     //this.config.playback = true;
    //     var start, end;
    //     if (props.currentTimeExtent) {
    //       start = this.timeProcesser.findClosestThumbIndex(this.timeSlider, props.currentTimeExtent[0]);
    //       end = this.timeProcesser.findClosestThumbIndex(this.timeSlider, props.currentTimeExtent[1]);
    //     }
    //     if (start < end) {
    //       this.timeSlider.setThumbIndexes([start, end]);
    //     } else {
    //       this.timeSlider.setThumbIndexes([start, start + 1]);
    //     }
    //     //////////////////////
    //     */
    //
    //     if (props) {
    //       var timeExtent = null;
    //       if (props.startTime && props.endTime) {
    //         timeExtent = new TimeExtent(new Date(props.startTime), new Date(props.endTime));
    //       } else if (props.startTime) {
    //         timeExtent = new TimeExtent(new Date(props.startTime), fullTimeExtent.endTime);
    //       } else if (props.endTime) {
    //         timeExtent = new TimeExtent(fullTimeExtent.startTime, new Date(props.endTime));
    //       } else {
    //         timeExtent = new TimeExtent(fullTimeExtent.startTime, fullTimeExtent.endTime);
    //       }
    //       // bug in saved web map?
    //       if (timeExtent.startTime > timeExtent.endTime) {
    //         timeExtent = new TimeExtent(fullTimeExtent.startTime, fullTimeExtent.endTime);
    //       }
    //       this.timeSlider.setThumbCount(props.thumbCount);
    //       if (props.numberOfStops) {
    //         this.timeSlider.createTimeStopsByCount(timeExtent, (props.numberOfStops + 1));
    //       } else {
    //         this.timeSlider.createTimeStopsByTimeInterval(timeExtent,
    //           props.timeStopInterval.interval, props.timeStopInterval.units);
    //       }
    //       this.timeSlider.setThumbMovingRate(props.thumbMovingRate);
    //
    //       //palyback
    //       if (props.currentTimeExtent) {
    //         if (!props.currentTimeExtent[0]) {
    //           props.currentTimeExtent[0] = timeExtent.startTime.getTime();
    //         }
    //         if (!props.currentTimeExtent[1]) {
    //           props.currentTimeExtent[1] = timeExtent.endTime.getTime();
    //         }
    //         //var timeStops = this.timeSlider.timeStops;
    //         if (props.thumbCount === 1) {
    //           this.timeSlider.setThumbIndexes(
    //             [this.timeProcesser.findClosestThumbIndex(this.timeSlider, props.currentTimeExtent[1])]);
    //         } else {
    //           var start = this.timeProcesser.findClosestThumbIndex(this.timeSlider, props.currentTimeExtent[0]);
    //           if (props.currentTimeExtent[0] === props.currentTimeExtent[1]) {
    //             this.timeSlider.setThumbIndexes([start, start]);
    //           } else {
    //             var end = this.timeProcesser.findClosestThumbIndex(this.timeSlider, props.currentTimeExtent[1]);
    //             if (start < end) {
    //               this.timeSlider.setThumbIndexes([start, end]);
    //             } else {
    //               this.timeSlider.setThumbIndexes([start, start + 1]);
    //             }
    //           }
    //         }
    //       } else {
    //         if (props.thumbCount === 2) {
    //           this.timeSlider.setThumbIndexes([0, 1]);//default start
    //         }
    //       }
    //
    //       //layers
    //       //this.layerProcesser.processerDisableLayers(props);
    //     } else {
    //       // no-props: default settings
    //       props = {};
    //       props.thumbCount = 2;
    //       this.timeSlider.setThumbCount(props.thumbCount);
    //       this.timeSlider.setThumbIndexes([0, 1]);
    //
    //       this.timeSlider.setThumbMovingRate(2000);
    //       //this.findDefaultInterval();
    //       props.timeStopInterval = this.timeProcesser.findDefaultInterval(fullTimeExtent);
    //       this.timeSlider.createTimeStopsByTimeInterval(fullTimeExtent,
    //         props.timeStopInterval.interval, props.timeStopInterval.units);
    //     }
    //
    //     if (this.timeSlider.timeStops.length > 25) {
    //       this.timeSlider.setTickCount(0);
    //     }
    //
    //     this.timeSlider.setLoop(true);
    //     this.timeSlider.startup();
    //
    //     this._timeHandles.push(on(
    //       this.timeSlider,
    //       'time-extent-change',
    //       lang.hitch(this, this.updateTimeExtentLabel)
    //     ));
    //
    //     return this.timeSlider;
    //   // }));

    // },

    _updateTimeSliderUI: function _updateTimeSliderUI() {
      // this.updateLayerLabel();
      // html.setStyle(this.layerLabelsNode, 'display', 'none');
      this.updateTimeExtentLabel();
      this._updateBtnsUI();
    },
    _updateBtnsUI: function _updateBtnsUI() {
      //find and hide raw btns
      var btns = query(".esriTimeSlider > table > tbody > tr > td > span > span", this.esriTimeSlider);
      if (btns && 3 === btns.length) {
        this._rawPlayBtn = btns[0];
        this._rawPreviousBtn = btns[1];
        this._rawNextBtn = btns[2];
      }
      var tds = query(".esriTimeSlider > table > tbody > tr > td", this.esriTimeSlider);
      if (tds && 4 === tds.length) {
        html.addClass(tds[0], "hide"); //_rawPlayBtn
        html.addClass(tds[2], "hide"); //_rawPreviousBtn
        html.addClass(tds[3], "hide"); //_rawNextBtn
      }

      //trigger events
      if (!this._previousBtnHandler) {
        this._previousBtnHandler = this.own(on(this.previousBtn, 'click', lang.hitch(this, function () {
          on.emit(this._rawPreviousBtn, 'click', { cancelable: false, bubbles: true });
        })));
      }
      if (!this._playBtnHandler) {
        this._playBtnHandler = this.own(on(this.playBtn, 'click', lang.hitch(this, function (evt) {
          on.emit(this._rawPlayBtn, 'click', { cancelable: false, bubbles: true });
          //toggle pause class
          if (html.hasClass(this.playBtn, "pause")) {
            html.removeClass(this.playBtn, "pause");
          } else {
            html.addClass(this.playBtn, "pause");
            if (utils.isRunInMobile()) {
              //DW
              //html.addClass(this.domNode, 'mini-mode');
              this._adaptResponsive();
            }
          }

          evt.stopPropagation();
          evt.preventDefault();
        })));
      }
      if (!this._nextBtnHandler) {
        this._nextBtnHandler = this.own(on(this.nextBtn, 'click', lang.hitch(this, function () {
          on.emit(this._rawNextBtn, 'click', { cancelable: false, bubbles: true });
        })));
      }
      //replace play btns, under RTL
      if (window.isRTL) {
        html.place(this.previousBtn, this.playBtn, "after");
        html.place(this.nextBtn, this.playBtn, "before");
      }
    },

    removeTimeSlider: function removeTimeSlider() {
      array.forEach(this._timeHandles, function (handle) {
        if (handle && handle.remove) {
          handle.remove();
        }
      });
      if (this.timeSlider && !this.timeSlider._destroyed) {
        this.timeSlider.destroy();
        this.timeSlider = null;
      }

      if (this.map) {
        this.map.setTimeExtent();
      }
    },
    //
    // // updateLayerLabel: function () {
    // //   if (this.config.showLabels) {
    // //     html.setStyle(this.layerLabelsNode, 'display', 'block');
    // //     var label = this.nls.layers;
    // //     // var names = this.layerProcesser._getVisibleTemporalLayerNames();
    // //     // label = label + names.join(',');
    // //     this.layerLabelsNode.innerHTML = label;
    // //     html.setAttr(this.layerLabelsNode, 'title', label);
    // //   } else {
    // //     html.setStyle(this.layerLabelsNode, 'display', 'none');
    // //   }
    // // },
    //
    // updateTimeExtentLabel: function () {
    //   var label = this.timeProcesser._getTimeFormatLabel(this.timeExtent);
    //   //console.log("===>"+label);
    //   this.timeExtentLabelNode.innerHTML = label;
    //   html.setAttr(this.timeExtentLabelNode, 'title', label);
    // },
    //
    // _adaptResponsive: function (optison) {
    //   if (!this._showed) {
    //     return;
    //   }
    //
    //   setTimeout(lang.hitch(this, function () {
    //     if (utils.isRunInMobile()) {
    //       this.disableMoveable();
    //       html.addClass(this.timeContentNode, 'mobile');
    //       html.addClass(this.domNode, 'mobile');
    //     } else {
    //       //DO NOT makeMoveable, when _clearMiniModeTimer
    //       if (!(optison && "undefined" !== typeof optison.refreshMoveable && false === optison.refreshMoveable)) {
    //         if ("none" !== html.getStyle(this.noTimeContentNode, "display")) {
    //           this.dragHandler = this.noTimeContentNode;
    //         } else {
    //           this.dragHandler = this.labelContainer;
    //         }
    //
    //         this.makeMoveable(this.dragHandler);
    //       }
    //
    //       html.removeClass(this.timeContentNode, 'mobile');
    //       html.removeClass(this.domNode, 'mobile');
    //     }
    //     this._setPopupPosition(utils.isRunInMobile());
    //   }), 10);
    // },
    //
    // _setPopupPosition: function (isRunInMobile) {
    //   if (!isRunInMobile) {
    //     //height
    //     if (this.config.showLabels) {
    //       html.setStyle(this.domNode, 'height', '92px');
    //     } else {
    //       html.setStyle(this.domNode, 'height', '72px');
    //     }
    //
    //     //do not initPosition it, if moveed by drag
    //     if (!this._draged) {
    //       utils.initPosition(this.map, this.domNode, this.position);
    //     }
    //
    //     if (!this._moving && this.position &&
    //       this.position.left && this.position.top) {
    //       html.setStyle(this.domNode, 'top', this.position.top + 'px');
    //       html.setStyle(this.domNode, 'left', this.position.left + 'px');
    //     }
    //   } else {
    //     //height
    //     if (this.config.showLabels) {
    //       html.setStyle(this.domNode, 'height', '128px');
    //     } else {
    //       html.setStyle(this.domNode, 'height', '108px');
    //     }
    //   }
    //
    //   this._setUI(isRunInMobile);
    // },

    updateTimeExtentLabel: function updateTimeExtentLabel() {
      var label = this.timeProcesser._getTimeFormatLabel(this.timeExtent);
      //console.log("===>"+label);
      this.timeExtentLabelNode.innerHTML = label;
      html.setAttr(this.timeExtentLabelNode, 'title', label);
    },

    _adaptResponsive: function _adaptResponsive(optison) {
      if (!this._showed) {
        return;
      }

      setTimeout(lang.hitch(this, function () {
        if (utils.isRunInMobile()) {
          this.disableMoveable();
          html.addClass(this.timeContentNode, 'mobile');
          html.addClass(this.domNode, 'mobile');
        } else {
          //DO NOT makeMoveable, when _clearMiniModeTimer
          if (!(optison && "undefined" !== typeof optison.refreshMoveable && false === optison.refreshMoveable)) {
            if ("none" !== html.getStyle(this.noTimeContentNode, "display")) {
              this.dragHandler = this.noTimeContentNode;
            } else {
              this.dragHandler = this.labelContainer;
            }

            this.makeMoveable(this.dragHandler);
          }

          html.removeClass(this.timeContentNode, 'mobile');
          html.removeClass(this.domNode, 'mobile');
        }
        this._setPopupPosition(utils.isRunInMobile());
      }), 10);
    },

    _setPopupPosition: function _setPopupPosition(isRunInMobile) {
      if (!isRunInMobile) {
        //height
        if (this.config.showLabels) {
          html.setStyle(this.domNode, 'height', '92px');
        } else {
          html.setStyle(this.domNode, 'height', '72px');
        }

        //do not initPosition it, if moveed by drag
        if (!this._draged) {
          utils.initPosition(this.map, this.domNode, this.position);
        }

        if (!this._moving && this.position && this.position.left && this.position.top) {
          html.setStyle(this.domNode, 'top', this.position.top + 'px');
          html.setStyle(this.domNode, 'left', this.position.left + 'px');
        }
      } else {
        //height
        if (this.config.showLabels) {
          html.setStyle(this.domNode, 'height', '128px');
        } else {
          html.setStyle(this.domNode, 'height', '108px');
        }
      }

      this._setUI(isRunInMobile);
    },
    _setUI: function _setUI(isRunInMobile) {
      var btnsContainer = html.getContentBox(this.btnsContainer);

      if (isRunInMobile) {
        var screenWidth = window.innerWidth;
        var middleOfScreenWidth = screenWidth / 2;
        var left = middleOfScreenWidth - btnsContainer.w / 2;

        if (window.isRTL) {
          html.setStyle(this.btnsContainer, 'margin-right', left + 'px');
        } else {
          html.setStyle(this.btnsContainer, 'margin-left', left + 'px');
        }

        if (this.config.showLabels && !html.hasClass(this.domNode, 'mini-mode')) {
          html.setStyle(this.sliderContent, 'bottom', '-12px');
        } else if (this.config.showLabels && html.hasClass(this.domNode, 'mini-mode')) {
          html.setStyle(this.sliderContent, 'bottom', '20px');
        }
      } else {
        html.setStyle(this.btnsContainer, 'margin-left', 'auto');
        html.setStyle(this.btnsContainer, 'margin-right', 'auto');

        if (this.config.showLabels && !html.hasClass(this.domNode, 'mini-mode')) {
          //showLabels && no 'mini-mode'
          html.setStyle(this.sliderContent, 'bottom', '-20px');
        } else if (this.config.showLabels && html.hasClass(this.domNode, 'mini-mode')) {
          //showLabels && 'mini-mode'
          html.setStyle(this.sliderContent, 'bottom', '20px');
        } else {
          //no showLabels
          html.setStyle(this.sliderContent, 'bottom', '0px');
        }
      }
    },

    _onMapResize: function _onMapResize() {
      if (this.state === 'closed') {
        return;
      }

      //initPosition when widget OutofScreen
      if (utils.isOutOfScreen(this.map, this.position) && !utils.isRunInMobile()) {
        utils.initPosition(this.map, this.domNode, this.position);
      }

      this._adaptResponsive();
    },

    destroy: function destroy() {
      if (this.map) {
        this.map.setTimeExtent(null);
      }
      this.inherited(destroy, arguments);
    },

    // LayerInfosObj
    // _initLayerInfosObj: function () {
    //   if (!this._layerInfosDef) {
    //     this._layerInfosDef = new Deferred();
    //     this.own(this._layerInfosDef);
    //
    //     LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this, function (layerInfosObj) {
    //       // if (this.domNode) {
    //       //   }
    //       this.layerInfosObj = layerInfosObj;
    //       // should check whether is timeInfo layer.
    //       this.own(on(
    //         layerInfosObj,
    //         'layerInfosIsShowInMapChanged',
    //         lang.hitch(this, this.layerProcesser._onLayerInfosIsShowInMapChanged)));
    //       this.own(layerInfosObj.on(
    //         'layerInfosChanged',
    //         lang.hitch(this, this.layerProcesser._onLayerInfosChanged)));
    //
    // //miniModeTimer
    // _clearMiniModeTimer: function () {
    //   html.removeClass(this.domNode, 'mini-mode');
    //   this._adaptResponsive({refreshMoveable: false});
    //   if (this._miniModeTimer) {
    //     clearTimeout(this._miniModeTimer);
    //   }
    // },

    //miniModeTimer
    _clearMiniModeTimer: function _clearMiniModeTimer() {
      html.removeClass(this.domNode, 'mini-mode');
      this._adaptResponsive({ refreshMoveable: false });
      if (this._miniModeTimer) {
        clearTimeout(this._miniModeTimer);
      }
    },
    _setMiniModeTimer: function _setMiniModeTimer() {
      var time = utils.isRunInMobile() ? 5000 : 2000;
      this._miniModeTimer = setTimeout(lang.hitch(this, function () {
        //DW
        //html.addClass(this.domNode, 'mini-mode');
        this._adaptResponsive();
      }), time);
    },

    //moveable
    makeMoveable: function makeMoveable(handleNode) {
      this.disableMoveable();
      var containerBox = domGeometry.getMarginBox(this.map.root);
      //containerBox.l = containerBox.l - width + tolerance;
      //containerBox.w = containerBox.w + 2 * (width - tolerance);
      this.moveable = new Move.boxConstrainedMoveable(this.domNode, {
        box: containerBox,
        handle: handleNode || this.handleNode,
        within: true
      });
      this.own(on(this.moveable, 'MoveStart', lang.hitch(this, this.onMoveStart)));
      this.own(on(this.moveable, 'Moving', lang.hitch(this, this.onMoving)));
      this.own(on(this.moveable, 'MoveStop', lang.hitch(this, this.onMoveStop)));
    },
    disableMoveable: function disableMoveable() {
      if (this.moveable) {
        this.dragHandler = null;
        this.moveable.destroy();
        this.moveable = null;
      }
    },
    onMoveStart: function onMoveStart(mover) {
      var containerBox = domGeometry.getMarginBox(this.map.root),
          domBox = domGeometry.getMarginBox(this.domNode);
      if (window.isRTL) {
        var rightPx = html.getStyle(mover.node, 'right');
        html.setStyle(mover.node, 'left', containerBox.w - domBox.w - parseInt(rightPx, 10) + 'px');
        html.setStyle(mover.node, 'right', '');
      }
      //move flag
      if (!this._draged) {
        this._draged = true;
      }
    },
    onMoving: function onMoving() /*mover*/{
      //html.setStyle(mover.node, 'opacity', 0.9);
      this._moving = true;
    },
    onMoveStop: function onMoveStop(mover) {
      if (mover && mover.node) {
        html.setStyle(mover.node, 'opacity', 1);
        var panelBox = domGeometry.getMarginBox(mover.node);
        this.position.left = panelBox.l;
        this.position.top = panelBox.t;
        setTimeout(lang.hitch(this, function () {
          this._moving = false;
        }), 500);
      }
    },
    _onHandleClick: function _onHandleClick(evt) {
      evt.stopPropagation();
    },

    //speed meun
    _initSpeedMenu: function _initSpeedMenu() {
      if (!this.speedMenu) {
        this.speedMenuNode = html.create('div', { "class": "jimu-float-trailing" }, this.sliderContent);

        this.speedMenu = new SpeedMenu({ nls: this.nls }, this.speedMenuNode);
        this.speedMenuSelectedHanlder = this.own(on(this.speedMenu, 'selected', lang.hitch(this, function (rateStr) {
          if (this.timeSlider && this.timeSlider.thumbMovingRate && rateStr) {
            var rate = parseFloat(rateStr);
            this.timeSlider.setThumbMovingRate(this.timeSlider.thumbMovingRate / rate);
          }
        })));

        this.speedMenuOpenHanlder = this.own(on(this.speedMenu, 'open', lang.hitch(this, function () {
          this._clearMiniModeTimer();
        })));

        this.speedMenuCloseHanlder = this.own(on(this.speedMenu, 'close', lang.hitch(this, function () {
          this._setMiniModeTimer();
        })));
      }
    },
    _destroySpeedMenu: function _destroySpeedMenu() {
      if (this.speedMenu && this.speedMenu.destroy) {
        this.speedMenu.destroy();
      }
      this.speedMenu = null;
      this.speedMenuSelectedHanlder = null;
      this.speedMenuOpenHanlder = null;
      this.speedMenuCloseHanlder = null;
    },
    _getLegend: function _getLegend() {
      var vm = this;
      var pm = PanelManager.getInstance();
      var wm = WidgetManager.getInstance();
      var legend = pm.widgetManager.appConfig.widgetPool.widgets.filter(function (item) {
        return item.name === "Legend";
      })[0];
      // pm.destroyAllPanels();
      pm.showPanel(legend);
      return wm.loadWidget(legend).then(function (legendWidget) {
        vm._legend = legendWidget;
        vm._addToLegend();
      });
    },
    _addToLegend: function _addToLegend() {
      var vm = this;
      vm.legend_update_interval = setInterval(function () {
        //   var legendWidget = wm.getWidgetsByName('Legend');
        if (vm._legend.domNode.children.length === 2) {
          if (vm._legend.domNode.innerHTML.indexOf('id="smoke_widget_legend"') === -1) {
            vm.wind_legend = domConstruct.toDom('<div style="display: block;" class="esriLegendService" id="smoke_widget_legend">' + '<table><tbody>' + '<tr><td align="left" colspan="2"><span class="esriLegendServiceLabel">Smoke Predictions*<br/>' + vm.start.clone().add(1, 'hour').format('ll hA') + ' to ' + vm.start.clone().add(69, 'hour').format('ll hA') + '</span></td></tr>' + '<tr><td colspan="2"><img style="max-width: 100%" src="https://r9.ercloud.org/r9wab/smoke_data/' + vm.start.format('YYYYMMDDHH') + '/legend.png"/>' + '<tr><td colspan="2">*Experimental Research Output provided by USFS R&D. Use at your own Risk. <a target="_blank" href="https://info.airfire.org/daily-run-viewer">More Info</a> ' + '</td></tr>' + '<tr><td colspan="2">*USFS <a target="_blank" href="https://tools.airfire.org/websky/v1#status">BlueSky Daily Runs.</a></td></tr>' + '</tbody></table></div>');
            domConstruct.place(vm.wind_legend, vm._legend.domNode.children[1], 'first');
          }
          clearInterval(vm.legend_update_interval);
        }
      }, 200);
    },
    //dw start
    openDialog: function openDialog() {
      this.executiveSummaryDialog.show();
    }
    //dw end
  });
  return clazz;
});
