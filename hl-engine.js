'use strict';

/* ================================================================
   HL ENGINE - Be U Human Layer
   Patron detection, identity, memory. Pure logic, no DOM.
   ================================================================ */

var HLEngine = (function() {

  /* ── STORAGE KEYS ─────────────────────────────────────────── */
  var KEYS = {
    HISTORY:      'beu_history',
    IDENTITY:     'beu_identity',
    COACH_LAST:   'beu_coach_last',
    PATTERN_LAST: 'beu_pattern_last'
  };

  var MAX_HISTORY = 20;

  /* ── FLAG DETECTION ────────────────────────────────────────── */

  /**
   * Analyze raw text and return semantic flags.
   * Each flag represents a detected decision pattern.
   */
  function detectFlags(text) {
    if (!text || typeof text !== 'string') return [];
    var t   = text.toLowerCase();
    var flags = [];

    // Avoidance: deciding from fear or avoidance
    var evitacionWords = ['no quiero','miedo','evitar','huir','escapar','no puedo','imposible','nunca','peor','tengo que','obligado','debo','forzado','atrapado'];
    if (evitacionWords.some(function(w) { return t.indexOf(w) >= 0; })) {
      flags.push('decision_desde_evitacion');
    }

    // Low clarity: confused, blocked
    var claridadWords = ['no se','no sé','confuso','perdido','bloqueo','bloqueado','parece que','tal vez','quizas','quizás','duda','no entiendo','no comprendo','no clear'];
    if (claridadWords.some(function(w) { return t.indexOf(w) >= 0; })) {
      flags.push('baja_claridad');
    }

    // Growth ambition: big dreams, expansion
    var ambicionWords = ['crecer','expandir','lanzar','emprender','ambicion','ambición','nuevo','grande','mejor','oportunidad','potencial','exito','éxito','lograr'];
    if (ambicionWords.some(function(w) { return t.indexOf(w) >= 0; })) {
      flags.push('ambicion_de_crecimiento');
    }

    // High impact detected
    if (text.length > 120) flags.push('decision_critica');

    // Avoidance of not acting
    var costWords = ['si no hago','si no actuo','si no actúo','si no decido','si no cambio','me arrepentire','me arrepentiré'];
    if (costWords.some(function(w) { return t.indexOf(w) >= 0; })) {
      flags.push('costo_de_no_actuar');
    }

    return flags;
  }

  /**
   * Map flags to identity type for a single entry.
   */
  function flagsToIdentity(flags) {
    if (!Array.isArray(flags)) return null;
    if (flags.indexOf('decision_desde_evitacion') >= 0) return 'evitador';
    if (flags.indexOf('ambicion_de_crecimiento')  >= 0) return 'constructor';
    if (flags.indexOf('baja_claridad')            >= 0) return 'protector';
    return null;
  }

  /* ── MEMORY ─────────────────────────────────────────────────── */

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'); }
    catch(e) { return []; }
  }

  function saveEntry(entry) {
    var history = getHistory();
    // Prepend and cap at MAX_HISTORY
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    try { localStorage.setItem(KEYS.HISTORY, JSON.stringify(history)); }
    catch(e) { /* quota exceeded */ }
  }

  function buildEntry(text, flags, insight) {
    return {
      id:        Date.now(),
      text:      text.substring(0, 200),   // truncate for storage
      flags:     flags,
      identity:  flagsToIdentity(flags),
      insight:   insight || null,
      ts:        new Date().toISOString()
    };
  }

  /* ── IDENTITY ────────────────────────────────────────────────── */

  /**
   * Analyze all history to find dominant identity type.
   * Returns { type, count, total, ratio } or null.
   */
  function getDominantIdentity() {
    var history = getHistory();
    if (!history.length) return null;

    var counts = { evitador: 0, protector: 0, constructor: 0 };
    history.forEach(function(e) {
      if (e.identity && counts[e.identity] !== undefined) counts[e.identity]++;
    });

    var entries = Object.keys(counts).map(function(k) { return [k, counts[k]]; });
    entries.sort(function(a, b) { return b[1] - a[1]; });

    var top = entries[0];
    if (top[1] === 0) return null;

    return {
      type:  top[0],
      count: top[1],
      total: history.length,
      ratio: top[1] / history.length
    };
  }

  var IDENTITY_TEXTS = {
    evitador:    'Tiendes a decidir desde el miedo o la evitacion. Tus decisiones suelen ser respuestas a lo que quieres evitar, no hacia lo que quieres construir. No es un defecto -- es informacion.',
    protector:   'Decides desde la proteccion. Antes de avanzar, necesitas sentir que todo esta bajo control. Tu claridad llega lenta, pero cuando llega, es solida.',
    constructor: 'Decides desde la ambicion. Ves oportunidad donde otros ven riesgo. Tu reto no es animarte a actuar -- es elegir bien entre muchas opciones.'
  };

  /* ── PATTERN DETECTION ──────────────────────────────────────── */

  /**
   * Detect if a flag appears repeatedly in recent history.
   * Returns the repeated flag or null.
   */
  function detectRepeatedPattern(currentFlags) {
    var history = getHistory().slice(0, 5); // last 5 entries
    if (!history.length) return null;

    var flagCount = {};
    history.forEach(function(e) {
      (e.flags || []).forEach(function(f) {
        flagCount[f] = (flagCount[f] || 0) + 1;
      });
    });

    // Add current flags
    (currentFlags || []).forEach(function(f) {
      flagCount[f] = (flagCount[f] || 0) + 1;
    });

    // Flag repeated 3+ times is a pattern
    var repeated = Object.keys(flagCount).find(function(k) { return flagCount[k] >= 3; });
    return repeated || null;
  }

  var PATTERN_MESSAGES = {
    'decision_desde_evitacion': 'Estas tomando varias decisiones desde el miedo o la evitacion. Nota este patron -- puede estar limitandote.',
    'baja_claridad':            'Hay una confusion recurrente en tus decisiones. Quiza necesitas mas tiempo o informacion antes de decidir.',
    'ambicion_de_crecimiento':  'Estas en un momento de expansion. Asegurate de que tus decisiones esten alineadas entre si.',
    'decision_critica':         'Llevas tiempo procesando decisiones importantes. Date espacio para descansar entre ellas.',
    'costo_de_no_actuar':       'Percibes que la inaccion tiene un coste alto. Asegurate de que esa presion no acelere una decision que merece calma.'
  };

  /* ── COACH SILENCIOSO ───────────────────────────────────────── */

  var COACH_MESSAGES = [
    'Llevas varios dias reflexionando. Quiza la respuesta ya esta en ti y solo necesita permiso para aparecer.',
    'Las mejores decisiones no siempre se piensan mas. A veces solo se necesita escuchar mejor.',
    'Cada vez que te detienes a reflexionar, estas tomando una micro-decision: la de actuar con conciencia.',
    'No toda confusion es un problema. A veces es la mente organizando algo importante.',
    'La claridad no siempre llega de golpe. Aparece en capas.'
  ];

  function getCoachMessage() {
    var last = parseInt(localStorage.getItem(KEYS.COACH_LAST) || '0', 10);
    var now  = Date.now();
    if (now - last < 86400000) return null; // once per 24h
    localStorage.setItem(KEYS.COACH_LAST, String(now));
    var idx = Math.floor(Math.random() * COACH_MESSAGES.length);
    return COACH_MESSAGES[idx];
  }

  /* ── FALLBACK INSIGHTS ──────────────────────────────────────── */

  var FALLBACKS = {
    'decision_desde_evitacion': {
      reflexion: 'Esta decision parece estar impulsada por algo que quieres evitar mas que por algo que quieres conseguir.',
      insight:   'Cuando decidimos desde el miedo, a veces resolvemos el problema equivocado. Antes de actuar, vale la pena preguntar: que quiero que pase, no solo que quiero evitar.',
      pregunta:  'Si no existiera lo que temes, que elegirías?'
    },
    'baja_claridad': {
      reflexion: 'Hay confusion en como ves esta situacion. Eso es normal -- y es informacion valiosa.',
      insight:   'La confusion no siempre significa que falta informacion. A veces significa que algo mas profundo no esta resuelto.',
      pregunta:  'Que parte de esta decision ya sabes, aunque no te guste la respuesta?'
    },
    'ambicion_de_crecimiento': {
      reflexion: 'Esta decision viene de un impulso de crecer o expandirte. Eso es energizante, y tambien requiere atencion.',
      insight:   'El deseo de crecer es valioso. El reto es discernir si esta oportunidad especifica esta alineada con quien estas tratando de ser.',
      pregunta:  'Si esta decision funciona perfectamente, como afecta el resto de tu vida?'
    },
    'default': {
      reflexion: 'Has traido algo importante a la superficie. El simple hecho de describirlo ya cambia como lo ves.',
      insight:   'A veces las decisiones no necesitan mas analisis. Necesitan mas honestidad sobre lo que realmente quieres.',
      pregunta:  'Si alguien que te conoce bien te viera tomar esta decision, que diría?'
    }
  };

  function getLocalInsight(flags) {
    if (!Array.isArray(flags)) return FALLBACKS['default'];
    var priority = ['decision_desde_evitacion', 'baja_claridad', 'ambicion_de_crecimiento'];
    for (var i = 0; i < priority.length; i++) {
      if (flags.indexOf(priority[i]) >= 0) return FALLBACKS[priority[i]];
    }
    return FALLBACKS['default'];
  }

  /* ── PUBLIC API ─────────────────────────────────────────────── */
  return {
    detectFlags:            detectFlags,
    flagsToIdentity:        flagsToIdentity,
    getDominantIdentity:    getDominantIdentity,
    detectRepeatedPattern:  detectRepeatedPattern,
    getCoachMessage:        getCoachMessage,
    getLocalInsight:        getLocalInsight,
    getHistory:             getHistory,
    saveEntry:              saveEntry,
    buildEntry:             buildEntry,
    IDENTITY_TEXTS:         IDENTITY_TEXTS,
    PATTERN_MESSAGES:       PATTERN_MESSAGES
  };

})();
