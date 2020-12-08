node {
  properties([disableConcurrentBuilds()])

  dir('cop') {
    git branch: 'master',
    credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
    url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
  }
  dir('widgets') {
    git url: 'https://github.com/USEPA/R9-Widgets.git'
    docker.image('node:14-alpine').inside {
      sh 'npm install'
      sh 'npm install grunt-cli'
      sh 'grunt sass'
      sh 'grunt ts'
      sh 'grunt copy'
      //sh 'grunt sync'
    }

  }




  input(message: "Shall we proceed?")

  cleanWs()
}
