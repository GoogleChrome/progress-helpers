const PluginInterface = require('pr-bot').PluginInterface;
const bytes = require('bytes');
const fs = require('fs-extra');
const glob = require('glob');
const gzipSize = require('gzip-size');
const oneLine = require('common-tags').oneLine;
const path = require('path');

const constants = require('../../gulp-tasks/utils/constants');

// 15 KB max size
const MAX_SIZE = 15 * 1000;

class AggregateSizePlugin extends PluginInterface {
  constructor() {
    super(`Workbox Aggregate Size Plugin`);
  }

  run({afterPath} = {}) {
    const packagesToAggregate = [
      `workbox-cache-expiration`,
      `workbox-cacheable-response`,
      `workbox-core`,
      `workbox-precaching`,
      `workbox-routing`,
      `workbox-runtime-caching`,
      `workbox-sw`,
    ];
    // I'm pretty sure we can get away with not supporting Windows paths here.
    const files = packagesToAggregate.map((pkg) => {
      const prefix = `${afterPath}/packages/${pkg}/`;
      const pkgJson = require(`${prefix}package.json`);
      return prefix + pkgJson.browser;
    });

    let totalSize = 0;
    let totalGzipSize = 0;
    files.forEach((filePath) => {
      const fileContents = fs.readFileSync(filePath);
      const stat = fs.statSync(filePath);
      totalSize += stat.size;
      totalGzipSize += gzipSize.sync(fileContents);
    });

    const percentValue = (totalSize / MAX_SIZE) * 100;
    const percentString = parseFloat(percentValue).toFixed(0);

    let totalSizeString = bytes(totalSize);
    let totalGzipString = bytes(totalGzipSize);

    let markdownWarning = ``;
    if (percentValue >= 90) {
      const markdownMoji = percentValue >= 95 ? '☠️' : '⚠️';
      markdownWarning = oneLine`
      <h3 align="center">${markdownMoji} WARNING ${markdownMoji}</h3>
      <p align="center">
        We are using <strong>${percentValue}%</strong> of our max size budget.
      </p>
      `;
    }

    const failPR = totalSize >= MAX_SIZE;

    const markdownLog = `${markdownWarning}\n\n`+
      `**Total Size:**                   ${totalSizeString}\n` +
      `**Percentage of Size Used:**      ${percentString}%\n\n` +
      `**Gzipped:**                      ${totalGzipString}`;
    const prettyLog =
      `Total Size:                   ${totalSizeString}\n` +
      `**Percentage of Size Used:**  ${percentString}%\n\n` +
      `Gzipped:                      ${totalGzipString}`;
    return Promise.resolve({
      prettyLog,
      markdownLog,
      failPR,
    });
  }
}

module.exports = AggregateSizePlugin;
