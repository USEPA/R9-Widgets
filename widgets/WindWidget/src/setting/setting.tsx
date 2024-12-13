import {React, FormattedMessage, Immutable, UseDataSource} from "jimu-core";
import {BaseWidgetSetting, AllWidgetSettingProps} from "jimu-for-builder";
import {IMConfig} from "../config";
import defaultI18nMessages from "./translations/default";
import {MapWidgetSelector} from 'jimu-ui/advanced/setting-components';
import {AllDataSourceTypes, DataSourceSelector} from 'jimu-ui/advanced/data-source-selector';

export default class Setting extends BaseWidgetSetting<AllWidgetSettingProps<IMConfig>,
    any> {

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
                <DataSourceSelector
                    mustUseDataSource
                    useDataSources={this.props.useDataSources}
                    onChange={this.onDataSourceChange}
                    widgetId={this.props.id}
                />
            </div>
        );
    }
}
