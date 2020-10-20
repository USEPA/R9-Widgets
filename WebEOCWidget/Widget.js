import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
import on from 'dojo/on';
import LoadingShelter from 'jimu/dijit/LoadingShelter';
import FeatureLayer from 'esri/layers/FeatureLayer';
import Extent from 'esri/geometry/Extent';
import Query from 'esri/tasks/query';
import ItemFileWriteStore from 'dojo/data/ItemFileWriteStore';
import DataGrid from 'dojox/grid/DataGrid';
import LayerStructure from 'jimu/LayerStructure';
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol';
import Color from 'esri/Color';
import GraphicsLayer from 'esri/layers/GraphicsLayer';
import Graphic from 'esri/graphic';

// To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

  // Custom widget code goes here

  baseClass: 'web-eoc-widget',

  // add additional properties here
  // webeoc_token: null,
  // featureLayer: null,

  // methods to communication with app container:
  postCreate: function postCreate() {
    this.inherited(postCreate, arguments);
    this.clickHandler = this._clickHandler();
    console.log('WebEOCWidget::postCreate');
  },
  _clickHandler: function _clickHandler() {
    return on.pausable(this.map, "click", e => {
      this.graphicsLayer.clear();
      this.loadingShelter.show();
      this.mapIdNode.innerHTML = '';
      // this.graphicLayer.clear();
      var pixelWidth = this.map.extent.getWidth() / this.map.width;
      var toleraceInMapCoords = 10 * pixelWidth;
      var clickExtent = new Extent(e.mapPoint.x - toleraceInMapCoords, e.mapPoint.y - toleraceInMapCoords, e.mapPoint.x + toleraceInMapCoords, e.mapPoint.y + toleraceInMapCoords, this.map.spatialReference);
      var featureQuery = new Query();
      featureQuery.outFields = ['*'];
      featureQuery.geometry = clickExtent;
      featureQuery.orderByFields = ['dateofreport DESC'];
      this.featureLayer.selectFeatures(featureQuery, FeatureLayer.SELECTION_NEW, features => {
        if (features.length === 1) {
          this.loadLog(features[0]); // this.loadRMPs(featureSet.features[0]);
          // noneFound.push(false);
        } else if (features.length > 1) {
          this.mapIdNode.innerHTML = "<h3>Multiple log entries found</h3><br/><h5>Select one to continue</h5>" + '<div id="gridDiv" style="width:100%;"></div>';
          var data = {
            identifier: 'objectid',
            items: []
          };
          dojo.forEach(features, feature => {
            var attrs = dojo.mixin({}, feature.attributes);
            data.items.push(attrs);
          });
          var store = new ItemFileWriteStore({
            data: data
          });
          store.data = data;
          var grid = dijit.byId("grid");

          if (grid !== undefined) {
            grid.destroy();
          }

          var layout = [{
            'name': 'Source of Pollution',
            'field': 'sourceofpollution',
            'width': '75%'
          }, {
            'name': 'Date of Report',
            'field': 'dateofreport',
            'width': '25%',
            // 'formatter': this.formatTimestamp
          }];
          grid = new DataGrid({
            id: 'grid',
            store: store,
            structure: layout,
            //rowSelector: '20px',
            autoHeight: true
          });
          grid.placeAt("gridDiv");
          grid.on('RowClick', e => {
            var rowItem = grid.getItem(e.rowIndex);
            var facility = features.filter(feature => {
              return feature.attributes.objectid === rowItem.objectid[0];
            });
            this.loadLog(facility[0]);
          });
          grid.startup();
          this.loadingShelter.hide(); // noneFound.push(false);
        } else {
          this.mapIdNode.innerHTML = '<h3>No logs found at this location</h3><br/>';
          this.loadingShelter.hide();
        }
      });
    });
  },
  startup: function startup() {
    var layerStructure = LayerStructure.getInstance();
    layerStructure.getWebmapLayerNodes().find(x => x.id.toLowerCase().includes('webeoc')).show();

    // var facilities = layerInfosObject.getLayerInfoById(that.config.layerId);
    // that.facilities = new FeatureLayer(facilities.layerObject.url);
    // that.facilities.on('load', function (e) {
    //   that.baseurl = that.facilities.url.substring(0, that.facilities.url.lastIndexOf('/'));
    //   loadRelated(that.facilities);
    //   that.loadDeferred.resolve();
    // });

    this.symbol = new SimpleMarkerSymbol();
    this.symbol.setSize(20);
    this.symbol.setColor(new Color([255, 255, 0, 0.5]));

    this.inherited(startup, arguments);
    this.loadingShelter = new LoadingShelter({hidden: true});
    this.loadingShelter.placeAt(this.domNode);
    this.featureLayer = new FeatureLayer(this.config.serviceUrl, {outFields: '*'});

    this.graphicsLayer = new GraphicsLayer();
    this.map.addLayer(this.graphicsLayer);

    this.clickHandler.resume();

    if (sessionStorage.getItem('esriJSAPIOAuth')) {
      this.token = JSON.parse(sessionStorage.getItem('esriJSAPIOAuth'))['/'].token;
    } else if (allCookies.wab_auth) {
      this.token = JSON.parse(decodeURIComponent(allCookies.wab_auth)).token;
    }


    console.log('WebEOCWidget::startup');
  },
  loadLog: function loadLog(logEntry) {
    var selectedGraphic = new Graphic(logEntry.geometry, this.symbol);
    this.graphicsLayer.add(selectedGraphic);
    this.loadingShelter.show();
    fetch(`${this.config.authProxyUrl}/${logEntry.attributes.nrcnumber}`, {
      headers: {'Content-Type': 'application/json', 'Authorization': this.token}
    })
      .then(response => response.text())
      .then(response => {
        this.mapIdNode.innerHTML = response;
        this.loadingShelter.hide();
      });
  },
  onOpen: function onOpen() {
    // this.turnOnEOCLayer();
    this.map.setInfoWindowOnClick(false);
    this.mapIdNode.innerHTML = 'Select Web EOC point to view the log';
    this.clickHandler.resume();
    console.log('WebEOCWidget::onOpen');
  },
  onClose() {
    this.map.setInfoWindowOnClick(true);
    this.graphicsLayer.clear();
    this.clickHandler.pause();
    console.log('WebEOCWidget::onClose');
  },
  // onMinimize(){
  //   console.log('WebEOCWidget::onMinimize');
  // },
  // onMaximize(){
  //   console.log('WebEOCWidget::onMaximize');
  // },
  // onSignIn(credential){
  //   console.log('WebEOCWidget::onSignIn', credential);
  // },
  // onSignOut(){
  //   console.log('WebEOCWidget::onSignOut');
  // }
  // onPositionChange(){
  //   console.log('WebEOCWidget::onPositionChange');
  // },
  // resize(){
  //   console.log('WebEOCWidget::resize');
  // }
});
