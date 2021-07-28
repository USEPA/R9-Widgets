node {
  try {
    echo env.BRANCH_NAME
    stage('build') {
      dir('cop') {
        try {
          git branch: env.BRANCH_NAME,
          credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
          url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
        } catch(Exception ex) {
          git branch: 'master',
          credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
          url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
          sh "git checkout -b ${env.BRANCH_NAME}"
        }
      }
      dir('firemap') {
        try {
          git branch: env.BRANCH_NAME,
          credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
          url: 'https://github.com/Innovate-Inc/r9-fire-rwma.git'
        } catch(Exception ex) {
          git branch: 'main',
          credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
          url: 'https://github.com/Innovate-Inc/r9-fire-rwma.git'
          sh "git checkout -b ${env.BRANCH_NAME}"
        }
      }
      dir('widgets') {
        configFileProvider([configFile(fileId: 'ebd76eaf-c253-40d8-abbe-145c8ae34e8b', variable: 'LOCAL_ENV')]) {
          git branch: env.BRANCH_NAME,
          url: 'https://github.com/USEPA/R9-Widgets.git',
          credentialsId: ''
          env.GIT_AUTHOR = sh (script: "git log -1 --pretty=format:'%an'", returnStdout: true).trim()
          env.GIT_AUTHOR_EMAIL = sh (script: "git log -1 --pretty=format:'%ae'", returnStdout: true).trim()
          env.GIT_COMMIT_MSG = sh (script: 'git log -1 --pretty=%B ${GIT_COMMIT}', returnStdout: true).trim()
          docker.image('node:lts').inside {
            sh 'cp -f $LOCAL_ENV env.js'
            sh 'npm install'
            sh 'npm run build-widgets'
            //sh 'grunt sync'
           }
          }
      }
      try {
        dir('cop') {
          withCredentials([usernamePassword(credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD')]){
            sh "git config user.email '${env.GIT_AUTHOR_EMAIL}'"
            sh "git config user.name '${env.GIT_AUTHOR}'"
            sh "git add --no-all widgets/."
  //           sh "git commit -a -m '${env.GIT_COMMIT_MSG}'"
            sh "git commit -a -m '${env.GIT_COMMIT_MSG}' || exit"
            sh 'git config --local credential.helper "!f() { echo username=\\$GIT_USERNAME; echo password=\\$GIT_PASSWORD; }; f"'
            sh "git push -u origin ${env.BRANCH_NAME}"
            slackSend(channel:"#r9-service-alerts", message: "COP Branch ${env.BRANCH_NAME} merge SUCCESS")
          }
        }
      } catch(Exception e) {
        emsg = "COP branch ${env.BRANCH_NAME} NOT merged (nothing to commit?)"
        echo emsg
        slackSend(channel:"#r9-service-alerts", message: emsg)
      }
      try {
        dir('firemap') {
          withCredentials([usernamePassword(credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD')]){
            sh "git config user.email '${env.GIT_AUTHOR_EMAIL}'"
            sh "git config user.name '${env.GIT_AUTHOR}'"
            sh "git add --no-all widgets/."
  //           sh "git commit -a -m '${env.GIT_COMMIT_MSG}'"
            sh "git commit -a -m '${env.GIT_COMMIT_MSG}' || exit"
            sh 'git config --local credential.helper "!f() { echo username=\\$GIT_USERNAME; echo password=\\$GIT_PASSWORD; }; f"'
            sh "git push -u origin ${env.BRANCH_NAME}"
            slackSend(channel:"#r9-service-alerts", message: "Fire Map Branch ${env.BRANCH_NAME} merge SUCCESS")
          }
        }
      } catch(Exception e) {
        emsg = "Fire Map branch ${env.BRANCH_NAME} NOT merged (nothing to commit?)"
        echo emsg
        slackSend(channel:"#r9-service-alerts", message: emsg)
      }
    }
  slackSend(channel:"#r9-service-alerts", message: "R9Widgets Branch ${env.BRANCH_NAME} Build COMPLETE")
    echo "R9Widgets Branch ${env.BRANCH_NAME} Build COMPLETE"
  } catch(Exception e) {
    echo "R9Widgets Branch ${env.BRANCH_NAME} Build FAILED"
    slackSend(channel:"#r9-service-alerts", message: "R9Widgets Branch ${env.BRANCH_NAME} Build FAILED")
  } finally {
    cleanWs()
  }
}
