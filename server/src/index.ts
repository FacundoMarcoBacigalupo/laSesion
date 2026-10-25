import http from 'node:http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { SessionStore } from './domain/session';
import { initDb } from './db/client';
import { createApp } from './app';
import { createIo } from './sockets';
import { AiScheduler } from './ai/scheduler';
import { restoreSession, startPersistence } from './services/persistence';
import { newId } from './utils/ids';

async function main() {
  await initDb();
  const store = new SessionStore(newId(10));

  // restore snapshot
  try { await restoreSession(store); } catch {}

  const app = createApp(store);
  const server = http.createServer(app);

  const scheduler = new AiScheduler(store, (text, question, mood, force, id) => {
    // emit say to mesa and play
    const io = (server as any).__io;
    if (!io) return;
    io.of('/mesa').emit('say', { id, text, question, mood, force });
    io.of('/play').emit('say', { id, text, question, mood, force });
  }, (pedido, prompt, response, latencyMs, fallback) => {
    const io = (server as any).__io;
    if (!io) return;
    io.of('/admin').emit('admin:prompt', { pedido, prompt, response, latencyMs, fallback });
  });

  const io = createIo(server, store, scheduler);
  (server as any).__io = io;

  scheduler.start();
  startPersistence(store);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'server listening');
  });
}

main().catch((e) => { console.error(e); process.exit(1); });