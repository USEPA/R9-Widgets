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

define(['dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/_base/array',
    'dojo/Evented',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!./ModelMenu.html',
    'dojo/on',
    'dojo/query',
    'jimu/utils'
  ],
  function (declare, lang, html, array,
    Evented, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template,
    on, query, jimuUtils) {
    // box of model-menu

    var clazz = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
      baseClass: 'model-container',
      templateString: template,
      nls: null,
      menuBox : {
        w: 75,
        h: 120
      },
      _modelList: {
        x025: 0.25,
        x05: 0.5,
        x1: 1,
        x15: 1.5,
        x2: 2
      },

      postCreate: function() {
        this.inherited(arguments);
        //init model meun
        this._initModelMenu();
      },

      startup: function() {
        this.inherited(arguments);
      },

      destroy: function(){
        this.inherited(arguments);
      },

      _initModelMenu: function(){
        // this.a11y_init();
        // this.a11y_initEvents();

        Object.keys(this._modelList).forEach(lang.hitch(this, function (key) {
          var dom = this[key];
          var str = jimuUtils.localizeNumber(this._modelList[key]) + "x";
          dom.innerText = str;
          // this.a11y_setAriaLabel(dom.parentElement || dom.parentNode, str);
        }));

        this.own(on(this.domNode, 'click', lang.hitch(this, this._closeModelMenu)));
        this._checks = query(".check", this.modelMenu);

        this.setModel("1");//init display
      },

      _onSelectModelItem: function(evt) {
        array.map(this._checks, lang.hitch(this, function (check) {
          html.addClass(check, 'hide');
        }));

        var rateStr, optionItem;
        if (evt.target) {
          rateStr = html.getAttr(evt.target, 'data-model');
          if (rateStr) {
            optionItem = evt.target;
          } else {
            optionItem = evt.target.parentNode;//click on checked icon
            rateStr = html.getAttr(optionItem, 'data-model');
          }
        }
        if (optionItem) {
          var check = query(".check", optionItem)[0];
          if (check) {
            html.removeClass(check, 'hide');
          }
          this.modelLabelNode.innerHTML = jimuUtils.sanitizeHTML(optionItem.innerText);

          this._model = rateStr;
          this.emit("selected", rateStr);
        }
      },

      getModel: function () {
        return this._model;
      },
      setModel: function (model) {
        var item = null;
        switch (model) {
          case "0.25": {
            item = this.item025; break;
          } case "0.5": {
            item = this.item05; break;
          } case "1": {
            item = this.item1; break;
          } case "1.5": {
            item = this.item15; break;
          } case "2": {
            item = this.item2; break;
          } default: {
            item = null;
          }
        }
        if (item) {
          on.emit(item, 'click', { cancelable: false, bubbles: true });
        }
      },

      //model menu
      _setMenuPosition: function() {
        var sPosition = html.position(this.modelLabelNode);
        if (sPosition.y - this.menuBox.h - 2 < 0) {
          html.setStyle(this.modelMenu, {
            top: '27px',
            bottom: 'auto'
          });
        }

        var layoutBox = html.getMarginBox(this.domNode);
        if (window.isRTL) {
          if (sPosition.x - this.menuBox.w < 0) {
            html.setStyle(this.modelMenu, {
              left: 0
            });
          }
        } else {
          if (sPosition.x + this.menuBox.w > layoutBox.w) {
            html.setStyle(this.modelMenu, {
              right: 0
            });
          }
        }
      },

      _onModelLabelClick: function(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        if(html.hasClass(this.modelMenu, "hide")){
          this._setMenuPosition();
          this._showModelMenu();
        } else {
          this._closeModelMenu();
        }
      },

      _showModelMenu: function() {
        html.removeClass(this.modelMenu, "hide");
        this.emit("open");

        // this.a11y_focusOnSelectedItem();
      },

      _closeModelMenu: function() {
        html.addClass(this.modelMenu, "hide");
        this.emit("close");
      }

    });

    // clazz.extend(a11y);//for a11y
    return clazz;
  });
