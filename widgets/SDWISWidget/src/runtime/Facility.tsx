import {React, jsx} from 'jimu-core';
import PWS from './PWS';
import PWSContact from './PWSContact';
import RegulatorText from './RegulatorText';


export default function Facility(props) {
  const facilitytype = props.featureLayer.getFieldDomain('facility_type_code').getName(props.facility.attributes.facility_type_code)
  const sourcetype = props.featureLayer.getFieldDomain('water_type_code').getName(props.facility.attributes.water_type_code)
  const availability = props.featureLayer.getFieldDomain('availability_code').getName(props.facility.attributes.availability_code)
  const sellertreated = props.featureLayer.getFieldDomain('seller_treatment_code').getName(props.facility.attributes.seller_treatment_code)
  const trtstatus = props.featureLayer.getFieldDomain('filtration_status_code').getName(props.facility.attributes.filtration_status_code)

  return (
    <div>
      <div>
        <p style={{fontSize: '16px'}}>
          <b>Public Water System (PWS)</b></p>
        <p style={{fontSize: '14px'}}>
          <b>Name: </b>{props.facility.attributes.pws_name ? props.facility.attributes.pws_name : 'Not Reported'}<br/><b>ID: </b>
          {props.facility.attributes.pwsid ? props.facility.attributes.pwsid : 'Not Reported'}</p>
        <br/><b><p style={{textAlign: 'center'}}>Water System Facility Details</p></b>
        <hr/>
        <b>Facility Name: </b>
        {props.facility.attributes.facility_name ? props.facility.attributes.facility_name : 'Not Reported'}<br/><b>Facility
        ID: </b>
        {props.facility.attributes.facility_id ? props.facility.attributes.facility_id : 'Not Reported'}<br/><b>Facility
        Type: </b>
        {facilitytype || 'Not Reported'}<br/><b>Source
        Type: </b>{sourcetype || 'Not Reported'}<br/>
        <b>Source Treated: </b>{trtstatus || 'Not Reported'}<br/>
        <b>Facility Availability: </b>{availability || 'Not Reported'}<br/>
        <b>Last
          Updated: </b>{props.facility.attributes.last_reported_date ? props.facility.attributes.last_reported_date : 'Not Reported'}<br/>
        <b>PWS Purchased
          From: </b>{props.facility.attributes.pwsid_seller ? props.facility.attributes.pwsid_seller : 'Not Reported'}<br/>
        <b>Purchased Water
          Treated: </b>{sellertreated || 'Not Reported'}<br/><br/>
        <PWS PWSID={props.facility.attributes.pwsid}
             featureLayerPWS={props.featureLayerPWS}/>
        <p style={{textAlign: 'center'}}><a
          href={'https://echo.epa.gov/detailed-facility-report?fid=' + props.facility.attributes.pwsid}
          target="_blank\"><b>ECHO Detailed System Report</b> </a></p>
        {/*<p style={{textAlign: 'center'}}>&nbsp;</p>*/}

        <PWSContact pwsid={props.facility.attributes.pwsid}
                    featureLayerAdmin={props.featureLayerAdmin}/>
        <p>&nbsp;</p>

        <RegulatorText featureLayerTable={props.featureLayerTable}
                       PAcode={props.facility.attributes.primary_agency_code}/>

        <p>&nbsp;</p>
      </div>

      {/*{this.regulatoryText}*/}
    </div>
  )
}
