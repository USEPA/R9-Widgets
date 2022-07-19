/** @jsx jsx */
import './assets/style.css';
import {React, AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState, DataSourceComponent} from "jimu-core";
import {IMConfig} from "../config";
import {JimuMapView, JimuMapViewComponent} from "jimu-arcgis";
import MapImageLayer from "esri/layers/MapImageLayer";
import DataGrid from "react-data-grid";
import Query from "esri/rest/support/Query";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Extent from "esri/geometry/Extent";
import RelationshipQuery from "esri/rest/support/RelationshipQuery";
import Graphic from "esri/Graphic";
import FeatureLayer from "esri/layers/FeatureLayer";
import moment from "Moment";
import {Button, Loading} from "jimu-ui"
import SimpleMarkerSymbol from "esri/symbols/SimpleMarkerSymbol";
import FeatureEffect from "esri/views/layers/support/FeatureEffect";
import FeatureFilter from "esri/views/layers/support/FeatureFilter";
import {getViewIDs, visibilityChanged} from '../../../shared';

function getComparator(sortColumn: string) {
  switch (sortColumn) {
    case 'FacilityName':
      return (a, b) => {
        return a[sortColumn].localeCompare(b[sortColumn]);
      };
    default:
      throw new Error(`unsupported sortColumn: "${sortColumn}"`);
  }
}

interface State {
  jimuMapView: JimuMapView
  loading: boolean
  attributes: any
  facilities: any
  nothingThere: boolean
  featureSet: any[]
  columns: any[]
  rows: any[]
  sortedRows: any[]
  sortColumns: any[]
  contactInfo: any[]
  chemicalInfo: any[]
  recordsText: any[]
  mainText: boolean
  visible: boolean
}

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, State> {

  jmv: JimuMapView;
  first: boolean = true;
  loading: boolean = true;
  mainText: boolean = false;
  graphicsLayer: GraphicsLayer;
  symbol: SimpleMarkerSymbol = new SimpleMarkerSymbol({color: 'yellow', style: 'diamond'});
  // todo: move to settings
  baseurl: string = "https://utility.arcgis.com/usrsvcs/servers/ea77cd05c98e44a98fdaddc83948015d/rest/services/EPA_EPCRA/TierIIFacilities_new_dev/MapServer"
  attributes: any;
  facilities: any;
  nothingThere: boolean = false;
  featureSet: any[] = []
  // tierIICA: FeatureLayer;
  // tierIIAZ: FeatureLayer;
  // tierIINV: FeatureLayer;
  // tierIIHI: FeatureLayer;
  // tierIICNMI: FeatureLayer;
  allTierIIfl: FeatureLayer[] = [];
  columns: any[] = [];
  rows: any[] = [];
  sortedRows: any[] = [];
  multipleLocations: boolean = false;
  sortColumns: any[] = [];
  TierIIContacts: any;
  TierIIChemInventory: any;
  TierIIPhone: any;
  TierIIChemInvLocations: any;
  TierIIChemInvMixtures: any;
  TierIIHazards: any;
  queryLayer: any;
  contactInfo: any[] = [];
  chemicalInfo: any[] = [];
  recordsLayer: FeatureLayer;
  recordsText: any[] = [];
  badPoints: boolean = false;
  openVisState: any = {};
  tierIITitle: string = 'TierIIFacilities_new_dev';
  badLocFeatureEffect = new FeatureEffect({
    filter: new FeatureFilter({
      where: "NeedsReview = true"
    }),
    includedEffect: "hue-rotate(270deg)"
  });
  currentPopup

  componentDidMount() {
    this.loading = true;
    this.setState({
      loading: this.loading,
    });
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
  }


  initLayer(lyr) {

    // lyr.createFeatureLayer().then(res => {
    lyr.load().then(() => {
      this.loadRelated(lyr);
    });
    // })
    lyr.on('layerview-create', e => e.layerView.featureEffect = this.badLocFeatureEffect)
    // });

    // let recordsTextArr = [];
    // this.recordsLayer.load().then(() => {
    //   let statusQuery = new Query();
    //
    //   statusQuery.outFields = ['*'];
    //   statusQuery.where = "1=1";
    //
    //   this.recordsLayer.queryFeatures(statusQuery).then(records => {
    //     const sortedRecords = [records.features.find((r) => r.attributes.State === 'California')]
    //       .concat(records.features.filter((r) => r.attributes.State !== 'California')
    //         .sort((a, b) => a.attributes.State > b.attributes.State ? 1 : -1));
    //     sortedRecords.forEach((record) => {
    //       let lastUpdate = moment(record.attributes.LastUpdate).toISOString().split('T')[0];
    //       recordsTextArr.push(
    //         <div>
    //           <tr>
    //             <td>State: {record.attributes.State}</td>
    //           </tr>
    //           <tr>
    //             <td>Status Year: {record.attributes.CurrentReportingYear}</td>
    //           </tr>
    //           <tr>
    //             <td>Last Updated: {lastUpdate}</td>
    //           </tr>
    //           <tr>
    //             <td>Contact: {record.attributes.ContactName}</td>
    //           </tr>
    //           <tr>
    //             <td>Contact Phone: {record.attributes.ContactPhone}</td>
    //           </tr>
    //           <tr>
    //             <td>Contact Email: {record.attributes.ContactEmail}</td>
    //           </tr>
    //           <tr>
    //             <td><br/></td>
    //           </tr>
    //         </div>
    //       );
    //     });
    //     this.loading = false;
    //     this.recordsText = recordsTextArr;
    //     this.mainText = true;
    //     this.setState({
    //       recordsText: this.recordsText,
    //       loading: this.loading,
    //     }, () => {
    //       this.LandingText()
    //     });
    //   });
    // });
  }

  onActiveViewChange = (jmv: JimuMapView) => {
    this.jmv = jmv;
    if (jmv) {
      this.setState({
        jimuMapView: jmv
      });
      this.jmv.view.on("click", event => {
        this.mapClick(event)
      });
    }
  }

  setupViewListening(jmv) {

  }

  // initFeatureEffect() {
  //   this.allTierIIfl.forEach(lyr => {
  //     this.jmv.view.whenLayerView(lyr).then(layerView => {
  //       layerView.featureEffect = this.badLocFeatureEffect
  //     });
  //   })
  // }

  componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView; contactInfo: any[]; chemicalInfo: any[] }>, snapshot?: any) {
    if (this.jmv && this.allTierIIfl.length > 0) {
      let widgetState: WidgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;
      // do anything on open/close of widget here
      if (widgetState === WidgetState.Opened || this.state.visible === true) {
        if (this.first) {
          this.setLayerVis(true);
          this.badPoints = false;
          this.mainText = true;
          this.nothingThere = false;
          this.setState({
            mainText: this.mainText,
            nothingThere: this.nothingThere,
            loading: false
          });
          this.currentPopup = this.jmv.view.popup;
          this.jmv.view.popup = null

        }
        this.first = false;
      } else {
        if (this.badPoints) {
          // go back to home if we are in the middle of nowhere looking at an incorrect location
          this.jmv.view.goTo({
            center: [-117.7881, 35.6117]
          });
        }
        this.setLayerVis(this.openVisState);
        this.badPoints = false;
        this.featureSet = [];
        this.rows = [];
        this.sortedRows = [];
        this.attributes = undefined;
        this.contactInfo = [];
        this.chemicalInfo = [];
        this.multipleLocations = false;
        this.nothingThere = false;
        this.first = true;
        this.jmv.view.graphics.removeAll();
        this.mainText = true;
        this.jmv.view.popup = this.currentPopup
      }
    }
  }

  setLayerVis(visible) {
    this.allTierIIfl.forEach(l => {
      const mapLayer = this.jmv.view.map.layers.find(ml => ml.url === l.url)
      if (mapLayer) {
        if (mapLayer?.sublayers) {
          mapLayer.sublayers.forEach(sl => {
            if (!(l.id in this.openVisState)) {
              this.openVisState[l.id] = mapLayer.visible
            }
            if (visible === true) {
              sl.visible = visible
            } else {
              sl.visible = this.openVisState[sl.id]
            }

          })
          if (!(l.id in this.openVisState)) {
            this.openVisState[l.id] = mapLayer.visible
          }
        }

        if (visible === true) {
          mapLayer.visible = visible
        } else {
          mapLayer.visible = this.openVisState[mapLayer.id]
        }
      }
    })
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

  loadRelated(obj) {
    obj.relationships.forEach((relationship) => {
      if (relationship.role === "origin") {
        this[relationship.name] = new FeatureLayer({url: this.baseurl + "/" + relationship.relatedTableId});
        this[relationship.name].relationshipId = relationship.id;
        this[relationship.name].load().then((e) => {
          this[relationship.name] = e;
          if (this[relationship.name].relationships.length > 0) {
            this.loadRelated(this[relationship.name]);
          }
        })
      }
    });

  };

  badLocations(e) {
    if (e) {
      this.mainText = false;
      this.loading = true;
      this.featureSet = [];
      this.rows = [];
      this.sortedRows = [];
      this.attributes = undefined;
      this.contactInfo = [];
      this.chemicalInfo = [];
      this.multipleLocations = false;
      this.nothingThere = false;
      this.setState({
        loading: this.loading,
        featureSet: this.featureSet,
        rows: this.rows,
        sortedRows: this.sortedRows,
        attributes: this.attributes,
        contactInfo: this.contactInfo,
        chemicalInfo: this.chemicalInfo,
        nothingThere: this.nothingThere
      });

      this.columns = [{key: 'FacilityName', name: 'Name'}];
      this.jmv.view.graphics.removeAll();
      let query = new Query();
      query.where = "NeedsReview = 1";
      query.returnGeometry = true;
      query.outFields = ['*'];
      let promises = [];
      this.allTierIIfl.forEach(fl => {
        let promise = fl.queryFeatures(query).then(featureSet => {
          if (featureSet.features.length > 0) {
            this.featureSet.push(...featureSet.features)
            // let data = []
            this.featureSet.forEach(feature => {
              let attrs = feature.attributes;
              this.sortedRows.push(attrs);
              this.rows.push(attrs)
            });
          }
        });
        promises.push(promise);
      });

      Promise.allSettled(promises).then(() => {
        if (this.featureSet.length === 1) {
          this.loadFeature(this.featureSet[0]);
          let symbol = new SimpleMarkerSymbol({style: 'x', size: '20px', color: 'yellow'})

          let badPoint = new Graphic({geometry: this.featureSet[0].geometry, symbol});
          this.jmv.view.graphics.add(badPoint);

          this.jmv.view.goTo({
            center: [location[0].geometry.longitude, location[0].geometry.latitude]
          });

        } else if (this.featureSet.length > 1) {
          this.badPoints = true;
          this.loading = false;
          this.multipleLocations = true
          this.setState({
            loading: false,
            rows: this.rows,
            sortedRows: this.sortedRows,
            columns: this.columns,
          }, () => {
            this.Grid();
          });
        } else {
          this.badPoints = true;
          this.nothingThere = true;
          this.loading = false;
          this.setState({
            loading: false,
            nothingThere: this.nothingThere,
          });
        }
      });
    }
  }

  LandingText = () => {
    if (this.mainText) {
      return (
        <div id="landingText" style={{overflow: 'auto'}}>
          <h1>Tier II Records Status</h1><br/>
          <table>
            <tbody id="tierii_status">
            {this.recordsText}
            </tbody>
          </table>
          <p>Click facility to view contact and chemical information.</p><br/>
          {/*<Button id="badLocations" data-testid="get-bad-locations-button" onClick={(e) => this.badLocations(e)}>View*/}
          {/*  locations needing*/}
          {/*  review</Button>*/}
          <br/>
          <p>More info on the Emergency Planning and Community Right-to-Know Act (EPCRA):
            <a href={"https://www.epa.gov/epcra"}>https://www.epa.gov/epcra</a></p><br/>
          <p>EPCRA Fact Sheet: <a
            href={"https://www.epa.gov/sites/production/files/2017-08/documents/epcra_fact_sheet_overview_8-2-17.pdf"}>https://www.epa.gov/sites/production/files/2017-08/documents/epcra_fact_sheet_overview_8-2-17.pdf</a>
          </p>
        </div>
      )
    } else {
      return null
    }
  }

  FacilityText = () => {
    if (!this.multipleLocations && this.attributes !== undefined) {
      return (
        <div>
          <h1>{this.attributes.FacilityName}</h1><br/>
          {this.badPoints ?
            <h4 style={{textDecoration: "underline", color: "red"}}><b>This location needs review, please
              contact...</b></h4> : null}
          <table>
            <tbody id="tierii_facility">
            <tr>
              <td>Physical Address: {this.attributes.StreetAddress}, {this.attributes.City}</td>
            </tr>
            <tr>
              <td>Fire
                District: {this.attributes.FireDistrict ? this.attributes.FireDistrict : 'Not Reported'}</td>
            </tr>
            {this.attributes.Manned ? <tr>
              <td> {this.attributes.Manned === 'true' ? 'Max Occupants: ' : 'Manned: No'} {this.attributes.MaxNumOccupants ? this.attributes.MaxNumOccupants : ''}</td>
            </tr> : ''}
            {this.attributes.SubjectToChemAccidentPrevention ? <tr>
              <td> Subject to Chemical Accident
                Prevention: {this.attributes.SubjectToChemAccidentPrevention === true ? 'Yes' : 'No'}</td>
            </tr> : ''}
            {this.attributes.SubjectToEmergencyPlanning ? <tr>
              <td>Subject to Emergency
                Planning: {this.attributes.SubjectToEmergencyPlanning === true ? 'Yes' : 'No'}</td>
            </tr> : ''}
            </tbody>
          </table>
        </div>
      )
    } else {
      return null
    }
  }

  ContactsText = () => {
    if (this.contactInfo.length > 0) {
      return (
        <div>
          <h3 style={{textDecoration: "underline"}}>Contacts</h3>
          <table>
            <tbody>
            {this.contactInfo}
            </tbody>
          </table>
          <br/>
        </div>
      )
    } else {
      return null
    }
  }

  ChemicalsText = () => {
    if (this.chemicalInfo.length > 0) {
      return (
        <div>
          <h3 style={{textDecoration: "underline"}}>Chemicals</h3>
          <table>
            <tbody>
            {this.chemicalInfo}
            </tbody>
          </table>
          <br/>
        </div>
      )
    } else {
      return null
    }
  }

  mapClick = (e) => {
    this.badPoints = false;
    this.mainText = false;
    this.loading = true;
    this.featureSet = [];
    this.rows = [];
    this.sortedRows = [];
    this.attributes = undefined;
    this.contactInfo = [];
    this.chemicalInfo = [];
    this.multipleLocations = false;
    this.nothingThere = false;
    this.setState({
      loading: this.loading,
      featureSet: this.featureSet,
      rows: this.rows,
      sortedRows: this.sortedRows,
      attributes: this.attributes,
      contactInfo: this.contactInfo,
      chemicalInfo: this.chemicalInfo,
      nothingThere: this.nothingThere,
      mainText: this.mainText,
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

    let noneFound = [];
    let featureQuery = new Query();
    featureQuery.outFields = ['*'];
    featureQuery.geometry = clickExtent;
    featureQuery.returnGeometry = true;
    this.columns = [{key: 'FacilityName', name: 'Name'}];
    let promises = [];
    this.queryLayer = undefined;
    this.allTierIIfl.forEach(fl => {
      let promise = fl.queryFeatures(featureQuery).then((featureSet) => {
        this.featureSet.push(...featureSet.features);
        if (this.featureSet.length === 1) {
          // this.featureSet.push(...featureSet.features);
          // this.queryLayer = fl;
          this.loadFeature(this.featureSet[0]);
          noneFound.push(false);
        } else if (this.featureSet.length > 1) {

          // this.queryLayer = fl;
          this.multipleLocations = true;
          let data = [];

          this.featureSet.forEach(feature => {
            let attrs = feature.attributes;
            data.push(attrs);
          });

          this.rows.push(...data)
          this.sortedRows.push(...data)

          this.loading = false;
          noneFound.push(false);
        } else {
          noneFound.push(true);
        }
        if (noneFound.length === this.allTierIIfl.length) {
          let wasfound = noneFound.filter(found => {
            return found === false;
          });

          if (wasfound.length === 0) {
            this.nothingThere = true;
            this.loading = false;
            this.setState({
              loading: this.loading,
              nothingThere: this.nothingThere,
            });
          }
        }
      });
      promises.push(promise)
    });

    Promise.all(promises).then(() => {
      if (this.featureSet.length === 1) {
        this.loadFeature(this.featureSet[0])
      }

      this.setState({
        sortedRows: this.sortedRows,
        loading: this.loading,
        nothingThere: this.nothingThere,
      });
      this.Grid();
    });
  }

  rowKeyGetter = (row) => {
    return row;
  }

  rowClick = (row) => {
    let location = this.featureSet.filter((feature) => {
      return feature.attributes.OBJECTID === this.sortedRows[row].OBJECTID;
    });
    // zoom to and add graphic functionality for locations that need fixing
    if (this.badPoints) {
      let symbol = new SimpleMarkerSymbol({style: 'x', size: '20px', color: 'yellow'})

      let badPoint = new Graphic({geometry: location[0].geometry, symbol});
      this.jmv.view.graphics.add(badPoint);

      this.jmv.view.goTo({
        center: [location[0].geometry.longitude, location[0].geometry.latitude]
      });
    }

    this.loadFeature(location[0]);
  }

  NothingFound = () => {
    if (this.nothingThere) {
      return (
        this.badPoints ? <div><h3>No incorrect locations reported at this time</h3><br/></div> :
          <div><h3>No facilities found at this location</h3><br/></div>
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
            <DataGrid style={{height: `${(this.sortedRows.length * 35) + 37}px`, maxHeight: "700px",}}
                      columns={this.columns} rows={this.sortedRows} onRowClick={this.rowClick} className={'rdg-light'}
                      rowKeyGetter={this.rowKeyGetter} defaultColumnOptions={{
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


    // this.rows = sortedRows;
    this.setState({
      sortedRows: this.sortedRows,
      sortColumns: this.sortColumns
      // columns: this.columns,
    });
    return this.sortedRows
  }

  loadFeature = (feature) => {
    this.loading = true;
    this.setState({
      loading: this.loading,
    });

    this.multipleLocations = false;
    this.attributes = feature.attributes;
    let selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol});
    this.jmv.view.graphics.add(selectedGraphic);
    this.allTierIIfl.forEach(fl => {
        if (fl.title.includes(this.attributes.State)) {
          this.queryLayer = fl;
          let contactsPromises = [];
          let contacts = [];
          // if contacts are available get them
          if (this.TierIIContacts.relationshipId !== 'none' && this.TierIIContacts.relationshipId !== undefined) {
            let contactQuery = new RelationshipQuery();
            // GET CONTACTS
            contactQuery.outFields = ['*'];
            //dojo.forEach(service.facilities.relationships, function (relationship, i) {
            // Facilities to Contacts relationship ID
            contactQuery.relationshipId = this.TierIIContacts.relationshipId;
            contactQuery.objectIds = [this.attributes.OBJECTID];
            this.queryLayer.queryRelatedFeatures(contactQuery).then((e) => {
              e[this.attributes.OBJECTID].features.forEach((contact, i) => {
                let contactPhonesQuery = new RelationshipQuery();
                contactPhonesQuery.outFields = ['*'];
                // contacts to phone relationship id
                contactPhonesQuery.relationshipId = this.TierIIPhone.relationshipId;
                contactPhonesQuery.objectIds = [contact.attributes.OBJECTID];

                let contactPromise = this.TierIIContacts.queryRelatedFeatures(contactPhonesQuery).then((f) => {
                  // these attributes could be different for each state
                  // the service.config.state object helps you identify which state you are working with
                  // this.contactInfo.push(
                  contacts.push(
                    <tr>
                      <td style={{paddingTop: "10px"}}>
                        <b>{contact.attributes.Title ? contact.attributes.Title + ': ' : ''}
                          {contact.attributes.FirstName ? contact.attributes.FirstName + ' ' : ''}
                          {contact.attributes.LastName ? contact.attributes.LastName : ''}
                          {contact.attributes.FirstName || contact.attributes.LastName ? '' : 'Not Reported'}</b>
                      </td>
                    </tr>
                  );

                  // this.contactInfo.push(
                  contacts.push(
                    <tr>
                      <td>Email: {contact.attributes.Email ? contact.attributes.Email : 'Not Reported'}</td>
                    </tr>
                  );


                  if (f.hasOwnProperty(contact.attributes.OBJECTID)) {
                    f[contact.attributes.OBJECTID].features.forEach((contact_phone_feature, j) => {
                      contacts.push(<div>
                        <tr>
                          <td>{contact_phone_feature.attributes.Type ? contact_phone_feature.attributes.Type + ': ' : ''}
                            {contact_phone_feature.attributes.Phone ? contact_phone_feature.attributes.Phone : ''}</td>
                        </tr>
                      </div>)
                    });
                  }
                }, function (e) {
                  console.log("Error: " + e);
                });

                contactsPromises.push(contactPromise);

              });

              Promise.all(contactsPromises).then(() => {
                this.loading = false;
                this.contactInfo = contacts;
                this.setState({
                  contactInfo: this.contactInfo
                }, () => {
                  this.ContactsText();
                });
              });
            }, function (e) {
              console.log("Error: " + e);
            });
          } else {
            this.loading = false;
            this.setState({
              loading: this.loading,
            });
          }

          if (this.TierIIChemInventory.relationshipId !== 'none' && this.TierIIChemInventory.relationshipId !== undefined) {
            // GET CHEMICALS
            let chemicalQuery = new RelationshipQuery();
            chemicalQuery.outFields = ['*'];
            // facilities to chemicals relationship ID
            chemicalQuery.relationshipId = this.TierIIChemInventory.relationshipId;
            chemicalQuery.objectIds = [this.attributes.OBJECTID];
            let chemInfoArr = [];
            let newChemInfo = [];
            let chemPromises = [];
            // let chemicalsPromise = this.queryLayer.queryRelatedFeatures(chemicalQuery).then((e) => {
            this.queryLayer.queryRelatedFeatures(chemicalQuery).then((e) => {
              e[this.attributes.OBJECTID].features.forEach((chemical, i) => {
                let newChemInfo = [];
                newChemInfo.push(
                  <div>
                    <tr>
                      <td style={{paddingTop: '10px'}}>
                        <b>{chemical.attributes.chemical_name} {chemical.attributes.cas_code ? ' (' + chemical.attributes.cas_code + ')' : ''}</b>
                      </td>
                    </tr>
                    <tr>
                      <td>Days: {chemical.attributes.DaysOnSite}</td>
                    </tr>
                    <tr>
                      <td>Max
                        Amount: {chemical.attributes.MaxAmount ? chemical.attributes.MaxAmount + ' lbs' : "Not Reported"}</td>
                    </tr>
                    <tr>
                      <td>Max Amount
                        Range: {chemical.attributes.MaxAmountCode ? chemical.attributes.MaxAmountCode : 'Not Reported'}</td>
                    </tr>
                    <tr>
                      <td>Max Amount
                        Container: {chemical.attributes.MaxAmtContainer ? chemical.attributes.MaxAmtContainer : "Not Reported"}</td>
                    </tr>
                    <tr>
                      <td>Average
                        Amount: {chemical.attributes.AveAmount ? chemical.attributes.AveAmount + ' lbs' : "Not Reported"}</td>
                    </tr>
                    <tr>
                      <td>Average Amount
                        Range: {chemical.attributes.AveAmountCode ? chemical.attributes.AveAmountCode : 'Not Reported'}</td>
                    </tr>
                  </div>
                );

                let states = null;
                if (chemical.attributes.Gas === 'Y' || chemical.attributes.Gas === true) {
                  states = 'Gas';
                }
                if (chemical.attributes.Solid === 'Y' || chemical.attributes.Gas === true) {
                  states ? states += ', Solid' : states = 'Solid';
                }
                if (chemical.attributes.Liquid === 'Y' || chemical.attributes.Liquid === true) {
                  states ? states += ', Liquid' : states = 'Liquid';
                }
                if (states === null) {
                  states = 'Not Reported';
                }

                newChemInfo.push(<tr>
                  <td>State(s): {states}</td>
                </tr>);

                let hazards = null;
                if (chemical.attributes.Fire === 'Y') {
                  hazards = 'Fire';
                }
                if (chemical.attributes.Pressure === 'Y') {
                  hazards = (hazards ? hazards += ', Sudden Release of Pressure' : 'Sudden Release of Pressure');
                }
                if (chemical.attributes.Reactive === 'Y') {
                  hazards = (hazards ? hazards += ', Reactive' : 'Reactive');
                }
                if (chemical.attributes.Acute === 'Y') {
                  hazards = (hazards ? hazards += ', Acute' : 'Acute');
                }
                if (chemical.attributes.Chronic === 'Y') {
                  hazards = (hazards ? hazards += ', Chronic' : 'Chronic');
                }
                if (hazards === null) {
                  hazards = 'Not Reported';
                }
                newChemInfo.push(<tr id={"hazards_" + chemical.attributes.OBJECTID}>
                  <td>Hazard(s): {hazards} </td>
                </tr>);

                if (this.TierIIChemInvLocations !== undefined && this.TierIIChemInvLocations.relationshipId !== 'none') {

                  let chemicalLocationQuery = new RelationshipQuery();

                  chemicalLocationQuery.outFields = ['*'];
                  // chemicals to chemical locations relationship id
                  chemicalLocationQuery.relationshipId = this.TierIIChemInvLocations.relationshipId;
                  chemicalLocationQuery.objectIds = [chemical.attributes.OBJECTID];

                  let chemLocPromise = this.TierIIChemInventory.queryRelatedFeatures(chemicalLocationQuery).then((e) => {
                    e[chemical.attributes.OBJECTID].features.forEach((chemical_location, j) => {
                      let chemLocInfo = []
                      let location_number = j + 1;
                      chemLocInfo.push(
                        <div>
                          <tr>
                            <td>-------------------</td>
                          </tr>
                          <tr>
                            <td>Location
                              #{location_number} : {chemical_location.attributes.Location ? chemical_location.attributes.Location : 'Not Reported'}</td>
                          </tr>
                          <tr>
                            <td>Location
                              #{location_number} Type: {chemical_location.attributes.LocationType ? chemical_location.attributes.LocationType : 'Not Reported'}</td>
                          </tr>
                          <tr>
                            <td>Location
                              #{location_number} Pressure: {chemical_location.attributes.LocationPressure ? chemical_location.attributes.LocationPressure : 'Not Reported'}</td>
                          </tr>
                          <tr>
                            <td>Location
                              #{location_number} Temp: {chemical_location.attributes.LocationTemperature ? chemical_location.attributes.LocationTemperature : 'Not Reported'}</td>
                          </tr>
                        </div>
                      )
                      newChemInfo.push(...chemLocInfo);
                    });
                    chemInfoArr.push(...newChemInfo);
                  }, function (e) {
                    console.log("Error: " + e);
                  });

                  chemPromises.push(chemLocPromise);

                } else {
                  chemInfoArr.push(...newChemInfo);
                }
              });

            }, function (e) {
              console.log("Error: " + e);
            });

            Promise.all(chemPromises).then(() => {
              this.loading = false;
              this.chemicalInfo = chemInfoArr;
              this.setState({
                chemicalInfo: this.chemicalInfo,
                loading: this.loading,
              }, () => {
                this.ChemicalsText();
              });
            });

          } else {
            this.loading = false;
            this.setState({
              loading: this.loading,
            });
          }
        }
      }
    );
  }

  tierIILayerCreated = (e) => {
    if (this.allTierIIfl.length === 0) {
      // capture parent
      this.allTierIIfl.push(e.parentDataSource.layer)
    }
    this.allTierIIfl.push(e.layer)
    this.initLayer(e.layer)
  }

  render() {
    if (!this.props.useDataSources?.length || !this.props.useMapWidgetIds?.length) {
      return <h2>Please complete widget configuration.</h2>
    }
    return (
      <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto"}}>
        {this.state?.loading ? <Loading/> :
          <div>
            <this.NothingFound/>
            <this.Grid/>
            <this.FacilityText/>
            <this.ContactsText/>
            <this.ChemicalsText/>
            {this.mainText ? this.LandingText() : null}
          </div>
        }
        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                              onActiveViewChange={this.onActiveViewChange}/>
        {this.props.useDataSources.map(useDataSource => {
          return <DataSourceComponent useDataSource={useDataSource}
                                      onDataSourceCreated={this.tierIILayerCreated}></DataSourceComponent>
        })}
      </div>
    )
  }
}
