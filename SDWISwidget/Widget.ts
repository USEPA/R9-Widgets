// jIMU (WAB) imports:
/// <amd-dependency path="jimu/BaseWidget" name="BaseWidget" />
import Extent from "esri/geometry/Extent";

declare var BaseWidget: any; // there is no ts definition of BaseWidget (yet!)
// declareDecorator - to enable us to export this module with Dojo's "declare()" syntax so WAB can load it:
import declare from './support/declareDecorator';

// esri imports:
import EsriMap from 'esri/map';
import FeatureLayer from 'esri/layers/FeatureLayer';
import Query from 'esri/tasks/query';
import GraphicsLayer from 'esri/layers/GraphicsLayer';

// jimu
// @ts-ignore
import LoadingShelter from 'jimu/dijit/LoadingShelter';

// dojo imports:
import on from 'dojo/on';
import ItemFileWriteStore from 'dojo/data/ItemFileWriteStore';
// import dijit from 'dijit';
// @ts-ignore
import DataGrid from 'dojox/grid/DataGrid';

import IConfig from './config';

interface IWidget {
  baseClass: string;
  config?: IConfig;
  // myvar: any;
}

@declare(BaseWidget)
class Widget implements IWidget {
  public baseClass: string = 'sdwiswidget';
  public config: IConfig;
  // public myvar: any = {'variableone'};
  // public myvari: any = {};
  private inherited: any;

  private map: EsriMap;
  private featureLayer: FeatureLayer;
  private myNode: any;
  private clickHandler: any;
  private loadingShelter: LoadingShelter;
  private graphicsLayer: GraphicsLayer;
  private domNode: any;

  private postCreate(args: any): void {
    this.inherited(arguments);
    console.log('SDWISwidget::postCreate');
  }

  private startup(): void {

    let self: any = this;
    this.inherited(arguments);
    console.log('SDWISwidget::startup');

    this.loadingShelter = new LoadingShelter({hidden: true});
    this.loadingShelter.placeAt(this.domNode);

    this.graphicsLayer = new GraphicsLayer();
    this.map.addLayer(this.graphicsLayer);
    this.featureLayer = new FeatureLayer(
      'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/SDWIS_Base/FeatureServer/0',
      {outFields: ['*']});
    this.clickHandler = this._clickHandler();
  };

  private onOpen(): void {
    let self: any = this;
    this.loadingShelter.show();
    var query = new Query();
    query.where = '1=1';
    console.log('SDWISwidget::onOpen');
    this.featureLayer.queryCount(query, (count: number) => {
      this.myNode.innerHTML = `There are current <b>${count}</b> facilities in the sdwis service.`;
      this.loadingShelter.hide();
    })
    this.clickHandler.resume();
    this.map.setInfoWindowOnClick(false);
  };

  private _clickHandler() {
    var self: any = this;
    return on.pausable(this.map, "click", e => {
      this.graphicsLayer.clear();
      this.loadingShelter.show();
      this.myNode.innerHTML = '';
      // this.graphicLayer.clear();
      var pixelWidth = this.map.extent.getWidth() / this.map.width;
      var toleraceInMapCoords = 10 * pixelWidth;
      var clickExtent = new Extent(e.mapPoint.x - toleraceInMapCoords, e.mapPoint.y - toleraceInMapCoords, e.mapPoint.x + toleraceInMapCoords, e.mapPoint.y + toleraceInMapCoords, this.map.spatialReference);
      var featureQuery = new Query();
      featureQuery.outFields = ['*'];
      featureQuery.geometry = clickExtent;
      // featureQuery.orderByFields = ['dateofreport DESC'];
      this.featureLayer.selectFeatures(featureQuery, FeatureLayer.SELECTION_NEW, (features: any[]) => {
        if (features.length === 1) {
          this.loadFacility(features[0]); // this.loadRMPs(featureSet.features[0]);
          // noneFound.push(false);
        } else if (features.length > 1) {
          this.myNode.innerHTML = "<h3>Multiple log entries found</h3><br/><h5>Select one to continue</h5>" + '<div id="gridDiv" style="width:100%;"></div>';

          var data: any = {
            identifier: 'objectid',
            items: []
          };
          features.forEach((feature: any) => {
            // var attrs = dojo.mixin({}, feature.attributes);
            data.items.push(feature.attributes);
          });
          // @ts-ignore
          var store = new ItemFileWriteStore({
            data: data
          });
          // @ts-ignore
          store.data = data;
          // @ts-ignore
          var grid = dijit.byId("grid");

          if (grid !== undefined) {
            grid.destroy();
          }

          var layout = [{
            'name': 'Facility Name',
            'field': 'FacilityName',
            'width': '100%'
          }];

          grid = new DataGrid({
            id: 'grid',
            store: store,
            structure: layout,
            //rowSelector: '20px',
            autoHeight: true
          });
          grid.placeAt("gridDiv");
          grid.on('RowClick', (e: any) => {
            var rowItem = grid.getItem(e.rowIndex);
            var facility = features.filter(feature => {
              return feature.attributes.objectid === rowItem.objectid[0];
            });
            this.loadFacility(facility[0]);
          });
          grid.startup();
          this.loadingShelter.hide(); // noneFound.push(false);
        } else {
          this.myNode.innerHTML = '<h3>No logs found at this location</h3><br/>';
          this.loadingShelter.hide();
        }
      });
    });
  };

  private loadFacility(facility: any) {
    this.myNode.innerHTML = facility.attributes.FacilityName;
    this.loadingShelter.hide();
  }
// ,

  private onClose(): void {
    console.log('SDWISwidget::onClose');
    var self: any = this;
    this.clickHandler.pause();
  };
  // private onMinimize(): void {
  //   console.log('SDWISwidget::onMinimize');
  // };
  // private onMaximize(): void {
  //   console.log('SDWISwidget::onMaximize');
  // };
  // private onSignIn(credential): void {
  //   console.log('SDWISwidget::onSignIn', credential);
  // };
  // private onSignOut(): void {
  //   console.log('SDWISwidget::onSignOut');
  // };
  // private onPositionChange(): void {
  //   console.log('SDWISwidget::onPositionChange');
  // };
  // private resize(): void {
  //   console.log('SDWISwidget::resize');
  // };
}

export = Widget;
