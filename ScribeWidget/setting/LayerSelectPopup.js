/**
 * Created by Travis on 2/21/2017.
 */
define([
    'dojo/_base/declare',
    'jimu/dijit/Popup',
    'dojo/Evented',
    'jimu/BaseWidgetSetting',
    'dijit/form/Select',
    'dojo/data/ObjectStore',
    'dojo/store/Memory',
    'dijit/registry',
    'dijit/form/TextBox',
    'dojo/query',
    'jimu/dijit/LayerChooserFromMap'
  ],
  function (declare, Popup, Evented,
            BaseWidgetSetting, Select, ObjectStore, Memory, registry, TextBox,
            query, LayerChooserFromMap) {
    return declare([Popup, Evented], {
      width:830,
      height: 560,
      titleLabel: 'Select Source',
      map: null,
      layerChooser: null,
      constructor: function constructor() {
        this.inherited(constructor, arguments);
        this.buttons = [{label: 'OK', onClick:this._setSelection, that:this}, {label: 'Cancel'}];
      },
      postCreate: function postCreate() {
        this.inherited(postCreate, arguments);

        this.layerChooser = new LayerChooserFromMap({createMapResponse: this.map.webMapResponse}, this.contentContainerNode);
      },
      _setSelection: function () {
        this.that.emit('ok', this.that.layerChooser.getSelectedItems());
        this.that.close();
      }
    });
  });
