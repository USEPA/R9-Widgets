// jIMU (WAB) imports:
/// <amd-dependency path="jimu/BaseWidget" name="BaseWidget" />
//declare var BaseWidget: any; // there is no ts definition of BaseWidget (yet!)
// declareDecorator - to enable us to export this module with Dojo's "declare()" syntax so WAB can load it:
import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
// import on from 'dojo/on';
import on from 'dojo/on';
import LoadingShelters from 'jimu/dijit/LoadingShelters';
// esri imports:
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

//define(['dojo/_base/declare', 'jimu/BaseWidget'],
//function(declare, BaseWidget) {
  //To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

    // Custom widget code goes here

   baseClass: 'SDWISwidget',
    // this property is set by the framework when widget is loaded.
    // name: 'SDWISwidget',
    // add additional properties here

    //methods to communication with app container:
   postCreate: function postCreate() {
     this.inherited(postCreate, arguments);
     this.clickHandler = this._clickHandler();
     console.log('SDWISwidget::postCreate');
   },
   _clickHandler: function _clickHandler()  {
     return on.pausable(this.map, "click", e => {
      this.graphicsLayer.clear();
      this.LoadingShelters.show();
      this.mapIdNode.innerHTML = '';// this.graphicLayer.clear();
      var pixelWidth = this.map.extent.getWidth() / this.map.width;
      var toleraceInMapCoords = 10 * pixelWidth;
      var clickExtent = new Extent(e.mapPoint.x - toleraceInMapCoords, e.mapPoint.y - toleraceInMapCoords, e.mapPoint.x + toleraceInMapCoords, e.mapPoint.y + toleraceInMapCoords, this.map.spatialReference);
      var featureQuery = new Query();
      featureQuery.outFields = ['*'];
      featureQuery.geometry = clickExtent;
      featureQuery.orderByFields = ['FacilityName'];
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
            'name': 'Facility Name',
            'field': 'FacilityName',
            'width': '75%'
          }, {
            'name': 'PWS Name',
            'field': 'Fac_PWS_Name',
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
          this.LoadingShelters.hide(); // noneFound.push(false);
        } else {
          this.mapIdNode.innerHTML = '<h3>No logs found at this location</h3><br/>';
          this.LoadingShelters.hide();
        }
      });
    });
   },

   startup: function startup() {
     //this.inherited(startup, arguments);
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
     this.LoadingShelters = new LoadingShelters({hidden: true});
     this.LoadingShelters.placeAt(this.domNode);
     this.featureLayer = new FeatureLayer(this.config.serviceUrl, {outFields: '*'});

     this.graphicsLayer = new GraphicsLayer();
     this.map.addLayer(this.graphicsLayer);

     this.clickHandler.resume();

     if (sessionStorage.getItem('esriJSAPIOAuth'))  {
       this.token = JSON.parse(sessionStorage.getItem('esriJSAPIOAuth'))['/']["https://epa.maps.arcgis.com"].token;
     } else if (allCookies.wab_auth)  {
       this.token = JSON.parse)decodeURIComponent(allCookies.wab_auth).token;
     }

     console.log('SDWISwidget::startup');
   },

   onOpen: function(){
   //turn on SDWIS layers
     var layerStructure = LayerStructure.getInstance();
     layerStructure.getWebmapLayerNodes().find(x => x.id.toLowerCase().includes('sdwis')).show();
     this.map.setInfoWindowOnClick(false);
     this.mapIdNode.innerHTML = 'Select SDWIS point to view the log';

     this.clickHandler.resume();
     console.log('SDWISwidget::onOpen');
   },

   onClose: function(){
     this.map.setInfoWindowOnClick(true);
     this.graphicsLayer.clear();
     this.clickHandler.pause();
     console.log('SDWISwidget::onClose');
   },

    // onMinimize: function(){
    //   console.log('SDWISwidget::onMinimize');
    // },

    // onMaximize: function(){
    //   console.log('SDWISwidget::onMaximize');
    // },

    // onSignIn: function(credential){
    //   console.log('SDWISwidget::onSignIn', credential);
    // },

    // onSignOut: function(){
    //   console.log('SDWISwidget::onSignOut');
    // }

    // onPositionChange: function(){
    //   console.log('SDWISwidget::onPositionChange');
    // },

    // resize: function(){
    //   console.log('SDWISwidget::resize');
    // }

    //methods to communication between widgets:

});
