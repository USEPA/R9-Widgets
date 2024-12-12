import {React, FormattedMessage, Immutable, UseDataSource} from "jimu-core";
import {BaseWidgetSetting, AllWidgetSettingProps} from "jimu-for-builder";
import {IMConfig} from "../config";
import defaultI18nMessages from "./translations/default";
import {MapWidgetSelector} from 'jimu-ui/advanced/setting-components';
import {AllDataSourceTypes, DataSourceSelector} from 'jimu-ui/advanced/data-source-selector';
import { TextArea} from 'jimu-ui';


export default class Setting extends BaseWidgetSetting<AllWidgetSettingProps<IMConfig>,
    any> {
    supportedTypes = Immutable([AllDataSourceTypes.FeatureLayer]);

    onMapSelected = (useMapWidgetIds: string[]) => {
        this.props.onSettingChange({
            id: this.props.id,
            useMapWidgetIds: useMapWidgetIds
        });
    };

    onToggleUseDataEnabled = (useDataSourcesEnabled: boolean) => {
        this.props.onSettingChange({
            id: this.props.id,
            useDataSourcesEnabled
        });
    }

    updateConfigProperty(property, value) {
        let settings = {
          id: this.props.id
        }
        settings[property] = value;
        this.props.onSettingChange(settings);
    }

    onDataSourceChange = (useDataSources: UseDataSource[]) => {
        this.props.onSettingChange({
            id: this.props.id,
            useDataSources: useDataSources,
        });
    }

    render() {
        return (
            <div className="widget-setting-demo" style={{margin: '10px 10px'}}>
                <MapWidgetSelector onSelect={this.onMapSelected} useMapWidgetIds={this.props.useMapWidgetIds}/>
                {/*<DataSourceSelector*/}
                {/*    types={this.supportedTypes}*/}
                {/*    mustUseDataSource*/}
                {/*    useDataSources={this.props.useDataSources}*/}
                {/*    onChange={this.onDataSourceChange}*/}
                {/*    widgetId={this.props.id}*/}
                {/*/>*/}
                <br />
                <TextArea placeholder='Data Source URL' value={this.props.dataSourceUrl}
                onChange={e => this.updateConfigProperty('dataSourceUrl', e.target.value)} />
            </div>
        );
    }
}
