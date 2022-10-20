/**
 Licensing

 Copyright 2022 Esri

 Licensed under the Apache License, Version 2.0 (the "License"); You
 may not use this file except in compliance with the License. You may
 obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 implied. See the License for the specific language governing
 permissions and limitations under the License.

 A copy of the license is available in the repository's
 LICENSE file.
 */
import {React, AllWidgetProps, FormattedMessage, DataSourceComponent} from 'jimu-core'
import {JimuMapViewComponent, JimuMapView} from 'jimu-arcgis'

import moment from 'Moment'
import TimeSlider from 'esri/widgets/TimeSlider'
import TimeExtent from 'esri/TimeExtent';
import {Select, Option, Switch} from 'jimu-ui';
import {getAppStore, WidgetState} from 'jimu-core';

const {useState, useRef, useEffect} = React

function initTimeSlider(view, fullTimeExtent) {
  const start = moment().set('seconds', 0).set('minutes', 0);
  const end = moment().set('seconds', 0).set('minutes', 0).add(1, 'hour');
  const container = document.createElement("div");
  container.setAttribute('style', 'bottom: 30px; width: 80%; margin: 0 10% 0 10%;')
  const newTimeSlider = new TimeSlider({
    container,
    view,
    mode: 'time-window',
    fullTimeExtent,
    // setting timeExtent here prevents the bug where the slider has no time extent on first being opened
    timeExtent: {
      start: start,
      end: end
    },
    timeVisible: true,
    stops: {
      interval: {
        value: 1,
        unit: 'hours'
      }
    }
  })
  // newTimeSlider.postInitialize = () => {
  //   setTimeout(() => {
  //     newTimeSlider.timeExtent = {
  //       start,
  //       end
  //     }
  //   })
  // }
  view.ui.add(newTimeSlider, 'manual');
  return newTimeSlider;
}

export default function ({useMapWidgetIds, windDataSource, smokeDataSource, id}: AllWidgetProps<{}>) {
  const [jimuMapView, setJimuMapView] = useState<JimuMapView>(null)
  const [timeLayers, setTimeLayers] = useState([])
  const [timeSlider, setTimeSlider] = useState()
  const [timeExtent, setTimeExtent] = useState({
    start: null,
    end: null
  })
  const [fullTimeExtent, setFullTimeExtent] = useState({
    start: null,
    end: null
  });
  const [windLayers, setWindLayers] = useState([])
  const [smokeLayer, setSmokeLayer] = useState([])
  const [smokeVisible, setSmokeVisible] = useState(false)
  const [windGroupLayer, setWindGroupLayer] = useState(null)
  const [smokeGroupLayer, setSmokeGroupLayer] = useState(null)

  useEffect(() => {
    if (jimuMapView && timeExtent.start && timeExtent.end) {
      if (!timeSlider) {
        const newTimeSlider = initTimeSlider(jimuMapView.view, timeExtent);
        setTimeSlider(newTimeSlider)
      } else {
        timeSlider.fullTimeExtent = fullTimeExtent;
        setTimeSlider(timeSlider);
      }
    }
  }, [jimuMapView, timeExtent])

  useEffect(() => {
    if (timeSlider) {
      timeSlider.watch('timeExtent', (value) => {
        if (value !== null) {
          setTimeExtent({start: value.start, end: value.end});
        }
      })
    }
  }, [timeSlider])

  useEffect(() => {
    if (timeLayers.length > 0) {
      const newTimeExtent = {
        start: moment(),
        end: moment()
      }
      const activeTimeLayers = timeLayers.filter(tl => tl.layer.visible);
      activeTimeLayers.forEach(tl => {
        if (newTimeExtent.start > tl.layer.timeInfo.fullTimeExtent.start) {
          newTimeExtent.start = tl.layer.timeInfo.fullTimeExtent.start
        }
        if (newTimeExtent.end < tl.layer.timeInfo.fullTimeExtent.end) {
          newTimeExtent.end = tl.layer.timeInfo.fullTimeExtent.end
        }
      })
      setFullTimeExtent(newTimeExtent);
      setTimeExtent(newTimeExtent);
    } else if (timeSlider) {
      timeSlider.destroy();
      setTimeSlider(null);
    }
  }, [timeLayers])

  useEffect(() => {
    if (jimuMapView) {
      const t = jimuMapView.view.allLayerViews.filter(l => l.layer.timeInfo && l.layer.timeInfo.useTime)
      t.forEach(l => l.watch('visible', () => {
        setTimeLayers(t.filter(l => l.layer.visible))
      }))
      setTimeLayers(t.filter(l => l.layer.visible))
      // captureCurrentTimeExtent();
      TimeSlider.getPropertiesFromWebMap(jimuMapView.view.map).then(tss => console.log(tss))
    }
  }, [jimuMapView])

  useEffect(() => {
    if (jimuMapView && windGroupLayer) {
      setWindLayers(jimuMapView.view.map.allLayers
        .find(l => l.id === windGroupLayer.id)?.allLayers
        .filter(l => l.portalItem && l.portalItem.tags.includes('wind')))
    }
  }, [jimuMapView, windGroupLayer])

  useEffect(() => {
    if (jimuMapView && smokeGroupLayer) {
      const l = jimuMapView.view.map.allLayers
        .find(l => l.id === smokeGroupLayer.id).allLayers
        .find(l => l.portalItem && l.portalItem.tags.includes('R9 Smoke'))

      setSmokeLayer(l)
      setSmokeVisible(l.visible)
    }
  }, [jimuMapView, smokeGroupLayer])


  const onActiveViewChange = (jmv: JimuMapView) => {
    if (jmv) {
      setJimuMapView(jmv);
    }
  }

  const captureWindLayers = (v) => {
    setWindGroupLayer(v.layer)
  }
  const captureSmokeLayer = (v) => {
    setSmokeGroupLayer(v.layer)
  }

  const updateSelectedWindModel = e => {
    windLayers.forEach(l => l.visible = false)
    e.target.value.visible = true
  }

  const isConfigured = useMapWidgetIds && useMapWidgetIds.length === 1

  const toggleSmoke = () => {
    smokeLayer.visible = !smokeLayer.visible;
    setSmokeVisible(smokeLayer.visible);
  }

  const toggleWindModels = (lyrName) => {
    windLayers.forEach((lyr) => {
      lyr.visible ? lyr.visible = false : lyr.visible = lyr.title === lyrName;
    });
    if (timeSlider) {
      const newTimeSlider = timeSlider;
      newTimeSlider.visible = true;
      setTimeSlider(newTimeSlider);
    }
  }

  return <div className="widget-use-map-view" style={{width: '100%', height: '100%', overflow: 'scroll', backgroundColor: 'white'}}>
    <JimuMapViewComponent
      useMapWidgetId={useMapWidgetIds?.[0]}
      onActiveViewChange={onActiveViewChange}
    />
    <DataSourceComponent
      useDataSource={windDataSource?.[0]}
      onDataSourceCreated={captureWindLayers}
    />
    <DataSourceComponent
      useDataSource={smokeDataSource?.[0]}
      onDataSourceCreated={captureSmokeLayer}
    />
    <h3 style={{padding: '10px'}}>Wind/Smoke Widget</h3>
    <div style={{padding: '10px'}}>
      <h4 style={{fontSize: '1em'}}>NOAA Wind Data</h4>
      <p>
        The data visualized are freely available and provided by NOAA's <a href='https://nomads.ncep.noaa.gov/' target='_blank'>NOMADS</a> initiative.
      </p>
    </div>
    {windLayers
        ? <div>
          {windLayers.map(lyr =>
          <div style={{display: 'flex', justifyContent: 'flex-start', gap: '10px', margin: "10px"}}>
            <Switch style={{marginRight: "10px"}} checked={lyr.visible} onChange={() => toggleWindModels(lyr.title)} />
            <p>{lyr.title}</p>
          </div>)}
        </div>
        : null}
    {/*{windLayers*/}
    {/*  ? <Select onChange={updateSelectedWindModel} placeholder="Select Wind Forecast Model">*/}
    {/*    {windLayers.map(l => <Option value={l}>{l.title}</Option>)}*/}
    {/*  </Select>*/}
    {/*  : null}*/}
    {smokeLayer
      ? <div style={{display: 'flex', justifyContent: 'flex-start', gap: '10px', margin: "10px"}}>
          <Switch checked={smokeVisible} style={{marginRight: "10px"}}
                  onChange={toggleSmoke}/>
          <p>Smoke</p>
        </div>
      : null}
    <div style={{padding: '10px'}}>
      <p>
        The widget animates the wind forecast data as moving particles according to the wind vector and the
        speed and color of the particle correspond to the wind speed. Data for each of the models below are retrieved on
        an hourly basis and the forecast DateTime is displayed in the legend, and model menu. The temporal and spatial
        resolution of the models varies and is described below. All of the forecasts are for 10 meters above ground.
      </p>
      <ul>
        <li>
          <a href={'https://nomads.ncep.noaa.gov/txt_descriptions/HRRR_doc.shtml'} target='_blank'>HRRR</a> - High Resolution Rapid Refresh
          <ul>
            <li>CONUS</li>
            <li>3km horizontal resolution</li>
            <li>Run every hour</li>
          </ul>
        </li>
        <li>
          <a href={'https://nomads.ncep.noaa.gov/txt_descriptions/WRF_NMM_doc.shtml'} target='_blank'>NAM</a> - North American Mesoscale Model - (Non-Hydrostatic Mesoscale Model)
          <ul>
            <li>CONUS</li>
            <li>12km horizontal resolution</li>
            <li>Run every 3 hours</li>
          </ul>
        </li>
        <li>
          <a href={'https://nomads.ncep.noaa.gov/txt_descriptions/GFS_doc.shtml'} target='_blank'>GFS</a> - Global Forecast System
          <ul>
            <li>Global</li>
            <li>13km horizontal resolution</li>
            <li>Run every hour</li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
}
