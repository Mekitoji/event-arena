#!/usr/bin/env tsx
import { createHttpServer } from '../net/utils/http-static.js';

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
const dir = process.env.DIR || 'client';

createHttpServer(dir, port);

console.log(
  `Static server started on http://localhost:${port}, serving ./${dir}`,
);
