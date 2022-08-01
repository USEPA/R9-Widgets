/** @jsx jsx */
import './assets/style.css';
import {AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState} from "jimu-core";
import {IMConfig} from "../config";
import {Progress, Switch, Button, Icon, Loading} from 'jimu-ui';
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
  perimeterBufferFC: FeatureLayer;


  constructor(props) {
    super(props);
    this.checked = false;
    this.child = React.createRef();
  }

  componentDidMount() {
    this.setUpFeatureLayers({
        url: "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/R9Notifiable/FeatureServer/0",
        definitionExpression: "display = 1"
      },
      {
        url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_States_Generalized/FeatureServer/0',
      })
    this.getGeometryUnion(`${this.boundaries.url}/${this.boundaries.layerId}`, "STATE_ABBR='CA' OR STATE_ABBR='AZ' OR STATE_ABBR='NV'").then(res => {
      this.r9Geom = res;
    });

    this.checked = false;
    listenForViewVisibilityChanges(this.props.id, this.updateVisibility)
  }

  updateVisibility = (visible) => this.setState({visible})

  componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView; fires: any[]; acresArray: any[] }>, snapshot?: any) {
    if (this.state?.jimuMapView) {
      let widgetState: WidgetState;
      widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;
      if (widgetState == WidgetState.Closed || this.state?.visible === false) {
        this.resetFireFilter(false, true);

        this.jmv.view.map.layers.forEach(lyr => {
          var fireLayer = Array(this.irwinLabel, this.perimeterLabel).find((x) => {
            return x === lyr.title;
          });
          if (fireLayer) {
            lyr.visible = !!this.openVisState.includes(fireLayer);
          }
        });

        this.jmv.view.map.layers.remove(this.perimeterbufferFC);
        this.fireLayerVisReset = [];
        this.fireLayerFilterReset = [];
        this.jmv.view.map.layers.remove(this.perimeterbufferFC);
        this.resetFireFilter(true, true);
        this.first = true;

      } else if (widgetState == WidgetState.Opened || this.state?.visible === true) {
        // // do stuff here on widget open if needed
        if (this.first) { // first time after reopening so we dont end up in an infinite loop
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
          this.openVisState = this.getFireLayerVis();
          this.checked = false;
          this.first = false
        }
      }
    }
  }

  onActiveViewChange = (jmv: JimuMapView) => {
    this.jmv = jmv;
    this.jmv.view.map.add(this.perimeterbufferFC, 0);

    if (jmv) {
      this.setState({
        jimuMapView: jmv
      });
    }
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

  loadFires() {
    var currentDate = this._getCurrentDate();
    //Identify default fire layers and visiblity
    //get perimeter buffer feature layer
    //Query for fires
    let query1 = this.perimeterbufferFC.createQuery();
    query1.where = "display = 1";
    query1.outSpatialReference = new SpatialReference({wkid: 102100});
    query1.returnGeometry = true;
    query1.orderByFields = ["NAME ASC"];
    query1.outFields = ["*"];
    return query.executeQueryJSON(`${this.perimeterbufferFC.url}/${this.perimeterbufferFC.layerId}`, query1).then(results => {
      this._QueryFiresResults(results);
    });
  }

  _getCurrentDate() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    return yyyy + '-' + mm + '-' + dd;
  }

  _QueryFiresResults(results) {
    this.setState({fires: []});
    this.all_fires = results.features;
    // this.setState({all_fires: results.features });
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

  getFireLayerVis() {
    var lyrs = [];
    this.jmv.view.map.layers.forEach(lyr => {
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

  resetFireFilter = (loadAllFires, onClose = false) => {
    this.fireLayerFilterReset.forEach((x) => {
      x.definitionExpression = '';
      if (x.title === this.irwinLabel && loadAllFires) {
        var q = new Query();
        q.where = 'DailyAcres > 5';
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
      this.jmv.view.map.layers.forEach(lyr => {
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
              lyr.definitionExpression = filter;
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

    this.jmv.view.map.layers.forEach(lyr => {
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

  render() {
    if (!this.state?.jimuMapView) {
      return <div className="jimu-widget" style={{backgroundColor: "white"}}>
        <Loading type="SECONDARY"/>
        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                              onActiveViewChange={this.onActiveViewChange}/>
      </div>
    }
    return (
      <div className="jimu-widget p-2" style={{overflow: "auto", backgroundColor: "white"}}>
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
                 style={{backgroundColor: 'blue', height: 15, width: 15, marginRight: 5}}>

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

        {this.state && this.state.fires && this.jmv ? this.state.fires.map(x => <Fire ref={this.child}
                                                                                      fire={x}
                                                                                      jmv={this.jmv}
                                                                                      acresArray={this.acresArray}
                                                                                      perim={this.perimeterbufferFC}
                                                                                      context={this.props.context}/>) : ''}
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
    this.IncidentName = fireData.IncidentName ? fireData.IncidentName.toUpperCase() : this.props.fire.attributes.IncidentName ? this.props.fire.attributes.IncidentName.toUpperCase() : "";
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

    let facilities = fireData.hasOwnProperty('current_results') ? fireData.current_results : undefined;

    if (facilities) {
      if (facilities.hasOwnProperty('facilities')) {
        let rmpFacilities = facilities.facilities && facilities.facilities["Active RMP Facilities"] ? facilities.facilities["Active RMP Facilities"] : 0;
        let nplFacilities = facilities.facilities && facilities.facilities["NationalPriorityListPoint_R9_2019_R9"] ? facilities.facilities["NationalPriorityListPoint_R9_2019_R9"] : 0;
        rmp = `, ${rmpFacilities} RMP`;
        npl = `, ${nplFacilities} NPL`;
        this.AcresFacilitySubText = `${parseFloat(this.ReportingAcres).toLocaleString('en') + " acres" + rmp + npl + t}`
      }
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
  }

  zoomToFire() {
    if (this.props.fire.geometry) {
      if (this.props.fire.geometry.type === 'polygon') {
        this.props.jmv.view.extent = this.props.fire.geometry.extent; // setting map extent to match fire buffer extent
      }

      if (this.props.fire.geometry.type === 'point') {
        this.props.jmv.view.goTo(this.props.fire.geometry);
        this.props.jmv.view.zoom = 10;
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
      var latestReportIndex = res[oid].length - 1;
      window.open(res[oid][latestReportIndex].url, "_top");
    });
  }

  render() {
    return <div className='layerDiv' id={this.props.fire.attributes.OBJECTID}
                title="Click to zoom"
                onClick={this.zoomToFire}>
      {JSON.parse(this.props.fire.attributes.Data).hasOwnProperty('IncidentName') &&
        <Button title='Get Report' aria-label="Button" htmlType="button" icon className='report-button'
                size="default" onClick={this._queryFireAttachment}>
          <Icon className='report-button'
                icon={`${this.props.context.folderUrl}dist/runtime/assets/images/operation_normal.svg`} size='m'/>
        </Button>
      }
      <div className='fireNameTxt'><b>{this.IncidentName}</b></div>
      <div className='acresTxt' title={`${this.Counties}`}>{this.Counties}</div>

      <Progress
        // showProgress={true}
        className='fireProgress' style={{width: this.BarWidth}}
        color={'primary'} value={Math.round(this.PercentContained)}>
        {this.PCLabel}
      </Progress>
      <div id='acresSubtext' style={{
        width: this.BarWidth,
        marginTop: '-24px',
        color: 'white',
        textAlign: 'center',
        fontSize: 'medium',
      }}>{this.AcresFacilitySubText}</div>
    </div>;
  }
}
