node {
  try {
    env.FIRE_BRANCH = env.BRANCH_NAME
      if (env.BRANCH_NAME == 'master') {
          env.FIRE_BRANCH = 'main'
      }

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
      dir('remedial') {
        try {
          git branch: env.BRANCH_NAME,
          credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
          url: 'https://github.com/Innovate-Inc/r9-remedialsnapshot-rwma.git'
        } catch(Exception ex) {
          git branch: 'master',
          credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
          url: 'https://github.com/Innovate-Inc/r9-remedialsnapshot-rwma.git'
          sh "git checkout -b ${env.BRANCH_NAME}"
        }
      }
      dir('firemap') {
        try {
          git branch: env.FIRE_BRANCH,
          credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
          url: 'https://github.com/Innovate-Inc/r9-fire-rwma.git'
        } catch(Exception ex) {
          git branch: 'main',
          credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
          url: 'https://github.com/Innovate-Inc/r9-fire-rwma.git'
          sh "git checkout -b ${env.FIRE_BRANCH}"
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
            sh "git commit -a -m '${env.GIT_COMMIT_MSG}'"
            sh 'git config --local credential.helper "!f() { echo username=\\$GIT_USERNAME; echo password=\\$GIT_PASSWORD; }; f"'
            sh "git push -u origin ${env.BRANCH_NAME}"
          }
        }
      } catch(Exception e) {
      echo "Failed to update rwma cop widgets"
      }
      try {
        dir('remedial') {
          withCredentials([usernamePassword(credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD')]){
            sh "git config user.email '${env.GIT_AUTHOR_EMAIL}'"
            sh "git config user.name '${env.GIT_AUTHOR}'"
            sh "git add --no-all widgets/."
            sh "git commit -a -m '${env.GIT_COMMIT_MSG}'"
            sh 'git config --local credential.helper "!f() { echo username=\\$GIT_USERNAME; echo password=\\$GIT_PASSWORD; }; f"'
            sh "git push -u origin ${env.BRANCH_NAME}"
          }
        }
      } catch(Exception e) {
      echo "Failed to update remedial cop widgets"
      }
      try {
        dir('firemap') {
          withCredentials([usernamePassword(credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD')]){
            sh "git config user.email '${env.GIT_AUTHOR_EMAIL}'"
            sh "git config user.name '${env.GIT_AUTHOR}'"
            sh "git add --no-all widgets/."
            sh "git commit -a -m '${env.GIT_COMMIT_MSG}'"
            sh 'git config --local credential.helper "!f() { echo username=\\$GIT_USERNAME; echo password=\\$GIT_PASSWORD; }; f"'
            sh "git push -u origin ${env.FIRE_BRANCH}"
          }
        }
      } catch(Exception e) {
      echo "Failed to update firemap widgets"
      }
    }
  // success
  slackSend(channel:"#r9-service-alerts", message: "Widget Branch ${env.BRANCH_NAME} Build COMPLETE")
    echo "Widget Branch ${env.BRANCH_NAME} Build COMPLETE"
  } catch(Exception e) {
    echo "Widget Branch ${env.BRANCH_NAME} Build FAILED"
    slackSend(channel:"#r9-service-alerts", message: "Widget Branch ${env.BRANCH_NAME} Build FAILED")
  } finally {
    cleanWs()
  }
}
