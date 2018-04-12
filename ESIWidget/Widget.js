define(['dojo/_base/declare', 'jimu/BaseWidget', 'dojo/Deferred', 'dojo/on', 'dojo/promise/all', 'dojox/grid/DataGrid',
    'dojo/data/ItemFileWriteStore', 'esri/arcgis/Portal', 'esri/SpatialReference', 'esri/geometry/Extent', 'esri/tasks/query', 'esri/layers/FeatureLayer',
    'esri/Color', 'esri/graphic', 'esri/symbols/SimpleLineSymbol', 'esri/symbols/SimpleMarkerSymbol',
    'jimu/LayerStructure', 'jimu/dijit/LoadingShelter', 'jimu/SelectionManager','esri/tasks/RelationshipQuery',
    'dojo/dom-construct', 'dojo/dom', 'dojo/domReady!'],
  function (declare, BaseWidget, Deferred, on, all, DataGrid, ItemFileWriteStore,
            Portal, SpatialReference, Extent, Query, FeatureLayer, Color, Graphic, SimpleLineSymbol, SimpleMarkerSymbol,
            LayerStructure, LoadingShelter, SelectionManager, RelationshipQuery, domConstruct, dom) {
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

      getRelatedFromFeature: function (vm, feature){

        vm.EsiData.innerHTML = '';

        feature.getLayer().relationships.forEach(function (relationship) {
          //console.log(relationship);
          let relatedQuery = new RelationshipQuery();
          relatedQuery.outFields = ["*"];
          relatedQuery.relationshipId = relationship.id;
          relatedQuery.objectIds = [feature.attributes.OBJECTID];
          relatedQuery.returnGeometry = true;

          //ESI always has 4 related tables: breed_dt, biofile, soc_bat, and sources
          //Catch each table and create a specific format for each
          //relationship.name

          feature.getLayer().queryRelatedFeatures(relatedQuery, function (relatedfeatureSet) {
            //console.log(relatedfeatureSet);
            let fset = relatedfeatureSet[feature.attributes.OBJECTID];
            if (fset !== undefined){
              formatRelatedData(relationship.name, fset);
              // fset.features.forEach(function(f){
              //   var row = domConstruct.toDom('<tr><td>Name</td><td>' + f.attributes.Name + '</td></tr>');
              //   domConstruct.place(row, 'biofile_tbody');
              //   //vm.EsiData.innerHTML += '<br>'+ 'Layer: ' + relationship.name + ' Feature: ' + f.attributes.NAME;
              //   console.log('Layer: ' + f._layer.name + ' Feature: ' + f.attributes.NAME);
              // });
            }
          },function(e){
            console.log(e);
          });

        });

        function formatRelatedData(tableName, featureSet) {

          var row;

          if (tableName ==='biofile'){
            row = domConstruct.toDom('<tr><th class="rowLine1" colspan="2">biofile (Found: '+ featureSet.features.length +')</th></tr>');
            domConstruct.place(row, 'biofile_hd');

            featureSet.features.forEach(function(f){
              row = domConstruct.toDom('<tr><td>NAME</td><td>' + f.attributes.NAME + '</td></tr>' +
                '<tr><td>ELEMENT</td><td>' + f.attributes.ELEMENT + '</td></tr>' +
                '<tr><td>SUBELEMENT</td><td>' + f.attributes.SUBELEMENT + '</td></tr>' +
                '<tr><td>GEN_SPEC</td><td>' + f.attributes.GEN_SPEC + '</td></tr>' +
                '<tr><td>S_F</td><td>' + f.attributes.S_F + '</td></tr>' +
                '<tr><td>T_E</td><td>' + f.attributes.T_E + '</td></tr>' +
                '<tr><td>CONC</td><td>' + f.attributes.CONC + '</td></tr>' +
                '<tr><td class="rowLine2">SEASSUM</td><td class="rowLine2">' + f.attributes.SEASSUM + '</td></tr>'
              );
              domConstruct.place(row, 'biofile_tbody');
            });

          }else if (tableName === 'breed_dt'){

            row = domConstruct.toDom('<tr><th class="rowLine1" colspan="2">breed_dt (Found: '+ featureSet.features.length +')</th></tr>');
            domConstruct.place(row, 'breed_dt_hd');

            featureSet.features.forEach(function(f){
              row = domConstruct.toDom('<tr><td>BREED</td><td>' + f.attributes.BREED + '</td></tr>' +
                '<tr><td>MONTH</td><td>' + f.attributes.MONTH_ + '</td></tr>' +
                '<tr><td>BREED1</td><td>' + f.attributes.BREED1 + '</td></tr>' +
                '<tr><td>BREED2</td><td>' + f.attributes.BREED2 + '</td></tr>' +
                '<tr><td>BREED3</td><td>' + f.attributes.BREED3 + '</td></tr>' +
                '<tr><td>BREED4</td><td>' + f.attributes.BREED4 + '</td></tr>' +
                '<tr><td class="rowLine2">BREED5</td><td class="rowLine2">' + f.attributes.BREED5 + '</td></tr>'
              );
              domConstruct.place(row, 'breed_dt_tbody');
            });

          }else if (tableName === 'soc_dat'){
            row = domConstruct.toDom('<tr><th class="rowLine1" colspan="2">soc_dat (Found: '+ featureSet.features.length +')</th></tr>');
            domConstruct.place(row, 'soc_dat_hd');

            featureSet.features.forEach(function(f){
              row = domConstruct.toDom('<tr><td>NAME</td><td>' + f.attributes.NAME + '</td></tr>' +
                '<tr><td>TYPE</td><td>' + f.attributes.TYPE + '</td></tr>' +
                '<tr><td>CONTACT</td><td>' + f.attributes.CONTACT + '</td></tr>' +
                '<tr><td class="rowLine2">PHONE</td><td class="rowLine2">' + f.attributes.PHONE + '</td></tr>'
              );
              domConstruct.place(row, 'soc_dat_tbody');
            });

          }else if (tableName == 'sources'){
            row = domConstruct.toDom('<tr><th class="rowLine1" colspan="2">sources (Found: '+ featureSet.features.length +')</th></tr>');
            domConstruct.place(row, 'sources_hd');

            featureSet.features.forEach(function(f) {
              row = domConstruct.toDom('<tr><td>TITLE</td><td>' + f.attributes.TITLE + '</td></tr>' +
                '<tr><td>PUBLICATION</td><td>' + f.attributes.PUBLICATION + '</td></tr>' +
                '<tr><td>DATA_FORMAT</td><td>' + f.attributes.DATA_FORMAT + '</td></tr>' +
                '<tr><td>DATE_PUB</td><td>' + f.attributes.DATE_PUB + '</td></tr>' +
                '<tr><td class="rowLine2">TIME_PERIOD</td><td class="rowLine2">' + f.attributes.TIME_PERIOD + '</td></tr>'
              );
              domConstruct.place(row, 'sources_tbody');
            });

          }else {
              row = domConstruct.toDom('Error Formatting Data For Related Table ' + tableName);
              domConstruct.place(row, 'sdiv');
            }
            //clear or provide error message

          }
      },


      foundFeatures: [],
      searchESIService: function (item, query) {
        let vm = this,
          promises = [];
        // reset foundFeatures back to empty
        vm.foundFeatures = [];
        vm.clearEsiWidgetText();

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
            vm.EsiData.innerHTML = 'Found 1 thing' + '<br>';


            vm.getRelatedFromFeature(vm, vm.foundFeatures[0]);
            // noneFound.push(false);

          } else if (vm.foundFeatures.length > 1) {
            vm.EsiData.innerHTML = '<h3>Multiple features at that location</h3><br/><h5>Select one to continue</h5>' +
              '<div id="gridDiv" style="width:100%;"></div>';
            let data = {
              identifier: 'OBJECTID',
              items: []
            };
            //getting object ID error.  Concatenate ibject id + Layer name.
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
            //Mouse Over and Mouse Out

            grid.on('MouseOver', function (e) {
              let rowItem = grid.getItem(e.rowIndex);
              let feature = dojo.filter(vm.foundFeatures, function (feature) {
                return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
              });
              // call function to display the feature
              vm.highlightFeature(feature[0]);
            });

            grid.on('RowClick', function (e) {
              let rowItem = grid.getItem(e.rowIndex);
              let feature = dojo.filter(vm.foundFeatures, function (feature) {
                return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
              });
              // call function to display the feature
              vm.highlightFeature(feature[0]);
              vm.getRelatedFromFeature(vm,feature[0]);
              // use feature[0].getLayer() to get the layer object for this feature and query all of the
              // relationships in the relationships attribute of the layer
            });

            grid.startup();
            // noneFound.push(false);
          } else {
            vm.EsiData.innerHTML = '<h3>No facilities found at this location</h3><br/>';
          }
          vm.loadingShelter.hide();
        });
      },

      startup: function () {
        this.inherited(arguments);
        console.log('ESIWidget::startup');
        this.loadingShelter.placeAt(this.EsiData);
        this.loadingShelter.show();
        this.findESILayers();
      },


      onOpen: function(){
        console.log('ESIWidget::onOpen');
        this.map.setInfoWindowOnClick(false);
        var vm = this;
        if (vm.clickHandler !== undefined) {
          vm.clickHandler.resume();
        }
        vm.clearEsiWidgetText();
      },

      onClose: function(){
        console.log('ESIWidget::onClose');
        this.clickHandler.pause();
        this.map.graphics.clear();
        this.map.setInfoWindowOnClick(true);
      },

      clearEsiWidgetText: function() {
        dojo.empty('biofile_tbody');
        dojo.empty('breed_dt_tbody');
        dojo.empty('soc_dat_tbody');
        dojo.empty('sources_tbody');
        dojo.empty('biofile_hd');
        dojo.empty('breed_dt_hd');
        dojo.empty('soc_dat_hd');
        dojo.empty('sources_hd');
        dojo.empty('sdiv');
        this.map.graphics.clear();
        this.EsiData.innerHTML = '';
      },

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