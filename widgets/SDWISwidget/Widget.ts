// jIMU (WAB) imports:
/// <amd-dependency path="jimu/BaseWidget" name="BaseWidget" />
import Extent from "esri/geometry/Extent";

declare var BaseWidget: any; // there is no ts definition of BaseWidget (yet!)
// declareDecorator - to enable us to export this module with Dojo's "declare()" syntax so WAB can load it:
import declare from './support/declareDecorator';

// esri imports:
import EsriMap from 'esri/map';
import FeatureLayer from 'esri/layers/FeatureLayer';
import Query from 'esri/tasks/query';
import GraphicsLayer from 'esri/layers/GraphicsLayer';
import Graphic from 'esri/graphic';
import FeatureSet from 'esri/tasks/FeatureSet';
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol';
import Color from 'esri/Color';
import CodedValueDomain from "esri/layers/CodedValueDomain";

// @ts-ignore
import LoadingShelter from 'jimu/dijit/LoadingShelter';
// @ts-ignore
import LayerStructure from 'jimu/LayerStructure';


// dojo imports:
import on from 'dojo/on';
import ItemFileWriteStore from 'dojo/data/ItemFileWriteStore';
import domConstruct from "dojo/dom-construct";


// @ts-ignore
import DataGrid from 'dojox/grid/DataGrid';

import IConfig from './config';
import Table = WebAssembly.Table;
import FeatureTable from 'esri/dijit/FeatureTable';
import RelationshipQuery from "esri/tasks/RelationshipQuery";
import dom from "dojo/dom";

interface IWidget {
  baseClass: string;
  // itemID: string;  //established itemID type
  config?: IConfig;
  // myvar: any;myvari: any;
}

@declare(BaseWidget)
class Widget implements IWidget {
  public baseClass: string = 'sdwiswidget';
  public config: IConfig;
  private inherited: any;
  private map: EsriMap;
  private featureLayer: FeatureLayer;
  private featureLayerPWS: FeatureLayer;
  private featureLayerTable: FeatureLayer;
  private featureLayerAdmin: FeatureLayer;
  private myNode: any;
  private pwsinfo: any;
  private tableinfo: any;
  private admincontacts: any;
  private clickHandler: any;
  private loadingShelter: LoadingShelter;
  private graphicsLayer: GraphicsLayer;
  private domNode: any;
  public  Table: any
  private supportsAdvancedQueries: any;
  private sdwisLayer: any;
  private symbol: any;
  private Legend: any;
  private sdwisPWS: any;


  private postCreate(args: any): void {
    this.inherited(arguments);
    var layerStructure = LayerStructure.getInstance();
    // @ts-ignore
    this.sdwisLayer = layerStructure.getWebmapLayerNodes().find(function(x) {
      return x.id.toLowerCase().includes( 'sdwis');
      });
    ///this.sdwisPWS = layerStructure.getWebmapLayerNodes().find(function(x)  {
      ///return x.id.toLowerCase().includes('water system');
      ///});
    console.log('SDWISwidget::postCreate');
  };
  private startup(): void {
    this.symbol = new SimpleMarkerSymbol();
    this.symbol.setSize(16);
    this.symbol.setColor(new Color([255, 0, 255, 0.5]));

    let self: any = this;
    this.inherited(arguments);
    console.log('SDWISwidget::startup');
    this.loadingShelter = new LoadingShelter({hidden: true});
    this.loadingShelter.placeAt(this.domNode);

    this.graphicsLayer = new GraphicsLayer();
    this.map.addLayer(this.graphicsLayer);


    this.featureLayer = new FeatureLayer(
      'https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/SDWIS_Base/FeatureServer/0',
      {outFields: ['*']});
    this.supportsAdvancedQueries = true
    this.featureLayerPWS = new FeatureLayer(
      'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/SDWIS_Base/FeatureServer/1',
      {outFields: ['*']});
    this.supportsAdvancedQueries = true
    this.featureLayerTable = new FeatureLayer(
      'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/SDWIS_Base/FeatureServer/3',
      {outFields: ['*']});
    this.featureLayerAdmin = new FeatureLayer(
      'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/SDWIS_Base/FeatureServer/5',
      {outFields: ['*']});




    this.clickHandler = this._clickHandler();

  };

  private onOpen(): void {
    let self: any = this;
    this.loadingShelter.show();

    var query = new Query();
    this.sdwisLayer.show();
    //this.sdwisPWS.show();
    query.where = '1=1';
    console.log('SDWISwidget::onOpen');


    var that = this;
        if (that.clickHandler !== undefined) {
      that.clickHandler.resume();
    }
    this.featureLayer.queryCount(query, (count: number) => {
      this.myNode.innerHTML = `There are currently <b>${count}</b> facilities in the SDWIS feature service.`+`</br></br><b><i>This data is scale-dependent, please zoom in to see the points.</i></b>`+`<h2 style="text-decoration: underline;">Safe Drinking Water Information System (SDWIS)</h2>`+`The data is directly from the <b>National SDWIS Database</b> and updated on a quarterly basis. The <b><a href="https://epa.maps.arcgis.com/home/item.html?id=107c64d513ad4f1f8b80e4f60ab5a851"target="_blank">GeoPlatform service</a></b> provides information on facilities, public water systems, primacy agencies, administrative contacts, and tribal entities.  The facility symbols are <i>clustered</i> to minimize overlap; zoom in closer to see a facility's true location.  Detailed information about the <b>SDWIS Federal Reporting Services</b> can be found <b><a href="https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting"target="_blank">here.</a></b>`+`<h2 style="text-decoration: underline;">Enforcement & Compliance History Online (ECHO)</h2>`+`EPA's ECHO website provides details for facilities in your community to assess their compliance with environmental regulations.  The interaction in this widget uses the Public Water System (PWS) ID to search the records.  Check out the ECHO website <a href="https://echo.epa.gov/"target="_blank"><b>here</b></a> for more information and guidance.</br></br>The <i><b>ECHO Detailed System Report</b></i> is linked with the selected facility record and opens the ECHO website details for the associated public water system in a new browser window.`+`<h2 style="text-decoration: underline;">Definitions</h2>`+`<b>Facilities - </b>These points represent facilities within a public water system.  The facility types include but are not limited to wells, well heads, treatment plants, sampling stations, valves, transmission mains, pumps, pressure control, etc.  Facilities are identified with Facility ID and Facility Name.  The PWS ID indicates the public water system the selected facility falls under.</br><img id="Legend" img src=\"widgets/SDWISwidget/images/Symbology.png\" style=\"width:75%;height:75%;\">`+`</br><b>Public Water Systems (PWS) - </b> The public water system information is linked from the facility selected in the map.  The PWS ID and PWS Name provide the unique identification for the public water system associated with the facility record.</br> </br><table style=" border-color: #000000; margin-left: auto; margin-right: auto;" width="100%"><tbody><td style="text-align: left; width: 287px;"><b>PWS Contact Information - </b>This section provides contact information for the public water system associated with the selected facility.  This information comes from the Admin Contacts table.</table>`+`</br><table style="height: 98px; border-color: #000000; margin-left: auto; margin-right: auto;" width="100%"><tbody></tbody><td style="text-align: left; width: 287px;"><b>Regulatory Agency - </b> This section provides information for the regulatory organization associated with and responsible for the selected facility's public water system.  This information comes from the Primacy Agency table.`+`</br></td></table>`;

      this.loadingShelter.hide();
    })

    this.clickHandler.resume();
    this.map.setInfoWindowOnClick(false);
  };
//Click function once the widget is open
  private _clickHandler() {
    var self: any = this;
    return on.pausable(this.map, "click", e => {
      this.graphicsLayer.clear();
      this.loadingShelter.show();
      this.myNode.innerHTML = '';
      var pixelWidth = this.map.extent.getWidth() / this.map.width;
      var toleranceInMapCoords = 10 * pixelWidth;
      var clickExtent = new Extent(e.mapPoint.x - toleranceInMapCoords, e.mapPoint.y - toleranceInMapCoords, e.mapPoint.x + toleranceInMapCoords, e.mapPoint.y + toleranceInMapCoords, this.map.spatialReference);
      var featureQuery = new Query();
      featureQuery.outFields = ['*'];
      featureQuery.geometry = clickExtent;
      //var selectionSymbol = new SimpleMarketSymbol().setColor("red");

      // featureQuery.orderByFields = ['dateofreport DESC'];
      this.featureLayer.selectFeatures(featureQuery, FeatureLayer.SELECTION_NEW, (features: any[]) => {
        if (features.length === 1) {
          this.loadFacility(features[0]);
          // this.loadRMPs(featureSet.features[0]);
          // noneFound.push(false);

        } else if (features.length > 1) {
          this.myNode.innerHTML = "<h3>Multiple facilities found</h3><br/><h5>Select one to continue</h5>" +
            '<div id="gridDiv" style="width:100%;"></div>';

          var data: any = {
            identifier: 'OBJECTID',
            items: []
          };
          features.forEach((feature: any) => {
            // @ts-ignore
            var attrs = dojo.mixin({}, feature.attributes);
            data.items.push(attrs);
          });
          // @ts-ignore
          var store = new ItemFileWriteStore({
            data: data
          });
          // @ts-ignore
          store.data = data;
          // @ts-ignore
          var grid = dijit.byId("grid");

          if (grid !== undefined) {
            grid.destroy();
          }

          var layout = [
            {'name': 'Facility Name', 'field': 'FacilityName', 'width': '100%'}
          ];

          grid = new DataGrid({
            id: 'grid',
            store: store,
            structure: layout,
            //rowSelector: '20px',
            autoHeight: true
          });
          grid.placeAt("gridDiv");
          grid.on('RowClick', (e: any) => {
            var rowItem = grid.getItem(e.rowIndex);
            var facility = features.filter(feature => {
              return feature.attributes.OBJECTID === rowItem.OBJECTID[0];

            });


            this.loadFacility(facility[0]);


          });
          grid.startup();
          this.loadingShelter.hide(); // noneFound.push(false);
        } else {
          this.myNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
          this.loadingShelter.hide();
        }
      });
    });
  };

    private loadFacility(facility: any) {
    var selectedGraphic = new Graphic(facility.geometry, this.symbol);
    this.graphicsLayer.add(selectedGraphic);
    this.loadingShelter.show();

    const facilitytype = this.featureLayer.getDomain('Fac_Type')["getName"](facility.attributes.Fac_Type);
    const sourcetype = this.featureLayer.getDomain('Fac_SourceType')["getName"](facility.attributes.Fac_SourceType);
    const availability = this.featureLayer.getDomain('Fac_Availability')["getName"](facility.attributes.Fac_Availability);
    const sellertreated = this.featureLayer.getDomain('SELLERTRTCODE')["getName"](facility.attributes.SELLERTRTCODE);
    const trtstatus = this.featureLayer.getDomain('FacSourceTrtStatus')["getName"](facility.attributes.FacSourceTrtStatus);
    var that = this;
    if (that.clickHandler !== undefined)  {
      that.clickHandler.resume();
    }
    this.myNode.innerHTML = `<p style="font-size:16px"><b>Public Water System (PWS)</b></p>`+ `<b><p style="font-size:14px">Name: </b>` + (facility.attributes.Fac_PWS_Name ? facility.attributes.Fac_PWS_Name : 'Not Reported') +`</br>`+`<b>ID: </b>` +  (facility.attributes.Fac_PWSID ? facility.attributes.Fac_PWSID : 'Not Reported') + '</p>' +`</br><b><p style="text-align: center;">Water System Facility Details</p></b>` + `<hr/>`+ `<b>Facility Name:</b>` + ` `+ (facility.attributes.FacilityName ? facility.attributes.FacilityName : 'Not Reported') + '</br>' + `<b>Facility ID: </b>`+(facility.attributes.FacilityID ? facility.attributes.FacilityID : 'Not Reported')+`</br>`+ `<b>Facility Type: </b>` + (facilitytype ? facilitytype : 'Not Reported') + '</br>' + `<b>Source Type:</b>` + ` `+  (sourcetype ? sourcetype : 'Not Reported') +`</br>`+ `<b>Source Treated: </b>`+ (trtstatus ? trtstatus :'Not Reported') + `</br>`+ `<b>Facility Availability:</b>`+ ` `+ (availability ? availability : 'Not Reported') +`</br>` + `<b>Last Updated:</b>` +` `+ (facility.attributes.Last_Reported ? facility.attributes.Last_Reported : 'Not Reported') +`</br>`+'<b>PWS Purchased From: </b>'+ (facility.attributes.PWSID_SELLER ? facility.attributes.PWSID_SELLER : 'Not Reported') + `</br>` + `<b>Purchased Water Treated: </b>`+ (sellertreated ? sellertreated : 'Not Reported')+`</br>`+`</br>`+`<div id="pwsinfo"></div>`+`<p style="text-align: center;"><a href="https://echo.epa.gov/detailed-facility-report?fid=${facility.attributes.Fac_PWSID}" target="_blank"><b>ECHO Detailed System Report</b> </a></p>`+`<p style="text-align: center;">&nbsp;</p><table style="height: 98px; border-color: #000000; margin-left: auto; margin-right: auto;" width="100%"><tbody><tr><td style="text-align: center; width: 287px;"><b>Public Water System Contact</b>`+`<hr/>`+`<div id="admincontacts"></div></td></tr>`+`</tbody></table><p>&nbsp;</p>`+`<table style="height: 98px; border-color: #000000; margin-left: auto; margin-right: auto;" width="100%"><tbody><tr><td style="text-align: center; width: 287px;"><strong><p style="text-align: center;">Regulatory Agency Contact</strong>`+`<hr/>`+`<div id="tableinfo"></div>`+`</tbody></table></p></td></tr><p>&nbsp;</p>`;
    this.loadingShelter.hide();
    this.loadFacilityPWS(facility.attributes.Fac_PWSID);
    this.loadFacilityTable(facility.attributes.PAcode);
    this.loadFacilityAdmin(facility.attributes.Fac_PWSID);
  }
// , Pulls in PWS information from PWS points layer
  private loadFacilityPWS(PWS_ID: any) {
    var query = new Query();
    query.outFields = ['*'];
    query.where = `PWSID='${PWS_ID}'`;
    this.featureLayerPWS.queryFeatures(query, (featureSet: FeatureSet) => {
      const facilityPWS = featureSet.features[0];
      const tribe = this.featureLayerPWS.getDomain('Tribe')["getName"](facilityPWS.attributes.Tribe);
      const school = this.featureLayerPWS.getDomain('PWS_SchoolorDaycare')["getName"](facilityPWS.attributes.PWS_SchoolorDaycare);
      const ownertype = this.featureLayerPWS.getDomain('PWS_OwnerType')["getName"](facilityPWS.attributes.PWS_OwnerType);
      const wholesale = this.featureLayerPWS.getDomain('PWS_Wholesale')["getName"](facilityPWS.attributes.PWS_Wholesale);
      const watertype = this.featureLayerPWS.getDomain('PWS_WSourceType')["getName"](facilityPWS.attributes.PWS_WSourceType);
      const state = this.featureLayerPWS.getDomain('PWS_AgencyCode')["getName"](facilityPWS.attributes.PWS_AgencyCode);

   var pws = `<b><p style="text-align: center;">Public Water System Details</p></b>`+ `<hr/>`+`<b>City Served: </b>` +(facilityPWS.attributes.City ? facilityPWS.attributes.City : 'Not Reported')+ `</br>`+ `<b>County Served: </b>`+(facilityPWS.attributes.County ? facilityPWS.attributes.County : 'Not Reported')+ `</br>`+`<b>State: </b>`+ (state ? state : 'Not Reported') + `</br>`+`<b>Tribe Name: </b>`+ (tribe ? tribe : 'Not Reported') + `</br>`+ `<b>PWS Population Served: </b>`+ (facilityPWS.attributes.PWS_PopServe ? facilityPWS.attributes.PWS_PopServe : 'Not Reported') +`</br>`+`<b>Is the PWS a School or Daycare? </b>`+ (school ? school : 'Not Reported') +`</br>`+`<b>PWS Owner Type: </b>`+ (ownertype ? ownertype : 'Not Reported') +`</br>`+ `<b>Is PWS Wholesaler to Another PWS? </b>`+ (wholesale ? wholesale : 'Not Reported') +`</br>` +`<b>PWS Source Water Type: </b>`+ (watertype ? watertype : 'Not Reported')+`<p style="text-align: center;">&nbsp;</p>`
    domConstruct.place(pws, 'pwsinfo')
      });
  }
  //pulls information from Primacy Agency table for the Regulatory section (bottom) "Regulatory Agency"
  private loadFacilityTable(PAcode: any) {
    var query = new Query();
    query.outFields = ['*'];
    query.where = `PACode='${PAcode}'`;
    this.featureLayerTable.queryFeatures(query, (featureSet: FeatureSet) => {
      const facilityTable = featureSet.features[0];
   var table = `<p style="text-align: center;">${facilityTable.attributes.RegAuthority}</p>`+`<p style="text-align: left;"><b>Primary Contact: </b>`+(facilityTable.attributes.PrimaryContactName ? facilityTable.attributes.PrimaryContactName : 'Not Reported')+`</br>`+`<b>Phone: </b>`+(facilityTable.attributes.Phone_Number ? facilityTable.attributes.Phone_Number : 'Not Reported')+`</br>`+`<b>Email: </b>`+(facilityTable.attributes.Email ? `<a href="mailto:${facilityTable.attributes.Email}"target="_blank">${facilityTable.attributes.Email} </a>` : 'Not Reported')+`</br>`+`<b>Website: </b>`+`<a href="${facilityTable.attributes.Website}" target="_blank">Click Here for Website</a>`+`</br>`+`<b>Address: </b>`+(facilityTable.attributes.Mailing_Address ? facilityTable.attributes.Mailing_Address : 'Not Reported')+`</p>`
      domConstruct.place(table, 'tableinfo')
      });
  }
  //pulls information from Admin Contact table for the Point of Contact section (top) "PWS Contact Information"
  private loadFacilityAdmin(pwsid: any) {
    var query = new Query();
    query.where = `PWSID='${pwsid}'`;
    this.featureLayerAdmin.queryFeatures(query, (featureSet: FeatureSet) => {
      const facilityAdmin = featureSet.features[0];
      var admin = `<p style="text-align: left;">`+`<b>Primary Contact: </b>`+ (facilityAdmin.attributes.org_name ? facilityAdmin.attributes.org_name : 'Not Reported')+`</br>`+`<b>Phone: </b>`+(facilityAdmin.attributes.phone_number ? facilityAdmin.attributes.phone_number : 'Not Reported')+`</br><b>Email: </b>`+(facilityAdmin.attributes.email_addr ? `<a href="mailto:${facilityAdmin.attributes.email_addr}"target="_blank">${facilityAdmin.attributes.email_addr} </a>` : 'Not Reported')+`</br>`+`<b>Address: </b>`+(facilityAdmin.attributes.address_line1 ? facilityAdmin.attributes.address_line1 : 'Not Reported')+`</br>`+(facilityAdmin.attributes.city_name ? facilityAdmin.attributes.city_name : '')+` `+(facilityAdmin.attributes.state_code ? facilityAdmin.attributes.state_code : '')+` `+(facilityAdmin.attributes.zip_code ? facilityAdmin.attributes.zip_code : '')+`</p>`
      domConstruct.place(admin, 'admincontacts')
    });
  }


  private onClose(): void {
      // turn off facilities
    this.sdwisLayer.hide();
    //this.sdwisPWS.hide();
    console.log('SDWISwidget::onClose');
    var self: any = this;
    this.clickHandler.pause();
    this.graphicsLayer.clear();
  };
  // private onMinimize(): void {
  //   console.log('SDWISwidget::onMinimize');
  // };
  // private onMaximize(): void {
  //   console.log('SDWISwidget::onMaximize');
  // };
  // private onSignIn(credential): void {
  //   console.log('SDWISwidget::onSignIn', credential);
  // };
  // private onSignOut(): void {
  //   console.log('SDWISwidget::onSignOut');
  // };
  // private onPositionChange(): void {
  //   console.log('SDWISwidget::onPositionChange');
  // };
  // private resize(): void {
  //   console.log('SDWISwidget::resize');
  // };
}

export = Widget;
