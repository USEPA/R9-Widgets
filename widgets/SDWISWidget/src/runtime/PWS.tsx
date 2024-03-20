import Query from "esri/rest/support/Query";
import {React} from "jimu-core";
import {useEffect, useState} from 'react';
import {Loading} from "jimu-ui";

interface PWSFacility {
  attributes: {
      pwsid: string;
      pws_name: string;
      area_type_code: string;
      epa_region: string;
      is_school_or_daycare_ind: string;
      county_served: string;
      city_served: string;
      tribal_code: string;
      submissionyearquarter: string;
      zip_code_served: string;
      pws_activity_code: string;
      pws_type_code: string;
      pws_deactivation_date: string;
      owner_type_code: string;
      service_connections_count: number;
      population_served_count: number;
      is_wholesaler_ind: string;
      primary_source_code: string;
      pop_cat_11_code: string;
      submission_status_code: string;
      npm_candidate: string;
      primacy_agency_code: string;
    }
}

export default function PWS(props) {

  const [PWS, setPWS] =
    useState<{ facility?: PWSFacility, state?: string, school?: string, ownertype?: string, wholesale?: string, watertype?: string, tribe?: string}>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('loading PWS')
    const fetchPWS = async () => {
      const query = new Query()
      query.outFields = ['*']
      query.where = `pwsid = '${props.PWSID}'`;
      props.featureLayerPWS.queryFeatures(query).then(featureSet => {
        const facility = featureSet.features[0]
        const tribe = props.featureLayerPWS.getFieldDomain('tribal_code').getName(facility.attributes.tribal_code)
        const school = props.featureLayerPWS.getFieldDomain('is_school_or_daycare_ind').getName(facility.attributes.is_school_or_daycare_ind)
        const ownertype = props.featureLayerPWS.getFieldDomain('owner_type_code').getName(facility.attributes.owner_type_code)
        const pws_wholesale_domain = props.featureLayerPWS.getFieldDomain('is_wholesaler_ind')
        const wholesale = pws_wholesale_domain ? props.featureLayerPWS.getFieldDomain('is_wholesaler_ind').getName(facility.attributes.is_wholesaler_ind) : facility.attributes.is_wholesaler_ind
        const watertype = props.featureLayerPWS.getFieldDomain('primary_source_code').getName(facility.attributes.primary_source_code)
        // const state = props.featureLayerPWS.getFieldDomain('primacy_agency_code').getName(facility.attributes.primacy_agency_code)
        setPWS({
          facility,
          tribe,
          school,
          ownertype,
          wholesale,
          watertype,
          // state
        })

      })
    }
    fetchPWS()

  }, [])


  return PWS?.facility === undefined
    ? <Loading type='SECONDARY'/>
    : <div>
      <b><p style={{textAlign: 'center'}}>Public Water System Details</p></b>
      <hr/>
      <b>City
        Served: </b>{PWS.facility.attributes.city_served ? PWS.facility.attributes.city_served : 'Not Reported'}<br/>
      <b>County
        Served: </b>{PWS.facility.attributes.county_served ? PWS.facility.attributes.county_served : 'Not Reported'}<br/><b>State: </b>{PWS.state || 'Not Reported'}<br/>
      <b>Tribe Name: </b>{PWS.tribe ? PWS.tribe : 'Not Reported'}<br/>
      <b>PWS Population
        Served: </b>{PWS.facility.attributes.population_served_count ? PWS.facility.attributes.population_served_count : 'Not Reported'}<br/>
      <b>Is the PWS a School or Daycare? </b>{PWS.school || 'Not Reported'}<br/>
      <b>PWS Owner Type: </b>{PWS.ownertype || 'Not Reported'}<br/>
      <b>Is PWS Wholesaler to Another
        PWS? </b>{PWS.wholesale || 'Not Reported'}<br/>
      <b>PWS Source Water Type: </b>{PWS.watertype || 'Not Reported'}<p
      style={{textAlign: 'center'}}>&nbsp;</p>
    </div>
}
