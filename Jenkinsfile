node {
  stage('build') {
    dir('cop') {
      try {
        git branch: env.BRANCH_NAME,
        credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
        url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
      } catch {
        git branch: 'master',
        credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
        url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
      }
    }
    dir('widgets') {
    configFileProvider([configFile(fileId: 'ebd76eaf-c253-40d8-abbe-145c8ae34e8b', variable: 'LOCAL_ENV')]) {
      git branch: env.BRANCH_NAME,
      url: 'https://github.com/USEPA/R9-Widgets.git',
      credentialsId: ''
      docker.image('node:lts').inside {
        sh 'cp -f $LOCAL_ENV env.js'
        sh 'npm install'
        sh 'npm run build-widgets'
        //sh 'grunt sync'
       }
      }
    }
  }

  stage('deploy demo') {
    sh "rm -rf /var/r9cop/r9widgets/${env.BRANCH_NAME}"
    sh "cp -r ./cop /var/r9cop/r9widgets/${env.BRANCH_NAME}"
    sh "sed -i 's/sBrra4vWeP2PZzcb/ZtlpDht9ywRCA4Iq/' /var/r9cop/r9widgets/${env.BRANCH_NAME}/config.json"
  }

  stage('deploy') {
    input(message: "Shall we proceed?")
  }
  cleanWs()
}
