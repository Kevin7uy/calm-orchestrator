// calm.js
import fetch from "node-fetch";

// --- Helpers for each platform ---

// Gemini (Google AI Studio)
async function callGemini(prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  return data?.candidates?.[0]?.content?.[0]?.text || "";
}

// Hugging Face Router
async function callHuggingFace(prompt, model) {
  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) throw new Error("Missing HF_API_KEY");

  const response = await fetch(`https://router.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  const data = await response.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  return data?.generated_text || "";
}

// OpenRouter
async function callOpenRouter(prompt, model = "openai/gpt-4o") {
  const OR_API_KEY = process.env.OR_API_KEY;
  if (!OR_API_KEY) throw new Error("Missing OR_API_KEY");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

// --- Main handler ---
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt in request body." });
  }

  try {
    // Parallel calls to all 7 AIs (simulate them)
    const results = await Promise.all([
      callGemini(prompt),                                  // Gemini
      callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"), // Hugging Face 1
      callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"), // Hugging Face 2
      callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"),      // Hugging Face 3
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),             // OpenRouter 1
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),         // OpenRouter 2
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"),          // OpenRouter 3
    ]);

    // Combine responses into one answer
    const combinedAnswer = results.filter(Boolean).join("\n\n");

    res.status(200).json({ answer: combinedAnswer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI fetch failed", details: err.message });
  }
}
