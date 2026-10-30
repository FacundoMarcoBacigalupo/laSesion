# La Sesión · Guion de presentación + demo

**Duración total:** 6:30–7:00 min  
**Formato:** 2 minutos de idea + 4:30–5 minutos de demo  
**Personas:** A presenta la experiencia; B explica el producto y opera la demo.

> La demo actual tiene cuatro pasos: **Sostener → Preguntas → Caldero → Pacto**. El exorcismo funciona como cierre posterior, no como uno de los cuatro pasos principales.

## Preparación

- Abrir `/mesa` en el proyector.
- Abrir `/play?demo=1` en uno o varios celulares.
- Tener `/admin` listo, pero no mostrarlo al principio.
- B controla las fases desde el panel de dirección.
- A habla con el público y da las instrucciones de participación.

---

## 0:00–0:45 · Qué es La Sesión

**A:**

> *La Sesión* es una experiencia colectiva en tiempo real. No es una app que cada persona usa por separado: es un ritual compartido entre los celulares del público, una pantalla grande y una persona que dirige la escena.

**B:**

> El público entra desde un QR, participa desde su teléfono y ve el resultado en la mesa proyectada. El sistema coordina todo en tiempo real y el espíritu —una IA con fallbacks— reacciona a lo que está pasando.

**A:**

> La experiencia se organiza en cuatro pasos. Les mostramos el recorrido completo y después lo hacemos en vivo.

**[B muestra la portada o la vista `/mesa`. Cambiar a la slide/parte del deck que presenta la idea.]**

---

## 0:45–1:15 · Cómo participa el público

**B:**

> Hay tres pantallas que trabajan juntas: el celular de cada participante, la mesa que ve toda la sala y el panel del director.

**A:**

> Cada acción individual —sostener, preguntar, ofrendar o firmar— aparece como una consecuencia colectiva en la mesa.

**B:**

> El director controla las fases, pero no necesita actuar cada detalle. El sistema mantiene el estado, sincroniza las acciones y permite que la experiencia siga aunque una llamada de IA falle.

**[Mostrar brevemente `/admin`; volver enseguida a `/mesa`. No explicar código.]**

---

# La demo: cuatro pasos

## 1:15–2:05 · Paso 1 — Sostener

**A, al público:**

> Primer paso: entren al círculo. Escaneen el QR, escriban un nombre y mantengan el dedo sobre el vaso. No lo suelten todavía.

**B, mientras muestra celulares y mesa:**

> El vaso no es solamente una animación. El servidor registra quién está sosteniendo y la mesa muestra cuántas manos siguen activas.

**A:**

> Si alguien suelta, cambia de pestaña o se desconecta durante demasiado tiempo, el sistema lo puede convertir en fantasma. La presencia no solo escucha lo que decimos: también observa cómo participamos.

**B, al público:**

> Miren la mesa. Cuando haya suficientes manos, el ritual avanza.

**[Esperar unos segundos para que el público vea el contador de manos. Si no hay suficientes dispositivos, usar `demo=1` o el control de manos del admin.]**

**Transición de A:**

> Ya estamos dentro. Ahora podemos preguntarle algo.

---

## 2:05–3:05 · Paso 2 — Preguntas

**A, al público:**

> Escriban una pregunta desde el celular. Puede ser seria, absurda o directamente mala idea.

**B:**

> Las preguntas entran en una cola. El director puede leerlas, moderarlas y decidir cuándo hacer avanzar la escena. La IA recibe el contexto de la sesión y responde una sola vez para toda la sala.

**[B activa una pregunta desde la cola o una pregunta rápida del director.]**

**A, leyendo la respuesta en la mesa:**

> La respuesta aparece letra por letra. Eso es importante: no estamos mostrando simplemente un texto generado. Estamos construyendo un momento de espera para toda la sala.

**B:**

> En paralelo, el sistema sabe quién está presente, quién sostiene el vaso, quién se fue y qué preguntas ya aparecieron. La IA improvisa, pero las reglas del ritual están controladas por el servidor.

**A:**

> Cuando termina esta parte, el círculo empieza a reducirse. Ya no alcanza con estar: hay que hacer una ofrenda.

---

## 3:05–4:00 · Paso 3 — Caldero

**B cambia la fase a `cauldron`.**

**A, al público:**

> Paso tres: el caldero. Cada persona recibe opciones de ofrenda: alimento, señal, vínculo o reserva. El espíritu pide una de ellas.

**B:**

> Desde el celular se toca o se arrastra una ofrenda. En la mesa cae al caldero y suma puntos para esa persona. La física y las animaciones hacen visible algo que, en el servidor, es una puntuación compartida.

**A:**

> Si ofrecen lo que pidió, el espíritu se calma. Si repiten demasiado una ofrenda, se ofende. Al final, quien ofrendó menos queda expuesto.

**[B activa 2–3 ofrendas. Mostrar cómo el caldero y los puntajes cambian.]**

**A:**

> Esta es la parte más importante del diseño: una acción muy simple desde el teléfono termina teniendo una consecuencia visible para todos.

**Transición de B:**

> El caldero elige quién queda en pie. Esa persona llega al último paso.

---

## 4:00–4:55 · Paso 4 — Pacto

**B cambia la fase a `pact`.**

**A:**

> Paso cuatro: el pacto. La persona que sobrevivió recibe un contrato generado para esta sesión, con cuatro cláusulas. La última es la letra chica.

**B:**

> Puede firmarlo directamente con el dedo. La firma se transmite y queda visible en la mesa; también se puede descargar como imagen.

**A:**

> Si firma, el círculo queda sellado. Si no firma, el sistema empieza a acumular penalidades. No hace falta explicar demasiado: la interfaz convierte la decisión en una escena.

**[El participante firma. B muestra la firma en `/mesa` y, si hay tiempo, el panel admin.]**

**A:**

> Y desde acá podemos cerrar con un exorcismo: todos sacuden o tocan rápido el teléfono, la energía sube en la mesa y el espíritu se despide.

**[Si la demo está estable, activar 5–10 segundos de exorcismo. Si no, describirlo y pasar al cierre.]**

---

## 4:55–5:35 · Qué hay detrás

**B:**

> Por detrás hay una aplicación web con tres conexiones en tiempo real: participantes, mesa y director. El servidor mantiene el estado de la sesión, valida las acciones y guarda los eventos importantes.

**A:**

> La IA se usa para darle voz al espíritu: respuestas, tono, testamento, pacto y reacción a las ofrendas.

**B:**

> Pero no decide quién queda eliminado ni controla las reglas críticas. Si la IA tarda, entra una respuesta alternativa. Así la experiencia depende de la tecnología para ser rica, pero no depende de ella para funcionar.

---

## 5:35–6:30 · Cierre

**A:**

> Entonces, ¿qué estamos haciendo? Estamos convirtiendo una sala en una experiencia interactiva donde cada persona tiene una acción concreta y cada acción modifica una historia común.

**B:**

> No es un chatbot con una pantalla bonita. Es un sistema de participación en vivo: sostiene, pregunta, ofrenda y firma.

**A:**

> Cuatro pasos simples para que una sala deje de ser público y se convierta en parte de la escena.

**B:**

> Esa es *La Sesión*.

**A, opcional como remate:**

> La pregunta no es si el espíritu existe. La pregunta es quién va a sostener el vaso cuando empiece a responder.

---

## Chuleta de operación para B

1. **Sostener:** abrir mesa, mostrar QR, activar o esperar manos.
2. **Preguntas:** abrir cola, elegir una pregunta, dejar que se escriba en la mesa.
3. **Caldero:** cambiar a `cauldron`, pedir una ofrenda, lanzar 2–3 acciones.
4. **Pacto:** cambiar a `pact`, dejar que el superviviente firme y mostrar la firma.
5. **Cierre opcional:** activar exorcismo y llenar parcialmente la energía.

## Si algo falla durante la demo

- **No conecta un celular:** continuar con el modo demo y decir “la sala ya está conectada; sumemos una mano más”.
- **La IA tarda:** usar una frase fallback preparada: “El espíritu está escribiendo. No sueltes el vaso”.
- **No funciona vibración o movimiento:** usar tocar rápido; es una alternativa prevista.
- **No hay tiempo:** mostrar solo una pregunta, una ofrenda y la firma. Esas tres acciones comunican todo el producto.
