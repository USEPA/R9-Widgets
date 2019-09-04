define(['esri/graphic', 'esri/layers/FeatureLayer', 'esri/layers/GraphicsLayer', 'esri/tasks/RelationshipQuery', 'dojo/dom-construct',
    'esri/tasks/query', 'esri/symbols/PictureMarkerSymbol', 'esri/symbols/SimpleLineSymbol',
    'esri/Color', 'esri/dijit/util/busyIndicator', 'esri/geometry/Extent', 'dojox/grid/DataGrid',
    'dojo/data/ItemFileWriteStore', 'dijit/tree/ForestStoreModel', 'dijit/Tree', 'dojo/on', 'jimu/dijit/LoadingShelter',
    'dojo/_base/declare', 'dojo/_base/array', 'jimu/LayerInfos/LayerInfos', 'jimu/BaseWidget', 'dojo/number', 'dojo/date/stamp',
    'dijit/Dialog', 'dojo/Deferred', 'dojo/promise/all'],
  function (Graphic, FeatureLayer, GraphicsLayer, RelationshipQuery, domConstruct,
            Query, PictureMarkerSymbol, SimpleLineSymbol,
            Color, busyIndicator, Extent, DataGrid,
            ItemFileWriteStore, ForestStoreModel, Tree, on, LoadingShelter,
            declare, array, LayerInfos, BaseWidget, number, stamp, Dialog, Deferred, all) {

    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {

      // Custom widget code goes here

      baseClass: 'rmp-identify',
      // this property is set by the framework when widget is loaded.
      // name: 'RMPIdentify',
      // add additional properties here

      //methods to communication with app container:
      postCreate: function postCreate() {


        this.inherited(postCreate, arguments);
        console.log('RMPIdentify::postCreate');
      },
      featureLayers: [],
      graphicLayer: undefined,
      startup: function () {
        var configs = this.config.layers,
          mapIdNode = this.mapIdNode,
          that = this;
        this.executiveSummaryDialog = new Dialog({
          title: "Executive Summary"
        });
        this.symbol = new PictureMarkerSymbol(
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAUCAYAAABbLMdoAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAdtJREFUKJGV0k9Ik3Ecx/H3nn71iASyp12cE4KxUxaIPM9kzG0wUBSkf3jaoKgovChdwg6dOghCh6JLEHlZl3BpMHFrPj4oKKQM8fDAXORh2HaRnaL4wWwdBtY2V/S9fb+8+MLv8/0J/qNE8yCbRanVeDM8zO1/YuDl6iq3Nja6l0Kh8lJbnMuhra1x3+mEg4Pya6A9LpVIKgpnJidhbo4Lpqk+jUblkxa8uYmeThOJx6GrC0ZGYHdXPtrZYVbX+d6Ai0Xe9faCz1fvDQMsi3NHR7wFrp/g9XXtTipVuTg1BQ5HHXd0wNgYpNNc3d7GZxh8Ftksyv5+5fnAAHg8jbH094Nl4SgW1STIK0II9WGhIM9PT7dmKAREIrC4KC9vbeEVnZ3yldvNrG1ztnlzrQa5HPT1UQoE+CL8fr6Zpvosk5Ezug6a9hvn83B4CKOjxE8eGI3Kx/PzPDBNnBMTdXh8DMvLYBjqp6EhaTVE5/V230ulyslAAHp6YG8PqlV+ut3yZstRQqHy+4UF1c5k5KVYrL7V7ydhGHw99dwej7xh2+QTCRwuFz8UhbsN6fzZDA5SWFnhg2lybXxcmwmHK9W2GMDlIhYMqh/D4cqLltybB/VPI4PN81Px3+oXm5WbogYCJW8AAAAASUVORK5CYII=',
          11,
          20
        );

        that.loadDeferred = new Deferred();

        this.loadingShelter = new LoadingShelter({hidden: true});
        this.loadingShelter.placeAt(that.domNode);

        this.loadingShelter.show();

        this.currentFacility = null;

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

        LayerInfos.getInstance(that.map, that.map.itemInfo).then(function (layerInfosObject) {
          var facilities = layerInfosObject.getLayerInfoById(that.config.layerId);
          that.facilities = new FeatureLayer(facilities.layerObject.url);
          that.facilities.on('load', function (e) {
            that.baseurl = that.facilities.url.substring(0, that.facilities.url.lastIndexOf('/'));
            loadRelated(that.facilities);
            that.loadDeferred.resolve();
          });
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

          var featureQuery = new Query();
          featureQuery.outFields = ['*'];
          featureQuery.geometry = clickExtent;

          that.facilities.queryFeatures(featureQuery, function (featureSet) {
            if (featureSet.features.length === 1) {
              that.loadRMPs(featureSet.features[0]);
              // noneFound.push(false);
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

              var layout = [
                {'name': 'Name', 'field': 'FacilityName', 'width': '100%'}
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
                that.loadRMPs(facility[0]);
              });

              grid.startup();
              that.loadingShelter.hide();
              // noneFound.push(false);
            } else {
              mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
              that.loadingShelter.hide();
            }
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

        this.mapIdNode.innerHTML = '<h1>RMP Identify</h1><br/>' +
          '<h5 id="refresh_date"></h5>' +
          '<br/>Click Facility to view information.' +
          '<br/><br/><h5 style="text-decoration: underline;">RMP Program Levels</h5>' +
          '<br/><u>Program Level 1</u>: Processes which would not affect the public in the case of a worst-case release (in the language of Part 68, processes “with no public receptors ' +
          'within the distance to an endpoint from a worst-case release”) and with no accidents with specific offsite consequences within the past five years are eligible for ' +
          'Program 1, which imposes limited hazard assessment requirements and minimal prevention and emergency response requirements. ' +
          '<br/><br/><u>Program Level 2</u>:  Processes not eligible for Program 1 or subject to Program 3 are placed in Program 2, which imposes streamlined prevention program requirements, ' +
          'as well as additional hazard assessment, management, and emergency response requirements. ' +
          '<br/><br/><u>Program Level 3</u>:  Processes not eligible for Program 1 and either subject to OSHA\'s PSM standard under federal or state OSHA programs or classified in ' +
          'one of ten specified North American Industrial Classification System (NAICS) codes are placed in Program 3, which imposes OSHA’s PSM standard as the prevention program ' +
          'as well as additional hazard assessment, management, and emergency response requirements.' +
          '<br/><br/><h5 style="text-decoration: underline;">Dataset Notes</h5>' +
          'This dataset was created directly from the RMP Access databases obtained from CDX RMP*Info data flow.  This widget only displays parts of the RMP dataset. ' +
          'For the full dataset please see the RMP*Review Application.  In processing this dataset we used validated RMP locations<sup>1</sup> first, FRS locations<sup>2</sup> second and unvalidated RMP locations last. ' +
          'Any available metadata about these locations are displayed (method, description, accuracy, etc).  Only locations from the most recently-submitted RMP were used.' +
          '<br/><br/><sup>1</sup>RMP validates locations by verifying they are inside bounding box coordinates corresponding to the county in which the facility exists.' +
          '<br/><br/><sup>2</sup>For information on FRS locations see the <a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BB158161D-F639-4A93-BF7C-D454C80F7C92%7D">metadata in the EDG.';

        if (that.baseurl === undefined) {
          that.loadDeferred.then(function () {
            var statusLayer = new FeatureLayer(that.baseurl + '/' + that.config.statusLayer,
              {outFields: ['*']}),
              statusQuery = new Query();
            statusQuery.outFields = ['*'];
            statusQuery.where = "OBJECTID Like '%'";

            statusLayer.queryFeatures(statusQuery, function (featureSet) {
              that.refresh_date = stamp.toISOString(new Date(featureSet.features[0].attributes.DateRefreshed), {
                selector: "date",
                zulu: true
              });
              domConstruct.place(domConstruct.toDom('RMP Refresh Date: ' + that.refresh_date), 'refresh_date');
              that.loadingShelter.hide();
            });
          });
        } else {
          domConstruct.place(domConstruct.toDom('RMP Refresh Date: ' + that.refresh_date), 'refresh_date');
          that.loadingShelter.hide();
        }


      },
      onClose: function () {
        console.log('RMPIdentify::onClose');

        // clean up on close
        this.clickHandler.pause();
        this.graphicLayer.clear();
        this.map.setInfoWindowOnClick(true);
      },
      loadRMPs: function (feature) {
        var that = this;
        this.currentFacility = feature;
        this.loadingShelter.show();
        var attributes = feature.attributes;

        var selectedGraphic = new Graphic(feature.geometry, that.symbol);

        this.graphicLayer.add(selectedGraphic);

        var rmpQuery = new RelationshipQuery();
        rmpQuery.outFields = ['*'];
        rmpQuery.objectIds = [attributes.OBJECTID];
        rmpQuery.relationshipId = that.AllFacilities.relationshipId;
        this.facilities.queryRelatedFeatures(rmpQuery, function (e) {
            var features = e[attributes.OBJECTID].features;
            if (features.length === 1) {
              that.multipleRMPs = false;
              that.loadFeature(features[0])
            } else {
              that.multipleRMPs = true;
              that.mapIdNode.innerHTML = '<h3>Multiple RMPs Found for ' + attributes.FacilityName + '</h3>' +
                '<h4 id="facilityStatus"></h4><br/>' +
                '<h5>Select one to continue</h5>' +
                '<div id="rmpGridDiv" style="width:100%;"></div><br/><br/>' +
                '<h3 style="text-decoration: underline;">Location Metadata</h3>' +
                '<div style="width:100%" id="location_metadata"></div><br/><br/>';
              var data = {
                identifier: 'OBJECTID',
                items: []
              };
              dojo.forEach(features, function (feature) {
                feature.attributes.CompletionCheckDate = stamp.toISOString(new Date(feature.attributes.CompletionCheckDate), {
                  selector: "date",
                  zulu: true
                });

                var attrs = dojo.mixin({}, feature.attributes);
                data.items.push(attrs);
              });

              var store = new ItemFileWriteStore({data: data});
              store.data = data;

              var grid = dijit.byId("rmpGrid");

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
                id: 'rmpGrid',
                store: store,
                structure: layout,
                //rowSelector: '20px',
                autoHeight: true,
                sortInfo: '-2'
              });

              grid.placeAt("rmpGridDiv");

              grid.on('RowClick', function (e) {
                var rowItem = grid.getItem(e.rowIndex);
                var facility = array.filter(features, function (feature) {
                  return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
                });
                that.loadFeature(facility[0]);
              });

              grid.startup();

              //get most recent record to display deregistration status
              var mostRecentRMP = features[0].attributes;
              dojo.forEach(features, function (feature) {
                if (feature.attributes.CompletionCheckDate > mostRecentRMP.CompletionCheckDate) {
                  mostRecentRMP = feature.attributes;
                }
              });
              var status;
              if (mostRecentRMP.DeRegistrationEffectiveDate) {
                status = 'De-registered';
                var reason = (mostRecentRMP.DeregistrationReasonCode !== '04' ?
                  that.AllFacilities.getDomain('DeregistrationReasonCode').getName(mostRecentRMP.DeregistrationReasonCode) :
                  mostRecentRMP.DeregistrationReasonOtherText);
                var date = mostRecentRMP.DeRegistrationEffectiveDate;
              } else {
                status = 'Active';
              }


              var row = domConstruct.toDom('Facility Status: ' + status +
                (reason ? '<br/>De-registration Reason: ' + reason : '') +
                (date ? '<br/>De-registration Effective Date: ' + stamp.toISOString(new Date(date), {
                  selector: "date",
                  zulu: true
                }) : '')
              );
              domConstruct.place(row, 'facilityStatus');

              if (mostRecentRMP.ValidLatLongFlag) {
                var location_string = 'RMP Validated Location Used' +
                  '<br/>Description: ' + that.AllFacilities.getDomain('LatLongDescription').getName(mostRecentRMP.LatLongDescription) +
                  '<br/>Method: ' + that.AllFacilities.getDomain('LatLongMethod').getName(mostRecentRMP.LatLongMethod);
              } else if (!mostRecentRMP.ValidLatLongFlag && mostRecentRMP.FRS_Lat !== undefined && mostRecentRMP.FRS_long !== undefined) {
                var location_string = 'FRS Location Used' +
                  '<br/>Description: ' + that.AllFacilities.getDomain('FRS_Description').getName(mostRecentRMP.FRS_Description) +
                  '<br/>Method: ' + that.AllFacilities.getDomain('FRS_Method').getName(mostRecentRMP.FRS_Method);
              } else {
                var location_string = 'Location Not Validated' +
                  '<br/>Description: ' + that.AllFacilities.getDomain('LatLongDescription').getName(mostRecentRMP.LatLongDescription) +
                  '<br/>Method: ' + that.AllFacilities.getDomain('LatLongMethod').getName(mostRecentRMP.LatLongMethod);
              }

              if (mostRecentRMP.HorizontalAccMeasure) {
                location_string += '<br/>Horizontal Accuracy (m): ' + mostRecentRMP.HorizontalAccMeasure +
                  '<br/>Horizontal Datum: ' + that.AllFacilities.getDomain('HorizontalRefDatumCode').getName(mostRecentRMP.HorizontalRefDatumCode) +
                  (mostRecentRMP.SourceMapScaleNumber ? '<br/>Source Map Scale: ' + mostRecentRMP.SourceMapScaleNumber : '')
              }

              var row = domConstruct.toDom(location_string);
              domConstruct.place(row, 'location_metadata');

              that.loadingShelter.hide();
            }
          }
        );
      },
      loadFeature: function loadFeature(feature) {
        var that = this;
        that.loadingShelter.show();
        var attributes = feature.attributes, processDeferred = new Deferred(), accidentDeferred = new Deferred;

        var selectedGraphic = new Graphic(feature.geometry, that.symbol);

        that.graphicLayer.add(selectedGraphic);

        var status;
        if (attributes.DeRegistrationEffectiveDate) {
          status = 'De-registered';
          var reason = (attributes.DeregistrationReasonCode !== '04' ?
            that.AllFacilities.getDomain('DeregistrationReasonCode').getName(attributes.DeregistrationReasonCode) :
            attributes.DeregistrationReasonOtherText);
          var date = attributes.DeRegistrationEffectiveDate;
          var status_string = status +
            (reason ? '<br/>De-registration Reason: ' + reason : '') +
            (date ? '<br/>De-registration Effective Date: ' + stamp.toISOString(new Date(date), {
              selector: "date",
              zulu: true
            }) : '') + '<br/><br/>';
        } else {
          status_string = 'Active<br/><br/>';
        }

        this.mapIdNode.innerHTML = (this.multipleRMPs ? '<a id="backLink" style="text-decoration:underline; cursor: pointer;">< Back</a>' : '') +
          '<h1>' + attributes.FacilityName + '</h1>' +
          '<h4 id="registration_status">Status: ' + status_string + '</h4>' +
          '<table><tbody id="tierii_facility">' +
          '<tr><td>Address: <br/>' + attributes.FacilityStr1 + '<br/>' + (attributes.FacilityStr2 ? attributes.FacilityStr2 + '<br/>' : '') +
          attributes.FacilityCity + ', ' + attributes.FacilityState + ' ' + attributes.FacilityZipCode + '</td></tr>' +
          '<tr><td>Phone: ' + (attributes.FacilityPhoneNumber ? attributes.FacilityPhoneNumber : 'Not Reported') + '</td></tr>' +
          '<tr><td>Website: ' + (attributes.FacilityURL ? attributes.FacilityURL : 'Not Reported') + '</td></tr>' +
          '<tr><td>Email: ' + (attributes.FacilityEmailAddress ? attributes.FacilityEmailAddress : 'Not Reported') + '</td></tr>' +
          '<tr><td>Full Time Employees: ' + attributes.FTE + '</td></tr>' +
          '<tr><td>RMP Completion Date: ' + stamp.toISOString(new Date(feature.attributes.CompletionCheckDate), {
            selector: "date",
            zulu: true
          }) + '</td></tr>' +
          '<tr><td>Parent Company(s): ' + (attributes.ParentCompanyName ? attributes.ParentCompanyName : 'Not Reported') + (attributes.Company2Name ? ', ' + attributes.Company2Name : '') + '</td></tr>' +
          '<tr><td><a id="summaryLink" style="text-decoration: underline; cursor: pointer;">View Executive Summary</a></td></tr></tbody></table>' +
          '<br/><h3 style="text-decoration: underline;">Contacts</h3>' +
          '<table><tbody><tr><td><b>Operator</b></td></tr>' +
          '<tr><td>Name: ' + attributes.OperatorName + '</td></tr>' +
          '<tr><td>Phone: ' + attributes.OperatorPhone + '</td></tr>' +
          '<tr><td><b>Emergency Contact</b></td></tr>' +
          '<tr><td>Name: ' + attributes.EmergencyContactName + '</td></tr>' +
          '<tr><td>Title: ' + attributes.EmergencyContactTitle + '</td></tr>' +
          '<tr><td>Phone: ' + attributes.EmergencyContactPhone + (attributes.EmergencyContactExt_PIN ? ' x' + attributes.EmergencyContactExt_PIN : '') + '</td></tr>' +
          '<tr><td>24 HR Phone: ' + attributes.Phone24 + '</td></tr>' +
          '<tr><td></td></tr>' +
          '</tbody></table>' +
          '<table><tbody id="tierii_contacts"></tbody></table><br/>' +
          '<h3 style="text-decoration: underline;">Processes</h3>' +
          '<div style="width:100%" id="processes"></div><br/>' +
          '<h3 style="text-decoration: underline;">Accidents</h3>' +
          '<div style="width:100%" id="accidents"></div><br/>' +
          '<h3 style="text-decoration: underline;">Emergency Reponse Plan</h3>' +
          '<div style="width:100%" id="emergency_plan"></div><br/>' +
          (this.multipleRMPs ? '' : '<h3 style="text-decoration: underline;">Location Metadata</h3>' +
            '<div style="width:100%" id="location_metadata"></div><br/><br/>');

        document.getElementById('summaryLink').onclick = function () {
          that.executiveSummaryDialog.show();
        };
        document.getElementById('backLink').onclick = function () {
           that.loadRMPs(that.currentFacility);
        };
        // get executive summary for dialog box
        var executiveSummaryQuery = new RelationshipQuery();
        executiveSummaryQuery.outFields = ['*'];
        executiveSummaryQuery.relationshipId = that.ExecutiveSummaries.relationshipId;
        executiveSummaryQuery.objectIds = [attributes.OBJECTID];

        that.AllFacilities.queryRelatedFeatures(executiveSummaryQuery, function (e) {
          var summary = '';
          var summary_parts = e[attributes.OBJECTID].features.sort(function (obj1, obj2) {
            return obj1.attributes.ESSeqNum - obj2.attributes.ESSeqNum
          });
          dojo.forEach(summary_parts, function (summary_part) {
            summary += summary_part.attributes.SummaryText.replace(/(?:\r\n|\r|\n)/g, '<br />');
          });
          that.executiveSummaryDialog.set("content", summary);
        });

        var processQuery = new RelationshipQuery();
        processQuery.outFields = ['*'];
        processQuery.relationshipId = that.tblS1Processes.relationshipId;
        processQuery.objectIds = [attributes.OBJECTID];

        that.AllFacilities.queryRelatedFeatures(processQuery, function (featureSet) {
          dojo.forEach(featureSet[attributes.OBJECTID].features, function (process) {
            var row = domConstruct.toDom('' +
              '<div><b>Name: ' + (process.attributes.AltID ? process.attributes.AltID : 'not reported') + '</b></div>' +
              '<div>Description(s): <span id="process_' + process.attributes.ProcessID + '_naics"></span></div>' +
              '<div>Program Level: ' + process.attributes.ProgramLevel + '</span></div>' +
              '<table><tbody id="process_' + process.attributes.ProcessID + '"><tr><th colspan="2">Chemical</th><th>Quantity (lbs)</th></tr></tbody></table>');
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

            that.tblS1Processes.queryRelatedFeatures(processChemicalsQuery, function (e) {
              dojo.forEach(e[process.attributes.OBJECTID].features, function (processChemical) {

                var chemicalQuery = new RelationshipQuery();

                chemicalQuery.outFields = ['*'];
                chemicalQuery.relationshipId = that.tlkpChemicals.relationshipId;
                chemicalQuery.objectIds = [processChemical.attributes.OBJECTID];

                that.tblS1ProcessChemicals.queryRelatedFeatures(chemicalQuery, function (e) {
                  dojo.forEach(e[processChemical.attributes.OBJECTID].features, function (chemical) {
                    if (chemical.attributes.CASNumber === '00-11-11') {
                      var flammableMixtureQuery = new RelationshipQuery();
                      flammableMixtureQuery.outFields = ['*'];
                      flammableMixtureQuery.relationshipId = that.tblS1FlammableMixtureChemicals.relationshipId;
                      flammableMixtureQuery.objectIds = [processChemical.attributes.OBJECTID];

                      that.tblS1ProcessChemicals.queryRelatedFeatures(flammableMixtureQuery, function (e) {
                        var chemicalOBJECTIDS = [];
                        dojo.forEach(e[processChemical.attributes.OBJECTID].features, function (item) {
                          chemicalOBJECTIDS.push(item.attributes.OBJECTID)
                        });

                        var chemicalLookup = new RelationshipQuery();
                        chemicalLookup.outFields = ['*'];
                        chemicalLookup.relationshipId = that.FlammableChemicals.relationshipId;
                        chemicalLookup.objectIds = chemicalOBJECTIDS;

                        that.tblS1FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup, function (e) {
                          var row_string = '<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(processChemical.attributes.Quantity) + '</td></tr>';
                          dojo.forEach(chemicalOBJECTIDS, function (objectid) {
                            dojo.forEach(e[objectid].features, function (mixtureChemical) {
                              row_string += '<tr><td>&#187;</td><td>' + mixtureChemical.attributes.ChemicalName + '</td><td></td></tr>';

                            })
                          });
                          var row = domConstruct.toDom(row_string);
                          domConstruct.place(row, "process_" + process.attributes.ProcessID);
                        })
                      })
                    } else {
                      var row = domConstruct.toDom('<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(processChemical.attributes.Quantity) + '</td></tr>');
                      domConstruct.place(row, "process_" + process.attributes.ProcessID);
                    }
                  });
                  processDeferred.resolve();
                });
              });
            });
          });
        });

        var accidentQuery = new RelationshipQuery();
        accidentQuery.outFields = ['*'];
        accidentQuery.relationshipId = that.tblS6AccidentHistory.relationshipId;
        accidentQuery.objectIds = [attributes.OBJECTID];

        that.AllFacilities.queryRelatedFeatures(accidentQuery, function (featureSet) {
          if (featureSet.hasOwnProperty(attributes.OBJECTID)) {
            dojo.forEach(featureSet[attributes.OBJECTID].features, function (accident) {
              var release_event = [];
              accident.attributes.RE_Gas ? release_event.push('Gas') : null;
              accident.attributes.RE_Spill ? release_event.push('Spill') : null;
              accident.attributes.RE_Fire ? release_event.push('Fire') : null;
              accident.attributes.RE_Explosion ? release_event.push('Explosion') : null;
              accident.attributes.RE_ReactiveIncident ? release_event.push('Reactive Incident') : null;

              var release_source = [];
              accident.attributes.RS_StorageVessel ? release_source.push('Storage Vessel') : null;
              accident.attributes.RS_Piping ? release_source.push('Piping') : null;
              accident.attributes.RS_ProcessVessel ? release_source.push('Process Vessel') : null;
              accident.attributes.RS_TransferHose ? release_source.push('Transfer Hose') : null;
              accident.attributes.RS_Valve ? release_source.push('Valve') : null;
              accident.attributes.RS_Pump ? release_source.push('Pump') : null;
              accident.attributes.RS_Joint ? release_source.push('Joint') : null;
              accident.attributes.OtherReleaseSource ? release_source.push('Other') : null;

              var row = domConstruct.toDom('' +
                '<div style="padding-top:10px;"><b>Date: ' + stamp.toISOString(new Date(accident.attributes.AccidentDate), {
                  selector: "date",
                  zulu: true
                }) + '</b></div>' +
                '<div>Duration (HHH:MM): ' + accident.attributes.AccidentReleaseDuration.substring(0, 3) + ':' + accident.attributes.AccidentReleaseDuration.substring(3, 5) + '</div>' +
                '<div>Release Event(s): ' + release_event.join(',') + '</span></div>' +
                '<div>Release Source(s): ' + release_source.join(',') + '</span></div>' +
                '<table><tbody id="accident_' + accident.attributes.AccidentHistoryID + '"><tr><th colspan="2">Chemical(s)</th><th>Quantity (lbs)</th></tr></tbody></table>');
              domConstruct.place(row, "accidents");

              var accidentChemicalQuery = new RelationshipQuery();
              accidentChemicalQuery.outFields = ['*'];
              accidentChemicalQuery.relationshipId = that.AccidentChemicals.relationshipId;
              accidentChemicalQuery.objectIds = [accident.attributes.OBJECTID];

              that.tblS6AccidentHistory.queryRelatedFeatures(accidentChemicalQuery, function (e) {
                dojo.forEach(e[accident.attributes.OBJECTID].features, function (accidentChemical) {

                  var chemicalQuery = new RelationshipQuery();
                  chemicalQuery.outFields = ['*'];
                  chemicalQuery.relationshipId = that.tblS6AccidentChemicals.relationshipId;
                  chemicalQuery.objectIds = [accidentChemical.attributes.OBJECTID];

                  that.tblS6AccidentChemicals.queryRelatedFeatures(chemicalQuery, function (e) {
                    dojo.forEach(e[accidentChemical.attributes.OBJECTID].features, function (chemical) {
                      if (chemical.attributes.CASNumber === '00-11-11') {
                        var flammableMixtureQuery = new RelationshipQuery();
                        flammableMixtureQuery.outFields = ['*'];
                        flammableMixtureQuery.relationshipId = that.tblS6FlammableMixtureChemicals.relationshipId;
                        flammableMixtureQuery.objectIds = [accidentChemical.attributes.OBJECTID];

                        that.tblS6AccidentChemicals.queryRelatedFeatures(flammableMixtureQuery, function (e) {
                          var chemicalOBJECTIDS = [];
                          dojo.forEach(e[accidentChemical.attributes.OBJECTID].features, function (item) {
                            chemicalOBJECTIDS.push(item.attributes.OBJECTID)
                          });

                          var chemicalLookup = new RelationshipQuery();
                          chemicalLookup.outFields = ['*'];
                          chemicalLookup.relationshipId = that.AccidentFlamMixChem.relationshipId;
                          chemicalLookup.objectIds = chemicalOBJECTIDS;

                          that.tblS6FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup, function (e) {
                            var row_string = '<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(accidentChemical.attributes.QuantityReleased) + '</td></tr>';
                            dojo.forEach(chemicalOBJECTIDS, function (objectid) {
                              dojo.forEach(e[objectid].features, function (mixtureChemical) {
                                row_string += '<tr><td>&#187;</td><td>' + mixtureChemical.attributes.ChemicalName + '</td><td></td></tr>';

                              })
                            });
                            var row = domConstruct.toDom(row_string);
                            domConstruct.place(row, "accident_" + accident.attributes.AccidentHistoryID);
                          });
                        });
                      } else {
                        var row = domConstruct.toDom('<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(accidentChemical.attributes.QuantityReleased) + '</td></tr>');
                        domConstruct.place(row, "accident_" + accident.attributes.AccidentHistoryID);
                      }
                    });
                  });
                });
              });
            })
          } else {
            domConstruct.place(domConstruct.toDom('<b>Not Accidents Reported</b>'), "accidents");
          }
          accidentDeferred.resolve();
        });

        var ERQuery = new RelationshipQuery();
        ERQuery.outFields = ['*'];
        ERQuery.relationshipId = that.tblS9EmergencyResponses.relationshipId;
        ERQuery.objectIds = [attributes.OBJECTID];

        that.AllFacilities.queryRelatedFeatures(ERQuery, function (e) {
          var er_plans = e[attributes.OBJECTID].features[0];
          var row_string =
            '<table><tbody id="er_plan_table">' +
            '<tr><td>Is facility included in written community ER plan?</td><td>' + (er_plans.attributes.ER_CommunityPlan ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td>Does facility have its own written ER plan?</td><td>' + (er_plans.attributes.ER_FacilityPlan ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td colspan="2"></td></tr>' +
            '<tr><td colspan="2"><b>Does facility\'s ER plan include ...</b></td></tr>' +
            '<tr><td class="nested">specific actions to be take in response to accidental release of regulated substance(s)?</td><td>' + (er_plans.attributes.ER_ResponseActions ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td class="nested">procedures for informing the public and local agencies responding to accident releases?</td><td>' + (er_plans.attributes.ER_PublicInfoProcedures ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td class="nested">information on emergency health care?</td><td>' + (er_plans.attributes.ER_EmergencyHealthCare ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td></td></tr>' +
            '<tr><td colspan="2"><b>Date of most recent ...</b></td></tr>' +
            '<tr><td colspan="2" class="nested">review or update of facility\'s ER plan?  ' + (er_plans.attributes.ER_ReviewDate ? stamp.toISOString(new Date(er_plans.attributes.ER_ReviewDate), {
              selector: "date",
              zulu: true
            }) : 'Not Reported') + '</td></tr>' +
            '<tr><td colspan="2" class="nested">ER training for facility\'s ER employees?  ' + (er_plans.attributes.ERTrainingDate ? stamp.toISOString(new Date(er_plans.attributes.ERTrainingDate), {
              selector: "date",
              zulu: true
            }) : 'Not Reported') + '</td></tr>' +
            '<tr><td></td></tr>' +
            '<tr><td colspan="2"><b>Local agency with which facility\'s ER plan ore response activities are coordinated</b></td></tr>' +
            '<tr><td colspan="2" class="nested">Name: ' + (er_plans.attributes.CoordinatingAgencyName ? er_plans.attributes.CoordinatingAgencyName : 'Not Reported') +
            '<br/>Number:' + (er_plans.attributes.CoordinatingAgencyPhone ? er_plans.attributes.CoordinatingAgencyPhone : 'Not Reported') + '</td></tr>' +
            '<tr><td colspan="2"></td></tr>' +
            '<tr><td colspan="2"><b>Subject to ...</b></td></tr>' +
            '<tr><td class="nested">OSHA Regulations at 29 CFR 1910.38?</td><td>' + (er_plans.attributes.FR_OSHA1910_38 ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td class="nested">OSHA Regulations at 29 CFR 1910.120?</td><td>' + (er_plans.attributes.FR_OSHA1910_120 ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td class="nested">Clean Water Act Regulations at 40 CFR 112?</td><td>' + (er_plans.attributes.FR_SPCC ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td class="nested">RCRA Regulations at 40 CFR 264, 265, and 279.52?</td><td>' + (er_plans.attributes.FR_RCRA ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td class="nested">OPA 90 Regulations at 40 CFR 112, 33 CFR 154, 49 CFR 194, or 30 CFR 254?</td><td>' + (er_plans.attributes.FR_OPA90 ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td class="nested">State EPCRA Rules or Laws?</td><td>' + (er_plans.attributes.FR_EPCRA ? 'Yes' : 'No') + '</td></tr>' +
            '<tr><td colspan="2" style="padding-left:10px;">Other: ' + er_plans.attributes.FR_OtherRegulation + '</td></tr>' +
            '</tbody></table>';
          var row = domConstruct.toDom(row_string);
          domConstruct.place(row, 'emergency_plan');
        });

        if (!this.multipleRMPs) {
          if (attributes.ValidLatLongFlag) {
            var location_string = 'RMP Validated Location Used' +
              '<br/>Description: ' + that.AllFacilities.getDomain('LatLongDescription').getName(attributes.LatLongDescription) +
              '<br/>Method: ' + that.AllFacilities.getDomain('LatLongMethod').getName(attributes.LatLongMethod);
          } else if (!attributes.ValidLatLongFlag && attributes.FRS_Lat !== undefined && attributes.FRS_long !== undefined) {
            var location_string = 'FRS Location Used' +
              '<br/>Description: ' + that.AllFacilities.getDomain('FRS_Description').getName(attributes.FRS_Description) +
              '<br/>Method: ' + that.AllFacilities.getDomain('FRS_Method').getName(attributes.FRS_Method);
          } else {
            var location_string = 'Location Not Validated' +
              '<br/>Description: ' + that.AllFacilities.getDomain('LatLongDescription').getName(attributes.LatLongDescription) +
              '<br/>Method: ' + that.AllFacilities.getDomain('LatLongMethod').getName(attributes.LatLongMethod);
          }

          if (attributes.HorizontalAccMeasure) {
            location_string += '<br/>Horizontal Accuracy (m): ' + attributes.HorizontalAccMeasure +
              '<br/>Horizontal Datum: ' + that.AllFacilities.getDomain('HorizontalRefDatumCode').getName(attributes.HorizontalRefDatumCode) +
              (attributes.SourceMapScaleNumber ? '<br/>Source Map Scale: ' + attributes.SourceMapScaleNumber : '')
          }

          var row = domConstruct.toDom(location_string);
          domConstruct.place(row, 'location_metadata');
        }

        all([processDeferred.promise, accidentDeferred.promise]).then(function () {
          that.loadingShelter.hide();
        });
      }

    });

  });
