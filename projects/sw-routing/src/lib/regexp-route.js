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

/** @module sw-routing.RegExpRoute **/

import Route from './route';
import assert from '../../../../lib/assert';

/**
 * RegExpRoute is a helper class to make defining Regular Expression based
 * [Routes]{@link Route} easy.
 *
 * @extends Route
 */
class RegExpRoute extends Route {
  /**
   * @param {RegExp} regExp The regular expression to match against URL's.
   * @param {funcation} handler The handler to manage the response.
   */
  constructor(regExp, handler) {
    assert.isInstance({regExp}, RegExp);
    assert.isType({handler}, 'function');

    const when = ({url}) => url.href.match(regExp);
    super(when, handler, []);
  }
}

export default RegExpRoute;
