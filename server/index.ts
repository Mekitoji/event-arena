import { clock } from "./core/clock";
import { attachBroadcaster } from "./net/broadcaster";
import { createWsServer } from "./net/ws-server";

import './systems/';

const wss = createWsServer();
attachBroadcaster(wss);

clock.start();
