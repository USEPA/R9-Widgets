/** @jsx jsx */
import {AllWidgetProps, BaseWidget, getAppStore, jsx, WidgetState} from "jimu-core";
import {IMConfig} from "../config";
import './assets/current_wind_gfs.json';

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
import {Component} from 'react';
import {JimuMapView, JimuMapViewComponent, MapViewManager} from 'jimu-arcgis';
import FeatureLayer from 'esri/layers/FeatureLayer';
import execute from "esri/rest/query";
import Extent from 'esri/geometry/Extent';
import moment from 'Moment';
import {InfoOutlined} from 'jimu-icons/outlined/suggested/info'
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
    // hrrr: https://r9data.response.epa.gov/apps/wind_data/current_wind_hrrr.json
    // nam: https://r9data.response.epa.gov/apps/wind_data/current_wind_nam.json
    // gfs: https://r9data.response.epa.gov/apps/wind_data/current_wind_gfs.json
    // locally stored JSONs for testing
    hrrrUrl = `${this.props.context.folderUrl}dist/runtime/assets/current_wind_hrrr.json`
    namUrl = `${this.props.context.folderUrl}/dist/runtime/assets/current_wind_nam.json`;
    gfsUrl = `${this.props.context.folderUrl}/dist/runtime/assets/current_wind_gfs.json`;
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
    modal: boolean = false;


    onActiveViewChange = (jmv: JimuMapView) => {
        this.jmv = jmv;
        this.jmv.view.map.allLayers.on("change", e => console.log(e.added[0]));
    }


    componentDidMount() {
        this.jmv.view.map.add(this.environmentLayer, 0)
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
        this.selectedModel = model;

        this.setState({
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

        this.environmentLayer = new AnimatedEnvironmentLayer({
            id: "ael-layer",
            url: layerUrl,
            displayOptions: this.displayOptions
        });

        this.jmv.view.map.layers.add(this.environmentLayer);
        this._updateForecast(this.environmentLayer);
        return model;
    }

    _updateForecast(forecastData) {
        this._forecast_datetime = moment(forecastData.date).add(forecastData.date, 'hours').format('ll hA');
        this.setState({
            _forecast_datetime: this._forecast_datetime
        });
    }

    infoModal() {
        // this.modal = !this.mo
    }

    render() {
        return (
            <div className="windmenu" style={{overflow: "auto"}}>
                <div id='forecast-data'> {this._forecast_datetime}</div>
                Wind Model:
                <Dropdown direction='down'>
                    <DropdownButton>
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
                <div>
                    <Button icon onClick={this.infoModal}>
                        <Icon icon={info} size='m'/>
                        {/*<InfoOutlined size='m'/>*/}
                    </Button>
                    <Modal isOpen={this.modal}>
                        <ModalHeader>
                            Wind Widget Information
                        </ModalHeader>
                        <ModalBody>
                            <b style={{fontSize: "larger"}}>NOAA Wind Data</b>
                            <p>The data visualized are freely available and provided by NOAA&apos;s
                                <a href="https://nomads.ncep.noaa.gov/" rel="noopener noreferrer"
                                   target="_blank">NOMADS</a> initiative.
                                The widget animates the wind forecast data as moving particles according to the wind
                                vector
                                and the speed and color of the particle
                                correspond to the wind speed. Data for each of the models below are retrieved on an
                                hourly
                                basis and the forecast DateTime is displayed
                                in the legend, and model menu. The temporal and spatial resolution of the models varies
                                and
                                is described below. All of the
                                forecasts are for 10 meters above ground.</p>
                            <ul>
                                <li><a href="https://nomads.ncep.noaa.gov/txt_descriptions/HRRR_doc.shtml"
                                       rel="noopener noreferrer" target="_blank">HRRR</a> - High Resolution Rapid
                                    Refresh
                                    <ul>
                                        <li>CONUS</li>
                                        <li>3km horizontal resolution</li>
                                        <li>Run every hour</li>
                                    </ul>
                                </li>
                                <li><a href="https://nomads.ncep.noaa.gov/txt_descriptions/WRF_NMM_doc.shtml"
                                       rel="noopener noreferrer" target="_blank">NAM</a> - North American Mesoscale
                                    Model -
                                    (Non-Hydrostatic Mesoscale Model)
                                    <ul>
                                        <li>CONUS</li>
                                        <li>12km horizontal resolution<s></s></li>
                                        <li>Run every 3 hours</li>
                                    </ul>
                                </li>
                                <li><a href="https://nomads.ncep.noaa.gov/txt_descriptions/GFS_doc.shtml"
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
                </div>
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        );
    }
}
