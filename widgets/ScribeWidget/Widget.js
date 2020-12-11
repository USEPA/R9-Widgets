/* global dijit, array */
import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
import on from 'dojo/on';
import LoadingShelter from 'jimu/dijit/LoadingShelter';
import Extent from 'esri/geometry/Extent';
import Query from 'esri/tasks/query';
import PictureMarkerSymbol from 'esri/symbols/PictureMarkerSymbol';
import LayerInfos from 'jimu/LayerInfos/LayerInfos';
import FeatureLayer from 'esri/layers/FeatureLayer';
import ItemFileWriteStore from 'dojo/data/ItemFileWriteStore';
import DataGrid from 'dojox/grid/DataGrid';
import Deferred from 'dojo/Deferred';
import Graphic from 'esri/graphic';
import GraphicsLayer from 'esri/layers/GraphicsLayer';
import RelationshipQuery from 'esri/tasks/RelationshipQuery';
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol';
// To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

  // Custom widget code goes here

  baseClass: 'scribe-widget',

  // add additional properties here

  // methods to communication with app container:
  postCreate: function postCreate() {
    this.inherited(postCreate, arguments);
    console.log('ScribeWidget::postCreate');
    this.loadingShelter = new LoadingShelter({hidden: true});
    this.loadingShelter.placeAt(this.domNode);
    this.loadingShelter.show();
  },
  onDataClick() {
    const vm = this;
    return on.pausable(this.map, "click", function (e) {
      vm.loadingShelter.show();
      vm.graphicLayer.clear();
      var pixelWidth = vm.map.extent.getWidth() / vm.map.width;
      var toleraceInMapCoords = 10 * pixelWidth;
      var clickExtent = new Extent(e.mapPoint.x - toleraceInMapCoords,
        e.mapPoint.y - toleraceInMapCoords,
        e.mapPoint.x + toleraceInMapCoords,
        e.mapPoint.y + toleraceInMapCoords,
        vm.map.spatialReference);

      var featureQuery = new Query();
      featureQuery.outFields = ['*'];
      featureQuery.geometry = clickExtent;
      featureQuery.orderByFields = ['Date_Input ASC'];

      vm.facilities.queryFeatures(featureQuery, function (featureSet) {
        if (featureSet.features.length === 1) {
          vm.loadFeature(featureSet.features[0]);
          // vm.loadRMPs(featureSet.features[0]);
          // noneFound.push(false);
        } else if (featureSet.features.length > 1) {
          vm.mapIdNode.innerHTML = `<h3>Multiple sample locations found</h3><br/><h5>Select one to continue</h5>` +
            '<div id="gridDiv" style="width:100%;"></div>';
          var data = {
            identifier: 'OBJECTID',
            items: []
          };
          dojo.forEach(featureSet.features, function (feature) {
            var attrs = dojo.mixin({}, feature.attributes);
            data.items.push(attrs);
          });

          var store = new ItemFileWriteStore({data: data});
          store.data = data;

          var grid = dijit.byId("grid");

          if (grid !== undefined) {
            grid.destroy();
          }

          var layout = [
            {'name': 'Name', 'field': 'LocationDescription', 'width': '75%'},
            {'name': 'Date', 'field': 'Date_Input', 'width': '25%', 'formatter': vm.formatTimestamp}
          ];
          grid = new DataGrid({
            id: 'grid',
            store: store,
            structure: layout,
            //rowSelector: '20px',
            autoHeight: true
          });

          grid.placeAt("gridDiv");

          grid.on('RowClick', function (e) {
            var rowItem = grid.getItem(e.rowIndex);
            var facility = featureSet.features.filter(function (feature) {
              return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
            });
            vm.loadFeature(facility[0]);
          });

          grid.startup();
          vm.loadingShelter.hide();
          // noneFound.push(false);
        } else {
          vm.mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
          vm.loadingShelter.hide();
        }
      });

    });

  },
  startup: function startup() {
    const vm = this;
    this.inherited(startup, arguments);
    this.loadDeferred = new Deferred();
    console.log('ScribeWidget::startup');

    // this.symbol = new PictureMarkerSymbol(
    //   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAUCAYAAABbLMdoAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAdtJREFUKJGV0k9Ik3Ecx/H3nn71iASyp12cE4KxUxaIPM9kzG0wUBSkf3jaoKgovChdwg6dOghCh6JLEHlZl3BpMHFrPj4oKKQM8fDAXORh2HaRnaL4wWwdBtY2V/S9fb+8+MLv8/0J/qNE8yCbRanVeDM8zO1/YuDl6iq3Nja6l0Kh8lJbnMuhra1x3+mEg4Pya6A9LpVIKgpnJidhbo4Lpqk+jUblkxa8uYmeThOJx6GrC0ZGYHdXPtrZYVbX+d6Ai0Xe9faCz1fvDQMsi3NHR7wFrp/g9XXtTipVuTg1BQ5HHXd0wNgYpNNc3d7GZxh8Ftksyv5+5fnAAHg8jbH094Nl4SgW1STIK0II9WGhIM9PT7dmKAREIrC4KC9vbeEVnZ3yldvNrG1ztnlzrQa5HPT1UQoE+CL8fr6Zpvosk5Ezug6a9hvn83B4CKOjxE8eGI3Kx/PzPDBNnBMTdXh8DMvLYBjqp6EhaTVE5/V230ulyslAAHp6YG8PqlV+ut3yZstRQqHy+4UF1c5k5KVYrL7V7ydhGHw99dwej7xh2+QTCRwuFz8UhbsN6fzZDA5SWFnhg2lybXxcmwmHK9W2GMDlIhYMqh/D4cqLltybB/VPI4PN81Px3+oXm5WbogYCJW8AAAAASUVORK5CYII=',
    //   11,
    //   20
    // );
    this.symbol = new SimpleMarkerSymbol();
    this.symbol.setStyle(SimpleMarkerSymbol.STYLE_SQUARE);

    this.graphicLayer = new GraphicsLayer();
    this.map.addLayer(this.graphicLayer);

    var loadRelated = function (obj) {
      dojo.forEach(obj.relationships, function (relationship) {
        if (relationship.role === "esriRelRoleOrigin") {
          vm[relationship.name] = new FeatureLayer(vm.baseurl + "/" + relationship.relatedTableId);
          vm[relationship.name].relationshipId = relationship.id;
          vm[relationship.name].on('load', function (e) {
            if (vm[relationship.name].relationships.length > 0) {
              loadRelated(vm[relationship.name]);
            }
          });
        }
      });
    };

    LayerInfos.getInstance(vm.map, vm.map.itemInfo).then(function (layerInfosObject) {
      var facilities = layerInfosObject.getLayerInfoById(vm.config.layerId);
      vm.facilities = new FeatureLayer(facilities.layerObject.url);
      vm.facilities.on('load', function (e) {
        vm.baseurl = vm.facilities.url.substring(0, vm.facilities.url.lastIndexOf('/'));
        loadRelated(vm.facilities);
        vm.loadDeferred.resolve();
      });
    });

    this.clickHandler = this.onDataClick();

    this.loadingShelter.hide();
  },
  loadFeature(feature) {
    var vm = this;
    vm.loadingShelter.show();


    var selectedGraphic = new Graphic(feature.geometry, vm.symbol);
    this.graphicLayer.add(selectedGraphic);

    this.mapIdNode.innerHTML = `<h1>${feature.attributes.LocationDescription}</h1>` +
      `<h5>${feature.attributes.LocationComment}</h5>` +
      '<div id="samplesGridDiv"></div>';

    this.loadSamples(feature).then(function () {
      vm.loadingShelter.hide();
    });

  },
  loadResults(feature) {
    var deferred = new Deferred();
    var query = new Query();
    query.outFields = ['*'];
    query.where = `Samp_No = '${feature.attributes.Samp_No}'`;
    // query.start = 0;
    // query.num = 25;
    query.orderByFields = ["Analyte ASC"];
    this.AllResults.queryFeatures(query, function (featureSet) {
      var results = featureSet.features;
      var data = {
        identifier: 'OBJECTID',
        items: []
      };
      dojo.forEach(results, function (feature) {
        feature.attributes.Display_Result = `${feature.attributes.Result} ${feature.attributes.Result_Units}`;
        feature.attributes.Display_Analyte = `${feature.attributes.Analyte} ${feature.attributes.CAS_NO ? '(' + feature.attributes.CAS_NO + ')' : ''}`;
        var attrs = dojo.mixin({}, feature.attributes);
        data.items.push(attrs);
      });

      var store = new ItemFileWriteStore({data: data});
      store.data = data;

      var grid = dijit.byId("resultsGrid");

      if (grid !== undefined) {
        grid.destroy();
      }

      var layout = [
        {'name': 'Analyte', 'field': 'Display_Analyte', 'width': '75%'},
        {'name': 'Result', 'field': 'Display_Result', 'width': '25%'}
      ];
      grid = new DataGrid({
        id: 'resultsGrid',
        store: store,
        structure: layout,
        //rowSelector: '20px',
        autoHeight: true
      });

      grid.placeAt("samplesGridDiv");

      grid.on('RowClick', function (e) {
        var rowItem = grid.getItem(e.rowIndex);
        var facility = array.filter(results, function (feature) {
          return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
        });
        // vm.loadRMPs(facility[0]);
      });

      grid.startup();
      deferred.resolve();
    });
    return deferred.promise;
  },
  loadSamples(feature) {
    var vm = this;
    var deferred = new Deferred();
    var query = new Query();
    query.outFields = ['*'];
    query.where = `Site_No = '${feature.attributes.Site_No}'`;
    // query.start = 0;
    // query.num = 25;
    query.orderByFields = ["SampleDate ASC"];
    this.AllSamples.queryFeatures(query, function (featureSet) {
      var samples = featureSet.features;
      var data = {
        identifier: 'OBJECTID',
        items: []
      };
      dojo.forEach(samples, function (feature) {
        feature.attributes.Depth_Range = `${feature.attributes.Samp_Depth} - ${feature.attributes.Samp_Depth_To} ${feature.attributes.Samp_Depth_Units}`;
        feature.attributes.Depth_Range = feature.attributes.Samp_Depth !== null ? feature.attributes.Depth_Range : 'N/A';
        var attrs = dojo.mixin({}, feature.attributes);
        data.items.push(attrs);
      });

      var store = new ItemFileWriteStore({data: data});
      store.data = data;

      var grid = dijit.byId("samplesGrid");

      if (grid !== undefined) {
        grid.destroy();
      }

      var layout = [
        {'name': 'Date', 'field': 'SampleDate', 'width': '25%', 'formatter': vm.formatTimestamp},
        {'name': 'Time', 'field': 'SampleTime', 'width': '25%'},
        {'name': 'Depth', 'field': 'Depth_Range', 'width': '25%'},
        {'name': 'Matrix', 'field': 'Matrix', 'width': '25%'}
      ];
      grid = new DataGrid({
        id: 'samplesGrid',
        store: store,
        structure: layout,
        //rowSelector: '20px',
        autoHeight: true
      });

      grid.placeAt("samplesGridDiv");

      grid.on('RowClick', function (e) {
        var rowItem = grid.getItem(e.rowIndex);
        var sample = samples.filter(function (feature) {
          return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
        });
        vm.loadResults(sample[0]);
        grid.destroy();
      });

      grid.startup();
      deferred.resolve();
    });
    return deferred.promise;
  },
  formatTimestamp(timestamp) {
    var date = new Date(timestamp);
    return date.toDateString();

  },
  loadData() {

  },
  onOpen() {
    console.log('ScribeWidget::onOpen');
    this.map.setInfoWindowOnClick(false);
  },
  onClose() {
    console.log('ScribeWidget::onClose');
    this.map.setInfoWindowOnClick(true);
  },

  // onMinimize(){
  //   console.log('ScribeWidget::onMinimize');
  // },
  // onMaximize(){
  //   console.log('ScribeWidget::onMaximize');
  // },
  // onSignIn(credential){
  //   console.log('ScribeWidget::onSignIn', credential);
  // },
  // onSignOut(){
  //   console.log('ScribeWidget::onSignOut');
  // }
  // onPositionChange(){
  //   console.log('ScribeWidget::onPositionChange');
  // },
  // resize(){
  //   console.log('ScribeWidget::resize');
  // }
});
