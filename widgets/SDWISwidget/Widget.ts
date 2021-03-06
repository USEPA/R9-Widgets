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
import urlUtils from 'esri/urlUtils';
import esriRequest from 'esri/request';

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

declare var allCookies: any;

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
  public Table: any
  private supportsAdvancedQueries: any;
  private sdwisLayer: FeatureLayer;
  private symbol: any;
  private Legend: any;
  private sdwisPWS: any;
  private token: string;
  private loadingError = false;

  private postCreate(args: any): void {
    this.inherited(arguments);
    // var layerStructure = LayerStructure.getInstance();
    // this.sdwisLayer = new FeatureLayer("https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/0");
    // @ts-ignore
    // this.sdwisLayer = layerStructure.getWebmapLayerNodes().find(function(x) {
    //   return x.id.toLowerCase().includes( 'sdwis');
    //   });
    ///this.sdwisPWS = layerStructure.getWebmapLayerNodes().find(function(x)  {
    ///return x.id.toLowerCase().includes('water system');
    ///});
    console.log('SDWISwidget::postCreate');
  };

  private startup(): void {
    if (sessionStorage.getItem('esriJSAPIOAuth')) {
      this.token = JSON.parse(sessionStorage.getItem('esriJSAPIOAuth'))['/']["https://epa.maps.arcgis.com"].token;
    } else if (allCookies.wab_auth) {
      this.token = JSON.parse(decodeURIComponent(allCookies.wab_auth)).token;
    }
    // setup proxy rules for internal
    urlUtils.addProxyRule({
      proxyUrl: "https://gis.r09.epa.gov/api/portal_proxy/",
      "urlPrefix": "https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer"
    })
    esriRequest.setRequestPreCallback((ioArgs: any) => {
      if (ioArgs.url.indexOf("https://gis.r09.epa.gov/api/portal_proxy/") === 0) {
        ioArgs.headers['Authorization'] = `Token ${this.token}`;
      }
      return ioArgs
      // urls: 'https://r9.ercloud.org/naum',
      // headers: {
      //   'Authorization': `Bearer ${this.access_token}`
      // }
    });

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
      'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/0',
      {outFields: ['*']});
    this.supportsAdvancedQueries = true
    this.featureLayerPWS = new FeatureLayer(
      'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/1',
      {outFields: ['*']});
    this.supportsAdvancedQueries = true
    this.featureLayerTable = new FeatureLayer(
      'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/3',
      {outFields: ['*']});
    this.featureLayerAdmin = new FeatureLayer(
      'https://gis.r09.epa.gov/arcgis/rest/services/Hosted/Safe_Drinking_Water_SDWIS_Region_9_V1_HFL/FeatureServer/5',
      {outFields: ['*']});

    this.featureLayer.on('error', e => {
      this.myNode.innerHTML = 'The R9 SDWIS service resides on the EPA Intranet. Connect to the Pulse Secure client to access the data.';
      this.loadingShelter.hide()
      this.loadingError = true;
    });
    this.map.addLayers([this.featureLayer, this.featureLayerPWS])
    this.clickHandler = this._clickHandler();
  };

  private onOpen(): void {
    if (!this.loadingError) {
      let self: any = this;
      this.loadingShelter.show();

      var query = new Query();
      // this.sdwisLayer.show();
      //this.sdwisPWS.show();
      query.where = '1=1';
      console.log('SDWISwidget::onOpen');


      var that = this;
      if (that.clickHandler !== undefined) {
        that.clickHandler.resume();
      }
      this.featureLayer.queryCount(query, (count: number) => {
        this.myNode.innerHTML = `There are currently <b>${count}</b> facilities in the SDWIS feature service.` + `</br></br><b><i>This data is scale-dependent, please zoom in to see the points.</i></b>` + `<h2 style="text-decoration: underline;">Safe Drinking Water Information System (SDWIS)</h2>` + `The data is directly from the <b>National SDWIS Database</b> and updated on a quarterly basis. The service provides information on facilities, public water systems, primacy agencies, administrative contacts, and tribal entities.  The facility symbols are <i>clustered</i> to minimize overlap; zoom in closer to see a facility's true location.  Detailed information about the <b>SDWIS Federal Reporting Services</b> can be found <b><a href="https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting"target="_blank">here.</a></b>` + `<h2 style="text-decoration: underline;">Enforcement & Compliance History Online (ECHO)</h2>` + `EPA's ECHO website provides details for facilities in your community to assess their compliance with environmental regulations.  The interaction in this widget uses the Public Water System (PWS) ID to search the records.  Check out the ECHO website <a href="https://echo.epa.gov/"target="_blank"><b>here</b></a> for more information and guidance.</br></br>The <i><b>ECHO Detailed System Report</b></i> is linked with the selected facility record and opens the ECHO website details for the associated public water system in a new browser window.` + `<h2 style="text-decoration: underline;">Definitions</h2>` + `<b>Facilities - </b>These points represent facilities within a public water system.  The facility types include but are not limited to wells, well heads, treatment plants, sampling stations, valves, transmission mains, pumps, pressure control, etc.  Facilities are identified with Facility ID and Facility Name.  The PWS ID indicates the public water system the selected facility falls under.</br><img id="Legend" img src=\"widgets/SDWISwidget/images/Symbology.png\" style=\"width:75%;height:75%;\">` + `</br><b>Public Water Systems (PWS) - </b> The public water system information is linked from the facility selected in the map.  The PWS ID and PWS Name provide the unique identification for the public water system associated with the facility record.</br> </br><table style=" border-color: #000000; margin-left: auto; margin-right: auto;" width="100%"><tbody><td style="text-align: left; width: 287px;"><b>PWS Contact Information - </b>This section provides contact information for the public water system associated with the selected facility.  This information comes from the Admin Contacts table.</table>` + `</br><table style="height: 98px; border-color: #000000; margin-left: auto; margin-right: auto;" width="100%"><tbody></tbody><td style="text-align: left; width: 287px;"><b>Regulatory Agency - </b> This section provides information for the regulatory organization associated with and responsible for the selected facility's public water system.  This information comes from the Primacy Agency table.` + `</br></td></table>`;

        this.loadingShelter.hide();
      })

      this.clickHandler.resume();
      this.map.setInfoWindowOnClick(false);
    }
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
            identifier: 'objectid',
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
            {'name': 'Facility Name', 'field': 'facilityname', 'width': '100%'}
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
              return feature.attributes.objectid === rowItem.objectid[0];

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

    const facilitytype = this.featureLayer.getDomain('fac_type')["getName"](facility.attributes.fac_type);
    const sourcetype = this.featureLayer.getDomain('fac_sourcetype')["getName"](facility.attributes.fac_sourcetype);
    const availability = this.featureLayer.getDomain('fac_availability')["getName"](facility.attributes.fac_availability);
    const sellertreated = this.featureLayer.getDomain('sellertrtcode')["getName"](facility.attributes.sellertrtcode);
    const trtstatus = this.featureLayer.getDomain('facsourcetrtstatus')["getName"](facility.attributes.facsourcetrtstatus);
    var that = this;
    if (that.clickHandler !== undefined) {
      that.clickHandler.resume();
    }
    this.myNode.innerHTML = `<p style="font-size:16px"><b>Public Water System (PWS)</b></p>` + `<b><p style="font-size:14px">Name: </b>` + (facility.attributes.fac_pws_name ? facility.attributes.fac_pws_name : 'Not Reported') + `</br>` + `<b>ID: </b>` + (facility.attributes.fac_pwsid ? facility.attributes.fac_pwsid : 'Not Reported') + '</p>' + `</br><b><p style="text-align: center;">Water System Facility Details</p></b>` + `<hr/>` + `<b>Facility Name:</b>` + ` ` + (facility.attributes.facilityname ? facility.attributes.facilityname : 'Not Reported') + '</br>' + `<b>Facility ID: </b>` + (facility.attributes.facilityid ? facility.attributes.facilityid : 'Not Reported') + `</br>` + `<b>Facility Type: </b>` + (facilitytype ? facilitytype : 'Not Reported') + '</br>' + `<b>Source Type:</b>` + ` ` + (sourcetype ? sourcetype : 'Not Reported') + `</br>` + `<b>Source Treated: </b>` + (trtstatus ? trtstatus : 'Not Reported') + `</br>` + `<b>Facility Availability:</b>` + ` ` + (availability ? availability : 'Not Reported') + `</br>` + `<b>Last Updated:</b>` + ` ` + (facility.attributes.last_reported ? facility.attributes.last_reported : 'Not Reported') + `</br>` + '<b>PWS Purchased From: </b>' + (facility.attributes.pwsid_seller ? facility.attributes.pwsid_seller : 'Not Reported') + `</br>` + `<b>Purchased Water Treated: </b>` + (sellertreated ? sellertreated : 'Not Reported') + `</br>` + `</br>` + `<div id="pwsinfo"></div>` + `<p style="text-align: center;"><a href="https://echo.epa.gov/detailed-facility-report?fid=${facility.attributes.fac_pwsid}" target="_blank"><b>ECHO Detailed System Report</b> </a></p>` + `<p style="text-align: center;">&nbsp;</p><table style="height: 98px; border-color: #000000; margin-left: auto; margin-right: auto;" width="100%"><tbody><tr><td style="text-align: center; width: 287px;"><b>Public Water System Contact</b>` + `<hr/>` + `<div id="admincontacts"></div></td></tr>` + `</tbody></table><p>&nbsp;</p>` + `<table style="height: 98px; border-color: #000000; margin-left: auto; margin-right: auto;" width="100%"><tbody><tr><td style="text-align: center; width: 287px;"><strong><p style="text-align: center;">Regulatory Agency Contact</strong>` + `<hr/>` + `<div id="tableinfo"></div>` + `</tbody></table></p></td></tr><p>&nbsp;</p>`;
    this.loadingShelter.hide();
    this.loadFacilityPWS(facility.attributes.fac_pwsid);
    this.loadFacilityTable(facility.attributes.pacode);
    this.loadFacilityAdmin(facility.attributes.fac_pwsid);
  }

// , Pulls in PWS information from PWS points layer
  private loadFacilityPWS(PWS_ID: any) {
    var query = new Query();
    query.outFields = ['*'];
    query.where = `PWSID='${PWS_ID}'`;
    this.featureLayerPWS.queryFeatures(query, (featureSet: FeatureSet) => {
      const facilityPWS = featureSet.features[0];
      const tribe = this.featureLayerPWS.getDomain('tribe')["getName"](facilityPWS.attributes.tribe);
      const school = this.featureLayerPWS.getDomain('pws_schoolordaycare')["getName"](facilityPWS.attributes.pws_schoolordaycare);
      const ownertype = this.featureLayerPWS.getDomain('pws_ownertype')["getName"](facilityPWS.attributes.pws_ownertype);
      const wholesale = this.featureLayerPWS.getDomain('pws_wholesale')["getName"](facilityPWS.attributes.pws_wholesale);
      const watertype = this.featureLayerPWS.getDomain('pws_wsourcetype')["getName"](facilityPWS.attributes.pws_wsourcetype);
      const state = this.featureLayerPWS.getDomain('pws_agencycode')["getName"](facilityPWS.attributes.pws_agencycode);

      var pws = `<b><p style="text-align: center;">Public Water System Details</p></b>` + `<hr/>` + `<b>City Served: </b>` + (facilityPWS.attributes.city ? facilityPWS.attributes.city : 'Not Reported') + `</br>` + `<b>County Served: </b>` + (facilityPWS.attributes.county ? facilityPWS.attributes.county : 'Not Reported') + `</br>` + `<b>State: </b>` + (state ? state : 'Not Reported') + `</br>` + `<b>Tribe Name: </b>` + (tribe ? tribe : 'Not Reported') + `</br>` + `<b>PWS Population Served: </b>` + (facilityPWS.attributes.pws_popserve ? facilityPWS.attributes.pws_popserve : 'Not Reported') + `</br>` + `<b>Is the PWS a School or Daycare? </b>` + (school ? school : 'Not Reported') + `</br>` + `<b>PWS Owner Type: </b>` + (ownertype ? ownertype : 'Not Reported') + `</br>` + `<b>Is PWS Wholesaler to Another PWS? </b>` + (wholesale ? wholesale : 'Not Reported') + `</br>` + `<b>PWS Source Water Type: </b>` + (watertype ? watertype : 'Not Reported') + `<p style="text-align: center;">&nbsp;</p>`
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
      var table = `<p style="text-align: center;">${facilityTable.attributes.regauthority}</p>` + `<p style="text-align: left;"><b>Primary Contact: </b>` + (facilityTable.attributes.primarycontactname ? facilityTable.attributes.primarycontactname : 'Not Reported') + `</br>` + `<b>Phone: </b>` + (facilityTable.attributes.phone_number ? facilityTable.attributes.phone_number : 'Not Reported') + `</br>` + `<b>Email: </b>` + (facilityTable.attributes.email ? `<a href="mailto:${facilityTable.attributes.email}"target="_blank">${facilityTable.attributes.email} </a>` : 'Not Reported') + `</br>` + `<b>Website: </b>` + `<a href="${facilityTable.attributes.website}" target="_blank">Click Here for Website</a>` + `</br>` + `<b>Address: </b>` + (facilityTable.attributes.mailing_address ? facilityTable.attributes.mailing_address : 'Not Reported') + `</p>`
      domConstruct.place(table, 'tableinfo')
    });
  }

  //pulls information from Admin Contact table for the Point of Contact section (top) "PWS Contact Information"
  private loadFacilityAdmin(pwsid: any) {
    var query = new Query();
    query.where = `PWSID='${pwsid}'`;
    this.featureLayerAdmin.queryFeatures(query, (featureSet: FeatureSet) => {
      const facilityAdmin = featureSet.features[0];
      var admin = `<p style="text-align: left;">` + `<b>Primary Contact: </b>` + (facilityAdmin.attributes.org_name ? facilityAdmin.attributes.org_name : 'Not Reported') + `</br>` + `<b>Phone: </b>` + (facilityAdmin.attributes.phone_number ? facilityAdmin.attributes.phone_number : 'Not Reported') + `</br><b>Email: </b>` + (facilityAdmin.attributes.email_addr ? `<a href="mailto:${facilityAdmin.attributes.email_addr}"target="_blank">${facilityAdmin.attributes.email_addr} </a>` : 'Not Reported') + `</br>` + `<b>Address: </b>` + (facilityAdmin.attributes.address_line1 ? facilityAdmin.attributes.address_line1 : 'Not Reported') + `</br>` + (facilityAdmin.attributes.city_name ? facilityAdmin.attributes.city_name : '') + ` ` + (facilityAdmin.attributes.state_code ? facilityAdmin.attributes.state_code : '') + ` ` + (facilityAdmin.attributes.zip_code ? facilityAdmin.attributes.zip_code : '') + `</p>`
      domConstruct.place(admin, 'admincontacts')
    });
  }


  private onClose(): void {
    // turn off facilities
    // this.sdwisLayer.hide();
    //this.sdwisPWS.hide();
    console.log('SDWISwidget::onClose');
    var self: any = this;
    this.clickHandler.pause();
    this.map.removeLayer(this.featureLayer);
    this.map.removeLayer(this.featureLayerPWS)
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
