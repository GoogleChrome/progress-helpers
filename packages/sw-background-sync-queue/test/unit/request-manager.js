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
/* global chai, goog */

'use strict';

describe('request-manager test', () => {
	const callbacks = {
		onResponse: function() {
		},
	};

	let queue;
	let reqManager;

	before( (done) => {
		const QUEUE_NAME = 'QUEUE_NAME';
		const MAX_AGE = 6;
		queue =
			new goog.backgroundSyncQueue.test.RequestQueue({
				config: {maxAge: MAX_AGE},
				queueName: QUEUE_NAME,
			});
		reqManager = new goog.backgroundSyncQueue.test.RequestManager({
			callbacks,
			queue,
		});
		done();
	});

  it('check constructor', () => {
		chai.assert.isObject(reqManager);
		chai.assert.isFunction(reqManager.attachSyncHandler);
		chai.assert.isFunction(reqManager.replayRequests);
		chai.assert.equal(reqManager._globalCallbacks, callbacks);
		chai.assert.equal(reqManager._queue, queue);
  });

	it('check replay', () => {
		// TODO: check replay
  });
});
