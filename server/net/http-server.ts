import * as http from 'node:http';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { JournalStorage } from '../journal/journal-storage';

export interface HttpServerOptions {
  port?: number;
  enableJournalUi?: boolean;
  journalsDir?: string;
}

export function createHttpServer(options: HttpServerOptions = {}) {
  const port = options.port ?? 8081;
  // Resolve default journals directory with env overrides (kept in sync with JournalSystem)
  const artifactsDir = process.env.EVENT_ARENA_ARTIFACTS_DIR
    ? path.resolve(process.env.EVENT_ARENA_ARTIFACTS_DIR)
    : path.join(process.cwd(), 'artifacts');
  const envJournalsDir = process.env.JOURNALS_DIR
    ? path.resolve(process.env.JOURNALS_DIR)
    : path.join(artifactsDir, 'journals');

  const storage = new JournalStorage({
    baseDir: options.journalsDir ?? envJournalsDir ?? path.join(process.cwd(), 'journals'),
    compress: true,
    // Disable index cache so /api/journals always reflects latest files
    createIndex: false,
  });

  // Initialize storage lazily; don't block server start
  storage.init().catch((e) => console.warn('[HTTP] Journal storage init warning:', e));

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      // CORS for local viewing/testing
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

      // Serve minimal journal UI (optional)
      if (options.enableJournalUi && req.method === 'GET' && (url.pathname === '/journal' || url.pathname === '/journal.html')) {
        const filePath = path.join(process.cwd(), 'client', 'journal.html');
        try {
          const content = await fs.readFile(filePath);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        } catch {
          res.writeHead(404); res.end('journal.html not found');
        }
        return;
      }

      if (options.enableJournalUi && req.method === 'GET' && url.pathname === '/journal.js') {
        const filePath = path.join(process.cwd(), 'client', 'journal.js');
        try {
          const content = await fs.readFile(filePath);
          res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
          res.end(content);
        } catch {
          res.writeHead(404); res.end('// journal.js not found');
        }
        return;
      }

      // API: list journals
      if (req.method === 'GET' && url.pathname === '/api/journals') {
        const list = await storage.list();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(list));
        return;
      }

      // API: get journal by id
      const m = url.pathname.match(/^\/api\/journals\/(.+)$/);
      if (req.method === 'GET' && m) {
        const id = decodeURIComponent(m[1]);
        const journal = await storage.load(id);
        if (!journal) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found' })); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(journal.toJSON()));
        return;
      }

      // Fallback
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });

  server.listen(port, () => {
    console.log(`HTTP available at http://localhost:${port}/journal`);
  });

  return server;
}

