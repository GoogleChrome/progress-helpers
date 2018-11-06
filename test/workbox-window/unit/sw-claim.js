/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

addEventListener('install', () => skipWaiting());
addEventListener('activate', () => clients.claim());
