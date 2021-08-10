# R9-Widgets

This repository contains various widgets developed by Region 9. 

These widgets are generated using https://github.com/Esri/generator-esri-appbuilder-js.

#### Widget Development
Widgets are still generated using the tool above, but the Gruntfile is now included in this repo
and a user-defined env file must be added to the root of your local repository clone (R9-Widgets/env.js). This file
defines the target app directory, and stemappDir.

env.js example:
```
module.exports = {
  files: [
          {
            cwd: 'dist/',
            src: '**',
            dest: 'C:\\Data\\EPAWAB\\client\\stemapp'
          },
          {
            cwd: 'dist/',
            src: '**',
            dest: 'C:\\Data\\EPAWAB\\server\\apps\\2'
          }
        ]
};
```

Running the app generator command ```yo esri-appbuilder-js``` that would normally create
the grunt tasks and configure other project files is no longer necessary as this has been setup for you.
However, the generator and its dependencies must still be installed to run these grunt tasks, or generate new widgets.

* Setup
  1. Clone the repository (a fresh start is probably best)
  2.  Install the generator and its dependencies
  3. Create your env.js
  4. ```npm install``` (from the root directory) 
  5. ```grunt``` (from the root directory)

***
See individual folder README.md files for specific information about their contents:
 
 * [ESI Widget](https://github.com/USEPA/R9-Widgets/blob/master/ESIWidget)
 * [Fire](https://github.com/USEPA/R9-Widgets/blob/master/Fire)
 * [GRP Widget](https://github.com/USEPA/R9-Widgets/blob/master/GRPWidget)
 * [iStreet Viewer Widget](https://github.com/USEPA/R9-Widgets/blob/master/iStreetViewer)
 * [RMP Identify Widget](https://github.com/USEPA/R9-Widgets/blob/master/RMPIdentify)
 * [Save Session Widget](https://github.com/USEPA/R9-Widgets/blob/master/SaveSession)
 * [Smoke Widget](https://github.com/USEPA/R9-Widgets/blob/master/Smoke)
 * [Tier II Identify Widget](https://github.com/USEPA/R9-Widgets/blob/master/TierIIIdentify)
 * [Wind Widget](https://github.com/USEPA/R9-Widgets/blob/master/Wind)

### Contact Information

* **Cheryl Henley**, GIS Coordinator 415-972-3586 henley.cheryl@epa.gov
* **Stacy Takeda**, Staff Geographer 415-972-3641 takeda.stacy@epa.gov

See the list of [contributors](https://github.com/USEPA/R9-Widgets/contributors) who have participated in this project.
