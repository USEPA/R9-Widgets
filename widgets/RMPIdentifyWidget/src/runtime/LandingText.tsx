import {React, jsx} from 'jimu-core';

export default function LandingText(props) {
  return (
    <div id="landingText" style={{overflow: 'auto'}}>
      <h2> RMP Identify</h2>
      <h5>{props.refreshDate}</h5>
      <br/>Click Facility to view information.
      <br/><br/><h5 style={{textDecoration: 'underline'}}>RMP Program Levels</h5>
      <br/><u>Program Level 1</u>: Processes which would not affect the public in the case of a worst-case
      release (in the language of Part 68, processes “with no public receptors
      within the distance to an endpoint from a worst-case release”) and with no accidents with specific
      offsite consequences within the past five years are eligible for
      Program 1, which imposes limited hazard assessment requirements and minimal prevention and emergency
      response requirements.
      <br/><br/><u>Program Level 2</u>: Processes not eligible for Program 1 or subject to Program 3 are
      placed in Program 2, which imposes streamlined prevention program requirements,
      as well as additional hazard assessment, management, and emergency response requirements.
      <br/><br/><u>Program Level 3</u>: Processes not eligible for Program 1 and either subject to OSHA's
      PSM standard under federal or state OSHA programs or classified in
      one of ten specified North American Industrial Classification System (NAICS) codes are placed in
      Program 3, which imposes OSHA’s PSM standard as the prevention program
      as well as additional hazard assessment, management, and emergency response requirements.
      <br/><br/><h5 style={{textDecoration: 'underline'}}>Dataset Notes</h5>
      This dataset was created directly from the RMP Access databases obtained from CDX RMP*Info data
      flow. This widget only displays parts of the RMP dataset.
      For the full dataset please see the RMP*Review Application. In processing this dataset we used
      validated RMP locations<sup>1</sup> first, FRS locations<sup>2</sup> second and unvalidated RMP
      locations last.
      Any available metadata about these locations are displayed (method, description, accuracy, etc).
      Only locations from the most recently-submitted RMP were used.
      <br/><br/><sup>1</sup>RMP validates locations by verifying they are inside bounding box coordinates
      corresponding to the county in which the facility exists.
      <br/><br/><sup>2</sup>For information on FRS locations see the <a
      href={'https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BB158161D-F639-4A93-BF7C-D454C80F7C92%7D'}
      target="_blank">metadata in the EDG.</a>
    </div>
  )
}
