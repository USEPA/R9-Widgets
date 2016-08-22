/**
 * Created by Travis on 7/14/2016.
 */
///////////////////////////////////////////////////////////////////////////
// Copyright © 2015 Esri. All Rights Reserved.
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

define([
    'dojo/_base/declare',
    'dojo/_base/html',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/ComboBox',
    'dojo/text!./TierIISettingsDijit.html',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/query',
    'dojo/Deferred',
    'dojo/Evented',
    'dojo/store/Memory',
    './TierIISourceSetting',
    'jimu/LayerInfos/LayerInfos',
    'jimu/dijit/_FeaturelayerSourcePopup',
    'esri/request',
    'jimu/utils',
    'jimu/dijit/Popup',
    'jimu/dijit/CheckBox',
    'jimu/dijit/LoadingShelter',
    'dijit/form/ValidationTextBox',
    'dojo/NodeList-data'
  ],
  function (declare, html, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, ComboBox,
            template, lang, array, on, query, Deferred, Evented, Memory, QuerySourceSetting,
            LayerInfos, _FeaturelayerSourcePopup, esriRequest, jimuUtils, Popup, CheckBox) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
      baseClass: 'tier-ii-dijit',
      templateString: template,
      nls: {},
      map: {},
      appConfig: {},
      config: undefined,
      constructor: function (o, config) {
        this.nls = o.nls;
        this.map = o.map;
        this.appConfig = o.appConfig;
        this.config = config;
      },
      postCreate: function () {
        if (this.config !== undefined) {
          this.stateSelectNode.innerHTML = ": " + this.config.state.name;
          this.facilitySelectNode.innerHTML = " : " + this.config.facilities.label;
          if (this.config.contacts.label !== undefined) {
            this.contactSelectNode.innerHTML = " : " + this.config.contacts.label;
            if (this.config.contacts.phones.label !== undefined) {
              this.contactPhoneSelectNode.innerHTML = " : " + this.config.contacts.phones.label;
              this.phoneRow.style.display = "";
            }
          } else {
            this.contactSelectNode.innerHTML = " : N/A ";
          }
          if (this.config.chemicals.label !== undefined) {
            this.chemicalSelectNode.innerHTML = " : " + this.config.chemicals.label;
            if (this.config.chemicals.locations.label !== undefined) {
              this.chemicalLocationRow.style.display = "";
              this.chemicalLocationSelectNode.innerHTML = " : " + this.config.chemicals.locations.label;
            }
            if (this.config.chemicals.mixtures.label !== undefined) {
              this.chemicalMixRow.style.display = "";
              this.chemicalMixSelectNode.innerHTML = " : " + this.config.chemicals.mixtures.label;
            }
          } else {
            this.chemicalSelectNode.innerHTML = " : N/A";
          }
        }
      },
      _setSource: function () {
        this._createNewQuerySourceSettingFromMenuItem({}, {});
      },
      _createNewQuerySourceSettingFromMenuItem: function (setting, definition) {
        var querySetting = new QuerySourceSetting({
          nls: this.nls,
          map: this.map,
          appConfig: this.appConfig
        });
        querySetting.setDefinition(definition);
        querySetting.setConfig({
          url: setting.url,
          name: setting.name || "",
          layerId: setting.layerId,
          placeholder: setting.placeholder || "",
          searchFields: setting.searchFields || [],
          displayField: setting.displayField || definition.displayField || "",
          exactMatch: !!setting.exactMatch,
          maxResults: setting.maxResults || 6,
          searchInCurrentMapExtent: !!setting.searchInCurrentMapExtent,
          type: "query"
        });
        querySetting._openQuerySourceChooser();

        querySetting.own(
          on(querySetting, 'select-query-source-ok', lang.hitch(this, function (item) {
            //var browser = new FeaturelayerServiceBrowser({
            //    url: item.url,
            //}, this.serviceNode);
            var that = this;
            this.config = {
              baseurl: "",
              state: {},
              facilities: {},
              contacts: {
                phones: {}
              },
              chemicals: {
                locations: {},
                mixtures: {}
              }
            };

            var stateStore = new Memory({
              data: [
                {name: "California", abbr: "CA"},
                {name: "Hawaii", abbr: "HI"},
                {name: "Nevada", abbr: "NV"},
                {name: "Arizona", abbr: "AZ"}
              ],
              idProperty: "abbr"
            });

            var stateSelect = new ComboBox({
              store: stateStore,
              labelAttr: "name",
              searchAttr: "name",
              placeHolder: "Select One"
            }, this.stateSelectNode);

            stateSelect.startup();

            stateSelect.on("change", function () {
              that.config.state.abbr = this.item.abbr;
              that.config.state.name = this.item.name;
            });

            var tableRelationships = [];

            item.layerInfo.layerObject.label = 'Facilities';

            var layer = dojo.mixin({}, item.layerInfo.layerObject);

            var layerStore = new Memory({
              data: [layer]
            });

            var layerSelect = new ComboBox({
              store: layerStore,
              labelAttr: 'name',
              searchAttr: "name",
              placeHolder: 'Select One'
            }, this.facilitySelectNode);

            layerSelect.startup();

            layerSelect.on("change", function () {
              that.config.facilities.id = this.item.id;
              that.config.facilities.label = this.item.name;
              that.config.baseurl = item.layerInfo.layerObject.url.slice(0, -this.item.layerId.toString().length);
            });

            dojo.forEach(item.layerInfo.layerObject.relationships, function (relationship, i) {
              item.layerInfo.layerObject.relationships[i].id = relationship.id.toString();
            });

            var facilityRelationshipStore = new Memory({
              data: item.layerInfo.layerObject.relationships
            });

            var contactSelect = new ComboBox({
              store: facilityRelationshipStore,
              labelAttr: "name",
              searchAttr: "name",
              placeHolder: 'Select One (if available)'
            }, this.contactSelectNode);

            contactSelect.startup();

            var phoneSelect = new ComboBox({
              store: null,
              labelAttr: "name",
              searchAttr: "name",
              placeHolder: 'Select One (if available)'
            }, this.contactPhoneSelectNode);
            phoneSelect.startup();

            phoneSelect.on("change", function () {
              that.config.contacts.phones.layerId = this.item.relatedTableId;
              that.config.contacts.phones.relationshipId = this.item.id;
              that.config.contacts.phones.label = this.item.name;
            });

            contactSelect.on("change", function (value) {
              that.config.contacts.layerId = this.item.relatedTableId;
              that.config.contacts.relationshipId = this.item.id;
              that.config.contacts.label = this.item.name;

              var relationships = dojo.filter(tableRelationships, function (relationship) {
                return relationship.id == that.config.contacts.layerId.toString();
              })[0].relationships;

              var relationshipStore = new Memory({
                data: relationships
              });

              phoneSelect.set('store', relationshipStore);
              that.phoneRow.style.display = "";
            });

            var chemicalSelect = new ComboBox({
              store: facilityRelationshipStore,
              labelAttr: "name",
              searchAttr: "name",
              placeHolder: 'Select One (if available)'
            }, this.chemicalSelectNode);

            chemicalSelect.startup();

            var chemicalLocationSelect = new ComboBox({
              store: null,
              labelAttr: "name",
              searchAttr: "name",
              placeHolder: 'Select One (if available)'
            }, this.chemicalLocationSelectNode);

            chemicalLocationSelect.startup();

            chemicalLocationSelect.on("change", function () {
              that.config.chemicals.locations.layerId = this.item.relatedTableId;
              that.config.chemicals.locations.relationshipId = this.item.id;
              that.config.chemicals.locations.label = this.item.name;
            });

            var chemicalMixSelect = new ComboBox({
              store: null,
              labelAttr: "name",
              searchAttr: "name",
              placeHolder: 'Select One (if available)'
            }, this.chemicalMixSelectNode);

            chemicalMixSelect.startup();

            chemicalMixSelect.on("change", function () {
              that.config.chemicals.mixtures.layerId = this.item.relatedTableId;
              that.config.chemicals.mixtures.relationshipId = this.item.id;
              that.config.chemicals.mixtures.label = this.item.name;
            });

            chemicalSelect.on("change", function () {
              that.config.chemicals.layerId = this.item.relatedTableId;
              that.config.chemicals.relationshipId = this.item.id;
              that.config.chemicals.label = this.item.name;


              var relationships = dojo.filter(tableRelationships, function (relationship) {
                return relationship.id == that.config.chemicals.layerId.toString();
              })[0].relationships;

              var relationshipStore = new Memory({
                data: relationships
              });

              chemicalLocationSelect.set('store', relationshipStore);
              chemicalMixSelect.set('store', relationshipStore);

              that.chemicalLocationRow.style.display = "";
              that.chemicalMixRow.style.display = "";

            });

            LayerInfos.getInstance(this.map, this.map.itemInfo).then(function (layerInfosObject) {
              var tables = layerInfosObject.getTableInfoArray();

              dojo.forEach(tables, function (table, i) {
                tableRelationships.push({
                  id: table.layerObject.layerId,
                  relationships: table.layerObject.relationships
                });
              });
            });
          }))
        );
        querySetting.own(
          on(querySetting, 'reselect-query-source-ok', lang.hitch(this, function (item) {
            var tr = this._currentSourceSetting.getRelatedTr();
            this.sourceList.editRow(tr, {
              name: item.name
            });
          }))
        );
        querySetting.own(
          on(querySetting, 'select-query-source-cancel', lang.hitch(this, function () {
            if (this._currentSourceSetting !== querySetting) {// query source doesn't display in UI
              querySetting.destroy();
              querySetting = null;
            }
          }))
        );
      }
    });
  });
