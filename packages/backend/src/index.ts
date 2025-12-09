import express from 'express';
import { buildHealthResponse } from './health';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '127.0.0.1';

app.get('/health', (_req, res) => {
  res.json(buildHealthResponse());
});

app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://${host}:${port}`);
});
