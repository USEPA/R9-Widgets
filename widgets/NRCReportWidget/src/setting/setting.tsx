import {React, FormattedMessage, Immutable, UseDataSource} from "jimu-core";
import {BaseWidgetSetting, AllWidgetSettingProps} from "jimu-for-builder";
import {IMConfig} from "../config";
import defaultI18nMessages from "./translations/default";
import {MapWidgetSelector} from 'jimu-ui/advanced/setting-components';
import {AllDataSourceTypes, DataSourceSelector} from 'jimu-ui/advanced/data-source-selector';
import {Input} from 'jimu-ui';


export default class Setting extends BaseWidgetSetting<AllWidgetSettingProps<IMConfig>, any> {
  supportedTypes = Immutable([AllDataSourceTypes.FeatureLayer]);

  updateConfigProperty = (reportProxy) => {
    this.props.onSettingChange({
      id: this.props.id,
      reportProxy,
    });

  }

  onMapSelected = (useMapWidgetIds: string[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useMapWidgetIds: useMapWidgetIds
    });
  };

  onDataSourceChange = (useDataSources: UseDataSource[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useDataSources: useDataSources,
    });
  }

  render() {
    return (
      <div className="widget-setting-demo">
        <MapWidgetSelector onSelect={this.onMapSelected} useMapWidgetIds={this.props.useMapWidgetIds}/>
        <Input placeholder='Report Proxy URL' value={this.props.reportProxy}
               onChange={e => this.updateConfigProperty(e.target.value)}/>
        <DataSourceSelector
          types={this.supportedTypes}
          mustUseDataSource
          useDataSources={this.props.useDataSources}
          onChange={this.onDataSourceChange}
          widgetId={this.props.id}
        />
      </div>
    );
  }
}
