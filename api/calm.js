// File: /api/calm.js
import fetch from "node-fetch";

// Helper: Gemini 2.5 Flash (Google AI Studio)
async function callGemini(prompt) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: prompt }] }
          ]
        }),
      }
    );

    const data = await res.json();
    return data?.candidates?.[0]?.content?.[0]?.text || "";
  } catch (err) {
    return `Error from Gemini: ${err.message}`;
  }
}

// Helper: Hugging Face Router API
async function callHuggingFace(prompt, model) {
  try {
    const HF_API_KEY = process.env.HF_API_KEY;
    if (!HF_API_KEY) throw new Error("Missing HF_API_KEY");

    const res = await fetch(`https://router.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await res.json();

    if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
    return data?.generated_text || "";
  } catch (err) {
    return `Error from Hugging Face (${model}): ${err.message}`;
  }
}

// Helper: OpenRouter
async function callOpenRouter(prompt, model) {
  try {
    const OR_API_KEY = process.env.OR_API_KEY;
    if (!OR_API_KEY) throw new Error("Missing OR_API_KEY");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OR_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }]
      }),
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (err) {
    return `Error from OpenRouter (${model}): ${err.message}`;
  }
}

// Main API handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt in request body." });
  }

  try {
    // Call all AIs concurrently with resilience
    const results = await Promise.all([
      callGemini(prompt),
      callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"),
      callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"),
      callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"),
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"),
    ]);

    // Combine answers
    const combinedAnswer = results.filter(Boolean).join("\n\n");

    res.status(200).json({ answer: combinedAnswer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error", details: err.message });
  }
}
