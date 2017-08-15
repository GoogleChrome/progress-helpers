const gulp = require('gulp');
const GitHubApi = require('github');
const path = require('path');
const semver = require('semver');
const glob = require('glob');
const fs = require('fs-extra');
const TarGz = require('tar.gz');
const archiver = require('archiver');

const logHelper = require('./utils/log-helper');
const constants = require('./utils/constants');
const spawnPromiseWrapper = require('./utils/spawn-promise-wrapper');
const uploadBundleToCDN = require('./utils/upload-bundle-to-cdn');

const GITHUB_OWNER = 'GoogleChrome';
const GITHUB_REPO = 'workbox';

const BUILD_PATH = path.join(__dirname, '..', 'github-releases');

const github = new GitHubApi();

github.authenticate({
  type: 'token',
  token: process.env.GITHUB_TOKEN,
});

const downloadGitCommit = (tagName) => {
  logHelper.log(`Clone Git repo for tag: '${tagName}'.`);
  const tempPath = path.join(BUILD_PATH, tagName, 'source-code');
  const params = [
    'clone',
    '--branch', tagName,
    '--depth', '1',
    `http://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`,
    tempPath,
  ];

  return spawnPromiseWrapper('git', params)
  .then(() => tempPath);
};

const buildProject = (projectPath) => {
  return spawnPromiseWrapper('npm', ['install'], {
    cwd: projectPath,
  })
  .then(() => {
    return spawnPromiseWrapper('gulp', ['build'], {
      cwd: projectPath,
    });
  });
};

const createTar = (bundleDirectory, bundleName) => {
  const tarball = new TarGz({}, {
    // Do not inlcude the top level in the tar.gz
    fromBase: true,
  });
  const tarPath = path.join(bundleDirectory, '..', `${bundleName}.tar.gz`);
  return tarball.compress(bundleDirectory, tarPath)
  .then(() => {
    return tarPath;
  });
};

const createZip = (bundleDirectory, bundleName) => {
  const zipPath = path.join(bundleDirectory, '..', `${bundleName}.zip`);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(zipPath);
    writeStream.on('close', () => resolve(zipPath));

    const archive = archiver('zip');
    archive.on('error', (err) => {
      reject(err);
    });
    archive.pipe(writeStream);
    // Adds the directory contents to the zip.
    archive.directory(bundleDirectory, false);
    archive.finalize();
  });
};

/**
 * This function will create a directory with the same name at the
 * .tar.gz file it generates. This way when the file is extracted
 * the folder structure will have the sam
 */
const bundleProject = (projectPath, tagName) => {
  const pattern = path.posix.join(projectPath, 'packages', '**',
    constants.PACKAGE_BUILD_DIRNAME, constants.BROWSER_BUILD_DIRNAME,
    '*.{js,map}');

  const filesToIncludeInBundle = glob.sync(pattern);
  const bundleDirectory = path.join(projectPath, '..', 'github-bundle');

  filesToIncludeInBundle.forEach((fileToInclude) => {
    fs.copySync(
      fileToInclude,
      path.join(bundleDirectory, path.basename(fileToInclude))
    );
  });

  const bundleName = `workbox-${tagName}`;
  return createTar(bundleDirectory, bundleName)
  .then((tarPath) => {
    return createZip(bundleDirectory, bundleName)
    .then((zipPath) => {
      return {
        bundleDirectory,
        tarPath,
        zipPath,
      };
    });
  });
};

const handleGithubAndCDNRelease = (tagName, gitBranch, release) => {
  let releaseCreation = Promise.resolve();
  if (!release) {
    releaseCreation = github.repos.createRelease({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      tag_name: tagName,
      draft: true,
      name: tagName,
    })
    .then((response) => {
      release = response.data;
    });
  }

  return releaseCreation
  .then(() => {
    return downloadGitCommit(gitBranch);
  })
  .then((tagDownloadPath) => {
    return buildProject(tagDownloadPath)
    .then(() => {
      return bundleProject(tagDownloadPath, tagName);
    });
  })
  .then(({bundleDirectory, tarPath, zipPath}) => {
    return github.repos.uploadAsset({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      id: release.id,
      filePath: tarPath,
      name: path.basename(tarPath),
      label: path.basename(tarPath),
    })
    .then(() => {
      return github.repos.uploadAsset({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        id: release.id,
        filePath: tarPath,
        name: path.basename(zipPath),
        label: path.basename(zipPath),
      });
    })
    .then(() => {
      return uploadBundleToCDN(tagName, bundleDirectory);
    });
  });
};

const findReleasesForTags = (tagNames) => {
  return github.repos.getReleases({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
  })
  .then((releasesData) => {
    const allReleases = releasesData.data;
    return tagNames.map((tagData) => {
      let matchingRelease = null;

      allReleases.forEach((release) => {
        if (release.tag_name === tagData.name) {
          matchingRelease = release;
        }
      });

      return {
        tagData: tagData,
        release: matchingRelease,
      };
    });
  });
};

const filterTagsWithBundles = (tagsAndReleases) => {
  return tagsAndReleases.filter((tagAndRelease) => {
    const release = tagAndRelease.release;
    if (release && release.assets.length > 0) {
      // If a tag has a release and there is an asset let's assume the
      // the release is fine. Note: Github's source doesn't count as an
      // asset
      return false;
    }

    return true;
  });
};

const findTagsWithoutBundles = () => {
  // Get all of the tags in the repo.
  return github.repos.getTags({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
  })
  .then((tagsResponse) => {
    // We only want tags that are v3.0.0 or above.
    const tagsData = tagsResponse.data;
    return tagsData.filter((tagData) => {
      // The "-alpha" means semver will match against tags with prelease
      // info (although the prelease tag must be a string >= 'alpha'
      // alphabetically speaking).
      // TODO: Change to v3.0.0 when v3 is launched.
      return semver.gte(tagData.name, 'v3.0.0-alpha');
    });
  })
  .then(findReleasesForTags)
  .then(filterTagsWithBundles);
};

const publishTagAndReleaseBundles = (tagAndReleaseData) => {
  return tagAndReleaseData.reduce((promiseChain, tagAndRelease) => {
    return promiseChain.then(() => {
      const tag = tagAndRelease.tagData;
      const release = tagAndRelease.release;
      return handleGithubAndCDNRelease(tag.name, tag.name, release);
    });
  }, Promise.resolve());
};

gulp.task('publish-bundle:generate-from-tags', () => {
  return findTagsWithoutBundles()
  .then(publishTagAndReleaseBundles);
});

gulp.task('publish-bundle:clean', () => {
  return fs.remove(BUILD_PATH);
});

// TODO: Delete this task when v3 is about to launch.
gulp.task('publish-bundle:temp-v3-branch-build', () => {
  const tagName = 'v3.0.0-alpha';
  const gitBranch = 'v3';

  return findReleasesForTags([{name: tagName}])
  .then(filterTagsWithBundles)
  .then((tagAndReleaseData) => {
    return tagAndReleaseData.reduce((promiseChain, tagAndRelease) => {
      const tag = tagAndRelease.tagData;
      const release = tagAndRelease.release;
      // Override the git branch here since we aren't actually
      // using a tagged release.
      return handleGithubAndCDNRelease(tag.name, gitBranch, release);
    }, Promise.resolve());
  });
});

gulp.task('publish-bundle', gulp.series(
  'publish-bundle:clean',
  'publish-bundle:generate-from-tags',
  'publish-bundle:temp-v3-branch-build',
));
