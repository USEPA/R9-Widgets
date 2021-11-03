/** @jsx jsx */
import {AllWidgetProps, BaseWidget, jsx} from "jimu-core";
import {IMConfig} from "../config";


// import { TabContent, TabPane, Nav, NavItem, NavLink, Button} from 'jimu-ui';
import defaultMessages from "./translations/default";

import {Progress} from 'jimu-ui';
import {Component} from 'react';
import {JimuMapView, JimuMapViewComponent, MapViewManager} from 'jimu-arcgis';
import FeatureLayer from 'esri/layers/FeatureLayer';
import execute from "esri/rest/query";
import Extent from 'esri/geometry/Extent';
import {
    AnimatedEnvironmentLayer,
    DisplayOptions,
    // PointReport,
    // Bounds,
    // Particle
} from "./animatedEnvironmentLayer";

export default class WindWidget extends BaseWidget<AllWidgetProps<IMConfig>, {}> {
    url = 'https://localhost:3001/widgets/WindWidget/dist/global-wind.json';
    displayOptions: DisplayOptions = {
        maxVelocity: 15
    }
    environmentLayer = new AnimatedEnvironmentLayer({
        id: "ael-layer",
        url: this.url,
        displayOptions: this.displayOptions
    });
    jmv: JimuMapView;



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


    render() {
        return <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                                     onActiveViewChange={this.onActiveViewChange}/>
    }
}
