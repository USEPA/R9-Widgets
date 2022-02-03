/** @jsx jsx */
import './assets/style.css';
import {AllWidgetProps, BaseWidget, getAppStore, jsx, WidgetState} from "jimu-core";
import {IMConfig} from "../config";
import esriRequest from "esri/request";
import {
    Button,
    Dropdown,
    DropdownButton,
    DropdownItem,
    DropdownMenu,
    Icon,
    Modal,
    ModalBody,
    ModalHeader
} from 'jimu-ui';
import {JimuMapView, JimuMapViewComponent, MapViewManager} from 'jimu-arcgis';
import moment from 'Moment';
import info from 'jimu-ui/lib/icons/info.svg'

import {
    AnimatedEnvironmentLayer,
    DisplayOptions,
    // PointReport,
    // Bounds,
    // Particle
} from "./animatedEnvironmentLayer";

export default class WindWidget extends BaseWidget<AllWidgetProps<IMConfig>, {}> {

    // wind data urls
    hrrrUrl = 'https://r9data.response.epa.gov/apps/wind_data/current_wind_hrrr.json'
    namUrl = 'https://r9data.response.epa.gov/apps/wind_data/current_wind_nam.json'
    gfsUrl = 'https://r9data.response.epa.gov/apps/wind_data/current_wind_gfs.json'

    // locally stored JSONs for testing
    // hrrrUrl = `${this.props.context.folderUrl}dist/runtime/assets/current_wind_hrrr.json`
    // namUrl = `${this.props.context.folderUrl}/dist/runtime/assets/current_wind_nam.json`;
    // gfsUrl = `${this.props.context.folderUrl}/dist/runtime/assets/current_wind_gfs.json`;

    displayOptions: DisplayOptions = {
        maxVelocity: 15
    }

    selectedModel: string = "HRRR";

    environmentLayer = new AnimatedEnvironmentLayer({
        id: "ael-layer",
        url: this.hrrrUrl,
        displayOptions: this.displayOptions
    });

    jmv: JimuMapView;
    _forecast_datetime;
    openModal: boolean = false;
    loading: boolean = false;

    constructor(props) {
        super(props);
        this.infoModal = this.infoModal.bind(this);
        this.modalVis = this.modalVis.bind(this);
    }


    onActiveViewChange = (jmv: JimuMapView) => {
        this.jmv = jmv;
        this.jmv.view.map.allLayers.on("change", e => console.log(e.added[0]));
    }

    componentDidMount() {
        this.loading = true;
        this.setState({
            loading: this.loading
        });

        // default to hrrr on open
        esriRequest(this.hrrrUrl, {responseType: 'json'}).then(res => {
            this._updateForecast(res.data[0].header);
            this.environmentLayer.load().then(res => {
                this.jmv.view.map.add(this.environmentLayer, 0);
                this.loading = false;
                this.setState({
                    loading: this.loading
                });
            });
        });
        this.openModal = false;
    }

    componentWillUnmount() {
        this.jmv.view.map.remove(this.environmentLayer);
    }

    componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{}>, snapshot?: any) {
        let widgetState: WidgetState;
        widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;
        if (widgetState == WidgetState.Opened) {

        } else if (widgetState == WidgetState.Closed) {
            // // do stuff here on widget open if needed
            this.jmv.view.map.remove(this.environmentLayer);
            this.openModal = false;
        }
    }

    getArbitraryFirstMapWidgetId = (): string => {
        const appState: any = window._appState;
        // Loop through all the widgets in the config and find the "first"
        // that has the type (uri) of "arcgis-map"
        const arbitraryFirstMapWidgetInfo: { [key: string]: any } = Object.values(appState.appConfig.widgets).find((widgetInfo: any) => {
            return widgetInfo.uri === 'widgets/arcgis/arcgis-map/'
        });

        return arbitraryFirstMapWidgetInfo.id;
    }

    _setWindModel(model) {
        this.loading = true;
        this.selectedModel = model;
        this.setState({
            loading: this.loading,
            selectedModel: this.selectedModel
        });

        let layerUrl: string;

        if (model === 'HRRR') {
            layerUrl = this.hrrrUrl;
        } else if (model === 'NAM') {
            layerUrl = this.namUrl;
        } else if (model === 'GFS') {
            layerUrl = this.gfsUrl;
        }

        this.jmv.view.map.layers.remove(this.environmentLayer);

        esriRequest(layerUrl, {responseType: 'json'}).then(res => {
            this._updateForecast(res.data[0].header);
        });

        this.environmentLayer = new AnimatedEnvironmentLayer({
            id: "ael-layer",
            url: layerUrl,
            displayOptions: this.displayOptions
        });

        this.environmentLayer.load().then(() => {
            this.jmv.view.map.layers.add(this.environmentLayer);
            this.loading = false;
            this.setState({
                loading: this.loading,
            });

        });

        return model;
    }

    _updateForecast(forecastData) {
        this._forecast_datetime = [];
        this._forecast_datetime.push(<p>Forecast
            for {moment(forecastData.refTime).add(forecastData.forecastTime, 'hours').format('ll hA')}</p>);
        this.setState({
            _forecast_datetime: this._forecast_datetime
        });
    }

    modalVis() {
        this.openModal = !this.openModal;
        this.setState({
            openModal: this.openModal,
        })
    }

    infoModal() {
        return (
            <Modal isOpen={this.openModal}>
                <ModalHeader toggle={this.modalVis}>
                    Wind Widget Information
                </ModalHeader>
                <ModalBody>
                    <b style={{fontSize: 'larger'}}>NOAA Wind Data</b>
                    <p>The data visualized are freely available and provided by NOAA's <a
                        href={"https://nomads.ncep.noaa.gov/"} rel="noopener noreferrer"
                        target="_blank">NOMADS</a> initiative.
                        The widget animates the wind forecast data as moving particles according to the wind vector and
                        the speed and color of the particle
                        correspond to the wind speed. Data for each of the models below are retrieved on an hourly basis
                        and the forecast DateTime is displayed
                        in the legend, and model menu. The temporal and spatial resolution of the models varies and is
                        described below. All of the
                        forecasts are for 10 meters above ground.</p>
                    <ul>
                        <li><a href={"https://nomads.ncep.noaa.gov/txt_descriptions/HRRR_doc.shtml"}
                               rel="noopener noreferrer" target="_blank">HRRR</a> - High Resolution Rapid Refresh
                            <ul>
                                <li>CONUS</li>
                                <li>3km horizontal resolution</li>
                                <li>Run every hour</li>
                            </ul>
                        </li>
                        <li><a href={"https://nomads.ncep.noaa.gov/txt_descriptions/WRF_NMM_doc.shtml"}
                               rel="noopener noreferrer" target="_blank">NAM</a> - North American Mesoscale Model -
                            (Non-Hydrostatic Mesoscale Model)
                            <ul>
                                <li>CONUS</li>
                                <li>12km horizontal resolution<s></s></li>
                                <li>Run every 3 hours</li>
                            </ul>
                        </li>
                        <li><a href={"https://nomads.ncep.noaa.gov/txt_descriptions/GFS_doc.shtml"}
                               rel="noopener noreferrer" target="_blank">GFS</a> - Global Forecast System
                            <ul>
                                <li>Global</li>
                                <li>13km horizontal resolution</li>
                                <li>Run every hour</li>
                            </ul>
                        </li>
                    </ul>
                </ModalBody>
            </Modal>
        )
    }

    render() {
        return (
            <div className="windmenu w-100">
                {this.loading ? <h2 style={{background: 'none'}}>Loading...</h2> :
                    <div>
                        <div id='forecast-data'
                             style={{color: 'white', padding: '5px', height: '20px'}}>{this._forecast_datetime}</div>
                        <div id='wind-model' style={{display: 'flex', alignItems: 'center', padding: '5px'}}>
                            <div style={{color: 'white'}}>Wind Model:</div>
                            <Dropdown>
                                <DropdownButton style={{
                                    borderRadius: '5px',
                                    marginLeft: '5px',
                                    height: '18px',
                                    backgroundColor: 'whitesmoke'
                                }}>
                                    {this.selectedModel}
                                </DropdownButton>
                                <DropdownMenu>
                                    <DropdownItem active onClick={() => {
                                        this._setWindModel('HRRR')
                                    }}>HRRR</DropdownItem>
                                    <DropdownItem onClick={() => {
                                        this._setWindModel('NAM')
                                    }}>NAM</DropdownItem>
                                    <DropdownItem onClick={() => {
                                        this._setWindModel('GFS')
                                    }}>GFS</DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                            <Button icon onClick={this.modalVis}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        position: 'relative',
                                        marginLeft: 'auto'
                                    }}>
                                <Icon icon={info} size='m' color='white'/>
                            </Button>
                        </div>
                        <this.infoModal/>
                    </div>}

                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        );
    }
}
