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
    'esri/geometry/Extent', 'dijit/form/Button', 'jimu/LayerStructure'],
  function (declare, BaseWidget, dom, domConstruct, QueryTask, Query,
            ProgressBar, FeatureLayer, busyIndicator, domStyle, on,
            Extent, Button, LayerStructure) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // DemoWidget code goes here

      //please note that this property is be set by the framework when widget is loaded.
      //templateString: template,

      baseClass: 'jimu-widget-fire',

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


      },

      loadFires: function () {
        var currentDate = vs._getCurrentDate();
        //Identify default fire layers and visisblity
        //get perimeter buffer feature layer
        vs.perimeterbufferFC = new FeatureLayer("https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/R9_Fire_Perimeter_Buffers/FeatureServer/0", {
          // definitionExpression: "display = 1 AND acres >= 10 AND RETRIEVED >= " + "'" + currentDate + "'"
          definitionExpression: "display = 1"
        });
        vs.map.addLayer(vs.perimeterbufferFC, 0);

        //Query for fires
        var query = new Query();
        var queryTask = new QueryTask(vs.perimeterbufferFC.url);

        // query.where = "display = 1 AND acres >= 10 and RETRIEVED >= " + "'" + currentDate + "'";
        query.where = "display = 1";
        query.outSpatialReference = {wkid: 102100};
        query.returnGeometry = true;
        query.orderByFields = ["IncidentName ASC"];
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

        //get min and max acres
        vs.acresArray = vs.all_fires.map(function (a) {
          var dAcres = a.attributes.DailyAcres ? a.attributes.DailyAcres : 0;
          var gAcres = a.attributes.GISAcres ? a.attributes.GISAcres : 0;
          if (dAcres == 0) {
            return gAcres;
          } else {
            return parseFloat(dAcres);
          }
        });

        //Loop through fires and add dom objects
        vs.fireList.replaceChildren("");
        for (var fire in vs.all_fires) {

          //Acres and PercentContained
          var percentContained = vs.all_fires[fire].attributes.PercentContained ? vs.all_fires[fire].attributes.PercentContained : 0;
          var dailyAcres = vs.all_fires[fire].attributes.DailyAcres ? vs.all_fires[fire].attributes.DailyAcres : 0;
          var gisAcres = vs.all_fires[fire].attributes.GISAcres ? vs.all_fires[fire].attributes.GISAcres : 0;
          var incidentName = vs.all_fires[fire].attributes.IncidentName.toUpperCase();
          var counties = JSON.parse(vs.all_fires[fire].attributes.counties);
          var facilities = JSON.parse(vs.all_fires[fire].attributes.facilities);
          var rmpFacilities = facilities.facilities["Active RMP Facilities"] ? facilities.facilities["Active RMP Facilities"] : 0;
          var nplFacilities = facilities.facilities["NationalPriorityListPoint_R9_2019_R9"] ? facilities.facilities["NationalPriorityListPoint_R9_2019_R9"] : 0;
          var tribes = JSON.parse(vs.all_fires[fire].attributes.tribes);

          //If dailyAcres is 0 then look at GISAcres
          var reportingAcres
          if (dailyAcres == 0) {
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

          //Incident Name with acres
          var layerDivNode = domConstruct.toDom(`<div class='layerDiv' id='F${vs.all_fires[fire].attributes.OBJECTID}'>
            <div class='fireNameTxt'>${incidentName}</div>
            <div class='acresTxt' title='${c}'>${c}</div>
            <div class='acresTxt'>(${parseFloat(reportingAcres).toLocaleString('en')} acres${rmp}${npl}${t})</div>
            </div>`);

          //add percent containment bar


          var pclabel = parseFloat(reportingAcres).toLocaleString('en') + " acres";
          var pcValue = Math.round(percentContained);
          var pcTitle = percentContained + '% Contained';
          //size of bar
          var acresMin = 0
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
          vs.perimeterbufferFC.queryAttachmentInfos(vs.all_fires[fire].attributes.OBJECTID, vs._queryFireAttachment, vs._QueryfireResultsError);
        }
      },

      _queryFireAttachment: function (results) {
        console.log('Attachment Query Results');
        var objectIDString = "F" + results[0].objectId;
        var fireDiv = dom.byId(objectIDString);

        var reportNode = domConstruct.toDom("<div class='attLink'><div id='" + "r" + fireDiv.id + "' class='report-button' title='Get Report'></div><div title='Zoom To' class='search-button' id='" + "z" + fireDiv.id + "'></div></div>");
        domConstruct.place(reportNode, fireDiv, "first");

        on(dom.byId("z" + fireDiv.id), "click", vs._onClickFireName);
        on(dom.byId("r" + fireDiv.id), "click", function (e) {
          //Get latest report from the bottom of the list (array)
          var latestReportIndex = results.length - 1;
          window.open(results[latestReportIndex].url, "_top");
        });
      },

      _QueryfireResultsError: function (err) {
        //Need to write a better error report
        vs.busyHandle.hide();
        console.log('error');
      },

      _onClickFireName: function (e) {
        //get objectid of firebuffer clicked on
        var targetID = e.currentTarget.id.split('F');
        targetObjID = targetID[1];
        //get fire buffer extent
        var query = new Query();
        var queryTask = new QueryTask(vs.perimeterbufferFC.url);
        query.objectIds = [targetObjID];
        query.outSpatialReference = {wkid: 102100};
        query.returnGeometry = true;
        queryTask.execute(query, vs._queryFeatureReslts);
      },

      _queryFeatureReslts: function (results) {
        //set map extent
        var fireBufferExtent = new Extent(results.features[0].geometry.getExtent());
        vs.map.setExtent(fireBufferExtent);
      },

      onOpen: function () {
        console.log('onOpen');
        this.loadFires().then(function () {
          vs.fireLayerNames = [
            {
              label: "NIFS Current Wildfire Perimeters",
              filter: vs.all_fires.map(f => `GeometryID = '${f.attributes.GeometryID}'`).concat().join(" OR ")
            },
            {
              label: "Wildfire Reporting (IRWIN)",
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
            }
          });
          //Check to see if perimeter buffer layer has been added
          var bufferLayerStatus = vs.map.getLayer(vs.perimeterbufferFC.id);
          if (!bufferLayerStatus) {
            vs.map.addLayer(vs.perimeterbufferFC);
          }
        });
        //Make fire layers visible

      },

      onClose: function () {
        console.log('onClose');
        //if the widget set visible on, then for that layer set visibility off
        vs.fireLayerVisReset.forEach(x => x.hide());
        vs.fireLayerFilterReset.forEach(x => x.setFilter(''));

        vs.map.removeLayer(vs.perimeterbufferFC);
        vs.fireLayerVisReset = [];
        vs.fireLayerFilterReset = [];
        vs.fireList.innerHTML = '';
      },

      onMinimize: function () {
        console.log('onMinimize');
      },

      onMaximize: function () {
        console.log('onMaximize');
      },

      onSignIn: function (credential) {
        /* jshint unused:false*/
        console.log('onSignIn');
      },

      onSignOut: function () {
        console.log('onSignOut');
      },

      showVertexCount: function (count) {
        this.vertexCount.innerHTML = 'The vertex count is: ' + count;
      }
    });
  });
