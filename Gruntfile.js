module.exports = function (grunt) {
  'use strict';
  grunt.loadNpmTasks('grunt-sync');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('node-sass');
  const sass = require('node-sass');
  const env = require('./env');
  grunt.initConfig({
    sync: {
      main: {
        verbose: true,
        files: env.files
      }
    },
    ts: {'default': {'tsconfig': {'passThrough': true}}},
    babel: {
      'options': {'sourceMap': true},
      'main': {
        'files': [{
          'expand': true,
          'src': [
            'widgets/*.js',
            'widgets/**/*.js',
            'widgets/**/**/*.js',
            'widgets/!**/**/nls/*.js',
            'themes/*.js',
            'themes/**/*.js',
            'themes/**/**/*.js',
            'themes/!**/**/nls/*.js'
          ],
          'dest': 'dist/'
        }]
      }
    },
    watch: {
      main: {
        files: [
          'widgets/**',
          'themes/**'
        ],
        tasks: [
          'clean',
          'sass',
          'ts',
          'babel',
          'copy',
          'sync'
        ],
        options: {
          spawn: false,
          atBegin: true,
          livereload: true
        }
      }
    },
    copy: {
      'main': {
        'src': [
          'widgets/**/**.html',
          'widgets/**/**.json',
          'widgets/**/**.css',
          'widgets/**/images/**',
          'widgets/**/nls/**',
          'themes/**/**.html',
          'themes/**/**.json',
          'themes/**/**.css',
          'themes/**/images/**',
          'themes/**/nls/**',
          'themes/**/layouts/**/*.*'
        ],
        'dest': 'dist/',
        'expand': true
      }
    },
    clean: {'dist': {'src': 'dist/*'}},
    sass: {
      dist: {
        options: {
          implementation: sass,
          sourceMap: true
        },
        files: [{
          expand: true,
          src: ['widgets/**/*.scss'],
          rename: function (dest, src) {
            return src.replace('scss', 'css');
          }
        }]
      }
    }
  });
  grunt.registerTask('default', ['watch']);
  grunt.registerTask('build', ['clean',
    'sass',
    'ts',
    'babel',
    'copy',
    'sync'
  ]);
};
