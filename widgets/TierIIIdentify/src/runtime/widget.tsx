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
import type {Column, SortColumn} from "react-data-grid";
import {useState} from "react";
import {Sort} from "../../../../../jimu-ui/advanced/lib/sql-expression-builder/styles";
// import {useMemo, useState} from "React";

// interface Row {
//     // OBJECTID?: number,
//     // // if we have a facility
//     // CameoID?: any,
//     // EPAFacilityID?: string,
//     // Facility4DigitZipExt?: string,
//     // FacilityCity?: string,
//     // FacilityCountyFIPS?: string,
//     // FacilityLatDecDegs?: number,
//     // FacilityLongDecDegs?: number,
//     // FacilityName?: string,
//     // FacilityState?: string,
//     // FacilityStr1?: string,
//     // FacilityStr2?: string,
//     // FacilityZipCode?: string,
//     // MarplotID?: any,
//     // RMPID?: number,
//     // Status?: string,
//
//
// }
//
// function getComparator(sortColumn: string) {
//     switch (sortColumn) {
//         case 'FacilityName':
//             return (a, b) => {
//                 return a[sortColumn].localeCompare(b[sortColumn]);
//             };
//         case 'CompletionCheckDate':
//             return (a, b) => {
//                 // @ts-ignore
//                 return new Date(a[sortColumn]) - new Date(b[sortColumn]);
//             };
//         default:
//             throw new Error(`unsupported sortColumn: "${sortColumn}"`);
//     }
// }
//
// export default class TestWidget extends BaseWidget<AllWidgetProps<IMConfig>, {
//  jimuMapView: JimuMapView,
// }> {
//
//     jmv: JimuMapView;
//     first: boolean = false;
//
//
//     constructor(props) {
//         super(props);
//         // bind this to class methods
//
//     }
//
//     componentDidMount() {
//
//     }
//
//     onActiveViewChange = (jmv: JimuMapView) => {
//         this.jmv = jmv;
//         if (jmv) {
//             this.setState({
//                 jimuMapView: jmv
//             });
//             this.jmv.view.on("click", event => {
//                 this.mapClick(event)
//             });
//         }
//     }
//
//
//
//
//
//     componentDidUpdate(prevProps: Readonly<AllWidgetProps<IMConfig>>, prevState: Readonly<{ jimuMapView: JimuMapView; landingText: string }>, snapshot?: any) {
//         let widgetState: WidgetState;
//         widgetState = getAppStore().getState().widgetsRuntimeInfo[this.props.id].state;
//
//         // do anything on open/close of widget here
//         if (widgetState == WidgetState.Opened) {
//             if (this.first) {
//
//             }
//             this.first = false;
//         } else {
//             this.first = true;
//
//         }
//     }
//
//     getArbitraryFirstMapWidgetId = (): string => {
//         const appState: any = window._appState;
//         // Loop through all the widgets in the config and find the "first"
//         // that has the type (uri) of "arcgis-map"
//         if (appState) {
//             const arbitraryFirstMapWidgetInfo: { [key: string]: any } = Object.values(appState.appConfig.widgets).find((widgetInfo: any) => {
//                 return widgetInfo.uri === 'widgets/arcgis/arcgis-map/'
//             });
//             return arbitraryFirstMapWidgetInfo.id;
//         }
//     }
//
//
//     mapClick = (e) => {
//
//     }
//
//     rowKeyGetter(row) {
//         return row;
//     }
//
//     rowClick(row) {
//
//
//     }
//
//     Grid() {
//
//             return (
//                 <div>
//                     {this.multipleLocations ? <h3>Multiple Facilities at that Location <br/>
//                     </h3> : this.multipleRMPs ?
//                         <h3>Multiple RMPs Found for {this.attributes.FacilityName} <h4 id="facilityStatus">
//                             {this.facilityStatus}
//                         </h4><br/></h3> : null}
//                     <h5>Select one to continue</h5>
//                     <DataGrid style={{height: `${(this.rows.length * 35) + 37}px`, maxHeight: "700px"}}
//                               columns={this.columns} rows={this.rows} onRowClick={this.rowClick}
//                               rowKeyGetter={this.rowKeyGetter} defaultColumnOptions={{
//                         sortable: true,
//                         resizable: true
//                     }} onSortColumnsChange={this.onSortColsChange} sortColumns={this.sortColumns}/>
//                 </div>
//             )
//     }
//
//     onSortColsChange(cols) {
//         if (cols.length === 0) {
//             return this.rows
//         }
//
//         this.sortColumns = cols.slice(-1);
//
//
//         // this.columns = this.loadColumns(newCols);
//
//         let sortedRows = [...this.rows];
//         sortedRows.sort((a, b) => {
//             for (let col of cols) {
//
//                 let comparator = getComparator(col.columnKey);
//                 let res = comparator(a, b);
//                 if (res !== 0) {
//                     // if (col.direction === 'ASC') {
//                     return col.direction === 'ASC' ? res : -res;
//                     //     return res;
//                     // } else if (col.direction === 'DESC') {
//                     //     return -res;
//                     // }
//                 }
//
//             }
//             return 0;
//         });
//
//
//         this.rows = sortedRows;
//         this.setState({
//             rows: this.rows,
//             sortColumns: this.sortColumns
//             // columns: this.columns,
//         });
//         return sortedRows
//     }
//
//     loadColumns(columns: any[]): readonly Column<Row>[] {
//         return [
//             SelectColumn,
//             {key: 'FacilityName', name: 'Name'},
//             {key: 'CompletionCheckDate', name: 'Date'}
//         ]
//     }
//
//     numberFormatter(number: string | number) {
//         if (typeof number == "string") {
//             return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//         } else {
//             return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//         }
//     }
//
//
//
//     render() {
//         return (
//
//             <div className="widget-addLayers jimu-widget p-2" style={{overflow: "auto", height: "97%"}}>
//                 <this.Grid/>
//                 {this.loading ? <h2 style={{background: 'white'}}>Loading...</h2> :
//                     <div>
//
//                     </div>
//                 }
//                 <JimuMapViewComponent useMapWidgetId={this.getArbitraryFirstMapWidgetId()}
//                                       onActiveViewChange={this.onActiveViewChange}/>
//             </div>
//         )
//     }
// }
