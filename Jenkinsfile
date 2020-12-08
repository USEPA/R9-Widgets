node {
  properties([disableConcurrentBuilds()])
  dir('cop') {
    git url: 'https://github.com/Innovate-Inc/r9-cop-rwma.git'
  }
  dir('widgets') {
    git url: 'https://github.com/USEPA/R9-Widgets.git'
  }

  input(message: "Shall we proceed?")
}
