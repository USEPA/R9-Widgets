import {React, FormattedMessage, Immutable, UseDataSource} from "jimu-core";
import {BaseWidgetSetting, AllWidgetSettingProps} from "jimu-for-builder";
import {IMConfig} from "../config";
import defaultI18nMessages from "./translations/default";
import {MapWidgetSelector } from 'jimu-ui/advanced/setting-components';
import {AllDataSourceTypes, DataSourceSelector} from 'jimu-ui/advanced/data-source-selector';

export default class Setting extends BaseWidgetSetting<AllWidgetSettingProps<IMConfig>, any> {
  supportedTypes = Immutable([AllDataSourceTypes.FeatureLayer, AllDataSourceTypes.MapService]);

  onMapSelected = (useMapWidgetIds: string[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useMapWidgetIds: useMapWidgetIds
    });
  };

  onDataSourceChange = (useDataSources: UseDataSource[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useDataSources
    })
  }

  render () {
    return (
      <div className="widget-setting-demo">
        <h5 style={{padding: '5px 0 0 5px'}}>Select Map</h5>
        <MapWidgetSelector  onSelect={this.onMapSelected} useMapWidgetIds={this.props.useMapWidgetIds}/>
        <h5 style={{padding: '5px 0 0 5px'}}>Select Data Sources</h5>
        <DataSourceSelector
          types={this.supportedTypes}
          mustUseDataSource
          isMultiple={true}
          buttonLabel='Select Facility Layers'
          useDataSources={this.props.useDataSources}
          onChange={this.onDataSourceChange}
          widgetId={this.props.id}
        />
        {/*<DataSourceSelector*/}
        {/*  types={this.supportedTypes}*/}
        {/*  mustUseDataSource*/}
        {/*  buttonLabel='Select AZ Layer'*/}
        {/*  useDataSources={this.props.AZ_DATASOURCE}*/}
        {/*  onChange={this.onDataSourceChange('AZ_DATASOURCE')}*/}
        {/*  widgetId={this.props.id}*/}
        {/*/>*/}
        {/*<DataSourceSelector*/}
        {/*  types={this.supportedTypes}*/}
        {/*  mustUseDataSource*/}
        {/*  buttonLabel='Select NV Layer'*/}
        {/*  useDataSources={this.props.NV_DATASOURCE}*/}
        {/*  onChange={this.onDataSourceChange('NV_DATASOURCE')}*/}
        {/*  widgetId={this.props.id}*/}
        {/*/>*/}
        {/*<DataSourceSelector*/}
        {/*  types={this.supportedTypes}*/}
        {/*  mustUseDataSource*/}
        {/*  buttonLabel='Select HI Layer'*/}
        {/*  useDataSources={this.props.HI_DATASOURCE}*/}
        {/*  onChange={this.onDataSourceChange('HI_DATASOURCE')}*/}
        {/*  widgetId={this.props.id}*/}
        {/*/>*/}
        {/*<DataSourceSelector*/}
        {/*  types={this.supportedTypes}*/}
        {/*  mustUseDataSource*/}
        {/*  buttonLabel='Select CNMI Layer'*/}
        {/*  useDataSources={this.props.CNMI_DATASOURCE}*/}
        {/*  onChange={this.onDataSourceChange('CNMI_DATASOURCE')}*/}
        {/*  widgetId={this.props.id}*/}
        {/*/>*/}
        {/*<DataSourceSelector*/}
        {/*  types={this.supportedTypes}*/}
        {/*  mustUseDataSource*/}
        {/*  buttonLabel='Select Status Table'*/}
        {/*  useDataSources={this.props.STATUS_DATASOURCE}*/}
        {/*  onChange={this.onDataSourceChange('STATUS_DATASOURCE')}*/}
        {/*  widgetId={this.props.id}*/}
        {/*/>*/}
      </div>
    );
  }
}
