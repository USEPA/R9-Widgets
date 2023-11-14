import {React, FormattedMessage, Immutable, UseDataSource} from "jimu-core";
import {BaseWidgetSetting, AllWidgetSettingProps} from "jimu-for-builder";
import {IMConfig} from "../config";
import defaultI18nMessages from "./translations/default";
import {MapWidgetSelector} from 'jimu-ui/advanced/setting-components';
import {AllDataSourceTypes, DataSourceSelector} from 'jimu-ui/advanced/data-source-selector';

export default class Setting extends BaseWidgetSetting<AllWidgetSettingProps<IMConfig>, any> {
    supportedTypes = Immutable([AllDataSourceTypes.FeatureLayer]);

    onMapSelected = (useMapWidgetIds: string[]) => {
        this.props.onSettingChange({
            id: this.props.id,
            useMapWidgetIds: useMapWidgetIds
        });
    };

    updateConfigProperty = (property, value) => {
        let settings = {
          id: this.props.id
        }
        settings[property] = value;
        this.props.onSettingChange(settings);
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <MapWidgetSelector onSelect={this.onMapSelected} useMapWidgetIds={this.props.useMapWidgetIds}/>
                <DataSourceSelector types={this.supportedTypes}
                                    mustUseDataSource
                                    isMultiple={true}
                                    useDataSources={this.props.facilitiesDataSource}
                                    onChange={v => this.updateConfigProperty('facilitiesDataSource', v)}
                                    widgetId={this.props.id}
                                    buttonLabel='Select Facilities Layer' />
                <DataSourceSelector types={this.supportedTypes}
                                    mustUseDataSource
                                    useDataSources={this.props.pwsDataSource}
                                    onChange={v => this.updateConfigProperty('pwsDataSource', v)}
                                    widgetId={this.props.id}
                                    buttonLabel='Select PWS Layer' />
                <DataSourceSelector types={this.supportedTypes}
                                    mustUseDataSource
                                    useDataSources={this.props.agenciesDataSource}
                                    onChange={v => this.updateConfigProperty('agenciesDataSource', v)}
                                    widgetId={this.props.id}
                                    buttonLabel='Select Primary Agencies Table' />
                <DataSourceSelector types={this.supportedTypes}
                                    mustUseDataSource
                                    useDataSources={this.props.contactsDataSource}
                                    onChange={v => this.updateConfigProperty('contactsDataSource', v)}
                                    widgetId={this.props.id}
                                    buttonLabel='Select Admin Contacts Table' />
            </div>
        );
    }
}
