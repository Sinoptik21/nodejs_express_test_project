'use strict';

const gulp = require('gulp'),
      gmocha = require('gulp-mocha'),
      jshint = require('gulp-jshint'),
      exec = require('child_process').exec;

gulp.task('mocha', () => {
  let stream = gulp.src('qa/tests-*.js', {read: false})
    .pipe(gmocha({ui: 'tdd'}));
  return stream;
});

gulp.task('jshint', () => {
  let stream = gulp.src(['meadowlark.js', 'public/js/**/*.js', 'lib/**/*.js', 'gulpfile.js', 'qa/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
  return stream;
});

gulp.task('linkchecker', (cb) => {
  exec('linkchecker http://localhost:3003', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('default', gulp.series('mocha', 'jshint', 'linkchecker'));
