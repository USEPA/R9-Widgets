/** @jsx jsx */
import './assets/style.css';
import {React, AllWidgetProps, BaseWidget, css, getAppStore, jsx, WidgetState, SessionManager} from "jimu-core";
import {IMConfig} from "../config";
import {JimuMapView, JimuMapViewComponent} from "jimu-arcgis";
import DataGrid, {SelectColumn} from "react-data-grid";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Extent from "esri/geometry/Extent";
import FeatureLayer from "esri/layers/FeatureLayer";
import Query from "esri/rest/support/Query";
import SimpleMarkerSymbol from "esri/symbols/SimpleMarkerSymbol";
import Graphic from "esri/Graphic";
import Color from "esri/Color";

function getComparator(sortColumn: string) {
    switch (sortColumn) {
        // todo: configure for NRC columns
        case 'sourceofpollution':
            return (a, b) => {
                return a[sortColumn].localeCompare(b[sortColumn]);
            };
        case 'dateofreport':
            return (a, b) => {
                // @ts-ignore
                return new Date(a[sortColumn]) - new Date(b[sortColumn]);
            };
        default:
            throw new Error(`unsupported sortColumn: "${sortColumn}"`);
    }
}

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, {
    jimuMapView: JimuMapView, loading: boolean, columns: any[], rows: any[], sortedRows: any[], sortColumns: any[],
    nothingThere: any[], record: any[],
}> {

    jmv: JimuMapView;
    first: boolean = false;
    loading: boolean = false;
    mainText: boolean = true;
    rows: any[] = [];
    sortedRows: any[] = [];
    columns: any[] = [];
    sortColumns: any[] = [];
    graphicsLayer: GraphicsLayer;
    nothingThere: any[] = [];
    multipleLocations: boolean = false;
    nrcLayer: FeatureLayer;
    featureSet: any[] = [];
    symbol: SimpleMarkerSymbol;
    // proxyUrl = "https://r9data.response.epa.gov/apps/webeocproxy";
    proxyUrl = "http://127.0.0.1:5000/webeocproxy";
    token: any;
    record: any[] = [];
    openVisState: boolean = true;
    nrcTitle: string = 'WebEOCHotlineLogGeoJSON';

    constructor(props) {
        super(props);
        // bind this to class methods
        this.NothingFound = this.NothingFound.bind(this);
        this.LandingText = this.LandingText.bind(this);
        this.mapClick = this.mapClick.bind(this);
        this.rowClick = this.rowClick.bind(this);
        this.Grid = this.Grid.bind(this);
        this.onSortColsChange = this.onSortColsChange.bind(this);
        this.RecordText = this.RecordText.bind(this);
        this.loadLog = this.loadLog.bind(this);

    }

    componentDidMount() {
        this.loading = true;
        this.setState({
            loading: this.loading,
        });

        // @ts-ignore
        this.nrcLayer = this.jmv.view.map.layers.find(lyr => {
            return lyr.title.includes(this.nrcTitle);
        });

        let addedToMap: boolean;

        if (this.nrcLayer == undefined) {
            addedToMap = false;
            this.nrcLayer = new FeatureLayer({url: 'https://utility.arcgis.com/usrsvcs/servers/ea5c6623faee4c71a165c07902c5394b/rest/services/WebEOC/WebEOCHotlineLogGeoJSON_NEW/FeatureServer/0'});
        } else {
            addedToMap = true;
        }

        this.getLayerVis();

        if (!addedToMap) {
            this.jmv.view.map.layers.add(this.nrcLayer);
        }

        this.nrcLayer.on('layerview-create', () => {
                this.mainText = true;
                this.LandingText();
            }
        );

        this.graphicsLayer = new GraphicsLayer();
        this.symbol = new SimpleMarkerSymbol({size: 20, color: new Color([255, 255, 0, 0.5])});

        this.jmv.view.map.layers.add(this.graphicsLayer);

        let sessions = SessionManager.getInstance().getSessions();
        if (sessions.length > 0) {
            // todo: make sure this will work in all cases of the app being used
            this.token = sessions[0].token;
        }
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
                this.getLayerVis();
                this.loading = false;
                this.nrcLayer.visible = true;
                this.setState({
                    loading: this.loading
                });
            }
            this.first = false;
        } else {
            this.first = true;
            this.nrcLayer.visible = this.openVisState;

        }
    }

    getLayerVis() {
        this.jmv.view.map.layers.forEach(lyr => {
            if (lyr.title == this.nrcLayer.title) {
                this.openVisState = lyr.visible
                return
            }
        });

        if (!this.openVisState) {
            this.nrcLayer.visible = true;
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
                    <h2> Select Web EOC point to view the log.</h2>
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
        this.record = [];
        this.sortedRows = [];
        this.nothingThere = [];
        this.setState({
            loading: this.loading,
            rows: this.rows,
            sortedRows: this.sortedRows,
            record: this.record,
            nothingThere: this.nothingThere,
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
        featureQuery.orderByFields = ['dateofreport DESC'];
        featureQuery.returnGeometry = true;
        this.nrcLayer.queryFeatures(featureQuery).then((features) => {
            this.featureSet = features.features
            if (this.featureSet.length === 1) {
                this.multipleLocations = false;
                this.loadLog(this.featureSet[0]);
            } else if (this.featureSet.length > 1) {
                this.multipleLocations = true;
                let data = [];
                this.featureSet.forEach(feature => {
                    data.push(feature.attributes);
                });

                this.rows = data;
                this.sortedRows = data;
                this.columns = [
                    {
                        key: 'sourceofpollution',
                        name: 'Source of Pollution'
                    },
                    {
                        key: 'dateofreport',
                        name: 'Date of Report',
                        formatter(props) {
                            const date = props.row.dateofreport
                            return <p>{new Date(date).toISOString().split('T')[0]}</p>
                        }
                    }
                ];
                this.loading = false;

                this.setState({
                    rows: this.rows,
                    sortedRows: this.sortedRows,
                    columns: this.columns,
                    loading: this.loading
                }, () => {
                    this.Grid();
                });
            } else {
                this.multipleLocations = false;
                this.nothingThere = [<h3>No logs found at this location</h3>]
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
        this.loadLog(location[0]);
    }

    NothingFound() {
        if (this.nothingThere.length > 0) {
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


        this.setState({
            sortedRows: this.sortedRows,
            sortColumns: this.sortColumns
        });

        return this.sortedRows
    }

    RecordText() {
        if (this.record.length > 0) {
            return (
                <div>
                    {this.record}
                </div>
            )
        } else {
            return null
        }
    }

    loadLog(logEntry) {
        this.multipleLocations = false;
        this.loading = true;
        this.setState({
            loading: this.loading
        });
        let selectedGraphic = new Graphic({geometry: logEntry.geometry, symbol: this.symbol});
        this.graphicsLayer.add(selectedGraphic);
        fetch(this.proxyUrl + '/' + logEntry.attributes.nrcnumber, {
            headers: {'Content-Type': 'application/json', 'Authorization': this.token}
        }).then(function (response) {
            return response.text();
        }).then((response) => {
            this.loading = false;
            this.record.push(
                // todo: explore alternatives to this method
                <div dangerouslySetInnerHTML={{__html: response}}>
                </div>);

            this.setState({
                loading: this.loading,
                record: this.record,
            }, () => {
                this.RecordText();
            });
        });
    }

    render() {
        return (
            <div className="widget-addLayers jimu-widget w-100 p-2" style={{overflow: "auto", width: '600px'}}>
                <this.NothingFound/>
                {this.loading ? <h2 style={{background: 'white'}}>Loading...</h2> :
                    <div>
                        <this.Grid/>
                        <this.RecordText/>
                    </div>
                }
                {this.mainText ? this.LandingText() : null}
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        )
    }
}
