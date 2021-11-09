node {
    stage('update widget on ER EB') {
        dir("D:/R9Web/ArcGISExperienceBuilder/client/R9-Widgets") {

            // todo: deal with branching
            checkout scm
        }
        dir("D:/R9Web/ArcGISExperienceBuilder/client") {

            cmd "npm run build:dev"
        }

    }

}
