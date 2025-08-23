import http from 'http';
import client, { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { eventBus } from '../core/event-bus';
import { World } from '../core/world';
import { TickPostEvent } from '../events';
import { monitorEventLoopDelay } from 'node:perf_hooks';

// Single shared registry so Grafana/Prometheus sees all metrics together
const register = new Registry();

// Enable default Node.js process metrics (CPU, mem, event loop lag, GC, etc.)
client.collectDefaultMetrics({ register, eventLoopMonitoringPrecision: 10 });

// Buckets
const ms = (n: number) => n / 1000;
const tickBuckets = [ms(1), ms(5), ms(10), ms(20), ms(33), ms(50), ms(100), ms(200)];
const wsHandlerBuckets = [ms(0.5), ms(1), ms(2), ms(5), ms(10), ms(20), ms(50)];
const eventLoopLagBuckets = [ms(0.1), ms(0.2), ms(0.5), ms(1), ms(2), ms(5), ms(10)];

// Custom metrics
export const wsConnections = new Gauge({
  name: 'ws_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const wsMessagesTotal = new Counter({
  name: 'ws_messages_total',
  help: 'Total WebSocket messages observed',
  labelNames: ['direction', 'type'] as const,
  registers: [register],
});

export const ticksTotal = new Counter({
  name: 'ticks_total',
  help: 'Total number of server ticks',
  registers: [register],
});

export const tickDurationSeconds = new Histogram({
  name: 'tick_duration_seconds',
  help: 'Observed server tick wall-clock duration (pre->post)',
  buckets: tickBuckets,
  registers: [register],
});

export const lastTickDtSeconds = new Gauge({
  name: 'tick_last_dt_seconds',
  help: 'Delta time (seconds) of the last tick reported by the clock',
  registers: [register],
});

export const playersActive = new Gauge({
  name: 'players_active',
  help: 'Number of active players on the server',
  registers: [register],
});

export const projectilesActive = new Gauge({
  name: 'projectiles_active',
  help: 'Number of active projectiles in the world',
  registers: [register],
});

// Sum of bufferedAmount across all WS clients
export const wsBufferedBytes = new Gauge({
  name: 'ws_send_buffer_bytes',
  help: 'Total buffered bytes pending send across all WS clients',
  registers: [register],
});

export const wsMessageDurationSeconds = new Histogram({
  name: 'ws_message_duration_seconds',
  help: 'Duration of inbound WebSocket message handling per type',
  labelNames: ['type'] as const,
  buckets: wsHandlerBuckets,
  registers: [register],
});

// Convenience helpers to update metrics from other modules
export function incWsIncoming(type: string) {
  wsMessagesTotal.inc({ direction: 'in', type });
}

export function incWsOutgoing(type: string) {
  wsMessagesTotal.inc({ direction: 'out', type });
}

export function setWsConnections(count: number) {
  wsConnections.set(count);
}

export function setWsBufferedBytes(bytes: number) {
  wsBufferedBytes.set(bytes);
}

// Periodically sample gauges that derive from game state
// Extra Node memory gauges for stability in panels
export const nodeHeapUsedBytes = new Gauge({ name: 'node_heap_used_bytes', help: 'process.memoryUsage().heapUsed', registers: [register] });
export const nodeHeapTotalBytes = new Gauge({ name: 'node_heap_total_bytes', help: 'process.memoryUsage().heapTotal', registers: [register] });
export const nodeExternalBytes = new Gauge({ name: 'node_external_bytes', help: 'process.memoryUsage().external', registers: [register] });
export const nodeArrayBuffersBytes = new Gauge({ name: 'node_array_buffers_bytes', help: 'process.memoryUsage().arrayBuffers', registers: [register] });

// Event loop lag histogram using perf_hooks (complements default metrics)
export const eventLoopLagSeconds = new Histogram({
  name: 'event_loop_lag_seconds',
  help: 'Observed event loop lag from perf_hooks monitor',
  buckets: eventLoopLagBuckets,
  registers: [register],
});
const eld = monitorEventLoopDelay({ resolution: 20 });
eld.enable();

function sampleWorldGauges() {
  try {
    playersActive.set(World.players.size);
  } catch {}
  try {
    projectilesActive.set(World.projectiles?.size ?? 0);
  } catch {}
  try {
    const mem = process.memoryUsage();
    nodeHeapUsedBytes.set(mem.heapUsed);
    nodeHeapTotalBytes.set(mem.heapTotal);
    nodeExternalBytes.set((mem as any).external || 0);
    nodeArrayBuffersBytes.set((mem as any).arrayBuffers || 0);
  } catch {}
  try {
    // Observe mean lag since last sample
    const meanSec = Number(eld.mean) / 1e9;
    eventLoopLagSeconds.observe(meanSec);
    eld.reset();
  } catch {}
}

let sampler: NodeJS.Timeout | null = null;

// Hook to tick events for dt and tick count
let tickStartHr: bigint | null = null;
function wireTickListeners() {
  eventBus.on('tick:pre', () => {
    tickStartHr = process.hrtime.bigint();
  });
  eventBus.on('tick:post', (e: TickPostEvent) => {
    ticksTotal.inc();
    if (typeof (e as any).dt === 'number') {
      lastTickDtSeconds.set((e as any).dt as number);
    }
    if (tickStartHr) {
      const durSec = Number((process.hrtime.bigint() - tickStartHr)) / 1e9;
      tickDurationSeconds.observe(durSec);
      tickStartHr = null;
    }
  });
}

export function startMetricsServer(port = Number(process.env.METRICS_PORT || 8082)) {
  if ((globalThis as any).__metricsServerStarted) return; // idempotent
  (globalThis as any).__metricsServerStarted = true;

  wireTickListeners();
  sampleWorldGauges();
  sampler = setInterval(sampleWorldGauges, 5000);

  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url && (req.url === '/metrics' || req.url.startsWith('/metrics?'))) {
      try {
        const metrics = await register.metrics();
        res.statusCode = 200;
        res.setHeader('Content-Type', register.contentType);
        res.end(metrics);
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  // Bind to localhost only for safety in dev
  server.listen(port, '127.0.0.1', () => {
    console.log(`Metrics listening http://127.0.0.1:${port}/metrics`);
  });
}

