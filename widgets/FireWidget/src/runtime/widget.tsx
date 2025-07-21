/** @jsx jsx */
import './assets/style.css';
import {AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState, DataSourceManager} from "jimu-core";
import {IMConfig} from "../config";
import {Progress, Switch, Button, Icon, Loading, TextInput, Tabs, Tab} from 'jimu-ui';
import React, {Component} from 'react';
import {JimuMapView, JimuMapViewComponent} from 'jimu-arcgis';
import FeatureLayer from 'esri/layers/FeatureLayer';
import query from "esri/rest/query";
import SpatialReference from "esri/geometry/SpatialReference";
import Query from "esri/rest/support/Query";
import geometryEngine from "esri/geometry/geometryEngine";
import {listenForViewVisibilityChanges} from '../../../shared';

interface State {
  jimuMapView: JimuMapView
  fires: any[]
  acresArray: any[]
  checked: boolean
  visible: boolean
  firesInitial: any[]
  myFires: any[]
  myFiresTabActive: boolean
}

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, State> {
  all_fires: any[] = [];
  acresArray: number[];
  perimeterbufferFC: FeatureLayer;
  fireList: any[];
  jmv: JimuMapView;
  checked: boolean = false;
  fireLayerNames: any[];
  fireLayerVisReset: any[] = [];
  fireLayerFilterReset: any[] = [];
  irwinLabel: string = "Wildfire Reporting (IRWIN)";
  // irwinLabel: string = "USA_Wildfires_v1 - Current_Incidents";
  perimeterLabel: string = "NIFS Current Wildfire Perimeters";
  // perimeterLabel: string = "USA_Wildfires_v1 - Current_Perimeters";
  boundaries: FeatureLayer;
  r9Geom: any;
  openVisState: any[] = [];
  child;
  first: boolean = true;
  // perimeterBufferFC: FeatureLayer;
  // datasource: DataSourceManager;
  subscriptionsURL = "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/R9NotificationSubscriptions/FeatureServer/0";
  subscriptionIDs: any[];
  customPoiURL = "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/R9NotificationCustomPoints/FeatureServer/0";
  customPoiFC: FeatureLayer;
  customPOIs: any[] = [];
  currentUsername: string;

  constructor(props) {
    super(props);
    this.checked = false;
    this.child = React.createRef();
    // Add this to use layer selection as configurable data source
    // this.datasource = DataSourceManager.getInstance().getDataSource(this.props.useDataSources[0].mainDataSourceId);
  }

  componentDidMount() {
    this.setUpFeatureLayers(
        {
        // Hard coded url
        // url: "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/R9Notifiable/FeatureServer/0",

        // Use this one if going back to the layer select
        // url: this.datasource._url,
        url: this.props.dataSourceUrl,
        definitionExpression: "display = 1"
      },
      {
        url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_States_Generalized_Boundaries/FeatureServer/0',
      })
    this.getGeometryUnion(`${this.boundaries.url}/${this.boundaries.layerId}`, "STATE_ABBR='CA' OR STATE_ABBR='AZ' OR STATE_ABBR='NV'").then(res => {
      this.r9Geom = res;
    });

    this.checked = false;
    this.setState({
      myFiresTabActive: false,
      myFires: []
    });
    listenForViewVisibilityChanges(this.props.id, this.updateVisibility);
    this.loadFires();
  }

  updateVisibility = (visible) => this.setState({visible});

  componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView; fires: any[]; acresArray: any[] }>, snapshot?: any) {
    if (this.state?.jimuMapView && !this.search) {
      if (getAppStore().getState().user.username && !this.currentUsername) {
        this.initCustomPoiFC();
      }
      let widgetState: WidgetState;
      widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;
      if (widgetState == WidgetState.Closed || this.state?.visible === false) {
        this.resetFireFilter(false, true);

        this.jmv.view.map.allLayers.forEach(lyr => {
          var fireLayer = Array(this.irwinLabel, this.perimeterLabel).find((x) => {
            return x === lyr.title;
          });
          if (fireLayer) {
            lyr.visible = !!this.openVisState.includes(fireLayer);
          }
        });

        this.jmv.view.map.layers.remove(this.perimeterbufferFC);
        this.jmv.view.map.layers.remove(this.customPoiFC);
        this.fireLayerVisReset = [];
        this.fireLayerFilterReset = [];
        this.jmv.view.map.layers.remove(this.perimeterbufferFC);
        this.resetFireFilter(true, true);
        this.first = true;

      } else if (widgetState == WidgetState.Opened || this.state?.visible === true) {
        // // do stuff here on widget open if needed
        if (this.first) { // first time after reopening so we dont end up in an infinite loop
          this.openVisState = this.getFireLayerVis();
          this.loadFires().then(() => {
            this.filterFires();
            //Check to see if perimeter buffer layer has been added
            var bufferLayerStatus = this.jmv.view.map.layers.get(this.perimeterbufferFC.id);
            if (!bufferLayerStatus) {
              this.jmv.view.map.layers.add(this.perimeterbufferFC);
            }
          });
          this.getGeometryUnion(`${this.boundaries.url}/${this.boundaries.layerId}`, "STATE_ABBR='CA' OR STATE_ABBR='AZ' OR STATE_ABBR='NV'").then(res => {
            this.r9Geom = res;
          });
          this.checked = false;
          this.first = false
        }
        this.setPoiLayerVisibility();
      }
    }
  }

  onActiveViewChange = (jmv: JimuMapView) => {
    this.jmv = jmv;
    // this.jmv.view.map.add(this.perimeterbufferFC, 0);

    if (jmv) {
      this.setState({
        jimuMapView: jmv
      });
    }
  }

  initCustomPoiFC() {
    this.currentUsername = getAppStore().getState().user.username;
    this.customPoiFC = new FeatureLayer({
      url: this.customPoiURL,
      title: 'Custom Point of Interest',
      definitionExpression: `Creator LIKE '%${this.currentUsername}%'`,
      popupTemplate: {
        title: 'Custom Point of Interest',
        content: [{
          type: "fields",
          fieldInfos: [{
            fieldName: "Name"
          }, {
            fieldName: "Creator"
          }, {
            fieldName: "CreationDate"
          }]
        }],
        lastEditInfoEnabled: false
      },
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-marker",
          style: "diamond",
          size: 14,
          color: [21, 217, 24, 1],
          outline: {
            width: 0.5,
            color: "black"
          }
        }
      }
    });
    this.getSubscriptions().then(() => this.getCustomPointsOfInterest(this.customPoiFC));
  }

  getCustomPointsOfInterest(PoiFC: FeatureLayer) {
    const customPoiQuery = PoiFC.createQuery();
    customPoiQuery.where = `Creator LIKE '%${this.currentUsername}%'`;
    customPoiQuery.outSpatialReference = new SpatialReference({wkid: 102100});
    customPoiQuery.returnGeometry = true;
    customPoiQuery.outFields = ["*"];
    return query.executeQueryJSON(this.customPoiURL, customPoiQuery).then(results => {
      if (results.features.length > 0) {
        this.customPOIs = results.features.filter(f => this.subscriptionIDs.includes(f.attributes.SubscriptionID));
        this.populateMyFires();
      }
    });
  }

  getSubscriptions() {
    const subscriptionsFC = new FeatureLayer({
      url: this.subscriptionsURL,
      title: 'Subscriptions'
    });
    const subscriptionsQuery = subscriptionsFC.createQuery();
    subscriptionsQuery.where = `Subscriber LIKE '%${this.currentUsername}%'`;
    subscriptionsQuery.outFields = ["*"];
    return query.executeQueryJSON(this.subscriptionsURL, subscriptionsQuery).then(results => {
      this.subscriptionIDs = results.features.map(s => s.attributes.GlobalID);
    })
  }

  populateMyFires() {
    this.setState({myFires: []});
    const whereItems = [];
    this.customPOIs.forEach((poi) => {
      whereItems.push(`NotificationConfigurationID LIKE '%${poi.attributes.GlobalID}%'`);
    })
    const whereQuery = whereItems.join(' OR ');
    const notifiableQuery = this.perimeterbufferFC.createQuery();
    notifiableQuery.where = `Archived IS NULL AND (${whereQuery})`;
    notifiableQuery.outSpatialReference = new SpatialReference({wkid: 102100});
    notifiableQuery.returnGeometry = true;
    notifiableQuery.outFields = ["*"];
    return query.executeQueryJSON(`${this.perimeterbufferFC.url}/${this.perimeterbufferFC.layerId}`, notifiableQuery).then(results => {
      if (results.features.length > 0) {
        const myFiresArray = [];
        results.features.forEach((fire) => {
          if (!myFiresArray.find(x => x.attributes.Name === fire.attributes.Name)) {
            const poiMatch = this.customPOIs.find(p => p.attributes.GlobalID === fire.attributes.NotificationConfigurationID);
            fire['POI_Name'] = poiMatch.attributes.Name;
            myFiresArray.push(fire);
          } else {
            const poiFire = myFiresArray.find(x => x.attributes.Name === fire.attributes.Name);
            const poiMatch = this.customPOIs.find(p => p.attributes.GlobalID === fire.attributes.NotificationConfigurationID);
            poiFire['POI_Name'] = poiFire['POI_Name'] + ', ' + poiMatch.attributes.Name;
          }
        })
        this.setState({myFires: myFiresArray});
      }
    });
  }

  getGeometryUnion(layerUrl, queryWhere?, queryOutFields?, queryOurSR?) {
    var where = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '1=1';
    var outFields = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ['*'];
    var outSR = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 4326;

    var newQuery = new Query();
    newQuery.where = where;
    newQuery.outSpatialReference = new SpatialReference({wkid: outSR});
    newQuery.returnGeometry = true;
    newQuery.outFields = outFields;
    return query.executeQueryJSON(layerUrl, newQuery).then(function (results) {
      if (results.features) {
        return geometryEngine.union(results.features.map(function (g) {
          return g.geometry;
        }));
      }
    });
  }

  fireSwitchActive = () => {
    this.checked = !this.checked;
    this.setState({
      checked: this.checked
    });

    return this.toggleFires(this.checked);
  }

   loadFires(whereText?: string, firesList?: any[]) {
    var currentDate = this._getCurrentDate();

    const activeFires = firesList ? firesList.map(f => f.attributes.GlobalID) : null;

    //Identify default fire layers and visiblity
    //get perimeter buffer feature layer
    //Query for fires
    let query1 = this.perimeterbufferFC.createQuery();
    query1.where = whereText ? `Name LIKE '%${whereText}%'` : "display = 1";
    query1.outSpatialReference = new SpatialReference({wkid: 102100});
    query1.returnGeometry = true;
    query1.orderByFields = ["NAME ASC"];
    query1.outFields = ["*"];
    return query.executeQueryJSON(`${this.perimeterbufferFC.url}/${this.perimeterbufferFC.layerId}`, query1).then(results => {
      firesList ? this._QueryFiresResults(results, activeFires) : this._QueryFiresResults(results);
    });
  }

  _getCurrentDate() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    return yyyy + '-' + mm + '-' + dd;
  }

  _QueryFiresResults(results, firesList?: any[]) {
    this.setState({fires: []});

    this.all_fires = firesList ? results.features.filter(f => firesList.includes(f.attributes.GlobalID)) : results.features;

    //get min and max acres
    this.acresArray = this.all_fires.map(function (a) {
      let fireData = JSON.parse(a.attributes.Data);
      if (Object.keys(fireData).length !== 0) {
        return fireData.acres;
      } else {
        var dAcres = a.attributes.DailyAcres ? a.attributes.DailyAcres : 0;
        var gAcres = a.attributes.GISAcres ? a.attributes.GISAcres : 0;
        if (dAcres === 0) {
          return gAcres;
        } else {
          return parseFloat(dAcres);
        }
      }
    });
    !this.state.firesInitial && this.setState({firesInitial: this.all_fires});
    this.setState({fires: this.all_fires});
  }

  _QueryfireResultsError(err) {
    //Need to write a better error report
    console.error(`Error: ${err}`);
  }

  toggleFires = (e: boolean) => {
    if (e) {
      this.jmv.view.map.layers.remove(this.perimeterbufferFC);
      this.resetFireFilter(true);
    } else {
      if (this.state.myFiresTabActive) {
        this.resetFireFilter(true);
      } else {
        this.loadFires().then(() => {
          this.filterFires();
          //Check to see if perimeter buffer layer has been added
          var bufferLayerStatus = this.jmv.view.map.layers.get(this.perimeterbufferFC.id);
          if (!bufferLayerStatus) {
            this.jmv.view.map.layers.add(this.perimeterbufferFC);
          }
        });
      }
    }
  }

  getFireLayerVis() {
    var lyrs = [];
    this.jmv.view.map.allLayers.forEach(lyr => {
      var fireLayer = Array(this.irwinLabel, this.perimeterLabel).find(function (x) {
        return x === lyr.title;
      });
      if (fireLayer) {
        if (lyr.visible) {
          lyrs.push(lyr.title);
        }
      }
    });
    return lyrs;
  }

  resetFireFilter = (loadAllFires, onClose = false, whereText?: string) => {
    const myFiresItems = [];
    (this.state.myFires.length > 0 && this.state.myFiresTabActive && !this.checked) && this.state.myFires.forEach(f => {
      myFiresItems.push(`IncidentName LIKE '%${f.attributes.Name}%'`);
    })
    this.fireLayerFilterReset.forEach((x) => {
      x.definitionExpression = '';
      if (x.title === this.irwinLabel && loadAllFires) {
        var q = new Query();
        q.where = whereText ? `DailyAcres > 5 AND IncidentName LIKE '%${whereText}%'` :
            myFiresItems.length > 0 ? `DailyAcres > 5 AND (${myFiresItems.join(' OR ')})` : 'DailyAcres > 5';
        q.geometry = this.r9Geom;
        q.orderByFields = ['IncidentName ASC'];
        q.spatialRelationship = "intersects";
        q.outFields = ["*"];
        q.returnGeometry = true;
        query.executeQueryJSON(`${x.url}/${x.layerId}`, q).then((results) => {
          results.features = results.features.map((x) => {
            x.attributes;
            x.attributes.counties = JSON.stringify([x.attributes.POOCounty]);
            x.attributes.facilities = '{}';
            x.attributes.Data = '{}';
            x.attributes.tribes = '[]';
            return x;
          });
          this._QueryFiresResults(results);
        }, function (error) {
          console.log(error);
        });
      }
    });

    if (!onClose) {
      this.jmv.view.map.allLayers.forEach(lyr => {
        if (lyr.type == 'feature') {
          var fireLayer = Array(this.irwinLabel, this.perimeterLabel).find(function (x) {
            return x === lyr.title;
          });
          if (fireLayer) {
            var isIrwin = fireLayer === this.irwinLabel ? true : false;
            var filter = isIrwin ? 'DailyAcres >= 5' : 'GISAcres >= 5';
            // layerNode.getLayerObject()
            //@ts-ignore we check that this is a featureLayer earlier on
            var fl = lyr;
            var q = new Query();
            q.where = '2=2';
            q.geometry = this.r9Geom;
            q.spatialRelationship = "intersects";
            q.outFields = ["*"];
            q.returnGeometry = true;
            //@ts-ignore fl.parsedUrl, we check that this is a featureLayer earlier on
            query.executeForIds(`${fl.url}/${fl.layerId}`, q).then((results) => {
              if (results) {
                var idStr = 'OBJECTID' + " IN(" + results.join(',') + ")";
                filter += ' AND ' + idStr;
              }
              //@ts-ignore we check that this is a featureLayer earlier on
              lyr.definitionExpression = myFiresItems.length > 0 ? myFiresItems.join(' OR ') : filter;
            }).catch(e => {
              console.log(e)
            });
          }
        }
      });
    }
  }

  filterFires() {
    this.fireLayerNames = [{
      label: this.perimeterLabel,
      filter: this.all_fires.map(function (f) {
        if (f.attributes.Data) {
          let d = JSON.parse(f.attributes.Data);
          return 'GeometryID = \'' + d.perimeter_id + '\'';
        } else {
          return 'GeometryID = \'' + f.attributes.GeometryID + '\'';
        }
      }).concat().join(" OR ")
    }, {
      label: this.irwinLabel,
      filter: this.all_fires.map(function (f) {
        if (f.attributes.Data) {
          let d = JSON.parse(f.attributes.Data);
          return 'IrwinID = \'' + d.IRWINID + '\'';
        } else {
          return 'IrwinID = \'' + f.attributes.IRWINID + '\'';
        }
      }).join(" OR ")
    }];

    this.fireLayerVisReset = [];
    this.fireLayerFilterReset = [];

    this.jmv.view.map.allLayers.forEach(lyr => {
      if (lyr.type == 'feature') {
        var fireLayer = this.fireLayerNames.find((x) => {
          return x.label === lyr.title;
        });
        if (fireLayer) {
          //@ts-ignore
          lyr.definitionExpression = fireLayer.filter;
          this.fireLayerFilterReset.push(lyr);
          if (!lyr.visible) {
            lyr.visible = true;
            this.fireLayerVisReset.push(lyr);
          }
        }
      }
    });
  }

  // only use this for single page experiences as it will cause issues with layer visibility in multiple page experiences
  // getArbitraryFirstMapWidgetId = (): string => {
  //     const appState: any = window._appState;
  //     // Loop through all the widgets in the config and find the "first"
  //     // that has the type (uri) of "arcgis-map"
  //     if (appState) {
  //         const arbitraryFirstMapWidgetInfo: { [key: string]: any } = Object.values(appState.appConfig.widgets).find((widgetInfo: any) => {
  //             return widgetInfo.uri === 'widgets/arcgis/arcgis-map/'
  //         });
  //
  //         return arbitraryFirstMapWidgetInfo.id;
  //     }
  //
  // }

  setUpFeatureLayers(perimFLInfo: { url: string, definitionExpression: string }, boundariesFLInfo: { url: string }) {
    this.perimeterbufferFC = new FeatureLayer({
      url: perimFLInfo.url,
      definitionExpression: perimFLInfo.definitionExpression,
    });

    this.boundaries = new FeatureLayer({url: boundariesFLInfo.url});
  }

  searchFires(searchText: string) {
    this.state.checked
        ? this.resetFireFilter(true, false, searchText)
        : this.loadFires(searchText, this.state.firesInitial);
  }

  setPoiLayerVisibility(e?: string) {
    if (e) {
      if (e === 'tab-my-fires') {
        this.setState({myFiresTabActive: true}, () => this.resetFireFilter(true));
        this.jmv.view.map.add(this.customPoiFC)
      } else {
        this.setState({myFiresTabActive: false});
        this.jmv.view.map.remove(this.customPoiFC);
        this.state.checked ? this.resetFireFilter(true) : this.loadFires().then(() => this.filterFires());
      }
    } else {
      if (this.state.myFiresTabActive) {
        this.jmv.view.map.add(this.customPoiFC);
      }
    }
  }

  render() {
    if (!this.state?.jimuMapView) {
      return <div className="jimu-widget" style={{backgroundColor: "white"}}>
        <Loading type="SECONDARY"/>
        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                              onActiveViewChange={this.onActiveViewChange}/>
      </div>
    }
    return (
      <div className="jimu-widget p-2" style={{overflowY: "scroll", backgroundColor: "white"}}>
        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                              onActiveViewChange={this.onActiveViewChange}/>
        <div style={{marginBottom: 10}}>These wildfires are greater than 10 acres and within 10 miles of
          EPA-monitored facilities.
          To learn about why these incidents are included, visit the <a
            href={"https://usepa.sharepoint.com/sites/R9_Community/R9GIS/SitePages/Notification-System.aspx"}
            target="_blank">Region 9 Notification System</a> page.

          Data in this widget are updated hourly.
        </div>
        <div className='customLegend'
             style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
          <div style={{display: 'flex'}}>
            <div className={'containedLegend'}
                 style={{backgroundColor: 'rgb(7, 111, 229)', height: 15, width: 15, marginRight: 5}}>

            </div>
            <div>Percent Contained</div>
          </div>
          <div style={{display: 'flex'}}>
            <div className={'notContainedLegend'}
                 style={{backgroundColor: 'red', height: 15, width: 15, marginRight: 5}}>
            </div>
            <div>Percent Not Contained</div>
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: 10}}>
          <label style={{display: 'flex', marginRight: 20}}>
            Show R9 Fires {'>'} 5 acres
          </label>
          <Switch data-testid="fire-switch" id='switch'
                  checked={this.checked}
                  onChange={this.fireSwitchActive}
          />
        </div>

        <TextInput type='search' placeholder='Search' disabled={this.state.myFiresTabActive}
                   onChange={(e) => this.searchFires(e.target.value)} style={{marginBottom: 10}} />

        <Tabs defaultValue="tab-all-fires" onChange={(e) => this.setPoiLayerVisibility(e)} type="underline">
          <Tab id="tab-all-fires" title="All Fires">
            {this.state && this.state.fires && this.jmv ? this.state.fires.map(x => <Fire ref={this.child}
                                                                                      fire={x}
                                                                                      jmv={this.jmv}
                                                                                      acresArray={this.acresArray}
                                                                                      perim={this.perimeterbufferFC}
                                                                                      context={this.props.context}/>) : ''}
          </Tab>
          <Tab id="tab-my-fires" title="My Notifications">
            {this.state.fires && this.jmv && this.state.myFires.length > 0
                ? this.state.myFires.map(x => <Fire ref={this.child} fire={x} jmv={this.jmv}
                                                     acresArray={this.acresArray} perim={this.perimeterbufferFC}
                                                     context={this.props.context}/>)
                : this.customPOIs.length === 0
                    ? <p style={{marginTop: 10}}>You have no custom points of interest.</p>
                    : <p style={{marginTop: 10}}>There are no active fires near your custom points of interest</p>}
            <a href='https://r9data.response.epa.gov/apps/notifications/' target='_blank'>
              Click here to edit your custom points of interest</a>
          </Tab>
        </Tabs>
      </div>
    );
  }
}

class Fire extends Component<any, any, any> {
  BarWidth: number;
  Counties: any;
  PercentContained: any;
  DailyAcres: any;
  GISAcres: any;
  IncidentName: string;
  ReportingAcres: any;
  PCLabel: string;
  AcresFacilitySubText: string;
  reportUrl: string;

  constructor(private jimuMapView: JimuMapView) {
    super(jimuMapView);
    this.zoomToFire = this.zoomToFire.bind(this);
    this.init = this.init.bind(this);
    this._queryFireAttachment = this._queryFireAttachment.bind(this);
  }

  componentDidMount() {
    this.init();
    this.render();
  }

  componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<any>, snapshot?: any) {
  }

  init() {
    var rmp = '', npl = '';
    this.AcresFacilitySubText = '';
    //     Acres and PercentContained
    this.setState({});
    let fireData = JSON.parse(this.props.fire.attributes.Data);
    this.PercentContained = fireData.percent_contained ? fireData.percent_contained : this.props.fire.attributes.PercentContained ? this.props.fire.attributes.PercentContained : 0;
    this.DailyAcres = fireData.acres ? fireData.acres : this.props.fire.attributes.DailyAcres ? this.props.fire.attributes.DailyAcres : 0;
    this.GISAcres = fireData.acres ? fireData.acres : this.props.fire.attributes.GISAcres ? this.props.fire.attributes.GISAcres : 0;
    this.IncidentName = fireData.IncidentName ? fireData.IncidentName.toUpperCase()
        : this.props.fire.attributes.IncidentName ? this.props.fire.attributes.IncidentName.toUpperCase()
            : this.props.fire.attributes.Name ? this.props.fire.attributes.Name.toUpperCase()
                : "";
    this.Counties = fireData.hasOwnProperty('counties') ? fireData.counties.split(",") : JSON.parse(this.props.fire.attributes.counties);


    if (this.DailyAcres == 0) {
      this.ReportingAcres = this.GISAcres;
    } else {
      this.ReportingAcres = this.DailyAcres;
    }

    var tribes = fireData.hasOwnProperty('tribes') ? fireData.tribes.split(",").filter(function (d) {
      return d !== "";
    }) : undefined;


    var t = '';
    if (tribes) {
      t = `, ${tribes.length} tribes`;
    }

    let facilities = 'facilities' in fireData ? fireData.facilities : undefined;

    if (facilities) {
        let rmpFacilities = facilities["Active RMP Facilities"] ? facilities["Active RMP Facilities"] : 0;
        let nplFacilities = facilities["NPL Sites"] ? facilities["NPL Sites"] : 0;
        rmp = `, ${rmpFacilities} RMP`;
        npl = `, ${nplFacilities} NPL`;
        this.AcresFacilitySubText = `${parseFloat(this.ReportingAcres).toLocaleString('en') + " acres" + rmp + npl + t}`
    } else {
      if (tribes) {
        this.AcresFacilitySubText = `${parseFloat(this.ReportingAcres).toLocaleString('en') + " acres" + t}`
      } else {
        this.AcresFacilitySubText = `${parseFloat(this.ReportingAcres).toLocaleString('en') + " acres"}`
      }
    }

    var c = '';
    if (this.Counties) {
      if (this.Counties.length > 1) {
        c = 'Counties';
      } else {
        c = 'County';
      }
      this.Counties = `${c}: ` + this.Counties.join(", ");
    }


    this.PCLabel = parseFloat(this.ReportingAcres).toLocaleString('en') + " acres";

    let acresMin = 0
    let acresMax = Math.max.apply(Math, this.props.acresArray);
    let acresRange = acresMax - acresMin;
    let scaledPixels = (this.ReportingAcres - acresMin) * (300 / acresRange);
    if (scaledPixels < 100) {
      this.BarWidth = 100;
    } else {
      this.BarWidth = scaledPixels;
    }

    this.setState({
      barWidth: this.BarWidth,
      counties: this.Counties,
      PercentContained: this.PercentContained,
      DailyAcres: this.DailyAcres,
      GISAcres: this.GISAcres,
      IncidentName: this.IncidentName,
      ReportingAcres: this.ReportingAcres,
      PCLabel: this.PCLabel,
      AcresFacilitySubText: this.AcresFacilitySubText,
    });

    this._queryFireAttachment();
  }

  zoomToFire() {
    if (this.props.fire.geometry) {
      if (this.props.fire.geometry.type === 'polygon') {
        this.props.jmv.view.extent = this.props.fire.geometry.extent; // setting map extent to match fire buffer extent
      }

      if (this.props.fire.geometry.type === 'point') {
        this.props.jmv.view.goTo(this.props.fire.geometry);
        this.props.jmv.view.scale = 240000;
      }
    } else {
      this.props.jmv.view.goTo({center: [-119.5, 36.7]}); // else just center map over CA
      this.props.jmv.view.zoom = 5;
    }
  }

  _queryFireAttachment() {
    let oid = this.props.fire.attributes.OBJECTID.toString()
    let attachQuery = {
      objectIds: oid,
      definitionExpression: `OBJECTID = ${oid}`
    }

    this.props.perim.queryAttachments(attachQuery).then((res) => {
      if(res[oid]) {
        const latestReportIndex = res[oid].length - 1;
        // window.open(res[oid][latestReportIndex].url, "_top");
        this.reportUrl = res[oid][latestReportIndex].url;
        this.setState({reportUrl: this.reportUrl});
      }
    });
  }

  render() {
    return <div className='layerDiv' id={this.props.fire.attributes.OBJECTID}
                title="Click to zoom"
                onClick={this.zoomToFire}>
      {(JSON.parse(this.props.fire.attributes.Data).hasOwnProperty('IncidentName') && this.reportUrl) &&
        <Button title='Get Report' aria-label="Button" htmlType="button" icon className='report-button'
                size="default" onClick={() => window.open(this.reportUrl, '_top')}>
          <Icon className='report-button'
                icon={`${this.props.context.folderUrl}dist/runtime/assets/images/operation_normal.svg`} size='m'/>
        </Button>
      }
      {this.props.fire.POI_Name && <div><b>Associated Points of Interest: {this.props.fire.POI_Name}</b></div>}
      <div className='fireNameTxt'><b>{this.IncidentName}</b></div>
      <div className='acresTxt' title={`${this.Counties}`}>{this.Counties}</div>
      <div>({this.AcresFacilitySubText})</div>
      <Progress
        tooltip='Percent Contained'
        // showProgress={true}
        className='fireProgress' style={{maxWidth: '100%'}}
        color={'rgb(7, 111, 229)'} value={Math.round(this.PercentContained)}>
      </Progress>
      {/*<div id='acresSubtext' style={{*/}
      {/*  width: this.BarWidth,*/}
      {/*  marginTop: '-24px',*/}
      {/*  color: 'white',*/}
      {/*  textAlign: 'center',*/}
      {/*  fontSize: 'medium',*/}
      {/*}}>{}</div>*/}
    </div>;
  }
}
