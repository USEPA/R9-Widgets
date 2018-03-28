define(['dojo/_base/declare', 'jimu/BaseWidget', 'dojo/Deferred', 'dojo/on', 'dojo/promise/all', 'dojox/grid/DataGrid',
    'dojo/data/ItemFileWriteStore', 'esri/arcgis/Portal', 'esri/SpatialReference', 'esri/geometry/Extent', 'esri/tasks/query', 'esri/layers/FeatureLayer',
    'esri/Color', 'esri/graphic', 'esri/symbols/SimpleLineSymbol', 'esri/symbols/SimpleMarkerSymbol',
    'jimu/LayerStructure', 'jimu/dijit/LoadingShelter', 'jimu/SelectionManager'],
  function (declare, BaseWidget, Deferred, on, all, DataGrid, ItemFileWriteStore,
            Portal, SpatialReference, Extent, Query, FeatureLayer, Color, Graphic, SimpleLineSymbol, SimpleMarkerSymbol,
            LayerStructure, LoadingShelter, SelectionManager) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {

      // Custom widget code goes here

      baseClass: 'esi-widget',
      // this property is set by the framework when widget is loaded.
      name: 'ESI Widget',
      // add additional properties here
      loadingDeferred: new Deferred(),
      loadingShelter: new LoadingShelter({hidden: true}),

      //methods to communication with app container:
      postCreate: function () {
        this.inherited(arguments);
        console.log('ESIWidget::postCreate');
        this.selectionManager = SelectionManager.getInstance();
      },
      esiAGOLItems: [],
      findESILayers: function () {
        let vm = this;
        let epaPortal = new Portal.Portal("https://epa.maps.arcgis.com");
        epaPortal.signIn().then(function () {
          epaPortal.queryItems({q: 'tags: "ESI Widget"', num: 100}).then(function (response) {
            dojo.forEach(response.results, function (item) {
              // item.grpLayers = [];
              // get all layers loaded into map
              let structure = LayerStructure.getInstance();
              let filteredResults = dojo.filter(structure.getLayerNodes(), function (layerNode) {
                return item.id === layerNode._layerInfo.originOperLayer.itemId;
              });

              // if ESI Widget service found in map do this
              if (filteredResults.length > 0) {
                // build spatialExtent of found ESI Widget service for use later
                let spatialExtent = new Extent(item.extent[0][0], item.extent[0][1], item.extent[1][0], item.extent[1][1],
                  new SpatialReference({wkid: 4326}));

                // since we need FeatureLayer objects to query the service build that here
                let layers = [], promises = [];
                filteredResults[0]._layerInfo.originOperLayer.layerObject.layerInfos.forEach(function (layer) {
                  layer.fl = new FeatureLayer(filteredResults[0]._layerInfo.originOperLayer.url + '/' + layer.id, {outFields: ['*']});
                  let deferred = new Deferred();
                  layers.push(layer);
                  promises.push(deferred.promise);
                  layer.fl.on('load', function () {
                    deferred.resolve();
                  });
                });

                all(promises).then(function () {
                  vm.esiAGOLItems.push({
                    item: item,
                    spatialExtent: spatialExtent,
                    layers: layers,
                    originalLayer: filteredResults[0]._layerInfo.originOperLayer.layerObject
                  });
                });
              }
            });

            vm.clickHandler = on.pausable(vm.map, "click", function (e) {
              // vm.loadingShelter.show();
              // vm.graphicLayer.clear();
              // let pixelWidth = vm.map.extent.getWidth() / vm.map.width;
              vm.loadingShelter.show();
              let pixelWidth = vm.map.extent.getWidth() / vm.map.width;
              let toleraceInMapCoords = 10 * pixelWidth;
              let clickExtent = new Extent(e.mapPoint.x - toleraceInMapCoords,
                e.mapPoint.y - toleraceInMapCoords,
                e.mapPoint.x + toleraceInMapCoords,
                e.mapPoint.y + toleraceInMapCoords,
                vm.map.spatialReference);

              let query = new Query();
              query.outFields = ['*'];
              query.geometry = clickExtent;

              // vm.clearAllSelections(vm.esiAGOLItems);
              dojo.forEach(vm.esiAGOLItems, function (item) {
                if (item.spatialExtent.contains(e.mapPoint)) {
                  vm.searchESIService(item, query);
                }
              });
            });
            vm.loadingShelter.hide();
          });
        });
      },
      // this will loop through all ESI layers in the map and clear any selections
      // but this will probably not work since the service in the map is a MapService
      clearAllSelections: function (grp_configs) {
        let vm = this;
        grp_configs.forEach(function (grp_config) {
          grp_config.layers.forEach(function (layer) {
            layer.getLayerObject().then(function (layer_object) {
              vm.selectionManager.clearSelection(layer_object);
            });
          });
        });
      },
      highlightFeature: function (feature) {
        this.map.graphics.clear();
        let color = new Color([0, 255, 197, 1]);
        let mySymbol;
        if (feature.geometry.type === 'point') {
          let line = new SimpleLineSymbol();
          line.setWidth(2.5);
          line.setColor(color);
          mySymbol = new SimpleMarkerSymbol();
          mySymbol.setOutline(line);
        } else if (feature.geometry.type === 'polygon') {
          mySymbol = new SimpleLineSymbol();
          mySymbol.setWidth(2.5);
          mySymbol.setColor(color);
        }
        let graphic = new Graphic(feature.geometry, mySymbol);
        this.map.graphics.add(graphic);
      },
      foundFeatures: [],
      searchESIService: function (item, query) {
        let vm = this,
          promises = [];

        // reset foundFeatures back to empty
        vm.foundFeatures = [];

        item.layers.forEach(function (layer) {
          if (layer.fl.relationships.length > 0 && item.originalLayer.visibleLayers.indexOf(layer.id) > -1) {
            let deferred = new Deferred();
            promises.push(
              layer.fl.queryFeatures(query, function (featureSet) {
                vm.foundFeatures = vm.foundFeatures.concat(featureSet.features);
                deferred.resolve();
              }));
          }
        });

        all(promises).then(function () {
          if (vm.foundFeatures.length === 1) {
            console.log(vm.foundFeatures[0]);
            vm.highlightFeature(vm.foundFeatures[0]);
            vm.domNode.innerHTML = 'Found 1 thing';
            // noneFound.push(false);
            /// do something to display the features related data using vm.foundFeatures[0].getLayer().relationships
          } else if (vm.foundFeatures.length > 1) {
            vm.domNode.innerHTML = '<h3>Multiple features at that location</h3><br/><h5>Select one to continue</h5>' +
              '<div id="gridDiv" style="width:100%;"></div>';
            let data = {
              identifier: 'OBJECTID',
              items: []
            };
            dojo.forEach(vm.foundFeatures, function (feature) {
              let attrs = dojo.mixin({}, {OBJECTID: feature.attributes.OBJECTID, name: feature.getLayer().name, feature: feature});
              data.items.push(attrs);
            });

            let store = new ItemFileWriteStore({data: data});
            store.data = data;

            let grid = dijit.byId("grid");

            if (grid !== undefined) {
              grid.destroy();
            }

            let layout = [
              {'name': 'Name', 'field': 'name', 'width': '100%'}
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
              let rowItem = grid.getItem(e.rowIndex);
              let feature = dojo.filter(vm.foundFeatures, function (feature) {
                return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
              });
              // call function to display the feature
              vm.highlightFeature(feature[0]);
              // use feature[0].getLayer() to get the layer object for this feature and query all of the
              // relationships in the relationships attribute of the layer
            });

            grid.startup();
            // noneFound.push(false);
          } else {
            vm.domNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
          }
          vm.loadingShelter.hide();
        });
      },

      startup: function () {
        this.inherited(arguments);
        console.log('ESIWidget::startup');
        this.loadingShelter.placeAt(this.domNode);
        this.loadingShelter.show();
        this.findESILayers();
      },

      // onOpen: function(){
      //   console.log('ESIWidget::onOpen');
      // },

      // onClose: function(){
      //   console.log('ESIWidget::onClose');
      // },

      // onMinimize: function(){
      //   console.log('ESIWidget::onMinimize');
      // },

      // onMaximize: function(){
      //   console.log('ESIWidget::onMaximize');
      // },

      // onSignIn: function(credential){
      //   console.log('ESIWidget::onSignIn', credential);
      // },

      // onSignOut: function(){
      //   console.log('ESIWidget::onSignOut');
      // }

      // onPositionChange: function(){
      //   console.log('ESIWidget::onPositionChange');
      // },

      // resize: function(){
      //   console.log('ESIWidget::resize');
      // }

      //methods to communication between widgets:

    });

  });
