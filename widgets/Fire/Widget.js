///////////////////////////////////////////////////////////////////////////
// Copyright © Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define(['dojo/_base/declare', 'jimu/BaseWidget', 'dojo/dom', 'dojo/dom-construct', 'esri/tasks/QueryTask', 'esri/tasks/query',
    'dijit/ProgressBar', 'esri/layers/FeatureLayer', 'esri/dijit/util/busyIndicator', 'dojo/dom-style', 'dojo/on',
    'esri/geometry/Extent', 'dijit/form/Button', 'jimu/LayerStructure', 'esri/geometry/geometryEngine', 'esri/geometry/Polygon'],
  function (declare, BaseWidget, dom, domConstruct, QueryTask, Query,
            ProgressBar, FeatureLayer, busyIndicator, domStyle, on,
            Extent, Button, LayerStructure, geometryEngine, Polygon) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // DemoWidget code goes here

      //please note that this property is be set by the framework when widget is loaded.
      //templateString: template,

      baseClass: 'jimu-widget-fire',
      irwinLabel: "Wildfire Reporting (IRWIN)",
      perimeterLabel: "NIFS Current Wildfire Perimeters",
      boundariesUrl: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_States_Generalized/FeatureServer/0',
      postCreate: function () {
        this.inherited(arguments);
        console.log('postCreate');
      },

      startup: function () {
        vs = this;
        this.inherited(arguments);
        console.log('startup');
        //set up busyIndicator
        vs.busyHandle = busyIndicator.create(vs.fireWidgetFrame);
        vs.busyHandle.show();
        vs.r9Geom = vs.getGeometryUnion(vs.boundariesUrl, where = "STATE_ABBR='CA' OR STATE_ABBR='AZ' OR STATE_ABBR='NV'");
      },

      loadFires: function () {
        var currentDate = vs._getCurrentDate();
        //Identify default fire layers and visisblity
        //get perimeter buffer feature layer
        // vs.perimeterbufferFC = new FeatureLayer("https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/R9_Fire_Perimeter_Buffers/FeatureServer/0", {
        vs.perimeterbufferFC = new FeatureLayer("https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/R9Notifiable/FeatureServer/0", {
          // definitionExpression: "display = 1 AND acres >= 10 AND RETRIEVED >= " + "'" + currentDate + "'"
          definitionExpression: "Display = 1"
        });
        var bufferLayerStatus = vs.map.getLayer(vs.perimeterbufferFC.id);
        if (!bufferLayerStatus) {
          vs.map.addLayer(vs.perimeterbufferFC, 0);
        }

        //Query for fires
        var query = new Query();
        var queryTask = new QueryTask(vs.perimeterbufferFC.url);
        // query.where = "display = 1 AND acres >= 10 and RETRIEVED >= " + "'" + currentDate + "'";
        query.where = "Display = 1";
        query.outSpatialReference = {wkid: 102100};
        query.returnGeometry = true;
        query.orderByFields = ["Name ASC"];
        query.outFields = ["*"];
        return queryTask.execute(query, this._QueryFiresResults, vs._QueryfireResultsError).then(function () {
          vs.busyHandle.hide();
          domStyle.set(vs.headerInfo, "display", "block");
        });
      },

      _getCurrentDate: function () {
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        return yyyy + '-' + mm + '-' + dd;
      },

      _QueryFiresResults: function (results) {
        console.log("Query Fire Results");
        vs.all_fires = results.features;

        //Loop through fires and add dom objects
        vs.fireList.replaceChildren("");
        for (var fire in vs.all_fires) {
          var fireData = JSON.parse(vs.all_fires[fire].attributes.Data);
          vs.all_fires[fire].attributes['GeometryID'] = fireData? fireData.perimeter_id: vs.all_fires[fire].attributes.GeometryID;
          vs.all_fires[fire].attributes['IRWINID'] = fireData? fireData.IRWINID: vs.all_fires[fire].attributes.IrwinID;
          var dailyAcres = fireData.acres? fireData.acres: vs.all_fires[fire].attributes.DailyAcres ? vs.all_fires[fire].attributes.DailyAcres : 0;
          var gisAcres = fireData.acres? fireData.acres: vs.all_fires[fire].attributes.GISAcres ? vs.all_fires[fire].attributes.GISAcres : 0;
          var percentContained = fireData.percent_contained? fireData.percent_contained: vs.all_fires[fire].attributes.PercentContained ? vs.all_fires[fire].attributes.PercentContained : 0;
          var incidentName = vs.all_fires[fire].attributes.Name? vs.all_fires[fire].attributes.Name.toUpperCase(): vs.all_fires[fire].attributes.IncidentName.toUpperCase();
          var counties = fireData.hasOwnProperty('counties')? fireData.counties.split(","): JSON.parse(vs.all_fires[fire].attributes.counties);
          var tribes = fireData.hasOwnProperty('tribes')? fireData.tribes.split(",").filter(function(d) {return d !== "";}): undefined;
          var facilities = fireData.current_results? fireData.current_results.facilities: undefined;
          var rmpFacilities = facilities && facilities["Active RMP Facilities"] ? facilities["Active RMP Facilities"] : 0;
          var nplPoints = facilities && facilities["NationalPriorityListPoint_R9_2019_R9"] ? facilities["NationalPriorityListPoint_R9_2019_R9"] : 0;
          var nplPolys = facilities && facilities["NationalPriorityListBoundaryTypes_R9_2020_R9"] ? facilities["NationalPriorityListBoundaryTypes_R9_2020_R9"] : 0;
          var nplFacilities = facilities? nplPoints+nplPolys: 0;

          //get min and max acres
          vs.acresArray = vs.all_fires.map(function (a) {
            var fireData = JSON.parse(a.attributes.Data);
            if (Object.keys(fireData).length !== 0) {
              return fireData.acres;
            } else {
              var dAcres = a.attributes.DailyAcres? a.attributes.DailyAcres: 0;
              var gAcres = a.attributes.GISAcres? a.attributes.GISAcres: 0;
              if (dAcres === 0) {
                return gAcres;
              } else {
                return parseFloat(dAcres);
              }
            }
          });
          //If dailyAcres is 0 then look at GISAcres
          var reportingAcres;
          if (dailyAcres === 0) {
            reportingAcres = gisAcres;
          } else {
            reportingAcres = dailyAcres;
          }
          var rmp = '', npl = '';
          if (facilities) {
            rmp = `, ${rmpFacilities} RMP`;
            npl = `, ${nplFacilities} NPL`;
          }
          var t = '';
          if (tribes) {
            t = `, ${tribes.length} tribes`;
          }
          var c = '';
          if (counties) {
            if (counties.length > 1) {
              c = 'Counties';
            } else {
              c = 'County';
            }
            c = `${c}: ${counties.join(', ')}`;
          }

          var acresFacilitySubText = '';
          if (facilities) {
            acresFacilitySubText = `<div class='acresTxt'>(${parseFloat(reportingAcres).toLocaleString('en')} acres${rmp}${npl}${t})</div>`;
          }
          //Incident Name with acres
          var layerDivNode = domConstruct.toDom(`<div class='layerDiv' id='F${vs.all_fires[fire].attributes.OBJECTID}' title="Click to zoom">
            <div class='attLink'></div>
            <div class='fireNameTxt'>${incidentName}</div>
            <div class='acresTxt' title='${c}'>${c}</div>
            ${acresFacilitySubText}
            </div>`);

          //add percent containment bar


          var pclabel = parseFloat(reportingAcres).toLocaleString('en') + " acres";
          var pcValue = Math.round(percentContained);
          var pcTitle = percentContained + '% Contained';
          //size of bar
          var acresMin = 0;
          var acresMax = Math.max.apply(Math, vs.acresArray);
          var acresRange = acresMax - acresMin;
          var scale = 300 / acresRange;
          var scaledPixels = (reportingAcres - acresMin) * (300 / acresRange);
          var bar;
          if (scaledPixels < 100) {
            bar = 100;
          } else {
            bar = scaledPixels;
          }
          var barWidth = bar.toString() + 'px';

          var myProgressBar = new ProgressBar({
            title: pcTitle,
            value: pcValue,
            label: pclabel,
            style: "width: " + barWidth
          }).placeAt(layerDivNode).startup();
          domConstruct.place(layerDivNode, vs.fireList);
          //get fire attachment
          if (facilities) {
            vs.perimeterbufferFC.queryAttachmentInfos(vs.all_fires[fire].attributes.OBJECTID, vs._queryFireAttachment, vs._QueryfireResultsError);
          }
          // setup zoom listener
          on(dom.byId(`F${vs.all_fires[fire].attributes.OBJECTID}`), "click", vs._zoomToFire(vs.all_fires[fire].geometry));
        }
      },

      _queryFireAttachment: function (results) {
        console.log('Attachment Query Results');
        var objectIDString = "F" + results[0].objectId;
        var fireDiv = dojo.query('#' + objectIDString + ' .attLink')[0];

        var reportNode = domConstruct.toDom(`<div id='r${objectIDString}' class='report-button' title='Get Report'></div>`);
        domConstruct.place(reportNode, fireDiv, "first");
        on(dom.byId("r" + objectIDString), "click", function (e) {
          e.stopPropagation();
          //Get latest report from the bottom of the list (array)
          var latestReportIndex = results.length - 1;
          window.open(results[latestReportIndex].url, "_top");
        });
      },

      _QueryfireResultsError: function (err) {
        //Need to write a better error report
        vs.busyHandle.hide();
        console.log('error');
        console.log(err);
      },

      _zoomToFire: (geometry) => (e) => {
        //get objectid of firebuffer clicked on
        if (geometry.type === 'polygon') {
          var fireBufferExtent = new Extent(geometry.getExtent());
          vs.map.setExtent(fireBufferExtent);
        } else {
          vs.map.centerAndZoom(geometry, 10);
        }
      },

      onOpen: function () {
        console.log('onOpen') ;
        vs.openVisState = vs.getFireLayerVis();
        this.loadFires().then(function () {
          vs.filterFires();
          //Check to see if perimeter buffer layer has been added
          var bufferLayerStatus = vs.map.getLayer(vs.perimeterbufferFC.id);
          if (!bufferLayerStatus) {
            vs.map.addLayer(vs.perimeterbufferFC);
          }
        });
        //uncheck by default
        dojo.byId("fire_toggle").checked=false;

      },
      filterFires: function () {

        vs.fireLayerNames = [
          {
            label: vs.perimeterLabel,
            filter: vs.all_fires.map(f => `GeometryID = '${f.attributes.GeometryID}'`).concat().join(" OR ")
          },
          {
            label: vs.irwinLabel,
            filter: vs.all_fires.map(f => `IrwinID = '${f.attributes.IRWINID}'`).join(" OR ")
          }
        ];
        vs.fireLayerVisReset = [];
        vs.fireLayerFilterReset = [];

        var layerStructure = LayerStructure.getInstance();

        layerStructure.traversal(function (layerNode) {
          var fireLayer = vs.fireLayerNames.find(x => x.label === layerNode.title);
          if (fireLayer) {
            layerNode.setFilter(fireLayer.filter);
            vs.fireLayerFilterReset.push(layerNode);
            if (!layerNode.isVisible()) {
              layerNode.show();
              vs.fireLayerVisReset.push(layerNode);
            }
            // capture layerObject promise
          }
        });
      },
      getFireLayerVis: function() {
        const lyrs = [];
        var layerStructure = LayerStructure.getInstance();
        layerStructure.traversal(function (layerNode) {
          var fireLayer = Array(vs.irwinLabel, vs.perimeterLabel).find(x => x === layerNode.title);
          if (fireLayer) {
            if (layerNode.isVisible()){
              lyrs.push(layerNode.title);
            }
          }
        });
        return lyrs;
      },
      resetFireFilter: function (loadAllFires, close=false) {
        vs.fireLayerFilterReset.forEach(x => {
          x.setFilter('');
          if (x.title === vs.irwinLabel && loadAllFires) {
            x.getLayerObject().then(function (layerObject) {

              vs.r9Geom.then(r9Geom => {
                const q = new Query();
                q.where = 'DailyAcres > 5';
                q.geometry = r9Geom;
                q.orderByFields = ['IncidentName ASC'];
                q.spatialRelationship = "esriSpatialRelIntersects";
                layerObject.queryFeatures(q).then(function(results) {
                  // console.log(results);
                  results.features = results.features.map(x => {
                    x.attributes.counties = JSON.stringify([x.attributes.POOCounty]);
                    x.attributes.facilities = '{}';
                    x.attributes.Data = '{}';
                    x.attributes.tribes = '[]';
                    return x;
                  });
                  vs._QueryFiresResults(results);
                }, error => {
                  console.log(error);
                });
              });
            });
          }
        });
        if (!close) {
          vs.r9Geom.then(r9Geom => {
            var layerStructure = LayerStructure.getInstance();
              layerStructure.traversal(function (layerNode) {
                var fireLayer = Array(vs.irwinLabel, vs.perimeterLabel).find(x => x === layerNode.title);
                if (fireLayer) {
                  const isIrwin = fireLayer === vs.irwinLabel? true: false;
                  let filter = isIrwin? 'DailyAcres >= 5': 'GISAcres >= 5';
                  // layerNode.getLayerObject()
                  const fl = FeatureLayer(layerNode.getUrl());
                  const q = new Query();
                  q.where = '2=2';
                  q.geometry = r9Geom;
                  q.spatialRelationship = "esriSpatialRelIntersects";
                  fl.queryIds(q).then(results => {
                    if (results) {
                      const idStr = 'OBJECTID' + " IN(" + results.join(',') + ")";
                      filter += ' AND ' + idStr;
                    }
                    layerNode.setFilter(filter);
                  });
                  // layerNode.getUrl();
                  // console.log(filter);
                  // layerNode.setFilter(filter);
                  // layerNode.setFilter("IncidentName = 'LAVA'");

                }
              });

          });
        }
      },
      onClose: function () {
        console.log('onClose');
        //if the widget set visible on, then for that layer set visibility off
        this.resetFireFilter(false, close=true);

        var layerStructure = LayerStructure.getInstance();
        layerStructure.traversal(function (layerNode) {
          var fireLayer = Array(vs.irwinLabel, vs.perimeterLabel).find(x => x === layerNode.title);
          if (fireLayer){
            if (vs.openVisState.includes(fireLayer)) {layerNode.show();} else {layerNode.hide();}
          }
        });
        vs.map.removeLayer(vs.perimeterbufferFC);
        vs.fireLayerVisReset = [];
        vs.fireLayerFilterReset = [];
        vs.fireList.innerHTML = '';
      },

      toggleFires: function (e) {
        if (e.target.checked) {
          this.resetFireFilter(true);
          vs.map.removeLayer(vs.perimeterbufferFC);
        } else {
          this.loadFires().then(function () {
            vs.filterFires();
            //Check to see if perimeter buffer layer has been added
            var bufferLayerStatus = vs.map.getLayer(vs.perimeterbufferFC.id);
            if (!bufferLayerStatus) {
              vs.map.addLayer(vs.perimeterbufferFC);
            }
          });
        }
      },
      onMinimize: function () {
        console.log('onMinimize');
      }
      ,

      onMaximize: function () {
        console.log('onMaximize');
      }
      ,

      onSignIn: function (credential) {
        /* jshint unused:false*/
        console.log('onSignIn');
      },


      onSignOut: function () {
        console.log('onSignOut');
      },


      showVertexCount: function (count) {
        this.vertexCount.innerHTML = 'The vertex count is: ' + count;
      },

      loadAllFires: function () {
      },

      // queryIdsByGeometry: function(geomLayerUrl, targetLayerUrl, geomLayerWhere, targetLayerWhere='1=1', outSR = 102100){
      //   const srcGeometry = getGeometryUnion(geomLayerUrl);
      //   const newQuery = new Query();
      //   const targetFl = new FeatureLayer(targetLayerUrl);
      //   newQuery.where = targetLayerWhere;
      //   newQuery.geometry = srcGeometry;
      //   newQuery.outSpatialReference = {wkid: outSR};
      //   newQuery.returnGeometry = true;
      //   newQuery.spatialRelationship='SPATIAL_REL_INTERSECTS';
      //   newQuery.outFields = ['*'];
      //   targetFl.queryIds(newQuery).then(ids => {
      //     return ids;
      //   });
      //
      // },

      getGeometryUnion: function(layerUrl, where='1=1', outFields=['*'], outSR = 4326) {
        const newQuery = new Query();
        const qTask = new QueryTask(layerUrl);
        newQuery.where = where;
        newQuery.outSpatialReference = {wkid: outSR};
        newQuery.returnGeometry = true;
        newQuery.outFields = outFields;
        return qTask.execute(newQuery).then(results => {
          if (results.features) {
            return geometryEngine.union(results.features.map(g => g.geometry));
          }
        });
      },

      // createFuncLocLayer: function () {
      //   this.funcLocLayer = new FeatureLayer(this.config.functionalLocationLayer);
      //   this.workplanBoundaryLayer.queryFeatures(this.queryWorkplanLayer(), lang.hitch(this, function (result) {
      //     var wpGeometry = geometryEngine.geodesicBuffer(result.features[0].geometry, -20, "meters");
      //     var query = new Query();
      //     query.geometry = wpGeometry;
      //     // Add other necessary query prperties such as spatial relationship
      //     this.funcLocLayer.queryIds(query, lang.hitch(this,function(objectIds) {
      //       var qStr = this.funcLocLayer.objectIdField + " IN(" +objectIds.join(',') + ")";
      //       this.funcLocLayer.setDefinitionExpression(qStr );
      //     }));
      //   }));
      // }‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍


    });
  })
;
