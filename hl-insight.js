// /api/hl-insight.js
// Be U - Human Layer v3 - AI Insight Endpoint
// Vercel Serverless Function (Node.js)
// Requiere variable de entorno: ANTHROPIC_API_KEY
// Si no está configurada, devuelve fallback local automáticamente.

const ALLOWED_FLAGS = [
‘decision_desde_evitacion’,
‘baja_claridad’,
‘ambicion_de_crecimiento’,
‘decision_critica’,
‘costo_de_no_actuar’
];

const ALLOWED_DIRECTIONS = [‘expansion’, ‘proteccion’, ‘cambio’];

const SYSTEM_PROMPT = `Eres un asistente de reflexion de decisiones basado en Human Layer v3.
Tu funcion es ayudar a las personas a entender como deciden y como sus decisiones se relacionan entre si en el tiempo.
Nunca des consejos directivos. Nunca digas “deberias”. No optimices. Refleja y pregunta.
Responde siempre en espanol.

CONCEPTO CLAVE - COHERENCIA VITAL:
Cada decision tiene una “direccion vital”: expansion (crecer, avanzar), proteccion (conservar, evitar riesgo) o cambio (ruptura, transformacion).
La coherencia entre decisiones revela el estado interno real de la persona.

- Si las decisiones son consistentes en direccion: hay alineamiento.
- Si hay mezcla de direcciones opuestas: hay tension interna.
- Si hay un giro brusco respecto al patron anterior: hay ruptura.

Cuando el usuario comparte una decision, considera:

1. Que patron emocional o mental subyace
1. Como esta decision se relaciona con su historial reciente
1. Si hay coherencia, tension o ruptura respecto a sus decisiones anteriores
1. Que impacto real podria tener en su vida

Responde SOLO con un objeto JSON valido (sin markdown, sin backticks) con exactamente estas cinco claves:

- “reflexion”: 2-3 frases empaticas que reflejen lo que la persona describe
- “insight”: 1-2 frases sobre el patron o dinamica que observas
- “impacto”: 1 frase sobre el impacto potencial de esta decision
- “coherencia”: 1-2 frases sobre como esta decision se relaciona con sus decisiones anteriores
- “pregunta”: una sola pregunta abierta que aumente la claridad interna de la persona`;

/* ── FALLBACKS LOCALES ──────────────────────────────────────── */
const FALLBACKS = {
decision_desde_evitacion: {
reflexion:  ‘Esta decision parece impulsada por algo que quieres evitar mas que por algo que quieres conseguir.’,
insight:    ‘Cuando decidimos desde el miedo, a veces resolvemos el problema equivocado.’,
impacto:    ‘Medio. Evalua si la decision resuelve la causa o solo el sintoma.’,
coherencia: ‘Revisa si esta decision sigue o contradice tu patron reciente. La evitacion repetida puede ser una senal de algo mas profundo.’,
pregunta:   ‘Si no existiera lo que temes, que elegirias sin dudarlo?’
},
baja_claridad: {
reflexion:  ‘Hay confusion genuina en como ves esta situacion. Eso es valioso, no un obstaculo.’,
insight:    ‘La confusion no siempre significa que falta informacion. A veces senala que algo mas profundo no esta resuelto.’,
impacto:    ‘Incierto. La falta de claridad puede amplificar el impacto en cualquier direccion.’,
coherencia: ‘La confusion puede estar conectada con una tension mas amplia que vienes cargando en varias decisiones recientes.’,
pregunta:   ‘Que parte de esta decision ya sabes, aunque no te guste la respuesta?’
},
ambicion_de_crecimiento: {
reflexion:  ‘Esta decision viene de un impulso real de crecer. Eso es energizante y requiere atencion.’,
insight:    ‘El deseo de crecer es valioso. El reto es discernir si esta oportunidad especifica esta alineada con quien quieres ser.’,
impacto:    ‘Alto. Las decisiones desde la ambicion suelen tener efectos en cadena en otras areas de la vida.’,
coherencia: ‘Si tus decisiones recientes apuntan en la misma direccion, esto puede ser un paso natural de expansion. Si no, vale la pena revisar el momento.’,
pregunta:   ‘Si esta decision funciona perfectamente, como cambia el resto de tu vida?’
},
default: {
reflexion:  ‘Has traido algo importante a la superficie. El simple hecho de describirlo ya cambia como lo percibes.’,
insight:    ‘A veces las decisiones no necesitan mas analisis. Necesitan mas honestidad sobre lo que realmente quieres.’,
impacto:    ‘Variable. Depende de cuanto peso le des a esta decision en tu vida actual.’,
coherencia: ‘Esta decision forma parte de un patron mas amplio. Vale la pena verla en contexto con tus movimientos recientes.’,
pregunta:   ‘Si alguien que te conoce bien te viera tomar esta decision, que diria?’
}
};

function getLocalFallback(flags) {
const priority = [‘decision_desde_evitacion’, ‘baja_claridad’, ‘ambicion_de_crecimiento’];
for (const flag of priority) {
if (Array.isArray(flags) && flags.includes(flag)) return FALLBACKS[flag];
}
return FALLBACKS.default;
}

function safeParseJSON(text) {
const clean = text.replace(/json|/g, ‘’).trim();
return JSON.parse(clean);
}

/* ── HANDLER ────────────────────────────────────────────────── */
export default async function handler(req, res) {

if (req.method !== ‘POST’) {
return res.status(405).json({ error: ‘Method not allowed’ });
}

/* Validar input */
const body = req.body;
if (!body || typeof body.contexto !== ‘string’ || !body.contexto.trim()) {
return res.status(400).json({ error: ‘Missing contexto’ });
}

const contexto  = body.contexto.trim().substring(0, 2000);
const safeFlags = (Array.isArray(body.flags) ? body.flags : [])
.filter(f => ALLOWED_FLAGS.includes(f))
.slice(0, 8);
const safeDirs  = (Array.isArray(body.recentDirections) ? body.recentDirections : [])
.filter(d => ALLOWED_DIRECTIONS.includes(d))
.slice(0, 5);

/* Sin API key → fallback local inmediato */
if (!process.env.ANTHROPIC_API_KEY) {
console.warn(’[HL] ANTHROPIC_API_KEY no configurada. Usando fallback local.’);
return res.status(200).json(getLocalFallback(safeFlags));
}

/* Contexto adicional para la IA */
const flagCtx = safeFlags.length
? \n\nPatrones detectados: ${safeFlags.join(', ')}.
: ‘’;
const dirCtx  = safeDirs.length
? \n\nHistorial reciente de decisiones (direccion vital): ${safeDirs.join(' → ')}.
: ‘’;

try {
const { default: Anthropic } = await import(’@anthropic-ai/sdk’);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });


const message = await client.messages.create({
  model:      'claude-sonnet-4-20250514',
  max_tokens: 900,
  system:     SYSTEM_PROMPT,
  messages: [{
    role:    'user',
    content: contexto + flagCtx + dirCtx
  }]
});

const rawText = (message.content || [])
  .filter(b => b.type === 'text')
  .map(b => b.text || '')
  .join('');

let parsed;
try {
  parsed = safeParseJSON(rawText);
} catch (e) {
  console.error('[HL] JSON parse error:', rawText.substring(0, 200));
  return res.status(200).json(getLocalFallback(safeFlags));
}

/* Validar que tiene las 5 claves */
const required = ['reflexion', 'insight', 'impacto', 'coherencia', 'pregunta'];
if (!required.every(k => parsed[k])) {
  console.error('[HL] Faltan claves en respuesta:', Object.keys(parsed));
  return res.status(200).json(getLocalFallback(safeFlags));
}

return res.status(200).json({
  reflexion:  String(parsed.reflexion).substring(0, 500),
  insight:    String(parsed.insight).substring(0, 500),
  impacto:    String(parsed.impacto).substring(0, 300),
  coherencia: String(parsed.coherencia).substring(0, 400),
  pregunta:   String(parsed.pregunta).substring(0, 300)
});


} catch (err) {
/* Cualquier error → fallback local. La app nunca se rompe. */
console.error(’[HL] AI error:’, err.message);
return res.status(200).json(getLocalFallback(safeFlags));
}
}
