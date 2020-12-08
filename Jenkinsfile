node {
  properties([disableConcurrentBuilds()])
  dir('cop') {
    git branch: 'master',
    credentialsId: 'd68c969d-4750-418f-aec5-9fc2e194fc4f',
    url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
  }
  dir('widgets') {
    git url: 'https://github.com/USEPA/R9-Widgets.git'
  }

  input(message: "Shall we proceed?")
}
