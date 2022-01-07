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
import type {Column, SortColumn} from "react-data-grid";
import {useState} from "react";
import {Sort} from "../../../../../jimu-ui/advanced/lib/sql-expression-builder/styles";
// import {useMemo, useState} from "React";

// interface Row {
//     // OBJECTID?: number,
//     // // if we have a facility
//     // CameoID?: any,
//     // EPAFacilityID?: string,
//     // Facility4DigitZipExt?: string,
//     // FacilityCity?: string,
//     // FacilityCountyFIPS?: string,
//     // FacilityLatDecDegs?: number,
//     // FacilityLongDecDegs?: number,
//     // FacilityName?: string,
//     // FacilityState?: string,
//     // FacilityStr1?: string,
//     // FacilityStr2?: string,
//     // FacilityZipCode?: string,
//     // MarplotID?: any,
//     // RMPID?: number,
//     // Status?: string,
//
//
// }
//
// function getComparator(sortColumn: string) {
//     switch (sortColumn) {
//         case 'FacilityName':
//             return (a, b) => {
//                 return a[sortColumn].localeCompare(b[sortColumn]);
//             };
//         case 'CompletionCheckDate':
//             return (a, b) => {
//                 // @ts-ignore
//                 return new Date(a[sortColumn]) - new Date(b[sortColumn]);
//             };
//         default:
//             throw new Error(`unsupported sortColumn: "${sortColumn}"`);
//     }
// }
//
export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, {
    jimuMapView: JimuMapView, loading: boolean, attributes: any, facilities: any,
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

    constructor(props) {
        super(props);
        // bind this to class methods
        this.loadRelated = this.loadRelated.bind(this);
        this.loadFeature = this.loadFeature.bind(this);
    }

    componentDidMount() {
        this.tierIILayer = new MapImageLayer({
            url: "https://utility.arcgis.com/usrsvcs/servers/ea77cd05c98e44a98fdaddc83948015d/rest/services/EPA_EPCRA/TierIIFacilities_new_dev/MapServer"
        });
        // url for new service layer https://utility.arcgis.com/usrsvcs/servers/ea77cd05c98e44a98fdaddc83948015d/rest/services/EPA_EPCRA/TierIIFacilities_new_dev/MapServer
        this.symbol = new SimpleMarkerSymbol({color: 'yellow', style: 'diamond'});

        this.graphicsLayer = new GraphicsLayer();

        this.jmv.view.map.add(this.graphicsLayer);
        this.tierIILayer.load();
        this.tierIILayer.loadAll().then(() => {
            this.tierIILayer.sublayers.forEach(lyr => {
                lyr.createFeatureLayer().then(res => {
                    res.load();
                    res.when(() => {
                        this.loadRelated(res);
                    });
                })
            });
            this.jmv.view.map.add(this.tierIILayer)
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


    componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView; }>, snapshot?: any) {
        let widgetState: WidgetState;
        widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;

        // do anything on open/close of widget here
        if (widgetState == WidgetState.Opened) {
            if (this.first) {

            }
            this.first = false;
        } else {
            this.first = true;

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
                <h5 id="refresh_date"></h5>
                <br/>Click Facility to view information.
                <br/><br/><h5 style={{textDecoration: "underline"}}>RMP Program Levels</h5>
                <br/><u>Program Level 1</u>: Processes which would not affect the public in the case of a worst-case
                release (in the language of Part 68, processes “with no public receptors
                within the distance to an endpoint from a worst-case release”) and with no accidents with specific
                offsite consequences within the past five years are eligible for
                Program 1, which imposes limited hazard assessment requirements and minimal prevention and emergency
                response requirements.
                <br/><br/><u>Program Level 2</u>: Processes not eligible for Program 1 or subject to Program 3 are
                placed in Program 2, which imposes streamlined prevention program requirements,
                as well as additional hazard assessment, management, and emergency response requirements.
                <br/><br/><u>Program Level 3</u>: Processes not eligible for Program 1 and either subject to OSHA's PSM
                standard under federal or state OSHA programs or classified in
                one of ten specified North American Industrial Classification System (NAICS) codes are placed in Program
                3, which imposes OSHA’s PSM standard as the prevention program
                as well as additional hazard assessment, management, and emergency response requirements.
                <br/><br/><h5 style={{textDecoration: "underline"}}>Dataset Notes</h5>
                This dataset was created directly from the RMP Access databases obtained from CDX RMP*Info data flow.
                This widget only displays parts of the RMP dataset.
                For the full dataset please see the RMP*Review Application. In processing this dataset we used validated
                RMP locations<sup>1</sup> first, FRS locations<sup>2</sup> second and unvalidated RMP locations last.
                Any available metadata about these locations are displayed (method, description, accuracy, etc). Only
                locations from the most recently-submitted RMP were used.
                <br/><br/><sup>1</sup>RMP validates locations by verifying they are inside bounding box coordinates
                corresponding to the county in which the facility exists.
                <br/><br/><sup>2</sup>For information on FRS locations see the <a
                href={"https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BB158161D-F639-4A93-BF7C-D454C80F7C92%7D"}
                target="_blank">metadata
                in the EDG.</a>
            </div>
        )
    }

    FacilityText = () => {
        return (
            <div>

            </div>
        )
    }

    mapClick = (e) => {
        this.loading = true;
        this.setState({
            loading: this.loading
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

        this.facilities.queryFeatures(featureQuery, function (featureSet) {
            if (featureSet.features.length === 1) {
                this.loadFeature(featureSet.features[0]);
                noneFound.push(false);
            } else if (featureSet.features.length > 1) {
                mapIdNode.innerHTML = '<h3>Multiple Facilities at that location</h3><br/><h5>Select one to continue</h5>' +
                    '<div id="gridDiv" style="width:100%;"></div>';
                var data = {
                    identifier: 'OBJECTID',
                    items: []
                };
                dojo.forEach(featureSet.features, function (feature) {
                    var attrs = dojo.mixin({}, feature.attributes);
                    data.items.push(attrs);
                });

                var store = new ItemFileWriteStore({data: data});
                store.data = data;

                var grid = dijit.byId("grid");

                if (grid !== undefined) {
                    grid.destroy();
                }

                // these attributes could be different for each state
                // the this.config.state object helps you identify which state you are working with
                if (service.config.state.abbr === 'AZ') {
                    var layout = [
                        {'name': '', 'field': 'NAME', 'width': '100%'}
                    ];
                } else {
                    var layout = [
                        {'name': '', 'field': 'FacilityName', 'width': '100%'}
                    ];
                }

                grid = new DataGrid({
                    id: 'grid',
                    store: store,
                    structure: layout,
                    //rowSelector: '20px',
                    autoHeight: true
                });

                grid.placeAt("gridDiv");

                grid.on('RowClick', function (e) {
                    var rowItem = grid.getItem(e.rowIndex);
                    var facility = array.filter(featureSet.features, function (feature) {
                        return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
                    });
                    loadFeature(facility[0], service);
                });

                grid.startup();
                this.loadingShelter.hide();
                noneFound.push(false);
            } else {
                noneFound.push(true);
            }
            if (noneFound.length === this.services.length) {
                var wasfound = array.filter(noneFound, function (found) {
                    return found === false;
                });
                if (wasfound.length === 0) {
                    mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
                    this.loadingShelter.hide();
                }
            }
        });

    }

    rowKeyGetter(row) {
        return row;
    }

    rowClick(row) {


    }

    // Grid()
    //     {
    //
    //     return (
    //         <div>
    //             {this.multipleLocations ? <h3>Multiple Facilities at that Location <br/>
    //             </h3> : this.multipleRMPs ?
    //                 <h3>Multiple RMPs Found for {this.attributes.FacilityName} <h4 id="facilityStatus">
    //                     {this.facilityStatus}
    //                 </h4><br/></h3> : null}
    //             <h5>Select one to continue</h5>
    //             <DataGrid style={{height: `${(this.rows.length * 35) + 37}px`, maxHeight: "700px"}}
    //                       columns={this.columns} rows={this.rows} onRowClick={this.rowClick}
    //                       rowKeyGetter={this.rowKeyGetter} defaultColumnOptions={{
    //                 sortable: true,
    //                 resizable: true
    //             }} onSortColumnsChange={this.onSortColsChange} sortColumns={this.sortColumns}/>
    //         </div>
    //     )
    // }
    //
    // onSortColsChange(cols) {
    //     if (cols.length === 0) {
    //         return this.rows
    //     }
    //
    //     this.sortColumns = cols.slice(-1);
    //
    //
    //     // this.columns = this.loadColumns(newCols);
    //
    //     let sortedRows = [...this.rows];
    //     sortedRows.sort((a, b) => {
    //         for (let col of cols) {
    //
    //             let comparator = getComparator(col.columnKey);
    //             let res = comparator(a, b);
    //             if (res !== 0) {
    //                 // if (col.direction === 'ASC') {
    //                 return col.direction === 'ASC' ? res : -res;
    //                 //     return res;
    //                 // } else if (col.direction === 'DESC') {
    //                 //     return -res;
    //                 // }
    //             }
    //
    //         }
    //         return 0;
    //     });
    //
    //
    //     this.rows = sortedRows;
    //     this.setState({
    //         rows: this.rows,
    //         sortColumns: this.sortColumns
    //         // columns: this.columns,
    //     });
    //     return sortedRows
    // }
    //
    // loadColumns(columns: any[]): readonly Column<Row>[] {
    //     return [
    //         SelectColumn,
    //         {key: 'FacilityName', name: 'Name'},
    //         {key: 'CompletionCheckDate', name: 'Date'}
    //     ]
    // }
    //
    // numberFormatter(number: string | number) {
    //     if (typeof number == "string") {
    //         return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    //     } else {
    //         return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    //     }
    // }

    loadFeature(feature) {
        this.loading = true;
        this.setState({
            loading: this.loading
        });
        let promises = [];
        this.attributes = feature.attributes;
        let selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol});
        this.graphicsLayer.add(selectedGraphic);

        // need to customize this for state specific attributes
        // if (service.config.state.abbr === 'NV') {
        //   mapIdNode.innerHTML = '<h1>' + attributes.facilityName + '</h1><br/>' +
        //     '<table><tbody id="tierii_facility">' +
        //     '<tr><td>Physical Address: ' + attributes.street_address + ', ' + attributes.street_city + '</td></tr>' +
        //     '<tr><td>Subject to Chemical Accident Prevention: ' + attributes.subjectToChemAccidentPreventio === "true" ? 'Yes': 'No' + '</td></tr>' +
        //     '<tr><td>Subject to Emergency Planning: ' + attributes.subjectToEmergencyPlanning === "true" ? 'Yes': 'No' + '</td></tr>' +
        //     '<tr><td>Manned: ' + attributes.manned + '</td></tr>' +
        //     '<tr><td>Max Occupants: ' + attributes.maxNumOccupants + '</td></tr>' +
        //     // '<tr><td>Type: ' + attributes.Facility_Type + '</td></tr>' +
        //     // '<tr><td>Nature of Business: ' + attributes.Nature_of_Business + '</td></tr>' +
        //     // '<tr><td>Company Name: ' + attributes.Company_Name + '</td></tr>' +
        //     '</tbody></table>' +
        //     // '<h3 style="text-decoration: underline;">Contact(s)</h3>' +
        //     // '<table><tbody id="tierii_contacts">' +
        //     // '<tr><td>Owner/Operator: ' + attributes.Owner_Operator_Name + '</td></tr>' +
        //     // '<tr><td>Phone: ' + (attributes.Owner_Operator_Phone ? attributes.Owner_Operator_Phone : 'Not Reported') + '</td></tr>' +
        //     // '<tr><td>Email: ' + (attributes.Owner_Operator_Email ? attributes.Owner_Operator_Email : 'Not Reported') + '</td></tr>' +
        //     '</tbody></table>' +
        //     '<h3 style="text-decoration: underline;">Chemical(s)</h3>' +
        //     '<table><tbody id="tierii_contacts"></tbody></table>';
        //     '<table><tbody id="tierii_chemicals"></tbody></table>';
        // } else

        if (service.config.state.abbr === 'AZ') {
            mapIdNode.innerHTML = '<h1>' + attributes.NAME + '</h1><br/>' +
                '<table><tbody id="tierii_facility">' +
                '<tr><td>Physical Address: ' + attributes.ADDRESS + ', ' + attributes.CITY + '</td></tr>' +
                '<tr><td>Fire District: ' + (attributes.FD ? attributes.FD : 'Not Reported') + '</td></tr>' +
                '<tr><td>Email: ' + (attributes.EMAIL ? attributes.EMAIL : 'Not Reported') + '</td></tr>' +
                '<tr><td>Phone: ' + (attributes.PHONE ? attributes.PHONE : 'Not Reported') + '</td></tr>' +
                '</tbody></table>';
        } else {
            // todo: need to look at records to see what is available for CA, NV an dHI
            mapIdNode.innerHTML = '<h1>' + attributes.FacilityName + '</h1><br/>' +
                '<table><tbody id="tierii_facility">' +
                '<tr><td>Physical Address: ' + attributes.StreetAddress + ', ' + attributes.City + '</td></tr>' +
                '<tr><td>Fire District: ' + (attributes.FireDistrict ? attributes.FireDistrict : 'Not Reported') + '</td></tr>' +
                (attributes.Manned ? '<tr><td>' + (attributes.Manned === 'true' ? 'Max Occupants: ' : 'Manned: No') + (attributes.MaxNumOccupants ? attributes.MaxNumOccupants : '') + '</td></tr>' : '') +
                (attributes.SubjectToChemAccidentPrevention ? '<tr><td>Subject to Chemical Accident Prevention: ' + (attributes.SubjectToChemAccidentPrevention === 'true' ? 'Yes' : 'No') + '</td></tr>' : '') +
                (attributes.SubjectToEmergencyPlanning ? '<tr><td>Subject to Emergency Planning: ' + (attributes.SubjectToEmergencyPlanning === 'true' ? 'Yes' : 'No') + '</td></tr>' : '') +
                '</tbody></table>' +
                '<h3 style="text-decoration: underline;">Contacts</h3>' +
                '<table><tbody id="tierii_contacts"></tbody></table>' +
                '<h3 style="text-decoration: underline;">Chemicals</h3>' +
                '<table><tbody id="tierii_chemicals"></tbody></table>';
        }

        // HI specific data attributes/format
        if (service.config.state.abbr === 'HI') {
            // deal with boolean tables
            if (attributes.SubjectToChemAccidentPreventi_1 === 'T') {
                var row = '<tr><td>Subject to Chemical Accident Prevention: No</td></tr>';
            } else if (attributes.SubjectToChemAccidentPrevention === 'T') {
                var row = '<tr><td>Subject to Chemical Accident Prevention: Yes</td></tr>';
            } else {
                var row = '<tr><td>Subject to Chemical Accident Prevention: Unknown</td></tr>';
            }
            domConstruct.place(row, "tierii_facility");

            if (attributes.SubjectToEmergencyPlanning_Y === 'T') {
                var row = '<tr><td>Subject to Emergency Planning: Yes</td></tr>';
            } else if (attributes.SubjectToEmergencyPlanning_N === 'T') {
                var row = '<tr><td>Subject to Emergency Planning: No</td></tr>';
            } else {
                var row = '<tr><td>Subject to Emergency Planning: Unknown</td></tr>';
            }
            domConstruct.place(row, "tierii_facility");

            if (attributes.Manned_Y === 'T') {
                var row = '<tr><td>Manned: Yes</td></tr>' +
                    '<tr><td>Max Occupants: ' + (attributes.MaxNumOccupants ? attributes.MaxNumOccupants : 'Unknown') + '</td></tr>';
            } else if (attributes.Manned_N === 'T') {
                var row = '<tr><td>Manned: No</td></tr>';
            } else {
                var row = '<tr><td>Manned: No</td></tr>';
            }
            domConstruct.place(row, "tierii_facility");
        }

        // if contacts are available get them
        if (service.config.contacts.relationshipId !== 'none' && service.config.contacts.relationshipId !== undefined && service.config.contacts !== undefined && service.config.state !== 'GU') {
            var contactQuery = new RelationshipQuery();
            // GET CONTACTS
            contactQuery.outFields = ['*'];
            //dojo.forEach(service.facilities.relationships, function (relationship, i) {
            // Facilities to Contacts relationship ID
            contactQuery.relationshipId = service.config.contacts.relationshipId;
            contactQuery.objectIds = [attributes.OBJECTID];
            service.facilities.queryRelatedFeatures(contactQuery, function (e) {
                dojo.forEach(e[attributes.OBJECTID].features, function (contact, i) {

                    if (service.config.state.abbr !== 'GU') {
                        var contactPhonesQuery = new RelationshipQuery();

                        contactPhonesQuery.outFields = ['*'];
                        // contacts to phone relationship id
                        contactPhonesQuery.relationshipId = service.config.contacts.phones.relationshipId;
                        contactPhonesQuery.objectIds = [contact.attributes.OBJECTID];

                        service.contacts.queryRelatedFeatures(contactPhonesQuery, function (f) {
                            // these attributes could be different for each state
                            // the service.config.state object helps you identify which state you are working with
                            var row = domConstruct.toDom('<tr><td style="padding-top: 10px;"><b>' + (contact.attributes.Title ? contact.attributes.Title + ': ' : '') +
                                (contact.attributes.FirstName ? contact.attributes.FirstName : '') +
                                ' ' + (contact.attributes.LastName ? contact.attributes.LastName : '') +
                                (contact.attributes.FirstName && contact.attributes.LastName ? '' : 'Not Reported') + '</b></td></tr>');
                            domConstruct.place(row, "tierii_contacts");

                            var row = domConstruct.toDom('<tr><td>Email: ' + (contact.attributes.Email ? contact.attributes.Email : 'Not Reported') + '</td></tr>');
                            domConstruct.place(row, "tierii_contacts");

                            if (f.hasOwnProperty(contact.attributes.OBJECTID)) {
                                dojo.forEach(f[contact.attributes.OBJECTID].features, function (contact_phone_feature, j) {
                                    var row = domConstruct.toDom('<tr><td>' + (contact_phone_feature.attributes.Type ? contact_phone_feature.attributes.Type + ': ' : '')
                                        + (contact_phone_feature.attributes.Phone ? contact_phone_feature.attributes.Phone : '') + '</td></tr>');
                                    domConstruct.place(row, "tierii_contacts");
                                });
                            }
                            this.loadingShelter.hide();
                        }, function (e) {
                            console.log("Error: " + e);
                        });
                    } else if (service.config.state.abbr === 'GU') {
                        var row = domConstruct.toDom('<tr><td style="padding-top: 10px;"><b>' + (contact.attributes.Title ? contact.attributes.Title + ': ' : '') +
                            (contact.attributes.Name ? contact.attributes.Name : 'Not Reported') + '</b></td></tr>');
                        domConstruct.place(row, "tierii_contacts");

                        var row = domConstruct.toDom('<tr><td>Phone: ' + (contact.attributes.Phone ? contact.attributes.Phone : 'Not Reported') + '</td></tr>');
                        domConstruct.place(row, "tierii_contacts");

                        var row = domConstruct.toDom('<tr><td>24 HR Phone: ' + (contact.attributes.HR24Phone ? contact.attributes.HR24Phone : 'Not Reported') + '</td></tr>');
                        domConstruct.place(row, "tierii_contacts");
                    }
                });
            }, function (e) {
                console.log("Error: " + e);
            });
        } else {
            this.loading = false;
            this.setState({
                loading: this.loading
            })
        }

        if (service.config.chemicals.relationshipId !== 'none' && service.config.chemicals.relationshipId !== undefined && service.config.chemicals !== undefined) {
            // GET CHEMICALS
            var chemicalQuery = new RelationshipQuery();
            chemicalQuery.outFields = ['*'];
            // facilities to chemicals relationship ID
            chemicalQuery.relationshipId = service.config.chemicals.relationshipId;
            chemicalQuery.objectIds = [this.attributes.OBJECTID];

            service.facilities.queryRelatedFeatures(chemicalQuery, (e) => {
                dojo.forEach(e[attributes.OBJECTID].features, function (chemical, i) {
                    // these attributes could be different for each state
                    // the service.config.state object helps you identify which state you are working with
                    // if (service.config.state.abbr === 'NV') {
                    //   var row = domConstruct.toDom(
                    //     '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.Chemical_Name
                    //     + (chemical.attributes.CAS_Number ? ' (' + chemical.attributes.CAS_Number + ')' : '') + '</b></td></tr>' +
                    //     '<tr><td>Mixture: ' + (chemical.attributes.Mixture_Chemical_Name ? chemical.attributes.Mixture_Chemical_Name : 'Not Reported') +
                    //     (chemical.attributes.Mixture_CAS_Number ? ' (' + chemical.attributes.Mixture_CAS_Number + ')' : '') + '</td></tr>' +
                    //     '<tr><td>Location: ' + (chemical.attributes.Storage_Location ? chemical.attributes.Storage_Location : 'Not Reported') + '</td></tr>' +
                    //     '<tr><td>Max Dailly Amount: ' + (chemical.attributes.Maximum_Daily_Amount ? chemical.attributes.Maximum_Daily_Amount : 'Not Reported') + '</td></tr>' +
                    //     '<tr><td>Largest Container: ' + (chemical.attributes.Maximum_Amt___Largest_Container ? chemical.attributes.Maximum_Amt___Largest_Container : 'Not Reported') + '</td></tr>' +
                    //     '<tr><td>Avg Dailly Amount: ' + (chemical.attributes.Average_Daily_Amount ? chemical.attributes.Average_Daily_Amount : 'Not Reported') + '</td></tr>'
                    //   );
                    //   domConstruct.place(row, "tierii_chemicals");
                    // }
                    if (service.config.state.abbr === 'GU') {
                        var row = domConstruct.toDom(
                            '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.Chemical
                            + (chemical.attributes.CASCode ? ' (' + chemical.attributes.CASCode + ')' : '') + '</b></td></tr>' +
                            '<tr><td>Location: ' + (chemical.attributes.StorageLocation ? chemical.attributes.StorageLocation : 'Not Reported') + '</td></tr>' +
                            '<tr><td>Max Dailly Amount: ' + (chemical.attributes.MaxDailyAmount ? chemical.attributes.MaxDailyAmount : 'Not Reported') + '</td></tr>' +
                            '<tr><td>Avg Dailly Amount: ' + (chemical.attributes.AvgDailyAmount ? chemical.attributes.AvgDailyAmount : 'Not Reported') + '</td></tr>' +
                            '<tr><td>Container: ' + (chemical.attributes.ContainerType ? chemical.attributes.ContainerType : 'Not Reported') + '</td></tr>'
                        );
                        domConstruct.place(row, "tierii_chemicals");
                        this.loadingShelter.hide();
                    } else if (service.config.chemicals.locations !== undefined && service.config.chemicals.locations.relationshipId !== 'none') {

                        var chemicalLocationQuery = new RelationshipQuery();

                        chemicalLocationQuery.outFields = ['*'];
                        // chemicals to chemical locations relationship id
                        chemicalLocationQuery.relationshipId = service.config.chemicals.locations.relationshipId;
                        chemicalLocationQuery.objectIds = [chemical.attributes.OBJECTID];

                        service.chemicals.queryRelatedFeatures(chemicalLocationQuery, (e) => {
                            // these attributes could be different for each state
                            // the service.config.state object helps you identify which state you are working with
                            if (service.config.state.abbr === 'HI') {
                                var row = domConstruct.toDom(
                                    '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.EnteredChemName
                                    + (chemical.attributes.CiCAS ? ' (' + chemical.attributes.CiCAS + ')' : '') + '</b></td></tr>' +
                                    '<tr><td>Days: ' + chemical.attributes.DaysOnSite + '</td></tr>'
                                );
                                domConstruct.place(row, "tierii_chemicals");
                            } else if (service.config.state.abbr === 'CA' || service.config.state.abbr === 'NV') {
                                var row = domConstruct.toDom(
                                    '<tr><td style="padding-top: 10px;"><b>' + chemical.attributes.chemical_name
                                    + (chemical.attributes.cas_code ? ' (' + chemical.attributes.cas_code + ')' : '') + '</b></td></tr>' +
                                    '<tr><td>Days: ' + chemical.attributes.DaysOnSite + '</td></tr>'
                                );
                                domConstruct.place(row, "tierii_chemicals");
                            }

                            var row = domConstruct.toDom(
                                '<tr><td>Max Amount: ' + (chemical.attributes.MaxAmount ? chemical.attributes.MaxAmount + ' lbs' : "Not Reported") + '</td></tr>' +
                                '<tr><td>Max Amount Range: ' + (chemical.attributes.MaxAmountCode ? service.chemicals.getDomain("MaxAmountCode").getName(chemical.attributes.MaxAmountCode) : 'Not Reported') + '</td></tr>' +
                                '<tr><td>Max Amount Container: ' + (chemical.attributes.MaxAmountContainer ? chemical.attributes.MaxAmountContainer : "Not Reported") + '</td></tr>' +
                                '<tr><td>Average Amount: ' + (chemical.attributes.AveAmount ? chemical.attributes.AveAmount + ' lbs' : "Not Reported") + '</td></tr>' +
                                '<tr><td>Average Amount Range: ' + (chemical.attributes.AveAmountCode ? service.chemicals.getDomain("AveAmountCode").getName(chemical.attributes.AveAmountCode) : 'Not Reported') + '</td></tr>'
                            );

                            domConstruct.place(row, "tierii_chemicals");

                            var states = null;
                            if (chemical.attributes.Gas === 'T') {
                                states = 'Gas';
                            }
                            if (chemical.attributes.Solid === 'T') {
                                states ? states += ', Solid' : states = 'Solid';
                            }
                            if (chemical.attributes.Liquid === 'T') {
                                states ? states += ', Liquid' : states = 'Liquid';
                            }
                            if (states === null) {
                                states = 'Not Reported';
                            }
                            var row = domConstruct.toDom('<tr><td>State(s): ' + states + '</td></tr>');
                            domConstruct.place(row, 'tierii_chemicals');

                            var hazards = null;
                            if (chemical.attributes.Fire === 'T') {
                                hazards = 'Fire';
                            }
                            if (chemical.attributes.Pressure === 'T') {
                                hazards = (hazards ? hazards += ', Sudden Release of Pressure' : 'Sudden Release of Pressure');
                            }
                            if (chemical.attributes.Reactive === 'T') {
                                hazards = (hazards ? hazards += ', Reactive' : 'Reactive');
                            }
                            if (chemical.attributes.Acute === 'T') {
                                hazards = (hazards ? hazards += ', Acute' : 'Acute');
                            }
                            if (chemical.attributes.Chronic === 'T') {
                                hazards = (hazards ? hazards += ', Chronic' : 'Chronic');
                            }
                            if (hazards === null) {
                                hazards = 'Not Reported';
                            }
                            var row = domConstruct.toDom('<tr id="hazards_' + chemical.attributes.OBJECTID + '"><td>Hazard(s): ' + hazards + '</td></tr>');
                            domConstruct.place(row, 'tierii_chemicals');

                            if (service.config.state.abbr === 'NV') {
                                var chemicalHazardsQuery = new RelationshipQuery();

                                chemicalHazardsQuery.outFields = ['*'];
                                // chemicals to chemical locations relationship id
                                chemicalHazardsQuery.relationshipId = service.config.chemicals.hazards.relationshipId;
                                chemicalHazardsQuery.objectIds = [chemical.attributes.OBJECTID];
                                service.chemicals.queryRelatedFeatures(chemicalHazardsQuery, (response) => {
                                    var hazardsNode = dojo.byId('hazards_' + chemical.attributes.OBJECTID);
                                    var hazards = [];
                                    dojo.forEach(response[chemical.attributes.OBJECTID].features, function (hazard, j) {
                                        hazards.push(hazard.attributes.category);
                                    });
                                    hazardsNode.innerHTML = '<td>Hazard(s): ' + hazards.join(", ") + '</td>';
                                });
                            }


                            dojo.forEach(e[chemical.attributes.OBJECTID].features, (chemical_location, j) => {
                                var location_number = j + 1;
                                var row = domConstruct.toDom(
                                    '<tr><td>-------------------</td></tr>' +
                                    '<tr><td>Location #' + location_number + ': ' + (chemical_location.attributes.Location ? chemical_location.attributes.Location : 'Not Reported') + '</td></tr>' +
                                    '<tr><td>Location #' + location_number + ' Type: ' + (chemical_location.attributes.LocationType ? chemical_location.attributes.LocationType : 'Not Reported') + '</td></tr>' +
                                    '<tr><td>Location #' + location_number + ' Pressure: ' + (chemical_location.attributes.LocationPressure ? chemical_location.attributes.LocationPressure : 'Not Reported') + '</td></tr>' +
                                    '<tr><td>Location #' + location_number + ' Temp: ' + (chemical_location.attributes.LocationTemperature ? chemical_location.attributes.LocationTemperature : 'Not Reported') + '</td></tr>'
                                    // '<tr><td>Location #' + location_number + ' Amount: ' + (chemical_location.attributes.Amount ? chemical_location.attributes.Amount + ' ' + chemical_location.attributes.AmountUnit : 'Not Reported') + '</td></tr>'
                                );
                                domConstruct.place(row, "tierii_chemicals");

                            });
                            this.loading = false;
                            this.setState({
                                loading: this.loading,
                            });
                        }, function (e) {
                            console.log("Error: " + e);
                        });
                    }
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
    }

    render() {
        return (

            <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto", height: "97%"}}>
                {/*<this.Grid/>*/}
                {this.loading ? <h2 style={{background: 'white'}}>Loading...</h2> :
                    <div>

                    </div>
                }
                {this.mainText ? this.LandingText() : null}
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        )
    }
}
