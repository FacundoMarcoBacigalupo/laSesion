# La Sesión · Ouija colectiva en tiempo real

> Una experiencia de ouija donde la sala entera es la mesa. El público entra desde el celular (QR), un proyector muestra el tablero, y un espíritu (IA Gemini) habla tecleando letra por letra. El presentador (director/admin) dispara los momentos clave.

**Stack**: React 18 + Vite + TypeScript + Zustand + Socket.IO + Express + Turso/Supabase + Gemini REST + Three.js + Matter.js

---

## 📍 Rutas Principales de la Aplicación

**Dominio en producción**: [https://lasesion.mythf.site/](https://lasesion.mythf.site/)

| Ruta | Enlace directo | Rol / Destino | Descripción |
| :--- | :--- | :--- | :--- |
| **`/`** *(redirige a `/play`)* | [lasesion.mythf.site/](https://lasesion.mythf.site/) | 📱 **Público (Celulares)** | Entrada de los participantes: colocan su nombre, aceptan el consentimiento, sostienen el vaso 3D, mandan preguntas a la cola, votan, firman pactos y participan en el exorcismo. |
| **`/mesa`** | [lasesion.mythf.site/mesa](https://lasesion.mythf.site/mesa) *(o `?key=clave-del-proyector`)* | 📽️ **Pantalla / Proyector** | El tablero Ouija colectivo gigante con el **código QR** para escanear, letras que se encienden al teclear el espíritu, caldero de ofrendas con física en tiempo real y medidor de exorcismo. |
| **`/admin`** | [lasesion.mythf.site/admin](https://lasesion.mythf.site/admin) *(login en `/admin/login`)* | 🎛️ **Panel del Director / Admin** | El centro de control: monitor de usuarios, control de fases, preguntas rápidas, disparador de víctima, pactos, calibración de IA y contraseña predeterminada (`admin`). |

---

## 🎯 Qué hace

| Mecánica | Descripción |
|----------|-------------|
| **Datos del dispositivo** | Hora, ciudad (zona horaria), idioma, modelo, batería, modo oscuro — sin pedir permisos extra |
| **Vaso 3D** | Todos mantienen el dedo sobre un vaso de vidrio (Three.js con fallback CSS). Si nadie sostiene, el espíritu no responde |
| **Preguntas** | Cola pública + 5 preguntas rápidas del director. El espíritu responde una por latido |
| **Votación** | La sala vota "quién se va". Voto ponderado → sorteo → víctima |
| **Víctima** | Celular vibra + fondo rojo + nombre gigante en proyector |
| **Testamento** | IA genera texto gracioso con datos reales de la víctima y herederos aleatorios |
| **Fantasmas** | Quien oculta pestaña >3s, suelta vaso >4s o se desconecta >5s → fantasma translúcido. Sus preguntas vuelven deformadas |
| **Pacto** | 4 cláusulas absurdas (la 4ª = letra chica). Firma con dedo en canvas, se ve en vivo en proyector. Sin firma → penalidades cada 4.5s |
| **Ofrendas** | 4 tipos (🍕📶💔🔋). Arrastrar/tocar → caen con física (Matter.js) en caldero. Humor del espíritu cambia según puntos |
| **Exorcismo** | Todos sacuden el celular (DeviceMotion + fallback "tocar rápido"). Energía global sube, decae sola. Al 100% → espíritu se va |
| **Director** | Panel en `/admin` con botones para todo: fases, víctima, pacto, exorcismo, ofrendas, humor, IA on/off, purge/export |

---

## 📦 Arquitectura (Monorepo)

```
laSesion/
├── package.json                 # workspaces: shared, server, client
├── tsconfig.base.json           # TS strict, ESNext, Bundler
├── .env.example                 # template de variables
├── .gitignore
├── render.yaml                  # blueprint Render (1 web service)
├── README.md
├── reference/la-sesion.html     # prototipo visual original (no se sirve)
│
├── shared/                      # @sesion/shared — tipos, eventos, schemas, constantes
│   ├── package.json
│   ├── tsconfig.json            # composite: true
│   └── src/
│       ├── index.ts
│       ├── constants.ts         # TODAS las constantes (sección 14 del spec)
│       ├── types.ts             # Session, User, Phase, Mood, OfferKind, etc.
│       ├── events.ts            # nombres de eventos Socket.IO (EV.*)
│       └── schemas.ts           # Zod para validar payloads entrantes
│
├── server/                      # Express + Socket.IO (un proceso)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── scripts/copy-migrations.mjs
│   └── src/
│       ├── index.ts             # bootstrap: env → db → app → socket → listen
│       ├── app.ts               # Express: middlewares, rutas, estáticos
│       ├── config/env.ts        # validación .env con Zod (falla al arrancar si falta crítico)
│       ├── http/
│       │   ├── middleware/      # security (helmet+CSP), rateLimit, auth (JWT), error
│       │   └── routes/          # health, auth, admin, config
│       ├── sockets/
│       │   ├── index.ts         # crea io, 3 namespaces: /play /mesa /admin
│       │   ├── middleware.ts    # auth handshake, rate limit por evento (token bucket), ip
│       │   ├── emit.ts          # helpers: toPlayers, toMesa, toAdmin, toUser
│       │   ├── play.ts          # handlers público: join, hold, visibility, ask, vote, sign, offer, shake
│       │   ├── mesa.ts          # handlers proyector: auth(key), state, say:done
│       │   └── admin.ts         # handlers director: dir:* comandos + admin:state cada 1s
│       ├── domain/              # LÓGICA PURA (sin socket, sin DB) — 100% testeable
│       │   ├── session.ts       # SessionStore: estado en memoria + selectores + snapshot/restore
│       │   ├── users.ts         # createUser, resumeUser (por token)
│       │   ├── hold.ts          # applyHold → holding, holdSince, releasedAt, ghost check
│       │   ├── questions.ts     # enqueueQuestion, deleteQuestion, readRandomQuestion
│       │   ├── votes.ts         # castVote, pickVictim (ponderado w=1+votos)
│       │   ├── ghosts.ts        # distortQuestion, isGhostCandidate
│       │   ├── testament.ts     # buildTestament (víctima + 2 herederos aleatorios)
│       │   ├── pact.ts          # startPact, validatePng, PACT_PENALTY_CYCLE
│       │   ├── offerings.ts     # applyOffering (match bonus, repeat penalty, moodLabel)
│       │   ├── exorcism.ts      # start/stop, applyShake, decayExorcism
│       │   ├── mood.ts          # setMood
│       │   └── phases.ts        # canTransition, transition
│       ├── ai/                  # Capa Gemini (1 llamada compartida por "latido")
│       │   ├── gemini.client.ts # fetch nativo + timeout + 1 retry solo red
│       │   ├── system.prompt.ts # SYS prompt (voseo rioplatense, máx 15 palabras)
│       │   ├── prompt.builder.ts# buildPrompt(session, pedido) → ~3KB JSON
│       │   ├── schemas.ts       # Zod response schemas + geminiResponseSchema
│       │   ├── fallbacks.ts     # plantillas con datos reales (latido, víctima, testamento, pacto, fantasma, ofrenda, exorcismo, despedida)
│       │   ├── circuitBreaker.ts# abre tras 3 fallos → 60s solo fallbacks
│       │   └── scheduler.ts     # latido cada 9s, cola prioridad, RPM limit, min gap, breaker
│       ├── db/                  # libSQL (Turso) / pg (Supabase) — async, no bloqueante
│       │   ├── client.ts        # createClient libsql
│       │   ├── migrate.ts       # aplica migrations/*.sql en orden
│       │   ├── migrations/001_init.sql
│       │   └── repos/           # sessions, users, events, questions, votes, pacts, offerings, ai_logs, snapshots
│       ├── services/
│       │   ├── ip.ts            # extractIp (x-forwarded-for) + maskIp
│       │   ├── moderation.ts    # trim, collapse spaces, strip HTML, max 80, reject URLs, insult filter
│       │   ├── persistence.ts   # snapshot cada 15s + restore al arrancar (<3h)
│       │   └── purge.ts         # borra todo de la sesión actual
│       ├── utils/               # logger (pino), ids (nanoid), time, tokenBucket
│       └── tests/               # 13 tests unitarios (votes, exorcism, pact, ghosts, offerings, moderation)
│
└── client/                      # React 18 + Vite + TypeScript
    ├── package.json
    ├── vite.config.ts           # proxy /api y /socket.io → localhost:3000
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx, App.tsx, router.tsx
        ├── styles/
        │   ├── tokens.css       # variables CSS del HTML original (--a, --r, --bg, --p, --l, --tx, --mu)
        │   ├── global.css       # base styles, .card, .btn, .title, .meter
        │   └── animations.css   # keyframes: hb, sp, sh, bl, fl2
        ├── lib/
        │   ├── socket.ts        # makeSocket(ns) → socket.io-client
        │   ├── mockSocket.ts    # ?demo=1: EventEmitter simple, 4 usuarios fake
        │   ├── api.ts           # fetch tipado a /api
        │   ├── device.ts        # readDevice() → {model, platform, lang, tz, battery, charging, dark, screen, memory, touch}
        │   ├── audio.ts         # WebAudio: beep, playBell, playHeartbeat
        │   ├── haptics.ts       # navigator.vibrate seguro
        │   ├── motion.ts        # requestMotionPermission() (iOS)
        │   ├── typing.ts        # typeOnBoard(text) — letra a letra, ilumina teclado, respeta hands=0
        │   ├── normalize.ts     # nrm() → NFD, quita diacríticos, mayúsculas, Ñ→N
        │   ├── physics.ts       # createCauldron, addBody (Matter.js)
        │   ├── signature.ts     # captureStrokes
        │   ├── contractImage.ts # drawContract(canvas, clauses, name, png) → descarga PNG 600x520
        │   └── qr.ts            # renderQr(canvas, text)
        ├── store/               # Zustand
        │   ├── meStore.ts       # id, token (localStorage), name, ghost, chosen, holding
        │   ├── sessionStore.ts  # phase, hands, total, mood, tension, queueSize, ghosts, pact, offerings, exorcism, say, want
        │   ├── adminStore.ts    # state, prompts[], logs[]
        │   └── uiStore.ts       # tier (high/low), audioActive, lite (persist)
        ├── hooks/
        │   ├── useSocket.ts     # fábrica sockets por namespace
        │   ├── useHold.ts       # hold/start/stop
        │   ├── useDeviceInfo.ts # readDevice al montar
        │   ├── useGhostOnHide.ts# visibilitychange → title "VOLVÉ 👁️" + emit visibility
        │   ├── useShake.ts      # devicemotion → shake{force}, tap fallback
        │   ├── useFullscreen.ts # requestFullscreen
        │   └── usePerformanceTier.ts # mide FPS 2s → tier low/high (WebGL2, deviceMemory)
        ├── pages/
        │   ├── JoinPage.tsx     # / — nombre + consentimiento + device → join → /play
        │   ├── PlayPage.tsx     # /play — 3 tabs (Hold/Ask/Vote) + pantallas según fase (Chosen, Pact, Offerings, Exorcism, Ghosted)
        │   ├── MesaPage.tsx     # /mesa?key= — proyector full: QR, Board, HandsMeter, TensionBar, GhostRow, TypingLine, VictimOverlay, WillOverlay, PactPanel, Cauldron, ExorcismMeter, DirectorBar
        │   ├── AdminLoginPage.tsx
        │   ├── AdminPage.tsx    # dashboard + panel director (Kpis, UsersTable, QueueList, VotesPanel, GhostsPanel, PactsGallery, OfferingsPanel, PromptViewer, AiStatus, DirectorPanel, PhaseControl, DangerZone)
        │   └── NotFoundPage.tsx
        └── components/
            ├── play/            # HoldScreen, CupScene (Three.js), CupFallback (CSS), AskScreen, VoteScreen, ChosenScreen, PactScreen, SignaturePad, OfferingsScreen, OfferingTile, ExorcismScreen, GhostedScreen, ReturnBanner, ConsentNotice
            ├── mesa/            # Board, QrPanel, HandsMeter, TensionBar, GhostRow, PactPanel, Cauldron, ExorcismMeter, DirectorBar
            ├── admin/           # Kpis, UsersTable, QueueList, VotesPanel, GhostsPanel, PactsGallery, OfferingsPanel, PromptViewer, AiStatus, DirectorPanel, PhaseControl, DangerZone
            └── ui/              # Button, Card, Meter
```

---

## ⚙️ Requisitos

- **Node 22+** (usa `fetch` nativo, `crypto.timingSafeEqual`)
- **npm 10+** (workspaces)
- **Cuenta Turso** (libSQL/SQLite) **o Supabase** (Postgres) — plan gratis
- **API Key Google AI Studio** (Gemini) — plan gratis
- **Render** (u otro hosting Node con WebSocket) — plan gratis

---

## 🚀 Setup Local (Desarrollo)

```bash
# 1. Clona / entra a la carpeta
cd C:\Users\user\laSesion

# 2. Variables de entorno
cp .env.example .env
# Edita .env con tus claves reales (ver sección "Variables de entorno")

# 3. Instala dependencias (workspaces)
npm install

# 4. Migra la base de datos local (SQLite file:./dev.db)
npm run db:migrate

# 5. Levanta todo en desarrollo (concurrently server + client)
npm run dev
```

**Resultado:**
- Frontend: `http://localhost:5173` (Vite HMR)
- Backend:  `http://localhost:3000` (Express + Socket.IO)
- Health:   `http://localhost:3000/health`

---

## 🔐 Variables de Entorno (`.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NODE_ENV` | No | `development` \| `production` \| `test` |
| `PORT` | No | Puerto del servidor (default 3000) |
| `PUBLIC_URL` | **Sí (prod)** | Base del QR. Dev: `http://localhost:5173`. Prod: `https://tu-app.onrender.com` |
| `TRUST_PROXY` | No | `1` detrás de proxy (Render, Nginx) para IP real |
| `ADMIN_PASSWORD` | **Sí** | Contraseña admin. Comparada con `crypto.timingSafeEqual` |
| `JWT_SECRET` | **Sí** | Secreto firma cookie admin (httpOnly, Secure, SameSite=Lax, 12h) |
| `MESA_KEY` | **Sí** | Clave query `?key=` para acceder a `/mesa` |
| `GEMINI_API_KEY` | **Sí (prod)** | **Solo backend**. Nunca en cliente. De Google AI Studio |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` (verificar en docs actuales) |
| `AI_ENABLED` | No | `true`/`false` — permite apagar IA y usar solo fallbacks |
| `AI_HEARTBEAT_MS` | No | Latido IA cada N ms (default 9000) |
| `AI_MIN_GAP_MS` | No | Gap mínimo entre llamadas IA (default 2500) |
| `AI_MAX_RPM` | No | Límite global llamadas/min (ventana deslizante, default 12) |
| `AI_TIMEOUT_MS` | No | Timeout fetch Gemini (default 7000) |
| `DATABASE_URL` | **Sí** | `libsql://xxx.turso.io` o `file:./dev.db` local |
| `DATABASE_AUTH_TOKEN` | Si Turso | Token de autenticación Turso |
| `RETENTION_HOURS` | No | Horas retención datos (default 24) |
| `LOG_LEVEL` | No | `debug`\|`info`\|`warn`\|`error` (default info) |

> **Seguridad**: Ningún secreto llega al cliente. Solo variables `VITE_*` serían públicas (ninguna se usa).

---

## 🗄️ Base de Datos

### Turso (recomendado, SQLite edge)

```bash
# Instala CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Crea BD
turso db create la-sesion
turso db show la-sesion --url --token

# Copia URL y token a .env:
# DATABASE_URL=libsql://la-sesion-xxx.turso.io
# DATABASE_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIs...

# Migra
npm run db:migrate
```

### Supabase (Postgres)

```bash
# En dashboard Supabase → Settings → Database → Connection string (URI)
# DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
# (ajusta tipos en migrations si usas Postgres: SERIAL, TIMESTAMPTZ, etc.)

npm run db:migrate
```

### Tablas creadas (001_init.sql)

```sql
sessions      (id, started_at, ended_at, summary)
users         (id, session_id, name, ip, user_agent, device_json, joined_at, last_seen_at, hidden_count, was_ghost, was_victim, consent)
events        (id, session_id, user_id, type, payload_json, at)
questions     (id, session_id, user_id, text, state, at)
votes         (session_id, voter_id, target_id, at) PK(session_id, voter_id)
pacts         (id, session_id, user_id, clauses_json, penalties, signed_at, signature_png)
offerings     (id, session_id, user_id, kind, points, at)
ai_logs       (id, session_id, pedido, prompt_json, response_json, ok, latency_ms, fallback, at)
snapshots     (session_id, state_json, at)  -- PK session_id
-- Índices: events(session_id, at), questions(session_id, state), ai_logs(session_id, at)
```

**Persistencia**: Escritura async no bloqueante. Si DB falla, la sesión sigue en memoria (log warning). Snapshot cada 15s y al cambiar fase. Al arrancar restaura último snapshot <3h.

---

---

## 🚀 Despliegue en Producción Paso a Paso

Tu arquitectura actual configurada:
- **Frontend**: Hostinger Subdominio (`https://lasesion.mythf.site`)
- **Base de Datos**: Supabase PostgreSQL (`aws-0-us-east-1.pooler.supabase.com:5432`)
- **IA**: DeepSeek (`deepseek-chat`)
- **Backend (Node.js + WebSockets)**: Alojado en **Koyeb** o **Railway** (100% activos 24/7 sin cold start ni dormirse tras inactividad).

---

### 🖥️ Paso 1: Desplegar el Backend en Koyeb (Recomendado Gratis - Sin delay / No se duerme)

**Koyeb** ([koyeb.com](https://www.koyeb.com)) tiene un plan gratuito continuo con soporte nativo de WebSockets y **sin delay de cold start** (a diferencia de Render, que se duerme tras 15 minutos de inactividad).

1. **Crear cuenta**:
   - Entra a [koyeb.com](https://www.koyeb.com) y regístrate con tu GitHub.
2. **Crear la App**:
   - Haz clic en **Create App** (o **Create Service**).
   - Selecciona **GitHub** como origen y elige tu repositorio `FacundoMarcoBacigalupo/laSesion` (rama `main`).
3. **Configuración de Build & Run**:
   - **Build Command**: `npm install && npm run build -w shared && npm run build -w server`
   - **Run Command**: `npm start`
4. **Puertos (Exposed Ports)**:
   - Configura el puerto interno en **`3000`** con protocolo **HTTP** (Koyeb expone HTTPS/WSS automáticamente al exterior).
5. **Variables de Entorno (Environment Variables)**:
   Agrega las variables con los valores reales del proyecto:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `PUBLIC_URL` = `https://lasesion.mythf.site`
   - `TRUST_PROXY` = `1`
   - `ADMIN_PASSWORD` = `admin` *(o tu contraseña preferida para el panel director)*
   - `JWT_SECRET` = `clave-secreta-sesion-2026-halloween-token-seguro`
   - `MESA_KEY` = `clave-del-proyector`
   - `DEEPSEEK_API_KEY` = `sk-f1d493b3a71d4978ac11f107c0dad314`
   - `DEEPSEEK_MODEL` = `deepseek-chat`
   - `DEEPSEEK_BASE_URL` = `https://api.deepseek.com`
   - `AI_ENABLED` = `true`
   - `DATABASE_URL` = `postgresql://postgres.jvvcmwgsneuxtxdpbilq:iZSpluhsdGRTGgF7@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
   - `RETENTION_HOURS` = `24`
   - `LOG_LEVEL` = `info`
6. **Desplegar**:
   - Haz clic en **Deploy**.
   - En 1-2 minutos tendrás tu URL activa sin demoras (ejemplo: `https://la-sesion-[usuario].koyeb.app`).

> **Alternativa sin delay: Railway** ([railway.app](https://railway.app)):
> Si prefieres Railway, conecta el repo de GitHub, añade las mismas variables de entorno y se despliega al instante con créditos gratuitos mensuales renovables.

---

### 🌐 Paso 2: Subir el Frontend a Hostinger

1. Una vez que tengas la URL del backend (ej: `https://la-sesion-[usuario].koyeb.app`):
   - En tu computadora creas el archivo `client/.env.production`:
     ```env
     VITE_API_URL=https://tu-backend.koyeb.app
     ```
   - Compilas en la terminal:
     ```bash
     npm run build -w client
     ```
2. Ve a la carpeta `client/dist`.
3. Sube a Hostinger (en la carpeta `public_html` de tu subdominio `lasesion`):
   - La carpeta **`assets/`**
   - El archivo **`index.html`**
   - El archivo **`.htaccess`** (para que las rutas `/mesa`, `/admin` y `/play` no den 404 al recargar).
   *(Nota: no es necesario subir la carpeta `sounds` ya que el audio se genera por síntesis en tiempo real).*

---

### 🌐 URLs Finales de la Experiencia

- 📱 **Público (Celulares)**: [https://lasesion.mythf.site/](https://lasesion.mythf.site/) *(redirige a `/play`)*
- 📽️ **Proyector / Tablero**: [https://lasesion.mythf.site/mesa](https://lasesion.mythf.site/mesa) (con QR en pantalla)
- 🎛️ **Admin / Director**: [https://lasesion.mythf.site/admin](https://lasesion.mythf.site/admin) (login en `/admin/login`)

---

### 🔑 Paso 0: Obtener la API Key Gratuita de Gemini

1. Entra con tu cuenta de Google a [Google AI Studio](https://aistudio.google.com).
2. En la barra lateral izquierda, haz clic en **"Get API key"** (o en el botón superior **"Create API key"**).
3. Selecciona **"Create API key in new project"** (creará un proyecto de Google Cloud automáticamente sin pedir tarjeta).
4. Copia la clave generada (`AIzaSy...`).
5. **Comprobación rápida (opcional)** con PowerShell o curl:
   ```bash
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=TU_API_KEY" ^
     -H "Content-Type: application/json" ^
     -d "{\"contents\":[{\"parts\":[{\"text\":\"Responde solo: OK\"}]}]}"
   ```
> *Guárdala:* Solo la pondrás en las variables de entorno de tu backend (`GEMINI_API_KEY`). **Nunca** la agregues al frontend ni la subas a GitHub.

---

### 🗄️ Paso 1: Crear la Base de Datos Gratuita

El backend usa `@libsql/client` que soporta SQLite local y Turso en la nube, y también admite PostgreSQL (Supabase).

#### Opción A: Turso (Recomendada - SQLite Edge Gratis)
1. Entra a [turso.tech](https://turso.tech) e inicia sesión con GitHub.
2. Crea una base de datos gratis:
   - Nombre: `la-sesion`
3. En el dashboard obtendrás:
   - **Database URL**: `libsql://la-sesion-[usuario].turso.io`
   - **Auth Token**: Haz clic en *Generate Token* y cópialo.
4. Para migrar las tablas:
   ```bash
   # En tu máquina local, pon temporalmente en tu .env:
   DATABASE_URL=libsql://la-sesion-[usuario].turso.io
   DATABASE_AUTH_TOKEN=tu_token_aqui
   npm run db:migrate
   ```

#### Opción B: Supabase (Postgres Gratis)
1. Entra a [supabase.com](https://supabase.com) y crea un proyecto gratis.
2. En **Project Settings** → **Database**, copia la URI de conexión (`postgresql://postgres:[password]@db...supabase.co:5432/postgres`).
3. Ve a **SQL Editor** en el panel de Supabase y pega el contenido del archivo `server/src/db/migrations/001_init.sql` para crear las tablas en un solo clic.

---

### 🖥️ Paso 2: Desplegar el Backend (Node.js + WebSockets)

El backend requiere un entorno persistente para mantener las conexiones de Socket.IO.

#### Opción 1: Render (Free Web Service)
1. Haz un push de tu repositorio a GitHub.
2. Entra a [render.com](https://render.com) e inicia sesión con GitHub.
3. Haz clic en **New +** → **Web Service**.
4. Conecta tu repositorio `laSesion`.
5. Configura:
   - **Root Directory**: Deja vacío (o `.` para usar la raíz).
   - **Environment**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. En **Environment Variables**, añade:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `PUBLIC_URL`: La URL de tu Frontend (ej. `https://tu-proyecto.vercel.app`)
   - `TRUST_PROXY`: `1`
   - `ADMIN_PASSWORD`: `admin` (o tu clave deseada)
   - `JWT_SECRET`: una cadena larga aleatoria (ej. `clave-secreta-sesion-2026-halloween`)
   - `MESA_KEY`: `clave-del-proyector`
   - `GEMINI_API_KEY`: Tu API key copiada de Google AI Studio.
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `DATABASE_URL`: Tu URL de Turso o Supabase.
   - `DATABASE_AUTH_TOKEN`: Tu token de Turso (si usas Turso).
7. Haz clic en **Create Web Service**.
8. **Evitar que se duerma en el evento (Render Free Cold Start):**
   - Agrega un monitor gratuito en [UptimeRobot.com](https://uptimerobot.com) que haga ping cada 5 minutos a `https://tu-backend.onrender.com/health`.

#### Opción 2: Koyeb o Railway (Alternativa más rápida / sin lag de inicio)
- **Koyeb** ([koyeb.com](https://koyeb.com)): Ofrece un servicio gratuito muy rápido con soporte nativo de WebSockets y despliegue directo desde GitHub.
  - Build command: `npm ci && npm run build`
  - Run command: `npm start`
  - Variables: Mismas que en Render.
- **Railway** ([railway.app](https://railway.app)): Despliegue en 1 clic desde GitHub sin cold-starts; incluye $5 de crédito mensual gratuito renovable.

---

### ⚡ Paso 3: Desplegar el Frontend en Vercel

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. Haz clic en **Add New...** → **Project**.
3. Importa tu repositorio `laSesion`.
4. En **Project Settings**:
   - **Framework Preset**: Selecciona **Vite**.
   - **Root Directory**: Haz clic en Edit y selecciona la carpeta **`client`**.
   - **Build and Output Settings**:
     - Build Command: `npm run build`
     - Output Directory: `dist`
5. **Configurar la conexión al Backend**:
   Crea o añade en la raíz de la carpeta `client` un archivo `vercel.json` para redirigir las llamadas de `/api` y WebSockets hacia tu backend en Render/Koyeb:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://tu-backend.onrender.com/api/$1" },
       { "source": "/socket.io/(.*)", "destination": "https://tu-backend.onrender.com/socket.io/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   *(Reemplaza `https://tu-backend.onrender.com` por la URL real asignada a tu backend)*.
6. Haz clic en **Deploy**. ¡En menos de un minuto tu frontend estará online con SSL gratis!

---

### 🌐 URLs Finales para el Evento

Una vez desplegado:
1. **Público (Celulares)**: `https://tu-proyecto.vercel.app/`
2. **Proyector / Tablero**: `https://tu-proyecto.vercel.app/mesa?key=clave-del-proyector` (muestra el QR para que los invitados escaneen).
3. **Admin / Director**: `https://tu-proyecto.vercel.app/admin` (ingresa con contraseña `admin`).

---

---

## 🎮 Flujo de Uso (Noche del evento)

### 1. Preparación (15 min antes)
- Despierta Render (ping `/health`)
- Abre proyector en `/mesa?key=TU_MESA_KEY` (pantalla completa, 16:9)
- Verifica QR grande visible

### 2. Público entra
- Escanean QR → `/` → Nombre (máx 24) + ✅ Consentimiento → `/play`
- En `/play`: 3 tabs inferior (Hold / Ask / Vote) según fase

### 3. Director (tú) en `/admin`
- `/admin/login` → contraseña → Dashboard + Panel Director
- **KPIs en vivo**: conectados, sosteniendo, cola, fantasmas, fase, humor, exorcismo, IA
- **Tabla usuarios**: nombre, modelo, IP completa (botón mostrar/ocultar), batería, estado (✋/👁️/👻/🩸), kick
- **Botones director**:
  - 5 Preguntas rápidas (P0–P4)
  - "Leer de la cola" (aleatoria + efecto "no volvió")
  - "Elegir víctima" (auto ponderado o forzar ID)
  - Testamento, Pacto, Fantasma, Ofenda, Exorcismo ON/OFF
  - Cambio fase (LOBBY→SESSION→VOTING→VICTIM→PACT→EXORCISM→END)
  - Cambio humor, Texto libre (dir:say), Toggle IA, Purge/Export

### 4. Secuencia típica (7 min)

| Tiempo | Acción |
|--------|--------|
| 0:00–1:00 | QR en proyector, gente entra, nombres aparecen |
| 1:00–4:00 | Espíritu suelta datos, sala sostiene vaso, preguntas, votos, ofrendas. Alguien suelta → se enoja |
| 4:00–6:00 | Cierran votos → "Uno de ustedes tiene que irse" → Víctima vibra/rojo, nombre gigante |
| 6:00–7:00 | Testamento (tecleado), Pacto (firma + penalidades), Exorcismo colectivo (sacuden), Espíritu se va |
| Final | Revelación truco (datos navegador), Export JSON, Purge, Cierre con humor |

---

## 🧪 Modo Demo / Plan B (Obligatorio)

```bash
# En cualquier ruta:
?demo=1    # Socket falso, 4 usuarios simulados, IA con fallbacks, sin backend
?lite=1    # Desactiva Three.js + Bloom (rendimiento)
?demo=1&lite=1
```

- Funciona **sin WiFi**, **sin backend**, **sin BD**
- 4 usuarios fake: Lucía (Pixel 8, 23%), Tomás (iPhone), Vale (Galaxy A54, 61%), Nico (Moto G, 8%)
- Mismo flujo completo: join → hold → ask → vote → victim → pact → offering → exorcism → end
- **BroadcastChannel** para sincronizar `/play` y `/mesa` en pestañas distintas
- **Grabar video** de una sesión demo como respaldo absoluto

---

## 🧪 Tests

```bash
npm test
```

**Unitarios (server/tests/*.test.ts — vitest):**
- `votes.test.ts` — pickVictim (pesos, exclusiones, 1 usuario, RNG inyectado)
- `exorcism.test.ts` — decay, ganancia shakers, tope 100, victoria
- `pact.test.ts` — penalidades hasta firmar, validación PNG
- `ghosts.test.ts` — reglas + distorsión
- `offerings.test.ts` — puntos, repeat, mood
- `moderation.test.ts` — límites, URLs, HTML

**Integración**: Dos clientes socket.io de prueba ejecutan flujo completo (join→hold→ask→vote→victim→pact→offer→exorcism→end) con IA mockeada.

**Carga**: Script simula 60 usuarios (hold + shake + offer) mide latencia eventos y RPM IA (nunca > AI_MAX_RPM).

---

## 📱 Checklist Aceptación Manual (3 navegadores + 1 celular real)

- [ ] QR abre `/`, entra con consentimiento, aparece en `/mesa` y `/admin`
- [ ] Sostener vaso sube "Manos" en `/mesa`; soltar baja y espíritu se enoja
- [ ] Sin manos el espíritu no responde preguntas ("Sin manos en la mesa no respondo...")
- [ ] Cada respuesta se teclea letra a letra con luces en teclado, rápido (55ms/letra)
- [ ] Preguntas del público llegan a cola admin; "Leer de la cola" funciona
- [ ] Votos suben en vivo; pickVictim respeta pesos; celular elegido vibra/rojo
- [ ] Testamento se teclea y aparece en celular del elegido
- [ ] Cerrar/ocultar pestaña 3s → fantasma en `/mesa`; volver → desaparece
- [ ] Pacto: firma se ve en vivo en `/mesa`; sin firma suben penalidades; firmado se guarda en admin y descarga PNG
- [ ] Ofrendas caen con física; humor cambia; ofensa tras 3 repetidas
- [ ] Exorcismo: iPhone pide permiso; botón alternativo funciona; barra decae sola; al 100% espíritu se va
- [ ] Apagar `GEMINI_API_KEY`: todo sigue funcionando con fallbacks
- [ ] Reiniciar servidor: celulares reconectan y restauran sesión (token localStorage)
- [ ] `/admin` sin login redirige; `/mesa` sin key no abre
- [ ] Lighthouse móvil `/play`: carga inicial < 3s en 4G

---

## 🔒 Seguridad y Privacidad

- **Helmet + CSP**: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' wss: ws:; media-src 'self' blob:; worker-src 'self' blob:`
- **Admin Auth**: `ADMIN_PASSWORD` + `timingSafeEqual` → JWT (12h) en cookie httpOnly, SameSite=Lax, Secure (prod)
- **Rate Limit**: Login 5/min/IP. Socket events: hold 20/s, ask 1/5s, vote 1, offer 3/s, shake 10/s, sign:stroke 25/s, join 3/min/IP
- **Validación**: Todo payload pasa Zod; textos por `moderation.ts`; PNG validado (prefijo + ≤200KB)
- **Confianza cero cliente**: Puntos, energía, víctima, penalidades **solo servidor**
- **Privacidad**: Consentimiento explícito al entrar. IP/device solo en `/admin`. A Gemini: solo nombre, modelo, batería, ciudad, idioma, estado. Retención `RETENTION_HOURS` + purge manual. Ley 25.326 Argentina: informar, minimizar, borrar.
- **Contenido**: SYS prohíbe temas graves; salida IA filtrada con misma lista `moderation.ts`

---

## ⚡ Rendimiento y Confiabilidad

- **Render Free Cold Start**: `/health` ligero + monitor externo 5 min
- **Reconexión**: Token en localStorage → `join` con `resumeToken` restituye usuario (no duplica). Gracia 5s antes de marcar fantasma
- **Disco efímero**: No SQLite en disco Render. Usar Turso/Supabase. Si DB cae → sesión sigue en memoria
- **Emisiones**: Agrupadas y limitadas (hands/tension/energy máx 10Hz; admin:state 1Hz). Snapshots completos solo conexión + cada 5s
- **Socket.IO**: transports `['websocket','polling']`, pingInterval 20s, pingTimeout 25s, perMessageDeflate false (firmas)
- **Single Process**: Sin cluster. Si escalar → sticky sessions + Redis adapter (fuera de alcance)
- **Client**: Lazy-load Three/R3F/Matter (React.lazy) para carga rápida `/play`; code-split por ruta

---

## 🎨 Personalización Visual

Tokens en `client/src/styles/tokens.css` (copiados del HTML prototipo):

```css
:root{
  --a:#8b6cff;   /* acento violeta */
  --r:#ff3b5c;   /* rojo víctima/alerta */
  --bg:#07040c;  /* fondo base */
  --p:rgba(255,255,255,.04); /* panel bg */
  --l:rgba(255,255,255,.09); /* border */
  --tx:#efeaf7;  /* texto principal */
  --mu:#9d92ad;  /* texto muted */
}
```

**Colores por humor** (se aplican dinámicamente en `/mesa`):
- `calmo` → `#8b6cff`
- `furioso` → `#ff3b5c`
- `hambriento` → `#ff7a00`
- `burlon` → `#2eea8a`

**Accesibilidad mínima**: `prefers-reduced-motion` reduce latidos y vibraciones de pantalla. Botones con `aria-label`. Contraste suficiente.

---

## 📝 Scripts Disponibles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | `concurrently "npm:dev -w server" "npm:dev -w client"` |
| `npm run build` | `build -w shared && build -w client && build -w server` |
| `npm start` | `node server/dist/index.js` (producción) |
| `npm test` | `vitest run` en workspaces |
| `npm run db:migrate` | `migrate -w server` (aplica SQL) |

**Workspaces individuales:**
```bash
npm run dev -w server      # tsx watch src/index.ts
npm run dev -w client      # vite
npm run build -w shared    # tsc -p tsconfig.json
npm run build -w client    # tsc -b && vite build
npm run build -w server    # tsc + copy-migrations
npm test -w server         # vitest run
```

---

## 🐛 Troubleshooting Común

| Problema | Solución |
|----------|----------|
| `__dirname is not defined` | Usar `fileURLToPath(import.meta.url)` en ESM (ya fix en app.ts, migrate.ts, copy-migrations.mjs) |
| `require is not defined` | Usar `fs.existsSync` en vez de `require('fs').existsSync` (ya fix en app.ts) |
| `EventEmitter not exported` | `mockSocket.ts` usa `SimpleEmitter` propio (ya fix) |
| Three.js chunk >500KB | Ya code-split con `React.lazy` en `PlayPage.tsx` (CupSceneLazy) |
| DB "no such table" | Ejecutar `npm run db:migrate` contra la BD correcta |
| Socket no conecta en prod | Verificar `PUBLIC_URL` HTTPS, `TRUST_PROXY=1`, CORS origin, Render permite WebSocket |
| IA no responde | Verificar `GEMINI_API_KEY`, logs en `/admin` → PromptViewer, forzar fallbacks (botón "Forzar fallbacks") |
| iPhone no vibra / no DeviceMotion | `navigator.vibrate` no existe en iOS → compensar con pantalla roja + sonido. `DeviceMotionEvent.requestPermission()` requiere HTTPS + user gesture (botón "Activar sensor") |

---

## 📄 Licencia

Proyecto bizarro para **SideQuest Halloween Party** 🎃. No es una startup. Código abierto para aprender y reusar. Haz lo que quieras, pero si lo usas en público, invita una pizza 🍕.

---

## 🙋 Créditos y Referencias

- **Prototipo visual**: `reference/la-sesion.html` (HTML único con CSS 3D vaso, Matter.js caldero, todo simulado)
- **Spec técnico**: Este README + `la-sesion-spec.txt` (fuente de verdad arquitectura)
- **Librerías clave**: Socket.IO, Three.js/@react-three/fiber/drei/postprocessing, Matter.js, Zustand, Zod, Pino, libSQL, Gemini REST
- **Inspiración**: Ouija colectiva, Jackbox Games, experiencias inmersivas de terror ligero

---

## 📞 Soporte

Si algo falla en la noche del evento:
1. **Modo Demo**: `?demo=1` en todas las pantallas (funciona offline)
2. **Forzar fallbacks**: Botón en `/admin` → "Forzar fallbacks" (apaga IA)
3. **Reiniciar server**: `npm start` → clientes reconectan solos (token localStorage)
4. **Exportar + Purge**: En `/admin` → Danger Zone → Exportar JSON → Purgar todo

**¡Que el espíritu los acompañe!** 👻🕯️