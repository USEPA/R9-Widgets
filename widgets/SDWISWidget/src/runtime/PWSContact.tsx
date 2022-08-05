import Query from 'esri/rest/support/Query';
import {React} from 'jimu-core';
import {useEffect, useState} from 'react';
import {Loading} from 'jimu-ui';

//pulls information from Admin Contact table for the Point of Contact section (top) "PWS Contact Information"

export default function PWSContact(props) {
  const [PWSContact, setPWSContact] = useState()


  useEffect(() => {
    const query = new Query()
    query.where = "PWSID='" + props.pwsid + "'"
    props.featureLayerAdmin.queryFeatures(query).then(featureSet => {
      setPWSContact(featureSet.features[0].attributes)
    })
  }


  return PWSContact === undefined
    ? <Loading type='SECONDARY'/>
    : <table style={{
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
          <div>
            <p style={{textAlign: 'left'}}><b>
              Primary Contact: </b>{PWSContact.org_name ? PWSContact.org_name : 'Not Reported'}<br/>
              <b>Phone: </b>{PWSContact.phone_number ? PWSContact.phone_number : 'Not Reported'}<br/>
              <b>Email: </b>{PWSContact.email_addr
                ? <a href={'mailto:' + PWSContact.email_addr}
                     target="_blank"/>
                : 'Not Reported'}<br/>
              <b>Address: </b>{PWSContact.address_line1 ? PWSContact.address_line1 : 'Not Reported'}<br/>
              {PWSContact.city_name ? PWSContact.city_name : ''} {PWSContact.state_code ? PWSContact.state_code : ''} {PWSContact.zip_code ? PWSContact.zip_code : ''}
            </p>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
}
