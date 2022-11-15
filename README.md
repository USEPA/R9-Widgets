Clone the repository into client directory for Experience Builder >=1.9

Run `npm install` from inside the cloned repository directory.

Update the widget-webpack-override.js to include the two react jsx lines bellow and look like the following per 
https://developers.arcgis.com/experience-builder/guide/override-webpack-config/.  This is required for the react-data-grid library.
```
module.exports = function (webpackConfig) {
  /**
   * If you need to change the widget webpack config, you can change the webpack config here and return the changed config.
   */
  'use strict';
  webpackConfig.resolve.alias['react/jsx-dev-runtime'] = 'react/jsx-dev-runtime.js';
  webpackConfig.resolve.alias['react/jsx-runtime'] = 'react/jsx-runtime.js';
  return webpackConfig;
}
```
