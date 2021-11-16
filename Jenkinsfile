node {
    stage('update widget on ER EB') {
        dir("D:/R9Web/ArcGISExperienceBuilder/client/R9-Widgets") {

            // todo: deal with branching
            checkout scm
             bat "npm i"
        }
        dir("D:/R9Web/ArcGISExperienceBuilder/client") {
            bat "npm i"
            bat "npm run build:dev"
        }

    }

}
