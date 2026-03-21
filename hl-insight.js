// /api/hl-insight.js
// Be U - Human Layer - AI Insight Endpoint
// Vercel Serverless Function (Node.js)
// Set ANTHROPIC_API_KEY in Vercel environment variables.

const ALLOWED_FLAGS = [
  'decision_desde_evitacion',
  'baja_claridad',
  'ambicion_de_crecimiento',
  'decision_critica',
  'costo_de_no_actuar'
];

const SYSTEM_PROMPT = `Eres un asistente de reflexion de decisiones basado en Human Layer.
Tu funcion es ayudar a las personas a entender como deciden, no decirles que hacer.
Nunca des consejos directivos. Nunca digas "deberias".
Responde SIEMPRE en espanol.
Responde SOLO con un objeto JSON valido (sin markdown, sin backticks) con exactamente estas tres claves:
- "reflexion": 2-3 frases que reflejen lo que la persona describe, con empatia
- "insight": 1-2 frases sobre el patron o dinamica que observas
- "pregunta": una sola pregunta abierta que aumente la claridad interna de la persona`;

// Local fallbacks when AI is unavailable
const FALLBACKS = {
  decision_desde_evitacion: {
    reflexion: 'Lo que describes suena a una decision motivada por algo que quieres evitar, mas que por algo que quieres conseguir.',
    insight:   'Cuando decidimos desde el miedo, a veces resolvemos el problema equivocado.',
    pregunta:  'Si no existiera lo que temes, que elegirias sin dudarlo?'
  },
  baja_claridad: {
    reflexion: 'Hay confusion genuina en como ves esta situacion. Eso es normal, y es informacion.',
    insight:   'La confusion no siempre significa que falta informacion. A veces senala que algo mas profundo no esta resuelto.',
    pregunta:  'Que parte de esta decision ya sabes, aunque no te guste la respuesta?'
  },
  ambicion_de_crecimiento: {
    reflexion: 'Esta decision viene de un impulso real de crecer o expandirte.',
    insight:   'El deseo de crecer es valioso. El reto es discernir si esta oportunidad especifica esta alineada con quien quieres ser.',
    pregunta:  'Si esta decision funciona perfectamente, como cambia el resto de tu vida?'
  },
  default: {
    reflexion: 'Has traido algo importante a la superficie. El simple hecho de describirlo ya cambia como lo percibes.',
    insight:   'A veces las decisiones no necesitan mas analisis. Necesitan mas honestidad sobre lo que realmente quieres.',
    pregunta:  'Si alguien que te conoce bien te viera tomar esta decision, que diria?'
  }
};

function getLocalFallback(flags) {
  const priority = ['decision_desde_evitacion', 'baja_claridad', 'ambicion_de_crecimiento'];
  for (const flag of priority) {
    if (Array.isArray(flags) && flags.includes(flag)) return FALLBACKS[flag];
  }
  return FALLBACKS.default;
}

function parseJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate input
  const body = req.body;
  if (!body || typeof body.contexto !== 'string' || !body.contexto.trim()) {
    return res.status(400).json({ error: 'Missing contexto' });
  }

  const contexto  = body.contexto.trim().substring(0, 2000); // safety cap
  const rawFlags  = Array.isArray(body.flags) ? body.flags : [];
  const safeFlags = rawFlags.filter(f => ALLOWED_FLAGS.includes(f)).slice(0, 8);
  const flagCtx   = safeFlags.length ? `\n\nPatrones detectados: ${safeFlags.join(', ')}.` : '';

  // If no API key configured, return local fallback
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[HL] ANTHROPIC_API_KEY not set - returning local fallback');
    return res.status(200).json(getLocalFallback(safeFlags));
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      system:     SYSTEM_PROMPT,
      messages: [{
        role:    'user',
        content: contexto + flagCtx
      }]
    });

    const rawText = (message.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text || '')
      .join('');

    let parsed;
    try {
      parsed = parseJSON(rawText);
    } catch (e) {
      console.error('[HL] JSON parse failed:', rawText.substring(0, 200));
      return res.status(200).json(getLocalFallback(safeFlags));
    }

    if (!parsed.reflexion || !parsed.insight || !parsed.pregunta) {
      return res.status(200).json(getLocalFallback(safeFlags));
    }

    return res.status(200).json({
      reflexion: String(parsed.reflexion).substring(0, 500),
      insight:   String(parsed.insight).substring(0, 500),
      pregunta:  String(parsed.pregunta).substring(0, 300)
    });

  } catch (err) {
    // Any error -> graceful fallback, never break the app
    console.error('[HL] AI error:', err.message);
    return res.status(200).json(getLocalFallback(safeFlags));
  }
}
