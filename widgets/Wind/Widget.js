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
// import hrrr_wind from 'dojo/text!./current_wind_hrrr.json';
// import gfs_wind from 'dojo/text!./current_wind_gfs.json';
// import nam_wind from 'dojo/text!./current_wind_nam.json';
import baseFx from 'dojo/_base/fx';
import Dialog from 'dijit/Dialog';
import windDialogContent from 'dojo/text!./WindDialog.html';


export default declare([BaseWidget], {
  baseClass: 'wind',
  data: null,
  _forecast_datetime: '',
  _model: 'HRRR',
  postCreate: function postCreate() {
    this.inherited(postCreate, arguments);
    this.canvasSupport = this.supports_canvas();
    const vm = this;
    if (this.canvasSupport) {
      vm._getIconNode();
      vm.rasterLayer = new RasterLayer(null, {
        opacity: 0.9,
        id: 'Current Wind Forecast'
      });
      // HRRR
      vm.layersRequest_hrrr = esriRequest({
        url: '/apps/wind_data/current_wind_hrrr.json',
        content: {},
        handleAs: "json"
      });
      // NAM
      vm.layersRequest_nam = esriRequest({
        url: '/apps/wind_data/current_wind_nam.json',
        content: {},
        handleAs: "json"
      });
      // GFS
      vm.layersRequest_gfs = esriRequest({
        url: '/apps/wind_data/current_wind_gfs.json',
        content: {},
        handleAs: "json"
      });

    } else {
      dom.byId("mapCanvas").innerHTML = "This browser doesn't support canvas. Visit <a target='_blank' href='http://www.caniuse.com/#search=canvas'>caniuse.com</a> for supported browsers";
    }

  },
  startup() {
    this.inherited(arguments);
    // console.log('Wind::startup');

    //close btn
    this.own(on(this.closeBtn, 'click', lang.hitch(this, this._closeHandler)));
    this.executiveSummaryDialog = new Dialog({
          title: "Wind Widget Information",
          content: windDialogContent,
          style: "width: 30%"
        });
    this.own(on(this.infoBtn, 'click', lang.hitch(this, this.openDialog)));
  },
  onOpen() {
    const vm = this;
    // console.log('Wind::onOpen');
    vm._showLoading();
    dojo.setStyle(this.buttonNode, 'border', 'solid 1px white');
    vm._setWindModel(vm._model);
    vm.listeners = [
      vm.map.on("extent-change", function () {
        vm.redraw();
      }),
      vm.map.on("resize", function () {
      }),
      vm.map.on("zoom-start", function () {
        vm.redraw();
      }),
      vm.map.on("pan-start", function () {
        vm.redraw();
      })
    ];
    vm._setPopupPosition();
    this._initWindModelMenu();
  },
  onClose() {
    // console.log('Wind::onClose');
    this.listeners.forEach(function (listener) {
      listener.remove();
    });
    dojo.setStyle(this.buttonNode, 'border', '');
    this.map.removeLayer(this.rasterLayer);
    this._removeFromLegend();
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
    // console.log('redraw');
    const vm = this;
    if ((this.state === 'opened' || this.state === 'active') && vm.rasterLayer._element) {
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
    const vm = this;
    setTimeout(function () {
      html.setAttr(vm.buttonWidg.iconNode, 'src', vm.buttonWidg.widgetConfig.icon);
    }, 750);
  },
  _getLegend: function () {
    const vm = this;
    vm.gettingLegend = true;
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
      vm.gettingLegend = false;
    });
  },
  _removeFromLegend: function () {
    // console.log('_removeFromLegend');
    const windLegend = dom.byId("wind_widget_legend");
    if (windLegend) windLegend.remove();
  },
  _addToLegend: function () {
    const vm = this;

    if (vm.legend_update_interval) clearInterval(vm.legend_update_interval);
    vm.legend_update_interval = setInterval(function () {
      //   var legendWidget = wm.getWidgetsByName('Legend');
      if (vm._legend.domNode.children.length === 2) {
        vm._removeFromLegend();
        if (vm._legend.domNode.innerHTML.indexOf('id="wind_widget_legend"') === -1) {
          vm.wind_legend = domConstruct.toDom('<div style="display: block;" class="esriLegendService" id="wind_widget_legend">' +
            '<table><tbody>' +
            '<tr><td align="left" colspan="2"><span class="esriLegendServiceLabel">Forecast Wind Speed for ' +
            vm._forecast_datetime +
            '</span></td></tr>' +
            vm._generateWindLegend() +
            '</tbody></table></div>');
          domConstruct.place(vm.wind_legend, vm._legend.domNode.children[0], 'first');
        }
        // console.log('clearInterval');
        clearInterval(vm.legend_update_interval);
      }
    }, 200);
  },

  _generateWindLegend: function _generateWindLegend() {
    const vm = this;
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

  _initWindModelMenu: function _initWindModelMenu () {
    // console.log('_initWindModelMenu');
    const vm = this;
    if (!vm.modelMenu) {
      vm.modelMenuNode = html.create('div', { "class": "jimu-float-trailing" }, vm.modelContent);
      vm.modelMenu = new ModelMenu({}, vm.modelMenuNode);
      // on select:
      vm.modelMenuSelectedHanlder = this.own(on(this.modelMenu, 'selected', lang.hitch(this, function (modelStr) {
        vm._setWindModel(modelStr);
      })));
    }
  },

  _setWindModel: function _setWindModel (windModelStr) {
    const vm = this;
    vm._showLoading();
    vm._model = windModelStr;
    //  HRRR, NAM, GFS
    let windPromise = vm._model === 'HRRR'?vm.layersRequest_hrrr: vm._model === 'NAM'?vm.layersRequest_nam:vm.layersRequest_gfs;
    windPromise.then(
      function (response) {
        const modelType = vm._model === 'GFS'?'global':'conus';
        vm.data = response;
        vm._updateForecast(response);
        vm.map.removeLayer(vm.rasterLayer);
        vm.rasterLayer = new RasterLayer(null, {
          opacity: 0.9,
          id: 'Current Wind Forecast'
        });
        vm.map.addLayer(vm.rasterLayer);
        vm.windy = new Windy({canvas: vm.rasterLayer._element, data: vm.data, modType: modelType});

        //legend
        if (!vm._legend && !vm.gettingLegend) {
          vm._getLegend();
        } else if (vm._legend && !vm.gettingLegend){
          vm._addToLegend();
        }
        vm.redraw();
        // vm._setPopupPosition();
        vm.showWindMenu();
        vm._hideLoading();
      }, function (error) {
        console.log("Error: ", error.message);
      });

  },

  _closeHandler: function(){
    // console.log('position on close'+this.position);
    WidgetManager.getInstance().closeWidget(this);
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
      // console.log(this.position);
    }
  },
  _onHandleClick: function(evt) {
    evt.stopPropagation();
  },
  showWindMenu: function() {
    // html.setStyle(this.noWindContentNode, 'display', 'none');
      //styles
      html.setStyle(this.domNode, 'display', 'block');
      html.setStyle(this.windContentNode, 'display', 'block');
      html.addClass(this.domNode, 'show-time-slider');
      html.removeClass(this.domNode, 'hide');


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
  _updateForecast: function (forecastData) {
    const vm = this;
    vm._forecast_datetime = moment(forecastData[0].header.refTime)
      .add(forecastData[0].header.forecastTime, 'hours').format('ll hA');
    vm.windExtentLabelNode.innerText = 'Forecast for '+vm._forecast_datetime;
    // console.log(vm._forecast_datetime);
  },
  _setPopupPosition: function (isRunInMobile) {
    // console.log('_setPopupPosition');
    if(!isRunInMobile){
      //height
      if (this.config.showLabels){
        html.setStyle(this.domNode, 'height','92px');
      } else {
        html.setStyle(this.domNode, 'height','70px');
      }

      // if (!this._draged) {
      //   utils.initPosition(this.map, this.domNode, this.position);
      // }
      //default position at bottom of page
      utils.initPosition(this.map, this.domNode, this.position);

      if (!this._moving && this.position &&
        this.position.left && this.position.top) {
        html.setStyle(this.domNode, 'top', this.position.top + 'px');
        html.setStyle(this.domNode, 'left', this.position.left + 'px');
      }
    } else {
      //height
      if (this.config.showLabels){
        html.setStyle(this.domNode, 'height','128px');
      } else {
        html.setStyle(this.domNode, 'height','108px');
      }
    }
    // this._setUI(isRunInMobile);
  },
  openDialog: function(){
    this.executiveSummaryDialog.show();
  },
});

