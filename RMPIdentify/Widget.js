define(['esri/graphic', 'esri/layers/FeatureLayer', 'esri/layers/GraphicsLayer', 'esri/tasks/RelationshipQuery', 'dojo/dom-construct',
    'esri/tasks/query', 'esri/symbols/PictureMarkerSymbol', 'esri/symbols/SimpleLineSymbol',
    'esri/Color', 'esri/dijit/util/busyIndicator', 'esri/geometry/Extent', 'dojox/grid/DataGrid',
    'dojo/data/ItemFileWriteStore', 'dijit/tree/ForestStoreModel', 'dijit/Tree', 'dojo/on', 'jimu/dijit/LoadingShelter',
    'dojo/_base/declare', 'dojo/_base/array', 'jimu/LayerInfos/LayerInfos', 'jimu/BaseWidget', 'dojo/number', 'dojo/date/locale'],
  function (Graphic, FeatureLayer, GraphicsLayer, RelationshipQuery, domConstruct,
            Query, PictureMarkerSymbol, SimpleLineSymbol,
            Color, busyIndicator, Extent, DataGrid,
            ItemFileWriteStore, ForestStoreModel, Tree, on, LoadingShelter,
            declare, array, LayerInfos, BaseWidget, number, localeDate) {

    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {

      // Custom widget code goes here

      baseClass: 'rmp-identify',
      // this property is set by the framework when widget is loaded.
      // name: 'RMPIdentify',
      // add additional properties here

      //methods to communication with app container:
      postCreate: function () {


        this.inherited(arguments);
        console.log('RMPIdentify::postCreate');
      },
      featureLayers: [],
      graphicLayer: undefined,
      startup: function () {
        var configs = this.config.layers,
          mapIdNode = this.mapIdNode,
          that = this, symbol = new PictureMarkerSymbol(
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAUCAYAAABbLMdoAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAdtJREFUKJGV0k9Ik3Ecx/H3nn71iASyp12cE4KxUxaIPM9kzG0wUBSkf3jaoKgovChdwg6dOghCh6JLEHlZl3BpMHFrPj4oKKQM8fDAXORh2HaRnaL4wWwdBtY2V/S9fb+8+MLv8/0J/qNE8yCbRanVeDM8zO1/YuDl6iq3Nja6l0Kh8lJbnMuhra1x3+mEg4Pya6A9LpVIKgpnJidhbo4Lpqk+jUblkxa8uYmeThOJx6GrC0ZGYHdXPtrZYVbX+d6Ai0Xe9faCz1fvDQMsi3NHR7wFrp/g9XXtTipVuTg1BQ5HHXd0wNgYpNNc3d7GZxh8Ftksyv5+5fnAAHg8jbH094Nl4SgW1STIK0II9WGhIM9PT7dmKAREIrC4KC9vbeEVnZ3yldvNrG1ztnlzrQa5HPT1UQoE+CL8fr6Zpvosk5Ezug6a9hvn83B4CKOjxE8eGI3Kx/PzPDBNnBMTdXh8DMvLYBjqp6EhaTVE5/V230ulyslAAHp6YG8PqlV+ut3yZstRQqHy+4UF1c5k5KVYrL7V7ydhGHw99dwej7xh2+QTCRwuFz8UhbsN6fzZDA5SWFnhg2lybXxcmwmHK9W2GMDlIhYMqh/D4cqLltybB/VPI4PN81Px3+oXm5WbogYCJW8AAAAASUVORK5CYII=',
          11,
          20
          );

        this.loadingShelter = new LoadingShelter({hidden: true});
        this.loadingShelter.placeAt(that.domNode);

        this.loadingShelter.show();

        function loadFeature(feature) {
          that.loadingShelter.show();
          var attributes = feature.attributes;

          var selectedGraphic = new Graphic(feature.geometry, symbol);

          that.graphicLayer.add(selectedGraphic);

          // need to customize this for state specific attributes
          // if (service.config.state.abbr === 'NV') {
          //   mapIdNode.innerHTML = '<h1>' + attributes.Facility_Name + '</h1><br/>' +
          //     '<table><tbody id="tierii_facility">' +
          //     '<tr><td>Physical Address: ' + attributes.Street_Address_1 + ', ' + attributes.City + '</td></tr>' +
          //     '<tr><td>Status: ' + attributes.Facility_Status + '</td></tr>' +
          //     '<tr><td>Type: ' + attributes.Facility_Type + '</td></tr>' +
          //     '<tr><td>Nature of Business: ' + attributes.Nature_of_Business + '</td></tr>' +
          //     '<tr><td>Company Name: ' + attributes.Company_Name + '</td></tr>' +
          //     '</tbody></table>' +
          //     '<h3 style="text-decoration: underline;">Contact(s)</h3>' +
          //     '<table><tbody id="tierii_contacts">' +
          //     '<tr><td>Owner/Operator: ' + attributes.Owner_Operator_Name + '</td></tr>' +
          //     '<tr><td>Phone: ' + (attributes.Owner_Operator_Phone ? attributes.Owner_Operator_Phone : 'Not Reported') + '</td></tr>' +
          //     '<tr><td>Email: ' + (attributes.Owner_Operator_Email ? attributes.Owner_Operator_Email : 'Not Reported') + '</td></tr>' +
          //     '</tbody></table>' +
          //     '<h3 style="text-decoration: underline;">Chemical(s)</h3>' +
          //     '<table><tbody id="tierii_chemicals"></tbody></table>';
          // } else if (service.config.state.abbr === 'AZ') {
          //   mapIdNode.innerHTML = '<h1>' + attributes.NAME + '</h1><br/>' +
          //     '<table><tbody id="tierii_facility">' +
          //     '<tr><td>Physical Address: ' + attributes.ADDRESS + ', ' + attributes.CITY + '</td></tr>' +
          //     '<tr><td>Fire District: ' + (attributes.FD ? attributes.FD : 'Not Reported') + '</td></tr>' +
          //     '<tr><td>Email: ' + (attributes.EMAIL ? attributes.EMAIL : 'Not Reported') + '</td></tr>' +
          //     '<tr><td>Phone: ' + (attributes.PHONE ? attributes.PHONE : 'Not Reported') + '</td></tr>' +
          //     '</tbody></table>';
          // } else {
          mapIdNode.innerHTML = '<h1>' + attributes.FacilityName + '</h1><br/>' +
            '<table><tbody id="tierii_facility">' +
            '<tr><td>Address: <br/>' + attributes.FacilityStr1 + '<br/>' + (attributes.FacilityStr2 ? attributes.FacilityStr2 + '<br/>' : '') +
            attributes.FacilityCity + ', ' + attributes.FacilityState + ' ' + attributes.FacilityZipCode + '</td></tr>' +
            '<tr><td>Phone: ' + (attributes.FacilityPhoneNumber ? attributes.FacilityPhoneNumber : 'not reported')+ '</td></tr>' +
            '<tr><td>Website: ' + attributes.FacilityURL + '</td></tr>' +
            '<tr><td>Email: ' + attributes.FacilityEmailAddress + '</td></tr>' +
            '<tr><td>Full Time Employees: ' + attributes.FTE + '</td></tr>' +
            '<tr><td>RMP Completion Date: ' +  localeDate.format(new Date(feature.attributes.CompletionCheckDate), {selector: "date", datePattern:"MM-dd-yyyy"}) + '</td></tr>' +
            '<tr><td>Parent Company(s): ' + attributes.ParentCompanyName + (attributes.Company2Name ? ', '+attributes.Company2Name : '') +'</td></tr>' +
            '<tr><td><h3 style="text-decoration: underline;">Contacts</h3></td></tr>' +
            '<tr><td><h5>Operator</h5></td></tr>' +
            '<tr><td>Name: ' + attributes.OperatorName + '</td></tr>' +
            '<tr><td>Phone: ' + attributes.OperatorPhone + '</td></tr>' +
            '<tr><td><h5>Emergency Contact</h5></td></tr>' +
            '<tr><td>Name: ' + attributes.EmergencyContactName + '</td></tr>' +
            '<tr><td>Title: ' + attributes.EmergencyContactTitle + '</td></tr>' +
            '<tr><td>Phone: ' + attributes.EmergencyContactPhone + (attributes.EmergencyContactExt_PIN ? ' x' + attributes.EmergencyContactExt_PIN : '') + '</td></tr>' +
            '<tr><td>24 HR Phone: ' + attributes.Phone24 + '</td></tr>' +
            '<tr><td></td></tr>' +
            '</tbody></table>' +
            '<table><tbody id="tierii_contacts"></tbody></table>' +
            '<h3 style="text-decoration: underline;">Processes</h3>' +
            '<div style="width:100%" id="processes"></div>';
          // }

          // HI specific data attributes/format
          // if (service.config.state.abbr === 'HI') {
          //   // deal with boolean tables
          //   if (attributes.SubjectToChemAccidentPreventi_1 === 'T') {
          //     var row = '<tr><td>Subject to Chemical Accident Prevention: No</td></tr>';
          //   }
          //   else if (attributes.SubjectToChemAccidentPrevention === 'T') {
          //     var row = '<tr><td>Subject to Chemical Accident Prevention: Yes</td></tr>';
          //   }
          //   else {
          //     var row = '<tr><td>Subject to Chemical Accident Prevention: Unknown</td></tr>';
          //   }
          //   domConstruct.place(row, "rmp_facility");
          //
          //   if (attributes.SubjectToEmergencyPlanning_Y === 'T') {
          //     var row = '<tr><td>Subject to Emergency Planning: Yes</td></tr>';
          //   }
          //   else if (attributes.SubjectToEmergencyPlanning_N === 'T') {
          //     var row = '<tr><td>Subject to Emergency Planning: No</td></tr>';
          //   }
          //   else {
          //     var row = '<tr><td>Subject to Emergency Planning: Unknown</td></tr>';
          //   }
          //   domConstruct.place(row, "rmp_facility");
          //
          //   if (attributes.Manned_Y === 'T') {
          //     var row = '<tr><td>Manned: Yes</td></tr>' +
          //       '<tr><td>Max Occupants: ' + (attributes.MaxNumOccupants ? attributes.MaxNumOccupants : 'Unknown') + '</td></tr>';
          //   }
          //   else if (attributes.Manned_N === 'T') {
          //     var row = '<tr><td>Manned: No</td></tr>';
          //   }
          //   else {
          //     var row = '<tr><td>Manned: No</td></tr>';
          //   }
          //   domConstruct.place(row, "rmp_facility");
          // }
          //
          // // if contacts are available get them
          // if (service.config.contacts.relationshipId !== 'none' && service.config.contacts.relationshipId !== undefined && service.config.contacts !== undefined) {


          var processQuery = new RelationshipQuery();
          processQuery.outFields = ['*'];
          processQuery.relationshipId = that.tblS1Processes.relationshipId;
          processQuery.objectIds = [attributes.OBJECTID];

          that.facilities.queryRelatedFeatures(processQuery, function (featureSet) {
            dojo.forEach(featureSet[attributes.OBJECTID].features, function (process) {
              var row = domConstruct.toDom('' +
                '<div style="padding-top:10px;"><b>Name: ' + (process.attributes.AltID ? process.attributes.AltID : 'not reported') + '</b></div>' +
                '<div>Description(s): <span id="process_' + process.attributes.ProcessID + '_naics"></span></div>' +
                '<table><tbody id="process_' + process.attributes.ProcessID + '"><tr><th>Chemical</th><th>Quantity (lbs)</th></tr></tbody></table>');
              domConstruct.place(row, "processes");

              var naicsQuery = new RelationshipQuery();
              naicsQuery.outFields = ['*'];
              naicsQuery.relationshipId = that.tblS1Process_NAICS.relationshipId;
              naicsQuery.objectIds = [process.attributes.OBJECTID];

              that.tblS1Processes.queryRelatedFeatures(naicsQuery, function (naicsCodes) {
                var s = [];
                dojo.forEach(naicsCodes[process.attributes.OBJECTID].features, function (naics, i) {
                  s.push(that.tblS1Process_NAICS.getDomain('NAICSCode').getName(naics.attributes.NAICSCode));

                });
                var row = domConstruct.toDom(s.join(','));
                domConstruct.place(row, 'process_' + process.attributes.ProcessID + '_naics');
              });


              var processChemicalsQuery = new RelationshipQuery();
              processChemicalsQuery.outFields = ['*'];
              processChemicalsQuery.relationshipId = that.tblS1ProcessChemicals.relationshipId;
              processChemicalsQuery.objectIds = [process.attributes.OBJECTID];

              // var layout = [
              //   {'name': 'Name', 'field': 'Name', 'width': '75%'},
              //   {'name': 'Quantity (lbs)', 'field': 'Quantity'}
              // ];
              // var data = {
              //   identifier: 'ChemicalID',
              //   items: []
              // };
              // var store = new ItemFileWriteStore({data: data});
              // store.data = data;

              that.tblS1Processes.queryRelatedFeatures(processChemicalsQuery, function (e) {
                dojo.forEach(e[process.attributes.OBJECTID].features, function (processChemical) {

                  var chemicalQuery = new RelationshipQuery();
                  chemicalQuery.outFields = ['*'];
                  chemicalQuery.relationshipId = that.tlkpChemicals.relationshipId;
                  chemicalQuery.objectIds = [processChemical.attributes.OBJECTID];

                  that.tblS1ProcessChemicals.queryRelatedFeatures(chemicalQuery, function (e) {
                    dojo.forEach(e[processChemical.attributes.OBJECTID].features, function (chemical) {
                      var row = domConstruct.toDom('<tr><td>' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(processChemical.attributes.Quantity) + '</td></tr>');
                      domConstruct.place(row, "process_" + process.attributes.ProcessID);
                      // var attrs = dojo.mixin({}, {'Name': chemical.attributes.ChemicalName, 'Quantity': processChemical.attributes.Quantity, 'ChemicalID': chemical.attributes.ChemicalID});
                      // data.items.push(attrs);
                      // console.log(attrs);
                    });
                  });
                });

                // var process_chemica_grid = new DataGrid({
                //   id: 'grid_'+process.attributes.ProcessID,
                //   store: store,
                //   structure: layout,
                //   //rowSelector: '20px',
                //   autoHeight: true
                // });
                // process_chemica_grid.placeAt('process_'+process.attributes.ProcessID+'_grid');
                //
                // process_chemica_grid.startup();
              });
            });
            that.loadingShelter.hide();
          });
          //   var contactQuery = new RelationshipQuery();
          //   // GET CONTACTS
          //   contactQuery.outFields = ['*'];
          //   //dojo.forEach(that.facilities.relationships, function (relationship, i) {
          //   // Facilities to Contacts relationship ID
          //   contactQuery.relationshipId = service.config.contacts.relationshipId;
          //   contactQuery.objectIds = [attributes.OBJECTID];
          //   that.facilities.queryRelatedFeatures(contactQuery, function (e) {
          //     dojo.forEach(e[attributes.OBJECTID].features, function (contact, i) {
          //
          //       var contactPhonesQuery = new RelationshipQuery();
          //
          //       contactPhonesQuery.outFields = ['*'];
          //       // contacts to phone relationship id
          //       contactPhonesQuery.relationshipId = service.config.contacts.phones.relationshipId;
          //       contactPhonesQuery.objectIds = [contact.attributes.OBJECTID];
          //
          //       service.contacts.queryRelatedFeatures(contactPhonesQuery, function (e) {
          //         // these attributes could be different for each state
          //         // the service.config.state object helps you identify which state you are working with
          //         var row = domConstruct.toDom('<tr><td style="padding-top: 10px;"><b>' + (contact.attributes.Title ? contact.attributes.Title + ': ' : '') +
          //           (contact.attributes.FirstName ? contact.attributes.FirstName : '') +
          //           ' ' + (contact.attributes.LastName ? contact.attributes.LastName : '') + '</b></td></tr>');
          //         domConstruct.place(row, "rmp_contacts");
          //
          //         var row = domConstruct.toDom('<tr><td>Email: ' + (contact.attributes.CoEmail ? contact.attributes.CoEmail : 'Not Reported') + '</td></tr>');
          //         domConstruct.place(row, "rmp_contacts");
          //
          //         dojo.forEach(e[contact.attributes.OBJECTID].features, function (contact_phone_feature, j) {
          //           var row = domConstruct.toDom('<tr><td>' + (contact_phone_feature.attributes.Type ? contact_phone_feature.attributes.Type + ': ' : '')
          //             + (contact_phone_feature.attributes.Phone ? contact_phone_feature.attributes.Phone : '') + '</td></tr>');
          //           domConstruct.place(row, "rmp_contacts");
          //         });
          //         that.loadingShelter.hide();
          //       }, function (e) {
          //         console.log("Error: " + e);
          //       });
          //     });
          //   }, function (e) {
          //     console.log("Error: " + e);
          //   });
          //
          //
          // if (service.config.chemicals.relationshipId !== 'none' && service.config.chemicals.relationshipId !== undefined && service.config.chemicals !== undefined) {
          //   // GET CHEMICALS
          //   var processChemicalsQuery = new RelationshipQuery();
          //   processChemicalsQuery.outFields = ['*'];
          //   // facilities to chemicals relationship ID
          //   processChemicalsQuery.relationshipId = service.config.chemicals.relationshipId;
          //   processChemicalsQuery.objectIds = [attributes.OBJECTID];
          //
          //   that.facilities.queryRelatedFeatures(processChemicalsQuery, function (e) {
          //     dojo.forEach(e[attributes.OBJECTID].features, function (chemical, i) {
          //       // these attributes could be different for each state
          //       // the service.config.state object helps you identify which state you are working with
          //       if (service.config.state.abbr === 'NV') {
          //         var row = domConstruct.toDom(
          //           '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.Chemical_Name
          //           + (chemical.attributes.CAS_Number ? ' (' + chemical.attributes.CAS_Number + ')' : '') + '</b></td></tr>' +
          //           '<tr><td>Mixture: ' + (chemical.attributes.Mixture_Chemical_Name ? chemical.attributes.Mixture_Chemical_Name : 'Not Reported') +
          //           (chemical.attributes.Mixture_CAS_Number ? ' (' + chemical.attributes.Mixture_CAS_Number + ')' : '') + '</td></tr>' +
          //           '<tr><td>Location: ' + (chemical.attributes.Storage_Location ? chemical.attributes.Storage_Location : 'Not Reported') + '</td></tr>' +
          //           '<tr><td>Max Dailly Amount: ' + (chemical.attributes.Maximum_Daily_Amount ? chemical.attributes.Maximum_Daily_Amount : 'Not Reported') + '</td></tr>' +
          //           '<tr><td>Largest Container: ' + (chemical.attributes.Maximum_Amt___Largest_Container ? chemical.attributes.Maximum_Amt___Largest_Container : 'Not Reported') + '</td></tr>' +
          //           '<tr><td>Avg Dailly Amount: ' + (chemical.attributes.Average_Daily_Amount ? chemical.attributes.Average_Daily_Amount : 'Not Reported') + '</td></tr>'
          //         );
          //         domConstruct.place(row, "rmp_chemicals");
          //       }
          //       if (service.config.chemicals.locations.relationshipId !== 'none' && service.config.chemicals.locations !== undefined) {
          //
          //         var chemicalLocationQuery = new RelationshipQuery();
          //
          //         chemicalLocationQuery.outFields = ['*'];
          //         // chemicals to chemical locations relationship id
          //         chemicalLocationQuery.relationshipId = service.config.chemicals.locations.relationshipId;
          //         chemicalLocationQuery.objectIds = [chemical.attributes.OBJECTID];
          //
          //         service.chemicals.queryRelatedFeatures(chemicalLocationQuery, function (e) {
          //           // these attributes could be different for each state
          //           // the service.config.state object helps you identify which state you are working with
          //           if (service.config.state.abbr === 'HI') {
          //             var row = domConstruct.toDom(
          //               '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.EnteredChemName
          //               + (chemical.attributes.CiCAS ? ' (' + chemical.attributes.CiCAS + ')' : '') + '</b></td></tr>' +
          //               '<tr><td>Days: ' + chemical.attributes.DaysOnSite + '</td></tr>'
          //             );
          //             domConstruct.place(row, "rmp_chemicals");
          //           } else if (service.config.state.abbr === 'CA') {
          //             var row = domConstruct.toDom(
          //               '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.chemical_name
          //               + (chemical.attributes.cas_code ? ' (' + chemical.attributes.cas_code + ')' : '') + '</b></td></tr>' +
          //               '<tr><td>Days: ' + chemical.attributes.DaysOnSite + '</td></tr>'
          //             );
          //             domConstruct.place(row, "rmp_chemicals");
          //           }
          //
          //           var row = domConstruct.toDom(
          //             '<tr><td>Max Amount: ' + (chemical.attributes.MaxAmount ? chemical.attributes.MaxAmount + ' lbs' : "Not Reported") + '</td></tr>' +
          //             '<tr><td>Max Amount Range: ' + (chemical.attributes.MaxAmountCode ? service.chemicals.getDomain("MaxAmountCode").getName(chemical.attributes.MaxAmountCode) : 'Not Reported') + '</td></tr>' +
          //             '<tr><td>Max Amount Container: ' + (chemical.attributes.MaxAmountContainer ? chemical.attributes.MaxAmountContainer : "Not Reported") + '</td></tr>' +
          //             '<tr><td>Average Amount: ' + (chemical.attributes.AveAmount ? chemical.attributes.AveAmount + ' lbs' : "Not Reported") + '</td></tr>' +
          //             '<tr><td>Average Amount Range: ' + (chemical.attributes.AveAmountCode ? service.chemicals.getDomain("AveAmountCode").getName(chemical.attributes.AveAmountCode) : 'Not Reported') + '</td></tr>'
          //           );
          //
          //           domConstruct.place(row, "rmp_chemicals");
          //
          //           var states = null;
          //           if (chemical.attributes.Gas === 'T') {
          //             states = 'Gas';
          //           }
          //           if (chemical.attributes.Solid === 'T') {
          //             states ? states += ', Solid' : states = 'Solid';
          //           }
          //           if (chemical.attributes.Liquid === 'T') {
          //             states ? states += ', Liquid' : states = 'Liquid';
          //           }
          //           if (states === null) {
          //             states = 'Not Reported';
          //           }
          //           var row = domConstruct.toDom('<tr><td>State(s): ' + states + '</td></tr>');
          //           domConstruct.place(row, 'rmp_chemicals');
          //
          //           var hazards = null;
          //           if (chemical.attributes.Fire === 'T') {
          //             hazards = 'Fire';
          //           }
          //           if (chemical.attributes.Pressure === 'T') {
          //             hazards = (hazards ? hazards += ', Sudden Release of Pressure' : 'Sudden Release of Pressure');
          //           }
          //           if (chemical.attributes.Reactive === 'T') {
          //             hazards = (hazards ? hazards += ', Reactive' : 'Reactive');
          //           }
          //           if (chemical.attributes.Acute === 'T') {
          //             hazards = (hazards ? hazards += ', Acute' : 'Acute');
          //           }
          //           if (chemical.attributes.Chronic === 'T') {
          //             hazards = (hazards ? hazards += ', Chronic' : 'Chronic');
          //           }
          //           if (hazards === null) {
          //             hazards = 'Not Reported';
          //           }
          //           var row = domConstruct.toDom('<tr><td>Hazard(s): ' + hazards + '</td></tr>');
          //           domConstruct.place(row, 'rmp_chemicals');
          //
          //
          //           dojo.forEach(e[chemical.attributes.OBJECTID].features, function (chemical_location, j) {
          //             var location_number = j + 1;
          //             var row = domConstruct.toDom(
          //               '<tr><td>-------------------</td></tr>' +
          //               '<tr><td>Location #' + location_number + ': ' + (chemical_location.attributes.Location ? chemical_location.attributes.Location : 'Not Reported') + '</td></tr>' +
          //               '<tr><td>Location #' + location_number + ' Type: ' + (chemical_location.attributes.LocationType ? chemical_location.attributes.LocationType : 'Not Reported') + '</td></tr>' +
          //               '<tr><td>Location #' + location_number + ' Pressure: ' + (chemical_location.attributes.LocationPressure ? chemical_location.attributes.LocationPressure : 'Not Reported') + '</td></tr>' +
          //               '<tr><td>Location #' + location_number + ' Temp: ' + (chemical_location.attributes.LocationTemperature ? chemical_location.attributes.LocationTemperature : 'Not Reported') + '</td></tr>' +
          //               '<tr><td>Location #' + location_number + ' Amount: ' + (chemical_location.attributes.Amount ? chemical_location.attributes.Amount + ' ' + chemical_location.attributes.AmountUnit : 'Not Reported') + '</td></tr>'
          //             );
          //             domConstruct.place(row, "rmp_chemicals");
          //
          //           });
          //           that.loadingShelter.hide();
          //         }, function (e) {
          //           console.log("Error: " + e);
          //         });
          //       }
          //     });
          //   }, function (e) {
          //     console.log("Error: " + e);
          //   });
          // } else {
          //   that.loadingShelter.hide();
          // }
        }

        this.graphicLayer = new GraphicsLayer();
        this.map.addLayer(this.graphicLayer);

        this.service = null;

        var loadRelated = function (obj) {
          dojo.forEach(obj.relationships, function (relationship) {
            if (relationship.role === "esriRelRoleOrigin") {
              that[relationship.name] = new FeatureLayer(that.baseurl + "/" + relationship.relatedTableId);
              that[relationship.name].relationshipId = relationship.id;
              that[relationship.name].on('load', function (e) {
                if (that[relationship.name].relationships.length > 0) {
                  loadRelated(that[relationship.name]);
                }
              })
            }
          });
        };
        // dojo.forEach(configs, function (config, i) {
        //   config.baseurl = that.config.baseurl;

        LayerInfos.getInstance(that.map, that.map.itemInfo).then(function (layerInfosObject) {
          var facilities = layerInfosObject.getLayerInfoById(that.config.layerId);
          that.facilities = new FeatureLayer(facilities.layerObject.url);
          that.facilities.on('load', function (e) {
            that.baseurl = that.facilities.url.substring(0, that.facilities.url.lastIndexOf('/'));
            loadRelated(that.facilities);
          });
        });


        // if (config.contacts !== undefined && config.contacts.relationshipId !== 'none') {
        //   that.facilitiess[i].contacts = new FeatureLayer(config.baseurl + config.contacts.layerId, {
        //     outFields: ["*"]
        //   });
        // }
        //
        // if (config.chemicals !== undefined && config.chemicals.relationshipId !== 'none') {
        //   that.facilitiess[i].chemicals = new FeatureLayer(config.baseurl + config.chemicals.layerId, {
        //     outFields: ["*"]
        //   });
        // }
        // that.facilitiess[i].config = config;
        // });

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

          // var noneFound = [];
          // dojo.forEach(that.facilitiess, function (service, i) {

          var featureQuery = new Query();
          featureQuery.outFields = ['*'];
          featureQuery.geometry = clickExtent;

          that.facilities.queryFeatures(featureQuery, function (featureSet) {
            if (featureSet.features.length === 1) {
              loadFeature(featureSet.features[0]);
              // noneFound.push(false);
            } else if (featureSet.features.length > 1) {
              mapIdNode.innerHTML = '<h3>Multiple Facilities at that location</h3><br/><h5>Select one to continue</h5>' +
                '<div id="gridDiv" style="width:100%;"></div>';
              var data = {
                identifier: 'OBJECTID',
                items: []
              };
              dojo.forEach(featureSet.features, function (feature) {
                feature.attributes.CompletionCheckDate = localeDate.format(new Date(feature.attributes.CompletionCheckDate), {selector: "date", datePattern:"MM-dd-yyyy"});
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
              // if (service.config.state.abbr === 'NV') {
              //   var layout = [
              //     {'name': '', 'field': 'Facility_Name', 'width': '100%'}
              //   ];
              // } else if (service.config.state.abbr === 'AZ') {
              //   var layout = [
              //     {'name': '', 'field': 'NAME', 'width': '100%'}
              //   ];
              // } else {
              //   var layout = [
              //     {'name': '', 'field': 'FacilityName', 'width': '100%'}
              //   ];
              // }
              var layout = [
                {'name': 'Name', 'field': 'FacilityName', 'width': '75%'},
                {'name': 'Completion Date', 'field': 'CompletionCheckDate', 'width': '25%'}
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
                var facility = array.filter(featureSet.features, function (feature) {
                  return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
                });
                loadFeature(facility[0]);
              });

              grid.startup();
              that.loadingShelter.hide();
              // noneFound.push(false);
            } else {
              mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
              that.loadingShelter.hide();
            }
            // if (noneFound.length === that.facilitiess.length) {
            //   var wasfound = array.filter(noneFound, function (found) {
            //     return found === false;
            //   });
            //   if (wasfound.length === 0) {
            //     mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
            //     that.loadingShelter.hide();
            //   }
            // }
          });

        });

        console.log('startup');
      },

      onOpen: function () {
        this.loadingShelter.show();
        console.log('RMPIdentify::onOpen');
        this.map.setInfoWindowOnClick(false);
        var that = this;
        if (that.clickHandler !== undefined) {
          that.clickHandler.resume();
        }

        // var statusLayer = new FeatureLayer(this.config.baseurl + this.config.statusLayer,
        //   {outFields: ['*']}),
        //   statusQuery = new Query();
        //
        // statusQuery.outFields = ['*'];
        // statusQuery.where = "1=1";

        this.mapIdNode.innerHTML = '<h1>RMP Indentify</h1><br/>' +
          '<table><tbody id="rmp_status"></tbody></table>' +
          '<br/>Click Facility to view information.';

        // could pull this once and check if the values are set instead of pulling data each time
        // statusLayer.queryFeatures(statusQuery, function (records) {
        //   dojo.forEach(records.features, function (record) {
        //     var lastUpdate = dojo.date.locale.format(new Date(record.attributes.LastUpdate), {datePattern: "yyyy-MM-dd", selector: "date"});
        //     that.status = "<tr><td>State: "+ record.attributes.State +"</td></tr>" +
        //       "<tr><td>Status Year: "+ record.attributes.CurrentReportingYear +"</td></tr>" +
        //       "<tr><td>Last Updated: "+ lastUpdate +"</td></tr>" +
        //       "<tr><td>Contact: "+ record.attributes.ContactName +"</td></tr>" +
        //       "<tr><td>Contact Phone: "+ record.attributes.ContactPhone +"</td></tr>" +
        //       "<tr><td>Contact Email: "+ record.attributes.ContactEmail +"</td></tr>" +
        //       "<tr><td> <br/></td></tr>";
        //     domConstruct.place(that.status, "rmp_status");
        //   });
        that.loadingShelter.hide();
        // });
      },

      onClose: function () {
        console.log('RMPIdentify::onClose');

        // clean up on close
        this.clickHandler.pause();
        this.graphicLayer.clear();
        this.map.setInfoWindowOnClick(true);
      }

    });

  });
