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
    nothingThere: boolean = false;
    multipleLocations: boolean = false;

    constructor(props) {
        super(props);
        // bind this to class methods
    }

    componentDidMount() {



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

    componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView}>, snapshot?: any) {
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


    }

    rowKeyGetter(row) {
        return row;
    }

    rowClick(row) {
        // let location = this.featureSet.filter((feature) => {
    //         return feature.attributes.OBJECTID === this.sortedRows[row].OBJECTID;
    //     });
    //     this.loadFeature(location[0]);
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
