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
import {getTimeSliderSettingsFromWebDocument} from 'esri/support/timeUtils'
import TimeExtent from 'esri/TimeExtent';
import {Select, Option, Switch} from 'jimu-ui';
import {getAppStore, WidgetState} from 'jimu-core';
import LayerView = __esri.LayerView;
import {useEffect} from 'react';

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

export default function ({useMapWidgetIds, windDataSources, smokeDataSource, id}: AllWidgetProps<{}>) {
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
    // const [smokeVisible, setSmokeVisible] = useState(false)
    // const [windGroupLayer, setWindGroupLayer] = useState(null)
    // const [smokeGroupLayer, setSmokeGroupLayer] = useState(null)

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
        console.debug('timeLayers', timeLayers)
        const newTimeExtent = {
          start: moment(),
          end: moment()
        }
        // const activeTimeLayers = timeLayers.filter(tl => tl.layer.visible);
        timeLayers.forEach(tl => {
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
      console.log('windLayers', windLayers)
    }, [windLayers]);

    useEffect(() => {
      if (jimuMapView && windLayers.length > 0) {
        console.debug('map status', jimuMapView.view.map.loadStatus)
        windLayers.forEach(lv => {
          lv.layer.watch('visible', () => {
            setTimeLayers(windLayers.filter(l => l.layer.visible))
          });
        })
        // const viirs = jimuMapView.view.map.allLayers.items.find(i => i.title.includes('VIIRS'));
        // if (viirs) {
        //   viirs.visible = true;
        //   viirs.useViewTime = false;
        //   if (viirs.timeInfo) {
        //     viirs.timeInfo.useTime = false;
        //   }
        // }


        // const t = jimuMapView.view.allLayerViews.filter(l => l.layer.timeInfo && l.layer.timeInfo.useTime);
        // dont use view time unless we capture the layer somewhere else
        // todo: reverse this is widget "closed"?
        // or find a better way?
        // jimuMapView.view.allLayerViews.filter(l => l.layer.useViewTime).forEach(l => l.layer.useViewTime = false);

        // windLayers.forEach(l => {
        //   // jimuMapView.view.whenLayerView(l).then(lv => {
        //   l.watch('visible', () => {
        //     setTimeLayers(windLayers.filter(l => l.visible))
        //   })
        //   // })
        // })
        // setTimeLayers(windLayers.filter(l => l.visible))
        // captureCurrentTimeExtent();
        // getTimeSliderSettingsFromWebDocument(jimuMapView.view.map).then(tss => console.debug('slider from webmap', tss))
      }
    }, [jimuMapView, windLayers])

    // useEffect(() => {
    //   if (jimuMapView && windGroupLayer) {
    //     const windLayersArray = jimuMapView.view.map.allLayers.find(l => l.id === windGroupLayer.id)?.allLayers
    //       .filter(l => l.portalItem && l.portalItem.tags.includes('wind'));
    //     setWindLayers(sortWindLayers(windLayersArray.items));
    //     console.debug('jimuMapView', jimuMapView);
    //   }
    // }, [jimuMapView, windGroupLayer])

    // useEffect(() => {
    //   if (jimuMapView && smokeGroupLayer) {
    //     const l = jimuMapView.view.map.allLayers
    //       .find(l => l.id === smokeGroupLayer.id).allLayers
    //       .find(l => l.portalItem && l.portalItem.tags.includes('R9 Smoke'))
    //
    //     setSmokeLayer(l)
    //     setSmokeVisible(l.visible)
    //   }
    // }, [jimuMapView, smokeGroupLayer])
    const getSortIndex = (t) => {
      if (t.includes('HRRR')) {
        return 0;
      } else if (t.includes('GFS')) {
        return 1;
      } else if (t.includes('NAM')) {
        return 2;
      } else if (t.includes('smoke')) {
        return 3;
      } else {
        return 4;
      }
    }
    const sortWindLayers = (a, b) => {
      return getSortIndex(a.layer.title) - getSortIndex(b.layer.title);
    }

    const onActiveViewChange = (jmv: JimuMapView) => {
      if (jmv) {
        setJimuMapView(jmv);
      }
    }

    const captureWindLayers = async (ds) => {
      await jimuMapView.view.when();
      // const lv = await jimuMapView.view.allLayerViews.find(lv => lv.layer.id === ds.layer.id);
      // const lv = await jimuMapView.view.whenLayerView(ds.layer);
      const lv = await jimuMapView.whenJimuLayerViewLoadedByDataSource(ds);
      if (lv) {
        setWindLayers([...windLayers, lv].sort(sortWindLayers))
        return lv;
      }
      // setWindGroupLayer(v.layer)
    }
    const captureSmokeLayer = async (ds) => {
      const lv = await captureWindLayers(ds);
      setSmokeLayer(lv);
    }


    const toggleWindModels = (lyr: LayerView) => {
      if (lyr.id === smokeLayer?.layer?.id) {
        lyr.visible = !lyr.visible;
      } else if (lyr.visible) {
        lyr.visible = false
      } else {
        windLayers.filter(l => l.layer.id !== smokeLayer?.layer?.id).forEach(l => l.layer.visible = false)
        lyr.visible = true
      }

      if (timeSlider) {
        const newTimeSlider = timeSlider;
        newTimeSlider.visible = true;
        setTimeSlider(newTimeSlider);
      }
    }

    return <div className="widget-use-map-view"
                style={{width: '100%', height: '100%', backgroundColor: 'white'}}>
      <JimuMapViewComponent
        useMapWidgetId={useMapWidgetIds?.[0]}
        onActiveViewChange={onActiveViewChange}
      />
      {jimuMapView ? windDataSources.map(ds => <DataSourceComponent
        useDataSource={ds}
        onDataSourceCreated={captureWindLayers}
      />) : ''}
      {jimuMapView ? <DataSourceComponent
        useDataSource={smokeDataSource?.[0]}
        onDataSourceCreated={captureSmokeLayer}
      /> : ''}
      {/*<h3 style={{padding: '10px'}}>Wind/Smoke Widget</h3>*/}
      {/*<div style={{padding: '10px'}}>*/}
      {/*  <h4 style={{fontSize: '1em'}}>NOAA Wind Data</h4>*/}
      {/*  <p>*/}
      {/*    The data visualized are freely available and provided by NOAA's <a href='https://nomads.ncep.noaa.gov/'*/}
      {/*                                                                       target='_blank'>NOMADS</a> initiative.*/}
      {/*  </p>*/}
      {/*</div>*/}
      {windLayers
        ? <div>
          {windLayers.map(lyr =>
            <div style={{display: 'flex', justifyContent: 'flex-start', gap: '10px', margin: "10px"}}>
              <Switch style={{marginRight: "10px"}} checked={lyr?.layer?.visible} onChange={() => toggleWindModels(lyr?.layer)}/>
              <p>{lyr.layer.title}</p>
            </div>)}
        </div>
        : null}
      {/*<div style={{padding: '10px'}}>*/}
      {/*  <p>*/}
      {/*    This widget animates the wind forecast data as moving particles according to the wind vector and the*/}
      {/*    speed and color of the particle correspond to the wind speed. Data for each of the models below are retrieved on*/}
      {/*    an hourly basis and the forecasted Date and Time is displayed in the legend. The temporal and spatial*/}
      {/*    resolution of the models varies and is described below. All of the forecasts are for 10 meters above ground.*/}
      {/*  </p>*/}
      {/*  <ul>*/}
      {/*    <li>*/}
      {/*      <a href={'https://nomads.ncep.noaa.gov/txt_descriptions/HRRR_doc.shtml'} target='_blank'>HRRR</a> - High*/}
      {/*      Resolution Rapid Refresh*/}
      {/*      <ul>*/}
      {/*        <li>CONUS</li>*/}
      {/*        <li>3km horizontal resolution</li>*/}
      {/*        <li>Run every hour</li>*/}
      {/*      </ul>*/}
      {/*    </li>*/}
      {/*    <li>*/}
      {/*      <a href={'https://nomads.ncep.noaa.gov/txt_descriptions/GFS_doc.shtml'} target='_blank'>GFS</a> - Global*/}
      {/*      Forecast System*/}
      {/*      <ul>*/}
      {/*        <li>Global</li>*/}
      {/*        <li>13km horizontal resolution</li>*/}
      {/*        <li>Run every hour</li>*/}
      {/*      </ul>*/}
      {/*    </li>*/}
      {/*    <li>*/}
      {/*      <a href={'https://nomads.ncep.noaa.gov/txt_descriptions/WRF_NMM_doc.shtml'} target='_blank'>NAM</a> - North*/}
      {/*      American Mesoscale Model - (Non-Hydrostatic Mesoscale Model)*/}
      {/*      <ul>*/}
      {/*        <li>CONUS</li>*/}
      {/*        <li>12km horizontal resolution</li>*/}
      {/*        <li>Run every 3 hours</li>*/}
      {/*      </ul>*/}
      {/*    </li>*/}
      {/*  </ul>*/}
      {/*</div>*/}
    </div>
}
