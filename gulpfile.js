'use strict';

const gulp = require('gulp'),
      mocha = require('gulp-mocha'),
      jshint = require('gulp-jshint'),
      exec = require('child_process').exec;

gulp.task('mocha', () => 
  gulp.src('qa/tests-*.js', {read: false})
    .pipe(mocha({ui: 'tdd'}))
);

gulp.task('jshint', () => {
  gulp.src(['meadowlark.js', 'public/js/**/*.js', 'lib/**/*.js', 'gulpgile.js', 'qa/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('linkchecker', (cb) => {
  exec('linkchecker http://localhost:3003', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('default', gulp.series('mocha', 'jshint', 'linkchecker'));