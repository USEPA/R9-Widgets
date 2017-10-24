define(['dojo/_base/declare', 'jimu/BaseWidget', 'dijit/_WidgetsInTemplateMixin', 'dojo/Deferred', 'jimu/dijit/LoadingShelter',
    'jimu/LayerInfos/LayerInfos', 'esri/arcgis/Portal', "dojo/_base/array", 'dojox/grid/DataGrid',
    'dojo/data/ItemFileWriteStore', 'esri/layers/FeatureLayer', 'esri/tasks/query', 'dojo/on',
    'esri/geometry/Extent', 'esri/SpatialReference', 'dojo/promise/all', 'dojo/parser', 'dijit/layout/TabContainer',
    'dijit/layout/ContentPane', 'dijit/TitlePane', 'dojo/dom-construct', 'dojo/dom', "dojo/domReady!"],
  function (declare, BaseWidget, _WidgetsInTemplateMixin, Deferred, LoadingShelter, LayerInfos, arcgisPortal, array,
            DataGrid, ItemFileWriteStore, FeatureLayer, Query, on, Extent, SpatialReference,
            all, parser, TabContainer, ContentPane, TitlePane, domConstruct, dom) {
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

        function configGRPObject(item, callback) {
          if (item.GRP) {
            callback(item);
            return;
          }
          var grp_tag = array.filter(item.tags, function (tag) {
            return tag.indexOf('GRP App:') > -1;
          });
          var config_index = (grp_tag[0] ? grp_tag[0].substring(grp_tag[0].indexOf(':') + 1, grp_tag[0].length) : '5');
          var config_layer = new FeatureLayer(item.url + '/' + config_index);
          var config_query = new Query();
          config_query.where = '1=1';
          config_query.outFields = ['*'];

          // item.grpConfig = {};
          config_layer.queryFeatures(config_query, function (response) {
            item.GRP = {};
            dojo.forEach(response.features, function (layer) {
              item.GRP[layer.attributes.layer] = new FeatureLayer(item.url + '/' + layer.attributes.layer_index);
            });
            callback(item);
          });
        }

        function convertFields(item, fields) {
          item.fields = {};
          dojo.forEach(fields, function (field) {
            item.fields[field.name] = field;
          });
        }

        function addToTab(display_fields, item, tab) {
          dojo.forEach(display_fields, function (field) {
            if (field !== '') {
              var row = domConstruct.toDom(
                '<tr><td><b>' + item.fields[field].alias + '</b>:</td><td>' +
                (item.attributes[field] ? item.attributes[field] : '') + '</td></tr>'
              );
            } else var row = domConstruct.toDom('<tr><td><br/><br/></td><td></td></tr>');
            domConstruct.place(row, tab);
          });
        }

        function displayAttachments(layer, item, tab) {
          layer.queryAttachmentInfos(item.attributes.OBJECTID, function (attachments) {
            dojo.forEach(attachments, function (attachment) {
              if (attachment.contentType.indexOf('image/') > -1) {
                var row = domConstruct.toDom('<tr><td><a target="_blank" href="'+attachment.url+'">' +
                  '<img style="max-width:100%;" src="'+attachment.url+'"/></a></td></tr>' +
                  '<tr><td><a target="_blank" href="'+attachment.url+'">'+attachment.name+'</a></td></tr>' +
                  '<tr><td><br/><br/></td></tr>');
              } else {
                var row = domConstruct.toDom('<tr><td><a target="_blank" href="'+attachment.url+'">'+attachment.name+'</a></td></tr>' +
                  '<tr><td><br/><br/></td></tr>');
              }
              domConstruct.place(row, tab);
            })
          })
        }

        function getContacts(grpItem, feature) {
          var relationshipQuery = new Query(),
          deferred = new Deferred();
          relationshipQuery.where = "Site_FK = '"+feature.attributes.GlobalID+"'";
          relationshipQuery.outFields = ['*'];

          grpItem.GRP.inland_contacts.queryFeatures(relationshipQuery, function(response) {
            var contactsQuery = new Query(),
              where = response.features.map(function (feature) {
              return "GlobalID='"+feature.attributes.Contact_FK+"'";
            });
            contactsQuery.where = where.join(' OR ');
            contactsQuery.outFields = ['*'];

            grpItem.GRP.contacts.queryFeatures(contactsQuery, function (contactResponse) {
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
          if (!grpItem.GRP.inland_sites) deferred.resolve(false);
          else {
            grpItem.GRP.inland_sites.queryFeatures(featureQuery, function (featureSet) {
              if (featureSet.features.length === 1) {
                convertFields(featureSet.features[0], featureSet.fields);
                displayInland(grpItem, featureSet.features[0]);
                deferred.resolve(true);
              } else deferred.resolve(false);
            })
          }
          return deferred.promise;
        }

        function searchCoastal(item, featureQuery) {
          var deferred = new Deferred();
          if (!item.GRP.coastal_sites) deferred.resolve(false);
          else {
            item.GRP.coastal_sites.queryFeatures(featureQuery, function (featureSet) {
              if (featureSet.features.length === 1) {
                displayCoastal(featureSet.features[0]);
                deferred.resolve(true);
              } else deferred.resolve(false);
            });
          }
          return deferred.promise;
        }

        function searchIAP(item, featureQuery) {
          item.GRP.iaps.queryFeatures(featureQuery, function (featureSet) {
            if (featureSet.features.length === 1) {
              console.log(featureSet.features[0]);
            }
          })
        }

        function displayCoastal(item) {}

        function displayInland(grpItem, feature) {
          dojo.empty('generalSiteTab');
          dojo.empty('resourceTab');
          dojo.empty('logisticsTab');
          dojo.empty('siteContactsTab');
          dojo.empty('siteAttachmentsTab');
          dojo.empty('strategiesTab');

          addToTab(['Name', 'Other_Name', 'Site_ID', 'USGS_Quad_Num', 'USGS_Quad_Name', 'GRP_Map_No',
            'Access_Agreement', 'General_Location', 'Access_Crossing', 'River_Miles', 'RR_Mile_Marker', 'Highway_Milepost',
            'Physical_Description', 'Waterway_Characteristics', 'Water_Width_and_Depths', 'Gaging_Station_Link',
            'Gaging_Station_Contact', 'Max_Current', 'Managed_Area'], feature, 'generalSiteTab');

          addToTab(['Water_Intakes', 'Listed_T_E_Species', 'Special_Resource_Comments', 'General_Habitat_and_Wildlife',
            'T_E_Species_of_Special_Concern', 'Cultural_Historic_Socio_Archeo_', 'Additional_Site_Concerns_and_Ad',
            'Additional_Site_Hazards_and_Res'], feature, 'resourceTab');

          addToTab(['Directions', 'Land_Access', 'Facilities_StagingAreas_FieldPo', 'Communication_Issues',
            'Water_Logistics_Limitation', 'Water_Logistics_Launching_Loadi'], feature, 'logisticsTab');

          getContacts(grpItem, feature).then(function (contacts) {
            dojo.forEach(contacts, function (contact) {
              addToTab(['Name', 'Title', 'Organization', 'Organization_Type', 'Phone', 'EmergencyPhone', 'Email', ''],
                contact, 'siteContactsTab');
            });
          });

          displayAttachments(grpItem.GRP.inland_sites, feature, 'siteAttachmentsTab');

          addToTab(['Strategies_Comments'], feature, 'strategiesTab');

          var query = new Query();
          query.where = "Site_FK='"+feature.attributes.GlobalID+"'";
          query.outFields = ['*'];
          grpItem.GRP.inland_strategies.queryFeatures(query, function (response) {
            var fields = {};
            dojo.forEach(response.fields, function (field) {
              fields[field.name] = field;
            });
            dojo.forEach(response.features, function (strategy) {
              strategy.fields = fields;
              var boomQuery = new Query();
              boomQuery.where = "Strategy_FK='"+strategy.attributes.GlobalID+"'";
              boomQuery.outFields = ['*'];
              grpItem.GRP.inland_booms.queryFeatures(boomQuery, function (boomResponse) {
                var boomFields = {};
                dojo.forEach(boomResponse.fields, function (field) {
                  boomFields[field.name] = field;
                });
                addToTab(['', 'Name', 'Objective', 'Implementation'], strategy, 'strategiesTab');
                var row = domConstruct.toDom('<tr><td colspan="2" id="strategy_'+strategy.attributes.OBJECTID+'_booms"></td></tr>');
                domConstruct.place(row, 'strategiesTab');
                var boomPane = new TitlePane({title:'Booms', open: false,
                  content:'<table><tbody id="booms_'+strategy.attributes.OBJECTID+'"></tbody></table>'});
                dom.byId('strategy_'+strategy.attributes.OBJECTID+'_booms').appendChild(boomPane.domNode);
                boomPane.startup();

                dojo.forEach(boomResponse.features, function (boom) {

                  boom.fields = boomFields;

                  addToTab(['Boom_Type', 'Boom_Length', 'Boom_Method', 'Boom_Boat', 'Skiffs_Punts', 'Skimmers_No',
                    'Skimmers_Type', 'Anchor_No', 'Staff', ''], boom, 'booms_'+strategy.attributes.OBJECTID);
                })
              });
            });
          });
          that.loadingShelter.hide();
          that.tabContainer.resize()
        }

        var layerInfosDeferred = new Deferred(), portalItemsDeferred = new Deferred();
        this.grpItems = [];
        all({layerInfos: layerInfosDeferred.promise, portalItems: portalItemsDeferred.promise}).then(
          function (results) {
            dojo.forEach(results.portalItems, function (item) {
              item.grpLayers = [];
              var filteredResults = dojo.filter(results.layerInfos.getLayerInfoArray(), function (layerInfo) {
                return item.id === layerInfo.originOperLayer.itemId;
              });
              if (filteredResults.length > 0) {
                item.spatialExtent = new Extent(item.extent[0][0], item.extent[0][1], item.extent[1][0], item.extent[1][1],
                  new SpatialReference({wkid: 4326}));
                that.grpItems.push(item);
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

      onClose: function(){
        console.log('GRPWidget::onClose')
        this.map.setInfoWindowOnClick(true);
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
