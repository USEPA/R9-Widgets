/** @jsx jsx */
import './assets/style.css';
import {React, AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState} from "jimu-core";
import {IMConfig} from "../config";
import {JimuMapView, JimuMapViewComponent} from "jimu-arcgis";
import PictureMarkerSymbol from "esri/symbols/PictureMarkerSymbol";
import MapImageLayer from "esri/layers/MapImageLayer";
import DataGrid, {SelectColumn} from "react-data-grid";
import Query from "esri/rest/support/Query";
import SpatialReference from "esri/geometry/SpatialReference";
import query from "esri/rest/query";
import geometryEngine from "esri/geometry/geometryEngine";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Extent from "esri/geometry/Extent";
import RelationshipQuery from "esri/rest/support/RelationshipQuery";
import Graphic from "esri/Graphic";
import FeatureLayer from "esri/layers/FeatureLayer";
import moment from "Moment";
import {Button, Modal, ModalBody, ModalFooter, ModalHeader} from "jimu-ui"
import SimpleMarkerSymbol from "esri/symbols/SimpleMarkerSymbol";
import type {Column} from "react-data-grid";
import {Sort} from "../../../../../jimu-ui/advanced/lib/sql-expression-builder/styles";

interface Row {
}

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

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, {
    jimuMapView: JimuMapView, loading: boolean, attributes: any, facilities: any, nothingThere: boolean,
    featureSet: any[], columns: any[], rows: any[], sortedRows: any[], sortColumns: any[], contactInfo: any[], chemicalInfo: any[],
}> {

    jmv: JimuMapView;
    first: boolean = false;
    loading: boolean = true;
    mainText: boolean = true;
    tierIILayer: MapImageLayer;
    graphicsLayer: GraphicsLayer;
    symbol: SimpleMarkerSymbol;
    baseurl: string = "https://utility.arcgis.com/usrsvcs/servers/ea77cd05c98e44a98fdaddc83948015d/rest/services/EPA_EPCRA/TierIIFacilities_new_dev/MapServer"
    attributes: any;
    facilities: any;
    nothingThere: boolean = false;
    featureSet: any[] = []
    tierIICA: FeatureLayer;
    tierIIAZ: FeatureLayer;
    tierIINV: FeatureLayer;
    tierIIHI: FeatureLayer;
    tierIICNMI: FeatureLayer;
    allTierIIfl: any[] = [];
    columns: any[] = [];
    rows: any[] = [];
    sortedRows: any[] = [];
    multipleLocations: boolean = false;
    sortColumns: any[] = [];
    TierIIContacts: any;
    TierIIChemInventory: any;
    TierIIPhone: any
    TierIIChemInvLocations: any
    TierIIChemInvMixtures: any
    Tier
    queryLayer: any;
    contactInfo: any[] = [];
    chemicalInfo: any[] = [];

    constructor(props) {
        super(props);

        // bind this to class methods
        this.loadRelated = this.loadRelated.bind(this);
        this.loadFeature = this.loadFeature.bind(this);
        this.NothingFound = this.NothingFound.bind(this);
        this.Grid = this.Grid.bind(this);
        this.FacilityText = this.FacilityText.bind(this);
        this.LandingText = this.LandingText.bind(this);
        this.mapClick = this.mapClick.bind(this);
        this.rowClick = this.rowClick.bind(this);
        this.onSortColsChange = this.onSortColsChange.bind(this);
        this.ContactsText = this.ContactsText.bind(this);
        this.ChemicalsText = this.ChemicalsText.bind(this);
    }

    componentDidMount() {
        this.tierIILayer = new MapImageLayer({
            url: "https://utility.arcgis.com/usrsvcs/servers/ea77cd05c98e44a98fdaddc83948015d/rest/services/EPA_EPCRA/TierIIFacilities_new_dev/MapServer"
        });
        // url for new service layer https://utility.arcgis.com/usrsvcs/servers/ea77cd05c98e44a98fdaddc83948015d/rest/services/EPA_EPCRA/TierIIFacilities_new_dev/MapServer
        this.symbol = new SimpleMarkerSymbol({color: 'yellow', style: 'diamond'});

        this.graphicsLayer = new GraphicsLayer();
        this.allTierIIfl = [];
        this.jmv.view.map.add(this.graphicsLayer);
        this.tierIILayer.load();
        this.tierIILayer.loadAll().then(() => {
            this.tierIILayer.sublayers.forEach(lyr => {
                lyr.createFeatureLayer().then(res => {
                    res.load();
                    res.when(() => {
                        if (res.layerId == 0) {
                            this.tierIICA = res;
                        } else if (res.layerId == 1) {
                            this.tierIIAZ = res
                        } else if (res.layerId == 2) {
                            this.tierIINV = res
                        } else if (res.layerId == 3) {
                            this.tierIIHI = res
                        } else if (res.layerId == 4) {
                            this.tierIICNMI = res
                        }
                        this.allTierIIfl.push(res);
                        this.loadRelated(res);
                    });
                })
            });
            this.jmv.view.map.add(this.tierIILayer);

        });
    }

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

    componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView; contactInfo: any[]; chemicalInfo: any[] }>, snapshot?: any) {
        let widgetState: WidgetState;
        widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;
        // do anything on open/close of widget here
        if (widgetState == WidgetState.Opened) {
            this.tierIILayer.visible = true;
            if (this.first) {
                this.nothingThere = false;
                this.setState({
                    nothingThere: this.nothingThere,
                });
                this.jmv.view.map.layers.add(this.graphicsLayer);
            }
            this.first = false;
        } else {
            this.first = true;
            this.jmv.view.map.layers.remove(this.graphicsLayer);
            this.tierIILayer.visible = false;
        }
    }

    getArbitraryFirstMapWidgetId = (): string => {
        const appState: any = window._appState;
        // Loop through all the widgets in the config and find the "first"
        // that has the type (uri) of "arcgis-map"
        if (appState) {
            const arbitraryFirstMapWidgetInfo: { [key: string]: any } = Object.values(appState.appConfig.widgets).find((widgetInfo: any) => {
                return widgetInfo.uri === 'widgets/arcgis/arcgis-map/'
            });
            return arbitraryFirstMapWidgetInfo.id;
        }
    }

    LandingText = () => {
        return (
            <div id="landingText" style={{overflow: 'auto'}}>

            </div>
        )
    }

    FacilityText = () => {
        if (!this.multipleLocations && this.attributes !== undefined) {
            return (
                <div>
                    <h1>{this.attributes.FacilityName}</h1><br/>
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

                    {/*{this.attributes.SubjectToChemAccidentPrevention === true ? <tr>*/}
                    {/*        <td>Subject to Chemical Accident Prevention: Yes</td>*/}
                    {/*    </tr> :*/}
                    {/*    <tr>*/}
                    {/*        <td>Subject to Chemical Accident Prevention: Unknown</td>*/}
                    {/*    </tr>}*/}

                    {/*{this.attributes.SubjectToEmergencyPlanning === true ? <tr>*/}
                    {/*        <td>Subject to Emergency Planning: Yes</td>*/}
                    {/*    </tr> :*/}
                    {/*    this.attributes.SubjectToEmergencyPlanning === false ? <tr>*/}
                    {/*            <td>Subject to Emergency Planning: No</td>*/}
                    {/*        </tr> :*/}
                    {/*        <tr>*/}
                    {/*            <td>Subject to Emergency Planning: Unknown</td>*/}
                    {/*        </tr>}*/}

                    {/*{this.attributes.Manned === true ? <div>*/}
                    {/*        <tr>*/}
                    {/*            <td>Manned: Yes</td>*/}
                    {/*        </tr>*/}
                    {/*        <tr>*/}
                    {/*            <td>Max*/}
                    {/*                Occupants: {this.attributes.MaxNumOccupants ? this.attributes.MaxNumOccupants : 'Unknown'}</td>*/}
                    {/*        </tr>*/}
                    {/*    </div> :*/}
                    {/*    <tr>*/}
                    {/*        <td>Manned: No</td>*/}
                    {/*    </tr>}*/}

                </div>
            )
        } else {
            return null
        }
    }

    ContactsText() {
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
        // if (this.chemicalInfo.length > 0) {
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
        // } else {
        //     return null
        // }
    }

    mapClick = (e) => {
        this.loading = true;
        this.featureSet = [];
        this.rows = [];
        this.attributes = undefined;
        this.contactInfo = [];
        this.chemicalInfo = [];
        this.multipleLocations = false;
        this.nothingThere = false;
        this.setState({
            loading: this.loading,
            featureSet: this.featureSet,
            rows: this.rows,
            attributes: this.attributes,
            contactInfo: this.contactInfo,
            chemicalInfo: this.chemicalInfo,
            nothingThere: this.nothingThere
        });

        this.graphicsLayer.removeAll();
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
        this.columns = [{key: 'FacilityName', name: 'Name'}];
        let promises = [];
        this.queryLayer = undefined;
        this.allTierIIfl.forEach(fl => {
            let promise = fl.queryFeatures(featureQuery).then((featureSet) => {
                if (featureSet.features.length === 1) {
                    this.featureSet.push(...featureSet.features);
                    // this.queryLayer = fl;
                    this.loadFeature(this.featureSet[0]);
                    noneFound.push(false);
                } else if (featureSet.features.length > 1) {
                    this.featureSet.push(...featureSet.features);
                    // this.queryLayer = fl;
                    this.multipleLocations = true;
                    let data = [];

                    this.featureSet.forEach(feature => {
                        var attrs = feature.attributes;
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
                    var wasfound = noneFound.filter(found => {
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

    rowKeyGetter(row) {
        return row;
    }

    rowClick(row) {
        let location = this.featureSet.filter((feature) => {
            return feature.attributes.OBJECTID === this.sortedRows[row].OBJECTID;
        });
        this.loadFeature(location[0]);
    }

    NothingFound() {
        if (this.nothingThere) {
            return (
                <div>
                    <h3>No facilities found at this location</h3><br/>
                </div>
            )
        } else {
            return null
        }
    }

    Grid() {
        return (
            <div>
                {this.multipleLocations ?
                    <div>
                        <div><h3>Multiple Facilities at that Location</h3><br/><h5>Select one to continue</h5></div>
                        <DataGrid style={{height: `${(this.sortedRows.length * 35) + 37}px`, maxHeight: "700px"}}
                                  columns={this.columns} rows={this.sortedRows} onRowClick={this.rowClick}
                                  rowKeyGetter={this.rowKeyGetter} defaultColumnOptions={{
                            sortable: true,
                            resizable: true
                        }} onSortColumnsChange={this.onSortColsChange} sortColumns={this.sortColumns}/>
                    </div> : null}
            </div>
        )
    }

    onSortColsChange(cols) {
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

    loadFeature(feature) {
        this.loading = true;
        // this.contactInfo = [];
        this.setState({
            loading: this.loading,
            // contactInfo: this.contactInfo,
        });
        this.multipleLocations = false;
        this.attributes = feature.attributes;
        let selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol});
        this.graphicsLayer.add(selectedGraphic);
        this.allTierIIfl.forEach(fl => {
                if (fl.title.includes(this.attributes.State)) {
                    this.queryLayer = fl;
                    let contactsPromises = [];
                    let contacts = [];
                    // if contacts are available get them
                    if (this.TierIIContacts.relationshipId !== 'none' && this.TierIIContacts.relationshipId !== undefined) {
                        var contactQuery = new RelationshipQuery();
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
                                                    {contact.attributes.FirstName ? contact.attributes.FirstName : ''}
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
                        var chemicalQuery = new RelationshipQuery();
                        chemicalQuery.outFields = ['*'];
                        // facilities to chemicals relationship ID
                        chemicalQuery.relationshipId = this.TierIIChemInventory.relationshipId;
                        chemicalQuery.objectIds = [this.attributes.OBJECTID];

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
                                        {/*<tr>*/}
                                        {/*    <td>Max Amount: {chemical.attributes.MaxAmount ? chemical.attributes.MaxAmount : 'Not Reported'}</td>*/}
                                        {/*</tr>*/}
                                        {/*<tr>*/}
                                        {/*    <td>Avg Daily*/}
                                        {/*        Amount: {chemical.attributes.AveAmount ? chemical.attributes.AveAmount : 'Not Reported'}</td>*/}
                                        {/*</tr>*/}
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

                                    this.TierIIChemInventory.queryRelatedFeatures(chemicalLocationQuery).then((e) => {


                                        // if (service.config.state.abbr === 'NV') {
                                        //     var chemicalHazardsQuery = new RelationshipQuery();
                                        //
                                        //     chemicalHazardsQuery.outFields = ['*'];
                                        //     // chemicals to chemical locations relationship id
                                        //     chemicalHazardsQuery.relationshipId = service.config.chemicals.hazards.relationshipId;
                                        //     chemicalHazardsQuery.objectIds = [chemical.attributes.OBJECTID];
                                        //     service.chemicals.queryRelatedFeatures(chemicalHazardsQuery, (response) => {
                                        //         var hazardsNode = dojo.byId('hazards_' + chemical.attributes.OBJECTID);
                                        //         var hazards = [];
                                        //         dojo.forEach(response[chemical.attributes.OBJECTID].features, function (hazard, j) {
                                        //             hazards.push(hazard.attributes.category);
                                        //         });
                                        //         hazardsNode.innerHTML = '<td>Hazard(s): ' + hazards.join(", ") + '</td>';
                                        //     });
                                        // }


                                        e[chemical.attributes.OBJECTID].features.forEach((chemical_location, j) => {
                                            //         this.chemicalInfo.push(
                                            //     <div>
                                            //
                                            //         <tr>
                                            //             <td>Location: {e[chemical.attributes.OBJECTID].attributes.StorageLocation ? e[chemical.attributes.OBJECTID].attributes.StorageLocation : 'Not Reported'}</td>
                                            //         </tr>
                                            //         <tr>
                                            //             <td>Container: {e[chemical.attributes.OBJECTID].attributes.ContainerType ? e[chemical.attributes.OBJECTID].attributes.ContainerType : 'Not Reported'}</td>
                                            //         </tr>
                                            //     </div>
                                            // )
                                            let chemLocInfo = []
                                            var location_number = j + 1;
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
                                            this.chemicalInfo.push(...newChemInfo);
                                            this.setState({
                                                chemicalInfo: this.chemicalInfo,
                                            });
                                        });

                                        // this.chemicalInfo.push(...newChemInfo);
                                        this.setState({
                                            chemicalInfo: this.chemicalInfo,
                                        });
                                        this.ChemicalsText();
                                    }, function (e) {
                                        console.log("Error: " + e);
                                    });
                                    // promises.push(chemLocPromise);
                                } else {
                                    this.chemicalInfo.push(...newChemInfo);
                                    this.setState({
                                        chemicalInfo: this.chemicalInfo,
                                    });
                                    this.ChemicalsText();
                                }
                                // this.chemicalInfo.push(...newChemInfo);
                                // this.setState({
                                //     chemicalInfo: this.chemicalInfo,
                                // });
                                // this.ChemicalsText();
                            });
                        }, function (e) {
                            console.log("Error: " + e);
                        });
                        // promises.push(chemicalsPromise);

                    } else {
                        this.loading = false;
                        this.setState({
                            loading: this.loading,
                        });
                    }
                    // Promise.all(promises).then(() => {
                    //     console.log('all resolved')
                    //     this.multipleLocations = false;
                    //     this.loading = false;
                    //     this.setState({
                    //         // contactInfo: this.contactInfo,
                    //         // chemicalInfo: this.chemicalInfo,
                    //         loading: this.loading,
                    //     });
                    //     // this.ContactsText();
                    //     // this.ChemicalsText();
                    // });
                    return
                }
            }
        );

        //
        // Promise.all(promises).then(() => {
        //     this.multipleLocations = false;
        //     // this.loading = false;
        //     // this.setState({
        //     //     contactInfo: this.contactInfo,
        //     // });
        //     // this.ContactsText();
        //     // this.setState({
        //     //     loading: this.loading,
        //     // });
        // })

    }

    render() {
        return (
            <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto", height: "97%"}}>
                <this.NothingFound/>
                {this.loading ? <h2 style={{background: 'white'}}>Loading...</h2> :
                    <div>
                        <this.Grid/>
                        <this.FacilityText/>
                        <this.ContactsText/>
                        {/*{this.contactInfo}*/}
                        <this.ChemicalsText/>
                    </div>
                }

                {this.mainText ? this.LandingText() : null}
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        )
    }

}
