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
import { upsertSession } from './db/repos/sessions';
import { saveAdminConversation } from './db/repos/adminConversations';

async function main(): Promise<http.Server> {
  const dbAvailable = await initDb();
  const store = new SessionStore(newId(10));

  // restore snapshot
  await restoreSession(store);
  if (dbAvailable) await upsertSession(store.session.id, store.session.startedAt);

  const app = createApp(store);
  const server = http.createServer(app);

  const scheduler = new AiScheduler(store, (text, question, mood, force, id) => {
    // emit say to mesa and play
    const io = (server as any).__io;
    if (!io) return;
    io.of('/mesa').emit('say', { id, text, question, mood, force });
    io.of('/play').emit('say', { id, text, question, mood, force });
  }, (pedido, prompt, response, latencyMs, fallback, question, questionId) => {
    const io = (server as any).__io;
    if (question && questionId) {
      const answer = response?.texto ?? response?.text ?? 'La IA no devolvió texto.';
      void saveAdminConversation(store.session.id, {
        id: questionId,
        name: String(prompt?.nombre ?? 'Participante'),
        text: question,
        answer,
        fallback,
        latencyMs,
        at: Date.now(),
      });
    }
    if (!io) return;
    io.of('/admin').emit('admin:prompt', {
      pedido,
      prompt,
      response,
      latencyMs,
      fallback,
      question,
      questionId,
      questionName: prompt?.nombre ?? 'Participante',
      providerStatus: store.session.ai.providerStatus,
    });
  });

  const io = createIo(server, store, scheduler);
  (server as any).__io = io;

  scheduler.start();
  startPersistence(store);
  return server;
}

const server = await main();

// ponytail: una sala en memoria por instancia. Si Vercel abre otra, la mesa y los celulares se parten; Redis si pasa.
if (!process.env.VERCEL) {
  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'server listening');
  });
}

export default server;