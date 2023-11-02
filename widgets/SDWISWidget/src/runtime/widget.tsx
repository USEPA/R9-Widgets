/** @jsx jsx */
import './assets/style.css'
import {
  React, AllWidgetProps, BaseWidget, css, getAppStore, jsx,
  WidgetState, SessionManager, DataSourceComponent
} from 'jimu-core'
import {IMConfig} from '../config'
import {JimuMapView, JimuMapViewComponent} from 'jimu-arcgis'
import DataGrid, {SelectColumn} from 'react-data-grid'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Extent from 'esri/geometry/Extent'
import Query from 'esri/rest/support/Query'
import FeatureLayer from 'esri/layers/FeatureLayer'
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol'
import geometry from 'esri/geometry'
import Graphic from 'esri/Graphic'
import esriRequest from 'esri/request'
import urlUtils from 'esri/core/urlUtils'
import esriConfig from 'esri/config'
import {Loading} from 'jimu-ui'
import {getViewIDs, listenForViewVisibilityChanges, visibilityChanged} from '../../../shared'
import Facility from './Facility'
import PWS from './PWS';

function getComparator(sortColumn: string) {
  switch (sortColumn) {
    // todo: configure for SDWIS columns
    case 'FacilityName':
      return (a, b) => {
        return a[sortColumn].localeCompare(b[sortColumn])
      }
    default:
      throw new Error(`unsupported sortColumn: "${sortColumn}"`)
  }
}

interface State {
  jimuMapView: JimuMapView,
  loading: boolean,
  columns: any[],
  rows: any[],
  sortedRows: any[],
  sortColumns: any[],
  onOpenText: any[],
  nothingThere: boolean,
  facility: any
  pwsText: any[],
  regulatoryText: any[],
  adminContactText: any[],
  visible: boolean,
  configured: boolean
}

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, State> {
  jmv: JimuMapView;
  first: boolean = true;
  loading: boolean = false;
  mainText: boolean = true;
  rows: any[] = [];
  sortedRows: any[] = [];
  columns: any[] = [];
  sortColumns: any[] = [];
  multipleLocations: boolean = false;
  featureLayer: FeatureLayer;
  featureLayerPWS: FeatureLayer;
  featureLayerTable: FeatureLayer;
  featureLayerAdmin: FeatureLayer;
  onOpenText: any[] = [];
  featureSet: any[] = [];
  symbol: SimpleMarkerSymbol;
  facilityText: any[] = [];
  pwsText: any[] = [];
  regulatoryText: any[] = [];
  adminContactText: any[] = [];
  token: string = '';
  mapClickHandler;
  configured: boolean = false;
  // proxy_url = 'https://gis.r09.epa.gov/api/portal_proxy/';
  // sdwis_service_base_url = 'https://geosecure.epa.gov/arcgis/rest/services/Hosted/SDWIS_new_structure';

  constructor(props) {
    super(props)
    // bind this to class methods
    this.LandingText = this.LandingText.bind(this)
    this.rowClick = this.rowClick.bind(this)
    this.onSortColsChange = this.onSortColsChange.bind(this)
  }

  componentDidMount() {
    const sessions = SessionManager.getInstance().getSessions()
    if (sessions.length > 0) {
      this.token = sessions[0].token
    } else if (this.props.token !== undefined && this.props.token !== '') {
      this.token = this.props.token
    }

    // todo: check if this is needed, adjust URLs
    // ---- commented proxy config after moving over to geosecure service
    // esriConfig.request.trustedServers.push(this.proxy_url)

    // esriConfig.request.interceptors.unshift({
    //   // urls: ['https://gis.r09.epa.gov/api/portal_proxy/', 'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/SDWIS'],
    //   urls: [this.proxy_url, this.sdwis_service_base_url],
    //   before: (params) => {
    //     // console.log(params)
    //     //     params.requestOptions.headers = {'Authorization': this.token};
    //   },
    //   headers: {Authorization: `Token ${this.token}`}
    // })

    // // setup proxy rules for internal
    // urlUtils.addProxyRule({
    //   proxyUrl: this.proxy_url,
    //   urlPrefix: this.sdwis_service_base_url
    // })

    // ---- layers controlled by settings now
    // facilities
    // this.featureLayer = new FeatureLayer({
    //   url: `${this.sdwis_service_base_url}/FeatureServer/5`,
    //   outFields: ['*']
    // })
    // public water systems
    // this.featureLayerPWS = new FeatureLayer({
    //   url: `${this.sdwis_service_base_url}/FeatureServer/3`,
    //   outFields: ['*']
    // })

    // // pws primary agencies - TABLE
    // this.featureLayerTable = new FeatureLayer({
    //   url: `${this.sdwis_service_base_url}/FeatureServer/9`,
    //   outFields: ['*']
    // })
    // // Admin contacts - TABLE
    // this.featureLayerAdmin = new FeatureLayer({
    //   url: `${this.sdwis_service_base_url}/FeatureServer/7`,
    //   outFields: ['*']
    // })

    if ([this.featureLayer, this.featureLayerPWS, this.featureLayerAdmin, this.featureLayerTable].every(l => l)) {
      this.configured = true;
      this.loading = true;

      this.featureLayer.on('layerview-create-error', (e) => {
        this.loading = false
        this.onOpenText = []
        this.onOpenText.push(
          <div>
            The R9 SDWIS service resides on the EPA Intranet. Connect to the Pulse Secure client to access the
            data.
          </div>
        )
        this.setState({
          loading: this.loading,
          onOpenText: this.onOpenText
        })
      })
    }

    this.symbol = new SimpleMarkerSymbol()

    listenForViewVisibilityChanges(this.props.id, this.updateVisibility)
  }

  updateVisibility = (visible) => this.setState({visible})

  onActiveViewChange = (jmv: JimuMapView) => {
    this.jmv = jmv
    if (jmv) {
      this.setState({
        jimuMapView: jmv
      })
    }
  }

  componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView }>, snapshot?: any) {
    let widgetState: WidgetState
    widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state
    // do anything on open/close of widget here
    if (this.jmv && this.configured) {
      if (widgetState == WidgetState.Opened || this.state?.visible === true) {
        if (this.first) {
          this.loading = true
          this.featureLayer.visible = true
          this.featureLayerPWS.visible = true
          // if (this.featureLayer.loaded) {
          const query = new Query()
          query.where = '1=1'
          this.featureLayer.queryFeatureCount(query).then(count => {
            this.onOpenText.push(
              <div>
                There are currently <b>{count}</b> facilities in the SDWIS feature service.<br/>
                <b><i>This data is scale-dependent, please zoom in to see the points.</i></b><h4
                style={{textDecoration: 'underline'}}>Safe Drinking Water Information System
                (SDWIS)</h4>
                The data is directly from the <b>National SDWIS Database</b> and updated on a quarterly
                basis. The service provides information on facilities, public water systems, primacy
                agencies, administrative contacts, and tribal entities. The facility symbols
                are <i>clustered</i> to minimize overlap; zoom in closer to see a facility's true
                location. Detailed information about the <b>SDWIS Federal Reporting Services</b> can be
                found <b>
                <a
                  href={'https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting'}
                  target="_blank"> here.</a></b>
                <h4 style={{textDecoration: 'underline'}}>Enforcement & Compliance History Online
                  (ECHO)</h4>EPA's ECHO website provides details for facilities in your community to
                assess their compliance with environmental regulations. The interaction in this widget
                uses the Public Water System (PWS) ID to search the records. Check out the ECHO
                website <a href={'https://echo.epa.gov/'} target="_blank"><b>here</b></a> for more
                information and guidance.<br/>
                The <i><b>ECHO Detailed System Report</b></i> is linked with the selected facility
                record and opens the ECHO website details for the associated public water system in a
                new browser window. <h4 style={{textDecoration: 'underline'}}>Definitions</h4><b>Facilities
                - </b>These points represent facilities within a public water system. The facility types
                include but are not limited to wells, well heads, treatment plants, sampling stations,
                valves, transmission mains, pumps, pressure control, etc. Facilities are identified with
                Facility ID and Facility Name. The PWS ID indicates the public water system the selected
                facility falls under.<br/>
                <img id="Legend" src={`${this.props.context.folderUrl}dist/runtime/assets/Symbology.png`}
                     style={{width: '75%', height: '75%'}}/><br/>
                <b>Public Water Systems (PWS) - </b> The public water system information is linked from
                the facility selected in the map. The PWS ID and PWS Name provide the unique
                identification for the public water system associated with the facility record.<br/>
                <br/>
                <table style={{
                  borderColor: '#000000',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  width: '100%'
                }}>
                  <tbody>
                  <td style={{textAlign: 'left', width: '287px'}}>
                    <b>PWS Contact Information - </b>This
                    section provides contact information for the public water system associated with
                    the selected facility. This information comes from the Admin Contacts
                    table.<br/>
                  </td>
                  </tbody>
                </table>
                <table style={{
                  height: '98px',
                  borderColor: '#000000',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  width: '100%'
                }}>
                  <tbody>
                  <td style={{textAlign: 'left', width: '287px'}}><b>Regulatory Agency - </b> This
                    section provides information for the regulatory organization associated with and
                    responsible for the selected facility's public water system. This information
                    comes from the Primacy Agency table." + "<br/></td>
                  </tbody>
                </table>
              </div>
            )
            this.loading = false
            this.setState({
              onOpenText: this.onOpenText,
              loading: this.loading
            }, () => {
              this.LandingText()
            })
          })
          this.mapClickHandler = this.jmv.view.on('click', event => {
            this.mapClick(event)
          })
          this.jmv.view.map.layers.add(this.featureLayer)
          this.jmv.view.map.layers.add(this.featureLayerPWS)
          // }
        }
        this.first = false
      } else {
        this.first = true
        this.featureLayer.visible = false
        this.featureLayerPWS.visible = false
        this.mainText = true
        this.loading = false
        this.rows = []
        this.sortedRows = []
        if (this.mapClickHandler) {
          this.mapClickHandler.remove()
        }
        // remove graphics on close
        this.jmv.view.graphics.removeAll()
        this.jmv.view.map.layers.remove(this.featureLayer)
        this.jmv.view.map.layers.remove(this.featureLayerPWS)
      }
    }
  }

  LandingText = () => {
    if (this.mainText) {
      return (
        <div id="landingText" style={{overflow: 'auto'}}>
          {this.onOpenText}
        </div>
      )
    } else {
      return null
    }
  }


  mapClick = (e) => {
    this.mainText = false
    this.loading = true
    this.rows = []
    this.sortedRows = []
    this.multipleLocations = false
    this.setState({
      loading: this.loading,
      rows: this.rows,
      sortedRows: this.sortedRows,
      facility: null,
      nothingThere: false
    })

    this.jmv.view.graphics.removeAll()
    const pixelWidth = this.jmv.view.extent.width / this.jmv.view.width
    const toleraceInMapCoords = 10 * pixelWidth
    const clickExtent = new Extent({
      xmin: e.mapPoint.x - toleraceInMapCoords,
      ymin: e.mapPoint.y - toleraceInMapCoords,
      xmax: e.mapPoint.x + toleraceInMapCoords,
      ymax: e.mapPoint.y + toleraceInMapCoords,
      spatialReference: this.jmv.view.spatialReference
    })

    const featureQuery = new Query()
    featureQuery.outFields = ['*']
    featureQuery.geometry = clickExtent
    featureQuery.returnGeometry = true
    this.featureLayer.queryFeatures(featureQuery).then(featureSet => {
      this.featureSet = featureSet.features
      if (this.featureSet.length === 1) {
        this.loadFacility(this.featureSet[0])
      } else if (this.featureSet.length > 1) {
        const data = []

        this.featureSet.forEach((feature) => {
          const attrs = feature.attributes
          data.push(attrs)
        })

        this.columns = [{key: 'facilityname', name: 'Name'}]
        this.rows = data
        this.sortedRows = data
        this.multipleLocations = true

        // this.Grid()
        this.loading = false
        this.setState({
          columns: this.columns,
          rows: this.rows,
          sortedRows: this.sortedRows,
          loading: this.loading,
          nothingThere: false
        })
      } else {
        this.loading = false
        this.setState({
          nothingThere: true,
          loading: this.loading
        })
      }
    })
  }

  rowKeyGetter(row) {
    return row
  }

  rowClick(row) {
    const location = this.featureSet.filter((feature) => {
      return feature.attributes.OBJECTID === this.sortedRows[row].OBJECTID
    })
    this.multipleLocations = false;
    this.loadFacility(location[0])
  }

  Grid = () => {
    return (
      <div>
        <div>
          <div><h3>Multiple Facilities at that Location</h3><br/><h5>Select one to
            continue</h5></div>
          <DataGrid style={{
            height: `${(this.sortedRows.length * 35) + 37}px`,
            maxHeight: '700px',
            backgroundColor: 'white'
          }}
                    className={'rdg-light'}
                    columns={this.columns} rows={this.sortedRows}
                    onRowClick={this.rowClick}
                    rowKeyGetter={this.rowKeyGetter} defaultColumnOptions={{
            sortable: true,
            resizable: true
          }} onSortColumnsChange={this.onSortColsChange}
                    sortColumns={this.sortColumns}/>
        </div>
      </div>
    )
  }

  onSortColsChange(cols) {
    if (cols.length === 0) {
      this.sortedRows = this.rows
      this.sortColumns = []
      this.setState({
        sortedRows: this.sortedRows,
        sortColumns: this.sortColumns
      })
      return this.rows
    }

    this.sortColumns = cols.slice(-1)
    this.sortedRows = [...this.rows]
    this.sortedRows.sort((a, b) => {
      for (const col of cols) {
        const comparator = getComparator(col.columnKey)
        const res = comparator(a, b)
        if (res !== 0) {
          return col.direction === 'ASC' ? res : -res
        }
      }
      return 0
    })

    // this.rows = sortedRows;
    this.setState({
      sortedRows: this.sortedRows,
      sortColumns: this.sortColumns
      // columns: this.columns,
    })
    return this.sortedRows
  }

  loadFacility = (facility) => {
    const selectedGraphic = new Graphic({geometry: facility.geometry, symbol: this.symbol})
    this.jmv.view.graphics.add(selectedGraphic)
    this.loading = false
    this.setState({
      facility,
      loading: false
    })
  }


  render() {
    return (
      <div className="widget-addLayers jimu-widget p-2"
           style={{overflow: 'auto', height: '97%'}}>
        {
          (!this.props.useMapWidgetIds?.length || !this.configured)
            ? <h2>Please complete widget configuration.</h2>
            : null
        }

        {this.loading ? <Loading type='SECONDARY'/> : null}

        {this.state?.facility
          ? <Facility facility={this.state.facility}
                      featureLayer={this.featureLayer}
                      featureLayerPWS={this.featureLayerPWS}
                      featureLayerAdmin={this.featureLayerAdmin}
                      featureLayerTable={this.featureLayerTable}></Facility>
          : null
        }

        {this.state?.nothingThere
          ? <div>
            <h3>
              <div>No facilities found at this location</div>
            </h3>
            <br/>
          </div>
          : null
        }

        {this.multipleLocations ? <this.Grid /> : null}

        {this.mainText ? this.LandingText() : null}

        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                              onActiveViewChange={this.onActiveViewChange} />

        <DataSourceComponent useDataSource={this.props.facilitiesDataSource?.[0]}
                             onDataSourceCreated={l => this.featureLayer = l.layer} />

        <DataSourceComponent useDataSource={this.props.pwsDataSource?.[0]}
                             onDataSourceCreated={l => this.featureLayerPWS = l.layer} />

        <DataSourceComponent useDataSource={this.props.agenciesDataSource?.[0]}
                             onDataSourceCreated={l => this.featureLayerTable = l.layer} />

        <DataSourceComponent useDataSource={this.props.contactsDataSource?.[0]}
                             onDataSourceCreated={l => this.featureLayerAdmin = l.layer} />
      </div>
    )
  }
}
