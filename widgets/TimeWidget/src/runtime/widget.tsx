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
import {React, AllWidgetProps, FormattedMessage} from 'jimu-core'
import {JimuMapViewComponent, JimuMapView} from 'jimu-arcgis'

import moment from 'Moment'
import TimeSlider from 'esri/widgets/TimeSlider'
import TimeExtent from 'esri/TimeExtent';

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
    timeVisible: true,
    timeExtent: {
      start,
      end
    },
    stops: {
      interval: {
        value: 1,
        unit: 'hours'
      }
    }
  })
  view.ui.add(newTimeSlider, 'manual');
  return newTimeSlider;
}

export default function ({useMapWidgetIds}: AllWidgetProps<{}>) {
  const [jimuMapView, setJimuMapView] = useState<JimuMapView>(null)
  const [timeLayers, setTimeLayers] = useState([])
  const [timeSlider, setTimeSlider] = useState()
  const [timeExtent, setTimeExtent] = useState({
    start: null,
    end: null
  })


  useEffect(() => {
    if (jimuMapView && timeExtent.start && timeExtent.end) {
      if (!timeSlider) {
        const newTimeSlider = initTimeSlider(jimuMapView.view, timeExtent);
        setTimeSlider(newTimeSlider)
      } else {
        timeSlider.fullTimeExtent = new TimeExtent(timeExtent);
        setTimeSlider(timeSlider);
      }

    }
  }, [jimuMapView, timeExtent])

  useEffect(() => {
    if (timeLayers.length > 0) {
      const newTimeExtent = {
        start: moment(),
        end: moment()
      }
      timeLayers.filter(tl => tl.layer.visible).forEach(tl => {
        if (newTimeExtent.start > tl.layer.timeInfo.fullTimeExtent.start) {
          newTimeExtent.start = tl.layer.timeInfo.fullTimeExtent.start
        }
        if (newTimeExtent.end < tl.layer.timeInfo.fullTimeExtent.end) {
          newTimeExtent.end = tl.layer.timeInfo.fullTimeExtent.end
        }
      })
      setTimeExtent(newTimeExtent)
    } else if (timeSlider) {
      timeSlider.destroy();
      setTimeSlider(null)
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
    }
  }, [jimuMapView])

  const onActiveViewChange = (jmv: JimuMapView) => {
    if (jmv) {
      setJimuMapView(jmv)
    }
  }

  const isConfigured = useMapWidgetIds && useMapWidgetIds.length === 1

  return <div className="widget-use-map-view" style={{width: '100%', height: '100%', overflow: 'hidden'}}>
    <JimuMapViewComponent
      useMapWidgetId={useMapWidgetIds?.[0]}
      onActiveViewChange={onActiveViewChange}
    />
  </div>
}
