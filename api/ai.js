// api/ai.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { provider, model, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // -------------------------------
    //   HUGGINGFACE
    // -------------------------------
    if (provider === "huggingface") {
      const HF_API_KEY = process.env.HF_API_KEY;

      if (!HF_API_KEY) {
        return res.status(500).json({ error: "HF_API_KEY missing" });
      }

      const url = `https://router.huggingface.co/models/${model}`;

      const hfRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 200,
            temperature: 0.7,
          },
        }),
      });

      const data = await hfRes.json();

      console.log("HF RAW:", data);

      let output =
        data?.generated_text ||
        data?.[0]?.generated_text ||
        data?.[0]?.output_text ||
        "[HF ERROR]";

      return res.status(200).json({ output });
    }

    // -------------------------------
    //   OPENROUTER
    // -------------------------------
    if (provider === "openrouter") {
      const OR_KEY = process.env.OPENROUTER_API_KEY;

      if (!OR_KEY) {
        return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });
      }

      const orRes = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OR_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      const data = await orRes.json();

      let output =
        data?.choices?.[0]?.message?.content || "[OpenRouter ERROR]";

      return res.status(200).json({ output });
    }

    // -------------------------------
    //   GOOGLE GEMINI
    // -------------------------------
    if (provider === "google") {
      const GOOGLE_KEY = process.env.GEMINI_API_KEY;

      if (!GOOGLE_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY missing" });
      }

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_KEY}`;

      const gRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await gRes.json();

      let output =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "[Google ERROR]";

      return res.status(200).json({ output });
    }

    return res.status(400).json({ error: "Invalid provider" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: "SERVER FAILED",
      message: err.message,
    });
  }
}
