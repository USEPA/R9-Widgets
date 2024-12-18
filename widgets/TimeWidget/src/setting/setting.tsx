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
import {React, UseDataSource, Immutable} from 'jimu-core';
import {MapWidgetSelector} from 'jimu-ui/advanced/setting-components';
import {AllWidgetSettingProps} from 'jimu-for-builder';
import {AllDataSourceTypes, DataSourceSelector} from 'jimu-ui/advanced/data-source-selector';
import {TextArea} from 'jimu-ui';

export default function Setting(
  props: AllWidgetSettingProps<{}>
): React.ReactElement {

  const supportedTypes = Immutable([AllDataSourceTypes.ImageryLayer]);

  const updateConfigProperty = (property, value) => {
    let settings = {
      id: props.id
    }
    settings[property] = value;
    props.onSettingChange(settings);
  }
  const onMapSelected = (useMapWidgetIds: string[]) => {
    props.onSettingChange({
      id: props.id,
      useMapWidgetIds: useMapWidgetIds
    });
  }

  // const onDataSourceChange = (useDataSources: UseDataSource[]) => {
  //   props.onSettingChange({
  //     id: props.id,
  //     windDataSources: useDataSources,
  //   });
  // }

  // cannot use data source select b/c it doesn't support image services?!?
  return <div className="sample-js-api-widget-setting p-2">
    <MapWidgetSelector onSelect={onMapSelected} useMapWidgetIds={props.useMapWidgetIds}/>
    <DataSourceSelector
      types={supportedTypes}
      mustUseDataSource={true}
      useDataSources={props.windDataSources}
      onChange={v => updateConfigProperty('windDataSources', v)}
      widgetId={props.id}
      buttonLabel="Select Wind Layers"
      isMultiple={true}
    />
    <DataSourceSelector
      types={supportedTypes}
      mustUseDataSource={true}
      useDataSources={props.smokeDataSource}
      onChange={v => updateConfigProperty('smokeDataSource', v)}
      widgetId={props.id}
      buttonLabel="Select Smoke Group"
    />
    {/*<DataSourceSelector*/}
    {/*  types={supportedTypes}*/}
    {/*  mustUseDataSource={true}*/}
    {/*  useDataSources={props.useDataSources}*/}
    {/*  onChange={v => updateConfigProperty('updateConfigProperty', v)}*/}
    {/*  widgetId={props.id}*/}
    {/*  buttonLabel="Select Wind Group"*/}
    {/*/>*/}
    {/*<TextArea placeholder='GFS Wind Service' value={props.permissionsListId}*/}
    {/*          onChange={e => updateConfigProperty('gfs', e.target.value)}/>*/}
  </div>
}
