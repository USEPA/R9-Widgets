import {React, jsx} from 'jimu-core';
import PWS from './PWS';


export default function Facility(props) {
  const facilitytype = props.featureLayer.getFieldDomain('fac_type').getName(props.facility.attributes.fac_type)
  const sourcetype = props.featureLayer.getFieldDomain('fac_sourcetype').getName(props.facility.attributes.fac_sourcetype)
  const availability = props.featureLayer.getFieldDomain('fac_availability').getName(props.facility.attributes.fac_availability)
  const sellertreated = props.featureLayer.getFieldDomain('sellertrtcode').getName(props.facility.attributes.sellertrtcode)
  const trtstatus = props.featureLayer.getFieldDomain('facsourcetrtstatus').getName(props.facility.attributes.facsourcetrtstatus)

  return (
    <div>
      <div>
        <p style={{fontSize: '16px'}}>
          <b>Public Water System (PWS)</b></p>
        <p style={{fontSize: '14px'}}>
          <b>Name: </b>{props.facility.attributes.fac_pws_name ? props.facility.attributes.fac_pws_name : 'Not Reported'}<br/><b>ID: </b>
          {props.facility.attributes.fac_pwsid ? props.facility.attributes.fac_pwsid : 'Not Reported'}</p>
        <br/><b><p style={{textAlign: 'center'}}>Water System Facility Details</p></b>
        <hr/>
        <b>Facility Name:</b>
        {props.facility.attributes.facilityname ? props.facility.attributes.facilityname : 'Not Reported'}<br/><b>Facility
        ID: </b>
        {props.facility.attributes.facilityid ? props.facility.attributes.facilityid : 'Not Reported'}<br/><b>Facility
        Type: </b>
        {facilitytype || 'Not Reported'}<br/><b>Source
        Type:</b>{sourcetype || 'Not Reported'}<br/>
        <b>Source Treated: </b>{trtstatus || 'Not Reported'}<br/>
        <b>Facility Availability:</b>{availability || 'Not Reported'}<br/>
        <b>Last
          Updated: </b>{props.facility.attributes.last_reported ? props.facility.attributes.last_reported : 'Not Reported'}<br/>
        <b>PWS Purchased
          From: </b>{props.facility.attributes.pwsid_seller ? props.facility.attributes.pwsid_seller : 'Not Reported'}<br/>
        <b>Purchased Water
          Treated: </b>{sellertreated || 'Not Reported'}<br/><br/>
        <div id="pwsinfo">
          <PWS PWSID={props.facility.attributes.fac_pwsid}
               featureLayerPWS={props.featureLayerPWS}/>
        </div>
        <p style={{textAlign: 'center'}}><a
          href={'https://echo.epa.gov/detailed-facility-report?fid=' + props.facility.attributes.fac_pwsid}
          target="_blank\"><b>ECHO Detailed System Report</b> </a></p>
        <p style={{textAlign: 'center'}}>&nbsp;</p>
        <table style={{
          height: '98px',
          borderColor: '#000000',
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '100%'
        }}>
          <tbody>
          <tr>
            <td style={{textAlign: 'center', width: '287px'}}><b>Public Water System
              Contact</b>
              <hr/>
              <div id="admincontacts"></div>
            </td>
          </tr>
          </tbody>
        </table>
        <p>&nbsp;</p>
        <table style={{
          height: '98px',
          borderColor: '#000000',
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '100%'
        }}>
          <tbody>
          <tr>
            <td style={{textAlign: 'center', width: '287px'}}>
              <strong>
                <p style={{textAlign: 'center'}}>Regulatory Agency Contact</p></strong>
              <hr/>
              <div id="tableinfo"></div>
            </td>
          </tr>
          </tbody>
        </table>

        <p>&nbsp;</p>
      </div>

      {/*{this.regulatoryText}*/}
      {/*{this.adminContactText}*/}
    </div>
  )
}
