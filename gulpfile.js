'use strict';

const gulp = require('gulp'),
      gmocha = require('gulp-mocha'),
      jshint = require('gulp-jshint'),
      exec = require('child_process').exec,
      stylus = require('gulp-stylus'),
      uglify = require('gulp-uglify'),
      concat = require('gulp-concat'),
      rename = require('gulp-rename'),
      cssmin = require('gulp-cssmin'),
      rev = require('gulp-rev'),
      revReplace = require('gulp-rev-replace'),
      patternlint = require('gulp-patternlint');

gulp.task('mocha', () => {
  let stream = gulp.src('qa/tests-*.js', {read: false})
    .pipe(gmocha({ui: 'tdd'}));
  return stream;
});

gulp.task('jshint', () => {
  let stream = gulp.src(['meadowlark.js', 'public/js/**/*.js', 'lib/**/*.js', 'gulpfile.js', 'public/qa/**/*.js', 'qa/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
  return stream;
});

gulp.task('linkchecker', (cb) => {
  exec('linkchecker --ignore-url=\'!^(https?:)\/\/localhost\b\' --ignore-url=/cart/add --no-warnings http://localhost:3003', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('stylus', () => {
  //const Static = require('./lib/static.js').map;
  return gulp.src('./stylus/main.styl')
    .pipe(stylus({
      // TODO: доработать

      // Способ 1
      // define: {
      //   static: (file) => `url(${Static(file.val)})`
      // },

      // Способ 2
      // define: {
      //   url:
      //     stylus.stylus.url({
      //       paths: [__dirname + '/public/image'],
      //       limit: 8000
      //     })
      // },

      // Способ 3
      url: {
        name: 'static',
        //paths: [__dirname + '/public/image'],
        limit: 8000
      }
    }))
    .pipe(gulp.dest('./public/css'));
});

gulp.task('compress', () => {
  return gulp.src(['./public/js/**/*.js', '!./public/js/meadowlark.min.js'])
    .pipe(concat('meadowlark.js'))
    .pipe(rename('meadowlark.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./public/js.min'));
});

gulp.task('cssmin', () => {
  return gulp.src(['./public/css/**/*.css', '!./public/css/meadowlark.min.css'])
    .pipe(concat('meadowlark.css'))
    .pipe(gulp.dest('./public/css')) // TODO: не дописывать, а заменять файл
    .pipe(rename('meadowlark.min.css'))
    .pipe(cssmin())
    .pipe(gulp.dest('./public/css'));
});

gulp.task('revision', () => {
  return gulp.src(['./public/js.min/meadowlark.min.js', './public/css/meadowlark.min.css'])
    .pipe(rev())
    .pipe(gulp.dest('./public'))
    .pipe(rev.manifest())
    .pipe(gulp.dest('./public'));
});
// TODO: js в js.min, css в css
// TODO: удалять старые файлы
gulp.task('revreplace', () => {
  const manifest = gulp.src('./public/rev-manifest.json');
  return gulp.src('./config.js')
    .pipe(revReplace({ manifest }))
    .pipe(gulp.dest('./'));
});

gulp.task('lint_pattern_hbs', () => {
  return gulp.src('./views/**/*.hbs')
    .pipe(patternlint([
      {
        regexp: /<link [^>]*href=["'](?!\{\{static )/,
        message: 'В <link> обнаружен статический ресурс, которому не установлено соответствие.'
      },
      {
        regexp: /<script [^>]*src=["'](?!\{\{static )/,
        message: 'В <script> обнаружен статический ресурс, которому не установлено соответствие.'
      },
      {
        regexp: /<img [^>]*src=["'](?!\{\{static )/,
        message: 'В <img> обнаружен статический ресурс, которому не установлено соответствие.'
      },
    ]))
    .pipe(patternlint.reporter());
});
gulp.task('lint_pattern_styl', () => {
  return gulp.src('./stylus/**/*.styl')
    .pipe(patternlint([
      {
        regexp: /url\(/,
        message: 'В свойстве LESS обнаружен статический ресурс, которому не установлено соответствие.'
      },
    ]))
    .pipe(patternlint.reporter());
});

gulp.task('default', gulp.series('mocha', 'jshint', 'linkchecker', 'lint_pattern_hbs', 'lint_pattern_styl'));
gulp.task('static', gulp.series('stylus', 'cssmin', 'compress', 'revision', 'revreplace'));
