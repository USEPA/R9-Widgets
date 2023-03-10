node {
    stage('update widget on ER EB') {
        dir("D:/R9Web/ArcGISExperienceBuilder/client/R9-Widgets") {

            // todo: deal with branching
            checkout scm
            bat "npm i"
        }
        dir("D:/R9Web/ArcGISExperienceBuilder/client") {
            bat "npm i"
            bat "npm run build:prod"
        }
//         dir("D:/R9Web/ArcGISExperienceBuilder") {
//             def info = readJSON file: '/server/public/apps/12/info.json'
//             def currentDateTime = new Date()
//             use(groovy.time.TimeCategory) {
//                 def tenMinutesAgo = currentDateTime - 10.minutes
//                 if (info['modified'] >= tenMinutesAgo && info['typeKeywords'].contains("status: Published")) {
//                     bat "node /server/src/runZipApp.js"
//                 }
//             }
//         }
//         dir("\\10.11.29.20\\R9Apps\\apps\\EBCOPStaging") {
//             if (!fileExists("/backup") {
//                 bat "mkdir backup"
//             }
//
//             bat "del /S backup"
//             bat "move * backup"
//             bat "move cdn backup"
//             powershell "Expand-Archive -LiteralPath 'D:/Data/exp_builder_widgets_export.zip' -DestinationPath '.'"
//         }
    }
}
