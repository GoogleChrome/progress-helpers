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

/* eslint-env mocha, browser */
/* global workbox */

'use strict';

describe('queue-utils', () => {
  const queueUtils = workbox.backgroundSync.test.QueueUtils;
  const maxAgeTimeStamp = 1000*60*60*24;
  const config = {
    maxAge: maxAgeTimeStamp,
  };

  beforeEach(function() {
    const idbHelper = new workbox.backgroundSync.test.IdbHelper(
      'bgQueueSyncDB', 1, 'QueueStore');
    return idbHelper.getAllKeys()
    .then((keys) => {
      keys.forEach((key) => {
        idbHelper.delete(key);
      });
    });
  });

  it('should be able to convert Request object to a javascript object', () => {
    const request = new Request('http://localhost:3001/__echo/date-with-cors/random');
    return queueUtils.getQueueableRequest({
      request,
      config,
    }).then((reqObj) => {
      expect(reqObj).to.be.an('object');
      expect(reqObj.config).to.be.an('object');
      expect(reqObj.request).to.be.an('object');

      expect(reqObj.config.maxAge).to.equal(maxAgeTimeStamp);
      expect(reqObj.request.url).to.equal(request.url);
      expect(reqObj.request.mode).to.equal(request.mode);
      expect(reqObj.request.method).to.equal(request.method);
      expect(reqObj.request.redirect).to.equal(request.redirect);
    });
  });

  it('should be able to convert a javascript object to Request object', () => {
    const reqObj = {
      'url': 'http://localhost:3001/__echo/date-with-cors/random',
      'headers': '[]',
      'mode': 'cors',
      'method': 'GET',
      'redirect': 'follow',
    };

    return queueUtils.getFetchableRequest({idbRequestObject: reqObj})
      .then( (request) => {
        expect(reqObj.url).to.equal(request.url);
        expect(reqObj.mode).to.equal(request.mode);
        expect(reqObj.method).to.equal(request.method);
        expect(reqObj.redirect).to.equal(request.redirect);
      });
  });
});
