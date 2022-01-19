/** @jsx jsx */
import './assets/style.css';
import {React, AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState} from "jimu-core";
import {IMConfig} from "../config";
import {JimuMapView, JimuMapViewComponent} from "jimu-arcgis";
import DataGrid, {SelectColumn} from "react-data-grid";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Extent from "esri/geometry/Extent";
import Query from "esri/rest/support/Query";
import FeatureLayer from "esri/layers/FeatureLayer";
import SimpleMarkerSymbol from "esri/symbols/SimpleMarkerSymbol";
import geometry from "esri/geometry";
import Graphic from "esri/Graphic";


function getComparator(sortColumn: string) {
    switch (sortColumn) {
        // todo: configure for SDWIS columns
        case '':
            return (a, b) => {
                return a[sortColumn].localeCompare(b[sortColumn]);
            };
        default:
            throw new Error(`unsupported sortColumn: "${sortColumn}"`);
    }
}

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, {
    jimuMapView: JimuMapView, loading: boolean, columns: any[], rows: any[], sortedRows: any[], sortColumns: any[],
    onOpenText: any[], nothingThere: any[], facilityText: any[],
}> {

    jmv: JimuMapView;
    first: boolean = false;
    loading: boolean = true;
    mainText: boolean = true;
    rows: any[] = [];
    sortedRows: any[] = [];
    columns: any[] = [];
    sortColumns: any[] = [];
    graphicsLayer: GraphicsLayer;
    nothingThere: any[] = [];
    multipleLocations: boolean = false;
    featureLayer: FeatureLayer;
    featureLayerPWS: FeatureLayer;
    featureLayerTable: FeatureLayer;
    featureLayerAdmin: FeatureLayer;
    onOpenText: any[] = [];
    featureSet: any[] = [];
    symbol: SimpleMarkerSymbol;
    facilityText: any[] = [];


    constructor(props) {
        super(props);
        // bind this to class methods
        this.NothingFound = this.NothingFound.bind(this);
        this.LandingText = this.LandingText.bind(this);
        this.mapClick = this.mapClick.bind(this);
        this.rowClick = this.rowClick.bind(this);
        this.Grid = this.Grid.bind(this);
        this.onSortColsChange = this.onSortColsChange.bind(this)
    }

    componentDidMount() {
        this.featureLayer = new FeatureLayer({
            url: 'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/0',
            outFields: ['*']
        });
        this.featureLayerPWS = new FeatureLayer({
            url: 'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/1',
            outFields: ['*']
        });
        this.featureLayerTable = new FeatureLayer({
            url: 'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/3',
            outFields: ['*']
        });
        this.featureLayerAdmin = new FeatureLayer({
            url: 'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/5',
            outFields: ['*']
        });
        this.featureLayer.on('layerview-create-error', (e) => {
            this.onOpenText = [];
            this.onOpenText.push(
                <div>
                    The R9 SDWIS service resides on the EPA Intranet. Connect to the Pulse Secure client to access the
                    data.
                </div>
            );
            this.setState({
                onOpenText: this.onOpenText,
            });
        });

        this.symbol = new SimpleMarkerSymbol();
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

    componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView }>, snapshot?: any) {
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
        this.mainText = false;
        this.loading = true;
        this.rows = [];
        this.sortedRows = [];
        this.setState({
            loading: this.loading,
            rows: this.rows,
            sortedRows: this.sortedRows,
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

        let featureQuery = new Query();
        featureQuery.outFields = ['*'];
        featureQuery.geometry = clickExtent;
        featureQuery.returnGeometry = true;
        this.featureLayer.queryFeatures(featureQuery).then(featureSet => {
            this.featureSet = featureSet.features;
            if (this.featureSet.length === 1) {
                this.loadFacility(this.featureSet[0]);
            } else if (this.featureSet.length > 1) {

                let data = [];

                this.featureSet.forEach((feature) => {
                    let attrs = feature.attributes;
                    data.push(attrs);
                });

                this.columns = [{key: 'FacilityName', name: 'Name'}];
                this.rows = data;
                this.sortedRows = data
                this.multipleLocations = true;
                this.setState({
                    columns: this.columns,
                    rows: this.rows,
                    sortedRows: this.sortedRows,
                });

                this.Grid();
                this.loading = false;
                this.setState({
                    loading: this.loading,
                })
            } else {
                this.nothingThere = [<div>No facilities found at this location</div>];
                this.loading = false;
                this.setState({
                    nothingThere: this.nothingThere,
                    loading: this.loading,
                });
            }
        });

    }

    rowKeyGetter(row) {
        return row;
    }

    rowClick(row) {
        let location = this.featureSet.filter((feature) => {
            return feature.attributes.OBJECTID === this.sortedRows[row].OBJECTID;
        });
        this.loadFacility(location[0]);
    }

    NothingFound() {
        if (this.nothingThere.length > 0) {
            return (
                <div>
                    <h3>{this.nothingThere}</h3><br/>
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

    loadFacility(facility) {
        let selectedGraphic = new Graphic({geometry: facility.geometry, symbol: this.symbol});
        this.graphicsLayer.add(selectedGraphic);
        this.loading = true;
        this.setState({
            loading: this.loading,
        });
        // @ts-ignore
        let facilitytype = this.featureLayer.getFieldDomain('fac_type').getName(facility.attributes.fac_type);
        // @ts-ignore
        let sourcetype = this.featureLayer.getFieldDomain('fac_sourcetype').getName(facility.attributes.fac_sourcetype);
        // @ts-ignore
        let availability = this.featureLayer.getFieldDomain('fac_availability').getName(facility.attributes.fac_availability);
        // @ts-ignore
        let sellertreated = this.featureLayer.getFieldDomain('sellertrtcode').getName(facility.attributes.sellertrtcode);
        // @ts-ignore
        let trtstatus = this.featureLayer.getFieldDomain('facsourcetrtstatus').getName(facility.attributes.facsourcetrtstatus);

        this.facilityText = []
        this.facilityText.push(<div>
            <p style={{fontSize: '16px'}}>
                <b>Public Water System (PWS)</b></p>
            <p style={{fontSize: '14px'}}>
                <b>Name: </b>{facility.attributes.fac_pws_name ? facility.attributes.fac_pws_name : 'Not Reported'}<br/><b>ID: </b>
                {facility.attributes.fac_pwsid ? facility.attributes.fac_pwsid : 'Not Reported'}</p>
            <br/><b><p style={{textAlign: "center"}}>Water System Facility Details</p></b>
            <hr/>
            <b>Facility Name:</b>
            {facility.attributes.facilityname ? facility.attributes.facilityname : 'Not Reported'}<br/><b>Facility
            ID: </b>
            {facility.attributes.facilityid ? facility.attributes.facilityid : 'Not Reported'}<br/><b>Facility
            Type: </b>
            {facilitytype ? facilitytype : 'Not Reported'}<br/><b>Source
            Type:</b>{sourcetype ? sourcetype : 'Not Reported'}<br/>
            <b>Source Treated: </b>{trtstatus ? trtstatus : 'Not Reported'}<br/>
            <b>Facility Availability:</b>{availability ? availability : 'Not Reported'}<br/>
            <b>Last
                Updated: </b>{facility.attributes.last_reported ? facility.attributes.last_reported : 'Not Reported'}<br/>
            <b>PWS Purchased
                From: </b>{facility.attributes.pwsid_seller ? facility.attributes.pwsid_seller : 'Not Reported'}<br/>
            <b>Purchased Water Treated: </b>{sellertreated ? sellertreated : 'Not Reported'}<br/><br/>
            <div id="pwsinfo"></div>
            <p style={{textAlign: "center"}}><a
                href={"https://echo.epa.gov/detailed-facility-report?fid=" + facility.attributes.fac_pwsid}
                target="_blank\"><b>ECHO Detailed System Report</b> </a></p>
            <p style={{textAlign: "center"}}>&nbsp;</p>
            <table style={{
                height: '98px',
                borderColor: '#000000',
                marginLeft: 'auto',
                marginRight: 'auto',
                width: '100%'
            }}>
                <tbody>
                <tr>
                    <td style={{textAlign: 'center', width: '287px'}}><b>Public Water System Contact</b>
                        <hr/>
                        <div id="admincontacts"></div>
                    </td>
                </tr>
                </tbody>
            </table>
            <p>&nbsp;</p>
            <table style={{
                height: '98px',
                borderColor: '#000000',
                marginLeft: 'auto',
                marginRight: 'auto',
                width: "100%"
            }}>
                <tbody>
                <tr>
                    <td style={{textAlign: 'center', width: '287px'}}>
                        <strong>
                            <p style={{textAlign: 'center'}}>Regulatory Agency Contact</p></strong>
                        <hr/>
                        <div id="tableinfo"></div>
                    </td>
                </tr>
                </tbody>
            </table>


            <p>&nbsp;</p>
        </div>)
        this.loading = false;
        this.setState({
            loading: this.loading,
        })
        this.loadFacilityPWS(facility.attributes.fac_pwsid);
        this.loadFacilityTable(facility.attributes.pacode);
        this.loadFacilityAdmin(facility.attributes.fac_pwsid);
    };

    loadFacilityPWS(PWS_ID) {
        var _this = this;
        var query = new query_1.default();
        query.outFields = ['*'];
        query.where = "PWSID='" + PWS_ID + "'";
        this.featureLayerPWS.queryFeatures(query, function (featureSet) {
            var facilityPWS = featureSet.features[0];
            var tribe = _this.featureLayerPWS.getDomain('tribe')["getName"](facilityPWS.attributes.tribe);
            var school = _this.featureLayerPWS.getDomain('pws_schoolordaycare')["getName"](facilityPWS.attributes.pws_schoolordaycare);
            var ownertype = _this.featureLayerPWS.getDomain('pws_ownertype')["getName"](facilityPWS.attributes.pws_ownertype);
            var wholesale = _this.featureLayerPWS.getDomain('pws_wholesale')["getName"](facilityPWS.attributes.pws_wholesale);
            var watertype = _this.featureLayerPWS.getDomain('pws_wsourcetype')["getName"](facilityPWS.attributes.pws_wsourcetype);
            var state = _this.featureLayerPWS.getDomain('pws_agencycode')["getName"](facilityPWS.attributes.pws_agencycode);
            var pws = "<b><p style=\"text-align: center;\">Public Water System Details</p></b>" + "<hr/>" + "<b>City Served: </b>" + (facilityPWS.attributes.city ? facilityPWS.attributes.city : 'Not Reported') + "</br>" + "<b>County Served: </b>" + (facilityPWS.attributes.county ? facilityPWS.attributes.county : 'Not Reported') + "</br>" + "<b>State: </b>" + (state ? state : 'Not Reported') + "</br>" + "<b>Tribe Name: </b>" + (tribe ? tribe : 'Not Reported') + "</br>" + "<b>PWS Population Served: </b>" + (facilityPWS.attributes.pws_popserve ? facilityPWS.attributes.pws_popserve : 'Not Reported') + "</br>" + "<b>Is the PWS a School or Daycare? </b>" + (school ? school : 'Not Reported') + "</br>" + "<b>PWS Owner Type: </b>" + (ownertype ? ownertype : 'Not Reported') + "</br>" + "<b>Is PWS Wholesaler to Another PWS? </b>" + (wholesale ? wholesale : 'Not Reported') + "</br>" + "<b>PWS Source Water Type: </b>" + (watertype ? watertype : 'Not Reported') + "<p style=\"text-align: center;\">&nbsp;</p>";
            dom_construct_1.default.place(pws, 'pwsinfo');
        });
    };

    //pulls information from Primacy Agency table for the Regulatory section (bottom) "Regulatory Agency"
    loadFacilityTable(PAcode) {
        var query = new query_1.default();
        query.outFields = ['*'];
        query.where = "PACode='" + PAcode + "'";
        this.featureLayerTable.queryFeatures(query, function (featureSet) {
            var facilityTable = featureSet.features[0];
            var table = "<p style=\"text-align: center;\">" + facilityTable.attributes.regauthority + "</p>" + "<p style=\"text-align: left;\"><b>Primary Contact: </b>" + (facilityTable.attributes.primarycontactname ? facilityTable.attributes.primarycontactname : 'Not Reported') + "</br>" + "<b>Phone: </b>" + (facilityTable.attributes.phone_number ? facilityTable.attributes.phone_number : 'Not Reported') + "</br>" + "<b>Email: </b>" + (facilityTable.attributes.email ? "<a href=\"mailto:" + facilityTable.attributes.email + "\"target=\"_blank\">" + facilityTable.attributes.email + " </a>" : 'Not Reported') + "</br>" + "<b>Website: </b>" + ("<a href=\"" + facilityTable.attributes.website + "\" target=\"_blank\">Click Here for Website</a>") + "</br>" + "<b>Address: </b>" + (facilityTable.attributes.mailing_address ? facilityTable.attributes.mailing_address : 'Not Reported') + "</p>";
            dom_construct_1.default.place(table, 'tableinfo');
        });
    };

    //pulls information from Admin Contact table for the Point of Contact section (top) "PWS Contact Information"
    loadFacilityAdmin(pwsid) {
        var query = new query_1.default();
        query.where = "PWSID='" + pwsid + "'";
        this.featureLayerAdmin.queryFeatures(query, function (featureSet) {
            var facilityAdmin = featureSet.features[0];
            var admin = "<p style=\"text-align: left;\">" + "<b>Primary Contact: </b>" + (facilityAdmin.attributes.org_name ? facilityAdmin.attributes.org_name : 'Not Reported') + "</br>" + "<b>Phone: </b>" + (facilityAdmin.attributes.phone_number ? facilityAdmin.attributes.phone_number : 'Not Reported') + "</br><b>Email: </b>" + (facilityAdmin.attributes.email_addr ? "<a href=\"mailto:" + facilityAdmin.attributes.email_addr + "\"target=\"_blank\">" + facilityAdmin.attributes.email_addr + " </a>" : 'Not Reported') + "</br>" + "<b>Address: </b>" + (facilityAdmin.attributes.address_line1 ? facilityAdmin.attributes.address_line1 : 'Not Reported') + "</br>" + (facilityAdmin.attributes.city_name ? facilityAdmin.attributes.city_name : '') + " " + (facilityAdmin.attributes.state_code ? facilityAdmin.attributes.state_code : '') + " " + (facilityAdmin.attributes.zip_code ? facilityAdmin.attributes.zip_code : '') + "</p>";
            dom_construct_1.default.place(admin, 'admincontacts');
        });
    };

    render() {
        return (
            <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto", height: "97%"}}>
                <this.NothingFound/>
                {this.loading ? <h2 style={{background: 'white'}}>Loading...</h2> :
                    <div>
                        <this.Grid/>
                    </div>
                }

                {this.mainText ? this.LandingText() : null}
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        )
    }
}
