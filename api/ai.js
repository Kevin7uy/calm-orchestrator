import fetch from "node-fetch";

const HF_MODELS = [
  { name: "CodeLlama-7B", url: "https://api-inference.huggingface.co/models/codellama/CodeLlama-7b-Instruct-hf" },
  { name: "DeepSeek-Coder-1.3B", url: "https://api-inference.huggingface.co/models/deepseek-ai/deepseek-coder-1.3b-instruct" },
  { name: "Mistral-7B", url: "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2" },
];

const OPENROUTER_MODELS = [
  { name: "Mistral 7B Instruct", model: "mistralai/mistral-7b-instruct" },
  { name: "Llama 3.3 70B", model: "meta-llama/llama-3.3-70b-instruct" },
  { name: "Qwen2.5 Coder 32B", model: "qwen/qwen-2.5-coder-32b-instruct" },
];

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const results = [];

    // --- Hugging Face ---
    for (const model of HF_MODELS) {
      try {
        const response = await fetch(model.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: prompt }),
        });
        const data = await response.json();
        results.push({ model: model.name, output: data });
      } catch (err) {
        results.push({ model: model.name, error: err.message });
      }
    }

    // --- OpenRouter ---
    for (const model of OPENROUTER_MODELS) {
      try {
        const response = await fetch("https://api.openrouter.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model.model,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const data = await response.json();
        results.push({ model: model.name, output: data });
      } catch (err) {
        results.push({ model: model.name, error: err.message });
      }
    }

    // --- Gemini (Google AI Studio) ---
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": process.env.GEMINI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await response.json();
      results.push({ model: "Gemini 2.5 Flash", output: data });
    } catch (err) {
      results.push({ model: "Gemini 2.5 Flash", error: err.message });
    }

    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
