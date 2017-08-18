const GitHubApi = require('github');
const semver = require('semver');

const constants = require('./constants');

const github = new GitHubApi();

// github.authenticate() is synchronous, and it only stores the credentials for
// the next request, so it should be called once per method that requires auth.
// See https://github.com/mikedeboer/node-github#authentication
const authenticate = () => {
  github.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN,
  });
};

module.exports = {
  createRelease: (args) => {
    authenticate();
    args.owner = constants.GITHUB_OWNER;
    args.repo = constants.GITHUB_REPO;
    return github.repos.createRelease(args);
  },

  uploadAsset: (args) => {
    authenticate();
    args.owner = constants.GITHUB_OWNER;
    args.repo = constants.GITHUB_REPO;
    return github.repos.uploadAsset(args);
  },

  getTaggedReleases: () => {
    authenticate();
    return github.repos.getReleases({
      owner: constants.GITHUB_OWNER,
      repo: constants.GITHUB_REPO,
    })
    .then((releasesData) => {
      const releases = releasesData.data;
      const releasesByTags = {};
      releases.forEach((release) => {
        const tagName = release.tag_name;
        if (semver.gte(tagName, constants.MIN_RELEASE_TAG_TO_PUBLISH)) {
          releasesByTags[tagName] = release;
        }
      });
      return releasesByTags;
    });
  },

  getTags: async () => {
    authenticate();
    const tagsResponse = await github.repos.getTags({
      owner: constants.GITHUB_OWNER,
      repo: constants.GITHUB_REPO,
    });

    // We only want tags that are v3.0.0 or above.
    const tagsData = tagsResponse.data;
    return tagsData.filter((tagData) => {
      return semver.gte(tagData.name, constants.MIN_RELEASE_TAG_TO_PUBLISH);
    });
  },
};
