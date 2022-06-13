import {React, jsx} from 'jimu-core';
import {Button} from 'jimu-ui';
import moment from 'Moment'

function getStatus(attributes, facilityLayer) {
  if (attributes.DeRegistrationEffectiveDate) {
    const status = 'De-registered';
    const reason = (attributes.DeregistrationReasonCode !== '04'
      ? facilityLayer.getDomain('DeregistrationReasonCode').getName(attributes.DeregistrationReasonCode)
      : attributes.DeregistrationReasonOtherText);
    const date = attributes.DeRegistrationEffectiveDate;
    return status +
      (reason ? '<br/>De-registration Reason: ' + reason : '') +
      (date ? `<br/>De-registration Effective Date: ${moment(date).utc().toISOString()}` : '');
  }
  return 'Active';
}

export default function Facility(props) {
  if (props.attributes && !props.multipleRMPs) {
    if (Object.keys(props.attributes).length > 0) {
      return (
        <div>
          {props.featureSet.length > 1
            ? <Button id="backLink" style={{textDecoration: 'underline', cursor: 'pointer'}}
                      onClick={props.backLink}>{'< Back'}</Button>
            : null}
          <h1> {props.attributes.FacilityName}</h1>
          <h4 id="registration_status">Status: {getStatus(props.attributes, props.facilityLayer)}</h4>
          <table>
            <tbody id="tierii_facility">
            <tr>
              <td>Address: <br/> {props.attributes.FacilityStr1}<br/> {props.attributes.FacilityStr2
                ? props.attributes.FacilityStr2 +
                <br/>
                : ''}
                {props.attributes.FacilityCity + ', ' + props.attributes.FacilityState + ' ' + props.attributes.FacilityZipCode}
              </td>
            </tr>
            <tr>
              <td>Phone: {props.attributes.FacilityPhoneNumber ? props.attributes.FacilityPhoneNumber : 'Not Reported'}</td>
            </tr>
            <tr>
              <td>Website: {props.attributes.FacilityURL ? props.attributes.FacilityURL : 'Not Reported'}</td>
            </tr>
            <tr>
              <td>Email: {props.attributes.FacilityEmailAddress ? props.attributes.FacilityEmailAddress : 'Not Reported'}</td>
            </tr>
            <tr>
              <td>Full Time Employees: {props.attributes.FTE}</td>
            </tr>
            <tr>
              <td>RMP Completion
                Date: {moment(props.attributes.CompletionCheckDate).utc().toISOString().split('T')[0]}</td>
            </tr>
            <tr>
              <td>Parent
                Company(s): {props.attributes.ParentCompanyName ? props.attributes.ParentCompanyName : 'Not Reported'} {props.attributes.Company2Name ? ', ' + props.attributes.Company2Name : ''}</td>
            </tr>
            <tr>
              <td><Button id="summaryLink" style={{textDecoration: 'underline', cursor: 'pointer'}}
                          onClick={props.modalVis}>View
                Executive Summary</Button></td>
            </tr>
            </tbody>
          </table>
          <br/><h3 style={{textDecoration: 'underline'}}>Contacts</h3>
          <table>
            <tbody>
            <tr>
              <td><b>Operator</b></td>
            </tr>
            <tr>
              <td>Name: {props.attributes.OperatorName}</td>
            </tr>
            <tr>
              <td>Phone: {props.attributes.OperatorPhone}</td>
            </tr>
            <tr>
              <td><b>Emergency Contact</b></td>
            </tr>
            <tr>
              <td>Name: {props.attributes.EmergencyContactName}</td>
            </tr>
            <tr>
              <td>Title: {props.attributes.EmergencyContactTitle}</td>
            </tr>
            <tr>
              <td>Phone: {props.attributes.EmergencyContactPhone} {props.attributes.EmergencyContactExt_PIN ? ' x' + props.attributes.EmergencyContactExt_PIN : ''}</td>
            </tr>
            <tr>
              <td>24 HR Phone: {props.attributes.Phone24}</td>
            </tr>
            <tr>
              <td></td>
            </tr>
            </tbody>
          </table>
        </div>
      )
    }
  } else {
    return null
  }
}
