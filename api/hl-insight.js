export default async function handler(req, res) {
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

Sé claro, profundo y humano.
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

    const text = data.output[0].content[0].text;

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
    return res.status(500).json({ error: err.message });
  }
}
