import {AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState} from "jimu-core";
import {IMConfig} from "../config";
import {JimuMapView, JimuMapViewComponent} from "jimu-arcgis";
import React, {Component} from 'react';
import PictureMarkerSymbol from "esri/symbols/PictureMarkerSymbol";
import MapImageLayer from "esri/layers/MapImageLayer";
import * as ReactDataGrid from "react-data-grid";
import Query from "esri/rest/support/Query";
import SpatialReference from "esri/geometry/SpatialReference";
import query from "esri/rest/query";
import geometryEngine from "esri/geometry/geometryEngine";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Extent from "esri/geometry/Extent";
import Sublayer from "esri/layers/support/Sublayer";

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, { jimuMapView: JimuMapView, landingText: string }> {
    jmv: JimuMapView;
    rmpLayer: MapImageLayer;
    symbol: PictureMarkerSymbol;
    mainText: boolean = true;
    first: boolean = false;
    r9Geom: any;
    graphicLayer: GraphicsLayer;
    facilities: any;


    constructor(props) {
        super(props);

        this.mainText = true;
        // this.landingText = "";
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

        this.jmv.view.map.layers.add(this.rmpLayer)
        this.rmpLayer.allSublayers.find(lyr => {

            return lyr.title === "Active RMP Facilities";
            // return lyr
        });

        //
        //
        // console.dir(this.facilities);

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
        }


    }

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

    mapClick = (e) => {
        // that.loadingShelter.show();
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

        // that.facilities.queryFeatures(featureQuery, function (featureSet) {
        //   if (featureSet.features.length === 1) {
        //     that.loadRMPs(featureSet.features[0]);
        //     // noneFound.push(false);
        //   } else if (featureSet.features.length > 1) {
        //     mapIdNode.innerHTML = '<h3>Multiple Facilities at that location</h3><br/><h5>Select one to continue</h5>' +
        //       '<div id="gridDiv" style="width:100%;"></div>';
        //     var data = {
        //       identifier: 'OBJECTID',
        //       items: []
        //     };
        //     dojo.forEach(featureSet.features, function (feature) {
        //       var attrs = dojo.mixin({}, feature.attributes);
        //       data.items.push(attrs);
        //     });
        //
        //     var store = new ItemFileWriteStore({data: data});
        //     store.data = data;
        //
        //     var grid = dijit.byId("grid");
        //
        //     if (grid !== undefined) {
        //       grid.destroy();
        //     }
        //
        //     var layout = [
        //       {'name': 'Name', 'field': 'FacilityName', 'width': '100%'}
        //     ];
        //     grid = new DataGrid({
        //       id: 'grid',
        //       store: store,
        //       structure: layout,
        //       //rowSelector: '20px',
        //       autoHeight: true
        //     });
        //
        //     grid.placeAt("gridDiv");
        //
        //     grid.on('RowClick', function (e) {
        //       var rowItem = grid.getItem(e.rowIndex);
        //       var facility = array.filter(featureSet.features, function (feature) {
        //         return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
        //       });
        //       that.loadRMPs(facility[0]);
        //     });
        //
        //     grid.startup();
        //     that.loadingShelter.hide();
        //     // noneFound.push(false);
        //   } else {
        //     mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
        //     that.loadingShelter.hide();
        //   }
        // });


    }

    render() {
        return (
            <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto", height: "97%"}}>
                {this.mainText ? this.LandingText() : null}
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        )
    }

}

class RMP extends Component<any, any> {

}