/*
 Copyright 2016 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

const eslint = require('gulp-eslint');
const express = require('express');
const gulp = require('gulp');
const handlebars = require('gulp-compile-handlebars');
const minimist = require('minimist');
const mocha = require('gulp-mocha');
const npmPath = require('npm-path');
const path = require('path');
const promisify = require('promisify-node');
const rename = require('gulp-rename');
const runSequence = require('run-sequence');
const serveIndex = require('serve-index');
const serveStatic = require('serve-static');
const {globPromise, processPromiseWrapper, taskHarness} = require('./build-utils');

const fsePromise = promisify('fs-extra');
const tmpPromise = promisify('tmp');

const options = minimist(process.argv.slice(2));
const projectOrStar = options.project || '*';

// Before doing anything, modify process.env.PATH so the the ChromeDriver
// and documentation binaries in node_modules/.bin are picked up.
npmPath.setSync();

/**
 * Lints a given project.
 * @param {String} projectPath The path to a project directory.
 * @returns {Promise} Resolves if linting succeeds, rejects if it fails.
 */
const lintPackage = projectPath => {
  return new Promise((resolve, reject) => {
    gulp.src([`${projectPath}/**/*.js`, `!${projectPath}/**/build/**`])
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.results(results => {
        if ((results.errorCount) > 0) {
          reject(`Linting '${projectPath}' failed.`);
        } else {
          resolve();
        }
      }));
  });
};

/**
 * Buids a given project.
 * @param {String} projectPath The path to a project directory.
 * @returns {Promise} Resolves if building succeeds, rejects if it fails.
 */
const buildPackage = projectPath => {
  const buildDir = `${projectPath}/build`;

  // Copy over package.json and README.md so that build/ contains what we
  // need to publish to npm.
  return fsePromise.emptyDir(buildDir)
    .then(() => fsePromise.copy(`${projectPath}/package.json`,
      `${buildDir}/package.json`))
    .then(() => fsePromise.copy(`${projectPath}/README.md`,
      `${buildDir}/README.md`))
    .then(() => {
      // Let each project define its own build process.
      const build = require(`./${projectPath}/build.js`);
      return build();
    });
};

/**
 * Documents a given project.
 * @param {String} projectPath The path to a project directory.
 * @returns {Promise} Resolves if documenting succeeds, rejects if it fails.
 */
const documentPackage = projectPath => {
  const projectMetadata = require(`./${projectPath}/package.json`);
  return new Promise(resolve => {
    // First, use metadata require(package.json to write out an initial README.md.
    gulp.src('templates/Project-README.hbs')
      .pipe(handlebars({
        name: projectMetadata.name,
        description: projectMetadata.description,
        background: projectMetadata.background
      }))
      .pipe(rename('README.md'))
      .pipe(gulp.dest(projectPath))
      .on('end', resolve);
  }).then(() => {
    // Then use the inline JSDoc to populate the "API" section.
    return globPromise(`${projectPath}/src/**/*.js`).then(files => {
      const args = ['readme', ...files, '--github', '--section', 'API',
        '--readme-file', `${projectPath}/README.md`];
      return processPromiseWrapper('documentation', args);
    });
  });
};

/**
 * Publishes a given project to npm.
 * @param {String} projectPath The path to a project directory.
 * @returns {Promise} Resolves if publishing succeeds, rejects if it fails.
 */
const publishPackage = projectPath => {
  return processPromiseWrapper('npm', ['publish', `${projectPath}/build`]);
};

gulp.task('lint', () => {
  return taskHarness(lintPackage, projectOrStar);
});

gulp.task('test', () => {
  return gulp.src(`projects/${projectOrStar}/test/*.js`, {read: false})
    .pipe(mocha())
    .once('error', error => {
      console.error(error);
      process.exit(1);
    });
});

gulp.task('build', () => {
  return taskHarness(buildPackage, projectOrStar);
});

gulp.task('build:watch', ['build'], unusedCallback => {
  gulp.watch(`projects/${projectOrStar}/src/**/*`, ['build']);
  gulp.watch(`lib/**/*`, ['build']);
});

gulp.task('serve', unusedCallback => {
  const port = options.port || 3000;
  const app = express();
  const rootDirectory = projectOrStar === '*' ?
    'projects' :
    path.join('projects', projectOrStar);

  app.use(serveStatic(rootDirectory));
  app.use(serveIndex(rootDirectory, {view: 'details'}));
  app.listen(port, () => {
    console.log(`Serving '${rootDirectory}' at http://localhost:${port}/`);
  });
});

gulp.task('documentation:projects', () => {
  return taskHarness(documentPackage, projectOrStar);
});

gulp.task('documentation:repo', ['build'], () => {
  if (projectOrStar !== '*') {
    throw Error('Please do not use --project= with documentation:repo.');
  }

  return new Promise(resolve => {
    // First, generate a repo README.md based on metadata require(each project.
    return globPromise('projects/*/package.json')
      .then(pkgs => pkgs.map(pkg => require(`./${pkg}`)))
      .then(projects => {
        gulp.src('templates/README.hbs')
          .pipe(handlebars({projects: projects}))
          .pipe(rename({extname: '.md'}))
          .pipe(gulp.dest('.'))
          .on('end', resolve);
      });
  }).then(() => {
    // The gh-pages module ends up pulling in https://www.npmjs.com/package/collections
    // which in turn breaks the native Array.filter() implementation in some
    // versions of Node, triggering a bug in selenium-webdriver (sigh).
    // To work around this, only pull in gh-pages when it's needed, rather than
    // globally at the top of this file.
    const ghPagesPromise = promisify('gh-pages');

    // Then publish all of the build + demo files to gh-pages.
    return tmpPromise.dir().then(tmpDir => {
      return new Promise(resolve => {
        gulp.src('projects/*/{build,demo}/**')
          .pipe(gulp.dest(tmpDir))
          .on('end', resolve);
      }).then(() => ghPagesPromise.publish(tmpDir));
    });
  });
});

gulp.task('documentation', ['documentation:repo', 'documentation:projects']);

gulp.task('publish', callback => {
  if (projectOrStar === '*') {
    throw Error('Please use the --project= parameter to specify a project.');
  }

  // We need things run in a specific sequence: the project-level documentation
  // needs to be created before build, so that the correct README.md is copied
  // over to the build/ directory.
  runSequence(['lint', 'test'], 'documentation:projects', 'build', error => {
    // If any of the previous steps in the sequence generated an error, then
    // bail without publishing.
    if (error) {
      return callback(error);
    }

    return taskHarness(publishPackage, projectOrStar).then(() => callback());
  });
});

gulp.task('default', callback => {
  runSequence(['lint', 'test'], 'documentation', callback);
});
