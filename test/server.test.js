import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCanonicalLocation,
  getRequestHost,
  isHerokuAppHost,
} from '../server.js';

test('getRequestHost prefers x-forwarded-host and normalizes case', () => {
  const host = getRequestHost({
    headers: {
      'x-forwarded-host': 'HUE360.HEROKUAPP.COM, proxy.example.com',
      host: 'ignored.example.com',
    },
  });

  assert.equal(host, 'hue360.herokuapp.com');
});

test('isHerokuAppHost matches Heroku app host with optional default ports', () => {
  assert.equal(isHerokuAppHost('hue360.herokuapp.com'), true);
  assert.equal(isHerokuAppHost('hue360.herokuapp.com:443'), true);
  assert.equal(isHerokuAppHost('www.hue360.me'), false);
});

test('buildCanonicalLocation keeps path and query on canonical domain', () => {
  const location = buildCanonicalLocation('/palette?mode=triad');

  assert.equal(location, 'https://www.hue360.me/palette?mode=triad');
});
