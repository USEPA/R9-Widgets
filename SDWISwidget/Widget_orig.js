// jIMU (WAB) imports:
/// <amd-dependency path="jimu/BaseWidget" name="BaseWidget" />
//declare var BaseWidget: any; // there is no ts definition of BaseWidget (yet!)
// declareDecorator - to enable us to export this module with Dojo's "declare()" syntax so WAB can load it:
import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
// import on from 'dojo/on';
import on from 'dojo/on';
import LoadingSdwis from 'jimu/dijit/LoadingSdwis';
// esri imports:
import FeatureLayer from 'esri/layers/FeatureLayer';
import Extent from 'esri/geometry/Extent';
//define(['dojo/_base/declare', 'jimu/BaseWidget'],
//function(declare, BaseWidget) {
  //To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

    // Custom widget code goes here

   baseClass: 'Sdwiswidget',
    // this property is set by the framework when widget is loaded.
    // name: 'SDWISwidget',
    // add additional properties here

    //methods to communication with app container:
   postCreate: function postCreate() {
     this.inherited(postCreate, arguments);
     console.log('SDWISwidget::postCreate');
   },

   startup: function startup() {
     this.inherited(startup, arguments);
     console.log('SDWISwidget::startup');
   },

   onOpen: function(){
     console.log('SDWISwidget::onOpen');
   },

   onClose: function(){
     console.log('SDWISwidget::onClose');
   },

    // onMinimize: function(){
    //   console.log('SDWISwidget::onMinimize');
    // },

    // onMaximize: function(){
    //   console.log('SDWISwidget::onMaximize');
    // },

    // onSignIn: function(credential){
    //   console.log('SDWISwidget::onSignIn', credential);
    // },

    // onSignOut: function(){
    //   console.log('SDWISwidget::onSignOut');
    // }

    // onPositionChange: function(){
    //   console.log('SDWISwidget::onPositionChange');
    // },

    // resize: function(){
    //   console.log('SDWISwidget::resize');
    // }

    //methods to communication between widgets:

});
