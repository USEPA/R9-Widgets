define(['esri/graphic', 'esri/layers/FeatureLayer', 'esri/layers/GraphicsLayer', 'esri/tasks/RelationshipQuery', 'dojo/dom-construct',
    'esri/tasks/query', 'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/SimpleLineSymbol',
    'esri/Color', 'esri/dijit/util/busyIndicator', 'esri/geometry/Extent', 'dojox/grid/DataGrid',
    'dojo/data/ItemFileWriteStore', 'dijit/tree/ForestStoreModel', 'dijit/Tree', 'dojo/on', 'jimu/dijit/LoadingShelter',
    'dojo/_base/declare', 'dojo/_base/array', 'jimu/LayerInfos/LayerInfos', 'jimu/BaseWidget'],
  function (Graphic, FeatureLayer, GraphicsLayer, RelationshipQuery, domConstruct,
            Query, SimpleMarkerSymbol, SimpleLineSymbol,
            Color, busyIndicator, Extent, DataGrid,
            ItemFileWriteStore, ForestStoreModel, Tree, on, LoadingShelter,
            declare, array, LayerInfos, BaseWidget) {


    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {

      // Custom widget code goes here

      baseClass: 'tier-ii-identify',
      // this property is set by the framework when widget is loaded.
      // name: 'HITierIIIdentify',
      // add additional properties here

      //methods to communication with app container:
      postCreate: function postCreate() {


        this.inherited(postCreate, arguments);
        console.log('TierIIIdentify::postCreate');
      },
      featureLayers: [],
      graphicLayer: undefined,
      startup: function () {
        var configs = this.config.layers,
          mapIdNode = this.mapIdNode,
          that = this,
          symbol = new SimpleMarkerSymbol(
            SimpleMarkerSymbol.STYLE_DIAMOND,
            14,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1.25),
            new Color([255, 255, 0])
          );

        this.loadingShelter = new LoadingShelter({hidden: true});
        this.loadingShelter.placeAt(that.domNode);

        this.loadingShelter.show();

        function loadFeature(feature, service) {
          that.loadingShelter.show();
          var attributes = feature.attributes;

          var selectedGraphic = new Graphic(feature.geometry, symbol);

          that.graphicLayer.add(selectedGraphic);

          // need to customize this for state specific attributes
          // if (service.config.state.abbr === 'NV') {
          //   mapIdNode.innerHTML = '<h1>' + attributes.facilityName + '</h1><br/>' +
          //     '<table><tbody id="tierii_facility">' +
          //     '<tr><td>Physical Address: ' + attributes.street_address + ', ' + attributes.street_city + '</td></tr>' +
          //     '<tr><td>Subject to Chemical Accident Prevention: ' + attributes.subjectToChemAccidentPreventio === "true" ? 'Yes': 'No' + '</td></tr>' +
          //     '<tr><td>Subject to Emergency Planning: ' + attributes.subjectToEmergencyPlanning === "true" ? 'Yes': 'No' + '</td></tr>' +
          //     '<tr><td>Manned: ' + attributes.manned + '</td></tr>' +
          //     '<tr><td>Max Occupants: ' + attributes.maxNumOccupants + '</td></tr>' +
          //     // '<tr><td>Type: ' + attributes.Facility_Type + '</td></tr>' +
          //     // '<tr><td>Nature of Business: ' + attributes.Nature_of_Business + '</td></tr>' +
          //     // '<tr><td>Company Name: ' + attributes.Company_Name + '</td></tr>' +
          //     '</tbody></table>' +
          //     // '<h3 style="text-decoration: underline;">Contact(s)</h3>' +
          //     // '<table><tbody id="tierii_contacts">' +
          //     // '<tr><td>Owner/Operator: ' + attributes.Owner_Operator_Name + '</td></tr>' +
          //     // '<tr><td>Phone: ' + (attributes.Owner_Operator_Phone ? attributes.Owner_Operator_Phone : 'Not Reported') + '</td></tr>' +
          //     // '<tr><td>Email: ' + (attributes.Owner_Operator_Email ? attributes.Owner_Operator_Email : 'Not Reported') + '</td></tr>' +
          //     '</tbody></table>' +
          //     '<h3 style="text-decoration: underline;">Chemical(s)</h3>' +
          //     '<table><tbody id="tierii_contacts"></tbody></table>';
          //     '<table><tbody id="tierii_chemicals"></tbody></table>';
          // } else
          // if (service.config.state.abbr === 'AZ') {
          //   mapIdNode.innerHTML = '<h1>' + attributes.NAME + '</h1><br/>' +
          //     '<table><tbody id="tierii_facility">' +
          //     '<tr><td>Physical Address: ' + attributes.ADDRESS + ', ' + attributes.CITY + '</td></tr>' +
          //     '<tr><td>Fire District: ' + (attributes.FD ? attributes.FD : 'Not Reported') + '</td></tr>' +
          //     '<tr><td>Email: ' + (attributes.EMAIL ? attributes.EMAIL : 'Not Reported') + '</td></tr>' +
          //     '<tr><td>Phone: ' + (attributes.PHONE ? attributes.PHONE : 'Not Reported') + '</td></tr>' +
          //     '</tbody></table>';
          // } else {
          // todo: need to look at records to see what is available for CA, NV an dHI
          mapIdNode.innerHTML = '<h1>' + attributes.FacilityName + '</h1><br/>' +
            '<table><tbody id="tierii_facility">' +
            '<tr><td>Physical Address: ' + attributes.StreetAddress + ', ' + attributes.City + '</td></tr>' +
            '<tr><td>Fire District: ' + (attributes.FireDistrict ? attributes.FireDistrict : 'Not Reported') + '</td></tr>' +
            (attributes.Manned ? '<tr><td>' + (attributes.Manned === 'true' ? 'Max Occupants: ' : 'Manned: No') + (attributes.MaxNumOccupants ? attributes.MaxNumOccupants : '') + '</td></tr>' : '') +
            (attributes.SubjectToChemAccidentPrevention ? '<tr><td>Subject to Chemical Accident Prevention: ' + (attributes.SubjectToChemAccidentPrevention === 'true' ? 'Yes' : 'No') + '</td></tr>' : '') +
            (attributes.SubjectToEmergencyPlanning ? '<tr><td>Subject to Emergency Planning: ' + (attributes.SubjectToEmergencyPlanning === 'true' ? 'Yes' : 'No') + '</td></tr>' : '') +
            '</tbody></table>' +
            '<h3 style="text-decoration: underline;">Contacts</h3>' +
            '<table><tbody id="tierii_contacts"></tbody></table>' +
            '<h3 style="text-decoration: underline;">Chemicals</h3>' +
            '<table><tbody id="tierii_chemicals"></tbody></table>';
          // }

          // HI specific data attributes/format
          // if (service.config.state.abbr === 'HI') {
          //   // deal with boolean tables
          //   if (attributes.SubjectToChemAccidentPreventi_1 === 'T') {
          //     var row = '<tr><td>Subject to Chemical Accident Prevention: No</td></tr>';
          //   } else if (attributes.SubjectToChemAccidentPrevention === 'T') {
          //     var row = '<tr><td>Subject to Chemical Accident Prevention: Yes</td></tr>';
          //   } else {
          //     var row = '<tr><td>Subject to Chemical Accident Prevention: Unknown</td></tr>';
          //   }
          //   domConstruct.place(row, "tierii_facility");
          //
          //   if (attributes.SubjectToEmergencyPlanning_Y === 'T') {
          //     var row = '<tr><td>Subject to Emergency Planning: Yes</td></tr>';
          //   } else if (attributes.SubjectToEmergencyPlanning_N === 'T') {
          //     var row = '<tr><td>Subject to Emergency Planning: No</td></tr>';
          //   } else {
          //     var row = '<tr><td>Subject to Emergency Planning: Unknown</td></tr>';
          //   }
          //   domConstruct.place(row, "tierii_facility");
          //
          //   if (attributes.Manned_Y === 'T') {
          //     var row = '<tr><td>Manned: Yes</td></tr>' +
          //       '<tr><td>Max Occupants: ' + (attributes.MaxNumOccupants ? attributes.MaxNumOccupants : 'Unknown') + '</td></tr>';
          //   } else if (attributes.Manned_N === 'T') {
          //     var row = '<tr><td>Manned: No</td></tr>';
          //   } else {
          //     var row = '<tr><td>Manned: No</td></tr>';
          //   }
          //   domConstruct.place(row, "tierii_facility");
          // }

          // if contacts are available get them
          if (service.config.contacts.relationshipId !== 'none' && service.config.contacts.relationshipId !== undefined && service.config.contacts !== undefined && service.config.state !== 'GU') {
            var contactQuery = new RelationshipQuery();
            // GET CONTACTS
            contactQuery.outFields = ['*'];
            //dojo.forEach(service.facilities.relationships, function (relationship, i) {
            // Facilities to Contacts relationship ID
            contactQuery.relationshipId = service.config.contacts.relationshipId;
            contactQuery.objectIds = [attributes.OBJECTID];
            service.facilities.queryRelatedFeatures(contactQuery, function (e) {
              dojo.forEach(e[attributes.OBJECTID].features, function (contact, i) {

                if (service.config.state.abbr !== 'GU') {
                  var contactPhonesQuery = new RelationshipQuery();

                  contactPhonesQuery.outFields = ['*'];
                  // contacts to phone relationship id
                  contactPhonesQuery.relationshipId = service.config.contacts.phones.relationshipId;
                  contactPhonesQuery.objectIds = [contact.attributes.OBJECTID];

                  service.contacts.queryRelatedFeatures(contactPhonesQuery, function (f) {
                    // these attributes could be different for each state
                    // the service.config.state object helps you identify which state you are working with
                    var row = domConstruct.toDom('<tr><td style="padding-top: 10px;"><b>' + (contact.attributes.Title ? contact.attributes.Title + ': ' : '') +
                      (contact.attributes.FirstName ? contact.attributes.FirstName : '') +
                      ' ' + (contact.attributes.LastName ? contact.attributes.LastName : '') +
                      (contact.attributes.FirstName && contact.attributes.LastName ? '' : 'Not Reported') + '</b></td></tr>');
                    domConstruct.place(row, "tierii_contacts");

                    var row = domConstruct.toDom('<tr><td>Email: ' + (contact.attributes.Email ? contact.attributes.Email : 'Not Reported') + '</td></tr>');
                    domConstruct.place(row, "tierii_contacts");

                    if (f.hasOwnProperty(contact.attributes.OBJECTID)) {
                      dojo.forEach(f[contact.attributes.OBJECTID].features, function (contact_phone_feature, j) {
                        var row = domConstruct.toDom('<tr><td>' + (contact_phone_feature.attributes.Type ? contact_phone_feature.attributes.Type + ': ' : '')
                          + (contact_phone_feature.attributes.Phone ? contact_phone_feature.attributes.Phone : '') + '</td></tr>');
                        domConstruct.place(row, "tierii_contacts");
                      });
                    }
                    that.loadingShelter.hide();
                  }, function (e) {
                    console.log("Error: " + e);
                  });
                } else if (service.config.state.abbr === 'GU') {
                  var row = domConstruct.toDom('<tr><td style="padding-top: 10px;"><b>' + (contact.attributes.Title ? contact.attributes.Title + ': ' : '') +
                    (contact.attributes.Name ? contact.attributes.Name : 'Not Reported') + '</b></td></tr>');
                  domConstruct.place(row, "tierii_contacts");

                  var row = domConstruct.toDom('<tr><td>Phone: ' + (contact.attributes.Phone ? contact.attributes.Phone : 'Not Reported') + '</td></tr>');
                  domConstruct.place(row, "tierii_contacts");

                  var row = domConstruct.toDom('<tr><td>24 HR Phone: ' + (contact.attributes.HR24Phone ? contact.attributes.HR24Phone : 'Not Reported') + '</td></tr>');
                  domConstruct.place(row, "tierii_contacts");
                }
              });
            }, function (e) {
              console.log("Error: " + e);
            });
          } else {
            that.loadingShelter.hide();
          }

          if (service.config.chemicals.relationshipId !== 'none' && service.config.chemicals.relationshipId !== undefined && service.config.chemicals !== undefined) {
            // GET CHEMICALS
            var chemicalQuery = new RelationshipQuery();
            chemicalQuery.outFields = ['*'];
            // facilities to chemicals relationship ID
            chemicalQuery.relationshipId = service.config.chemicals.relationshipId;
            chemicalQuery.objectIds = [attributes.OBJECTID];

            const maxAmountCodeDomain = service.chemicals.getDomain("MaxAmountCode");
            const avgAmountCodeDomain = service.chemicals.getDomain("AvgAmountCode");

            service.facilities.queryRelatedFeatures(chemicalQuery, function (e) {
              dojo.forEach(e[attributes.OBJECTID].features, function (chemical, i) {
                // these attributes could be different for each state
                // the service.config.state object helps you identify which state you are working with
                // if (service.config.state.abbr === 'NV') {
                //   var row = domConstruct.toDom(
                //     '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.Chemical_Name
                //     + (chemical.attributes.CAS_Number ? ' (' + chemical.attributes.CAS_Number + ')' : '') + '</b></td></tr>' +
                //     '<tr><td>Mixture: ' + (chemical.attributes.Mixture_Chemical_Name ? chemical.attributes.Mixture_Chemical_Name : 'Not Reported') +
                //     (chemical.attributes.Mixture_CAS_Number ? ' (' + chemical.attributes.Mixture_CAS_Number + ')' : '') + '</td></tr>' +
                //     '<tr><td>Location: ' + (chemical.attributes.Storage_Location ? chemical.attributes.Storage_Location : 'Not Reported') + '</td></tr>' +
                //     '<tr><td>Max Dailly Amount: ' + (chemical.attributes.Maximum_Daily_Amount ? chemical.attributes.Maximum_Daily_Amount : 'Not Reported') + '</td></tr>' +
                //     '<tr><td>Largest Container: ' + (chemical.attributes.Maximum_Amt___Largest_Container ? chemical.attributes.Maximum_Amt___Largest_Container : 'Not Reported') + '</td></tr>' +
                //     '<tr><td>Avg Dailly Amount: ' + (chemical.attributes.Average_Daily_Amount ? chemical.attributes.Average_Daily_Amount : 'Not Reported') + '</td></tr>'
                //   );
                //   domConstruct.place(row, "tierii_chemicals");
                // }
                if (service.config.state.abbr === 'GU') {
                  var row = domConstruct.toDom(
                    '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.Chemical
                    + (chemical.attributes.CASCode ? ' (' + chemical.attributes.CASCode + ')' : '') + '</b></td></tr>' +
                    '<tr><td>Location: ' + (chemical.attributes.StorageLocation ? chemical.attributes.StorageLocation : 'Not Reported') + '</td></tr>' +
                    '<tr><td>Max Dailly Amount: ' + (chemical.attributes.MaxDailyAmount ? chemical.attributes.MaxDailyAmount : 'Not Reported') + '</td></tr>' +
                    '<tr><td>Avg Dailly Amount: ' + (chemical.attributes.AvgDailyAmount ? chemical.attributes.AvgDailyAmount : 'Not Reported') + '</td></tr>' +
                    '<tr><td>Container: ' + (chemical.attributes.ContainerType ? chemical.attributes.ContainerType : 'Not Reported') + '</td></tr>'
                  );
                  domConstruct.place(row, "tierii_chemicals");
                  that.loadingShelter.hide();
                } else if (service.config.chemicals.locations !== undefined && service.config.chemicals.locations.relationshipId !== 'none') {

                  var chemicalLocationQuery = new RelationshipQuery();

                  chemicalLocationQuery.outFields = ['*'];
                  // chemicals to chemical locations relationship id
                  chemicalLocationQuery.relationshipId = service.config.chemicals.locations.relationshipId;
                  chemicalLocationQuery.objectIds = [chemical.attributes.OBJECTID];

                  service.chemicals.queryRelatedFeatures(chemicalLocationQuery, function (e) {
                    // these attributes could be different for each state
                    // the service.config.state object helps you identify which state you are working with
                    // if (service.config.state.abbr === 'HI') {
                    //   var row = domConstruct.toDom(
                    //     '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.EnteredChemName
                    //     + (chemical.attributes.CiCAS ? ' (' + chemical.attributes.CiCAS + ')' : '') + '</b></td></tr>' +
                    //     '<tr><td>Days: ' + chemical.attributes.DaysOnSite + '</td></tr>'
                    //   );
                    //   domConstruct.place(row, "tierii_chemicals");
                    // } else if (service.config.state.abbr === 'CA' || service.config.state.abbr === 'NV') {
                    var row = domConstruct.toDom(
                      '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.chemical_name
                      + (chemical.attributes.cas_code ? ' (' + chemical.attributes.cas_code + ')' : '') + '</b></td></tr>' +
                      '<tr><td>Days: ' + chemical.attributes.DaysOnSite + '</td></tr>'
                    );
                    domConstruct.place(row, "tierii_chemicals");
                    // }

                    let maxAmount = 'Not Reported'
                    if (chemical.attributes.MaxAmountCode && maxAmountCodeDomain === undefined) {
                      maxAmount = chemical.attributes.MaxAmountCode
                    } else if (chemical.attributes.MaxAmountCode && maxAmountCodeDomain) {
                      maxAmount = maxAmountCodeDomain.getName(chemical.attributes.MaxAmountCode)
                    }
                    let AvgAmountCode = 'Not Reported'
                    if (chemical.attributes.AvgAmountCode && avgAmountCodeDomain === undefined) {
                      AvgAmountCode = chemical.attributes.AvgAmountCode;
                    } else if (chemical.attributes.AvgAmountCode && avgAmountCodeDomain) {
                      AvgAmountCode = avgAmountCodeDomain.getName(chemical.attributes.AvgAmountCode);
                    }


                    var row = domConstruct.toDom(
                      '<tr><td>Max Amount: ' + (chemical.attributes.MaxAmount ? chemical.attributes.MaxAmount + ' lbs' : "Not Reported") + '</td></tr>' +
                      '<tr><td>Max Amount Range: ' + maxAmount + '</td></tr>' +
                      '<tr><td>Max Amount Container: ' + (chemical.attributes.MaxAmountContainer ? chemical.attributes.MaxAmountContainer : "Not Reported") + '</td></tr>' +
                      '<tr><td>Average Amount: ' + (chemical.attributes.AvgAmount ? chemical.attributes.AvgAmount + ' lbs' : "Not Reported") + '</td></tr>' +
                      '<tr><td>Average Amount Range: ' + AvgAmountCode + '</td></tr>'
                    );

                    domConstruct.place(row, "tierii_chemicals");

                    var states = null;
                    if (chemical.attributes.Gas === 'T') {
                      states = 'Gas';
                    }
                    if (chemical.attributes.Solid === 'T') {
                      states ? states += ', Solid' : states = 'Solid';
                    }
                    if (chemical.attributes.Liquid === 'T') {
                      states ? states += ', Liquid' : states = 'Liquid';
                    }
                    if (states === null) {
                      states = 'Not Reported';
                    }
                    var row = domConstruct.toDom('<tr><td>State(s): ' + states + '</td></tr>');
                    domConstruct.place(row, 'tierii_chemicals');

                    var hazards = null;
                    if (chemical.attributes.Fire === 'T') {
                      hazards = 'Fire';
                    }
                    if (chemical.attributes.Pressure === 'T') {
                      hazards = (hazards ? hazards += ', Sudden Release of Pressure' : 'Sudden Release of Pressure');
                    }
                    if (chemical.attributes.Reactive === 'T') {
                      hazards = (hazards ? hazards += ', Reactive' : 'Reactive');
                    }
                    if (chemical.attributes.Acute === 'T') {
                      hazards = (hazards ? hazards += ', Acute' : 'Acute');
                    }
                    if (chemical.attributes.Chronic === 'T') {
                      hazards = (hazards ? hazards += ', Chronic' : 'Chronic');
                    }
                    if (hazards === null) {
                      hazards = 'Not Reported';
                    }
                    var row = domConstruct.toDom('<tr id="hazards_' + chemical.attributes.OBJECTID + '"><td>Hazard(s): ' + hazards + '</td></tr>');
                    domConstruct.place(row, 'tierii_chemicals');

                    // if (service.config.state.abbr === 'NV') {
                    var chemicalHazardsQuery = new RelationshipQuery();

                    chemicalHazardsQuery.outFields = ['*'];
                    // chemicals to chemical locations relationship id
                    chemicalHazardsQuery.relationshipId = service.config.chemicals.hazards.relationshipId;
                    chemicalHazardsQuery.objectIds = [chemical.attributes.OBJECTID];
                    service.chemicals.queryRelatedFeatures(chemicalHazardsQuery, function (response) {
                      var hazardsNode = dojo.byId('hazards_' + chemical.attributes.OBJECTID);
                      var hazards = [];
                      dojo.forEach(response[chemical.attributes.OBJECTID].features, function (hazard, j) {
                        hazards.push(hazard.attributes.category);
                      });
                      hazardsNode.innerHTML = '<td>Hazard(s): ' + hazards.join(", ") + '</td>';
                    });
                    // }


                    dojo.forEach(e[chemical.attributes.OBJECTID].features, function (chemical_location, j) {
                      var location_number = j + 1;
                      var row = domConstruct.toDom(
                        '<tr><td>-------------------</td></tr>' +
                        '<tr><td>Location #' + location_number + ': ' + (chemical_location.attributes.Location ? chemical_location.attributes.Location : 'Not Reported') + '</td></tr>' +
                        '<tr><td>Location #' + location_number + ' Type: ' + (chemical_location.attributes.LocationType ? chemical_location.attributes.LocationType : 'Not Reported') + '</td></tr>' +
                        '<tr><td>Location #' + location_number + ' Pressure: ' + (chemical_location.attributes.LocationPressure ? chemical_location.attributes.LocationPressure : 'Not Reported') + '</td></tr>' +
                        '<tr><td>Location #' + location_number + ' Temp: ' + (chemical_location.attributes.LocationTemperature ? chemical_location.attributes.LocationTemperature : 'Not Reported') + '</td></tr>'
                        // '<tr><td>Location #' + location_number + ' Amount: ' + (chemical_location.attributes.Amount ? chemical_location.attributes.Amount + ' ' + chemical_location.attributes.AmountUnit : 'Not Reported') + '</td></tr>'
                      );
                      domConstruct.place(row, "tierii_chemicals");

                    });
                    that.loadingShelter.hide();
                  }, function (e) {
                    console.log("Error: " + e);
                  });
                }
              });
            }, function (e) {
              console.log("Error: " + e);
            });
          } else {
            that.loadingShelter.hide();
          }
        }

        this.graphicLayer = new GraphicsLayer();
        this.map.addLayer(this.graphicLayer);

        this.services = [];

        dojo.forEach(configs, function (config, i) {
          config.baseurl = that.config.baseurl;

          LayerInfos.getInstance(that.map, that.map.itemInfo).then(function (layerInfosObject) {
            var facilities = layerInfosObject.getLayerInfoById(config.facilities.id);
            that.services.push({facilities: new FeatureLayer(facilities.layerObject.url)});
          });

          if (config.contacts !== undefined && config.contacts.relationshipId !== 'none') {
            that.services[i].contacts = new FeatureLayer(config.baseurl + config.contacts.layerId, {
              outFields: ["*"]
            });
          }

          if (config.chemicals !== undefined && config.chemicals.relationshipId !== 'none') {
            that.services[i].chemicals = new FeatureLayer(config.baseurl + config.chemicals.layerId, {
              outFields: ["*"]
            });
          }
          that.services[i].config = config;
        });

        that.clickHandler = on.pausable(this.map, "click", function (e) {
          that.loadingShelter.show();
          that.graphicLayer.clear();
          var pixelWidth = that.map.extent.getWidth() / that.map.width;
          var toleraceInMapCoords = 10 * pixelWidth;
          var clickExtent = new Extent(e.mapPoint.x - toleraceInMapCoords,
            e.mapPoint.y - toleraceInMapCoords,
            e.mapPoint.x + toleraceInMapCoords,
            e.mapPoint.y + toleraceInMapCoords,
            that.map.spatialReference);

          var noneFound = [];
          dojo.forEach(that.services, function (service, i) {

            var featureQuery = new Query();
            featureQuery.outFields = ['*'];
            featureQuery.geometry = clickExtent;

            service.facilities.queryFeatures(featureQuery, function (featureSet) {
              if (featureSet.features.length === 1) {
                loadFeature(featureSet.features[0], service);
                noneFound.push(false);
              } else if (featureSet.features.length > 1) {
                mapIdNode.innerHTML = '<h3>Multiple Facilities at that location</h3><br/><h5>Select one to continue</h5>' +
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

                // these attributes could be different for each state
                // the that.config.state object helps you identify which state you are working with
                // if (service.config.state.abbr === 'AZ') {
                //   var layout = [
                //     {'name': '', 'field': 'NAME', 'width': '100%'}
                //   ];
                // } else {
                var layout = [
                  {'name': '', 'field': 'FacilityName', 'width': '100%'}
                ];
                // }

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
                  var facility = array.filter(featureSet.features, function (feature) {
                    return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
                  });
                  loadFeature(facility[0], service);
                });

                grid.startup();
                that.loadingShelter.hide();
                noneFound.push(false);
              } else {
                noneFound.push(true);
              }
              if (noneFound.length === that.services.length) {
                var wasfound = array.filter(noneFound, function (found) {
                  return found === false;
                });
                if (wasfound.length === 0) {
                  mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
                  that.loadingShelter.hide();
                }
              }
            });
          });
        });
        console.log('startup');
      },

      onOpen: function () {
        this.loadingShelter.show();
        console.log('HITierIIIdentify::onOpen');
        this.map.setInfoWindowOnClick(false);
        var that = this;
        if (that.clickHandler !== undefined) {
          that.clickHandler.resume();
        }

        // var statusLayer = new FeatureLayer(this.config.baseurl + this.config.statusLayer,
        //     {outFields: ['*']}),
        //   statusQuery = new Query();
        //
        // statusQuery.outFields = ['*'];
        // statusQuery.where = "1=1";
        //
        this.mapIdNode.innerHTML = '<h1>Tier II Identify</h1><br/>' +
          '<p>Click Facility to view contact and chemical information.</p><br/>' +
          '<p>More info on the Emergency Planning and Community Right-to-Know Act (EPCRA): ' +
          '<a href="https://www.epa.gov/epcra">https://www.epa.gov/epcra</a></p><br/>' +
          '<p>EPCRA Fact Sheet: <a href="https://www.epa.gov/sites/production/files/2017-08/documents/epcra_fact_sheet_overview_8-2-17.pdf">https://www.epa.gov/sites/production/files/2017-08/documents/epcra_fact_sheet_overview_8-2-17.pdf</a></p>';
        //
        // // could pull this once and check if the values are set instead of pulling data each time
        // statusLayer.queryFeatures(statusQuery, function (records) {
        //   const sortedRecords = [records.features.find((r) => r.attributes.State === 'California')]
        //     .concat(records.features.filter((r) => r.attributes.State !== 'California')
        //       .sort((a, b) => a.attributes.State > b.attributes.State ? 1 : -1));
        //   dojo.forEach(sortedRecords, function (record) {
        //     var lastUpdate = dojo.date.locale.format(new Date(record.attributes.LastUpdate), {
        //       datePattern: "yyyy-MM-dd",
        //       selector: "date"
        //     });
        //     that.status = "<tr><td>State: " + record.attributes.State + "</td></tr>" +
        //       "<tr><td>Status Year: " + record.attributes.CurrentReportingYear + "</td></tr>" +
        //       "<tr><td>Last Updated: " + lastUpdate + "</td></tr>" +
        //       "<tr><td>Contact: " + record.attributes.ContactName + "</td></tr>" +
        //       "<tr><td>Contact Phone: " + record.attributes.ContactPhone + "</td></tr>" +
        //       "<tr><td>Contact Email: " + record.attributes.ContactEmail + "</td></tr>" +
        //       "<tr><td> <br/></td></tr>";
        //     domConstruct.place(that.status, "tierii_status");
        //   });
        that.loadingShelter.hide();
        // });
      },

      onClose: function () {
        console.log('HITierIIIdentify::onClose');

        // clean up on close
        this.clickHandler.pause();
        this.graphicLayer.clear();
        this.map.setInfoWindowOnClick(true);
      }

    });

  });
