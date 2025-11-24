// api/ai.js
export default async function handler(req, res) {
  try {
    // Check method
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body;

    if (!body || !body.prompt) {
      return res.status(400).json({ error: "Missing 'prompt' in request body" });
    }

    // Example: call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: body.prompt }],
        max_tokens: 500,
      }),
    });

    const data = await openaiResponse.json();

    if (openaiResponse.status !== 200) {
      return res.status(openaiResponse.status).json({ error: data });
    }

    // Respond to FlutterFlow
    return res.status(200).json({ result: data.choices[0].message.content });
  } catch (err) {
    console.error("AI Endpoint Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
