var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var browserify = require('gulp-browserify');
var react = require('gulp-react');
var styl = require('gulp-styl');
var clean = require('gulp-clean');

gulp.task('dev', function(){
    gulp.src(['src/chat/scripts/app.jsx'])
        .pipe(react())
        .pipe(concat('okkchat.js'))
        .pipe(gulp.dest('dev'));
});

gulp.task('clean-dist', function(){
    return gulp.src('dist/**/*.*', {read: false})
        .pipe(clean());
});

gulp.task('clean-dist-dev', function(){
    return gulp.src('dev/**/*.*', {read: false})
        .pipe(clean());
});

gulp.task('styles-dev', function() {
    gulp.src(['src/chat/styles/**/*.css'])
        .pipe(styl({compress : true}))
        .pipe(gulp.dest('dev'))
});

gulp.task('styles', function() {
    gulp.src(['src/chat/styles/**/*.css'])
        .pipe(styl({compress : true}))
        .pipe(gulp.dest('dist'))
});

gulp.task('build-jsx', function(){
    process.env.NODE_ENV = 'production';
    gulp.src(['src/chat/scripts/app.jsx'])
        .pipe(react())
        .pipe(browserify())
        .pipe(concat('okkchat.min.js'))
        .pipe(uglify('okkchat.min.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('build-vendor', function() {
    gulp.src(['src/chat/scripts/lib/**/*.js'])
        .pipe(concat('okkchat.vendor.min.js'))
        .pipe(uglify('okkchat.vendor.min.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('build-vendor-dev', function() {
    gulp.src(['src/chat/scripts/lib/**/*.js'])
        .pipe(concat('okkchat.vendor.min.js'))
        .pipe(uglify('okkchat.vendor.min.js'))
        .pipe(gulp.dest('dev'));
});

gulp.task('default', ['clean-dist-dev', 'dev', 'styles-dev', 'build-vendor-dev']);
gulp.task('production', ['clean-dist', 'build-jsx', 'styles', 'build-vendor']);