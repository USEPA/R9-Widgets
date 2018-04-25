define(['dojo/_base/declare', 'jimu/BaseWidget', 'dojo/Deferred', 'dojo/on', 'dojo/promise/all', 'dojox/grid/DataGrid',
    'dojo/data/ItemFileWriteStore', 'esri/arcgis/Portal', 'esri/SpatialReference', 'esri/geometry/Extent',
    'esri/tasks/query', 'esri/tasks/QueryTask', 'esri/layers/FeatureLayer',
    'esri/Color', 'esri/graphic', 'esri/symbols/SimpleLineSymbol', 'esri/symbols/SimpleMarkerSymbol',
    'jimu/LayerStructure', 'jimu/dijit/LoadingShelter', 'jimu/SelectionManager', 'esri/tasks/RelationshipQuery',
    'dojo/dom-construct', 'dojo/dom', 'dijit/TitlePane', 'dojo/domReady!'],
  function (declare, BaseWidget, Deferred, on, all, DataGrid, ItemFileWriteStore,
            Portal, SpatialReference, Extent, Query, QueryTask, FeatureLayer, Color, Graphic, SimpleLineSymbol, SimpleMarkerSymbol,
            LayerStructure, LoadingShelter, SelectionManager, RelationshipQuery, domConstruct, dom, TitlePane) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {

      // Custom widget code goes here

      baseClass: 'esi-widget',
      // this property is set by the framework when widget is loaded.
      name: 'ESI Identify',
      // add additional properties here
      loadingDeferred: new Deferred(),
      loadingShelter: new LoadingShelter({hidden: true}),

      //methods to communication with app container:
      postCreate: function () {
        this.inherited(arguments);
        //console.log('ESIWidget::postCreate');
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
              let filteredTableResults = dojo.filter(structure.getTableNodes(), function (layerNode) {
                return item.id === layerNode._layerInfo.originOperLayer.itemId;
              });

              // if ESI Widget service found in map do this
              if (filteredResults.length > 0) {
                // build spatialExtent of found ESI Widget service for use later
                let spatialExtent = new Extent(item.extent[0][0], item.extent[0][1], item.extent[1][0], item.extent[1][1],
                  new SpatialReference({wkid: 4326}));

                // since we need FeatureLayer objects to query the service build that here
                let layers = [], promises = [], tables = [];
                filteredTableResults.forEach(function (table) {
                  tables.push(table._layerInfo.layerObject);
                });
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
                    tables: tables,
                    originalLayer: filteredResults[0]._layerInfo.originOperLayer.layerObject,
                    root_url: filteredResults[0]._layerInfo.originOperLayer.url
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

      getRelatedFromFeature: function (feature) {

        var vm = this;
        vm.EsiData.innerHTML = '';

        //Looping thru each relationship just to be sure we get the targeted relationship.
        feature.getLayer().relationships.forEach(function (relationship) {
          //console.log(relationship);
          let relatedQuery = new RelationshipQuery();
          relatedQuery.outFields = ["*"];
          relatedQuery.relationshipId = relationship.id;
          relatedQuery.objectIds = [feature.attributes.OBJECTID];
          relatedQuery.returnGeometry = true;

          //ESI always has 4 related tables: breed_dt(aka Breed, related to biofile), biofile (aka Status?), soc_bat, and sources
          //Catch each table and create a specific format for each
          //relationship.name
          //To DO:  Need to possibly query sub-relationships if time permits.
          //if biofile need to get breed_dt and sources (two relationships) for each feature.
          //if soc_dat need to get sources (two relationships) for each feature

          //To Do... if biofile get it's related tables and if breed_dt, sources, etc get related featureSets
          //Need to use relationships since the FKs are not exposed in the rest EndPoint.
          // var baseUrl = feature.getLayer().url.split("MapServer/");
          // console.log(baseUrl[0] +"MapServer/"+ relationship.relatedTableId);
          // var relatedTableUrl = baseUrl[0] +"MapServer/"+ relationship.relatedTableId;
          //
          // var fl = new FeatureLayer(relatedTableUrl, {outFields: ['*']});
          //
          // fl.relationships.forEach(function(r){
          //   console.log(r.name)
          // });


          feature.getLayer().queryRelatedFeatures(relatedQuery, function (relatedfeatureSet) {
            //console.log(relatedfeatureSet);
            let fset = relatedfeatureSet[feature.attributes.OBJECTID];
            if (fset !== undefined) {
              formatRelatedData(relationship.name, fset, feature.agol_item);
            }
          }, function (e) {
            //console.log(e);
          });

        });

        function showBreedInfo() {
          // feature.getLayer().relationships


        }

        function formatRelatedData(tableName, featureSet, item) {

          //No aliases are set on the services.  Will need to determine a user-friendly presentation of the data.
          var row;

          if (tableName === 'biofile') {
            row = domConstruct.toDom('<tr><th class="rowLine1" colspan="2">Biological Profile (Found: ' + featureSet.features.length + ')</th></tr>');
            domConstruct.place(row, 'biofile_hd');

            featureSet.features.forEach(function (f) {
              var lifecyclePane = new TitlePane({
                title: 'Lifecycles', open: false, content: ''
              });
              row = domConstruct.toDom('<tr><td>Common Name</td><td>' + f.attributes.NAME + '</td></tr>' +
                (f.attributes.ELEMENT ? '<tr><td>Element</td><td>' + f.attributes.ELEMENT + '</td></tr>' : '') +
                (f.attributes.SUBELEMENT ? '<tr><td>Sub-Element</td><td>' + f.attributes.SUBELEMENT + '</td></tr>' : '') +
                (f.attributes.GEN_SPEC ? '<tr><td>Scientific Name</td><td>' + f.attributes.GEN_SPEC + '</td></tr>' : '') +
                '<tr><td>State & Federal Listing Status</td><td>' + (f.attributes.S_F !== " " ? f.attributes.S_F : 'NA') + '</td></tr>' +
                '<tr><td>Threatened & Endangered Status</td><td>' + (f.attributes.T_E !== " " ? f.attributes.T_E : 'NA') +  '</td></tr>' +
                (f.attributes.CONC ? '<tr><td>Concentration</td><td>' + f.attributes.CONC + '</td></tr>' : '') +
                (f.attributes.SEASSUM ? '<tr><td>Season Summary</td><td>' + f.attributes.SEASSUM + '</td></tr>' : '') +
                //lifecyclePane.domNode +
                '<tr><td colspan="2" id="breed_dt' + f.attributes.OBJECTID + '" ></td></tr>' +
                '<tr><td colspan="2" class="rowLine2"></td></tr>'
              );
              domConstruct.place(row, 'biofile_tbody');
              if(f.attributes.ELEMENT ==='BIRD' || f.attributes.ELEMENT ==='FISH' || f.attributes.ELEMENT ==='INVERT' ||
                f.attributes.ELEMENT ==='REPTILE' || f.attributes.ELEMENT ==='M_MAMMAL' ||
                (f.attributes.ELEMENT ==='T_MAMMAL' && f.attributes.SUBELEMENT ==='coral') ||
                (f.attributes.ELEMENT ==='HABITAT' && f.attributes.SUBELEMENT ==='coral')) {

                dom.byId('breed_dt' + f.attributes.OBJECTID).appendChild(lifecyclePane.domNode);
                lifecyclePane.watch('open', function () {
                  if (this.open && this.get('content') === '') {
                    this.set('content', '<table style="width: 100%">' +
                      '<thead></thead>' +
                      '<tbody id="breed_dt' + f.attributes.OBJECTID + '_tbody"></tbody>' +
                      '</table>');
                    vm.queryBreedTable(f, item, this);
                  }
                });
                lifecyclePane.startup();
              }
            });

          } else if (tableName === 'soc_dat') {
            row = domConstruct.toDom('<tr><th class="rowLine1" colspan="2">Sources Data (Found: ' + featureSet.features.length + ')</th></tr>');
            domConstruct.place(row, 'soc_dat_hd');

            featureSet.features.forEach(function (f) {
              row = domConstruct.toDom('<tr><td>Name</td><td>' + f.attributes.NAME + '</td></tr>' +
                '<tr><td>Type</td><td>' + f.attributes.TYPE + '</td></tr>' +
                '<tr><td>Contact</td><td>' + f.attributes.CONTACT + '</td></tr>' +
                '<tr><td>Phone</td><td>' + f.attributes.PHONE + '</td></tr>' +
                '<tr><td colspan="2" class="rowLine2"></td></tr>'
              );
              domConstruct.place(row, 'soc_dat_tbody');
            });

          } else if (tableName == 'sources') {
            row = domConstruct.toDom('<tr><th class="rowLine1" colspan="2">Sources (Found: ' + featureSet.features.length + ')</th></tr>');
            domConstruct.place(row, 'sources_hd');

            featureSet.features.forEach(function (f) {
              row = domConstruct.toDom('<tr><td>Title</td><td>' + f.attributes.TITLE + '</td></tr>' +
                '<tr><td>Publication</td><td>' + f.attributes.PUBLICATION + '</td></tr>' +
                '<tr><td>Data Format</td><td>' + f.attributes.DATA_FORMAT + '</td></tr>' +
                '<tr><td>Date Published</td><td>' + f.attributes.DATE_PUB + '</td></tr>' +
                '<tr><td>Time Period</td><td>' + f.attributes.TIME_PERIOD + '</td></tr>' +
                '<tr><td colspan="2" class="rowLine2"></td></tr>'
              );
              domConstruct.place(row, 'sources_tbody');
            });

          } else {
            row = domConstruct.toDom('Error Formatting Data For Related Table ' + tableName);
            domConstruct.place(row, 'sdiv');
          }
          //clear or provide error message

        }
      },
      queryBreedTable: function (biofile_feature, item, pane) {
          var biofile_table = dojo.filter(item.tables, function (table) {
            return table.name.indexOf('biofile') > -1;
          })[0];
          biofile_table.relationships.forEach(function (relationship) {
            if (relationship.name === 'breed_dt') {
              var query = new RelationshipQuery();
              query.objectIds = [biofile_feature.attributes.OBJECTID];
              query.outFields = ['*'];
              query.relationshipId = relationship.id;

              biofile_table.queryRelatedFeatures(query, function (featureSet) {
                //var row = domConstruct.toDom('<tr><th class="rowLine1" colspan="2">breed_dt (Found: ' + featureSet[biofile_feature.attributes.OBJECTID].features.length + ')</th></tr>');
                var row = domConstruct.toDom('<tr><th class="rowLine1" colspan="3"></th></tr>');
                domConstruct.place(row, 'breed_dt'+ biofile_feature.attributes.OBJECTID +'_tbody');

                //This is per month, and needs to be formatted so that Breed1-4 are column labeled Lifecycle
                //Rebuild query just for this record at the given OBJECT ID for biofile.  There should be an orderby field

                var months = {1:"January", 2:"February", 3:"March",4:"April",5:"May", 6:"June", 7:"July",
                8:"August", 9:"September", 10:"October", 11:"November",12:"December"};

                featureSet[biofile_feature.attributes.OBJECTID].features.forEach(function (f) {
                  var tableString = '';

                  if(biofile_feature.attributes.ELEMENT === 'BIRD'){
                    //breed1 = 'Nesting'; breed2 = 'Laying'; breed3 = 'Hatching'; 4 Fledging; 5 not used

                    tableString =
                      '<tr><td>' + months[f.attributes.MONTH_] + '</td>' +
                      '<td>Nesting</td><td>' + f.attributes.BREED1 + '</td></tr>' +
                      '<tr><td></td><td>Laying</td><td>' + f.attributes.BREED2 + '</td></tr>' +
                      '<tr><td></td><td>Hatching</td><td>' + f.attributes.BREED3 + '</td></tr>' +
                      '<tr><td></td><td>Fledging</td><td>' + f.attributes.BREED4 + '</td></tr>' +
                      '<tr><td colspan="3" class="rowLine2"></td></tr>'
                    ;
                  }
                  else if (biofile_feature.attributes.ELEMENT === 'FISH'){
                    //breed1 = 'Spawning'; breed2 = 'Eggs'; breed3 = 'Larvae'; 4 Juvenile; 5 Adults
                    tableString =
                      '<tr><td>' + months[f.attributes.MONTH_] + '</td>' +
                      '<td>Spawning</td><td>' + f.attributes.BREED1 + '</td></tr>' +
                      '<tr><td></td><td>Eggs</td><td>' + f.attributes.BREED2 + '</td></tr>' +
                      '<tr><td></td><td>Larvae</td><td>' + f.attributes.BREED3 + '</td></tr>' +
                      '<tr><td></td><td>Juvenile</td><td>' + f.attributes.BREED4 + '</td></tr>' +
                      '<tr><td></td><td>Adults</td><td>' + f.attributes.BREED5 + '</td></tr>' +
                      '<tr><td colspan="3" class="rowLine2"></td></tr>'
                    ;
                  }
                  else if (biofile_feature.attributes.ELEMENT === 'INVERT'){
                    //breed1 = 'Spawning/Mating'; breed2 = 'Eggs'; breed3 = 'Larvae'; 4 Juvenile 5 Adults
                    tableString =
                      '<tr><td>' + months[f.attributes.MONTH_] + '</td>' +
                      '<td>Spawning/Mating</td><td>' + f.attributes.BREED1 + '</td></tr>' +
                      '<tr><td></td><td>Eggs</td><td>' + f.attributes.BREED2 + '</td></tr>' +
                      '<tr><td></td><td>Larvae</td><td>' + f.attributes.BREED3 + '</td></tr>' +
                      '<tr><td></td><td>Juvenile</td><td>' + f.attributes.BREED4 + '</td></tr>' +
                      '<tr><td></td><td>Adults</td><td>' + f.attributes.BREED5 + '</td></tr>' +
                      '<tr><td colspan="3" class="rowLine2"></td></tr>'
                    ;
                  }
                  else if (biofile_feature.attributes.ELEMENT === 'REPTILE'){
                    //breed1 = 'Spawning/Mating'; breed2 = 'Hatching'; breed3 = 'Internesting'; 4 Juvenile; 5 Adults
                    tableString =
                      '<tr><td>' + months[f.attributes.MONTH_] + '</td>' +
                      '<td>Spawning/Mating</td><td>' + f.attributes.BREED1 + '</td></tr>' +
                      '<tr><td></td><td>Hatching</td><td>' + f.attributes.BREED2 + '</td></tr>' +
                      '<tr><td></td><td>Internesting</td><td>' + f.attributes.BREED3 + '</td></tr>' +
                      '<tr><td></td><td>Juvenile</td><td>' + f.attributes.BREED4 + '</td></tr>' +
                      '<tr><td></td><td>Adults</td><td>' + f.attributes.BREED5 + '</td></tr>' +
                      '<tr><td colspan="3" class="rowLine2"></td></tr>'
                    ;
                  }
                  else if (biofile_feature.attributes.ELEMENT === 'M_MAMMAL'){
                    //breed1 = 'Mating'; breed2 = 'Calving'; breed3 = 'Pupping'; 4 Molting  5 not used
                    tableString =
                      '<tr><td>' + months[f.attributes.MONTH_] + '</td>' +
                      '<td>Mating</td><td>' + f.attributes.BREED1 + '</td></tr>' +
                      '<tr><td></td><td>Calving</td><td>' + f.attributes.BREED2 + '</td></tr>' +
                      '<tr><td></td><td>Pupping</td><td>' + f.attributes.BREED3 + '</td></tr>' +
                      '<tr><td></td><td>Molting</td><td>' + f.attributes.BREED4 + '</td></tr>' +
                      '<tr><td colspan="3" class="rowLine2"></td></tr>'
                    ;
                  }
                  else if (biofile_feature.attributes.SUBELEMENT === 'coral' &&
                    (biofile_feature.attributes.ELEMENT === 'T_MAMMAL' || biofile_feature.attributes.ELEMENT === 'HABITAT')){
                    //breed1 = 'Spawning'; breed2 = 'Juvenile';
                    tableString =
                      '<tr><td>' + months[f.attributes.MONTH_] + '</td>' +
                      '<td><td>Spawning</td><td>' + f.attributes.BREED1 + '</td></tr>' +
                      '<tr><td></td><td>Juvenile</td><td>' + f.attributes.BREED2 + '</td></tr>' +
                      '<tr><td colspan="3" class="rowLine2"></td></tr>'
                    ;
                  }
                  else{
                    //breed1 = 'Something';
                  }
                  row = domConstruct.toDom(tableString);

                  domConstruct.place(row, 'breed_dt'+ biofile_feature.attributes.OBJECTID +'_tbody');
                });

              });
            }
          });
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
                featureSet.features.forEach(function (feature) {
                  feature.agol_item = item;
                  vm.foundFeatures.push(feature);
                });
                deferred.resolve();
              }));
          }
        });


        all(promises).then(function () {


          if (vm.foundFeatures.length === 1) {
            //console.log(vm.foundFeatures[0]);
            vm.highlightFeature(vm.foundFeatures[0]);
            vm.EsiData.innerHTML = 'Found 1 thing' + '<br>';


            vm.getRelatedFromFeature(vm.foundFeatures[0]);
            // noneFound.push(false);

          } else if (vm.foundFeatures.length > 1) {
            vm.EsiData.innerHTML = '<h3>Multiple features found</h3><br/><h5>Select one to continue</h5>' +
              '<div id="gridDiv" style="width:100%;"></div>';
            let data = {
              identifier: 'OBJECTID',
              items: []
            };
            //getting object ID error.  Concatenate ibject id + Layer name.
            dojo.forEach(vm.foundFeatures, function (feature) {
              let attrs = dojo.mixin({}, {
                OBJECTID: feature.attributes.OBJECTID + feature.getLayer().name,
                name: feature.getLayer().name,
                feature: feature
              });
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
              if (rowItem) {
                let feature = dojo.filter(vm.foundFeatures, function (feature) {
                  return feature.attributes.OBJECTID + feature.getLayer().name === rowItem.OBJECTID[0];
                });
                // call function to display the feature
                vm.highlightFeature(feature[0]);
              }
            });

            grid.on('RowClick', function (e) {
              let rowItem = grid.getItem(e.rowIndex);
              let feature = dojo.filter(vm.foundFeatures, function (feature) {
                return feature.attributes.OBJECTID + feature.getLayer().name === rowItem.OBJECTID[0];
              });
              // call function to display the feature
              vm.highlightFeature(feature[0]);
              vm.getRelatedFromFeature(feature[0]);
              // use feature[0].getLayer() to get the layer object for this feature and query all of the
              // relationships in the relationships attribute of the layer
            });

            grid.startup();
            // noneFound.push(false);
          } else {
            vm.EsiData.innerHTML = '<h3>No data found at this location</h3><br/>';
          }
          vm.loadingShelter.hide();
        });
      },

      startup: function () {
        this.inherited(arguments);
        //console.log('ESIWidget::startup');
        this.loadingShelter.placeAt(this.domNode);
        this.loadingShelter.show();
        this.findESILayers();
      },
      onOpen: function () {
        //console.log('ESIWidget::onOpen');
        this.map.setInfoWindowOnClick(false);
        var vm = this;
        if (vm.clickHandler !== undefined) {
          vm.clickHandler.resume();
        }
        vm.clearEsiWidgetText();
        vm.EsiData.innerHTML = '<h1>ESI Identify</h1><br/>' +
          '<br/>Click on an ESI Layer to view information.' +
          '<br/><h5 style="text-decoration: underline;">Purpose</h5>' +
          '<br/> The Environmental Sensitivity Index (ESI) data were collected, mapped, and digitized to provide environmental data for oil spill' +
          ' planning and response. The Clean Water Act with amendments by the Oil Pollution Act of 1990' +
          ' requires response plans for immediate and effective protection of sensitive resources.' +
          '<br/><h5 style="text-decoration: underline;">Dataset Notes</h5>' +
          'This data set contains vector arcs and polygons representing coastal hydrography used in the' +
          ' creation of the Environmental Sensitivity Index. The HYDRO data layer' +
          ' contains all annotation used in producing the atlas. The annotation features are categorized into' +
          ' three subclasses in order to simplify the mapping and quality control procedures: GEOG or' +
          ' HYDRO geographic features, SOC or socioeconomic features, and HYDRO or water features. This data set' +
          ' comprises a portion of the ESI for Hawaii, Guam, American Samoa, and California. ESI data characterize the marine and coastal' +
          ' environments and wildlife by their sensitivity to spilled oil. The ESI data include information for' +
          ' three main components: shoreline habitats, sensitive biological resources, and human-use resources.' +
          '</br></br><a href="https://response.restoration.noaa.gov/esi" target="_blank">More ESI information</a>';
      },

      onClose: function () {
        //console.log('ESIWidget::onClose');
        this.clickHandler.pause();
        this.map.graphics.clear();
        this.map.setInfoWindowOnClick(true);
      },

      clearEsiWidgetText: function () {
        dojo.empty('biofile_tbody');
        // dojo.empty('breed_dt_tbody');
        dojo.empty('soc_dat_tbody');
        dojo.empty('sources_tbody');
        dojo.empty('biofile_hd');
        // dojo.empty('breed_dt_hd');
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
