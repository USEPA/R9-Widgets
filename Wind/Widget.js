import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
import RasterLayer from './plugins/RasterLayer';
import esriRequest from 'esri/request';
import Windy from './windy';
import dom from 'dojo/dom';
import query from 'dojo/query';
import registry from 'dijit/registry';
import html from 'dojo/_base/html';
import moment from 'esri/moment';
import PanelManager from 'jimu/PanelManager';
import domConstruct from "dojo/dom-construct";
import WidgetManager from 'jimu/WidgetManager';
import string from 'dojo/string';
import lang from 'dojo/_base/lang';
import on from 'dojo/on';
import domGeometry from 'dojo/dom-geometry';
import Move from 'dojo/dnd/move';
import utils from './utils';
import ModelMenu from './ModelMenu';
import hrrr_wind from 'dojo/text!./current_wind_hrrr.json';
import gfs_wind from 'dojo/text!./current_wind_gfs.json';
import nam_wind from 'dojo/text!./current_wind_nam.json';
import baseFx from 'dojo/_base/fx';

// To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

  // Custom widget code goes here

  baseClass: 'wind',
  data: null,
  // add additional properties here
  // methods to communication with app container:
  _forecast_datetime: '',
  _model: 'GFS',
  postCreate: function postCreate() {
    this.inherited(postCreate, arguments);
    console.log('Wind::postCreate');
    this.canvasSupport = this.supports_canvas();
    var vm = this;
    if (this.canvasSupport) {
      vm._getIconNode();
      vm.rasterLayer = new RasterLayer(null, {
        opacity: 0.9,
        id: 'Current Wind Forecast'
      });

      vm.layersRequest = esriRequest({
        url: 'https://r9.ercloud.org/r9wab/wind_data/current_wind.json',
        content: {},
        handleAs: "json"
      });
      // HRRR
      vm.layersRequest_hrrr = esriRequest({
        url: 'https://r9.ercloud.org/r9wab/wind_data/current_wind_hrrr.json',
        content: {},
        handleAs: "json"
      });
      vm.layersRequest_hrrr.then(
        function(response){
          vm.data_hrrr = response;
        }
      );
      //NAM
      vm.layersRequest_nam = esriRequest({
        url: 'https://r9.ercloud.org/r9wab/wind_data/current_wind_nam.json',
        content: {},
        handleAs: "json"
      });
      vm.layersRequest_nam.then(
        function(response){
          vm.data_nam = response;
        }
      );
      // GFS
      vm.layersRequest_gfs = esriRequest({
        url: 'https://r9.ercloud.org/r9wab/wind_data/current_wind_gfs.json',
        content: {},
        handleAs: "json"
      });
      vm.layersRequest_gfs.then(
        function(response){
          vm.data_gfs = response;
        }
      );
      //todo - testing... - remove
      vm.layersRequest.then(
        function (response) {
          vm._getLegend();
          // vm._setWindModel(vm._model); -----------------
          // vm.data = response;
          //
          // vm._forecast_datetime = moment(response[0].header.refTime)
          //   .add(response[0].header.forecastTime, 'hours').format('ll hA');
          // vm.windy = new Windy({canvas: vm.rasterLayer._element, data: response});
          // vm.redraw();
          vm._hideLoading();

        }, function (error) {
          console.log("Error: ", error.message);
        });
    } else {
      dom.byId("mapCanvas").innerHTML = "This browser doesn't support canvas. Visit <a target='_blank' href='http://www.caniuse.com/#search=canvas'>caniuse.com</a> for supported browsers";
    }

  },
  startup() {
    this.inherited(arguments);
    console.log('Wind::startup');

    //close btn
    this.own(on(this.closeBtn, 'click', lang.hitch(this, this._closeHandler)));
    //toggle mini-mode(desktop)
    this.own(on(this.domNode, 'mouseover', lang.hitch(this, function () {
      // if (!utils.isRunInMobile()) {
        this._clearMiniModeTimer();
      // }
    })));
  },
  onOpen() {
    var vm = this;
    console.log('Wind::onOpen');
    vm._showLoading();
    dojo.setStyle(this.buttonNode, 'border', 'solid 1px white');

    // this.map.addLayer(this.rasterLayer);
    // if (vm.layersRequest.isResolved()) {
    //   vm.windy = new Windy({canvas: vm.rasterLayer._element, data: vm.data});
    //   vm.redraw();
    //   vm._addToLegend();
    //
    //   vm._hideLoading();
    // }
    vm._setWindModel(vm._model);
    vm.showWindMenu();
    vm._hideLoading();
    vm.listeners = [
      vm.map.on("extent-change", function () {
        vm.redraw();
        vm._addToLegend();
      }),
      vm.map.on("resize", function () {
      }),
      vm.map.on("zoom-start", function () {
        vm.redraw();
        vm._addToLegend();
      }),
      vm.map.on("pan-start", function () {
        console.log('pan-start');
        vm.redraw();
      })
    ];

  },
  onClose() {
    console.log('Wind::onClose');
    this.listeners.forEach(function (listener) {
      listener.remove();
    });
    dojo.setStyle(this.buttonNode, 'border', '');
    this.map.removeLayer(this.rasterLayer);
  },
  // onMinimize(){
  //   console.log('Wind::onMinimize');
  // },
  // onMaximize(){
  //   console.log('Wind::onMaximize');
  // },
  // onSignIn(credential){
  //   console.log('Wind::onSignIn', credential);
  // },
  // onSignOut(){
  //   console.log('Wind::onSignOut');
  // }
  // onPositionChange(){
  //   console.log('Wind::onPositionChange');
  // },
  // resize(){
  //   console.log('Wind::resize');
  // }
  supports_canvas: function () {
    return !!document.createElement("canvas").getContext;
  },
  redraw: function () {
    console.log('redraw');
    var vm = this;
    if (this.state === 'opened' || this.state === 'active') {
      vm.rasterLayer._element.width = vm.map.width;
      vm.rasterLayer._element.height = vm.map.height;

      vm.windy.stop();

      var extent = vm.map.geographicExtent;
      setTimeout(function () {
        vm.windy.start(
          [[0, 0], [vm.map.width, vm.map.height]],
          vm.map.width,
          vm.map.height,
          [[extent.xmin, extent.ymin], [extent.xmax, extent.ymax]]
        );
      }, 500);
    }
  },
  _getIconNode() {
    this.buttonNode = query("div[data-widget-name='Wind']")[0];
    var parentWid = html.getAttr(this.buttonNode, 'widgetId');
    // var parentWid = html.getAttr(this.buttonNode, 'settingId');
    this.buttonWidg = registry.byId(parentWid);
    this.buttonWidg._showLoading = function () {
    };
    this.buttonWidg._hideLoading = function () {
    };
    // return widg;
  },
  _showLoading: function () {
    // var widg = this._getIconNode();
    // widg._showLoading();
    // widg.iconNode.setAttribute('src', require.toUrl('jimu') + '/images/loading_circle.gif')
    // domAttr.set(widg.iconNode, 'src', require.toUrl('jimu') + '/images/loading_circle.gif');

    html.setAttr(this.buttonWidg.iconNode, 'src', require.toUrl('jimu') + '/images/loading_circle.gif');
    // widg.onClick();
  },
  _hideLoading: function () {
    var vm = this;
    setTimeout(function () {
      html.setAttr(vm.buttonWidg.iconNode, 'src', vm.buttonWidg.widgetConfig.icon);
    }, 750);
  },
  _getLegend: function () {
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
  _addToLegend: function () {
    var vm = this;
    vm.legend_update_interval = setInterval(function () {
      //   var legendWidget = wm.getWidgetsByName('Legend');
      if (vm._legend.domNode.children.length === 2) {
        if ( vm._legend.domNode.innerHTML.indexOf('id="wind_widget_legend"') === -1) {
          vm.wind_legend = domConstruct.toDom('<div style="display: block;" class="esriLegendService" id="wind_widget_legend">' +
            '<table><tbody>' +
            '<tr><td align="left" colspan="2"><span class="esriLegendServiceLabel">Forecast Wind Speed for ' +
            vm._forecast_datetime +
            '</span></td></tr>' +
            vm._generateWindLegend() +
            '</tbody></table></div>');
          domConstruct.place(vm.wind_legend, vm._legend.domNode.children[1], 'first');
        }
        clearInterval(vm.legend_update_interval);
      }
    }, 200);
  },
  _generateWindLegend: function () {
    var vm = this;
    var legend_template = '<tr><td style="width: 15px;">' +
      '<div style="width: 15px; height: 15px; background-color: ${color};"></div></td><td>${speed}</td></tr>';
    var legend_html = '';
    var current_max = 0;
    vm.windy.colorStyles.forEach(function (color, i) {
      var previous_max = Math.round(current_max * 10) / 10;
      current_max = Math.round(vm.windy.colorStyles.maxSpeedForIndex(i) * 3.6 * 10)/10;
      var speed = previous_max !== current_max + 0.1 ? previous_max + ' - ' + current_max : current_max + '+ ';
      legend_html += string.substitute(legend_template, {color: color, speed: speed + ' km/hr'});
      current_max += 0.1;
    });
    return legend_html;
  },
  _initWindModelMenu: function () {
    const vm = this;
    console.log('_initWindModelMenu');
    if (!vm.modelMenu) {
      vm.modelMenuNode = html.create('div', { "class": "jimu-float-trailing" }, vm.modelContent);
      vm.modelMenu = new ModelMenu({nls:'test'}, vm.modelMenuNode);
      vm.modelMenuSelectedHanlder = this.own(on(this.modelMenu, 'selected', lang.hitch(this, function (modelStr) {
        console.log(modelStr + ' selected from Widget.js');
        vm._setWindModel(modelStr);
        // if (this.timeSlider && modelStr) {
        //   this._LAST_SPEED_RATE = modelStr;
        //   var rate = parseFloat(modelStr);
        //   this.timeSlider.setThumbMovingRate(2000 / rate);
        // }
      })));
      // this.modelMenuOpenHandler = this.own(on(this.modelMenu, 'open', lang.hitch(this, function () {
      // this._clearMiniModeTimer();
      // })));
      //
      // this.modelMenuCloseHanlder = this.own(on(this.speedMenu, 'close', lang.hitch(this, function () {
      //   this._setMiniModeTimer();
      // })));
      //
      // if (this._LAST_SPEED_RATE) {
      //   this.speedMenu.setSpeed(this._LAST_SPEED_RATE);//keep speed when auto refresh
      // }
    }
  },

  _setWindModel(windModelStr) {
    const vm = this;
    vm._showLoading();
    // if (vm._model === windModelStr) {
    //   console.log('no model change');
    //   return;
    // }
    vm._model = windModelStr;
    //  HRRR, NAM, GFS
    if (windModelStr === 'HRRR') {
      if (vm.layersRequest_hrrr.isResolved()) {
        vm.data = vm.data_hrrr;
      }
      //todo - remove hardcoded
      vm.data = JSON.parse(hrrr_wind);

    } else if (windModelStr === 'NAM') {
      if (vm.layersRequest_nam.isResolved()) {
        vm.data = vm.data_nam;
      }
      //todo - remove hard coded
      vm.data = JSON.parse(nam_wind);

    } else if (windModelStr === 'GFS') {
      //todo - gfs doesn't work....!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      if (vm.layersRequest_gfs.isResolved()) {
        vm.data = vm.data_gfs;
      }
      //todo - remove hardcoded
      vm.data = JSON.parse(gfs_wind);
    }
      //todo - update legend

    vm._forecast_datetime = moment(vm.data[0].header.refTime)
      .add(vm.data[0].header.forecastTime, 'hours').format('ll hA');
    console.log(vm._forecast_datetime);
    const modelType = vm._model === 'GFS'?'global':'conus';
    this.map.removeLayer(this.rasterLayer);
    vm.rasterLayer = new RasterLayer(null, {
      opacity: 0.9,
      id: 'Current Wind Forecast'
    });

    vm.map.addLayer(vm.rasterLayer);
    vm.windy = new Windy({canvas: vm.rasterLayer._element, data: vm.data, modType: modelType});
    vm.redraw();
    vm._hideLoading();
    // vm._addToLegend();

    vm.windExtentLabelNode.innerText = 'Forecast for '+vm._forecast_datetime;
  },

  _closeHandler: function(){
    WidgetManager.getInstance().closeWidget(this);
  },
    //miniModeTimer
  _clearMiniModeTimer: function () {
    html.removeClass(this.domNode, 'mini-mode');
    // this._adaptResponsive({ refreshMoveable:false });
    if (this._miniModeTimer) {
      clearTimeout(this._miniModeTimer);
    }
  },
  _setMiniModeTimer: function () {
    var time = utils.isRunInMobile() ? 5000 : 2000;
    this._miniModeTimer = setTimeout(lang.hitch(this, function () {
      // if (false === this.a11y_shownBy508) {
        html.addClass(this.domNode, 'mini-mode');
        // this._adaptResponsive();
      // }
    }), time);
  },

  //moveable
  makeMoveable: function (handleNode) {
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
  disableMoveable: function () {
    if (this.moveable) {
      this.dragHandler = null;
      this.moveable.destroy();
      this.moveable = null;
    }
  },
  onMoveStart: function (mover) {
    var containerBox = domGeometry.getMarginBox(this.map.root),
      domBox = domGeometry.getMarginBox(this.domNode);
    if (window.isRTL) {
      var rightPx = html.getStyle(mover.node, 'right');
      html.setStyle(mover.node, 'left', (containerBox.w - domBox.w - parseInt(rightPx, 10)) + 'px');
      html.setStyle(mover.node, 'right', '');
    }
    //move flag
    if (!this._draged) {
      this._draged = true;
    }
  },
  onMoving: function (/*mover*/) {
    //html.setStyle(mover.node, 'opacity', 0.9);
    this._moving = true;
  },
  onMoveStop: function (mover) {
    if (mover && mover.node) {
      html.setStyle(mover.node, 'opacity', 1);
      var panelBox = domGeometry.getMarginBox(mover.node);
      this.position.left = panelBox.l;
      this.position.top = panelBox.t;
      utils.getMarginPosition(this.map, this.domNode, this.position);

      // save move data
      setTimeout(lang.hitch(this, function () {
        this._moving = false;
      }), 10);
    }
  },
  _onHandleClick: function(evt) {
    evt.stopPropagation();
  },
  showWindMenu: function() {
    html.setStyle(this.noWindContentNode, 'display', 'none');

    // this.createTimeSlider().then(lang.hitch(this, function() {
    //   if("undefined" === typeof this.timeSlider){
    //     this._showNoTimeLayer();
    //     return;
    //   }
    //
    //   this.timeProcesser.setTimeSlider(this.timeSlider);
    //   this.layerProcesser.setTimeSlider(this.timeSlider);
    //   this._updateTimeSliderUI();

      // //restore playBtn state
      // if (this.playBtn && html.hasClass(this.playBtn, "pause")) {
      //   html.removeClass(this.playBtn, "pause");
      // }
      //styles
      html.setStyle(this.domNode, 'display', 'block');
      html.setStyle(this.windContentNode, 'display', 'block');
      html.addClass(this.domNode, 'show-time-slider');
      this._initWindModelMenu();

      baseFx.animateProperty({
        node: this.windContentNode,
        properties: {
          opacity: {
            start: 0,
            end: 1
          }
        },
        onEnd: lang.hitch(this, function() {
          this._showed = true;
          //auto play when open
          // if (false !== this.config.autoPlay &&
          //   false === html.hasClass(this.playBtn, "pause")) {
          //   on.emit(this.playBtn, 'click', { cancelable: false, bubbles: true });
          // }
          // this._adaptResponsive();
        }),
        duration: 500
      }).play();

    //   this.a11y_init();
    // }));
    this.dragHandler = this.labelContainer;
    this.makeMoveable(this.dragHandler);
  },
  // _destroyModelMenu: function () {
  //   if(this.modelMenu && this.modelMenu.destroy){
  //     this.modelMenu.destroy();
  //   }
  //   this.modelMenu = null;
  //   this.modelMenuSelectedHanlder = null;
  //   this.modelMenuOpenHanlder = null;
  //   this.modelMenuCloseHanlder = null;
  // }
});

