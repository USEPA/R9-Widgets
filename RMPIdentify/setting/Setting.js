define([
    'dojo/_base/declare',
    'jimu/BaseWidgetSetting',
    'dijit/form/Select',
    'dojo/data/ObjectStore',
    'dojo/store/Memory',
    'dijit/registry',
    'dijit/form/TextBox',
    'dojo/query',
    'jimu/dijit/FeaturelayerServiceBrowser',
    'jimu/LayerInfos/LayerInfos',
    './RMPSourceSetting',
    './RMPSettingsDijit',
    'dojo/on',
    'dojo/_base/lang'
  ],
  function(declare, BaseWidgetSetting, Select, ObjectStore, Memory, registry, TextBox,
           query, FeaturelayerServiceBrowser,
           LayerInfos, QuerySourceSetting, RMPSettingsDijit, on, lang) {
  return declare([BaseWidgetSetting], {
    baseClass: 'rmp-identify-setting',

    postCreate: function(){
      //the config object is passed in
      this.setConfig(this.config);
    },

    setConfig: function(config){
      var that = this;
      this.config = config;
      this.statusLayerInput.value = config.statusLayer;

      // this.statusLayerInput.value = config.statusLayer;
      // dojo.forEach(this.config.layers, function (config) {
      //   config.baseurl = that.config.baseurl;
        var widget = RMPSettingsDijit({nls: that.nls, map: that.map, appConfig: that.appConfig}, config);
        widget.placeAt(that.serviceNode);
      // });
    },
    getConfig: function() {
      //WAB will get config object through this method

      var config = {
        layerId: {},
        layerName: '',
        statusLayer: this.statusLayerInput.value
      };
      var nodes = query('.rmp-dijit');
      dojo.forEach(nodes, function (node) {
        config.layerId = registry.byNode(node).config.layerId;
        config.layerName = registry.byNode(node).config.layerName;
        // delete registry.byNode(node).config.baseurl;
        // config.layers.push(registry.byNode(node).config);
      });
      return config;
    },
    _setService: function () {
      var newWidget = RMPSettingsDijit({nls: this.nls, map: this.map, appConfig: this.appConfig});
      newWidget.placeAt(this.serviceNode);
    }
  });
});
