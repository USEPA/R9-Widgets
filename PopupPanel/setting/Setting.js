define([
    'dojo/_base/declare',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/Message',
    'dojo/on',
    'dojo/query',
    'dijit/registry',
    'dojo/_base/lang',
    'jimu/dijit/CheckBox',
    'jimu/dijit/RadioBtn'
  ],
  function(
    declare,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    Message,
    on,
    query,
    registry,
    lang) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      //these two properties is defined in the BaseWidget
      baseClass: 'widget-popuppanel-setting',
      _selectedAttachTo: "",

      postCreate: function() {
        this.own(on(this.topNode, 'click', lang.hitch(this, function() {
          this._selectItem('top');
        })));
        this.own(on(this.bottomNode, 'click', lang.hitch(this, function() {
          this._selectItem('bottom');
        })));
      },

      startup: function() {
        this.inherited(arguments);
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        this.config = config;
        if (!config.closeOnClear) {
          this.closeonclear.setValue(false);
        } else {
          this.closeonclear.setValue(true);
        }
        if (!config.closeAtStart) {
          this.closeonstart.setValue(false);
        } else {
          this.closeonstart.setValue(true);
        }
        if (!config.allowExport) {
          if(config.hasOwnProperty("allowExport") === false){
            this.allowexport.setValue(true);
          }else{
            this.allowexport.setValue(false);
          }
        } else {
          this.allowexport.setValue(true);
        }
        if (this.config.actionMenuPos) {
          this._selectItem(this.config.actionMenuPos);
        } else {
          var _attachTo = "";
          _attachTo = "bottom";
          this._selectItem(_attachTo);
        }
      },

      getConfig: function() {
        this.config.closeAtStart = this.closeonstart.checked;
        this.config.closeOnClear = this.closeonclear.checked;
        this.config.allowExport = this.allowexport.checked;
        this.config.actionMenuPos = this._getSelectedAttachTo();
        return this.config;
      },

      _selectItem: function(attachTo) {
        var _selectedNode = null;
        if (attachTo === 'top') {
          _selectedNode = this.topNode;
        } else if (attachTo === 'bottom') {
          _selectedNode = this.bottomNode;
        }
        var _radio = registry.byNode(query('.jimu-radio', _selectedNode)[0]);
        _radio.check(true);

        this._selectedAttachTo = attachTo;
      },

      _getSelectedAttachTo: function() {
        return this._selectedAttachTo;
      }

    });
  });
