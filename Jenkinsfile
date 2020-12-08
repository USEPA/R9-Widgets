node {
  properties([disableConcurrentBuilds()])

  stage('build') {
    dir('cop') {
      git branch: 'master',
      credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
      url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
    }
    dir('widgets') {
      git branch:'reset_root_of_master'
      url: 'https://github.com/USEPA/R9-Widgets.git'
      credentialsId: null
      docker.image('node:lts-alpine').inside {
        sh 'npm install'
        sh 'npm install grunt-cli'
        sh 'grunt sass'
        sh 'grunt ts'
        sh 'grunt copy'
        //sh 'grunt sync'
      }

    }
  }


  stage('deploy') {
    input(message: "Shall we proceed?")
  }
  cleanWs()
}
