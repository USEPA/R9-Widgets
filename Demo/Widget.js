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
        'dijit/ProgressBar', 'esri/layers/FeatureLayer', 'esri/dijit/util/busyIndicator'],
function(declare, BaseWidget, dom, domConstruct, QueryTask, Query,
          ProgressBar, FeatureLayer, busyIndicator) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {
    // DemoWidget code goes here

    //please note that this property is be set by the framework when widget is loaded.
    //templateString: template,

    baseClass: 'jimu-widget-demo',

    postCreate: function() {
      this.inherited(arguments);
      console.log('postCreate');
    },

    startup: function() {
      vs = this
      this.inherited(arguments);
      // this.mapIdNode.innerHTML = 'map id:' + this.map.id;
      console.log('startup');

      //set up busyIndicator
      vs.busyHandle = busyIndicator.create(vs.fireWidgetFrame);
      vs.busyHandle.show();

      //get perimeter buffer feature layer
       //vs.perimeterbufferFC = new FeatureLayer("https://utility.arcgis.com/usrsvcs/servers/8ab605dafb5e44868271d946dfabfef9/rest/services/R9GIS/FirePerimeterBuffer/FeatureServer/0");
       vs.perimeterbufferFC = new FeatureLayer("https://utility.arcgis.com/usrsvcs/servers/8ab605dafb5e44868271d946dfabfef9/rest/services/R9GIS/FirePerimeterBuffer/FeatureServer/0");

      //Query for fires
      var query = new Query();
      var queryTask = new QueryTask(vs.perimeterbufferFC.url);

      query.where = "RETRIEVED >= '2020-09-23'";
      //query.where = "1=1";
      query.outSpatialReference = {wkid:102100};
      query.returnGeometry = true;
      query.orderByFields = ["IncidentName ASC"];
      query.outFields = ["*"];
      queryTask.execute(query, this._QueryFiresResults, vs._QueryfireResultsError).then(function(){
        vs.busyHandle.hide();
      });

    },

    _QueryFiresResults: function(results){
      console.log("Query Fire Results");
      vs.all_fires = results.features;

      //Loop through fires and add dom objects
      for (var fire in vs.all_fires) {

         //Acres and PercentContained
         var percentContained = vs.all_fires[fire].attributes.PercentContained ? vs.all_fires[fire].attributes.PercentContained:0;
         var gisAcres = vs.all_fires[fire].attributes.GISAcres ? vs.all_fires[fire].attributes.GISAcres:0;

          //Incident Name
         var layerDivNode = domConstruct.toDom("<div class='layerDiv' id='" + "F" + vs.all_fires[fire].attributes.OBJECTID + "'>" + vs.all_fires[fire].attributes.IncidentName + "  (" + gisAcres.toFixed(2) + " acres)" + "</div>");

         //add percent containment bar
         var myProgressBar = new ProgressBar({
           value: percentContained,
           style: "width: 300px"
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
      var reportNode = domConstruct.toDom("<div class='attLink'><a href='" + results[0].url + "'>" + "Get Report" + "</a></div>");
      domConstruct.place(reportNode, fireDiv, "first");
    },

    _QueryfireResultsError: function(err){
      //Need to write a better error report
      console.log('error')
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
