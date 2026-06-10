const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  try {
    const { system, messages } = req.body;

    // Конвертируем формат Anthropic → Gemini
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: geminiMessages,
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    // Конвертируем ответ Gemini → формат Anthropic (чтобы не менять frontend)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа';
    res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = handler;
