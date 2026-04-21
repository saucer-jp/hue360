import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from 'serve-handler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const HEROKU_HOST = 'hue360.herokuapp.com';
const CANONICAL_ORIGIN = 'https://www.hue360.me';

export function getRequestHost(request) {
  const forwardedHost = request.headers['x-forwarded-host'];

  if (typeof forwardedHost === 'string' && forwardedHost.length > 0) {
    return forwardedHost.split(',')[0].trim().toLowerCase();
  }

  if (typeof request.headers.host === 'string' && request.headers.host.length > 0) {
    return request.headers.host.toLowerCase();
  }

  return '';
}

export function isHerokuAppHost(host) {
  return host === HEROKU_HOST || host === `${HEROKU_HOST}:80` || host === `${HEROKU_HOST}:443`;
}

export function buildCanonicalLocation(requestUrl = '/') {
  return new URL(requestUrl, CANONICAL_ORIGIN).toString();
}

export function createAppServer() {
  return createServer((request, response) => {
    const host = getRequestHost(request);

    if (isHerokuAppHost(host)) {
      response.writeHead(308, {
        Location: buildCanonicalLocation(request.url),
        'Cache-Control': 'public, max-age=3600',
      });
      response.end();
      return;
    }

    handler(request, response, {
      public: DIST_DIR,
      rewrites: [{ source: '**', destination: '/index.html' }],
    });
  });
}

export function startServer(port = Number(process.env.PORT) || 3000) {
  const server = createAppServer();
  server.listen(port, '0.0.0.0');
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
