import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { env } from './config/env';
import { securityMiddleware } from './http/middleware/security';
import { apiLimiter } from './http/middleware/rateLimit';
import { errorHandler } from './http/middleware/error';
import { healthRouter } from './http/routes/health';
import { authRouter } from './http/routes/auth';
import { adminRouter } from './http/routes/admin';
import { configRouter } from './http/routes/config';
import type { SessionStore } from './domain/session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(store: SessionStore) {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(securityMiddleware);
  app.use(compression());
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '300kb' }));

  app.use('/api', apiLimiter);
  app.use(healthRouter(store));
  app.use(authRouter());
  app.use(adminRouter(store));
  app.use(configRouter());

  // serve client dist in production
  const candidates = [
    path.resolve(process.cwd(), 'client', 'dist'),
    path.resolve(process.cwd(), '..', 'client', 'dist'),
    path.resolve(__dirname, '..', '..', 'client', 'dist'),
  ];
  const distDir = candidates.find((dir) => fs.existsSync(dir)) ?? candidates[0]!;
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use(errorHandler);
  return app;
}