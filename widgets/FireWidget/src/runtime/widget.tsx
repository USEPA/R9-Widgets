/** @jsx jsx */
import {AllWidgetProps, BaseWidget, jsx} from "jimu-core";
import {IMConfig} from "../config";


// import { TabContent, TabPane, Nav, NavItem, NavLink, Button} from 'jimu-ui';
import defaultMessages from "./translations/default";

import {Progress} from 'jimu-ui';
import {Component} from 'react';
import {JimuMapView, JimuMapViewComponent, MapViewManager} from 'jimu-arcgis';
import * as FeatureLayer from 'esri/layers/FeatureLayer';
import {
    executeQueryJSON
} from "esri/rest/query";
import * as Extent from 'esri/geometry/Extent';

export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, { jimuMapView: JimuMapView, fires: any[] }> {
    all_fires: any[] = [];
    acresArray: number[];
    perimeterbufferFC: FeatureLayer;
    fireList;
    jmv: JimuMapView;

    constructor(props) {
        super(props);

        // this.state = {};
        this.perimeterbufferFC = new FeatureLayer({
            url: "https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/R9_Fire_Perimeter_Buffers/FeatureServer/0",
            definitionExpression: "display = 1"
        });
    }

    componentDidMount() {
        console.log("didMounted")
        this.loadFires();
    }

    onActiveViewChange = (jmv: JimuMapView) => {
        this.jmv = jmv;
        this.jmv.view.map.add(this.perimeterbufferFC, 0);
    }

    render() {
        return (

            <div className="widget-addLayers jimu-widget p-2">
                <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]}
                                      onActiveViewChange={this.onActiveViewChange}/>

                {this.state && this.state.fires ? this.state.fires.map(x => <Fire fire={x}/>) : ''}
            </div>
        );
    }


    loadFires() {
        var currentDate = this._getCurrentDate();
        //Identify default fire layers and visisblity
        //get perimeter buffer feature layer


        //Query for fires
        let query = this.perimeterbufferFC.createQuery();
        // var query = new Query();

        // query.where = "display = 1 AND acres >= 10 and RETRIEVED >= " + "'" + currentDate + "'";
        query.where = "display = 1";
        query.outSpatialReference = {wkid: 102100};
        query.returnGeometry = true;
        query.orderByFields = ["IncidentName ASC"];
        query.outFields = ["*"];
        return executeQueryJSON(`${this.perimeterbufferFC.url}/${this.perimeterbufferFC.layerId}`, query).then(results => {
            this._QueryFiresResults(results);
            // this.busyHandle.hide();
            // domStyle.set(this.headerInfo, "display", "block");
        });
    }

    _getCurrentDate() {
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        return yyyy + '-' + mm + '-' + dd;
    }

    _QueryFiresResults(results) {
        console.log("Query Fire Results");
        this.all_fires = results.features;

        //get min and max acres
        this.acresArray = this.all_fires.map(function (a) {
            var dAcres = a.attributes.DailyAcres ? a.attributes.DailyAcres : 0;
            var gAcres = a.attributes.GISAcres ? a.attributes.GISAcres : 0;
            if (dAcres == 0) {
                return gAcres;
            } else {
                return parseFloat(dAcres);
            }
        });

        //Loop through fires and add dom objects
        // this.fireList.replaceChildren("");
        for (var fire in this.all_fires) {

            // //Acres and PercentContained
            // var percentContained = this.all_fires[fire].attributes.PercentContained ? this.all_fires[fire].attributes.PercentContained : 0;
            // var dailyAcres = this.all_fires[fire].attributes.DailyAcres ? this.all_fires[fire].attributes.DailyAcres : 0;
            // var gisAcres = this.all_fires[fire].attributes.GISAcres ? this.all_fires[fire].attributes.GISAcres : 0;
            // this.all_fires[fire].attributes.IncidentName = this.all_fires[fire].attributes.IncidentName.toUpperCase();
            // var counties = JSON.parse(this.all_fires[fire].attributes.counties);
            // var facilities = JSON.parse(this.all_fires[fire].attributes.facilities);
            // var rmpFacilities = facilities.facilities && facilities.facilities["Active RMP Facilities"] ? facilities.facilities["Active RMP Facilities"] : 0;
            // var nplFacilities = facilities.facilities && facilities.facilities["NationalPriorityListPoint_R9_2019_R9"] ? facilities.facilities["NationalPriorityListPoint_R9_2019_R9"] : 0;
            // var tribes = JSON.parse(this.all_fires[fire].attributes.tribes);
            //
            // //If dailyAcres is 0 then look at GISAcres
            // if (dailyAcres == 0) {
            //     this.all_fires[fire].reportingAcres = gisAcres;
            // } else {
            //     this.all_fires[fire].reportingAcres = dailyAcres;
            // }
            //
            //
            // var rmp = '', npl = '';
            // if (facilities) {
            //     rmp = `, ${rmpFacilities} RMP`;
            //     npl = `, ${nplFacilities} NPL`;
            // }
            // var t = '';
            // if (tribes) {
            //     t = `, ${tribes.length} tribes`;
            // }
            // var c = '';
            // if (counties) {
            //     if (counties.length > 1) {
            //         c = 'Counties';
            //     } else {
            //         c = 'County';
            //     }
            //     c = `${c}: ${counties.join(', ')}`;
            // }
            //
            // var acresFacilitySubText = '';
            // if (facilities.facilities) {
            //     acresFacilitySubText = `<div class='acresTxt'>(${parseFloat(reportingAcres).toLocaleString('en')} acres${rmp}${npl}${t})</div>`;
            // }
            // //Incident Name with acres
            // // var layerDivNode = domConstruct.toDom(``);
            //
            // //add percent containment bar
            //
            //
            // var pclabel = parseFloat(reportingAcres).toLocaleString('en') + " acres";
            // var pcValue = Math.round(percentContained);
            // var pcTitle = percentContained + '% Contained';
            // //size of bar
            // var acresMin = 0
            // var acresMax = Math.max.apply(Math, this.acresArray);
            // var acresRange = acresMax - acresMin;
            // var scale = 300 / acresRange;
            // var scaledPixels = (this.all_fires[fire].reportingAcres - acresMin) * (300 / acresRange);
            // var bar;
            // if (scaledPixels < 100) {
            //     bar = 100;
            // } else {
            //     bar = scaledPixels;
            // }
            // var barWidth = bar.toString() + 'px';
            //
            // // var myProgressBar = new ProgressBar({
            // //     title: pcTitle,
            // //     value: pcValue,
            // //     label: pclabel,
            // //     style: "width: " + barWidth
            // // }).placeAt(layerDivNode).startup();
            // // domConstruct.place(layerDivNode, this.fireList);
            // //get fire attachment
            // if (facilities.facilities) {
            //     this.perimeterbufferFC.queryAttachments(this.all_fires[fire].attributes.OBJECTID, this._queryFireAttachment, this._QueryfireResultsError);
            // }
            // // setup zoom listener
            // // on(dom.byId(`F${this.all_fires[fire].attributes.OBJECTID}`), "click", this._zoomToFire(this.all_fires[fire].geometry));
        }

        this.setState({fires: results.features})
    }



    _QueryfireResultsError(err) {
        //Need to write a better error report
        // this.busyHandle.hide();
        console.log('error');
    }


}

class Fire extends Component<any, any> {
    constructor(private jimuMapView: JimuMapView) {
        super(jimuMapView);
    }

    init() {
                    //Acres and PercentContained
            this.props.fire.attributes.PercentContained = this.props.fire.attributes.PercentContained ? this.props.fire.attributes.PercentContained : 0;
            // var dailyAcres = this.all_fires[fire].attributes.DailyAcres ? this.all_fires[fire].attributes.DailyAcres : 0;
            // var gisAcres = this.all_fires[fire].attributes.GISAcres ? this.all_fires[fire].attributes.GISAcres : 0;
            // this.all_fires[fire].attributes.IncidentName = this.all_fires[fire].attributes.IncidentName.toUpperCase();
            // var counties = JSON.parse(this.all_fires[fire].attributes.counties);
            var facilities = JSON.parse(this.props.fire.attributes.facilities);
            // var rmpFacilities = facilities.facilities && facilities.facilities["Active RMP Facilities"] ? facilities.facilities["Active RMP Facilities"] : 0;
            // var nplFacilities = facilities.facilities && facilities.facilities["NationalPriorityListPoint_R9_2019_R9"] ? facilities.facilities["NationalPriorityListPoint_R9_2019_R9"] : 0;
            // var tribes = JSON.parse(this.all_fires[fire].attributes.tribes);
            //
            // //If dailyAcres is 0 then look at GISAcres
            // if (dailyAcres == 0) {
            //     this.all_fires[fire].reportingAcres = gisAcres;
            // } else {
            //     this.all_fires[fire].reportingAcres = dailyAcres;
            // }


            // var rmp = '', npl = '';
            // if (facilities) {
            //     rmp = `, ${rmpFacilities} RMP`;
            //     npl = `, ${nplFacilities} NPL`;
            // }
            // var t = '';
            // if (tribes) {
            //     t = `, ${tribes.length} tribes`;
            // }
            // var c = '';
            // if (counties) {
            //     if (counties.length > 1) {
            //         c = 'Counties';
            //     } else {
            //         c = 'County';
            //     }
            //     c = `${c}: ${counties.join(', ')}`;
            // }

            // var acresFacilitySubText = '';
            // if (facilities.facilities) {
            //     acresFacilitySubText = `<div class='acresTxt'>(${parseFloat(reportingAcres).toLocaleString('en')} acres${rmp}${npl}${t})</div>`;
            // }
            // //Incident Name with acres
            // // var layerDivNode = domConstruct.toDom(``);
            //
            // //add percent containment bar
            //
            //
            // var pclabel = parseFloat(reportingAcres).toLocaleString('en') + " acres";
            // var pcValue = Math.round(percentContained);
            // var pcTitle = percentContained + '% Contained';
            // //size of bar
            // var acresMin = 0
            // var acresMax = Math.max.apply(Math, this.acresArray);
            // var acresRange = acresMax - acresMin;
            // var scale = 300 / acresRange;
            // var scaledPixels = (this.all_fires[fire].reportingAcres - acresMin) * (300 / acresRange);
            // var bar;
            // if (scaledPixels < 100) {
            //     bar = 100;
            // } else {
            //     bar = scaledPixels;
            // }
            // var barWidth = bar.toString() + 'px';

            // var myProgressBar = new ProgressBar({
            //     title: pcTitle,
            //     value: pcValue,
            //     label: pclabel,
            //     style: "width: " + barWidth
            // }).placeAt(layerDivNode).startup();
            // domConstruct.place(layerDivNode, this.fireList);
            //get fire attachment
            // if (facilities.facilities) {
            //     this.perimeterbufferFC.queryAttachments(this.all_fires[fire].attributes.OBJECTID, this._queryFireAttachment, this._QueryfireResultsError);
            // }
            // setup zoom listener
            // on(dom.byId(`F${this.all_fires[fire].attributes.OBJECTID}`), "click", this._zoomToFire(this.all_fires[fire].geometry));
    }

    zoomToFire() {
        if (this.props.fire.geometry.type === 'polygon') {
            var fireBufferExtent = new Extent(this.props.fire.geometry.getExtent());
            this.jimuMapView.view.extent = fireBufferExtent;
        } else {
            // todo: change to goTo function
            this.jimuMapView.view.goTo(this.props.fire.geometry, 10);
        }
    }

    _queryFireAttachment(results) {
        // todo: set download url to attribute on props
        console.log('Attachment Query Results');
        var objectIDString = "F" + results[0].objectId;
        // var fireDiv = dojo.query('#' + objectIDString + ' .attLink')[0];

        // var reportNode = domConstruct.toDom(``);
        // domConstruct.place(reportNode, fireDiv, "first");
        // on(dom.byId("r" + objectIDString), "click", function (e) {
        //     e.stopPropagation();
        //Get latest report from the bottom of the list (array)
        var latestReportIndex = results.length - 1;
        window.open(results[latestReportIndex].url, "_top");
        // });
    }

    render() {
        return <div className='layerDiv' id='F{props.attributes.OBJECTID}' title="Click to zoom"
                    onClick={this.zoomToFire}>
            <div id='r{props.objectIDString}' className='report-button' title='Get Report'></div>
            <div className='attLink'></div>
            <div className='fireNameTxt'>{this.props.fire.attributes.IncidentName}</div>
            <div className='acresTxt' title='${c}'>${this.props.fire.attributes.acres}</div>
            {this.props.fire.acresFacilitySubText}
            <Progress value={40}/>
        </div>;
    }
}
