export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contexto, flags, recentDirections } = req.body;

    const prompt = `
Eres un sistema de reflexión profunda basado en Human Layer.

Analiza esta decisión:

"${contexto}"

Flags detectados:
${flags?.join(', ')}

Direcciones recientes:
${recentDirections?.join(', ')}

Responde en JSON con este formato:

{
  "reflexion": "...",
  "insight": "...",
  "impacto": "...",
  "coherencia": "...",
  "pregunta": "..."
}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": Bearer ${process.env.OPENAI_API_KEY},
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5",
        input: prompt
      })
    });

    const data = await response.json();

    console.log("OPENAI RESPONSE:", data);

    const text =
      data?.output?.[0]?.content?.[0]?.text || "No response";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        reflexion: text,
        insight: "",
        impacto: "",
        coherencia: "",
        pregunta: ""
      };
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
