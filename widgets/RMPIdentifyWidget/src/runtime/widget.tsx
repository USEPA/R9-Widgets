/** @jsx jsx */
import './assets/style.css'
import {
  React,
  AllWidgetProps,
  BaseWidget,
  css,
  getAppStore,
  jsx,
  WidgetState,
  DataSourceManager,
  DataSourceComponent
} from 'jimu-core'
import {IMConfig} from '../config'
import {JimuMapView, JimuMapViewComponent} from 'jimu-arcgis'
import MapImageLayer from 'esri/layers/MapImageLayer'
import DataGrid, {SelectColumn} from 'react-data-grid'
import Query from 'esri/rest/support/Query'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import Extent from 'esri/geometry/Extent'
import RelationshipQuery from 'esri/rest/support/RelationshipQuery'
import Graphic from 'esri/Graphic'
import FeatureLayer from 'esri/layers/FeatureLayer'
import moment from 'Moment'
import {Button, Modal, ModalBody, ModalFooter, ModalHeader, Loading} from 'jimu-ui'
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol'
import type {Column, SortColumn} from 'react-data-grid'
import LandingText from './LandingText';
import ExecModal from './ExecModal';
import Facility from './Facility';
import {getViewIDs, visibilityChanged} from '../../../shared';

interface Row {
}

function getComparator(sortColumn: string) {
  switch (sortColumn) {
    case 'FacilityName':
      return (a, b) => {
        return a[sortColumn].localeCompare(b[sortColumn])
      }
    case 'CompletionCheckDate':
      return (a, b) => {
        // @ts-expect-error
        return new Date(a[sortColumn]) - new Date(b[sortColumn])
      }
    default:
      throw new Error(`unsupported sortColumn: "${sortColumn}"`)
  }
}

interface State {
  rmpFacilityLayer: FeatureLayer | MapImageLayer
  rmpParentLayer: FeatureLayer | MapImageLayer
  jimuMapView: JimuMapView
  landingText: string
  mainText: boolean
  mapIdNode: any
  columns: any
  rows: any
  rmpGridClick: boolean
  attributes: any
  erTextAttr: any
  location_string: any[]
  facilityStatus: any[]
  accidentText: any[]
  processText: any[]
  process: any
  naicsText: any
  accidentChems: any
  nothingThere: any[]
  openModal: boolean
  executiveSummaryText: any[]
  multipleLocations: boolean
  loading: boolean
  sortColumns: SortColumn[]
  sortedRows: any[]
  refreshDate: any[]
  visible: boolean
}

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, State> {
  symbol: any = new SimpleMarkerSymbol({color: 'yellow', style: 'diamond'});
  mainText: boolean = true;
  first: boolean = true;
  r9Geom: any;
  graphicsLayer: GraphicsLayer;
  facilities: any;
  currentFacility: any;
  tblS1Facilities: any;
  // baseurl = 'https://utility.arcgis.com/usrsvcs/servers/a9dda0a4ba0a433992ce3bdffd89d35a/rest/services/SharedServices/RMPFacilities/MapServer';
  multipleRMPs: boolean = false;
  tblS1Processes: any;
  tblS9EmergencyResponses: any;
  ExecutiveSummaries: any;
  attributes: any;
  columns: Array<Column<Row>> = [];
  rows: any[] = [];
  showGrid: boolean = false;
  featureSet: any;
  rmpGridClick: boolean = false;
  erTextAttr: any;
  location_string: any[] = [];
  facilityStatus: any[] = [];
  tblS6AccidentHistory: any;
  accidentText: any[] = [];
  AccidentChemicals: any;
  tblS6AccidentChemicals: any;
  tblS6FlammableMixtureChemicals: any;
  AccidentFlamMixChem: any;
  processText: any[] = [];
  tblS1Process_NAICS: any;
  tblS1ProcessChemicals: any;
  tlkpChemicals: any;
  tblS1FlammableMixtureChemicals: any;
  FlammableChemicals: any;
  process: any;
  naicsText: any;
  accidentChems: any[] = [];
  nothingThere: any[] = [];
  openModal: boolean = false;
  executiveSummaryText: any[] = [];
  multipleLocations: boolean = false;
  status_string: string;
  sortedRows: any[] = [];
  loading: boolean = false;
  rowCopy: any[] = [];
  sortColumns: SortColumn[] = [];
  refreshDate: any[] = [];
  rmpVisibleOnOpen: boolean = false;
  currentPopup: any;
  viewIds = new Set();

  constructor(props) {
    super(props)
    this.mainText = true
  }

  componentDidMount() {
    this.setState({
      loading: true
    })
    // const i = DataSourceManager.getInstance().getDataSource(this.props.useDataSources[0].dataSourceId)

    // let addedToMap: boolean

    // if it isn't there add it
    // if (this.rmpLayer == undefined) {
    //   addedToMap = false
    //   this.rmpLayer = new MapImageLayer({
    //     url: 'https://utility.arcgis.com/usrsvcs/servers/a9dda0a4ba0a433992ce3bdffd89d35a/rest/services/SharedServices/RMPFacilities/MapServer'
    //   })
    // } else {
    //   addedToMap = true
    // }
    const appStore = getAppStore();
    this.viewIds = getViewIDs(appStore.getState(), this.props.id)
    if (visibilityChanged(appStore.getState(), this.state?.visible === true, this.viewIds)) {
      this.setState({visible: !(this.state?.visible === true)})
    }
    appStore.subscribe(() => {
      const s = getAppStore().getState();
      if (visibilityChanged(s, this.state.visible, this.viewIds)) {
        this.setState({visible: !this.state.visible})
      }
    })

    this.openModal = false
  }

  initRMP() {
    // this.state.().then((res) => {
    this.state.rmpParentLayer.sublayers.forEach(lyr => {
      if (lyr.id === parseInt(this.state.rmpFacilityLayer.id, 10)) {
        lyr.createFeatureLayer().then((res) => {
          res.load()
          res.when(() => {
            this.loadRelated(res)
            this.facilities = res
          })
        })
      } else {
        lyr.createFeatureLayer().then((res) => {
          res.load()
          res.when(() => {
            this.loadRelated(res)
          })
        })
      }
    })

    const statusLayer = new FeatureLayer({url: this.state.rmpParentLayer.url + '/14', outFields: ['*']})
    const statusQuery = new Query()
    statusQuery.outFields = ['*']
    statusQuery.where = "OBJECTID Like'%'"
    statusLayer.queryFeatures(statusQuery).then(featureSet => {
      const refreshDate = moment(featureSet.features[0].attributes.DateRefreshed).utc().toISOString().split('T')[0]

      if (refreshDate !== undefined || refreshDate !== '') {
        this.refreshDate.push(<p>RMP Refresh Date: {refreshDate}</p>)
      }

      this.setState({
        refreshDate: this.refreshDate,
        loading: false
      })
    })
    // })
  }

  onActiveViewChange = (jmv: JimuMapView) => {
    if (jmv) {
      this.setState({
        jimuMapView: jmv
      })
    }
  }

  loadRelated(obj) {
    obj.relationships.forEach((relationship) => {
      if (relationship.role === 'origin') {
        this[relationship.name] = new FeatureLayer({url: this.state.rmpParentLayer.url + '/' + relationship.relatedTableId})
        this[relationship.name].relationshipId = relationship.id
        this[relationship.name].load().then((e) => {
          this[relationship.name] = e
          if (this[relationship.name].relationships.length > 0) {
            this.loadRelated(this[relationship.name])
          }
        })
      }
    })
  };


  componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView, landingText: string }>, snapshot?: any) {
    let widgetState: WidgetState
    widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state


    // do anything on open/close of widget here
    if ((widgetState === WidgetState.Opened || this.state?.visible === true)
      && this.state.jimuMapView && this.state.rmpFacilityLayer) {
      if (this.first) {
        // this.rmpLayer = this.state.jimuMapView.view.map.layers.find(lyr => {
        //   return lyr.id === this.state.rmpFacilityLayer.id
        // })
        // this.graphicsLayer = new GraphicsLayer({
        //   listMode: 'hide'
        // })
        // this.state.jimuMapView.view.map.add(this.graphicsLayer)
        // get/set visibility of map layers
        this.rmpVisibleOnOpen = this.state.rmpParentLayer.visible
        this.state.rmpParentLayer.visible = true
        this.state.rmpFacilityLayer.visible = true

        this.mainText = true
        this.nothingThere = []
        this.setState({
          loading: false,
          mainText: this.mainText,
          nothingThere: this.nothingThere,
        })
        // this.state.jimuMapView.view.map.layers.push(this.graphicsLayer);
        this.initRMP();
        this.currentPopup = this.state.jimuMapView.view.popup;
        this.state.jimuMapView.view.popup = null;
      }
      this.first = false
    }

    if (widgetState === WidgetState.Closed || this.state.visible === false) {
      this.state.rmpParentLayer.visible = this.rmpVisibleOnOpen
      this.state.rmpFacilityLayer.visible = this.rmpVisibleOnOpen
      this.first = true
      // this.state.jimuMapView.view.map.layers.remove(this.graphicsLayer)
      this.state.jimuMapView.view.popup = this.currentPopup
    }

    if (this.state.jimuMapView && prevState?.jimuMapView === undefined && this.state.rmpFacilityLayer) {
      this.state.jimuMapView.view.on('click', event => {
        this.mapClick(event)
      })
      this.state.jimuMapView.view.map.add(this.state.rmpFacilityLayer)
    }
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
  //         console.dir(appState.appConfig)
  //         return arbitraryFirstMapWidgetInfo.id;
  //     }
  // }


  Process = () => {
    if (this.processText.length > 0 && !this.multipleRMPs) {
      return (
        <div>
          <h3 style={{textDecoration: 'underline'}}>Processes</h3>
          <div style={{width: '100%'}} id="processes">
            <div>
              <b>Name: {this.process.attributes.AltID ? this.process.attributes.AltID : 'not reported'}</b>
            </div>
            <div>Description(s): {this.naicsText}</div>
            <div><span>Program Level: {this.process.attributes.ProgramLevel}</span></div>
            <table>
              <tbody>
              <tr>
                <th colSpan={2}>Chemical</th>
                <th>Quantity (lbs)</th>
              </tr>
              {this.processText}
              </tbody>
            </table>
          </div>
        </div>
      )
    } else {
      return null
    }
  }

  Accidents = () => {
    if (this.accidentText.length > 0 && !this.multipleRMPs) {
      return (
        <div>
          <h3 style={{textDecoration: 'underline'}}>Accidents</h3>
          <div style={{width: '100%'}} id="accidents">
            {this.accidentText}
            <table>
              <tbody>
              {this.accidentChems}
              </tbody>
            </table>
          </div>
          <br/>
        </div>
      )
    } else {
      return null
    }
  }

  EmerRespPlan = () => {
    if (this.erTextAttr) {
      return (
        <div>
          <h3 style={{textDecoration: 'underline'}}>Emergency Reponse Plan</h3>
          <table>
            <tbody id="er_plan_table">
            <tr>
              <td>Is facility included in written community ER plan?</td>
              <td>{this.erTextAttr.attributes.ER_CommunityPlan ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td>Does facility have its own written ER plan?</td>
              <td>{this.erTextAttr.attributes.ER_FacilityPlan ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={2}><b>Does facility's ER plan include ...</b></td>
            </tr>
            <tr>
              <td className="nested">specific actions to be take in response to accidental release of
                regulated substance(s)?
              </td>
              <td>{this.erTextAttr.attributes.ER_ResponseActions ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="nested">procedures for informing the public and local agencies responding to
                accident releases?
              </td>
              <td>{this.erTextAttr.attributes.ER_PublicInfoProcedures ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="nested">information on emergency health care?</td>
              <td>{this.erTextAttr.attributes.ER_EmergencyHealthCare ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td></td>
            </tr>
            <tr>
              <td colSpan={2}><b>Date of most recent ...</b></td>
            </tr>
            <tr>
              <td colSpan={2} className="nested">review or update of facility's ER
                plan? {this.erTextAttr.attributes.ER_ReviewDate ? moment(this.erTextAttr.attributes.ER_ReviewDate).toISOString().split('T')[0] : 'Not Reported'} </td>
            </tr>
            <tr>
              <td></td>
            </tr>
            <tr>
              <td colSpan={2}><b>Local agency with which facility's ER plan ore response activities are
                coordinated</b></td>
            </tr>
            <tr>
              <td colSpan={2}
                  className="nested">Name: {this.erTextAttr.attributes.CoordinatingAgencyName ? this.erTextAttr.attributes.CoordinatingAgencyName : 'Not Reported'}
                <br/>Number: {this.erTextAttr.attributes.CoordinatingAgencyPhone ? this.erTextAttr.attributes.CoordinatingAgencyPhone : 'Not Reported'}
              </td>
            </tr>
            <tr>
              <td colSpan={2}></td>
            </tr>
            <tr>
              <td colSpan={2}><b>Subject to ...</b></td>
            </tr>
            <tr>
              <td className="nested">OSHA Regulations at 29 CFR 1910.38?</td>
              <td>{this.erTextAttr.attributes.FR_OSHA1910_38 ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="nested">OSHA Regulations at 29 CFR 1910.120?</td>
              <td>{this.erTextAttr.attributes.FR_OSHA1910_120 ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="nested">Clean Water Act Regulations at 40 CFR 112?</td>
              <td>{this.erTextAttr.attributes.FR_SPCC ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="nested">RCRA Regulations at 40 CFR 264, 265, and 279.52?</td>
              <td>{this.erTextAttr.attributes.FR_RCRA ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="nested">OPA 90 Regulations at 40 CFR 112, 33 CFR 154, 49 CFR 194, or 30 CFR
                254?
              </td>
              <td>{this.erTextAttr.attributes.FR_OPA90 ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="nested">State EPCRA Rules or Laws?</td>
              <td>{this.erTextAttr.attributes.FR_EPCRA ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td colSpan={2}
                  style={{paddingLeft: '10px'}}>Other: {this.erTextAttr.attributes.FR_OtherRegulation}</td>
            </tr>
            </tbody>
          </table>
          <br/>
        </div>
      )
    } else {
      return null
    }
  }

  NothingFound = () => {
    if (this.nothingThere.length > 0) {
      return (<h2>{this.nothingThere}</h2>)
    } else {
      return null
    }
  }

  backLink = (destination: string) => () => {
    if (destination === 'rmps') {
      this.multipleRMPs = true
      this.multipleLocations = false
      this.attributes = undefined
      this.erTextAttr = undefined
      this.setState({
        attributes: this.attributes,
        erTextAttr: this.erTextAttr
      })
      this.loadRMPs(this.currentFacility)
    }
  }

  LocationMetadata = () => {
    if (this.location_string.length > 0 && this.multipleRMPs) {
      return (
        <div>
          <div><h3 style={{textDecoration: 'underline'}}>Location Metadata</h3><br/></div>
          {this.location_string}
        </div>
      )
    } else {
      return null
    }
  }

  mapClick = (e) => {
    // clear it all
    this.multipleRMPs = false
    this.multipleLocations = false
    this.rmpGridClick = false
    this.processText = []
    this.accidentText = []
    this.naicsText = []
    this.mainText = false
    this.location_string = []
    this.erTextAttr = undefined
    this.attributes = undefined
    this.nothingThere = []
    this.accidentChems = []
    this.setState({
      rmpGridClick: this.rmpGridClick,
      processText: this.processText,
      accidentText: this.accidentText,
      naicsText: this.naicsText,
      mainText: this.mainText,
      location_string: this.location_string,
      erTextAttr: this.erTextAttr,
      attributes: this.attributes,
      nothingThere: this.nothingThere,
      loading: true,
      accidentChems: this.accidentChems
    })

    this.state.jimuMapView.view.graphics.removeAll()
    const pixelWidth = this.state.jimuMapView.view.extent.width / this.state.jimuMapView.view.width
    const toleraceInMapCoords = 10 * pixelWidth
    const clickExtent = new Extent({
      xmin: e.mapPoint.x - toleraceInMapCoords,
      ymin: e.mapPoint.y - toleraceInMapCoords,
      xmax: e.mapPoint.x + toleraceInMapCoords,
      ymax: e.mapPoint.y + toleraceInMapCoords,
      spatialReference: this.state.jimuMapView.view.spatialReference
    })

    const featureQuery = new Query()
    featureQuery.outFields = ['*']
    featureQuery.geometry = clickExtent
    featureQuery.returnGeometry = true

    this.facilities.queryFeatures(featureQuery).then(featureSet => {
      this.featureSet = featureSet.features

      if (this.featureSet.length === 1) {
        this.loadRMPs(this.featureSet[0])

        // noneFound.push(false);
      } else if (this.featureSet.length > 1) {
        // mapIdNode.innerHTML = '<h3>Multiple Facilities at that location</h3><br/><h5>Select one to continue</h5>' +
        //   '<div id="gridDiv" style="width:100%;"></div>';
        const data = []

        this.featureSet.forEach((feature) => {
          // let attrs = dojo.mixin({}, feature.attributes);
          const attrs = feature.attributes
          data.push(attrs)
        })
        this.columns = [{key: 'FacilityName', name: 'Name'}]
        data.sort(getComparator('FacilityName'))
        this.rows = data
        this.sortedRows = data
        this.multipleLocations = true
        this.multipleRMPs = false
        this.setState({
          columns: this.columns,
          rows: this.rows,
          sortedRows: this.sortedRows
          // multipleLocations: this.multipleLocations,
          // multipleRMPs: this.multipleRMPs,
        })

        this.Grid()
        this.setState({
          loading: false
        })
      } else {
        this.nothingThere = [<div>No facilities found at this location</div>]
        this.setState({
          nothingThere: this.nothingThere,
          loading: false
        })
      }
    })
  }

  rowKeyGetter = (row) => {
    return row
  }

  rowClick = (row) => {
    const facility = this.featureSet.filter((feature) => {
      return feature.attributes.OBJECTID === this.rows[row].OBJECTID
    })
    if (this.rmpGridClick) {
      this.multipleRMPs = false
      this.loadFeature(facility[0])
    } else {
      this.loadRMPs(facility[0])
    }
  }

  Grid = () => {
    if (this.multipleLocations || this.multipleRMPs) {
      return (
        <div>
          {this.multipleLocations
            ? <h3>Multiple Facilities at that Location <br/>
            </h3>
            : this.multipleRMPs
              ? <h3>Multiple RMPs Found for {this.attributes.FacilityName} <h4 id="facilityStatus">
                {this.facilityStatus}
              </h4><br/></h3>
              : null}
          <h5>Select one to continue</h5>
          <DataGrid style={{height: `${(this.rows.length * 35) + 37}px`, maxHeight: '700px', backgroundColor: 'white'}}
                    columns={this.columns} rows={this.sortedRows} onRowClick={this.rowClick} className={'rdg-light'}
                    rowKeyGetter={this.rowKeyGetter} defaultColumnOptions={{
            sortable: true,
            resizable: true
          }} onSortColumnsChange={this.onSortColsChange} sortColumns={this.sortColumns}/>
        </div>
      )
    } else {
      return null
    }
  }

  onSortColsChange = (cols) => {
    if (cols.length === 0) {
      this.sortedRows = this.rows
      this.sortColumns = []
      this.setState({
        sortedRows: this.sortedRows,
        sortColumns: this.sortColumns
      })
      return
    }

    this.sortColumns = cols.slice(-1)

    this.sortedRows = [...this.rows]
    this.sortedRows.sort((a, b) => {
      for (const col of cols) {
        const comparator = getComparator(col.columnKey)
        const res = comparator(a, b)
        if (res !== 0) {
          // if (col.direction === 'ASC') {
          return col.direction === 'ASC' ? res : -res
          //     return res;
          // } else if (col.direction === 'DESC') {
          //     return -res;
          // }
        }
      }
      return 0
    })

    // this.rows = sortedRows;
    this.setState({
      sortedRows: this.sortedRows,
      sortColumns: this.sortColumns
    })
    return this.sortedRows
  }

  loadRMPs(feature) {
    this.setState({
      loading: true
    })

    this.multipleLocations = false
    this.currentFacility = feature
    // this.loadingShelter.show();
    const attributes = feature.attributes
    this.attributes = attributes

    const selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol})

    this.state.jimuMapView.view.graphics.add(selectedGraphic)

    const rmpQuery = new RelationshipQuery()
    rmpQuery.outFields = ['*']
    rmpQuery.objectIds = [attributes.OBJECTID]
    rmpQuery.orderByFields = ['CompletionCheckDate DESC'] //doesn't appear to work
    rmpQuery.relationshipId = this.tblS1Facilities.relationshipId
    rmpQuery.returnGeometry = true
    this.facilities.queryRelatedFeatures(rmpQuery).then((e) => {
        const features = e[attributes.OBJECTID].features
        this.featureSet = features
        if (features.length === 1) {
          this.multipleRMPs = false
          this.loadFeature(features[0])
        } else {
          this.multipleRMPs = true
          // hide the landing text
          this.mainText = false
          this.setState({
            mainText: this.mainText
          })

          const data = []

          features.forEach((feature) => {
            feature.attributes.CompletionCheckDate = moment(feature.attributes.CompletionCheckDate).utc().toISOString().split('T')[0]
            const attrs = feature.attributes
            data.push(attrs)
          })

          this.columns = [
            {key: 'FacilityName', name: 'Name'},
            {key: 'CompletionCheckDate', name: 'Date'}
          ]

          // sort array to list is in descending order by date on load
          data.sort(getComparator('CompletionCheckDate')).reverse()
          this.rows = data
          this.sortedRows = data
          this.showGrid = true
          this.rmpGridClick = true
          this.setState({
            columns: this.columns,
            rows: this.rows,
            sortedRows: this.sortedRows,
            rmpGridClick: this.rmpGridClick
          })

          //get most recent record to display deregistration status
          let mostRecentRMP = features[0].attributes
          features.forEach((feature) => {
            if (feature.attributes.CompletionCheckDate > mostRecentRMP.CompletionCheckDate) {
              mostRecentRMP = feature.attributes
            }
          })

          let status, reason, date
          if (mostRecentRMP.DeRegistrationEffectiveDate) {
            status = 'De-registered'
            reason = (mostRecentRMP.DeregistrationReasonCode !== '04'
              ? this.tblS1Facilities.getFieldDomain('DeregistrationReasonCode').getName(mostRecentRMP.DeregistrationReasonCode)
              : mostRecentRMP.DeregistrationReasonOtherText)
            date = mostRecentRMP.DeRegistrationEffectiveDate
          } else {
            status = 'Active'
          }

          if (attributes && Object.keys(attributes).length > 0) {
            this.Grid()
          }

          this.facilityStatus = []
          this.facilityStatus.push(
            <div>
              Facility
              Status: {status} {reason ? '<br/>De-registration Reason: ' + reason : ''} {date ? '<br/>De-registration Effective Date: ' + moment(date).toISOString().split('T')[0] : ''}
            </div>
          )

          this.location_string = []
          if (mostRecentRMP.ValidLatLongFlag) {
            this.location_string.push(<div>RMP Validated Location Used
              <br/>Description: {this.tblS1Facilities.getFieldDomain('LatLongDescription').getName(mostRecentRMP.LatLongDescription)}
              <br/>Method: {this.tblS1Facilities.getFieldDomain('LatLongMethod').getName(mostRecentRMP.LatLongMethod)}
            </div>)
          } else if (!mostRecentRMP.ValidLatLongFlag && mostRecentRMP.FRS_Lat !== undefined && mostRecentRMP.FRS_long !== undefined) {
            this.location_string.push(<div>FRS Location Used
              <br/>Description: {this.tblS1Facilities.getFieldDomain('FRS_Description').getName(mostRecentRMP.FRS_Description)}
              <br/>Method: {this.tblS1Facilities.getFieldDomain('FRS_Method').getName(mostRecentRMP.FRS_Method)}
            </div>)
          } else {
            this.location_string.push(<div>Location Not Validated
              <br/>Description: {this.tblS1Facilities.getFieldDomain('LatLongDescription').getName(mostRecentRMP.LatLongDescription)}
              <br/>Method: {this.tblS1Facilities.getFieldDomain('LatLongMethod').getName(mostRecentRMP.LatLongMethod)}
            </div>)
          }

          if (mostRecentRMP.HorizontalAccMeasure) {
            const scale = <div><br/> Source Map Scale: {mostRecentRMP.SourceMapScaleNumber}</div>
            this.location_string.push(<div><br/>Horizontal Accuracy (m): {mostRecentRMP.HorizontalAccMeasure}
              <br/>Horizontal
              Datum: {this.tblS1Facilities.getFieldDomain('HorizontalRefDatumCode').getName(mostRecentRMP.HorizontalRefDatumCode)} {mostRecentRMP.SourceMapScaleNumber ? scale : ''}
            </div>)
          }

          this.setState({
            location_string: this.location_string,
            facilityStatus: this.facilityStatus,
            loading: false
          })
        }
      }
    )
  }

  loadFeature(feature) {
    this.setState({
      loading: true
    })
    const promises = []
    this.erTextAttr = undefined
    this.attributes = feature.attributes
    const attributes = this.attributes
    const selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol})
    this.state.jimuMapView.view.graphics.add(selectedGraphic)

    if (this.attributes && Object.keys(this.attributes).length > 0) {
      this.setState({
        attributes: this.attributes
      })
    }

    const executiveSummaryQuery = new RelationshipQuery()
    executiveSummaryQuery.outFields = ['*']
    executiveSummaryQuery.relationshipId = this.ExecutiveSummaries.relationshipId
    executiveSummaryQuery.objectIds = [this.attributes.OBJECTID]
    this.executiveSummaryText = []
    const executivePromise = this.tblS1Facilities.queryRelatedFeatures(executiveSummaryQuery).then((e) => {
      const summary = ''
      const summary_parts = e[this.attributes.OBJECTID].features.sort(function (obj1, obj2) {
        return obj1.attributes.ESSeqNum - obj2.attributes.ESSeqNum
      })
      summary_parts.forEach((summary_part) => {
        const regex = /(?:\r\n|\r|\n)/g
        const textArr = summary_part.attributes.SummaryText.split(regex)
        textArr.map(str => {
          this.executiveSummaryText.push(<div>{str}<br/></div>)
        })
      })
      this.setState({
        executiveSummaryText: this.executiveSummaryText
      })
    })

    promises.push(executivePromise)

    const processQuery = new RelationshipQuery()
    processQuery.outFields = ['*']
    processQuery.relationshipId = this.tblS1Processes.relationshipId
    processQuery.objectIds = [this.attributes.OBJECTID]
    const facilitiesPromise = this.tblS1Facilities.queryRelatedFeatures(processQuery).then((featureSet) => {
      featureSet[this.attributes.OBJECTID].features.forEach((process) => {
        const naicsQuery = new RelationshipQuery()
        naicsQuery.outFields = ['*']
        naicsQuery.relationshipId = this.tblS1Process_NAICS.relationshipId
        naicsQuery.objectIds = [process.attributes.OBJECTID]
        this.naicsText = []
        this.tblS1Processes.queryRelatedFeatures(naicsQuery).then(naicsCodes => {
          naicsCodes[process.attributes.OBJECTID].features.forEach((naics, i) => {
            this.naicsText.push(
              <div>{this.tblS1Process_NAICS.getFieldDomain('NAICSCode').getName(naics.attributes.NAICSCode)}</div>)
          })
        })

        const processChemicalsQuery = new RelationshipQuery()
        processChemicalsQuery.outFields = ['*']
        processChemicalsQuery.relationshipId = this.tblS1ProcessChemicals.relationshipId
        processChemicalsQuery.objectIds = [process.attributes.OBJECTID]

        this.tblS1Processes.queryRelatedFeatures(processChemicalsQuery).then(e => {
          e[process.attributes.OBJECTID].features.forEach((processChemical) => {
            const chemicalQuery = new RelationshipQuery()

            chemicalQuery.outFields = ['*']
            chemicalQuery.relationshipId = this.tlkpChemicals.relationshipId
            chemicalQuery.objectIds = [processChemical.attributes.OBJECTID]

            this.tblS1ProcessChemicals.queryRelatedFeatures(chemicalQuery).then((e) => {
              e[processChemical.attributes.OBJECTID].features.forEach((chemical) => {
                if (chemical.attributes.CASNumber === '00-11-11') {
                  const flammableMixtureQuery = new RelationshipQuery()
                  flammableMixtureQuery.outFields = ['*']
                  flammableMixtureQuery.relationshipId = this.tblS1FlammableMixtureChemicals.relationshipId
                  flammableMixtureQuery.objectIds = [processChemical.attributes.OBJECTID]

                  this.tblS1ProcessChemicals.queryRelatedFeatures(flammableMixtureQuery).then((e) => {
                    const chemicalOBJECTIDS = []
                    e[processChemical.attributes.OBJECTID].features.forEach((item) => {
                      chemicalOBJECTIDS.push(item.attributes.OBJECTID)
                    })

                    const chemicalLookup = new RelationshipQuery()
                    chemicalLookup.outFields = ['*']
                    chemicalLookup.relationshipId = this.FlammableChemicals.relationshipId
                    chemicalLookup.objectIds = chemicalOBJECTIDS

                    this.tblS1FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup).then((e) => {
                      this.processText.push(<tr>
                        <td colSpan={2}>{chemical.attributes.ChemicalName}</td>
                        <td className="quantity">{this.numberFormatter(processChemical.attributes.Quantity)}</td>
                      </tr>)
                      chemicalOBJECTIDS.forEach((objectid) => {
                        e[objectid].features.forEach((mixtureChemical) => {
                          this.processText.push(<tr>
                            <td>&#187;</td>
                            <td>{mixtureChemical.attributes.ChemicalName}</td>
                            <td></td>
                          </tr>)
                        })
                      })
                    })
                  })
                } else {
                  this.processText.push(<tr>
                    <td colSpan={2}>{chemical.attributes.ChemicalName}</td>
                    <td className="quantity">{this.numberFormatter(processChemical.attributes.Quantity)}</td>
                  </tr>)
                }
              })
              this.process = process
              this.setState({
                process: this.process,
                naicsText: this.naicsText,
                processText: this.processText
              })
              this.Process()
            })
          })
        })
      })
    })
    promises.push(facilitiesPromise)

    const accidentQuery = new RelationshipQuery()
    accidentQuery.outFields = ['*']
    accidentQuery.relationshipId = this.tblS6AccidentHistory.relationshipId
    accidentQuery.objectIds = [attributes.OBJECTID]
    this.accidentText = []
    this.accidentChems = []
    let accidentChemPromise, accidentChemQueryPromise, accidentFlamMixPromise, accidentChemLookupPromise
    promises.push(accidentChemPromise, accidentChemQueryPromise, accidentFlamMixPromise, accidentChemLookupPromise)
    const accidentPromise = this.tblS1Facilities.queryRelatedFeatures(accidentQuery).then((featureSet) => {
      if (featureSet.hasOwnProperty(attributes.OBJECTID)) {
        featureSet[attributes.OBJECTID].features.forEach((accident) => {
          const release_event = []
          accident.attributes.RE_Gas ? release_event.push('Gas') : null
          accident.attributes.RE_Spill ? release_event.push('Spill') : null
          accident.attributes.RE_Fire ? release_event.push('Fire') : null
          accident.attributes.RE_Explosion ? release_event.push('Explosion') : null
          accident.attributes.RE_ReactiveIncident ? release_event.push('Reactive Incident') : null

          const release_source = []
          accident.attributes.RS_StorageVessel ? release_source.push('Storage Vessel') : null
          accident.attributes.RS_Piping ? release_source.push('Piping') : null
          accident.attributes.RS_ProcessVessel ? release_source.push('Process Vessel') : null
          accident.attributes.RS_TransferHose ? release_source.push('Transfer Hose') : null
          accident.attributes.RS_Valve ? release_source.push('Valve') : null
          accident.attributes.RS_Pump ? release_source.push('Pump') : null
          accident.attributes.RS_Joint ? release_source.push('Joint') : null
          accident.attributes.OtherReleaseSource ? release_source.push('Other') : null

          this.accidentText.push(
            <div>
              <div style={{paddingTop: '10px'}}>
                <b>Date: {moment(accident.attributes.AccidentDate).toISOString().split('T')[0]}</b>
              </div>
              <div>Duration
                (HHH:MM): {accident.attributes.AccidentReleaseDuration.substring(0, 3)}:{accident.attributes.AccidentReleaseDuration.substring(3, 5)}</div>
              <div><span>Release Event(s): {release_event.join(',')} </span></div>
              <div><span>Release Source(s): {release_source.join(',')}</span></div>
            </div>
          )

          const accidentChemicalQuery = new RelationshipQuery()
          accidentChemicalQuery.outFields = ['*']
          accidentChemicalQuery.relationshipId = this.AccidentChemicals.relationshipId
          accidentChemicalQuery.objectIds = [accident.attributes.OBJECTID]

          accidentChemPromise = this.tblS6AccidentHistory.queryRelatedFeatures(accidentChemicalQuery).then((e) => {
            e[accident.attributes.OBJECTID].features.forEach((accidentChemical) => {
              const chemicalQuery = new RelationshipQuery()
              chemicalQuery.outFields = ['*']
              chemicalQuery.relationshipId = this.tblS6AccidentChemicals.relationshipId
              chemicalQuery.objectIds = [accidentChemical.attributes.OBJECTID]

              accidentChemQueryPromise = this.tblS6AccidentChemicals.queryRelatedFeatures(chemicalQuery).then((e) => {
                e[accidentChemical.attributes.OBJECTID].features.forEach((chemical) => {
                  if (chemical.attributes.CASNumber === '00-11-11') {
                    const flammableMixtureQuery = new RelationshipQuery()
                    flammableMixtureQuery.outFields = ['*']
                    flammableMixtureQuery.relationshipId = this.tblS6FlammableMixtureChemicals.relationshipId
                    flammableMixtureQuery.objectIds = [accidentChemical.attributes.OBJECTID]

                    accidentFlamMixPromise = this.tblS6AccidentChemicals.queryRelatedFeatures(flammableMixtureQuery).then(e => {
                      const chemicalOBJECTIDS = []
                      e[accidentChemical.attributes.OBJECTID].features.forEach((item) => {
                        chemicalOBJECTIDS.push(item.attributes.OBJECTID)
                      })

                      const chemicalLookup = new RelationshipQuery()
                      chemicalLookup.outFields = ['*']
                      chemicalLookup.relationshipId = this.AccidentFlamMixChem.relationshipId
                      chemicalLookup.objectIds = chemicalOBJECTIDS
                      this.accidentChems = []
                      this.accidentChems.push(<tr>
                        <th colSpan={2}>Chemical(s)</th>
                        <th>Quantity (lbs)</th>
                      </tr>)
                      accidentChemLookupPromise = this.tblS6FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup).then(e => {
                        this.accidentChems.push(<tr>
                          <td colSpan={2}>{chemical.attributes.ChemicalName}</td>
                          <td
                            className="quantity">{this.numberFormatter(accidentChemical.attributes.QuantityReleased)}</td>
                        </tr>)
                        chemicalOBJECTIDS.forEach((objectid) => {
                          e[objectid].features.forEach((mixtureChemical) => {
                            this.accidentChems.push(<tr>
                              <td>&#187;</td>
                              <td>{mixtureChemical.attributes.ChemicalName}</td>
                              <td></td>
                            </tr>)
                          })
                        })
                      })
                    })
                  } else {
                    this.accidentChems.push(<tr>
                      <td colSpan={2}>{chemical.attributes.ChemicalName}</td>
                      <td className="quantity">{this.numberFormatter(accidentChemical.attributes.QuantityReleased)}</td>
                    </tr>)
                  }
                })
              })
            })
          })
        })
      } else {
        this.accidentText.push(<b>No Accidents Reported</b>)
      }
      this.setState({
          accidentText: this.accidentText,
          accidentChems: this.accidentChems
        }
      )
    })

    promises.push(accidentPromise)

    const ERQuery = new RelationshipQuery()
    ERQuery.outFields = ['*']
    ERQuery.relationshipId = this.tblS9EmergencyResponses.relationshipId
    ERQuery.objectIds = [attributes.OBJECTID]

    const emerRespPromise = this.tblS1Facilities.queryRelatedFeatures(ERQuery).then((e) => {
      this.erTextAttr = e[attributes.OBJECTID].features[0]
      this.setState({
        erTextAttr: this.erTextAttr
      })
    })

    promises.push(emerRespPromise)

    Promise.all(promises).then(() => {
      this.setState({
        loading: false
      })
    })
  }

  numberFormatter(number: string | number) {
    if (typeof number === 'string') {
      return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    } else {
      return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
  }

  modalVis() {
    this.openModal = !this.openModal
    this.setState({
      openModal: this.openModal
    })
  }

  rmpLayerCreated = (e) => {
    this.setState({
      rmpFacilityLayer: e.layer,
      rmpParentLayer: e.parentDataSource.layer
    })
  }

  render() {
    if (!this.props.useDataSources?.length || !this.props.useMapWidgetIds?.length) {
      return <h2>Please complete widget configuration.</h2>
    }

    if (this.state?.loading) {
      return <div>
        <Loading type='SECONDARY'/>
        <DataSourceComponent useDataSource={this.props.useDataSources?.[0]}
                             onDataSourceCreated={this.rmpLayerCreated}></DataSourceComponent>
        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                              onActiveViewChange={this.onActiveViewChange}/>
      </div>
    }
    return (
      <div className="widget-addLayers jimu-widget p-2" style={{overflow: 'auto', backgroundColor: 'white'}}>
        {this.mainText ? <LandingText refreshDate={this.refreshDate}/> : null}

        <div>
          <this.NothingFound/>
          <this.Grid/>
          <this.LocationMetadata/>
          <Facility attributes={this.attributes} multipleRMPs={this.multipleRMPs} featureSet={this.featureSet}
                    facilityLayer={this.state?.rmpFacilityLayer} backLink={this.backLink('rmps')}/>
          <this.Process/>
          <this.Accidents/>
          <this.EmerRespPlan/>
          <ExecModal modalVis={this.modalVis} openModal={this.openModal}
                     executiveSummaryText={this.executiveSummaryText}/>
        </div>
        <DataSourceComponent useDataSource={this.props.useDataSources?.[0]}
                             onDataSourceCreated={this.rmpLayerCreated}></DataSourceComponent>
        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                              onActiveViewChange={this.onActiveViewChange}/>
      </div>
    )
  }
}
