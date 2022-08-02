import Query from 'esri/rest/support/Query';
import {React} from 'jimu-core';
import {useEffect, useState} from 'react';
import {Loading} from 'jimu-ui';

export default function PWS (props) {

  const [PWS, setPWS] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const query = new Query()
    query.outFields = ['*']
    query.where = "PWSID='" + props.PWSID + "'"
    props.featureLayerPWS.queryFeatures(query).then(featureSet => {
      const facility = featureSet.features[0]
      const tribe = props.featureLayerPWS.getFieldDomain('tribe').getName(facility.attributes.tribe)
      const school = props.featureLayerPWS.getFieldDomain('pws_schoolordaycare').getName(facility.attributes.pws_schoolordaycare)
      const ownertype = props.featureLayerPWS.getFieldDomain('pws_ownertype').getName(facility.attributes.pws_ownertype)
      const pws_wholesale_domain = props.featureLayerPWS.getFieldDomain('pws_wholesale')
      const wholesale = pws_wholesale_domain ?  props.featureLayerPWS.getFieldDomain('pws_wholesale').getName(facility.attributes.pws_wholesale) : facility.attributes.pws_wholesale
      const watertype = props.featureLayerPWS.getFieldDomain('pws_wsourcetype').getName(facility.attributes.pws_wsourcetype)
      const state = props.featureLayerPWS.getFieldDomain('pws_agencycode').getName(facility.attributes.pws_agencycode)
      setPWS({
        facility,
        tribe,
        school,
        ownertype,
        wholesale,
        watertype,
        state
      })
      setLoading(false)
    })
  }, [])


  return <div> {loading
    ? <Loading type='SECONDARY'/>
    : <div>
      <b><p style={{textAlign: 'center'}}>Public Water System Details</p></b>
      <hr/>
      <b>City
        Served: </b>{PWS.facility.attributes.city ? PWS.facility.attributes.city : 'Not Reported'}<br/>
      <b>County
        Served: </b>{PWS.facility.attributes.county ? PWS.facility.attributes.county : 'Not Reported'}<br/><b>State: </b>{PWS.state || 'Not Reported'}<br/>
      <b>Tribe Name: </b>{PWS.tribe ? PWS.tribe : 'Not Reported'}<br/>
      <b>PWS Population
        Served: </b>{PWS.facility.attributes.pws_popserve ? PWS.facility.attributes.pws_popserve : 'Not Reported'}<br/>
      <b>Is the PWS a School or Daycare? </b>{PWS.school || 'Not Reported'}<br/>
      <b>PWS Owner Type: </b>{PWS.ownertype || 'Not Reported'}<br/>
      <b>Is PWS Wholesaler to Another
        PWS? </b>{PWS.wholesale || 'Not Reported'}<br/>
      <b>PWS Source Water Type: </b>{PWS.watertype || 'Not Reported'}<p
      style={{textAlign: 'center'}}>&nbsp;</p>
    </div>
  }</div>
}
