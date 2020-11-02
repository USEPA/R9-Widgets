///////////////////////////////////////////////////////////////////////////
// Popup Panel Widget - Author: Robert Scheitlin
///////////////////////////////////////////////////////////////////////////
/*global define*/
define([
  'dojo/_base/declare',
  'dijit/_WidgetsInTemplateMixin',
  'jimu/BaseWidget',
  'jimu/dijit/Message',
  'esri/domUtils',
  'esri/dijit/Popup',
  'dojo/on',
  'dojo/topic',
  'dojo/query',
  'dojo/_base/html',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/_base/lang',
  'jimu/WidgetManager',
  'jimu/PanelManager',
  'jimu/MapManager',
  'dojo/i18n!esri/nls/jsapi',
  'jimu/FeatureActionManager',
  'jimu/dijit/FeatureActionPopupMenu',
  'jimu/utils',
  'dojo/_base/array',
  'dijit/layout/ContentPane'
],
  function (
    declare,
    _WidgetsInTemplateMixin,
    BaseWidget,
    Message,
    domUtils,
    Popup,
    on,
    topic,
    query,
    html,
    domClass,
    domConstruct,
    lang,
    WidgetManager,
    PanelManager,
    MapManager,
    esriBundle,
    FeatureActionManager,
    PopupMenu,
    jimuUtils,
    array,
    ContentPane
  ) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

      baseClass: 'widget-popuppanel',
      name: 'PopupPanel',
      label: 'Popup Panel',
      popup: null,
      zt: null,
      clearSel: null,
      popupMenu: null,
      featureActionManager: null,
      inPanel: null,
      popupContent: null,
      selChgEvt: null,
      clearFeatsEvt: null,
      setFeatsEvt: null,
      prevBtnEvt: null,
      nextBtnEvt: null,
      clearEvt: null,
      zoomToEvt: null,
      clearSelEvt: null,
      resizeEvt: null,

      postCreate: function () {
        this.inherited(arguments);
        this.popupMenu = PopupMenu.getInstance();
        this.featureActionManager = FeatureActionManager.getInstance();

        if(this.config.hasOwnProperty("actionMenuPos") && this.config.actionMenuPos === "top"){
          //top
          this.popupContent = new ContentPane({
            id: 'popupContent',
            content: '',
            region: "center",
            style: 'margin-top: 22px;'
          }).placeAt(this.divBottom).startup();
        } else {
          //bottom
          this.popupContent = new ContentPane({
            id: 'popupContent',
            content: '',
            region: "center"
          }).placeAt(this.divTop).startup();
        }
        this.popupContent = dijit.byId("popupContent");
        domUtils.hide(this.actionsPaneDiv);
        this.own(on(this.domNode, 'mousedown', lang.hitch(this, function (event) {
          event.stopPropagation();
          if (event.altKey) {
            var msgStr = this.nls.widgetverstr + ': ' + this.manifest.version;
            msgStr += '\n' + this.nls.wabversionmsg + ': ' + this.manifest.wabVersion;
            msgStr += '\n' + this.manifest.description;
            new Message({
              titleLabel: this.nls.widgetversion,
              message: msgStr
            });
          }
        })));

        this.popup = this.map.infoWindow;

        this.zt = domConstruct.toDom('<a title="Zoom" to="" class="action zoomTo" href="javascript:void(0);"><span>' +
                                    esriBundle.widgets.popup.NLS_zoomTo + '</span></a>');
        domConstruct.place(this.zt, this.actionsListDiv);

        this.clearSel = domConstruct.toDom('<a title="' + this.nls.clearseltip +'" to="" class="action clearSel" href="javascript:void(0);"><span>' + this.nls.clearsel + '</span></a>');
        domConstruct.place(this.clearSel, this.actionsListDiv);
        topic.subscribe("widgetsActionsRegistered", lang.hitch(this, this._onWidgetsActionsRegistered));
        this._createPopupMenuButton();
        this.setEvtHandlers();
        this.onWindowResize();
        html.addClass(this.domNode, 'esriViewPopup');
        //
        if(this.appConfig.theme.name === 'DashboardTheme' && this.appConfig.theme.styles[0]==='default'){
          html.addClass(this.previous, 'light');
          html.addClass(this.next, 'light');
        }else{
          html.removeClass(this.previous, 'light');
          html.removeClass(this.next, 'light');
        }
        this.own(topic.subscribe("appConfigChanged", lang.hitch(this, this._onAppConfigChanged)));
      },

      _onWidgetsActionsRegistered: function(){
        if(this.selectedFeature){
          this._initPopupMenu();
        }
      },

      onWindowResize: function(){
        var mapMan = MapManager.getInstance();
        if(mapMan.isMobileInfoWindow){
          this.map.setInfoWindow(mapMan._mapInfoWindow);
          this.popup = this.map.infoWindow;
          this.removeEvtHandlers();
          this.setEvtHandlers();
          mapMan.isMobileInfoWindow = false;
        }
      },

      _initPopupMenu: function(){
        this.featureActionManager.getSupportedActions(this.selectedFeature).then(lang.hitch(this, function(actions){
          if (this.config.allowExport === false) {
            actions = array.filter(actions, function(action) {
              return action.name.indexOf('Export') !== 0 && action.name !== 'SaveToMyContent';
            });
          }

          var popupActions = actions.filter(lang.hitch(this, function(action){
            return ['ZoomTo', 'ShowPopup', 'Flash'].indexOf(action.name) < 0 ;
          }));

          if(popupActions.length === 0){
            html.addClass(this.popupMenuButton, 'disabled');
          }else{
            html.removeClass(this.popupMenuButton, 'disabled');
          }
          var menuActions = popupActions.map(lang.hitch(this, function(action){
            action.data = jimuUtils.toFeatureSet(this.selectedFeature);
            return action;
          }));
          this.popupMenu.setActions(menuActions);
        }));
      },

      _createPopupMenuButton: function(){
        this.popupMenuButton = html.create('span', {
          'class': 'popup-menu-button'
        }, query(".actionList", this.domNode)[0]);

        on(this.popupMenuButton, 'click', lang.hitch(this, this._onPopupMenuButtonClick));
      },

      _onPopupMenuButtonClick: function(evt){
        var position = html.position(evt.target);
        this.popupMenu.show(position);
      },

      removeEvtHandlers: function(){
        if(this.selChgEvt){
          this.selChgEvt.remove();
          this.clearFeatsEvt.remove();
          this.setFeatsEvt.remove();
          this.prevBtnEvt.remove();
          this.nextBtnEvt.remove();
          this.clearEvt.remove();
          this.zoomToEvt.remove();
          this.clearSelEvt.remove();
          this.resizeEvt.remove();
        }
      },

      setEvtHandlers: function(){
        this.own(this.selChgEvt = on(this.popup, "selection-change", lang.hitch(this, function (evt) {
          this.selectedFeature = evt.target.getSelectedFeature();
          if(this.selectedFeature){
            this._initPopupMenu();
          }
          this.displayPopupContent(this.popup.getSelectedFeature());
        })));

        this.own(this.clearFeatsEvt = on(this.popup, "clear-features", lang.hitch(this, function () {
          if(this.instructions){
            domUtils.show(this.instructions);
            this.instructions.innerHTML = this.nls.selectfeatures;
          }
          if(this.popupContent){
            this.popupContent.set("content", "");
          }
          domUtils.hide(this.pager);
        })));
        this.own(this.setFeatsEvt = on(this.popup, "set-features", lang.hitch(this, function(){
          if(!this.popup.features){
            domUtils.hide(this.pager);
            domUtils.show(this.instructions);
            domUtils.hide(this.actionsPaneDiv);
            return;
          }
          if(this.popup.features.length === 0){
            domUtils.show(this.instructions);
            domUtils.hide(this.actionsPaneDiv);
          }else{
            domUtils.hide(this.instructions);
            domUtils.show(this.actionsPaneDiv);
          }
          this.displayPopupContent(this.popup.getSelectedFeature());
          this.featureCount.innerHTML = "(1 of " + this.popup.features.length + ")";

          //enable navigation if more than one feature is selected
          if(this.popup.features.length > 1){
            domUtils.show(this.pager);
            domClass.add(this.previous, "hidden");
            domClass.remove(this.next, "hidden");
            domClass.remove(this.clearSel, "hidden");
          }else if (this.popup.features.length === 1){
            domUtils.show(this.pager);
            domClass.add(this.previous, "hidden");
            domClass.add(this.next, "hidden");
            domClass.add(this.clearSel, "hidden");
          }else{
            domUtils.hide(this.pager);
            domClass.add(this.clearSel, "hidden");
          }
        })));
        this.own(this.prevBtnEvt = on(this.previous, "click", lang.hitch(this, function(){this.selectPrevious();})));
        this.own(this.nextBtnEvt = on(this.next, "click", lang.hitch(this, function(){this.selectNext();})));
        this.own(this.clearEvt = on(this.btnClear, "click", lang.hitch(this, this.clearResults)));
        this.own(this.zoomToEvt = on(this.zt, "click", lang.hitch(this, this.zoomToClicked)));
        this.own(this.clearSelEvt = on(this.clearSel, "click", lang.hitch(this, this.clearSelResults)));
        this.own(this.resizeEvt = on(window, 'resize', lang.hitch(this, this.onWindowResize)));
      },

      clearSelResults: function(){
        var curFeats = this.popup.features;
        curFeats.splice(this.popup.selectedIndex, 1);
        this.popup.setFeatures(curFeats);
      },

      zoomToClicked: function(e) {
        this.popup._zoomToFeature(e);
      },

      clearResults: function() {
        if(this.config.closeOnClear){
          this.closeWidget();
        }
        if(this.instructions){
          domUtils.show(this.instructions);
          this.instructions.innerHTML = this.nls.selectfeatures;
        }
        if(this.popupContent){
          this.popupContent.set("content", "");
        }
        //Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        domUtils.hide(this.pager);
        domUtils.hide(this.actionsPaneDiv);
        this.popup.clearFeatures();
      },

      startup: function () {
        this.inherited(arguments);
        this.inPanel = this.getPanel();
        this.displayPopupContent(this.popup.getSelectedFeature());
        if(this.config.closeAtStart){
          if(!this.popup.getSelectedFeature()){
            setTimeout(lang.hitch(this, function(){
              this.closeWidget();
            }), 300);
          }
        }
      },

      closeWidget: function() {
        if(this.inPanel){
          //console.info(this.inPanel);
          if(this.appConfig.theme.name === 'JewelryBoxTheme'){
            PanelManager.getInstance().minimizePanel(this.inPanel);
            html.addClass(this.map.container.parentNode, 'sideBarHidden');
          }else if(this.appConfig.theme.name === 'TabTheme') {
            var sbc = WidgetManager.getInstance().getWidgetsByName("SidebarController")[0];
            sbc._doResize();
          }else{
            PanelManager.getInstance().closePanel(this.inPanel);
          }
        }else{
          WidgetManager.getInstance().closeWidget(this);
        }
      },

      onOpen: function () {
        var mapMan = MapManager.getInstance();
        if(mapMan.isMobileInfoWindow){
          this.map.setInfoWindow(mapMan._mapInfoWindow);
          mapMan.isMobileInfoWindow = false;
        }
        //hide the standard esri popup instead
        html.addClass(query('.esriPopup')[0], 'myPopupHidden');
      },

      onDestroy: function () {
        var mapMan = MapManager.getInstance();
        mapMan.resetInfoWindow(false);
        if(!mapMan.isMobileInfoWindow){
          html.removeClass(query('.esriPopup')[0], 'myPopupHidden');
        }
      },

      displayPopupContent: function (feature) {
        if (feature) {
          if(this.inPanel){
            if(this.appConfig.theme.name === 'JewelryBoxTheme'){
              PanelManager.getInstance().maximizePanel(this.inPanel);
            }else if(this.appConfig.theme.name === 'TabTheme') {
              var sbc = WidgetManager.getInstance().getWidgetsByName("SidebarController")[0];
              var configs = sbc.getAllConfigs();
              var tIndex;
              array.some(configs, function(g, index) {
                if(g.name === 'PopupPanel'){
                  tIndex = index;
                  return true;
                }
              })
              if(tIndex !== null){
                if(tIndex > 4){
                  var tab = sbc.tabs[4];
                  var groups = tab.config.groups
                  array.some(groups, function(g, index) {
                    if(g.name === 'PopupPanel'){
                      sbc._onOtherGroupClick(g);
                      return true;
                    }
                  });
                }else{
                  sbc.selectTab(tIndex,{a11y_byKeyEvent:true});
                }
                sbc._resizeToMax();
              }
            }else{
              PanelManager.getInstance().normalizePanel(this.inPanel);
            }
          }else{
            WidgetManager.getInstance().triggerWidgetOpen(this.id);
          }
          var content = feature.getContent();
          if(this.popupContent){
            this.popupContent.set("content", content);
          }
          // Now show the content of the relates
          //.related-records-popup-projector

          domUtils.show(this.actionsPaneDiv);
        }else{
          domUtils.hide(this.pager);
          domUtils.show(this.instructions);
          domUtils.hide(this.actionsPaneDiv);
        }
      },

      selectPrevious: function () {
        this.popup.selectPrevious();
        this.featureCount.innerHTML = "(" + (this.popup.selectedIndex + 1) + " of " + this.popup.features.length + ")";
        if((this.popup.selectedIndex + 1) < this.popup.features.length){
          domClass.remove(this.next, "hidden");
        }
        if(this.popup.selectedIndex === 0){
          domClass.add(this.previous, "hidden");
        }
      },

      selectNext: function () {
        domClass.remove(this.previous, "hidden");
        this.popup.selectNext();
        this.featureCount.innerHTML = "(" + (this.popup.selectedIndex + 1) + " of " + this.popup.features.length + ")";
        if((this.popup.selectedIndex + 1) === this.popup.features.length){
          domClass.add(this.next, "hidden");
        }
      },

      _onAppConfigChanged: function(appConfig, reason, changeData){
        appConfig = lang.clone(appConfig);
        //deal with this reason only
        switch(reason){
          case 'styleChange':
            if(appConfig.theme.name === 'DashboardTheme' && changeData ==='light'){
              html.removeClass(this.previous, 'light');
              html.removeClass(this.next, 'light');
            }else if(appConfig.theme.name === 'DashboardTheme' && changeData ==='default'){
              html.addClass(this.previous, 'light');
              html.addClass(this.next, 'light');
            }
            break;
        }
      }
    });
  });
