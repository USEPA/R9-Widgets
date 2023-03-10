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

Upgrading Experience Builder versions:
1. Download and unzip latest experience builder developer edition
2. Pull github repo into client folder
3. Run npm install in both the client and server folders
4. Copy files from previous version into the new one (keep all locations the same)
   - server/src/runZipApp.js
   - the whole server/public folder
5. Make the above updates to widget-webpack-override.js
6. Add "IS_DE=true" build:dev command in client/package.json 
7. Remove existing service
   - Stop exp-server
   - cd /server
   - npm run uninstall-windows-service
8. Rename old installation with _backup
9. Copy new installation from /ArcGISExperienceBuilder into D://R9Web
10. Create new service
    - cd /server
    - npm run install-windows-service
11. Build widgets
    - cd /client
    - npm run build:dev