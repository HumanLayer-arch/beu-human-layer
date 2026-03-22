export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contexto } = req.body;

    const prompt = `
Eres un sistema de reflexión humana basado en Human Layer.

Analiza esta decisión:
"${contexto}"

Devuelve SOLO JSON:
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
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();
    const text = data.output?.[0]?.content?.[0]?.text || "";

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

    res.status(200).json(parsed);

  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
}
