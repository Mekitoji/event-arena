import { clock } from './core/clock';
import { attachBroadcaster } from './net/broadcaster';
import { createWsServer } from './net/ws-server';
import { createHttpServer } from './net/http-server';

import './systems';

// Create HTTP server (also serves Journal API/UI)
const httpServer = createHttpServer({ enableJournalUi: true });
// Attach WebSocket server to the same HTTP server
const wss = createWsServer(httpServer);
attachBroadcaster(wss);

clock.start();
