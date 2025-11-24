// File: /api/calm.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt'." });

  // Check environment variables
  const missingVars = ["GEMINI_API_KEY", "HF_API_KEY", "OPENROUTER_API_KEY"].filter(
    (k) => !process.env[k]
  );
  if (missingVars.length > 0) {
    return res.status(500).json({ error: "Missing API keys.", missing: missingVars });
  }

  try {
    // --- Helper functions ---
    async function callGemini(prompt) {
      const key = process.env.GEMINI_API_KEY;
      const response = await fetch(
        "https://api.generative.google/v1/models/gemini-2.5-flash:generateText",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ prompt }),
        }
      );
      const data = await response.json();
      return data?.text || "";
    }

    async function callHuggingFace(prompt, model) {
      const key = process.env.HF_API_KEY;
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt }),
      });
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
      return data?.generated_text || "";
    }

    async function callOpenRouter(prompt, model) {
      const key = process.env.OPENROUTER_API_KEY;
      const response = await fetch("https://api.openrouter.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "";
    }

    // --- Parallel call 7 AIs ---
    const results = await Promise.all([
      callGemini(prompt),
      callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"),
      callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"),
      callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"),
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"),
    ]);

    // Combine all outputs
    const combinedAnswer = results.join("\n\n");

    return res.status(200).json({ success: true, answer: combinedAnswer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
