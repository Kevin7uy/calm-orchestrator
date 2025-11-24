export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { prompt, provider } = req.body;

    if (!prompt || !provider) {
      return res.status(400).json({ error: "prompt and provider required" });
    }

    let output = "";

    // === 1️⃣ HuggingFace ===
    if (provider === "hf") {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/gpt2",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
          },
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      const data = await response.json();
      output = data[0]?.generated_text || "No response from HuggingFace.";
    }

    // === 2️⃣ OpenRouter ===
    if (provider === "openrouter") {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      output = data.choices?.[0]?.message?.content || "No response from OpenRouter.";
    }

    // === 3️⃣ Gemini ===
    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: prompt }] }
            ]
          }),
        }
      );

      const data = await response.json();
      output = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
    }

    return res.status(200).json({ output });

  } catch (err) {
    console.error("AI endpoint error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
