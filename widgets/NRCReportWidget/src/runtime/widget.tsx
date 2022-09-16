/** @jsx jsx */
import './assets/style.css';
import {React, AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState, SessionManager} from "jimu-core";
import {IMConfig} from "../config";
import {JimuMapView, JimuMapViewComponent} from "jimu-arcgis";
import DataGrid, {SelectColumn} from "react-data-grid";
import Extent from "esri/geometry/Extent";
import FeatureLayer from "esri/layers/FeatureLayer";
import Query from "esri/rest/support/Query";
import SimpleMarkerSymbol from "esri/symbols/SimpleMarkerSymbol";
import Graphic from "esri/Graphic";
import Color from "esri/Color";
import {Loading} from 'jimu-ui';
import {DataSourceComponent} from 'jimu-core';
import {getViewIDs, listenForViewChanges, listenForViewVisibilityChanges, visibilityChanged} from '../../../shared';

function getComparator(sortColumn: string) {
  switch (sortColumn) {
    // todo: configure for NRC columns
    case 'sourceofpollution':
      return (a, b) => {
        return a[sortColumn].localeCompare(b[sortColumn]);
      };
    case 'dateofreport':
      return (a, b) => {
        // @ts-ignore
        return new Date(a[sortColumn]) - new Date(b[sortColumn]);
      };
    default:
      throw new Error(`unsupported sortColumn: "${sortColumn}"`);
  }
}

interface State {
  jimuMapView: JimuMapView
  loading: boolean
  columns: any[]
  rows: any[]
  sortedRows: any[]
  sortColumns: any[]
  nothingThere: any[]
  record: any[]
  configured: boolean;
  visible: boolean;
}

export default class NRCWidget extends BaseWidget<AllWidgetProps<IMConfig>, State> {
  state = {loading: true}
  jmv: JimuMapView;
  first: boolean = true;
  loading: boolean = false;
  mainText: boolean = true;
  rows: any[] = [];
  sortedRows: any[] = [];
  columns: any[] = [];
  sortColumns: any[] = [];
  nothingThere: any[] = [];
  multipleLocations: boolean = false;
  nrcLayer: FeatureLayer;
  featureSet: any[] = [];
  symbol: SimpleMarkerSymbol = new SimpleMarkerSymbol({size: 20, color: new Color([255, 255, 0, 0.5])});
  token: any = null;
  record: any[] = [];
  openVisState: boolean;
  nrcTitle: string = 'WebEOCHotlineLogGeoJSON';
  currentPopup: any;
  viewIds = new Set;
  mapClickHandler;

  onActiveViewChange = (jmv: JimuMapView) => {
    this.jmv = jmv;
    if (jmv) {
      this.setState({
        jimuMapView: jmv,
        loading: false
      });
    }
  }

  nrcLayerCreated = (e) => {
    const webEocLayer = this.jmv.view.map.layers.filter(lyr => lyr.type === 'group' && lyr.title === 'Emergency Response')
        .items[0].layers.filter(l => l.title === 'WebEOC Hotline Log').items[0];
    webEocLayer.visible = true;
    this.nrcLayer = e.layer
    this.initNrcLayer();
  }

  disablePopup(view) {
    this.currentPopup = view.popup;
    view.popup = null;
  }

  enablePopup(view) {
    view.popup = this.currentPopup;
  }

  updateVisibility = (visible) => this.setState({visible})

  componentDidMount() {
    listenForViewVisibilityChanges(this.props.id, this.updateVisibility)
  }

  componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView }>, snapshot?: any) {
    if (this.token === null) {
      this.captureToken();
    }

    if (this.state.jimuMapView && this.nrcLayer) {
      const widgetState: WidgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;
      // do anything on open/close of widget here
      if ((widgetState === WidgetState.Opened || this.state?.visible === true)) {
        if (this.first) {
          this.setLayerVis(true)
          this.mapClickHandler = this.state.jimuMapView.view.on('click', event => {
            this.mapClick(event)
          })
          this.disablePopup(this.jmv.view)
        }
        this.first = false;
      }
      if (widgetState === WidgetState.Closed || this.state?.visible === false) {
        this.first = true;
        this.nrcLayer.visible = this.openVisState;
        this.mainText = true
        this.rows = [];
        this.record = [];
        this.sortedRows = [];
        this.nothingThere = [];
        this.enablePopup(this.jmv.view)
        this.setLayerVis(this.openVisState)
        if (this.mapClickHandler) {
          this.mapClickHandler.remove()
        }
        this.jmv.view.graphics.removeAll();
      }
    }
  }

  initNrcLayer() {
    this.nrcLayer.on('layerview-create', () => {
        this.loading = false;
        this.setState({
          loading: false
        });
      }
    );
    if (this.jmv) {
      this.setState({loading: false})
    }
  }

  captureToken() {
    let sessions = SessionManager.getInstance().getSessions();
    if (sessions.length > 0) {
      this.token = sessions[0].token;
    } else if (this.props.token !== undefined && this.props.token !== "") {
      this.token = this.props.token;
    }
  }

  setLayerVis(visible) {
    const mapLayer = this.jmv.view.map.allLayers.find(lyr => lyr.url === this.nrcLayer.url);
    if (mapLayer) {
      if (this.openVisState === undefined) {
        this.openVisState = mapLayer.visible
      }
      mapLayer.visible = visible
    }
    // if (!this.openVisState) {
    //   this.nrcLayer.visible = true;
    // }
  }

  // use this only if you have a single page experience and want the widgets to automatically use the first mapView
  // getArbitraryFirstMapWidgetId = (): string => {
  //     const appState: any = window._appState;
  //     // Loop through all the widgets in the config and find the "first"
  //     // that has the type (uri) of "arcgis-map"
  //     if (appState) {
  //         const arbitraryFirstMapWidgetInfo: { [key: string]: any } = Object.values(appState.appConfig.widgets).find((widgetInfo: any) => {
  //             return widgetInfo.uri === 'widgets/arcgis/arcgis-map/'
  //         });
  //         return arbitraryFirstMapWidgetInfo.id;
  //     }
  // }

  LandingText = () => {
    if (this.mainText) {
      return (
        <div id="landingText" style={{overflow: 'auto'}}>
          <h2> Select Web EOC point to view the log.</h2>
        </div>
      )
    } else {
      return null
    }
  }

  mapClick = (e) => {
    this.mainText = false;
    this.loading = true;
    this.rows = [];
    this.record = [];
    this.sortedRows = [];
    this.nothingThere = [];
    this.setState({
      loading: this.loading,
      rows: this.rows,
      sortedRows: this.sortedRows,
      record: this.record,
      nothingThere: this.nothingThere,
    });

    this.jmv.view.graphics.removeAll();
    let pixelWidth = this.jmv.view.extent.width / this.jmv.view.width;
    let toleraceInMapCoords = 10 * pixelWidth;
    let clickExtent = new Extent({
      xmin: e.mapPoint.x - toleraceInMapCoords,
      ymin: e.mapPoint.y - toleraceInMapCoords,
      xmax: e.mapPoint.x + toleraceInMapCoords,
      ymax: e.mapPoint.y + toleraceInMapCoords,
      spatialReference: this.jmv.view.spatialReference,
    });

    let featureQuery = new Query();
    featureQuery.outFields = ['*'];
    featureQuery.geometry = clickExtent;
    featureQuery.orderByFields = ['dateofreport DESC'];
    featureQuery.returnGeometry = true;
    this.nrcLayer.queryFeatures(featureQuery).then((features) => {
      this.featureSet = features.features
      if (this.featureSet.length === 1) {
        this.multipleLocations = false;
        this.loadLog(this.featureSet[0]);
      } else if (this.featureSet.length > 1) {
        this.multipleLocations = true;
        let data = [];
        this.featureSet.forEach(feature => {
          data.push(feature.attributes);
        });

        this.rows = data;
        this.sortedRows = data;
        this.columns = [
          {
            key: 'sourceofpollution',
            name: 'Source of Pollution'
          },
          {
            key: 'dateofreport',
            name: 'Date of Report',
            formatter(props) {
              const date = props.row.dateofreport
              return <p>{new Date(date).toISOString().split('T')[0]}</p>
            }
          }
        ];
        this.loading = false;

        this.setState({
          rows: this.rows,
          sortedRows: this.sortedRows,
          columns: this.columns,
          loading: this.loading
        });
      } else {
        this.multipleLocations = false;
        this.nothingThere = [<h3>No logs found at this location</h3>]
        this.loading = false;
        this.setState({
          nothingThere: this.nothingThere,
          loading: this.loading,
        });
      }
    });
  }


  rowClick = (row) => {
    let location = this.featureSet.filter((feature) => {
      return feature.attributes.OBJECTID === this.sortedRows[row].OBJECTID;
    });
    this.loadLog(location[0]);
  }

  NothingFound = () => {
    if (this.nothingThere.length > 0) {
      return (
        <div>
          <h3>No reports found at this location</h3><br/>
        </div>
      )
    } else {
      return null
    }
  }

  Grid = () => {
    return (
      <div>
        {this.multipleLocations ?
          <div>
            <div><h3>Multiple Facilities at that Location</h3><br/><h5>Select one to continue</h5></div>
            <DataGrid style={{
              height: `${(this.sortedRows.length * 35) + 37}px`,
              maxHeight: "700px",
              backgroundColor: "white'"}}
              className={'rdg-light'}
              columns={this.columns}
              rows={this.sortedRows}
              onRowClick={this.rowClick}
              rowKeyGetter={(r) => r} defaultColumnOptions={{
              sortable: true,
              resizable: true
            }} onSortColumnsChange={this.onSortColsChange} sortColumns={this.sortColumns}/>
          </div> : null}
      </div>
    )
  }

  onSortColsChange = (cols) => {
    if (cols.length === 0) {
      this.sortedRows = this.rows;
      this.sortColumns = [];
      this.setState({
        sortedRows: this.sortedRows,
        sortColumns: this.sortColumns,
      })
      return this.rows
    }

    this.sortColumns = cols.slice(-1);
    this.sortedRows = [...this.rows];
    this.sortedRows.sort((a, b) => {
      for (let col of cols) {

        let comparator = getComparator(col.columnKey);
        let res = comparator(a, b);
        if (res !== 0) {
          return col.direction === 'ASC' ? res : -res;
        }
      }
      return 0;
    });

    this.setState({
      sortedRows: this.sortedRows,
      sortColumns: this.sortColumns
    });

    return this.sortedRows
  }

  RecordText = () => {
    if (this.record.length > 0) {
      return (
        <div>
          {this.record}
        </div>
      )
    } else {
      return null
    }
  }

  loadLog = (logEntry) => {
    this.multipleLocations = false;
    this.loading = true;
    this.setState({
      loading: this.loading
    });
    let selectedGraphic = new Graphic({geometry: logEntry.geometry, symbol: this.symbol});
    this.jmv.view.graphics.add(selectedGraphic);
    fetch(this.props.reportProxy + '/' + logEntry.attributes.nrcnumber, {
      headers: {'Content-Type': 'application/json', 'Authorization': this.token}
    }).then(function (response) {
      return response.text();
    }).then((response) => {
      this.loading = false;
      this.record.push(
        // todo: explore alternatives to this method
        <div dangerouslySetInnerHTML={{__html: response}}>
        </div>);

      this.setState({
        loading: this.loading,
        record: this.record,
      }, () => {
        this.RecordText();
      });
    });
  }


  render() {
    if (!this.props.useDataSources?.length || !this.props.useMapWidgetIds?.length) {
      return <h2>Please complete widget configuration.</h2>
    }
    let output;
    // if (!this.state?.configured) {
    //   output = (<div>Please finish configuring the widget.</div>)
    // }
    if (this.state?.loading) {
      output = (<Loading type='SECONDARY'/>)
    }
    if (!this.state?.loading && this.state?.rows === undefined) {
      output = (<this.LandingText/>)
    }
    if (this.state?.rows !== undefined) {
      output = (
        <div>
          <this.Grid/>
          <this.RecordText/>
          <this.NothingFound/>
        </div>
      )
    }

    return <div className="widget-addLayers jimu-widget w-100 p-2" style={{overflow: "auto", width: '600px'}}>
      <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                            onActiveViewChange={this.onActiveViewChange}/>
      <DataSourceComponent useDataSource={this.props.useDataSources[0]}
                           onDataSourceCreated={this.nrcLayerCreated}></DataSourceComponent>
      {output}
    </div>
  }
}
