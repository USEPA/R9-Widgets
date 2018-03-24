/* global define, dojo, console */
define(['dojo/_base/declare', 'jimu/BaseWidget', 'dijit/_WidgetsInTemplateMixin', 'dojo/Deferred', 'jimu/dijit/LoadingShelter',
    'jimu/LayerInfos/LayerInfos', 'esri/arcgis/Portal', "dojo/_base/array", 'dojox/grid/DataGrid', 'dijit/registry',
    'dojo/data/ItemFileWriteStore', 'esri/layers/FeatureLayer', 'esri/tasks/query', 'dojo/on', 'dojo/dom-style',
    'jimu/SelectionManager', 'esri/symbols/SimpleFillSymbol', 'esri/symbols/SimpleLineSymbol', 'esri/symbols/SimpleMarkerSymbol', 'esri/Color',
    'esri/geometry/Extent', 'esri/SpatialReference', 'dojo/promise/all', 'dojo/parser', 'dijit/layout/TabContainer', 'dijit/Tooltip',
    'dijit/layout/ContentPane', 'dijit/TitlePane', 'jimu/LayerStructure', 'jimu/LayerNode', 'esri/tasks/PrintTask', 'esri/tasks/Geoprocessor',
    'dojo/json', 'dojo/dom-construct', 'dojo/dom', 'dojo/_base/lang', "dojo/domReady!"],
  function (declare, BaseWidget, _WidgetsInTemplateMixin, Deferred, LoadingShelter, LayerInfos, arcgisPortal, array,
            DataGrid, registry, ItemFileWriteStore, FeatureLayer, Query, on, domStyle, SelectionManager, SimpleFillSymbol, SimpleLineSymbol,
            SimpleMarkerSymbol, Color, Extent, SpatialReference,
            all, parser, TabContainer, Tooltip, ContentPane, TitlePane, LayerStructure, LayerNode, PrintTask, Geoprocessor,
            JSON, domConstruct, dom, lang) {
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

        this.selectionManager = SelectionManager.getInstance();

      },

      startup: function () {
        var vm = this;
        vm.inherited(arguments);
        console.log('GRPWidget::startup');

        // var grpWidgetNode = vm.grpWidgetNode;

        vm.loadDeferred = new Deferred();

        vm.loadingShelter = new LoadingShelter({hidden: true});
        vm.loadingShelter.placeAt(vm.domNode);

        vm.loadingShelter.show();

        // Not needed if using selection manager
        // var selected_point = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 14,
        //   new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1.25),
        //   new Color([0, 255, 255]));

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
            LayerStructure.getInstance().traversal(function (layerNode) {
              promises.push(layerNode.getLayerObject().then(function (map_layer_object) {
                response.features.forEach(function (config_layer) {
                  if (map_layer_object.url === item.item.url + '/' + config_layer.attributes.layer_index) {
                    item.GRP[config_layer.attributes.layer] = {layer: map_layer_object};
                    convertFields(item.GRP[config_layer.attributes.layer], map_layer_object.fields);
                  }
                });
              }));
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
          var row;
          dojo.forEach(display_fields, function (field, index) {
            if (field !== '') {
              if (button) {
                if (index === 0) {
                  row = domConstruct.toDom('<tr><td><b>' + fields_meta[field].alias + '</b>:</td>' +
                    '<td>' + (item.attributes[field] ? item.attributes[field] : '') + '</td>' +
                    '<td style="text-align: right;"><label id="ts_' + button + '" class="switch">' +
                    '<input id="' + button + '" type="checkbox">' +
                    '<span class="slider round"></span>' +
                    '</label></td></tr>');
                } else {
                  row = domConstruct.toDom(
                    '<tr><td><b>' + fields_meta[field].alias + '</b>:</td><td colspan="2">' +
                    (item.attributes[field] ? item.attributes[field] : '') + '</td></tr>'
                  );
                }
              } else {
                if (field == 'EMT' || field == 'BurnCenter' || field == 'Helipad') {
                  var val = item.attributes[field] ? item.attributes[field] : '';
                  var reVal;
                  if (val == '1') {
                    reVal = 'Yes'
                  } else {
                    reVal = 'No'
                  }

                  row = domConstruct.toDom(
                    '<tr><td><b>' + fields_meta[field].alias + '</b>:</td><td>' +
                    reVal + '</td></tr>'
                  );

                } else {
                  row = domConstruct.toDom(
                    '<tr><td><b>' + fields_meta[field].alias + '</b>:</td><td>' +
                    (item.attributes[field] ? item.attributes[field] : '') + '</td></tr>'
                  );
                }

              }
            } else {
              row = domConstruct.toDom('<tr><td><br/><br/></td><td></td></tr>');
            }
            domConstruct.place(row, tab);
          });
        }

        function displayAttachments(layer, item, tab) {
          var row;
          layer.queryAttachmentInfos(item.attributes.OBJECTID, function (attachments) {
            dojo.forEach(attachments, function (attachment) {
              if (attachment.contentType.indexOf('image/') > -1) {
                row = domConstruct.toDom('<tr><td><a target="_blank" href="' + attachment.url + '">' +
                  '<img style="max-width:100%;" src="' + attachment.url + '"/></a></td></tr>' +
                  '<tr><td><a target="_blank" href="' + attachment.url + '">' + attachment.name + '</a></td></tr>' +
                  '<tr><td><br/><br/></td></tr>');
              } else {
                row = domConstruct.toDom('<tr><td><a target="_blank" href="' + attachment.url + '">' + attachment.name + '</a></td></tr>' +
                  '<tr><td><br/><br/></td></tr>');
              }
              domConstruct.place(row, tab);
            });
          });
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

        function setPrintConfig(grpItem, service_location, item) {
          var print_services = {
              coastal: 'https://utility.arcgis.com/usrsvcs/servers/bbb2a09a111e45e1a210e9e9f9e669e7/rest/services/R9GIS/CoastalZoneReport/GPServer/CoastalZoneReport',
              inland: 'https://utility.arcgis.com/usrsvcs/servers/e386a76752a543e094d24b44ea347b6e/rest/services/R9GIS/GRPInlandZoneReport/GPServer/InlandZoneReport',
              iap: 'https://utility.arcgis.com/usrsvcs/servers/8fec0d610af54407990746c0f16a1fef/rest/services/R9GIS/IAPReport/GPServer/IAPReport'
            },
            grp_tag = array.filter(grpItem.item.tags, function (tag) {
              return tag.indexOf('GRP App:') > -1;
            });
          vm.print_service = print_services[service_location];
          vm.print_params = {
            config_index: (grp_tag[0] ? grp_tag[0].substring(grp_tag[0].indexOf(':') + 1, grp_tag[0].length) : '5'),
            service_root: grpItem.item.url + '/',
            globalid: item.attributes.GlobalID
          };
          console.log(grpItem);
        }

        function searchInland(grpItem, featureQuery) {
          var deferred = new Deferred();
          if (!grpItem.GRP.inland_sites.layer) deferred.resolve(false);
          else {
            grpItem.GRP.inland_sites.layer.selectFeatures(featureQuery, FeatureLayer.SELECTION_ADD, function (features) {
              if (features.length === 1) {
                // grpItem.GRP.inland_sites.layer.clearSelection();
                // vm.selectionManager.clearSelection(grpItem.GRP.inland_sites.layer);
                vm.selectionManager.addFeaturesToSelection(grpItem.GRP.inland_sites.layer, features);
                displayInland(grpItem, features[0]);
                setPrintConfig(grpItem, 'inland', features[0]);
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
                // item.GRP.coastal_sites.layer.clearSelection();
                // vm.selectionManager.clearSelection(item.GRP.coastal_sites.layer);
                vm.selectionManager.addFeaturesToSelection(item.GRP.coastal_sites.layer, features);
                // convertFields(featureSet.features[0], featureSet.fields);
                displayCoastal(item, features[0]);
                vm.current_globalid = features[0].attributes.GlobalID;
                setPrintConfig(item, 'coastal', features[0]);
                deferred.resolve(true);
              } else deferred.resolve(false);
            });
          }
          return deferred.promise;
        }

        function searchIAP(item, featureQuery) {
          item.GRP.iaps.layer.queryFeatures(featureQuery, function (featureSet) {
            if (featureSet.features.length === 1) {
              // convertFields(featureSet.features[0], featureSet.fields);
              vm.selectionManager.addFeaturesToSelection(item.GRP.iaps.layer, featureSet.features);
              displayIAP(item, featureSet.features[0]);
              vm.current_globalid = featureSet.features[0].attributes.GlobalID;
              setPrintConfig(item, 'iap', featureSet.features[0]);
            }
          });
        }

        function getStrategiesAndBooms(strategyItem, boomItem, featureGlobalID) {
          var query = new Query();
          query.where = "Site_FK='" + featureGlobalID + "'";
          query.outFields = ['*'];
          strategyItem.layer.queryFeatures(query, function (response) {
            var selectedFeats = [];

            dojo.forEach(response.features, function (strategy) {
              var boomQuery = new Query();
              boomQuery.where = "Strategy_FK='" + strategy.attributes.GlobalID + "'";
              boomQuery.outFields = ['*'];

              boomItem.layer.queryFeatures(boomQuery, function (boomResponse) {
                selectedFeats = boomResponse;
                addToTab(['Name', 'Objective', 'Implementation'], strategy, strategyItem.fields, 'strategiesTab', 'boomsVis_' + strategy.attributes.OBJECTID);

                //Hover tip for toggle all booms in strategy
                new Tooltip({
                  connectId: ['ts_' + 'boomsVis_' + strategy.attributes.OBJECTID],
                  label: "Display Booms"
                });
                //click event for toggle to turn on/off all booms in strategy
                var allBoomBtn = dom.byId('boomsVis_' + strategy.attributes.OBJECTID);
                on(allBoomBtn, "click", lang.hitch(selectedFeats.features, showboom));


                var row = domConstruct.toDom('<tr><td colspan="3" id="strategy_' + strategy.attributes.OBJECTID + '_booms"></td></tr>');
                domConstruct.place(row, 'strategiesTab');
                var boomPane = new TitlePane({
                  title: 'Booms', open: false,
                  content: '<table style="width: 100%"><tbody id="booms_' + strategy.attributes.OBJECTID + '"></tbody></table>'
                });
                dom.byId('strategy_' + strategy.attributes.OBJECTID + '_booms').appendChild(boomPane.domNode);
                boomPane.startup();

                dojo.forEach(boomResponse.features, function (boom) {

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
                // probably a better way but this will turn on all booms by default, Travis
                allBoomBtn.click();
              });
            });
          });
          vm.loadingShelter.hide();
          vm.tabContainer.resize();
        }

        function addExpandingPane(paneTitle, rowID, panetable, tabID ){
          var row = domConstruct.toDom('<tr><td colspan="2" id="' + rowID + '"></td></tr>');
          domConstruct.place(row, tabID);
          var pane = new TitlePane({
            title: paneTitle, open: false,
            content: '<table><tbody id="' + panetable + '"></tbody></table>'
          });
          dom.byId(rowID).appendChild(pane.domNode);
          pane.startup();
        }

        function getObjectives(CategoryItem, ObjectiveItem, featureGlobalID) {

          var query = new Query();
          query.where = "ActionPlan_FK='" + featureGlobalID + "'";
          query.outFields = ['*'];
          CategoryItem.layer.queryFeatures(query, function (response) {
            // var fields = {};
            var selectedFeats = [];

            dojo.forEach(response.features, function (cat) {
              //Expanding pane
              addExpandingPane(cat.attributes.Category, 'objective_' + cat.attributes.OBJECTID, 'obj_' + cat.attributes.OBJECTID, 'objectivesIAPTab');
              // var row = domConstruct.toDom('<tr><td colspan="2" id="objective_' + cat.attributes.OBJECTID + '"></td></tr>');
              // domConstruct.place(row, 'objectivesIAPTab');
              // var objectivePane = new TitlePane({
              //   title: cat.attributes.Category, open: false,
              //   content: '<table><tbody id="obj_' + cat.attributes.OBJECTID + '"></tbody></table>'
              // });
              // dom.byId('objective_' + cat.attributes.OBJECTID).appendChild(objectivePane.domNode);
              // objectivePane.startup();

              var catQuery = new Query();
              catQuery.where = "Category_FK='" + cat.attributes.GlobalID + "'";
              catQuery.outFields = ['*'];

              ObjectiveItem.layer.queryFeatures(catQuery, function (objResponse) {

                dojo.forEach(objResponse.features, function (obj) {

                  addToTab(['Objective', ''], obj, ObjectiveItem.fields, 'obj_' + cat.attributes.OBJECTID, null);
                });
              });
            });
            vm.loadingShelter.hide();
            vm.tabContainer.resize();
          });
        }

        function getWorkAnalysisMatrix(CategoryItem, featureGlobalID) {
          var query = new Query();
          query.where = "ActionPlan_FK='" + featureGlobalID + "'";
          query.orderByFields = ['SortOrder'];
          query.outFields = ['*'];
          CategoryItem.layer.queryFeatures(query, function (response) {

            var selectedFeats = [];

            dojo.forEach(response.features, function (wamObjective) {
              var objectNum = wamObjective.attributes.SortOrder + 1;
              //Expanding pane
              addExpandingPane('Objective' + ' '+  objectNum, 'wamObj_' + wamObjective.attributes.OBJECTID, 'WAM_' + wamObjective.attributes.OBJECTID, 'matrixIAPTab');

              addToTab(['Text'], wamObjective, CategoryItem.fields, 'WAM_' + wamObjective.attributes.OBJECTID, null);
            });
            vm.loadingShelter.hide();
            vm.tabContainer.resize();
          });
        }

        function getAssignments(assignmentItem, resourceItem, featureGlobalID) {

          var query = new Query();
          query.where = "ActionPlan_FK='" + featureGlobalID + "'";
          query.outFields = ['*'];
          assignmentItem.layer.queryFeatures(query, function (response) {

            dojo.forEach(response.features, function (assignment) {
              //TitlePane
              addExpandingPane(assignment.attributes.Agency, 'assign_' + assignment.attributes.OBJECTID, 'a_' + assignment.attributes.OBJECTID, 'listsIAPTab');

              addToTab(['Agency', '', 'GeneralResponsibilities', '', 'IncidentAssignments', '', 'SpecialInstructions', '', 'AdditionalInfo'], assignment, assignmentItem.fields, 'a_' + assignment.attributes.OBJECTID, null);
            });
          });
          vm.loadingShelter.hide();
          vm.tabContainer.resize();
        }

        function getIncidentCommPlan(icpItem, contactsItem, featureGlobalID) {
          var types = ['Command', 'Staff', 'Chief'];

          dojo.forEach(types, function (type) {
            var title = '';
            if (type == 'Command') {
              title = 'Incident Command/Unified Command';
            } else if (type == 'Staff') {
              title = 'Command Staff';
            } else if (type == 'Chief') {
              title = 'Section Chiefs';
            }
            //Expanding Pane
            addExpandingPane(title, 'commType_' + type, 'i_' + type, 'icpIAPTab');
          });

          var query = new Query();
          query.where = "ActionPlan_FK='" + featureGlobalID + "'";
          query.outFields = ['*'];

          icpItem.layer.queryFeatures(query, function (response) {

            dojo.forEach(response.features, function (assignment) {
              addToTab(['Position', 'Team'], assignment, icpItem.fields, 'i_' + assignment.attributes.Team, null);

              var contactsQuery = new Query();
              contactsQuery.where = "GlobalID='" + assignment.attributes.Contact_FK + "'";
              contactsQuery.outFields = ['*'];
              contactsItem.layer.queryFeatures(contactsQuery, function (response) {
                dojo.forEach(response.features, function (contact) {
                  addToTab(['Name', 'Title', 'Organization', 'Organization_Type', 'Phone', 'EmergencyPhone', 'Email'], contact, contactsItem.fields, 'i_' + assignment.attributes.Team, null);
                });
              });
            });
          });

          vm.loadingShelter.hide();
          vm.tabContainer.resize();
        }

        function getMedicalActionPlan(medItem, featureGlobalID) {
          var types = ['firstaid', 'transportation', 'hospital'];

          dojo.forEach(types, function (type) {
            var title = '';
            if (type == 'firstaid') {
              title = 'First Aid Stations';
            } else if (type == 'transportation') {
              title = 'Transportation (Ground and/or Ambulance Services)';
            } else if (type == 'hospital') {
              title = 'Hospitals';
            }
            //Expanding Pand
            addExpandingPane(title, 'medPlan_' + type, 'm_' + type, 'medicalIAPTab');
          });

          var query = new Query();
          query.where = "ActionPlan_FK='" + featureGlobalID + "'";
          query.outFields = ['*'];

          medItem.layer.queryFeatures(query, function (response) {
            console.log("here");
            dojo.forEach(response.features, function (medicalPlan) {
              if (medicalPlan.attributes.Type == "firstaid" || medicalPlan.attributes.Type == "transportation") {
                addToTab(['Name', 'Location', 'EMT', 'Phone', 'Radio'], medicalPlan, medItem.fields, 'm_' + medicalPlan.attributes.Type, null);

                console.log("What is this");
              } else {
                addToTab(['Name', 'Location', 'EMT', 'Helipad', 'Phone', 'Radio'], medicalPlan, medItem.fields, 'm_' + medicalPlan.attributes.Type, null);
              }
            });
          });
          vm.loadingShelter.hide();
          vm.tabContainer.resize();
        }

        function showAllBoomsInStrategy(e) {
          console.log("big booms");
          //showboom(e);
        }

        function showboom(s) {
          if (this.length) {
            if (s.target.checked) {
              vm.selectionManager.addFeaturesToSelection(this[0]._layer, this);
              this.forEach(function (b) {
                var boomBtn = dom.byId('boom_' + b.attributes.OBJECTID);
                boomBtn.checked = true;
                // b.visible = true;
              });
            } else {
              vm.selectionManager.removeFeaturesFromSelection(this[0]._layer, this);
              this.forEach(function (b) {
                var boomBtn = dom.byId('boom_' + b.attributes.OBJECTID);
                boomBtn.checked = false;
                // b.visible = false;
              });
            }

          } else {
            var booms = [];
            booms.push(this);
            if (s.currentTarget.checked) {
              vm.selectionManager.addFeaturesToSelection(this._layer, booms);
              // this.visible = true;
            } else {
              // this.visible = false;
              vm.selectionManager.removeFeaturesFromSelection(this._layer, booms)
            }
          }
        }

        function displaySCAT(grpItem, feature) {
          var pane = new ContentPane({title: 'SCATs'});
          vm.tabContainer.addChild(pane, 3);
        }

        function displayCoastal(grpItem, feature) {
          clearAllTabs();
          var siteTabContainer = dom.byId('siteTabs');
          domStyle.set(siteTabContainer, 'display', 'block');

          var iapTabContainer = dom.byId('iapTabs');
          domStyle.set(iapTabContainer, 'display', 'none');

          var instructionsDiv = dom.byId('instructions');
          domStyle.set(instructionsDiv, 'display', 'none');

          displaySCAT();
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
          var scat_tab = vm.tabContainer.getChildren().filter(function (child) {
            if (child.title === 'SCATs') {
              return child;
            }
          });
          scat_tab.forEach(function (tab) {
            vm.tabContainer.removeChild(tab);
          });

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

          var instructionsDiv = dom.byId('instructions');
          domStyle.set(instructionsDiv, 'display', 'none');

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
          clearAllTabs();
          console.log(grpItem);
          var siteTabContainer = dom.byId('siteTabs');
          domStyle.set(siteTabContainer, 'display', 'none');

          var iapTabContainer = dom.byId('iapTabs');
          domStyle.set(iapTabContainer, 'display', 'block');

          var instructionsDiv = dom.byId('instructions');
          domStyle.set(instructionsDiv, 'display', 'none');

          vm.tabContainerB.resize();
          //General Tab
          addToTab(['Name', 'ShortName', 'ExecutiveSummary'], feature, grpItem.GRP.iaps.fields, 'generalIAPTab');
          //Objectives Tab
          getObjectives(grpItem.GRP.ics202_categories, grpItem.GRP.ics202_objectives, feature.attributes.GlobalID);
          //Work Analysis Matrix
          getWorkAnalysisMatrix(grpItem.GRP.ics_234_objectives, feature.attributes.GlobalID);
          //Contacts
          getContacts(grpItem, feature, grpItem.GRP.iap_contacts.layer, 'ActionPlan_FK').then(function (contacts) {
            dojo.forEach(contacts, function (contact) {
              addToTab(['Name', 'Title', 'Organization', 'Organization_Type', 'Phone', 'EmergencyPhone', 'Email', ''],
                contact, grpItem.GRP.contacts.fields, 'contactIAPTab');
            });
          });
          //Assignment List
          getAssignments(grpItem.GRP.ics204_assignments, grpItem.GRP.inland_booms.layer, feature.attributes.GlobalID);
          //Incident Communications Plan
          getIncidentCommPlan(grpItem.GRP.ics_205, grpItem.GRP.contacts, feature.attributes.GlobalID);
          //MEDICAL PLAN (ICS 206)
          getMedicalActionPlan(grpItem.GRP.ics_206, feature.attributes.GlobalID);
          //Attachments
          displayAttachments(grpItem.GRP.iaps.layer, feature, 'attachmentsIAPTab');

          //add tab
          // new ContentPane({
          //   content:"<p>Optionally set new content now</p>",
          //   title:"New Tab",
          // }, tabCont).startup();
          //tabCont.addChild()
        }

        // this will loop through all GRP layers in the map and clear any selections (including booms)
        function clearAllSelections(grp_configs) {
          grp_configs.forEach(function (grp_config) {
            grp_config.layers.forEach(function (layer) {
              layer.getLayerObject().then(function (layer_object) {
                vm.selectionManager.clearSelection(layer_object);
              });
            });
          });
        }

        var portalItemsDeferred = new Deferred();
        vm.grpItems = [];
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
                vm.grpItems.push({item: item, spatialExtent: spatialExtent, layers: filteredResults});
              }
            });

            vm.clickHandler = on.pausable(vm.map, "click", function (e) {
              // vm.loadingShelter.show();
              // vm.graphicLayer.clear();
              // var pixelWidth = vm.map.extent.getWidth() / vm.map.width;
              vm.loadingShelter.show(vm.grpItems);
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

              clearAllSelections(vm.grpItems);
              dojo.forEach(vm.grpItems, function (item) {
                if (item.spatialExtent.contains(e.mapPoint)) {
                  configGRPObject(item, function (item) {
                    var coastalPromise = searchCoastal(item, featureQuery);
                    var inlandPromise = searchInland(item, featureQuery);

                    all({coastal: coastalPromise, inland: inlandPromise})
                      .then(function (results) {
                        // todo: this feature query like doesn't work for IAP
                        if (!results.coastal && !results.inland) searchIAP(item, featureQuery);
                        vm.loadingShelter.hide();
                      });
                  });
                }
              });
            });
            vm.loadingShelter.hide();
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

        //vm.selectionManager.clearSelection(this.grpItems[0].GRP.coastal_booms);
      },

      displayBoom: function () {
        console.log("finally made vm");
      },


      printPDF: function () {
        var printTask = new PrintTask();
        var mapjson = printTask._getPrintDefinition(this.map, {'map': this.map});

        var print_gp = new Geoprocessor(this.print_service),
          gp_params = {
            f: 'json',
            webmap_json: JSON.stringify(mapjson),
            service_root: this.print_params.service_root,
            config_layer: this.print_params.config_index
          };

        if (this.print_service.indexOf('IAPReport') > -1) {
          gp_params.iap_id = this.print_params.globalid;
        } else {
          gp_params.site_id = this.print_params.globalid;
        }
        print_gp.submitJob(gp_params, function (e) {
          // in geoprocessing service the output paramater must be name ReportName
          // todo: add config for report name field name?
          if (e.jobStatus === "esriJobFailed") {
            console.log('error')
          } else {
            print_gp.getResultData(e.jobId, 'ReportName', function (result) {
              window.open(result.value.url);
            });
          }
        });
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
