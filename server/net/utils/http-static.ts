import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
} as const;

export function createHttpServer(pubDir = 'public', port = 8080) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    let file = url.pathname === '/' ? '/index.html' : url.pathname;
    file = normalize(file).replace(/^(\.\.[/\\])+/, '');
    let full = join(process.cwd(), pubDir, file);

    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        full = join(full, 'index.html');
      }

      const contentType = MIME[extname(full)] || 'application/octet-stream';
      const stream = createReadStream(full);
      stream.on('open', () => {
        res.writeHead(200, { 'content-type': contentType });
      });
      stream.on('error', () => {
        // File disappeared or cannot be read - return 404 gracefully
        if (!res.headersSent) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        }
        res.end('Not Found');
      });
      stream.pipe(res);
    } catch {
      // statSync failed - file does not exist
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  });

  server.listen(port, () => console.log(`HTTP static on http://localhost:${port}`));

  return server;
}
