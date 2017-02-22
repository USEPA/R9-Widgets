define([
    'dojo/_base/declare',
    'jimu/BaseWidgetSetting',
    'dijit/form/Select',
    'dojo/data/ObjectStore',
    'dojo/store/Memory',
    'dijit/registry',
    'dijit/form/TextBox',
    'dojo/query',
    './LayerSelectPopup'
  ],
  function (declare, BaseWidgetSetting, Select, ObjectStore, Memory, registry, TextBox,
            query, LayerSelectPopup) {
    return declare([BaseWidgetSetting], {
      baseClass: 'rmp-identify-setting',

      postCreate: function () {
        //the config object is passed in
        this.setConfig(this.config);
      },

      setConfig: function (config) {
        var that = this;
        this.config = config;
        this.status.innerHTML = this.config.statusLayerName;
        this.source.innerHTML = this.config.layerName;

        // this.statusLayerInput.value = config.statusLayer;
        // this.layerChooser = new LayerChooserFromMap({createMapResponse: this.map.webMapResponse, multiple: true}, that.rmpNode);
      },
      getConfig: function () {
        //WAB will get config object through this method
        return this.config;
      },
      _setSource: function () {
        var layerSelect = new LayerSelectPopup({map: this.map}),
          that = this;

        layerSelect.on('ok', function (item) {
          that.config.layerId = item[0].layerInfo.id;
          that.config.layerName = item[0].name;
          that.source.innerHTML = item[0].name;
        })
      },
      _setStatus: function () {
        var layerSelect = new LayerSelectPopup({map: this.map}),
          that = this;

        layerSelect.on('ok', function (item) {
          that.config.statusLayer = item[0].layerInfo.layerObject.layerId;
          that.config.statusLayerName = item[0].name;
          that.status.innerHTML = item[0].name;
        })
      }
    });
  });
