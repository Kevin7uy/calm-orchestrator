// File: /api/calm.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt in request body." });
  }

  // Load all API keys from Vercel environment variables
  const {
    GEMINI_API_KEY,
    HF_API_KEY,
    OR_API_KEY
  } = process.env;

  const missing = [];
  if (!GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!HF_API_KEY) missing.push("HF_API_KEY");
  if (!OR_API_KEY) missing.push("OR_API_KEY");

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing API keys in environment variables.",
      missing
    });
  }

  // Helper functions for each platform
  async function callGemini(prompt) {
    try {
      const response = await fetch(
        "https://api.generative.google/v1/models/gemini-2.5-flash:generateText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GEMINI_API_KEY}`
          },
          body: JSON.stringify({ prompt })
        }
      );
      const data = await response.json();
      return data?.text || "";
    } catch (e) {
      return `Error from Gemini: ${e.message}`;
    }
  }

  async function callHuggingFace(prompt, model) {
    try {
      const response = await fetch(`https://router.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      });
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
      return data?.generated_text || "";
    } catch (e) {
      return `Error from Hugging Face: ${e.message}`;
    }
  }

  async function callOpenRouter(prompt, model) {
    try {
      const response = await fetch(`https://api.openrouter.ai/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OR_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "";
    } catch (e) {
      return `Error from OpenRouter: ${e.message}`;
    }
  }

  // Define your 7 AIs and which models they use
  const tasks = [
    callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"),   // CODELOK
    callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"), // MOBILIS or another
    callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"), // VISUOX or similar
    callOpenRouter(prompt, "mistralai/mistral-7b-instruct"), // GAMEBANE
    callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"), // ARCHITEK
    callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"), // ANIMUS
    callGemini(prompt) // INTEGRO
  ];

  try {
    // Run all 7 AIs in parallel
    const results = await Promise.all(tasks);

    // Combine all responses into a single unified answer
    const combinedAnswer = results.join("\n\n");

    return res.status(200).json({
      answer: combinedAnswer
    });
  } catch (err) {
    return res.status(500).json({ error: "AI fetch failed", details: err.message });
  }
}
