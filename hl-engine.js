'use strict';

/* ================================================================
   HL ENGINE v3 - Be U Human Layer
   Sistema de coherencia vital entre decisiones.
   Pure logic. No DOM. No side effects.
   ================================================================ */

var HLEngine = (function () {

  /* ── CLAVES STORAGE ──────────────────────────────────────────── */
  var KEYS = {
    HISTORY:      'beu_history_v3',
    COACH_LAST:   'beu_coach_last',
    PATTERN_LAST: 'beu_pattern_last'
  };

  var MAX_HISTORY = 20;

  /* ================================================================
     1. DETECCIÓN DE FLAGS
     ================================================================ */

  function detectFlags(text) {
    if (!text || typeof text !== 'string') return [];
    var t     = text.toLowerCase();
    var flags = [];

    var evitacion = ['no quiero', 'miedo', 'evitar', 'huir', 'escapar', 'no puedo', 'tengo que', 'obligado', 'debo', 'forzado', 'atrapado', 'no me queda'];
    if (evitacion.some(function (w) { return t.indexOf(w) >= 0; })) flags.push('decision_desde_evitacion');

    var confusion = ['no sé', 'no se', 'confuso', 'perdido', 'bloqueo', 'bloqueado', 'tal vez', 'quizas', 'quizás', 'duda', 'no entiendo', 'no clear', 'no tengo claro'];
    if (confusion.some(function (w) { return t.indexOf(w) >= 0; })) flags.push('baja_claridad');

    var ambicion = ['crecer', 'expandir', 'lanzar', 'emprender', 'ambicion', 'ambición', 'grande', 'oportunidad', 'potencial', 'exito', 'éxito', 'lograr', 'nuevo negocio', 'proyecto'];
    if (ambicion.some(function (w) { return t.indexOf(w) >= 0; })) flags.push('ambicion_de_crecimiento');

    if (text.length > 120) flags.push('decision_critica');

    var costo = ['si no hago', 'si no actuo', 'si no actúo', 'si no decido', 'si no cambio', 'me arrepentiré', 'me arrepentire'];
    if (costo.some(function (w) { return t.indexOf(w) >= 0; })) flags.push('costo_de_no_actuar');

    return flags;
  }

  /* ================================================================
     2. DIRECCIÓN DE VIDA
     ================================================================ */

  /**
   * Clasifica la decision en una dirección vital.
   * @param {string} text - texto de la decision
   * @param {string[]} flags - flags detectados
   * @returns {"expansion"|"proteccion"|"cambio"}
   */
  function detectLifeDirection(text, flags) {
    if (!flags) flags = [];
    var t = (text || '').toLowerCase();

    // Cambio: ruptura, giro, transformación
    var cambioWords = ['cambiar', 'cambio', 'dejar', 'dejarlo', 'dejarlo todo', 'empezar de nuevo', 'empezar desde cero', 'reinventarme', 'reinventar', 'romper con', 'salir de', 'dejarlo todo', 'transformar', 'giro', 'ruptura'];
    if (cambioWords.some(function (w) { return t.indexOf(w) >= 0; })) return 'cambio';

    // Expansión: crecimiento, movimiento hacia fuera
    if (flags.indexOf('ambicion_de_crecimiento') >= 0) return 'expansion';

    // Protección: conservar, evitar riesgo
    if (flags.indexOf('decision_desde_evitacion') >= 0) return 'proteccion';
    if (flags.indexOf('baja_claridad') >= 0) return 'proteccion';

    // Heurística por palabras positivas/expansivas
    var expansionWords = ['oportunidad', 'crecer', 'aprender', 'mejorar', 'avanzar', 'construir', 'desarrollar', 'explorar', 'invertir', 'lanzar'];
    if (expansionWords.some(function (w) { return t.indexOf(w) >= 0; })) return 'expansion';

    return 'proteccion'; // default conservador
  }

  /* ================================================================
     3. IDENTIDAD INDIVIDUAL
     ================================================================ */

  function flagsToIdentity(flags) {
    if (!Array.isArray(flags)) return null;
    if (flags.indexOf('decision_desde_evitacion') >= 0) return 'evitador';
    if (flags.indexOf('ambicion_de_crecimiento')  >= 0) return 'constructor';
    if (flags.indexOf('baja_claridad')            >= 0) return 'protector';
    return null;
  }

  /* ================================================================
     4. COHERENCIA VITAL
     ================================================================ */

  /**
   * Analiza la coherencia entre la decisión actual y el historial.
   * @param {string} currentDirection - dirección de la decisión actual
   * @param {Array}  history - historial de entradas previas
   * @returns {"alineado"|"tension"|"ruptura"}
   */
  function detectLifeCoherence(currentDirection, history) {
    if (!Array.isArray(history) || history.length < 2) return 'alineado';

    var recent = history.slice(0, 5).filter(function (e) { return e.lifeDirection; });
    if (!recent.length) return 'alineado';

    // Contar frecuencia de cada dirección en historial reciente
    var freq = { expansion: 0, proteccion: 0, cambio: 0 };
    recent.forEach(function (e) { if (freq[e.lifeDirection] !== undefined) freq[e.lifeDirection]++; });

    var dominant = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; })[0];
    var dominantCount = freq[dominant];
    var total = recent.length;

    // Ruptura: el historial era muy consistente y ahora cambia completamente
    if (dominantCount >= total * 0.8 && currentDirection !== dominant) return 'ruptura';

    // Alineado: misma dirección o dirección consistente
    if (currentDirection === dominant && dominantCount >= total * 0.6) return 'alineado';

    // Tensión: mezcla sin patrón claro
    return 'tension';
  }

  /* ================================================================
     5. RELACIÓN ENTRE DECISIONES
     ================================================================ */

  /**
   * Detecta la relación dinámica entre la decisión actual y el historial.
   * @returns {"continuidad"|"compensacion"|"contradiccion"}
   */
  function detectDecisionRelationship(currentDirection, history) {
    if (!Array.isArray(history) || history.length < 1) return 'continuidad';

    var recent = history.slice(0, 3).filter(function (e) { return e.lifeDirection; });
    if (!recent.length) return 'continuidad';

    var lastDir = recent[0].lifeDirection;
    var prevDir = recent.length > 1 ? recent[1].lifeDirection : null;

    // Continuidad: misma dirección que la última
    if (currentDirection === lastDir) return 'continuidad';

    // Compensación: alterna entre expansion y protección (decisión equilibradora)
    var opuestos = {
      expansion:  'proteccion',
      proteccion: 'expansion',
      cambio:     'proteccion'
    };
    if (opuestos[currentDirection] === lastDir || opuestos[lastDir] === currentDirection) {
      return 'compensacion';
    }

    // Contradicción: dirección que contradice el patrón reciente con consistencia
    return 'contradiccion';
  }

  /* ================================================================
     6. MENSAJES DE COHERENCIA
     ================================================================ */

  var COHERENCIA_MENSAJES = {
    alineado: {
      continuidad:  'Esta decision sigue la linea que vienes marcando. Hay consistencia en tu direccion.',
      compensacion: 'Tus decisiones recientes muestran equilibrio. Avanzas y luego consolidas.',
      contradiccion: 'Esta decision mantiene tu patron dominante, aunque con una pequeña variacion.'
    },
    tension: {
      continuidad:  'Hay tension en tus decisiones recientes. Distintas fuerzas tirando en direcciones diferentes.',
      compensacion: 'Pareces compensar decisiones anteriores. Puede ser equilibrio sano o evitacion de compromiso.',
      contradiccion: 'Tus decisiones recientes no siguen un patron claro. Vale la pena revisar que quieres priorizar.'
    },
    ruptura: {
      continuidad:  'Introduces un cambio importante respecto a tu patron reciente. Es deliberado o una reaccion?',
      compensacion: 'Hay un giro notable respecto a como venias decidiendo. Algo ha cambiado en ti.',
      contradiccion: 'Esta decision marca una ruptura clara con el camino que traias. Asegurate de que es consciente.'
    }
  };

  function getCoherenciaTexto(coherencia, relationship) {
    var block = COHERENCIA_MENSAJES[coherencia] || COHERENCIA_MENSAJES['alineado'];
    return block[relationship] || block['continuidad'];
  }

  /* ================================================================
     7. IDENTIDAD DOMINANTE (HISTORIAL)
     ================================================================ */

  function getDominantIdentity() {
    var history = getHistory();
    if (!history.length) return null;

    var counts = { evitador: 0, protector: 0, constructor: 0 };
    history.forEach(function (e) {
      if (e.identity && counts[e.identity] !== undefined) counts[e.identity]++;
    });

    var entries = Object.keys(counts).map(function (k) { return [k, counts[k]]; });
    entries.sort(function (a, b) { return b[1] - a[1]; });

    var top = entries[0];
    if (top[1] === 0) return null;

    return { type: top[0], count: top[1], total: history.length, ratio: top[1] / history.length };
  }

  /* ================================================================
     8. DIRECCIÓN DOMINANTE (PARA PANTALLA DIRECCIÓN)
     ================================================================ */

  /**
   * Devuelve estadísticas de direcciones de vida.
   * @returns {{ dominant, percentages, last5 }}
   */
  function getLifeDirectionStats() {
    var history = getHistory();
    if (!history.length) return null;

    var counts = { expansion: 0, proteccion: 0, cambio: 0 };
    history.forEach(function (e) {
      if (e.lifeDirection && counts[e.lifeDirection] !== undefined) counts[e.lifeDirection]++;
    });

    var total   = history.length;
    var entries = Object.keys(counts).map(function (k) { return [k, counts[k]]; });
    entries.sort(function (a, b) { return b[1] - a[1]; });
    var dominant = entries[0][0];

    var percentages = {};
    Object.keys(counts).forEach(function (k) {
      percentages[k] = total > 0 ? Math.round((counts[k] / total) * 100) : 0;
    });

    var last5 = history.slice(0, 5).map(function (e) {
      return { text: e.text, lifeDirection: e.lifeDirection || 'proteccion', ts: e.ts };
    });

    return { dominant: dominant, percentages: percentages, last5: last5, total: total };
  }

  /* ================================================================
     9. TEXTOS DE IDENTIDAD Y DIRECCIÓN
     ================================================================ */

  var IDENTITY_TEXTS = {
    evitador:    'Tiendes a decidir desde el miedo o la evitacion. No es un defecto — es informacion sobre donde esta tu energia ahora.',
    protector:   'Decides desde la proteccion. Antes de avanzar, necesitas sentir seguridad. Tu claridad llega lenta, pero solida.',
    constructor: 'Decides desde la ambicion. Ves oportunidad donde otros ven riesgo. Tu reto es elegir bien entre muchas opciones.'
  };

  var DIRECTION_TEXTS = {
    expansion:  'Tus decisiones recientes apuntan hacia el crecimiento y la expansion. Estas en modo de construccion.',
    proteccion: 'Tus decisiones recientes priorizan la seguridad y la conservacion. Estas en modo de consolidacion.',
    cambio:     'Tus decisiones recientes buscan transformacion y ruptura. Estas en un momento de transicion importante.'
  };

  /* ================================================================
     10. PATRONES REPETIDOS
     ================================================================ */

  function detectRepeatedPattern(currentFlags) {
    var history = getHistory().slice(0, 5);
    if (!history.length) return null;

    var flagCount = {};
    history.forEach(function (e) {
      (e.flags || []).forEach(function (f) { flagCount[f] = (flagCount[f] || 0) + 1; });
    });
    (currentFlags || []).forEach(function (f) { flagCount[f] = (flagCount[f] || 0) + 1; });

    var repeated = Object.keys(flagCount).find(function (k) { return flagCount[k] >= 3; });
    return repeated || null;
  }

  var PATTERN_MESSAGES = {
    'decision_desde_evitacion': 'Varias de tus decisiones recientes vienen de la evitacion. Nota este patron — puede estar limitandote.',
    'baja_claridad':            'Hay confusion recurrente en tus decisiones. Quiza necesitas mas tiempo antes de actuar.',
    'ambicion_de_crecimiento':  'Estas en expansion. Asegurate de que tus decisiones esten alineadas entre si.',
    'decision_critica':         'Llevas tiempo procesando decisiones importantes. Date espacio entre ellas.',
    'costo_de_no_actuar':       'Percibes que la inaccion tiene un coste alto. Asegurate de que esa presion no acelere algo que merece calma.'
  };

  /* ================================================================
     11. COACH SILENCIOSO
     ================================================================ */

  var COACH_MESSAGES = [
    'Llevas varios dias reflexionando. Quiza la respuesta ya esta en ti y solo necesita permiso para aparecer.',
    'Las mejores decisiones no siempre se piensan mas. A veces solo se necesita escuchar mejor.',
    'Cada vez que te detienes a reflexionar, estas eligiendo actuar con conciencia.',
    'No toda confusion es un problema. A veces es la mente organizando algo importante.',
    'La claridad no siempre llega de golpe. Aparece en capas.',
    'Una decision coherente no es la que analistas aprueban. Es la que tu puedes sostener en el tiempo.'
  ];

  function getCoachMessage() {
    var last = parseInt(localStorage.getItem(KEYS.COACH_LAST) || '0', 10);
    if (Date.now() - last < 86400000) return null;
    localStorage.setItem(KEYS.COACH_LAST, String(Date.now()));
    return COACH_MESSAGES[Math.floor(Math.random() * COACH_MESSAGES.length)];
  }

  /* ================================================================
     12. FALLBACKS LOCALES (incluye coherencia)
     ================================================================ */

  var FALLBACKS = {
    decision_desde_evitacion: {
      reflexion: 'Esta decision parece impulsada por algo que quieres evitar mas que por algo que quieres conseguir.',
      insight:   'Cuando decidimos desde el miedo, a veces resolvemos el problema equivocado.',
      impacto:   'Medio. Evalua si la decision resuelve la causa o solo el sintoma.',
      coherencia:'Revisa si esta decision sigue o contradice tu patron reciente de decision.',
      pregunta:  'Si no existiera lo que temes, que elegirias sin dudarlo?'
    },
    baja_claridad: {
      reflexion: 'Hay confusion genuina en como ves esta situacion. Eso es valioso, no un obstaculo.',
      insight:   'La confusion no siempre significa que falta informacion. A veces senala que algo mas profundo no esta resuelto.',
      impacto:   'Incierto. La falta de claridad puede amplificar el impacto en cualquier direccion.',
      coherencia:'Es posible que esta decision este conectada con una tension mas amplia que vienes cargando.',
      pregunta:  'Que parte de esta decision ya sabes, aunque no te guste la respuesta?'
    },
    ambicion_de_crecimiento: {
      reflexion: 'Esta decision viene de un impulso real de crecer. Eso es energizante y requiere atencion.',
      insight:   'El deseo de crecer es valioso. El reto es discernir si esta oportunidad especifica esta alineada con quien quieres ser.',
      impacto:   'Alto. Las decisiones desde la ambicion suelen tener efectos en cadena.',
      coherencia:'Si tus decisiones recientes apuntan en la misma direccion, esto puede ser un paso natural de expansion.',
      pregunta:  'Si esta decision funciona perfectamente, como cambia el resto de tu vida?'
    },
    default: {
      reflexion: 'Has traido algo importante a la superficie. El simple hecho de describirlo ya cambia como lo percibes.',
      insight:   'A veces las decisiones no necesitan mas analisis. Necesitan mas honestidad sobre lo que realmente quieres.',
      impacto:   'Variable. Depende de cuanto peso le des a esta decision en tu vida actual.',
      coherencia:'Esta decision forma parte de un patron mas amplio. Vale la pena verla en contexto.',
      pregunta:  'Si alguien que te conoce bien te viera tomar esta decision, que diria?'
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

  /* ================================================================
     13. MEMORIA
     ================================================================ */

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'); }
    catch (e) { return []; }
  }

  function saveEntry(entry) {
    var history = getHistory();
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    try { localStorage.setItem(KEYS.HISTORY, JSON.stringify(history)); }
    catch (e) { /* quota exceeded */ }
  }

  /**
   * Construye una entrada con todos los metadatos v3.
   */
  function buildEntry(text, flags, insight, lifeDirection, coherence, relationship) {
    return {
      id:           Date.now(),
      text:         text.substring(0, 200),
      flags:        flags || [],
      identity:     flagsToIdentity(flags),
      lifeDirection: lifeDirection || 'proteccion',
      coherence:    coherence    || 'alineado',
      relationship: relationship || 'continuidad',
      insight:      insight || null,
      ts:           new Date().toISOString()
    };
  }

  /* ── PUBLIC API ─────────────────────────────────────────────── */
  return {
    /* Detection */
    detectFlags:               detectFlags,
    detectLifeDirection:       detectLifeDirection,
    detectLifeCoherence:       detectLifeCoherence,
    detectDecisionRelationship:detectDecisionRelationship,
    flagsToIdentity:           flagsToIdentity,
    getCoherenciaTexto:        getCoherenciaTexto,

    /* Analysis */
    getDominantIdentity:       getDominantIdentity,
    getLifeDirectionStats:     getLifeDirectionStats,
    detectRepeatedPattern:     detectRepeatedPattern,
    getCoachMessage:           getCoachMessage,
    getLocalInsight:           getLocalInsight,

    /* Memory */
    getHistory:                getHistory,
    saveEntry:                 saveEntry,
    buildEntry:                buildEntry,

    /* Texts */
    IDENTITY_TEXTS:            IDENTITY_TEXTS,
    DIRECTION_TEXTS:           DIRECTION_TEXTS,
    PATTERN_MESSAGES:          PATTERN_MESSAGES
  };

})();
