/* global define, dojo, console */
define(['dojo/_base/declare', 'jimu/BaseWidget', 'dijit/_WidgetsInTemplateMixin', 'dojo/Deferred', 'jimu/dijit/LoadingShelter',
    'jimu/LayerInfos/LayerInfos', 'esri/arcgis/Portal', "dojo/_base/array", 'dojox/grid/DataGrid', 'dijit/registry',
    'dojo/data/ItemFileWriteStore', 'esri/layers/FeatureLayer', 'esri/tasks/query', 'dojo/on', 'dojo/dom-style',
    'jimu/SelectionManager', 'esri/symbols/SimpleFillSymbol', 'esri/symbols/SimpleLineSymbol', 'esri/symbols/SimpleMarkerSymbol', 'esri/Color',
    'esri/geometry/Extent', 'esri/SpatialReference', 'dojo/promise/all', 'dojo/parser', 'dijit/layout/TabContainer', 'dijit/Tooltip',
    'dijit/layout/ContentPane', 'dijit/TitlePane', 'jimu/LayerStructure', 'jimu/LayerNode', 'dojo/dom-construct', 'dojo/dom', 'dojo/_base/lang', "dojo/domReady!"],
  function (declare, BaseWidget, _WidgetsInTemplateMixin, Deferred, LoadingShelter, LayerInfos, arcgisPortal, array,
            DataGrid, registry, ItemFileWriteStore, FeatureLayer, Query, on, domStyle, SelectionManager, SimpleFillSymbol, SimpleLineSymbol,
            SimpleMarkerSymbol, Color, Extent, SpatialReference,
            all, parser, TabContainer, Tooltip, ContentPane, TitlePane, LayerStructure, LayerNode, domConstruct, dom, lang) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

      // Custom widget code goes here

      baseClass: 'grp-widget',
      // this property is set by the framework when widget is loaded.
      // name: 'GRPWidget',
      // add additional properties here

      //methods to communication with app container:
      postCreate: function () {
        this.inherited(arguments);
        console.log('GRPWidget::postCreate');

        selectionManager = SelectionManager.getInstance();

      },

      startup: function () {
        this.inherited(arguments);
        console.log('GRPWidget::startup');

        var grpWidgetNode = this.grpWidgetNode,
          that = this;

        that.loadDeferred = new Deferred();

        this.loadingShelter = new LoadingShelter({hidden: true});
        this.loadingShelter.placeAt(this.domNode);

        this.loadingShelter.show();

        var selected_point = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 14,
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1.25),
          new Color([0, 255, 255]));

        function configGRPObject(item, callback) {
          if (item.GRP) {
            callback(item);
            return;
          }

          var grp_tag = array.filter(item.item.tags, function (tag) {
            return tag.indexOf('GRP App:') > -1;
          });
          var config_index = (grp_tag[0] ? grp_tag[0].substring(grp_tag[0].indexOf(':') + 1, grp_tag[0].length) : '5');
          var config_layer = new FeatureLayer(item.item.url + '/' + config_index);
          var config_query = new Query();
          config_query.where = '1=1';
          config_query.outFields = ['*'];

          // item.grpConfig = {};
          var promises = [];
          config_layer.queryFeatures(config_query, function (response) {
            item.GRP = {};
            dojo.forEach(response.features, function (layer) {
              if (layer.attributes.layer_index !== null) {
                item.layers.forEach(function (layer) {
                  layer.getRelatedNodes().then(function (related_layers) {
                    console.log(related_layers);
                  });
                  layer.getLayerObject().then(function (layer_object) {
                    console.log(layer_object);
                  });
                });
                var deferred = new Deferred();
                promises.push(deferred.promise);
                item.GRP[layer.attributes.layer] = {layer: new FeatureLayer(item.url + '/' + layer.attributes.layer_index,
                    {
                      outFields: ['*'],
                      mode: FeatureLayer.MODE_SELECTION
                    })};
                item.GRP[layer.attributes.layer].layer.on('load', function (e) {
                  convertFields(item.GRP[layer.attributes.layer], e.layer.fields);
                  // manually setting selection symbol... not needed with selection manager
                  // if (e.layer.geometryType === 'esriGeometryPoint') item.GRP[layer.attributes.layer].layer.setSelectionSymbol(selected_point);
                  deferred.resolve();
                });
              }
            });
            all(promises).then(function () {
              callback(item);
            });
          });
        }

        function convertFields(item, fields) {
          item.fields = {};
          dojo.forEach(fields, function (field) {
            item.fields[field.name] = field;
          });
        }

        function addToTab(display_fields, item, fields_meta, tab, button) {
          dojo.forEach(display_fields, function (field) {
            if (field !== '') {
              var row = domConstruct.toDom(
                '<tr><td><b>' + fields_meta[field].alias + '</b>:</td><td>' +
                (item.attributes[field] ? item.attributes[field] : '') + '</td></tr>'
              );
            } else {
              var row = domConstruct.toDom('<tr><td><br/><br/></td><td></td></tr>');
            }
            domConstruct.place(row, tab);
          });
          if (button) {
            var btn = domConstruct.toDom('<label id="ts_' + button + '" class="switch"><input id="' + button + '" type="checkbox"><span class="slider round"></span></label>');

            domConstruct.place(btn, tab);

          }
        }

        function displayBoom() {
          console.log("Display Boom");
        }

        function displayAttachments(layer, item, tab) {
          layer.queryAttachmentInfos(item.attributes.OBJECTID, function (attachments) {
            dojo.forEach(attachments, function (attachment) {
              if (attachment.contentType.indexOf('image/') > -1) {
                var row = domConstruct.toDom('<tr><td><a target="_blank" href="' + attachment.url + '">' +
                  '<img style="max-width:100%;" src="' + attachment.url + '"/></a></td></tr>' +
                  '<tr><td><a target="_blank" href="' + attachment.url + '">' + attachment.name + '</a></td></tr>' +
                  '<tr><td><br/><br/></td></tr>');
              } else {
                var row = domConstruct.toDom('<tr><td><a target="_blank" href="' + attachment.url + '">' + attachment.name + '</a></td></tr>' +
                  '<tr><td><br/><br/></td></tr>');
              }
              domConstruct.place(row, tab);
            })
          })
        }

        function getContacts(grpItem, feature, queryContacts, queryWherefield) {
          var relationshipQuery = new Query(),
            deferred = new Deferred();
          relationshipQuery.where = queryWherefield + " = '" + feature.attributes.GlobalID + "'";
          relationshipQuery.outFields = ['*'];

          queryContacts.queryFeatures(relationshipQuery, function (response) {
            var contactsQuery = new Query(),
              where = response.features.map(function (feature) {
                return "GlobalID='" + feature.attributes.Contact_FK + "'";
              });
            contactsQuery.where = where.join(' OR ');
            contactsQuery.outFields = ['*'];

            grpItem.GRP.contacts.layer.queryFeatures(contactsQuery, function (contactResponse) {
              var contacts = contactResponse.features.map(function (contact) {
                convertFields(contact, contactResponse.fields);
                return contact;
              });
              deferred.resolve(contacts);
            });
          });
          return deferred.promise;
        }

        function searchInland(grpItem, featureQuery) {
          var deferred = new Deferred();
          if (!grpItem.GRP.inland_sites.layer) deferred.resolve(false);
          else {
            grpItem.GRP.inland_sites.layer.selectFeatures(featureQuery, FeatureLayer.SELECTION_ADD, function (features) {
              if (features.length === 1) {
                grpItem.GRP.inland_sites.layer.clearSelection();
                selectionManager.clearSelection(grpItem.GRP.inland_sites.layer);
                selectionManager.addFeaturesToSelection(grpItem.GRP.inland_sites.layer, features);
                displayInland(grpItem, features[0]);
                deferred.resolve(true);
              } else deferred.resolve(false);
            });
          }
          return deferred.promise;
        }

        function searchCoastal(item, featureQuery) {
          var deferred = new Deferred();
          if (!item.GRP.coastal_sites.layer) deferred.resolve(false);
          else {
            item.GRP.coastal_sites.layer.selectFeatures(featureQuery, FeatureLayer.SELECTION_ADD, function (features) {
              if (features.length === 1) {
                item.GRP.coastal_sites.layer.clearSelection();
                selectionManager.clearSelection(item.GRP.coastal_sites.layer);
                selectionManager.addFeaturesToSelection(item.GRP.coastal_sites.layer, features);
                // convertFields(featureSet.features[0], featureSet.fields);
                displayCoastal(item, features[0]);
                deferred.resolve(true);
              } else deferred.resolve(false);
            });
          }
          return deferred.promise;
        }

        function searchIAP(item, featureQuery) {
          item.GRP.iaps.layer.queryFeatures(featureQuery, function (featureSet) {
            if (featureSet.features.length === 1) {
              convertFields(featureSet.features[0], featureSet.fields);
              displayIAP(item, featureSet.features[0]);
              console.log(featureSet.features[0]);
            }
          });
        }

        function getStrategiesAndBooms(strategyItem, boomItem, featureGlobalID) {
          //Clear the boom selection if user click on different point
          // Travis: agreed... but this is clearing the selection of the site... which doesn't make sense but...
          // maybe we have to use add remove instead?
          // selectionManager.clearSelection(boomItem.layer);

          var query = new Query();
          query.where = "Site_FK='" + featureGlobalID + "'";
          query.outFields = ['*'];
          strategyItem.layer.queryFeatures(query, function (response) {
            // var fields = {};
            var selectedFeats = [];
            // dojo.forEach(response.fields, function (field) {
            //   fields[field.name] = field;
            // });
            dojo.forEach(response.features, function (strategy) {
              // strategy.fields = fields;
              var boomQuery = new Query();
              boomQuery.where = "Strategy_FK='" + strategy.attributes.GlobalID + "'";
              boomQuery.outFields = ['*'];

              boomItem.layer.queryFeatures(boomQuery, function (boomResponse) {
                // boomItem.selectFeatures(boomQuery, FeatureLayer.SELECTION_NEW, function (boomResponse) {
                selectedFeats = boomResponse;
                // var boomFields = {};
                // dojo.forEach(boomResponse.fields, function (field) {
                //   boomFields[field.name] = field;
                // });
                addToTab(['', 'Name', 'Objective', 'Implementation'], strategy, strategyItem.fields, 'strategiesTab', 'boomsVis_' + strategy.attributes.OBJECTID);

                //Hover tip for toggle all booms in strategy
                new Tooltip({
                  connectId: ['ts_' + 'boomsVis_' + strategy.attributes.OBJECTID],
                  label: "Display Booms"
                });
                //click event for toggle to turn on/off all booms in strategy
                var boomBtn = dom.byId('boomsVis_' + strategy.attributes.OBJECTID);
                on(boomBtn, "click", lang.hitch(selectedFeats.features, showboom));

                var row = domConstruct.toDom('<tr><td colspan="2" id="strategy_' + strategy.attributes.OBJECTID + '_booms"></td></tr>');
                domConstruct.place(row, 'strategiesTab');
                var boomPane = new TitlePane({
                  title: 'Booms', open: false,
                  content: '<table><tbody id="booms_' + strategy.attributes.OBJECTID + '"></tbody></table>'
                });
                dom.byId('strategy_' + strategy.attributes.OBJECTID + '_booms').appendChild(boomPane.domNode);
                boomPane.startup();

                dojo.forEach(boomResponse.features, function (boom) {

                  // boom.fields = boomFields;

                  addToTab(['Boom_Type', 'Boom_Length', 'Boom_Method', 'Boom_Boat', 'Skiffs_Punts', 'Skimmers_No',
                    'Skimmers_Type', 'Anchor_No', 'Staff'], boom, boomItem.fields, 'booms_' + strategy.attributes.OBJECTID, 'boom_' + boom.attributes.OBJECTID);

                  //add hover tip to toggle button for booms
                  new Tooltip({
                    connectId: ['ts_' + 'boom_' + boom.attributes.OBJECTID],
                    label: "Display Boom"
                  });
                  //click event for making an individual boom visible
                  var boomBtn = dom.byId('boom_' + boom.attributes.OBJECTID);
                  on(boomBtn, "click", lang.hitch(boom, showboom));

                });
              });
            });
          });
          that.loadingShelter.hide();
          that.tabContainer.resize();
        }

        function getObjectives(CategoryItem, ObjectiveItem, featureGlobalID) {

          var query = new Query();
          query.where = "ActionPlan_FK='" + featureGlobalID + "'";
          query.outFields = ['*'];
          CategoryItem.layer.queryFeatures(query, function (response) {
            // var fields = {};
            var selectedFeats = [];
            // dojo.forEach(response.fields, function (field) {
            //   fields[field.name] = field;
            // });
            dojo.forEach(response.features, function (cat) {
              // cat.fields = fields;
              //addToTab(['Category'], cat, 'objectivesIAPTab', null);

              //title pane
              var row = domConstruct.toDom('<tr><td colspan="2" id="objective_' + cat.attributes.OBJECTID + '"></td></tr>');
              domConstruct.place(row, 'objectivesIAPTab');
              var boomPane = new TitlePane({
                title: cat.attributes.Category, open: false,
                content: '<table><tbody id="obj_' + cat.attributes.OBJECTID + '"></tbody></table>'
              });
              dom.byId('objective_' + cat.attributes.OBJECTID).appendChild(boomPane.domNode);
              boomPane.startup();

              var catQuery = new Query();
              catQuery.where = "Category_FK='" + cat.attributes.GlobalID + "'";
              catQuery.outFields = ['*'];

              ObjectiveItem.layer.queryFeatures(catQuery, function (objResponse) {
                console.log("this is objectives");

                // var Objfields = {};
                //
                // dojo.forEach(objResponse.fields, function (field) {
                //   Objfields[field.name] = field;
                // });
                dojo.forEach(objResponse.features, function (obj) {
                  // obj.fields = Objfields;
                  addToTab(['Objective', ''], obj, ObjectiveItem.fields, 'obj_' + cat.attributes.OBJECTID, null);
                });
              });
            });
            that.loadingShelter.hide();
            that.tabContainer.resize();
          });
        }

        function getWorkAnalysisMatrix(CategoryItem, featureGlobalID) {
          var query = new Query();
          query.where = "ActionPlan_FK='" + featureGlobalID + "'";
          query.orderByFields = ['SortOrder'];
          query.outFields = ['*'];
          CategoryItem.layer.queryFeatures(query, function (response) {
            // var fields = {};
            var selectedFeats = [];
            // dojo.forEach(response.fields, function (field) {
            //   fields[field.name] = field;
            // });
            dojo.forEach(response.features, function (wamObjective) {
              // wamObjective.fields = fields;
              // addToTab(['Text'], cat, 'matrixIAPTab', null);

              //title pane
              var row = domConstruct.toDom('<tr><td colspan="2" id="wamObj_' + wamObjective.attributes.OBJECTID + '"></td></tr>');
              domConstruct.place(row, 'matrixIAPTab');
              var boomPane = new TitlePane({
                title: 'Objective', open: false,
                content: '<table><tbody id="WAM_' + wamObjective.attributes.OBJECTID + '"></tbody></table>'
              });
              dom.byId('wamObj_' + wamObjective.attributes.OBJECTID).appendChild(boomPane.domNode);
              boomPane.startup();

              addToTab(['Text'], wamObjective, CategoryItem.fields, 'WAM_' + wamObjective.attributes.OBJECTID, null);

            });
            that.loadingShelter.hide();
            that.tabContainer.resize();
          });
        }

        function getAssignments(assignmentItem, resourceItem, featureGlobalID) {

          var query = new Query();
          query.where = "ActionPlan_FK='" + featureGlobalID + "'";
          query.outFields = ['*'];
          assignmentItem.layer.queryFeatures(query, function (response) {
            var fields = {};
            var selectedFeats = [];
            dojo.forEach(response.fields, function (field) {
              fields[field.name] = field;
            });
            // dojo.forEach(response.features, function (strategy) {
            //   strategy.fields = fields;
            //   var boomQuery = new Query();
            //   boomQuery.where = "Strategy_FK='"+strategy.attributes.GlobalID+"'";
            //   boomQuery.outFields = ['*'];
            //
            //   boomItem.queryFeatures(boomQuery, function (boomResponse) {
            //     // boomItem.selectFeatures(boomQuery, FeatureLayer.SELECTION_NEW, function (boomResponse) {
            //     selectedFeats = boomResponse;
            //     var boomFields = {};
            //     dojo.forEach(boomResponse.fields, function (field) {
            //       boomFields[field.name] = field;
            //     });
            //     addToTab(['', 'Name', 'Objective', 'Implementation'], strategy, 'strategiesTab', 'boomsVis_' + strategy.attributes.OBJECTID);
            //
            //     var row = domConstruct.toDom('<tr><td colspan="2" id="strategy_'+strategy.attributes.OBJECTID+'_booms"></td></tr>');
            //     domConstruct.place(row, 'strategiesTab');
            //     var boomPane = new TitlePane({title:'Booms', open: false,
            //       content:'<table><tbody id="booms_'+strategy.attributes.OBJECTID+'"></tbody></table>'});
            //     dom.byId('strategy_'+strategy.attributes.OBJECTID+'_booms').appendChild(boomPane.domNode);
            //     boomPane.startup();
            //
            //     dojo.forEach(boomResponse.features, function (boom) {
            //
            //       boom.fields = boomFields;
            //
            //       // addToTab(['Boom_Type', 'Boom_Length', 'Boom_Method', 'Boom_Boat', 'Skiffs_Punts', 'Skimmers_No',
            //       //   'Skimmers_Type', 'Anchor_No', 'Staff'], boom, 'booms_'+strategy.attributes.OBJECTID, 'boom_' + boom.attributes.OBJECTID);
            //
            //     })
            //   });
            // });
          });
          that.loadingShelter.hide();
          that.tabContainer.resize();
        }

        function showAllBoomsInStrategy(e) {
          console.log("big booms");
          //showboom(e);
        }

        function showboom(s) {
          if (this.length) {
            if (s.target.checked) {
              // selectionManager.addFeaturesToSelection(this[0]._layer, this);
              this.forEach(function (b) {
                var boomBtn = dom.byId('boom_' + b.attributes.OBJECTID);
                boomBtn.checked = true;
                b.visible = true;
              });
            } else {
              // selectionManager.removeFeaturesFromSelection(this[0]._layer, this)
              this.forEach(function (b) {
                var boomBtn = dom.byId('boom_' + b.attributes.OBJECTID);
                boomBtn.checked = false;
                b.visible = false;
              });
            }

          } else {
            var booms = [];
            booms.push(this);
            if (s.currentTarget.checked) {
              // selectionManager.addFeaturesToSelection(this._layer, booms);
              this.visible = true;
            } else {
              this.visible = false;
              // selectionManager.removeFeaturesFromSelection(this._layer, booms)
            }
          }
        }

        function displayCoastal(grpItem, feature) {
          clearAllTabs();
          var siteTabContainer = dom.byId('siteTabs');
          domStyle.set(siteTabContainer, 'display', 'block');

          var iapTabContainer = dom.byId('iapTabs');
          domStyle.set(iapTabContainer, 'display', 'none');

          //General Tabl
          addToTab(['Name', 'Other_Name', 'Site_ID', 'USGS_Quad', 'QUAD_Name', 'GRP_Map_No',
            'Access_Comments', 'General_Location',
            'Physical_Description', 'Managed_Area'], feature, grpItem.GRP.coastal_sites.fields, 'generalSiteTab');
          //Resource Tab
          addToTab(['Threatened_Species', 'Resources_Comments', 'Habitat', 'Wildlife',
            'Cultural_Priority', 'Historic_Priority', 'Socioeconomic_Priority', 'Archaeological_Priority',
            'Cultural_Comments', 'Hazards', 'Restrictions', 'Hazards_Comments'], feature, grpItem.GRP.coastal_sites.fields, 'resourceTab');
          //logistics Tab
          addToTab(['Directions', 'Access_Comments', 'Staging', 'Communications_Comments',
            'Limitations', 'Launching', 'Water_Comments', ''], feature, grpItem.GRP.coastal_sites.fields, 'logisticsTab');
          //Contacts Tab
          //may need to add something if there is no contacts
          getContacts(grpItem, feature, grpItem.GRP.coastal_contacts.layer, 'Site_FK').then(function (contacts) {
            dojo.forEach(contacts, function (contact) {
              addToTab(['Name', 'Title', 'Organization', 'Organization_Type', 'Phone', 'EmergencyPhone', 'Email', ''],
                contact, grpItem.GRP.contacts.fields, 'siteContactsTab');
            });
          });
          //Attachments Tab
          //May need to add functionality when there are no attachments
          displayAttachments(grpItem.GRP.coastal_sites.layer, feature, 'siteAttachmentsTab');
          //Strategies Tab
          addToTab(['Site_Strategy_Comments'], feature, grpItem.GRP.coastal_sites.fields, 'strategiesTab');

          getStrategiesAndBooms(grpItem.GRP.coastal_strategies, grpItem.GRP.coastal_booms, feature.attributes.GlobalID);

        }

        function clearAllTabs() {
          dojo.empty('generalSiteTab');
          dojo.empty('resourceTab');
          dojo.empty('logisticsTab');
          dojo.empty('siteContactsTab');
          dojo.empty('siteAttachmentsTab');
          dojo.empty('strategiesTab');

          dojo.empty('generalIAPTab');
          dojo.empty('objectivesIAPTab');
          dojo.empty('matrixIAPTab');
          dojo.empty('listsIAPTab');
          dojo.empty('contactIAPTab');
          dojo.empty('icpIAPTab');
          dojo.empty('medicalIAPTab');
          dojo.empty('attachmentsIAPTab');
        }

        function displayInland(grpItem, feature) {
          clearAllTabs();
          var siteTabContainer = dom.byId('siteTabs');
          domStyle.set(siteTabContainer, 'display', 'block');

          var iapTabContainer = dom.byId('iapTabs');
          domStyle.set(iapTabContainer, 'display', 'none');

          addToTab(['Name', 'Other_Name', 'Site_ID', 'USGS_Quad_Num', 'USGS_Quad_Name', 'GRP_Map_No',
            'Access_Agreement', 'General_Location', 'Access_Crossing', 'River_Miles', 'RR_Mile_Marker', 'Highway_Milepost',
            'Physical_Description', 'Waterway_Characteristics', 'Water_Width_and_Depths', 'Gaging_Station_Link',
            'Gaging_Station_Contact', 'Max_Current', 'Managed_Area'], feature, grpItem.GRP.inland_sites.fields, 'generalSiteTab');

          addToTab(['Water_Intakes', 'Listed_T_E_Species', 'Special_Resource_Comments', 'General_Habitat_and_Wildlife',
            'T_E_Species_of_Special_Concern', 'Cultural_Historic_Socio_Archeo_', 'Additional_Site_Concerns_and_Ad',
            'Additional_Site_Hazards_and_Res'], feature, grpItem.GRP.inland_sites.fields, 'resourceTab');

          addToTab(['Directions', 'Land_Access', 'Facilities_StagingAreas_FieldPo', 'Communication_Issues',
            'Water_Logistics_Limitation', 'Water_Logistics_Launching_Loadi'], feature, grpItem.GRP.inland_sites.fields, 'logisticsTab');

          getContacts(grpItem, feature, grpItem.GRP.inland_contacts.layer, 'Site_FK').then(function (contacts) {
            dojo.forEach(contacts, function (contact) {
              addToTab(['Name', 'Title', 'Organization', 'Organization_Type', 'Phone', 'EmergencyPhone', 'Email', ''],
                contact, grpItem.GRP.contacts.fields, 'siteContactsTab');
            });
          });

          displayAttachments(grpItem.GRP.inland_sites.layer, feature, 'siteAttachmentsTab');

          addToTab(['Strategies_Comments'], feature, grpItem.GRP.inland_sites.fields, 'strategiesTab');

          getStrategiesAndBooms(grpItem.GRP.inland_strategies, grpItem.GRP.inland_booms, feature.attributes.GlobalID);

        }

        function displayIAP(grpItem, feature) {
          //need to add function to clear tabs

          console.log(grpItem);
          var siteTabContainer = dom.byId('siteTabs');
          domStyle.set(siteTabContainer, 'display', 'none');

          var iapTabContainer = dom.byId('iapTabs');
          domStyle.set(iapTabContainer, 'display', 'block');

          that.tabContainerB.resize();
          //General Tab
          addToTab(['Name', 'ShortName', 'ExecutiveSummary'], feature, 'generalIAPTab');
          //Objectives Tab
          getObjectives(grpItem.GRP.ics202_categories.layer, grpItem.GRP.ics202_objectives.layer, feature.attributes.GlobalID);
          //Work Analysis Matrix
          getWorkAnalysisMatrix(grpItem.GRP.ics_234_objectives.layer, feature.attributes.GlobalID);
          //Contacts
          getContacts(grpItem, feature, grpItem.GRP.iap_contacts.layer, 'ActionPlan_FK').then(function (contacts) {
            dojo.forEach(contacts, function (contact) {
              addToTab(['Name', 'Title', 'Organization', 'Organization_Type', 'Phone', 'EmergencyPhone', 'Email', ''],
                contact, 'contactIAPTab');
            });
          });
          //Assignment List
          //getAssignments(grpItem.GRP.ics204_assignments.layer, grpItem.GRP.inland_booms.layer, feature.attributes.GlobalID);


          //add tab
          // new ContentPane({
          //   content:"<p>Optionally set new content now</p>",
          //   title:"New Tab",
          // }, tabCont).startup();
          //tabCont.addChild()
        }

        var layerInfosDeferred = new Deferred(), portalItemsDeferred = new Deferred();
        this.grpItems = [];
        all({portalItems: portalItemsDeferred.promise}).then(
          function (results) {
            dojo.forEach(results.portalItems, function (item) {
              item.grpLayers = [];
              var structure = LayerStructure.getInstance();
              var filteredResults = dojo.filter(structure.getLayerNodes(), function (layerNode) {
                return item.id === layerNode._layerInfo.originOperLayer.itemId;
              });
              if (filteredResults.length > 0) {
                var spatialExtent = new Extent(item.extent[0][0], item.extent[0][1], item.extent[1][0], item.extent[1][1],
                  new SpatialReference({wkid: 4326}));
                that.grpItems.push({item: item, spatialExtent: spatialExtent, layers: filteredResults});
              }
            });

            that.clickHandler = on.pausable(that.map, "click", function (e) {
              // that.loadingShelter.show();
              // that.graphicLayer.clear();
              // var pixelWidth = that.map.extent.getWidth() / that.map.width;
              that.loadingShelter.show();
              var pixelWidth = that.map.extent.getWidth() / that.map.width;
              var toleraceInMapCoords = 10 * pixelWidth;
              var clickExtent = new Extent(e.mapPoint.x - toleraceInMapCoords,
                e.mapPoint.y - toleraceInMapCoords,
                e.mapPoint.x + toleraceInMapCoords,
                e.mapPoint.y + toleraceInMapCoords,
                that.map.spatialReference);

              var featureQuery = new Query();
              featureQuery.outFields = ['*'];
              featureQuery.geometry = clickExtent;

              dojo.forEach(that.grpItems, function (item) {
                if (item.spatialExtent.contains(e.mapPoint)) {
                  configGRPObject(item, function (item) {
                    var coastalPromise = searchCoastal(item, featureQuery);
                    var inlandPromise = searchInland(item, featureQuery);

                    all({coastal: coastalPromise, inland: inlandPromise})
                      .then(function (results) {
                        // todo: this feature query like doesn't work for IAP
                        if (!results.coastal && !results.inland) searchIAP(item, featureQuery);
                        that.loadingShelter.hide();
                      });
                  });
                }
              });
            });
            that.loadingShelter.hide();
          });

        LayerInfos.getInstance(that.map, that.map.itemInfo).then(function (layerInfosObject) {
          layerInfosDeferred.resolve(layerInfosObject);
        });

        var epaPortal = new arcgisPortal.Portal("https://epa.maps.arcgis.com");
        epaPortal.signIn().then(function () {
          epaPortal.queryItems({q: 'tags: "GRP App" type:"Feature Service"', num: 100}).then(function (response) {
            portalItemsDeferred.resolve(response.results);
          });
        });
      },
      onOpen: function () {
        console.log('GRPWidget::onOpen');
        this.map.setInfoWindowOnClick(false);
      },

      onClose: function () {
        console.log('GRPWidget::onClose');
        this.map.setInfoWindowOnClick(true);

        //selectionManager.clearSelection(this.grpItems[0].GRP.coastal_booms);
      },

      displayBoom: function () {
        console.log("finally made that");
      }
      // onMinimize: function(){
      //   console.log('GRPWidget::onMinimize');
      // },

      // onMaximize: function(){
      //   console.log('GRPWidget::onMaximize');
      // },

      // onSignIn: function(credential){
      //   console.log('GRPWidget::onSignIn', credential);
      // },

      // onSignOut: function(){
      //   console.log('GRPWidget::onSignOut');
      // }

      // onPositionChange: function(){
      //   console.log('GRPWidget::onPositionChange');
      // },

      // resize: function(){
      //   console.log('GRPWidget::resize');
      // }

      //methods to communication between widgets:


    });
  });
