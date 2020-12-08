node {
  properties([disableConcurrentBuilds()])

  stage('build') {
    dir('cop') {
      git branch: 'master',
      credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
      url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
    }
    dir('widgets') {
    configFileProvider([configFile(fileId: 'ebd76eaf-c253-40d8-abbe-145c8ae34e8b', variable: 'LOCAL_ENV')]) {
      git branch:'reset_root_of_master',
      url: 'https://github.com/USEPA/R9-Widgets.git',
      credentialsId: ''
      docker.build("wab-build").inside {
        sh 'cp -f $LOCAL_ENV env.js'
        sh 'npm install'
        sh 'npm run build-widgets'
        sh 'npm run build-prod'
        //sh 'grunt sync'
      }
}
    }
  }


  stage('deploy') {
    input(message: "Shall we proceed?")
  }
  cleanWs()
}
