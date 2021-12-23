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

interface Row {
    OBJECTID: 'OBJECTID'
}

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, { jimuMapView: JimuMapView, landingText: string, mainText: boolean, mapIdNode: any, columns: any, rows: any, showGrid: boolean }> {

    jmv: JimuMapView;
    rmpLayer: MapImageLayer;
    symbol: PictureMarkerSymbol;
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
    ExecutiveSummaries: any;
    attributes: any;
    columns: any[] = [];
    rows: any[] = [];
    showGrid: boolean = false;
    featureSet: any;

    // columns = [
    //     {key: 'id', name: 'ID'},
    //     {key: 'title', name: 'Title'}
    // ];
    //
    // rows = [
    //     {id: 0, title: 'Example'},
    //     {id: 1, title: 'Demo'}
    // ];

    constructor(props) {
        super(props);

        this.mainText = true;
        // bind this to function
        this.FacilityText = this.FacilityText.bind(this);
        this.Grid = this.Grid.bind(this);
        this.rowClick = this.rowClick.bind(this);
    }

    componentDidMount() {
        this.rmpLayer = new MapImageLayer({
            url: "https://utility.arcgis.com/usrsvcs/servers/a9dda0a4ba0a433992ce3bdffd89d35a/rest/services/SharedServices/RMPFacilities/MapServer",
        });

        this.symbol = new PictureMarkerSymbol({
            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAUCAYAAABbLMdoAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAdtJREFUKJGV0k9Ik3Ecx/H3nn71iASyp12cE4KxUxaIPM9kzG0wUBSkf3jaoKgovChdwg6dOghCh6JLEHlZl3BpMHFrPj4oKKQM8fDAXORh2HaRnaL4wWwdBtY2V/S9fb+8+MLv8/0J/qNE8yCbRanVeDM8zO1/YuDl6iq3Nja6l0Kh8lJbnMuhra1x3+mEg4Pya6A9LpVIKgpnJidhbo4Lpqk+jUblkxa8uYmeThOJx6GrC0ZGYHdXPtrZYVbX+d6Ai0Xe9faCz1fvDQMsi3NHR7wFrp/g9XXtTipVuTg1BQ5HHXd0wNgYpNNc3d7GZxh8Ftksyv5+5fnAAHg8jbH094Nl4SgW1STIK0II9WGhIM9PT7dmKAREIrC4KC9vbeEVnZ3yldvNrG1ztnlzrQa5HPT1UQoE+CL8fr6Zpvosk5Ezug6a9hvn83B4CKOjxE8eGI3Kx/PzPDBNnBMTdXh8DMvLYBjqp6EhaTVE5/V230ulyslAAHp6YG8PqlV+ut3yZstRQqHy+4UF1c5k5KVYrL7V7ydhGHw99dwej7xh2+QTCRwuFz8UhbsN6fzZDA5SWFnhg2lybXxcmwmHK9W2GMDlIhYMqh/D4cqLltybB/VPI4PN81Px3+oXm5WbogYCJW8AAAAASUVORK5CYII=',
            width: "11px",
            height: "20px"
        });

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
            </div>)
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

    FacilityText() {
        if (this.attributes && !this.multipleRMPs) {
            let attributes = this.attributes
            if (attributes && Object.keys(attributes).length > 0) {
                return (
                    <div>
                        {this.multipleRMPs ?
                            <a id="backLink" style={{textDecoration: "underline", cursor: "pointer"}}> Back</a> : ''}
                        <h1> {attributes.FacilityName}</h1>
                        <h4 id="registration_status">Status: {this.status_string}</h4>
                        <table>
                            <tbody id="tierii_facility">
                            <tr>
                                <td>Address: <br/> {attributes.FacilityStr1}<br/> {attributes.FacilityStr2 ? attributes.FacilityStr2 +
                                    <br/> : ''}
                                    {attributes.FacilityCity + ', ' + attributes.FacilityState + ' ' + attributes.FacilityZipCode}
                                </td>
                            </tr>
                            <tr>
                                <td>Phone: {attributes.FacilityPhoneNumber ? attributes.FacilityPhoneNumber : 'Not Reported'}</td>
                            </tr>
                            <tr>
                                <td>Website: {attributes.FacilityURL ? attributes.FacilityURL : 'Not Reported'}</td>
                            </tr>
                            <tr>
                                <td>Email: {attributes.FacilityEmailAddress ? attributes.FacilityEmailAddress : 'Not Reported'}</td>
                            </tr>
                            <tr>
                                <td>Full Time Employees: {attributes.FTE}</td>
                            </tr>
                            <tr>
                                <td>RMP Completion
                                    Date: {moment(attributes.CompletionCheckDate).utc().toISOString().split('T')[0]}</td>
                            </tr>
                            <tr>
                                <td>Parent
                                    Company(s): {attributes.ParentCompanyName ? attributes.ParentCompanyName : 'Not Reported'} {attributes.Company2Name ? ', ' + attributes.Company2Name : ''}</td>
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
                                <td>Name: {attributes.OperatorName}</td>
                            </tr>
                            <tr>
                                <td>Phone: {attributes.OperatorPhone}</td>
                            </tr>
                            <tr>
                                <td><b>Emergency Contact</b></td>
                            </tr>
                            <tr>
                                <td>Name: {attributes.EmergencyContactName}</td>
                            </tr>
                            <tr>
                                <td>Title: {attributes.EmergencyContactTitle}</td>
                            </tr>
                            <tr>
                                <td>Phone: {attributes.EmergencyContactPhone} {attributes.EmergencyContactExt_PIN ? ' x' + attributes.EmergencyContactExt_PIN : ''}</td>
                            </tr>
                            <tr>
                                <td>24 HR Phone: {attributes.Phone24}</td>
                            </tr>
                            <tr>
                                <td></td>
                            </tr>
                            </tbody>
                        </table>
                        <table>
                            <tbody id="tierii_contacts"></tbody>
                        </table>
                        <br/>
                        <h3 style={{textDecoration: 'underline'}}>Processes</h3>
                        <div style={{width: '100%'}} id="processes"></div>
                        <br/>
                        <h3 style={{textDecoration: "underline"}}>Accidents</h3>
                        <div style={{width: '100%'}} id="accidents"></div>
                        <br/>
                        <h3 style={{textDecoration: "underline"}}>Emergency Reponse Plan</h3>
                        <div style={{width: '100%'}} id="emergency_plan"></div>
                        <br/>
                        ({this.multipleRMPs ? '' : <div><h3 style={{textDecoration: "underline"}}>Location Metadata</h3>
                        <div style={{width: '100%'}} id="location_metadata"></div>
                        <br/><br/></div>}
                    </div>
                )
            }
        } else {
            return null
        }
    }

    Grid() {
        if (this.multipleRMPs) {
            return (<div>
                    <h3>Multiple RMPs Found for{this.attributes.FacilityName}</h3>
                    <h4 id="facilityStatus"></h4><br/>
                    <h5>Select one to continue</h5>
                    <DataGrid columns={this.columns} rows={this.rows} onRowClick={this.rowClick}
                              rowKeyGetter={this.rowKeyGetter}/>
                    <br/><br/>
                    <h3 style={{textDecoration: "underline"}}>Location Metadata</h3>
                    <div style={{width: "100%"}} id="location_metadata"></div>
                    <br/><br/>
                </div>
            )
        } else {
            return null
        }
    }

    mapClick = (e) => {
        this.mainText = false;
        this.setState({
            mainText: this.mainText
        });
        this.mapIdNode = () => {
            return (
                <div>
                    TEXTTTTTTTTTTTTTTTTTTTTTTTTTT
                </div>
            )
        }
        this.setState({
            mapIdNode: this.mapIdNode()
        })
        // that.loadingShelter.show();
        if (this.rmpLayer.loaded) {


            // this.rmpLayer.get
        } else {
            return
        }


        this.graphicLayer.removeAll();
        var pixelWidth = this.jmv.view.extent.width / this.jmv.view.width;
        var toleraceInMapCoords = 10 * pixelWidth;
        var clickExtent = new Extent({
            xmin: e.mapPoint.x - toleraceInMapCoords,
            ymin: e.mapPoint.y - toleraceInMapCoords,
            xmax: e.mapPoint.x + toleraceInMapCoords,
            ymax: e.mapPoint.y + toleraceInMapCoords,
            spatialReference: this.jmv.view.spatialReference,
        });

        var featureQuery = new Query();
        featureQuery.outFields = ['*'];
        featureQuery.geometry = clickExtent;

        this.facilities.queryFeatures(featureQuery).then(featureSet => {
            console.dir(featureSet)

            // this.featureSet = featureSet;

            if (featureSet.features.length === 1) {
                this.loadRMPs(featureSet.features[0]);
                // noneFound.push(false);
            } else if (featureSet.features.length > 1) {

                this.loadRMPs(featureSet.features[0]);
                // mapIdNode.innerHTML = '<h3>Multiple Facilities at that location</h3><br/><h5>Select one to continue</h5>' +
                //   '<div id="gridDiv" style="width:100%;"></div>';
                var data = {
                    identifier: 'OBJECTID',
                    items: []
                };

                featureSet.features.forEach((feature) => {
                    // var attrs = dojo.mixin({}, feature.attributes);
                    var attrs = feature.attributes;
                    data.items.push(attrs);
                });

                // grid.on('RowClick', function (e) {
                //   var rowItem = grid.getItem(e.rowIndex);
                //   var facility = array.filter(featureSet.features, function (feature) {
                //     return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
                //   });
                //   that.loadRMPs(facility[0]);
                // });
                //
                // grid.startup();
                // that.loadingShelter.hide();
                // noneFound.push(false);
            } else {
                // mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
                // that.loadingShelter.hide();
            }
        });


    }

    rowKeyGetter(row) {
        return row;
    }

    rowClick(row) {
        console.log(this.rows[row].OBJECTID);
        let facility = this.featureSet.filter((feature) => {
            return feature.attributes.OBJECTID === this.rows[row].OBJECTID;
        });
        this.loadRMPs(facility[0]);
    }

    loadRMPs(feature) {

        this.currentFacility = feature;
        // this.loadingShelter.show();
        var attributes = feature.attributes;
        this.attributes = attributes;

        var selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol});

        this.graphicLayer.add(selectedGraphic);

        var rmpQuery = new RelationshipQuery();
        rmpQuery.outFields = ['*'];
        rmpQuery.objectIds = [attributes.OBJECTID];
        rmpQuery.relationshipId = this.tblS1Facilities.relationshipId;
        this.facilities.queryRelatedFeatures(rmpQuery).then((e) => {
                var features = e[attributes.OBJECTID].features;
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

                    this.mapIdNode = () => {
                        return (
                            <div>
                                <h3>Multiple RMPs Found for{attributes.FacilityName}</h3> +
                                <h4 id="facilityStatus"></h4><br/>
                                <h5>Select one to continue</h5>
                                <div id="rmpGridDiv" style={{width: "100%"}}></div>
                                <br/><br/>
                                <h3 style={{textDecoration: "underline"}}>Location Metadata</h3>
                                <div style={{width: "100%"}} id="location_metadata"></div>
                                <br/><br/>
                            </div>
                        )
                    }

                    let data = []

                    features.forEach((feature) => {
                        feature.attributes.CompletionCheckDate = moment(feature.attributes.CompletionCheckDate).utc().toISOString().split('T')[0];

                        // var attrs = dojo.mixin({}, feature.attributes);
                        var attrs = feature.attributes;
                        // var attrs = {OBJECTID: feature.attributes.OBJECTID, FacilityName: feature.attributes.FacilityName, CompletionCheckDate: feature.attributes.CompletionCheckDate};

                        data.push(attrs);
                    });

                    this.columns = [
                        {key: 'FacilityName', name: 'Name'},
                        {key: 'CompletionCheckDate', name: 'Date'}
                    ];

                    this.rows = data;
                    this.showGrid = true;
                    this.setState({
                        columns: this.columns,
                        rows: this.rows,
                        showGrid: this.showGrid
                    });


                    //todo: implement row click

                    // grid.on('RowClick', function (e) {
                    //   var rowItem = grid.getItem(e.rowIndex);
                    //   var facility = array.filter(features, function (feature) {
                    //     return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
                    //   });
                    //   that.loadFeature(facility[0]);
                    // });
                    //
                    // grid.startup();

                    //get most recent record to display deregistration status
                    var mostRecentRMP = features[0].attributes;
                    features.forEach((feature) => {
                        if (feature.attributes.CompletionCheckDate > mostRecentRMP.CompletionCheckDate) {
                            mostRecentRMP = feature.attributes;
                        }
                    });
                    var status;
                    if (mostRecentRMP.DeRegistrationEffectiveDate) {
                        status = 'De-registered';
                        var reason = (mostRecentRMP.DeregistrationReasonCode !== '04' ?
                            this.tblS1Facilities.getDomain('DeregistrationReasonCode').getName(mostRecentRMP.DeregistrationReasonCode) :
                            mostRecentRMP.DeregistrationReasonOtherText);
                        var date = mostRecentRMP.DeRegistrationEffectiveDate;
                    } else {
                        status = 'Active';
                    }
                    if (attributes && Object.keys(attributes).length > 0) {
                        this.Grid();
                    }

                    //
                    // var row = domConstruct.toDom('Facility Status: ' + status +
                    //   (reason ? '<br/>De-registration Reason: ' + reason : '') +
                    //   (date ? '<br/>De-registration Effective Date: ' + stamp.toISOString(new Date(date), {
                    //     selector: "date",
                    //     zulu: true
                    //   }) : '')
                    // );
                    // domConstruct.place(row, 'facilityStatus');
                    //
                    // if (mostRecentRMP.ValidLatLongFlag) {
                    //   var location_string = 'RMP Validated Location Used' +
                    //     '<br/>Description: ' + that.tblS1Facilities.getDomain('LatLongDescription').getName(mostRecentRMP.LatLongDescription) +
                    //     '<br/>Method: ' + that.tblS1Facilities.getDomain('LatLongMethod').getName(mostRecentRMP.LatLongMethod);
                    // } else if (!mostRecentRMP.ValidLatLongFlag && mostRecentRMP.FRS_Lat !== undefined && mostRecentRMP.FRS_long !== undefined) {
                    //   var location_string = 'FRS Location Used' +
                    //     '<br/>Description: ' + that.tblS1Facilities.getDomain('FRS_Description').getName(mostRecentRMP.FRS_Description) +
                    //     '<br/>Method: ' + that.tblS1Facilities.getDomain('FRS_Method').getName(mostRecentRMP.FRS_Method);
                    // } else {
                    //   var location_string = 'Location Not Validated' +
                    //     '<br/>Description: ' + that.tblS1Facilities.getDomain('LatLongDescription').getName(mostRecentRMP.LatLongDescription) +
                    //     '<br/>Method: ' + that.tblS1Facilities.getDomain('LatLongMethod').getName(mostRecentRMP.LatLongMethod);
                    // }
                    //
                    // if (mostRecentRMP.HorizontalAccMeasure) {
                    //   location_string += '<br/>Horizontal Accuracy (m): ' + mostRecentRMP.HorizontalAccMeasure +
                    //     '<br/>Horizontal Datum: ' + that.tblS1Facilities.getDomain('HorizontalRefDatumCode').getName(mostRecentRMP.HorizontalRefDatumCode) +
                    //     (mostRecentRMP.SourceMapScaleNumber ? '<br/>Source Map Scale: ' + mostRecentRMP.SourceMapScaleNumber : '')
                    // }
                    //
                    // var row = domConstruct.toDom(location_string);
                    // domConstruct.place(row, 'location_metadata');
                    //
                    // that.loadingShelter.hide();
                }
            }
        );
    }

    loadFeature(feature) {

        // that.loadingShelter.show();
        this.attributes = feature.attributes
        let attributes = this.attributes
        // processDeferred = new Deferred(), accidentDeferred = new Deferred;

        var selectedGraphic = new Graphic({geometry: feature.geometry, symbol: this.symbol});

        this.graphicLayer.add(selectedGraphic);

        var status;

        if (attributes.DeRegistrationEffectiveDate) {
            status = 'De-registered';
            var reason = (attributes.DeregistrationReasonCode !== '04' ? this.tblS1Facilities.getDomain('DeregistrationReasonCode').getName(attributes.DeregistrationReasonCode) : attributes.DeregistrationReasonOtherText);
            var date = attributes.DeRegistrationEffectiveDate;
            var status_string = status +
                (reason ? '<br/>De-registration Reason: ' + reason : '') +
                (date ? '<br/>De-registration Effective Date: ' + moment(date).utc().toISOString().split('T')[0] : '') + '<br/><br/>';
        } else {
            status_string = 'Active<br/><br/>';
        }
        if (attributes && Object.keys(attributes).length > 0) {
            this.FacilityText();
        }

// this.mapIdNode = () => {} (this.multipleRMPs ? '<a id="backLink" style="text-decoration:underline; cursor: pointer;">< Back</a>' : '') +
//   '<h1>' + attributes.FacilityName + '</h1>' +
//   '<h4 id="registration_status">Status: ' + status_string + '</h4>' +
//   '<table><tbody id="tierii_facility">' +
//   '<tr><td>Address: <br/>' + attributes.FacilityStr1 + '<br/>' + (attributes.FacilityStr2 ? attributes.FacilityStr2 + '<br/>' : '') +
//   attributes.FacilityCity + ', ' + attributes.FacilityState + ' ' + attributes.FacilityZipCode + '</td></tr>' +
//   '<tr><td>Phone: ' + (attributes.FacilityPhoneNumber ? attributes.FacilityPhoneNumber : 'Not Reported') + '</td></tr>' +
//   '<tr><td>Website: ' + (attributes.FacilityURL ? attributes.FacilityURL : 'Not Reported') + '</td></tr>' +
//   '<tr><td>Email: ' + (attributes.FacilityEmailAddress ? attributes.FacilityEmailAddress : 'Not Reported') + '</td></tr>' +
//   '<tr><td>Full Time Employees: ' + attributes.FTE + '</td></tr>' +
//   '<tr><td>RMP Completion Date: ' + moment(feature.attributes.CompletionCheckDate).utc().toISOString().split('T')[0] + '</td></tr>' +
//   '<tr><td>Parent Company(s): ' + (attributes.ParentCompanyName ? attributes.ParentCompanyName : 'Not Reported') + (attributes.Company2Name ? ', ' + attributes.Company2Name : '') + '</td></tr>' +
//   '<tr><td><a id="summaryLink" style="text-decoration: underline; cursor: pointer;">View Executive Summary</a></td></tr></tbody></table>' +
//   '<br/><h3 style="text-decoration: underline;">Contacts</h3>' +
//   '<table><tbody><tr><td><b>Operator</b></td></tr>' +
//   '<tr><td>Name: ' + attributes.OperatorName + '</td></tr>' +
//   '<tr><td>Phone: ' + attributes.OperatorPhone + '</td></tr>' +
//   '<tr><td><b>Emergency Contact</b></td></tr>' +
//   '<tr><td>Name: ' + attributes.EmergencyContactName + '</td></tr>' +
//   '<tr><td>Title: ' + attributes.EmergencyContactTitle + '</td></tr>' +
//   '<tr><td>Phone: ' + attributes.EmergencyContactPhone + (attributes.EmergencyContactExt_PIN ? ' x' + attributes.EmergencyContactExt_PIN : '') + '</td></tr>' +
//   '<tr><td>24 HR Phone: ' + attributes.Phone24 + '</td></tr>' +
//   '<tr><td></td></tr>' +
//   '</tbody></table>' +
//   '<table><tbody id="tierii_contacts"></tbody></table><br/>' +
//   '<h3 style="text-decoration: underline;">Processes</h3>' +
//   '<div style="width:100%" id="processes"></div><br/>' +
//   '<h3 style="text-decoration: underline;">Accidents</h3>' +
//   '<div style="width:100%" id="accidents"></div><br/>' +
//   '<h3 style="text-decoration: underline;">Emergency Reponse Plan</h3>' +
//   '<div style="width:100%" id="emergency_plan"></div><br/>' +
//   (this.multipleRMPs ? '' : '<h3 style="text-decoration: underline;">Location Metadata</h3>' +
//     '<div style="width:100%" id="location_metadata"></div><br/><br/>');

        this.setState({
            mapIdNode: this.mapIdNode
        })
// document.getElementById('summaryLink').onclick = () => {
//   this.executiveSummaryDialog.show();
// };
// document.getElementById('backLink').onclick = () => {
//    this.loadRMPs(this.currentFacility);
// };
// get executive summary for dialog box
        var executiveSummaryQuery = new RelationshipQuery();
        executiveSummaryQuery.outFields = ['*'];
        executiveSummaryQuery.relationshipId = this.ExecutiveSummaries.relationshipId;
        executiveSummaryQuery.objectIds = [attributes.OBJECTID];

        this.tblS1Facilities.queryRelatedFeatures(executiveSummaryQuery).then((e) => {
            var summary = '';
            var summary_parts = e[attributes.OBJECTID].features.sort(function (obj1, obj2) {
                return obj1.attributes.ESSeqNum - obj2.attributes.ESSeqNum
            });
            summary_parts.forEach((summary_part) => {
                summary += summary_part.attributes.SummaryText.replace(/(?:\r\n|\r|\n)/g, '<br />');
            });
            // this.executiveSummaryDialog.set("content", summary);
        });

        var processQuery = new RelationshipQuery();
        processQuery.outFields = ['*'];
        processQuery.relationshipId = this.tblS1Processes.relationshipId;
        processQuery.objectIds = [attributes.OBJECTID];

        this.tblS1Facilities.queryRelatedFeatures(processQuery).then((featureSet) => {
            console.dir(featureSet);
            // featureSet[attributes.OBJECTID].features.forEach((process) => {
            //   var row = domConstruct.toDom('' +
            //     '<div><b>Name: ' + (process.attributes.AltID ? process.attributes.AltID : 'not reported') + '</b></div>' +
            //     '<div>Description(s): <span id="process_' + process.attributes.ProcessID + '_naics"></span></div>' +
            //     '<div>Program Level: ' + process.attributes.ProgramLevel + '</span></div>' +
            //     '<table><tbody id="process_' + process.attributes.ProcessID + '"><tr><th colspan="2">Chemical</th><th>Quantity (lbs)</th></tr></tbody></table>');
            //   domConstruct.place(row, "processes");
            //
            //   var naicsQuery = new RelationshipQuery();
            //   naicsQuery.outFields = ['*'];
            //   naicsQuery.relationshipId = this.tblS1Process_NAICS.relationshipId;
            //   naicsQuery.objectIds = [process.attributes.OBJECTID];
            //
            //   this.tblS1Processes.queryRelatedFeatures(naicsQuery).then(naicsCodes => {
            //     var s = [];
            //     naicsCodes[process.attributes.OBJECTID].features.forEach((naics, i) => {
            //       s.push(this.tblS1Process_NAICS.getDomain('NAICSCode').getName(naics.attributes.NAICSCode));
            //
            //     });
            //     var row = domConstruct.toDom(s.join(','));
            //     domConstruct.place(row, 'process_' + process.attributes.ProcessID + '_naics');
            //   });
            //
            //
            //   var processChemicalsQuery = new RelationshipQuery();
            //   processChemicalsQuery.outFields = ['*'];
            //   processChemicalsQuery.relationshipId = this.tblS1ProcessChemicals.relationshipId;
            //   processChemicalsQuery.objectIds = [process.attributes.OBJECTID];
            //
            //   this.tblS1Processes.queryRelatedFeatures(processChemicalsQuery).then(e => {
            //     e[process.attributes.OBJECTID].features.forEach((processChemical) => {
            //
            //       var chemicalQuery = new RelationshipQuery();
            //
            //       chemicalQuery.outFields = ['*'];
            //       chemicalQuery.relationshipId = this.tlkpChemicals.relationshipId;
            //       chemicalQuery.objectIds = [processChemical.attributes.OBJECTID];
            //
            //       this.tblS1ProcessChemicals.queryRelatedFeatures(chemicalQuery).then( (e) => {
            //         e[processChemical.attributes.OBJECTID].features.forEach((chemical) => {
            //           if (chemical.attributes.CASNumber === '00-11-11') {
            //             var flammableMixtureQuery = new RelationshipQuery();
            //             flammableMixtureQuery.outFields = ['*'];
            //             flammableMixtureQuery.relationshipId = this.tblS1FlammableMixtureChemicals.relationshipId;
            //             flammableMixtureQuery.objectIds = [processChemical.attributes.OBJECTID];
            //
            //             this.tblS1ProcessChemicals.queryRelatedFeatures(flammableMixtureQuery).then((e) => {
            //               var chemicalOBJECTIDS = [];
            //               e[processChemical.attributes.OBJECTID].features.forEach((item) => {
            //                 chemicalOBJECTIDS.push(item.attributes.OBJECTID)
            //               });
            //
            //               var chemicalLookup = new RelationshipQuery();
            //               chemicalLookup.outFields = ['*'];
            //               chemicalLookup.relationshipId = this.FlammableChemicals.relationshipId;
            //               chemicalLookup.objectIds = chemicalOBJECTIDS;
            //
            //               this.tblS1FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup).then((e) => {
            //                 var row_string = '<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(processChemical.attributes.Quantity) + '</td></tr>';
            //                 chemicalOBJECTIDS.forEach((objectid) => {
            //                   e[objectid].features.forEach((mixtureChemical) => {
            //                     row_string += '<tr><td>&#187;</td><td>' + mixtureChemical.attributes.ChemicalName + '</td><td></td></tr>';
            //
            //                   })
            //                 });
            //                 var row = domConstruct.toDom(row_string);
            //                 domConstruct.place(row, "process_" + process.attributes.ProcessID);
            //               })
            //             })
            //           } else {
            //             var row = domConstruct.toDom('<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(processChemical.attributes.Quantity) + '</td></tr>');
            //             domConstruct.place(row, "process_" + process.attributes.ProcessID);
            //           }
            //         });
            //         processDeferred.resolve();
            //       });
            //     });
            //   });
            // });
        });

// var accidentQuery = new RelationshipQuery();
// accidentQuery.outFields = ['*'];
// accidentQuery.relationshipId = this.tblS6AccidentHistory.relationshipId;
// accidentQuery.objectIds = [attributes.OBJECTID];

// this.tblS1Facilities.queryRelatedFeatures(accidentQuery).then((featureSet) => {
//   if (featureSet.hasOwnProperty(attributes.OBJECTID)) {
//     featureSet[attributes.OBJECTID].features.forEach((accident) => {
//       var release_event = [];
//       accident.attributes.RE_Gas ? release_event.push('Gas') : null;
//       accident.attributes.RE_Spill ? release_event.push('Spill') : null;
//       accident.attributes.RE_Fire ? release_event.push('Fire') : null;
//       accident.attributes.RE_Explosion ? release_event.push('Explosion') : null;
//       accident.attributes.RE_ReactiveIncident ? release_event.push('Reactive Incident') : null;
//
//       var release_source = [];
//       accident.attributes.RS_StorageVessel ? release_source.push('Storage Vessel') : null;
//       accident.attributes.RS_Piping ? release_source.push('Piping') : null;
//       accident.attributes.RS_ProcessVessel ? release_source.push('Process Vessel') : null;
//       accident.attributes.RS_TransferHose ? release_source.push('Transfer Hose') : null;
//       accident.attributes.RS_Valve ? release_source.push('Valve') : null;
//       accident.attributes.RS_Pump ? release_source.push('Pump') : null;
//       accident.attributes.RS_Joint ? release_source.push('Joint') : null;
//       accident.attributes.OtherReleaseSource ? release_source.push('Other') : null;
//
//       var row = domConstruct.toDom('' +
//         '<div style="padding-top:10px;"><b>Date: ' + stamp.toISOString(new Date(accident.attributes.AccidentDate), {
//           selector: "date",
//           zulu: true
//         }) + '</b></div>' +
//         '<div>Duration (HHH:MM): ' + accident.attributes.AccidentReleaseDuration.substring(0, 3) + ':' + accident.attributes.AccidentReleaseDuration.substring(3, 5) + '</div>' +
//         '<div>Release Event(s): ' + release_event.join(',') + '</span></div>' +
//         '<div>Release Source(s): ' + release_source.join(',') + '</span></div>' +
//         '<table><tbody id="accident_' + accident.attributes.AccidentHistoryID + '"><tr><th colspan="2">Chemical(s)</th><th>Quantity (lbs)</th></tr></tbody></table>');
//       domConstruct.place(row, "accidents");
//
//       var accidentChemicalQuery = new RelationshipQuery();
//       accidentChemicalQuery.outFields = ['*'];
//       accidentChemicalQuery.relationshipId = this.AccidentChemicals.relationshipId;
//       accidentChemicalQuery.objectIds = [accident.attributes.OBJECTID];
//
//       this.tblS6AccidentHistory.queryRelatedFeatures(accidentChemicalQuery).then((e) => {
//         e[accident.attributes.OBJECTID].features.forEach((accidentChemical) => {
//
//           var chemicalQuery = new RelationshipQuery();
//           chemicalQuery.outFields = ['*'];
//           chemicalQuery.relationshipId = this.tblS6AccidentChemicals.relationshipId;
//           chemicalQuery.objectIds = [accidentChemical.attributes.OBJECTID];
//
//           this.tblS6AccidentChemicals.queryRelatedFeatures(chemicalQuery).then((e) => {
//             e[accidentChemical.attributes.OBJECTID].features.forEach((chemical) => {
//               if (chemical.attributes.CASNumber === '00-11-11') {
//                 var flammableMixtureQuery = new RelationshipQuery();
//                 flammableMixtureQuery.outFields = ['*'];
//                 flammableMixtureQuery.relationshipId = this.tblS6FlammableMixtureChemicals.relationshipId;
//                 flammableMixtureQuery.objectIds = [accidentChemical.attributes.OBJECTID];
//
//                 this.tblS6AccidentChemicals.queryRelatedFeatures(flammableMixtureQuery).then(e => {
//                   var chemicalOBJECTIDS = [];
//                   e[accidentChemical.attributes.OBJECTID].features.forEach((item) => {
//                     chemicalOBJECTIDS.push(item.attributes.OBJECTID)
//                   });
//
//                   var chemicalLookup = new RelationshipQuery();
//                   chemicalLookup.outFields = ['*'];
//                   chemicalLookup.relationshipId = this.AccidentFlamMixChem.relationshipId;
//                   chemicalLookup.objectIds = chemicalOBJECTIDS;
//
//                   this.tblS6FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup).then(e => {
//                     var row_string = '<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(accidentChemical.attributes.QuantityReleased) + '</td></tr>';
//                     chemicalOBJECTIDS.forEach((objectid) => {
//                       e[objectid].features.forEach((mixtureChemical) => {
//                         row_string += '<tr><td>&#187;</td><td>' + mixtureChemical.attributes.ChemicalName + '</td><td></td></tr>';
//
//                       })
//                     });
//                     var row = domConstruct.toDom(row_string);
//                     domConstruct.place(row, "accident_" + accident.attributes.AccidentHistoryID);
//                   });
//                 });
//               } else {
//                 var row = domConstruct.toDom('<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(accidentChemical.attributes.QuantityReleased) + '</td></tr>');
//                 domConstruct.place(row, "accident_" + accident.attributes.AccidentHistoryID);
//               }
//             });
//           });
//         });
//       });
//     })
//   } else {
//     domConstruct.place(domConstruct.toDom('<b>Not Accidents Reported</b>'), "accidents");
//   }
//   accidentDeferred.resolve();
// });

// var ERQuery = new RelationshipQuery();
// ERQuery.outFields = ['*'];
// ERQuery.relationshipId = this.tblS9EmergencyResponses.relationshipId;
// ERQuery.objectIds = [attributes.OBJECTID];
//
// this.tblS1Facilities.queryRelatedFeatures(ERQuery).then( (e) => {
//   var er_plans = e[attributes.OBJECTID].features[0];
//   var row_string =
//     '<table><tbody id="er_plan_table">' +
//     '<tr><td>Is facility included in written community ER plan?</td><td>' + (er_plans.attributes.ER_CommunityPlan ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td>Does facility have its own written ER plan?</td><td>' + (er_plans.attributes.ER_FacilityPlan ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td colspan="2"></td></tr>' +
//     '<tr><td colspan="2"><b>Does facility\'s ER plan include ...</b></td></tr>' +
//     '<tr><td class="nested">specific actions to be take in response to accidental release of regulated substance(s)?</td><td>' + (er_plans.attributes.ER_ResponseActions ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td class="nested">procedures for informing the public and local agencies responding to accident releases?</td><td>' + (er_plans.attributes.ER_PublicInfoProcedures ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td class="nested">information on emergency health care?</td><td>' + (er_plans.attributes.ER_EmergencyHealthCare ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td></td></tr>' +
//     '<tr><td colspan="2"><b>Date of most recent ...</b></td></tr>' +
//     '<tr><td colspan="2" class="nested">review or update of facility\'s ER plan?  ' + (er_plans.attributes.ER_ReviewDate ? stamp.toISOString(new Date(er_plans.attributes.ER_ReviewDate), {
//       selector: "date",
//       zulu: true
//     }) : 'Not Reported') + '</td></tr>' +
//     '<tr><td colspan="2" class="nested">ER training for facility\'s ER employees?  ' + (er_plans.attributes.ERTrainingDate ? stamp.toISOString(new Date(er_plans.attributes.ERTrainingDate), {
//       selector: "date",
//       zulu: true
//     }) : 'Not Reported') + '</td></tr>' +
//     '<tr><td></td></tr>' +
//     '<tr><td colspan="2"><b>Local agency with which facility\'s ER plan ore response activities are coordinated</b></td></tr>' +
//     '<tr><td colspan="2" class="nested">Name: ' + (er_plans.attributes.CoordinatingAgencyName ? er_plans.attributes.CoordinatingAgencyName : 'Not Reported') +
//     '<br/>Number:' + (er_plans.attributes.CoordinatingAgencyPhone ? er_plans.attributes.CoordinatingAgencyPhone : 'Not Reported') + '</td></tr>' +
//     '<tr><td colspan="2"></td></tr>' +
//     '<tr><td colspan="2"><b>Subject to ...</b></td></tr>' +
//     '<tr><td class="nested">OSHA Regulations at 29 CFR 1910.38?</td><td>' + (er_plans.attributes.FR_OSHA1910_38 ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td class="nested">OSHA Regulations at 29 CFR 1910.120?</td><td>' + (er_plans.attributes.FR_OSHA1910_120 ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td class="nested">Clean Water Act Regulations at 40 CFR 112?</td><td>' + (er_plans.attributes.FR_SPCC ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td class="nested">RCRA Regulations at 40 CFR 264, 265, and 279.52?</td><td>' + (er_plans.attributes.FR_RCRA ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td class="nested">OPA 90 Regulations at 40 CFR 112, 33 CFR 154, 49 CFR 194, or 30 CFR 254?</td><td>' + (er_plans.attributes.FR_OPA90 ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td class="nested">State EPCRA Rules or Laws?</td><td>' + (er_plans.attributes.FR_EPCRA ? 'Yes' : 'No') + '</td></tr>' +
//     '<tr><td colspan="2" style="padding-left:10px;">Other: ' + er_plans.attributes.FR_OtherRegulation + '</td></tr>' +
//     '</tbody></table>';
//   var row = domConstruct.toDom(row_string);
//   domConstruct.place(row, 'emergency_plan');
// });

        if (!this.multipleRMPs) {
            if (attributes.ValidLatLongFlag) {
                var location_string = 'RMP Validated Location Used' +
                    '<br/>Description: ' + this.tblS1Facilities.getDomain('LatLongDescription').getName(attributes.LatLongDescription) +
                    '<br/>Method: ' + this.tblS1Facilities.getDomain('LatLongMethod').getName(attributes.LatLongMethod);
            } else if (!attributes.ValidLatLongFlag && attributes.FRS_Lat !== undefined && attributes.FRS_long !== undefined) {
                var location_string = 'FRS Location Used' +
                    '<br/>Description: ' + this.tblS1Facilities.getDomain('FRS_Description').getName(attributes.FRS_Description) +
                    '<br/>Method: ' + this.tblS1Facilities.getDomain('FRS_Method').getName(attributes.FRS_Method);
            } else {
                var location_string = 'Location Not Validated' +
                    '<br/>Description: ' + this.tblS1Facilities.getDomain('LatLongDescription').getName(attributes.LatLongDescription) +
                    '<br/>Method: ' + this.tblS1Facilities.getDomain('LatLongMethod').getName(attributes.LatLongMethod);
            }

            if (attributes.HorizontalAccMeasure) {
                location_string += '<br/>Horizontal Accuracy (m): ' + attributes.HorizontalAccMeasure +
                    '<br/>Horizontal Datum: ' + this.tblS1Facilities.getDomain('HorizontalRefDatumCode').getName(attributes.HorizontalRefDatumCode) +
                    (attributes.SourceMapScaleNumber ? '<br/>Source Map Scale: ' + attributes.SourceMapScaleNumber : '')
            }

            // var row = domConstruct.toDom(location_string);
            // domConstruct.place(row, 'location_metadata');
        }
// todo: figure out loading shelter and deferred
// all([processDeferred.promise, accidentDeferred.promise]).then(function () {
//   that.loadingShelter.hide();
// });
    }

    render() {

        return (
            <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto", height: "97%"}}>
                <this.FacilityText/>
                <this.Grid/>
                {/*{this.showGrid ?  : null}*/}
                {this.mainText ? this.LandingText() : null}
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        )
    }

}

class RMP extends Component
    <any, any> {

}