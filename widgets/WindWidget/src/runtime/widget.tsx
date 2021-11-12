/** @jsx jsx */
import {AllWidgetProps, BaseWidget, getAppStore, jsx, WidgetState} from "jimu-core";
import {IMConfig} from "../config";
import './assets/current_wind_gfs.json';

import {Dropdown, DropdownButton, DropdownItem, DropdownMenu} from 'jimu-ui';
import {Component} from 'react';
import {JimuMapView, JimuMapViewComponent, MapViewManager} from 'jimu-arcgis';
import FeatureLayer from 'esri/layers/FeatureLayer';
import execute from "esri/rest/query";
import Extent from 'esri/geometry/Extent';
import moment from 'Moment';

import {
    AnimatedEnvironmentLayer,
    DisplayOptions,
    // PointReport,
    // Bounds,
    // Particle
} from "./animatedEnvironmentLayer";

export default class WindWidget extends BaseWidget<AllWidgetProps<IMConfig>, {}> {
    // url = 'https://localhost:3001/widgets/WindWidget/dist/global-wind.json';
    // wind data urls
    // hrrr: https://r9data.response.epa.gov/apps/wind_data/current_wind_hrrr.json
    // nam: https://r9data.response.epa.gov/apps/wind_data/current_wind_nam.json
    // gfs: https://r9data.response.epa.gov/apps/wind_data/current_wind_gfs.json
    hrrrUrl = `${this.props.context.folderUrl}dist/runtime/assets/current_wind_hrrr.json`
    namUrl = 'https://localhost:3001/widgets/WindWidget/dist/assets/current_wind_nam.json';
    gfsUrl = 'https://localhost:3001/widgets/WindWidget/dist/assets/current_wind_gfs.json';
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
    _forecast_datetime


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

        let layerUrl = 'HRRR' ? this.hrrrUrl : 'NAM' ? this.namUrl : this.gfsUrl;
        layerUrl

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

    render() {
        return (
            <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto"}}>
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
                <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
                                      onActiveViewChange={this.onActiveViewChange}/>
            </div>
        );
    }
}
