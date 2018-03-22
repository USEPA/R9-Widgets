define(['dojo/_base/declare', 'jimu/BaseWidget'],
function(declare, BaseWidget) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {

    // Custom widget code goes here

    baseClass: 'esi-widget',
    // this property is set by the framework when widget is loaded.
    // name: 'ESIWidget',
    // add additional properties here

    //methods to communication with app container:
    postCreate: function() {
      this.inherited(arguments);
      console.log('ESIWidget::postCreate');
    }

    // startup: function() {
    //   this.inherited(arguments);
    //   console.log('ESIWidget::startup');
    // },

    // onOpen: function(){
    //   console.log('ESIWidget::onOpen');
    // },

    // onClose: function(){
    //   console.log('ESIWidget::onClose');
    // },

    // onMinimize: function(){
    //   console.log('ESIWidget::onMinimize');
    // },

    // onMaximize: function(){
    //   console.log('ESIWidget::onMaximize');
    // },

    // onSignIn: function(credential){
    //   console.log('ESIWidget::onSignIn', credential);
    // },

    // onSignOut: function(){
    //   console.log('ESIWidget::onSignOut');
    // }

    // onPositionChange: function(){
    //   console.log('ESIWidget::onPositionChange');
    // },

    // resize: function(){
    //   console.log('ESIWidget::resize');
    // }

    //methods to communication between widgets:

  });

});
