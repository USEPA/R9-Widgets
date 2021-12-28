import {React, AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState} from "jimu-core";
import {IMConfig} from "../config";
import {JimuMapView, JimuMapViewComponent} from "jimu-arcgis";
import {Component} from 'react';
import PictureMarkerSymbol from "esri/symbols/PictureMarkerSymbol";
import MapImageLayer from "esri/layers/MapImageLayer";
import DataGrid from "react-data-grid";
import Query from "esri/rest/support/Query";
import SpatialReference from "esri/geometry/SpatialReference";
import query from "esri/rest/query";
import geometryEngine from "esri/geometry/geometryEngine";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Extent from "esri/geometry/Extent";
import Sublayer from "esri/layers/support/Sublayer";
import RelationshipQuery from "esri/rest/support/RelationshipQuery";
import Graphic from "esri/Graphic";
import FeatureLayer from "esri/layers/FeatureLayer";
import moment from "Moment";
import {Modal} from "jimu-ui"
import FeatureTable from "esri/widgets/FeatureTable";
import {DataSourceSelectionGuide} from "../../../../../jimu-ui/basic/lib/guide";
import FeatureSet from "esri/tasks/support/FeatureSet";
import SimpleMarkerSymbol from "esri/symbols/SimpleMarkerSymbol";


export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, {
    jimuMapView: JimuMapView, landingText: string, mainText: boolean, mapIdNode: any,
    columns: any, rows: any, rmpGridClick: boolean, attributes: any, erTextAttr: any,
    location_string: any[], facilityStatus: any[], accidentText: any[], processText: any[],
    process: any, naicsText: any, accidentChems: any, nothingThere: any[],
}> {

    jmv: JimuMapView;
    rmpLayer: MapImageLayer;
    symbol: any;
    mainText: boolean = true;
    first: boolean = false;
    r9Geom: any;
    graphicLayer: GraphicsLayer;
    facilities: any;
    currentFacility: any;
    tblS1Facilities: any;
    baseurl = "https://utility.arcgis.com/usrsvcs/servers/a9dda0a4ba0a433992ce3bdffd89d35a/rest/services/SharedServices/RMPFacilities/MapServer";
    multipleRMPs: boolean = false;
    executiveSummaryDialog;
    mapIdNode: () => JSX.Element;
    tblS1Processes: any;
    tblS9EmergencyResponses: any;
    ExecutiveSummaries: any;
    attributes: any;
    columns: any[] = [];
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
    nothingThere: any[] = []

    constructor(props) {
        super(props);
        this.mainText = true;
        // bind this to class methods
        this.Facility = this.Facility.bind(this);
        this.EmerRespPlan = this.EmerRespPlan.bind(this);
        this.Grid = this.Grid.bind(this);
        this.rowClick = this.rowClick.bind(this);
        this.LocationMetadata = this.LocationMetadata.bind(this);
        this.Accidents = this.Accidents.bind(this);
        this.Process = this.Process.bind(this);
        this.NothingFound = this.NothingFound.bind(this);
    }

    componentDidMount() {
        this.rmpLayer = new MapImageLayer({
            url: "https://utility.arcgis.com/usrsvcs/servers/a9dda0a4ba0a433992ce3bdffd89d35a/rest/services/SharedServices/RMPFacilities/MapServer",
        });

        // this.symbol = new PictureMarkerSymbol({
        //     url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAUCAYAAABbLMdoAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAdtJREFUKJGV0k9Ik3Ecx/H3nn71iASyp12cE4KxUxaIPM9kzG0wUBSkf3jaoKgovChdwg6dOghCh6JLEHlZl3BpMHFrPj4oKKQM8fDAXORh2HaRnaL4wWwdBtY2V/S9fb+8+MLv8/0J/qNE8yCbRanVeDM8zO1/YuDl6iq3Nja6l0Kh8lJbnMuhra1x3+mEg4Pya6A9LpVIKgpnJidhbo4Lpqk+jUblkxa8uYmeThOJx6GrC0ZGYHdXPtrZYVbX+d6Ai0Xe9faCz1fvDQMsi3NHR7wFrp/g9XXtTipVuTg1BQ5HHXd0wNgYpNNc3d7GZxh8Ftksyv5+5fnAAHg8jbH094Nl4SgW1STIK0II9WGhIM9PT7dmKAREIrC4KC9vbeEVnZ3yldvNrG1ztnlzrQa5HPT1UQoE+CL8fr6Zpvosk5Ezug6a9hvn83B4CKOjxE8eGI3Kx/PzPDBNnBMTdXh8DMvLYBjqp6EhaTVE5/V230ulyslAAHp6YG8PqlV+ut3yZstRQqHy+4UF1c5k5KVYrL7V7ydhGHw99dwej7xh2+QTCRwuFz8UhbsN6fzZDA5SWFnhg2lybXxcmwmHK9W2GMDlIhYMqh/D4cqLltybB/VPI4PN81Px3+oXm5WbogYCJW8AAAAASUVORK5CYII=',
        //     width: "11px",
        //     height: "20px"
        // });
        this.symbol = new SimpleMarkerSymbol({color: 'green'});

        this.graphicLayer = new GraphicsLayer();


        this.jmv.view.map.add(this.graphicLayer);
        this.rmpLayer.load();
        this.rmpLayer.loadAll().then((res) => {
            // console.log(res)
            this.jmv.view.map.add(this.rmpLayer);

            // this.facilities = this.rmpLayer.sublayers.find(lyr => {
            //
            //     return lyr.title === "Active RMP Facilities";
            //     // return lyr
            // });

            this.rmpLayer.sublayers.forEach(lyr => {
                if (lyr.title === "Active RMP Facilities") {
                    lyr.createFeatureLayer().then((res) => {
                        res.load();
                        res.when(() => {
                            this.loadRelated(res);
                            this.facilities = res;
                        });
                    });
                } else {
                    lyr.createFeatureLayer().then((res) => {
                        res.load();
                        res.when(() => {
                            this.loadRelated(res);
                        });
                    });
                }
            });
        });


        //  this.getGeometryUnion(this.boundaries.url, "STATE_ABBR='CA' OR STATE_ABBR='AZ' OR STATE_ABBR='NV'").then(res => {
        //     this.r9Geom = res;
        // });
    }

    onActiveViewChange = (jmv: JimuMapView) => {
        this.jmv = jmv;
        // this.jmv.view.map.layers.add(this.rmpLayer);
        if (jmv) {
            this.setState({
                jimuMapView: jmv
            });
            this.jmv.view.on("click", event => {
                this.mapClick(event)
            });
        }
    }

    loadRelated(obj) {
        obj.relationships.forEach((relationship) => {
            if (relationship.role === "origin") {
                this[relationship.name] = new FeatureLayer({url: this.baseurl + "/" + relationship.relatedTableId});
                this[relationship.name].relationshipId = relationship.id;
                this[relationship.name].load().then((e) => {
                    this[relationship.name] = e;
                    // note may need to redo this a little so it uses load() to feth the rest of the table sublayers
                    if (this[relationship.name].relationships.length > 0) {
                        this.loadRelated(this[relationship.name]);
                    }
                })
            }
        });
    };

    LandingText = () => {
        return (
            <div id="landingText" style={{overflow: 'auto'}}>
                <h5 id="refresh_date"></h5>
                <br/>Click Facility to view information.
                <br/><br/><h5 style={{textDecoration: 'underline'}}>RMP Program Levels</h5>
                <br/><u>Program Level 1</u>: Processes which would not affect the public in the case of a worst-case
                release (in the language of Part 68, processes “with no public receptors
                within the distance to an endpoint from a worst-case release”) and with no accidents with specific
                offsite consequences within the past five years are eligible for
                Program 1, which imposes limited hazard assessment requirements and minimal prevention and emergency
                response requirements.
                <br/><br/><u>Program Level 2</u>: Processes not eligible for Program 1 or subject to Program 3 are
                placed in Program 2, which imposes streamlined prevention program requirements,
                as well as additional hazard assessment, management, and emergency response requirements.
                <br/><br/><u>Program Level 3</u>: Processes not eligible for Program 1 and either subject to OSHA\'s
                PSM standard under federal or state OSHA programs or classified in
                one of ten specified North American Industrial Classification System (NAICS) codes are placed in
                Program 3, which imposes OSHA’s PSM standard as the prevention program
                as well as additional hazard assessment, management, and emergency response requirements.
                <br/><br/><h5 style={{textDecoration: 'underline'}}>Dataset Notes</h5>
                This dataset was created directly from the RMP Access databases obtained from CDX RMP*Info data
                flow. This widget only displays parts of the RMP dataset.
                For the full dataset please see the RMP*Review Application. In processing this dataset we used
                validated RMP locations<sup>1</sup> first, FRS locations<sup>2</sup> second and unvalidated RMP
                locations last.
                Any available metadata about these locations are displayed (method, description, accuracy, etc).
                Only locations from the most recently-submitted RMP were used.
                <br/><br/><sup>1</sup>RMP validates locations by verifying they are inside bounding box coordinates
                corresponding to the county in which the facility exists.
                <br/><br/><sup>2</sup>For information on FRS locations see the <a
                href={"https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BB158161D-F639-4A93-BF7C-D454C80F7C92%7D"}
                target="_blank">metadata in the EDG.</a>
            </div>
        )
    }

    componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView; landingText: string }>, snapshot?: any) {
        let widgetState: WidgetState;
        widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;

        if (widgetState == WidgetState.Opened) {

        } else {
            if (this.first) {

            }
        }
    }

    getGeometryUnion(layerUrl, queryWhere?, queryOutFields?, queryOurSR?) {
        let where = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '1=1';
        let outFields = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ['*'];
        let outSR = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 4326;

        let newQuery = new Query();
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
    private status_string: any;

    Facility() {
        if (this.attributes && !this.multipleRMPs) {
            if (Object.keys(this.attributes).length > 0) {
                return (
                    <div>
                        {this.multipleRMPs ?
                            <a id="backLink" style={{textDecoration: "underline", cursor: "pointer"}}> Back</a> : ''}
                        <h1> {this.attributes.FacilityName}</h1>
                        <h4 id="registration_status">Status: {this.status_string}</h4>
                        <table>
                            <tbody id="tierii_facility">
                            <tr>
                                <td>Address: <br/> {this.attributes.FacilityStr1}<br/> {this.attributes.FacilityStr2 ? this.attributes.FacilityStr2 +
                                    <br/> : ''}
                                    {this.attributes.FacilityCity + ', ' + this.attributes.FacilityState + ' ' + this.attributes.FacilityZipCode}
                                </td>
                            </tr>
                            <tr>
                                <td>Phone: {this.attributes.FacilityPhoneNumber ? this.attributes.FacilityPhoneNumber : 'Not Reported'}</td>
                            </tr>
                            <tr>
                                <td>Website: {this.attributes.FacilityURL ? this.attributes.FacilityURL : 'Not Reported'}</td>
                            </tr>
                            <tr>
                                <td>Email: {this.attributes.FacilityEmailAddress ? this.attributes.FacilityEmailAddress : 'Not Reported'}</td>
                            </tr>
                            <tr>
                                <td>Full Time Employees: {this.attributes.FTE}</td>
                            </tr>
                            <tr>
                                <td>RMP Completion
                                    Date: {moment(this.attributes.CompletionCheckDate).utc().toISOString().split('T')[0]}</td>
                            </tr>
                            <tr>
                                <td>Parent
                                    Company(s): {this.attributes.ParentCompanyName ? this.attributes.ParentCompanyName : 'Not Reported'} {this.attributes.Company2Name ? ', ' + this.attributes.Company2Name : ''}</td>
                            </tr>
                            <tr>
                                <td><a id="summaryLink" style={{textDecoration: "underline", cursor: "pointer"}}>View
                                    Executive Summary</a></td>
                            </tr>
                            </tbody>
                        </table>
                        <br/><h3 style={{textDecoration: "underline"}}>Contacts</h3>
                        <table>
                            <tbody>
                            <tr>
                                <td><b>Operator</b></td>
                            </tr>
                            <tr>
                                <td>Name: {this.attributes.OperatorName}</td>
                            </tr>
                            <tr>
                                <td>Phone: {this.attributes.OperatorPhone}</td>
                            </tr>
                            <tr>
                                <td><b>Emergency Contact</b></td>
                            </tr>
                            <tr>
                                <td>Name: {this.attributes.EmergencyContactName}</td>
                            </tr>
                            <tr>
                                <td>Title: {this.attributes.EmergencyContactTitle}</td>
                            </tr>
                            <tr>
                                <td>Phone: {this.attributes.EmergencyContactPhone} {this.attributes.EmergencyContactExt_PIN ? ' x' + this.attributes.EmergencyContactExt_PIN : ''}</td>
                            </tr>
                            <tr>
                                <td>24 HR Phone: {this.attributes.Phone24}</td>
                            </tr>
                            <tr>
                                <td></td>
                            </tr>
                            </tbody>
                        </table>
                        <table>
                            <tbody id="tierii_contacts"></tbody>
                        </table>
                    </div>
                )
            }
        } else {
            return null
        }
    }

    Process() {
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

    Accidents() {
        if (this.accidentText.length > 0 && !this.multipleRMPs) {
            return (
                <div>
                    <h3 style={{textDecoration: "underline"}}>Accidents</h3>
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

    EmerRespPlan() {
        if (this.erTextAttr) {
            return (
                <div>
                    <h3 style={{textDecoration: "underline"}}>Emergency Reponse Plan</h3>
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
                        {/*</td></tr>*/}
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
                                style={{paddingLeft: "10px"}}>Other: {this.erTextAttr.attributes.FR_OtherRegulation}</td>
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

    NothingFound() {
        if (this.nothingThere.length > 0) {
            return (<h2>{this.nothingThere}</h2>)
        } else {
            return null
        }
    }

    Grid() {
        if (this.multipleRMPs) {
            return (<div>
                    <h3>Multiple RMPs Found for {this.attributes.FacilityName}</h3>
                    <h4 id="facilityStatus">
                        {this.facilityStatus}
                    </h4><br/>
                    <h5>Select one to continue</h5>
                    <DataGrid columns={this.columns} rows={this.rows} onRowClick={this.rowClick}
                              rowKeyGetter={this.rowKeyGetter}/>
                    <br/><br/>
                </div>
            )
        } else {
            return null
        }
    }

    LocationMetadata() {
        if (this.location_string.length > 0 && this.multipleRMPs) {
            return (
                <div>
                    <div><h3 style={{textDecoration: "underline"}}>Location Metadata</h3><br/></div>
                    {this.location_string}
                </div>
            )
        } else {
            return null
        }
    }

    mapClick = (e) => {
        // clear it all
        this.rmpGridClick = false;
        this.processText = [];
        this.accidentText = [];
        this.naicsText = [];
        this.mainText = false;
        this.location_string = [];
        this.erTextAttr = undefined;
        this.attributes = undefined;
        this.nothingThere = [];
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
        });

        this.graphicLayer.removeAll();
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
        featureQuery.returnGeometry = true;

        this.facilities.queryFeatures(featureQuery).then(featureSet => {
            // console.dir(featureSet)

            this.featureSet = featureSet.features;

            if (featureSet.features.length === 1) {
                this.loadRMPs(featureSet.features[0]);
                // noneFound.push(false);
            } else if (featureSet.features.length > 1) {

                // mapIdNode.innerHTML = '<h3>Multiple Facilities at that location</h3><br/><h5>Select one to continue</h5>' +
                //   '<div id="gridDiv" style="width:100%;"></div>';
                let data = []

                featureSet.features.forEach((feature) => {
                    // let attrs = dojo.mixin({}, feature.attributes);
                    let attrs = feature.attributes;
                    data.push(attrs);
                });
                this.columns = [{key: 'FacilityName', name: 'Name'}];
                this.rows = data;
                this.rmpGridClick = false;
                this.setState({
                    columns: this.columns,
                    rows: this.rows,
                    rmpGridClick: this.rmpGridClick,
                });

                this.Grid();

            } else {
                this.nothingThere = [
                    <div>No facilities found at this location</div>
                ]
                this.setState({
                    nothingThere: this.nothingThere
                })
            }
        });


    }

    rowKeyGetter(row) {
        return row;
    }

    rowClick(row) {
        let facility = this.featureSet.filter((feature) => {
            return feature.attributes.OBJECTID === this.rows[row].OBJECTID;
        });
        if (this.rmpGridClick) {
            this.multipleRMPs = false;
            this.loadFeature(facility[0]);
        } else {
            this.loadRMPs(facility[0]);
        }

    }

    loadRMPs(feature) {
        this.currentFacility = feature;
        // this.loadingShelter.show();
        let attributes = feature.attributes;
        this.attributes = attributes;

        let selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol});

        this.graphicLayer.add(selectedGraphic);

        let rmpQuery = new RelationshipQuery();
        rmpQuery.outFields = ['*'];
        rmpQuery.objectIds = [attributes.OBJECTID];
        rmpQuery.relationshipId = this.tblS1Facilities.relationshipId;
        rmpQuery.returnGeometry = true;
        this.facilities.queryRelatedFeatures(rmpQuery).then((e) => {
                let features = e[attributes.OBJECTID].features;
                this.featureSet = features;
                if (features.length === 1) {
                    this.multipleRMPs = false;
                    this.loadFeature(features[0]);
                } else {
                    this.multipleRMPs = true;
                    // hide the landing text
                    this.mainText = false;
                    this.setState({
                        mainText: this.mainText
                    });

                    let data = []

                    features.forEach((feature) => {
                        feature.attributes.CompletionCheckDate = moment(feature.attributes.CompletionCheckDate).utc().toISOString().split('T')[0];
                        let attrs = feature.attributes;
                        data.push(attrs);
                    });

                    this.columns = [
                        {key: 'FacilityName', name: 'Name'},
                        {key: 'CompletionCheckDate', name: 'Date'}
                    ];

                    this.rows = data;
                    this.showGrid = true;
                    this.rmpGridClick = true;
                    this.setState({
                        columns: this.columns,
                        rows: this.rows,
                        rmpGridClick: this.rmpGridClick,
                    });

                    //get most recent record to display deregistration status
                    let mostRecentRMP = features[0].attributes;
                    features.forEach((feature) => {
                        if (feature.attributes.CompletionCheckDate > mostRecentRMP.CompletionCheckDate) {
                            mostRecentRMP = feature.attributes;
                        }
                    });


                    let status, reason, date;
                    if (mostRecentRMP.DeRegistrationEffectiveDate) {
                        status = 'De-registered';
                        reason = (mostRecentRMP.DeregistrationReasonCode !== '04' ?
                            this.tblS1Facilities.getFieldDomain('DeregistrationReasonCode').getName(mostRecentRMP.DeregistrationReasonCode) :
                            mostRecentRMP.DeregistrationReasonOtherText);
                        date = mostRecentRMP.DeRegistrationEffectiveDate;
                    } else {
                        status = 'Active';
                    }
                    if (attributes && Object.keys(attributes).length > 0) {
                        this.Grid();
                    }

                    this.facilityStatus = [];
                    this.facilityStatus.push(
                        <div>
                            Facility
                            Status: {status} {reason ? '<br/>De-registration Reason: ' + reason : ''} {date ? '<br/>De-registration Effective Date: ' + moment(date).toISOString().split('T')[0] : ''}
                        </div>
                    );

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
                        let scale = <div><br/> Source Map Scale: {mostRecentRMP.SourceMapScaleNumber}</div>
                        this.location_string.push(<div><br/>Horizontal Accuracy (m): {mostRecentRMP.HorizontalAccMeasure}
                            <br/>Horizontal
                            Datum: {this.tblS1Facilities.getFieldDomain('HorizontalRefDatumCode').getName(mostRecentRMP.HorizontalRefDatumCode)} {mostRecentRMP.SourceMapScaleNumber ? scale : ''}
                        </div>)
                    }

                    this.setState({
                        location_string: this.location_string,
                        facilityStatus: this.facilityStatus,
                    });
                }
            }
        );
    }

    loadFeature(feature) {
        this.erTextAttr = undefined;

        // that.loadingShelter.show();
        this.attributes = feature.attributes
        let attributes = this.attributes
        // processDeferred = new Deferred(), accidentDeferred = new Deferred;

        let selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol});

        this.graphicLayer.add(selectedGraphic);

        let status, status_string;

        if (this.attributes.DeRegistrationEffectiveDate) {
            status = 'De-registered';
            let reason = (this.attributes.DeregistrationReasonCode !== '04' ? this.tblS1Facilities.getFieldDomain('DeregistrationReasonCode').getName(this.attributes.DeregistrationReasonCode) : this.attributes.DeregistrationReasonOtherText);
            let date = this.attributes.DeRegistrationEffectiveDate;
            status_string = status +
                (reason ? '<br/>De-registration Reason: ' + reason : '') +
                (date ? '<br/>De-registration Effective Date: ' + moment(date).utc().toISOString().split('T')[0] : '') + '<br/><br/>';
        } else {
            status_string = 'Active<br/><br/>';
        }
        if (this.attributes && Object.keys(this.attributes).length > 0) {
            this.setState({
                attributes: this.attributes,
            })
            // this.Facility();
        }

        // todo: back link and executive summary dialog
// document.getElementById('summaryLink').onclick = () => {
//   this.executiveSummaryDialog.show();
// };
// document.getElementById('backLink').onclick = () => {
//    this.loadRMPs(this.currentFacility);
// };
// get executive summary for dialog box
        let executiveSummaryQuery = new RelationshipQuery();
        executiveSummaryQuery.outFields = ['*'];
        executiveSummaryQuery.relationshipId = this.ExecutiveSummaries.relationshipId;
        executiveSummaryQuery.objectIds = [this.attributes.OBJECTID];
        //
        // this.tblS1Facilities.queryRelatedFeatures(executiveSummaryQuery).then((e) => {
        //     let summary = '';
        //     let summary_parts = e[this.attributes.OBJECTID].features.sort(function (obj1, obj2) {
        //         return obj1.attributes.ESSeqNum - obj2.attributes.ESSeqNum
        //     });
        //     summary_parts.forEach((summary_part) => {
        //         summary += summary_part.attributes.SummaryText.replace(/(?:\r\n|\r|\n)/g, '<br />');
        //     });
        //     // this.executiveSummaryDialog.set("content", summary);
        // });
        //
        let processQuery = new RelationshipQuery();
        processQuery.outFields = ['*'];
        processQuery.relationshipId = this.tblS1Processes.relationshipId;
        processQuery.objectIds = [this.attributes.OBJECTID];

        this.tblS1Facilities.queryRelatedFeatures(processQuery).then((featureSet) => {
            // console.dir(featureSet);
            featureSet[this.attributes.OBJECTID].features.forEach((process) => {
                let naicsQuery = new RelationshipQuery();
                naicsQuery.outFields = ['*'];
                naicsQuery.relationshipId = this.tblS1Process_NAICS.relationshipId;
                naicsQuery.objectIds = [process.attributes.OBJECTID];
                this.naicsText = [];
                this.tblS1Processes.queryRelatedFeatures(naicsQuery).then(naicsCodes => {
                    naicsCodes[process.attributes.OBJECTID].features.forEach((naics, i) => {
                        this.naicsText.push(
                            <div>{this.tblS1Process_NAICS.getFieldDomain('NAICSCode').getName(naics.attributes.NAICSCode)}</div>);
                    });


                });

                let processChemicalsQuery = new RelationshipQuery();
                processChemicalsQuery.outFields = ['*'];
                processChemicalsQuery.relationshipId = this.tblS1ProcessChemicals.relationshipId;
                processChemicalsQuery.objectIds = [process.attributes.OBJECTID];

                this.tblS1Processes.queryRelatedFeatures(processChemicalsQuery).then(e => {
                    e[process.attributes.OBJECTID].features.forEach((processChemical) => {

                        let chemicalQuery = new RelationshipQuery();

                        chemicalQuery.outFields = ['*'];
                        chemicalQuery.relationshipId = this.tlkpChemicals.relationshipId;
                        chemicalQuery.objectIds = [processChemical.attributes.OBJECTID];

                        this.tblS1ProcessChemicals.queryRelatedFeatures(chemicalQuery).then((e) => {
                            e[processChemical.attributes.OBJECTID].features.forEach((chemical) => {
                                if (chemical.attributes.CASNumber === '00-11-11') {
                                    let flammableMixtureQuery = new RelationshipQuery();
                                    flammableMixtureQuery.outFields = ['*'];
                                    flammableMixtureQuery.relationshipId = this.tblS1FlammableMixtureChemicals.relationshipId;
                                    flammableMixtureQuery.objectIds = [processChemical.attributes.OBJECTID];

                                    this.tblS1ProcessChemicals.queryRelatedFeatures(flammableMixtureQuery).then((e) => {
                                        let chemicalOBJECTIDS = [];
                                        e[processChemical.attributes.OBJECTID].features.forEach((item) => {
                                            chemicalOBJECTIDS.push(item.attributes.OBJECTID)
                                        });

                                        let chemicalLookup = new RelationshipQuery();
                                        chemicalLookup.outFields = ['*'];
                                        chemicalLookup.relationshipId = this.FlammableChemicals.relationshipId;
                                        chemicalLookup.objectIds = chemicalOBJECTIDS;

                                        this.tblS1FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup).then((e) => {
                                            this.processText.push(<tr>
                                                <td colSpan={2}>{chemical.attributes.ChemicalName}</td>
                                                <td className="quantity">{processChemical.attributes.Quantity}</td>
                                            </tr>);
                                            chemicalOBJECTIDS.forEach((objectid) => {
                                                e[objectid].features.forEach((mixtureChemical) => {
                                                    this.processText.push(<tr>
                                                        <td>&#187;</td>
                                                        <td>{mixtureChemical.attributes.ChemicalName}</td>
                                                        <td></td>
                                                    </tr>);
                                                })
                                            });
                                        })
                                    })
                                } else {
                                    this.processText.push(<tr>
                                        <td colSpan={2}>{chemical.attributes.ChemicalName}</td>
                                        <td className="quantity">{processChemical.attributes.Quantity}</td>
                                    </tr>);
                                }
                            });
                            //
                            // this.setState({
                            //     processText: this.processText,
                            //     naicsText: this.naicsText,
                            // })
                            // processDeferred.resolve();
                            this.process = process;
                            this.setState({
                                process: this.process,
                                naicsText: this.naicsText,
                                processText: this.processText,
                            });
                            this.Process();
                        });
                    });
                });

            });
        });

        let accidentQuery = new RelationshipQuery();
        accidentQuery.outFields = ['*'];
        accidentQuery.relationshipId = this.tblS6AccidentHistory.relationshipId;
        accidentQuery.objectIds = [attributes.OBJECTID];
        this.accidentText = [];
        this.tblS1Facilities.queryRelatedFeatures(accidentQuery).then((featureSet) => {
            if (featureSet.hasOwnProperty(attributes.OBJECTID)) {
                featureSet[attributes.OBJECTID].features.forEach((accident) => {
                    let release_event = [];
                    accident.attributes.RE_Gas ? release_event.push('Gas') : null;
                    accident.attributes.RE_Spill ? release_event.push('Spill') : null;
                    accident.attributes.RE_Fire ? release_event.push('Fire') : null;
                    accident.attributes.RE_Explosion ? release_event.push('Explosion') : null;
                    accident.attributes.RE_ReactiveIncident ? release_event.push('Reactive Incident') : null;

                    let release_source = [];
                    accident.attributes.RS_StorageVessel ? release_source.push('Storage Vessel') : null;
                    accident.attributes.RS_Piping ? release_source.push('Piping') : null;
                    accident.attributes.RS_ProcessVessel ? release_source.push('Process Vessel') : null;
                    accident.attributes.RS_TransferHose ? release_source.push('Transfer Hose') : null;
                    accident.attributes.RS_Valve ? release_source.push('Valve') : null;
                    accident.attributes.RS_Pump ? release_source.push('Pump') : null;
                    accident.attributes.RS_Joint ? release_source.push('Joint') : null;
                    accident.attributes.OtherReleaseSource ? release_source.push('Other') : null;


                    this.accidentText.push(
                        <div>
                            <div style={{paddingTop: "10px"}}>
                                <b>Date: {moment(accident.attributes.AccidentDate).toISOString().split('T')[0]}</b>
                            </div>
                            <div>Duration
                                (HHH:MM): {accident.attributes.AccidentReleaseDuration.substring(0, 3)}:{accident.attributes.AccidentReleaseDuration.substring(3, 5)}</div>
                            <div><span>Release Event(s): {release_event.join(',')} </span></div>
                            <div><span>Release Source(s): {release_source.join(',')}</span></div>
                        </div>
                    );

                    let accidentChemicalQuery = new RelationshipQuery();
                    accidentChemicalQuery.outFields = ['*'];
                    accidentChemicalQuery.relationshipId = this.AccidentChemicals.relationshipId;
                    accidentChemicalQuery.objectIds = [accident.attributes.OBJECTID];

                    this.tblS6AccidentHistory.queryRelatedFeatures(accidentChemicalQuery).then((e) => {
                        e[accident.attributes.OBJECTID].features.forEach((accidentChemical) => {

                            let chemicalQuery = new RelationshipQuery();
                            chemicalQuery.outFields = ['*'];
                            chemicalQuery.relationshipId = this.tblS6AccidentChemicals.relationshipId;
                            chemicalQuery.objectIds = [accidentChemical.attributes.OBJECTID];

                            this.tblS6AccidentChemicals.queryRelatedFeatures(chemicalQuery).then((e) => {
                                e[accidentChemical.attributes.OBJECTID].features.forEach((chemical) => {
                                    if (chemical.attributes.CASNumber === '00-11-11') {
                                        let flammableMixtureQuery = new RelationshipQuery();
                                        flammableMixtureQuery.outFields = ['*'];
                                        flammableMixtureQuery.relationshipId = this.tblS6FlammableMixtureChemicals.relationshipId;
                                        flammableMixtureQuery.objectIds = [accidentChemical.attributes.OBJECTID];

                                        this.tblS6AccidentChemicals.queryRelatedFeatures(flammableMixtureQuery).then(e => {
                                            let chemicalOBJECTIDS = [];
                                            e[accidentChemical.attributes.OBJECTID].features.forEach((item) => {
                                                chemicalOBJECTIDS.push(item.attributes.OBJECTID)
                                            });

                                            let chemicalLookup = new RelationshipQuery();
                                            chemicalLookup.outFields = ['*'];
                                            chemicalLookup.relationshipId = this.AccidentFlamMixChem.relationshipId;
                                            chemicalLookup.objectIds = chemicalOBJECTIDS;
                                            this.accidentChems = [];
                                            this.accidentChems.push(<tr>
                                                <th colSpan={2}>Chemical(s)</th>
                                                <th>Quantity (lbs)</th>
                                            </tr>)
                                            this.tblS6FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup).then(e => {
                                                this.accidentChems.push(<tr>
                                                    <td colSpan={2}>{chemical.attributes.ChemicalName}</td>
                                                    <td className="quantity">{accidentChemical.attributes.QuantityReleased}</td>
                                                </tr>);
                                                chemicalOBJECTIDS.forEach((objectid) => {
                                                    e[objectid].features.forEach((mixtureChemical) => {
                                                        this.accidentChems.push(<tr>
                                                            <td>&#187;</td>
                                                            <td>{mixtureChemical.attributes.ChemicalName}</td>
                                                            <td></td>
                                                        </tr>);
                                                    })
                                                });
                                            });
                                        });
                                    } else {
                                        this.accidentChems.push(<tr>
                                            <td colSpan={2}>{chemical.attributes.ChemicalName}</td>
                                            <td className="quantity">{accidentChemical.attributes.QuantityReleased}</td>
                                        </tr>)
                                    }
                                });
                            });
                        });
                    });
                })
            } else {
                this.accidentText.push(<b>No Accidents Reported</b>);
            }
            this.setState({
                    accidentText: this.accidentText,
                    accidentChems: this.accidentChems
                }
            )
        });

        let ERQuery = new RelationshipQuery();
        ERQuery.outFields = ['*'];
        ERQuery.relationshipId = this.tblS9EmergencyResponses.relationshipId;
        ERQuery.objectIds = [attributes.OBJECTID];

        this.tblS1Facilities.queryRelatedFeatures(ERQuery).then((e) => {
            this.erTextAttr = e[attributes.OBJECTID].features[0];
            this.setState({
                erTextAttr: this.erTextAttr
            })
            // if (this.erTextAttr) {
            //     this.EmerRespPlan();
            // }
        });
        // if (!this.multipleRMPs) {
        //     if (attributes.ValidLatLongFlag) {
        //         let location_string = 'RMP Validated Location Used' +
        //             '<br/>Description: ' + this.tblS1Facilities.getFieldDomain('LatLongDescription').getName(attributes.LatLongDescription) +
        //             '<br/>Method: ' + this.tblS1Facilities.getFieldDomain('LatLongMethod').getName(attributes.LatLongMethod);
        //     } else if (!attributes.ValidLatLongFlag && attributes.FRS_Lat !== undefined && attributes.FRS_long !== undefined) {
        //         let location_string = 'FRS Location Used' +
        //             '<br/>Description: ' + this.tblS1Facilities.getFieldDomain('FRS_Description').getName(attributes.FRS_Description) +
        //             '<br/>Method: ' + this.tblS1Facilities.getFieldDomain('FRS_Method').getName(attributes.FRS_Method);
        //     } else {
        //         let location_string = 'Location Not Validated' +
        //             '<br/>Description: ' + this.tblS1Facilities.getFieldDomain('LatLongDescription').getName(attributes.LatLongDescription) +
        //             '<br/>Method: ' + this.tblS1Facilities.getFieldDomain('LatLongMethod').getName(attributes.LatLongMethod);
        //     }
        //
        //     if (attributes.HorizontalAccMeasure) {
        //         location_string += '<br/>Horizontal Accuracy (m): ' + attributes.HorizontalAccMeasure +
        //             '<br/>Horizontal Datum: ' + this.tblS1Facilities.getFieldDomain('HorizontalRefDatumCode').getName(attributes.HorizontalRefDatumCode) +
        //             (attributes.SourceMapScaleNumber ? '<br/>Source Map Scale: ' + attributes.SourceMapScaleNumber : '')
        //     }
        //
        //     // let row = domConstruct.toDom(location_string);
        //     // domConstruct.place(row, 'location_metadata');
        // }
// todo: figure out loading shelter and deferred
// all([processDeferred.promise, accidentDeferred.promise]).then(function () {
//   that.loadingShelter.hide();

    }

    render() {
        return (
            <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto", height: "97%"}}>
                <this.NothingFound/>
                <this.Facility/>
                <this.Process/>
                <this.Accidents/>
                <this.EmerRespPlan/>
                <this.Grid/>
                <this.LocationMetadata/>
                {this.mainText ? this.LandingText() : null}
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        )
    }
}
