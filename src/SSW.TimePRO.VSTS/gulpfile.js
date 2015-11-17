/// <binding AfterBuild='bower, vss-sdk' />
/*
This file in the main entry point for defining Gulp tasks and using Gulp plugins.
Click here to learn more. http://go.microsoft.com/fwlink/?LinkId=518007
*/

var gulp = require('gulp');
var wiredep = require('wiredep').stream;

gulp.task('default', ['vss-sdk', 'bower'], function () {
    // place code for your default task here
});

gulp.task('vss-sdk', function () {
    gulp.src('./node_modules/vss-sdk/lib/*.js')
        .pipe(gulp.dest('./wwwroot/sdk/scripts'));
});

gulp.task('bower', function () {
    gulp.src('./wwwroot/*.html')
      .pipe(wiredep({
      }))
      .pipe(gulp.dest('./wwwroot'));
});
