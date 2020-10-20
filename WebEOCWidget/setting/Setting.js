import declare from 'dojo/_base/declare';
import BaseWidgetSetting from 'jimu/BaseWidgetSetting';

export default declare([BaseWidgetSetting], {
  baseClass: 'web-eoc-widget-setting',

  postCreate () {
    // the config object is passed in
    this.setConfig(this.config);
  },

  setConfig (config) {
    this.authProxyUrl.value = config.authProxyUrl;
    this.serviceUrl.value = config.serviceUrl;
  },

  getConfig () {
    // WAB will get config object through this method
    return {
      authProxyUrl: this.authProxyUrl.value,
      serviceUrl: this.serviceUrl.value
    };
  }
});
