Clone the repository into client directory for Experience Builder >=1.9

Run `npm install` from inside the cloned repository directory.

Upgrading hosted Experience Builder versions:
1. Download and unzip latest experience builder developer edition
2. Pull github repo into client folder
3. Run npm install in both the client and server folders
4. Remove existing service
   - Stop exp-server
   - cd /server
   - npm run uninstall-windows-service
5. Rename old installation with _backup
6. Copy new installation from /ArcGISExperienceBuilder into D://R9Web
7. Change server package.json to include path when installing service
    - Add `--path=/eb"` to the end of the `npm run install-windows-service` command 
8. Create new service
    - cd /server
    - npm run install-windows-service
9. Build widgets
    - cd /client
    - npm run build:dev
10. Modify client/dist/site/widgets/set-portalurl/dist/runtime/widget.js
    - Change the one remaining issue with putting EB behind reverse proxy with path.
    - Change the `${window.location.protocol}//${window.location.host}/signininfo` to `${window.location.protocol}//${window.location.host}/eb/signininfo`
