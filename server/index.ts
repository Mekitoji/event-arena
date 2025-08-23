import { clock } from "./core/clock";
import { attachBroadcaster } from "./net/broadcaster";
import { createWsServer } from "./net/ws-server";
import { startMetricsServer } from "./metrics/metrics";

import './systems/';

// Start metrics endpoint first so it is ready
startMetricsServer();

const wss = createWsServer();
attachBroadcaster(wss);

clock.start();
