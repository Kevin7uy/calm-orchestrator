// File: /api/calm.js
import fetch from "node-fetch";

// Helper: call Gemini (Google AI Studio)
async function callGemini(prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("Missing Gemini API key in environment variables");

  try {
    const res = await fetch("https://generativeai.googleapis.com/v1beta2/models/gemini-2.5-flash:generateText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content || "";
  } catch (err) {
    return `Error from Gemini: ${err.message}`;
  }
}

// Helper: call Hugging Face (Router API)
async function callHuggingFace(prompt, model) {
  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) throw new Error("Missing Hugging Face API key in environment variables");

  try {
    const res = await fetch(`https://router.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });
    const data = await res.json();
    if (Array.isArray(data)) return data[0]?.generated_text || "";
    return data?.generated_text || "";
  } catch (err) {
    return `Error from Hugging Face (${model}): ${err.message}`;
  }
}

// Helper: call OpenRouter
async function callOpenRouter(prompt, model) {
  const OR_API_KEY = process.env.OR_API_KEY;
  if (!OR_API_KEY) throw new Error("Missing OpenRouter API key in environment variables");

  try {
    const res = await fetch("https://api.openrouter.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OR_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (err) {
    return `Error from OpenRouter (${model}): ${err.message}`;
  }
}

// Main handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt in request body." });

  try {
    // Call all 7 AIs sequentially (simplified: use representative models)
    const responses = await Promise.all([
      callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"), // CODELOK
      callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"), // MOBILIS
      callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"), // VISUOX
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"), // GAMEBANE
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"), // ARCHITEK
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"), // ANIMUS
      callGemini(prompt), // INTEGRO
    ]);

    // Combine all answers into one
    const combinedAnswer = responses.join("\n\n");

    return res.status(200).json({ answer: combinedAnswer });
  } catch (err) {
    return res.status(500).json({ error: "AI fetch failed", details: err.message });
  }
}
