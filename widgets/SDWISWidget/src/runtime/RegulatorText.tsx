import Query from 'esri/rest/support/Query';
import {React} from 'jimu-core';
import {useEffect, useState} from 'react';
import {Loading} from 'jimu-ui';

//pulls information from Primacy Agency table for the Regulatory section (bottom) "Regulatory Agency"

export default function RegulatorText(props) {
  const [RegulatoryText, setRegulatoryText] = useState()


  useEffect(() => {
    console.log('loading RegulatoryText')
    const query = new Query()
    query.outFields = ['*']
    query.where = "PACode='" + props.PAcode + "'"
    props.featureLayerTable.queryFeatures(query).then(featureSet => {
      if (featureSet.features[0]) {
        setRegulatoryText(featureSet.features[0].attributes);
      } else {
        setRegulatoryText('');
      }
    })
  }, [])


  return RegulatoryText === undefined
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
        <td style={{textAlign: 'center', width: '287px'}}>
          <strong>
            <p style={{textAlign: 'center'}}>Regulatory Agency Contact</p></strong>
          <hr/>
          <div>
            <p style={{textAlign: 'center'}}>{RegulatoryText.regauthority}</p>
            <p style={{textAlign: 'left'}}><b>Primary
              Contact: </b>{RegulatoryText.primarycontactname ? RegulatoryText.primarycontactname : 'Not Reported'}<br/>
              <b>Phone: </b>{RegulatoryText.phone_number ? RegulatoryText.phone_number : 'Not Reported'}<br/>
              <b>Email: </b>{RegulatoryText.email
                ? <a href={'mailto:' + RegulatoryText.email} target="_blank"/>
                : 'Not Reported'} <br/>
              <b>Website: </b>{RegulatorText.website 
                ? <a href={RegulatoryText.website} target="_blank">Click Here for Website</a>
                : 'Not Reported'}<br/>
              <b>Address: </b>{RegulatoryText.mailing_address ? RegulatoryText.mailing_address : 'Not Reported'}
            </p>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
}
