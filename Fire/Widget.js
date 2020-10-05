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
        'esri/geometry/Extent'],
function(declare, BaseWidget, dom, domConstruct, QueryTask, Query,
          ProgressBar, FeatureLayer, busyIndicator, domStyle, on,
         Extent) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {
    // DemoWidget code goes here

    //please note that this property is be set by the framework when widget is loaded.
    //templateString: template,

    baseClass: 'jimu-widget-fire',

    postCreate: function() {
      this.inherited(arguments);
      console.log('postCreate');
    },

    startup: function() {
      vs = this
      this.inherited(arguments);
      // this.mapIdNode.innerHTML = 'map id:' + this.map.id;
      console.log('startup');
      var currentDate = vs._getCurrentDate();

      //set up busyIndicator
      vs.busyHandle = busyIndicator.create(vs.fireWidgetFrame);
      vs.busyHandle.show();

      //get perimeter buffer feature layer
       vs.perimeterbufferFC = new FeatureLayer("https://utility.arcgis.com/usrsvcs/servers/8ab605dafb5e44868271d946dfabfef9/rest/services/R9GIS/FirePerimeterBuffer/FeatureServer/0");

      //Query for fires
      var query = new Query();
      var queryTask = new QueryTask(vs.perimeterbufferFC.url);

      query.where = "RETRIEVED >= " + "'" + currentDate + "'";
      //query.where = "1=1";
      query.outSpatialReference = {wkid:102100};
      query.returnGeometry = true;
      query.orderByFields = ["IncidentName ASC"];
      query.outFields = ["*"];
      queryTask.execute(query, this._QueryFiresResults, vs._QueryfireResultsError).then(function(){
        vs.busyHandle.hide();
        domStyle.set(vs.headerInfo, "display", "block");
      });
    },

    _getCurrentDate: function(){
      var today = new Date();
      var dd = String(today.getDate()).padStart(2, '0');
      var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = today.getFullYear();

      return yyyy + '-' + mm + '-' + dd;
    },

    _QueryFiresResults: function(results){
      console.log("Query Fire Results");
      vs.all_fires = results.features;

      //Loop through fires and add dom objects
      for (var fire in vs.all_fires) {

         //Acres and PercentContained
         var percentContained = vs.all_fires[fire].attributes.PercentContained ? vs.all_fires[fire].attributes.PercentContained:"No Data";
         var dailyAcres = vs.all_fires[fire].attributes.DailyAcres ? vs.all_fires[fire].attributes.DailyAcres: 0;

          //Incident Name with acres
         var layerDivNode = domConstruct.toDom("<div class='layerDiv' id='" + "F" + vs.all_fires[fire].attributes.OBJECTID +
           "'><div class='fireNameTxt'>" + vs.all_fires[fire].attributes.IncidentName + "</div><div class='acresTxt'>  (" +
           parseFloat(dailyAcres).toLocaleString('en') + " acres)</div>" + "</div>");

         //add percent containment bar
          var pclabel;
          var pcValue;
         if(percentContained == "No Data") {
           pclabel = "No Data";
           pcValue = 0;
         }else{
           pclabel = Math.round(percentContained) + "% contained";
           pcValue = Math.round(percentContained);
         }
         //size of bar
         var barWidth;
         if(dailyAcres < 10000){
           barWidth = '100px';
         }else if(dailyAcres >= 10000 && dailyAcres < 30000){
           barWidth = '150px';
         }else if(dailyAcres >= 30000 && dailyAcres < 100000){
           barWidth = '225px';
         }else if(dailyAcres > 100000){
           barWidth = '300px';
         }
         var myProgressBar = new ProgressBar({
           value: pcValue,
           label: pclabel,
           style: "width: "+ barWidth
         }).placeAt(layerDivNode).startup();

         domConstruct.place(layerDivNode, vs.fireList);

         //get fire attachment
         vs.perimeterbufferFC.queryAttachmentInfos(vs.all_fires[fire].attributes.OBJECTID, vs._queryFireAttachment, vs._QueryfireResultsError);
      }

    },

    _queryFireAttachment: function(results){
      console.log('Attachment Query Results');
      var objectIDString = "F" + results[0].objectId;
      var fireDiv = dom.byId(objectIDString);
      var reportNode = domConstruct.toDom("<div class='attLink'><a href='" + results[0].url + "'>" + "Get Report" + "</a><div id='" + "z" + fireDiv.id + "'><a href='#' title='Zoom To'>" + "Zoom To" + "</a></div></div>");
      domConstruct.place(reportNode, fireDiv, "first");
      on(dom.byId("z"+ fireDiv.id), "click", vs._onClickFireName);
    },

    _QueryfireResultsError: function(err){
      //Need to write a better error report
      vs.busyHandle.hide();
      console.log('error')
    },

    _onClickFireName: function(e){
      //get objectid of firebuffer clicked on
      var targetID = e.currentTarget.id.split('F');
      targetObjID = targetID[1];
      //get fire buffer extent
      var query = new Query();
      query.objectIds = [targetObjID];
      query.outSpatialReference = {wkid:102100};
      query.returnGeometry = true;
      query.outFields = ["*"];
      vs.perimeterbufferFC.queryExtent(query, vs._queryFeatureReslts);
    },

    _queryFeatureReslts: function(results){
      //set map extent
      var fireBufferExtent = new Extent(results.extent);
      vs.map.setExtent(fireBufferExtent);
    },

    onOpen: function(){
      console.log('onOpen');
    },

    onClose: function(){
      console.log('onClose');
    },

    onMinimize: function(){
      console.log('onMinimize');
    },

    onMaximize: function(){
      console.log('onMaximize');
    },

    onSignIn: function(credential){
      /* jshint unused:false*/
      console.log('onSignIn');
    },

    onSignOut: function(){
      console.log('onSignOut');
    },

    showVertexCount: function(count){
      this.vertexCount.innerHTML = 'The vertex count is: ' + count;
    }
  });
});
