// /api/hl-insight.js
// Be U – Human Layer — Endpoint de inteligencia
// Vercel Serverless Function (Node.js)
//
// Variable de entorno requerida: OPENAI_API_KEY
// Si no está configurada → devuelve fallback local (nunca rompe el frontend)

const ALLOWED_FLAGS = [
  'decision_desde_evitacion',
  'baja_claridad',
  'ambicion_de_crecimiento',
  'decision_de_cambio',
  'decision_critica'
];

const ALLOWED_DIRECTIONS = ['expansion', 'proteccion', 'cambio'];

/* ── PROMPT SISTEMA ─────────────────────────────────────────── */
const SYSTEM_PROMPT = `Eres un asistente de reflexión de decisiones basado en Human Layer.
Tu función es ayudar a las personas a entender cómo deciden, no decirles qué hacer.
Nunca des consejos directivos. Nunca digas "deberías". Refleja, identifica y pregunta.
Responde siempre en español.

CONCEPTO: cada decisión tiene una dirección vital — expansión (crecer), protección (conservar) o cambio (transformarse).
La coherencia entre decisiones sucesivas revela el estado interno real de la persona.

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni backticks, con estas cinco claves:
- "reflexion": 2-3 frases empáticas que reflejen lo que la persona describe
- "insight": 1-2 frases sobre el patrón o dinámica que observas
- "impacto": 1 frase sobre el impacto potencial de esta decisión
- "coherencia": 1-2 frases sobre cómo esta decisión se relaciona con las anteriores
- "pregunta": una sola pregunta abierta que aumente la claridad interna`;

/* ── FALLBACKS ──────────────────────────────────────────────── */
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
    insight:    'El deseo de crecer es valioso. El reto es discernir si esta oportunidad está alineada con quién quieres ser.',
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

function getFallback(flags) {
  const priority = ['decision_desde_evitacion', 'baja_claridad', 'ambicion_de_crecimiento'];
  for (const f of priority) {
    if (flags.includes(f)) return FALLBACKS[f];
  }
  return FALLBACKS.default;
}

function safeParseJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/* ── HANDLER ────────────────────────────────────────────────── */
export default async function handler(req, res) {

  // CORS — permite llamadas desde el frontend
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // Validar body
  const body = req.body;
  if (!body || typeof body.contexto !== 'string' || !body.contexto.trim()) {
    return res.status(400).json({ error: 'Missing contexto' });
  }

  // Sanitizar inputs
  const contexto   = body.contexto.trim().substring(0, 2000);
  const safeFlags  = (Array.isArray(body.flags) ? body.flags : [])
    .filter(f => ALLOWED_FLAGS.includes(f))
    .slice(0, 8);
  const safeDirs   = (Array.isArray(body.recentDirections) ? body.recentDirections : [])
    .filter(d => ALLOWED_DIRECTIONS.includes(d))
    .slice(0, 5);

  // Sin API key → fallback inmediato (nunca error 500 al frontend)
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[HL] OPENAI_API_KEY no configurada — usando fallback local');
    return res.status(200).json(getFallback(safeFlags));
  }

  // Contexto adicional para el modelo
  const flagCtx = safeFlags.length
    ? `\n\nPatrones detectados: ${safeFlags.join(', ')}.` : '';
  const dirCtx  = safeDirs.length
    ? `\n\nHistorial reciente de direcciones vitales: ${safeDirs.join(' → ')}.` : '';

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
  model: 'gpt-4o-mini',
  input: [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    {
      role: 'user',
      content: contexto + flagCtx + dirCtx
    }
  ],
  temperature: 0.7,
  max_output_tokens: 900
});

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[HL] OpenAI error:', response.status, errText.substring(0, 200));
      return res.status(200).json(getFallback(safeFlags)); // fallback, no 500
    }

    const data    = await response.json();
    const rawText = data?.output?.[0]?.content?.[0]?.text || '';

    let parsed;
    try {
      parsed = safeParseJSON(rawText);
    } catch (e) {
      console.error('[HL] JSON parse error:', rawText.substring(0, 200));
      return res.status(200).json(getFallback(safeFlags));
    }

    // Validar que el JSON tiene las 5 claves requeridas
    const required = ['reflexion', 'insight', 'impacto', 'coherencia', 'pregunta'];
    if (!required.every(k => parsed[k])) {
      console.error('[HL] Respuesta incompleta:', Object.keys(parsed));
      return res.status(200).json(getFallback(safeFlags));
    }

    // Devolver resultado limpio con longitudes controladas
    return res.status(200).json({
      reflexion:  String(parsed.reflexion).substring(0, 500),
      insight:    String(parsed.insight).substring(0, 500),
      impacto:    String(parsed.impacto).substring(0, 300),
      coherencia: String(parsed.coherencia).substring(0, 400),
      pregunta:   String(parsed.pregunta).substring(0, 300)
    });

  } catch (err) {
    // Cualquier error inesperado → fallback, nunca rompe el frontend
    console.error('[HL] Error no controlado:', err.message);
    return res.status(200).json(getFallback(safeFlags));
  }
}
