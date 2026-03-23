'use strict';

/* ================================================================
   Be U – Human Layer
   app.js — evolución del original.
   Mantiene: Supabase auth, mismo naming, misma estructura.
   Añade:    Motor HL, llamada a /api/hl-insight, fallback local.
   ================================================================ */

/* ── CONFIG ──────────────────────────────────────────────────────
   Reemplaza con tus valores de Supabase.
   Los encontrarás en: Project Settings → API
   ──────────────────────────────────────────────────────────────── */
const SUPABASE_URL = 'https://sjyidyymmeasjdrwdlsd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CtLe0WxLz2TwdcRVLZ84uA_-soFwz4q';

const HL_ENDPOINT  = '/api/hl-insight';
const HL_TIMEOUT   = 9000; // ms

/* ── CLIENTE SUPABASE ────────────────────────────────────────── */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── ESTADO MÍNIMO ───────────────────────────────────────────── */
let currentUser = null;

/* ── INICIALIZACIÓN ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Recuperar sesión activa al cargar
  const { data: { session } } = await sb.auth.getSession().catch(() => ({ data: {} }));
  if (session?.user) mostrarDashboard(session.user);

  // Escuchar cambios de sesión (login / logout)
  sb.auth.onAuthStateChange((_event, session) => {
    if (session?.user) mostrarDashboard(session.user);
    else               mostrarAuth();
  });
});

/* ================================================================
   AUTH — exactamente igual al original, solo limpiado
   ================================================================ */

function cambiarTab(tab) {
  const esRegistro = tab === 'registro';
  document.getElementById('formRegistro').style.display = esRegistro ? 'block' : 'none';
  document.getElementById('formLogin').style.display    = esRegistro ? 'none'  : 'block';
  document.getElementById('tabRegistro').classList.toggle('activo', esRegistro);
  document.getElementById('tabLogin').classList.toggle('activo',    !esRegistro);
  limpiarMensajes();
}

async function registrar() {
  const nombre   = document.getElementById('regNombre').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!nombre || !email || !password) {
    return mostrarMensaje('msgRegistro', 'error', 'Completa todos los campos.');
  }
  if (password.length < 6) {
    return mostrarMensaje('msgRegistro', 'error', 'La contraseña debe tener al menos 6 caracteres.');
  }

  deshabilitarBtn('btnRegistro', true);

  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { nombre } }
  });

  deshabilitarBtn('btnRegistro', false);

  if (error) return mostrarMensaje('msgRegistro', 'error', traducirError(error.message));
  if (data.user && !data.session) {
    mostrarMensaje('msgRegistro', 'ok', '✓ Cuenta creada. Revisa tu email para confirmar.');
  }
}

async function entrar() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    return mostrarMensaje('msgLogin', 'error', 'Introduce tu email y contraseña.');
  }

  deshabilitarBtn('btnLogin', true);

  const { error } = await sb.auth.signInWithPassword({ email, password });

  deshabilitarBtn('btnLogin', false);

  if (error) mostrarMensaje('msgLogin', 'error', traducirError(error.message));
  // Si no hay error, onAuthStateChange llama a mostrarDashboard
}

async function cerrarSesion() {
  await sb.auth.signOut();
  // onAuthStateChange llama a mostrarAuth
}

/* ── VISTAS ──────────────────────────────────────────────────── */

function mostrarAuth() {
  currentUser = null;
  document.getElementById('panelAuth').style.display      = 'block';
  document.getElementById('panelDashboard').style.display = 'none';
  limpiarMensajes();
}

function mostrarDashboard(user) {
  currentUser = user;
  const nombre = user.user_metadata?.nombre || user.email.split('@')[0];
  const hora   = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

  document.getElementById('txtBienvenida').textContent = `${saludo}, ${nombre}.`;
  document.getElementById('txtEmail').textContent      = user.email;
  document.getElementById('panelAuth').style.display      = 'none';
  document.getElementById('panelDashboard').style.display = 'block';
}

/* ================================================================
   MOTOR HL — capa nueva, integrada limpiamente
   ================================================================ */

/* ── Detección de flags (análisis local del texto) ─────────── */
function detectarFlags(texto) {
  if (!texto || typeof texto !== 'string') return [];
  const t     = texto.toLowerCase();
  const flags = [];

  const evitacion  = ['no quiero','miedo','evitar','huir','escapar','no puedo','obligado','debo','forzado','atrapado'];
  const confusion  = ['no sé','no se','confuso','perdido','bloqueo','bloqueado','tal vez','quizás','quizas','duda','no entiendo'];
  const ambicion   = ['crecer','expandir','lanzar','emprender','oportunidad','potencial','éxito','exito','lograr','proyecto','nuevo negocio'];
  const cambio     = ['cambiar','dejar','empezar de nuevo','reinventarme','romper con','salir de','transformar','giro'];

  if (evitacion.some(w => t.includes(w)))  flags.push('decision_desde_evitacion');
  if (confusion.some(w => t.includes(w)))  flags.push('baja_claridad');
  if (ambicion.some(w => t.includes(w)))   flags.push('ambicion_de_crecimiento');
  if (cambio.some(w => t.includes(w)))     flags.push('decision_de_cambio');
  if (texto.length > 120)                  flags.push('decision_critica');

  return flags;
}

/* ── Dirección de vida ──────────────────────────────────────── */
function detectarDireccion(flags, texto) {
  const t = (texto || '').toLowerCase();
  const cambioW = ['cambiar','dejar','empezar de nuevo','reinventarme','transformar'];
  if (cambioW.some(w => t.includes(w))) return 'cambio';
  if (flags.includes('ambicion_de_crecimiento')) return 'expansion';
  if (flags.includes('decision_desde_evitacion') || flags.includes('baja_claridad')) return 'proteccion';
  return 'proteccion';
}

/* ── Historial local de direcciones (últimas 5) ─────────────── */
function obtenerHistorialDirecciones() {
  try {
    return JSON.parse(localStorage.getItem('beu_directions') || '[]');
  } catch { return []; }
}

function guardarDireccion(dir) {
  try {
    const hist = obtenerHistorialDirecciones();
    hist.unshift(dir);
    localStorage.setItem('beu_directions', JSON.stringify(hist.slice(0, 10)));
  } catch { /* quota */ }
}

/* ── Fallbacks locales (la app nunca se rompe) ─────────────── */
const FALLBACKS = {
  decision_desde_evitacion: {
    reflexion:  'Lo que describes parece motivado por algo que quieres evitar más que por algo que quieres conseguir.',
    insight:    'Cuando decidimos desde el miedo, a veces resolvemos el problema equivocado.',
    impacto:    'Medio. Vale la pena revisar si la decisión resuelve la causa o solo el síntoma.',
    coherencia: 'Revisa si este patrón de evitación aparece en otras decisiones recientes.',
    pregunta:   '¿Si no existiera lo que temes, qué elegirías sin dudarlo?'
  },
  baja_claridad: {
    reflexion:  'Hay confusión genuina en cómo ves esta situación. Eso es información valiosa.',
    insight:    'La confusión no siempre significa que falta información. A veces señala que algo más profundo no está resuelto.',
    impacto:    'Incierto. La falta de claridad puede amplificar el efecto en cualquier dirección.',
    coherencia: 'Esta confusión puede estar conectada con una tensión más amplia que vienes cargando.',
    pregunta:   '¿Qué parte de esta decisión ya sabes, aunque no te guste la respuesta?'
  },
  ambicion_de_crecimiento: {
    reflexion:  'Esta decisión viene de un impulso real de crecer o expandirte.',
    insight:    'El deseo de crecer es valioso. El reto es discernir si esta oportunidad específica está alineada con quién quieres ser.',
    impacto:    'Alto. Las decisiones desde la ambición suelen tener efectos en cadena.',
    coherencia: 'Si tus decisiones recientes apuntan en la misma dirección, esto puede ser un paso natural de expansión.',
    pregunta:   '¿Si esta decisión funciona perfectamente, cómo cambia el resto de tu vida?'
  },
  default: {
    reflexion:  'Has traído algo importante a la superficie. El solo hecho de describirlo ya cambia cómo lo percibes.',
    insight:    'A veces las decisiones no necesitan más análisis. Necesitan más honestidad sobre lo que realmente quieres.',
    impacto:    'Variable. Depende de cuánto peso le das a esta decisión en tu vida actual.',
    coherencia: 'Esta decisión forma parte de un patrón más amplio. Vale la pena verla en contexto.',
    pregunta:   '¿Si alguien que te conoce bien te viera tomar esta decisión, qué diría?'
  }
};

function obtenerFallback(flags) {
  const priority = ['decision_desde_evitacion', 'baja_claridad', 'ambicion_de_crecimiento'];
  for (const f of priority) {
    if (flags.includes(f)) return FALLBACKS[f];
  }
  return FALLBACKS.default;
}

/* ── Llamada a la API ────────────────────────────────────────── */
async function llamarAPI(contexto, flags, recentDirections) {
  const ctrl    = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), HL_TIMEOUT);

  try {
    const res = await fetch(HL_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ contexto, flags, recentDirections }),
      signal:  ctrl.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.reflexion) throw new Error('Respuesta incompleta');
    return data;
  } catch {
    clearTimeout(timeout);
    return null; // null = usar fallback
  }
}

/* ── Flujo principal ─────────────────────────────────────────── */
async function analizarDecision() {
  const texto = document.getElementById('txtDecision').value.trim();
  if (!texto) {
    document.getElementById('txtDecision').focus();
    document.getElementById('txtDecision').style.borderColor = '#c0392b';
    setTimeout(() => {
      document.getElementById('txtDecision').style.borderColor = '';
    }, 1500);
    return;
  }

  // Reset UI
  ocultarResultado();
  mostrarMensaje('msgDashboard', '', '');
  document.getElementById('loading').classList.add('visible');
  document.getElementById('btnAnalizar').disabled = true;

  // Análisis local
  const flags     = detectarFlags(texto);
  const direction = detectarDireccion(flags, texto);
  const historial = obtenerHistorialDirecciones();

  // Llamada a IA
  let resultado = await llamarAPI(texto, flags, historial);

  // Fallback si la API falla
  if (!resultado) resultado = obtenerFallback(flags);

  // Guardar dirección en historial local
  guardarDireccion(direction);

  // Mostrar resultado
  document.getElementById('loading').classList.remove('visible');
  document.getElementById('btnAnalizar').disabled = false;
  renderizarResultado(resultado);
}

/* ── Renderizado seguro (textContent, nunca innerHTML con input) */
function renderizarResultado(r) {
  setTexto('hlReflexion',  r.reflexion  || '');
  setTexto('hlInsight',    r.insight    || '');
  setTexto('hlImpacto',    r.impacto    || '');
  setTexto('hlCoherencia', r.coherencia || '');
  setTexto('hlPregunta',   r.pregunta   || '');
  document.getElementById('resultado').classList.add('visible');
  document.getElementById('resultado').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setTexto(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt; // textContent previene XSS siempre
}

function ocultarResultado() {
  document.getElementById('resultado').classList.remove('visible');
}

function resetearReflexion() {
  document.getElementById('txtDecision').value = '';
  ocultarResultado();
  document.getElementById('txtDecision').focus();
}

/* ================================================================
   HELPERS
   ================================================================ */

function mostrarMensaje(id, tipo, texto) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className   = tipo ? `msg ${tipo}` : 'msg';
}

function limpiarMensajes() {
  ['msgRegistro','msgLogin','msgDashboard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.className = 'msg'; }
  });
}

function deshabilitarBtn(id, estado) {
  const el = document.getElementById(id);
  if (el) el.disabled = estado;
}

function traducirError(msg) {
  const map = {
    'Invalid login credentials':               'Email o contraseña incorrectos.',
    'User already registered':                 'Este email ya está registrado.',
    'Email not confirmed':                     'Confirma tu email antes de entrar.',
    'Password should be at least 6 characters':'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email address':        'El formato del email no es válido.',
  };
  for (const [en, es] of Object.entries(map)) {
    if (msg.includes(en)) return es;
  }
  return msg;
}
