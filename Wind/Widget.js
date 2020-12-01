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
import ModelMenu from './ModelMenu';
import hrrr_wind from 'dojo/text!./current_wind_hrrr.json';

// To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

  // Custom widget code goes here

  baseClass: 'wind',
  data: null,
  // add additional properties here
  // methods to communication with app container:
  _forecast_datetime: '',
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
      vm.layersRequest.then(
        function (response) {
          // vm.data = response;
          vm.data = hrrr_wind;
          vm._forecast_datetime = moment(response[0].header.refTime)
            .add(response[0].header.forecastTime, 'hours').format('ll hA');
          vm.windy = new Windy({canvas: vm.rasterLayer._element, data: response});
          vm.redraw();
          vm._hideLoading();
          vm._getLegend();
        }, function (error) {
          console.log("Error: ", error.message);
        });
    } else {
      dom.byId("mapCanvas").innerHTML = "This browser doesn't support canvas. Visit <a target='_blank' href='http://www.caniuse.com/#search=canvas'>caniuse.com</a> for supported browsers";
    }

  },
  // startup() {
  //   this.inherited(arguments);
  //   console.log('Wind::startup');
  // },
  onOpen() {
    var vm = this;
    console.log('Wind::onOpen');
    this._showLoading();
    dojo.setStyle(this.buttonNode, 'border', 'solid 1px white');
    this.map.addLayer(this.rasterLayer);
    if (vm.layersRequest.isResolved()) {
      vm.windy = new Windy({canvas: vm.rasterLayer._element, data: vm.data});
      vm.redraw();
      vm._addToLegend();
      vm._hideLoading();
    }
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
    if (this.state === 'opened') {
      var vm = this;
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
    // var parentWid = html.getAttr(this.buttonNode, 'widgetId');
    var parentWid = html.getAttr(this.buttonNode, 'settingId');
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
    this.windy.colorStyles.forEach(function (color, i) {
      var previous_max = Math.round(current_max * 10) / 10;
      current_max = Math.round(vm.windy.colorStyles.maxSpeedForIndex(i) * 3.6 * 10)/10;
      var speed = previous_max !== current_max + 0.1 ? previous_max + ' - ' + current_max : current_max + '+ ';
      legend_html += string.substitute(legend_template, {color: color, speed: speed + ' km/hr'});
      current_max += 0.1;
    });
    return legend_html;
  },
  _initModelMenu: function () {
    if (!this.modelMenu) {
      this.modelMenuNode = html.create('div', { "class": "jimu-float-trailing" }, this.sliderContent);

      this.modelMenu = new ModelMenu({ nls: this.nls }, this.modelMenuNode);
      this.modelMenuSelectedHanlder = this.own(on(this.modelMenu, 'selected', lang.hitch(this, function (rateStr) {
        if (this.timeSlider && rateStr) {
          this._LAST_SPEED_RATE = rateStr;
          var rate = parseFloat(rateStr);
          this.timeSlider.setThumbMovingRate(2000 / rate);
        }
      })));

      this.modelMenuOpenHanlder = this.own(on(this.modelMenu, 'open', lang.hitch(this, function () {
        this._clearMiniModeTimer();
      })));

      this.modelMenuCloseHanlder = this.own(on(this.modelMenu, 'close', lang.hitch(this, function () {
        this._setMiniModeTimer();
      })));

      if (this._LAST_SPEED_RATE) {
        this.modelMenu.setModel(this._LAST_SPEED_RATE);//keep model when auto refresh
      }
    }
  },
  _destroyModelMenu: function () {
    if(this.modelMenu && this.modelMenu.destroy){
      this.modelMenu.destroy();
    }
    this.modelMenu = null;
    this.modelMenuSelectedHanlder = null;
    this.modelMenuOpenHanlder = null;
    this.modelMenuCloseHanlder = null;
  }
});

