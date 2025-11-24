// File: /api/calm.js
import fetch from "node-fetch";

// Helper: call Gemini 2.5 Flash
async function callGemini(prompt, GEMINI_API_KEY) {
  try {
    const response = await fetch("https://generativeai.googleapis.com/v1beta2/models/gemini-2.5-flash:generateText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    return data?.candidates?.[0]?.content?.[0]?.text || "";
  } catch (err) {
    return `Error from Gemini: ${err.message}`;
  }
}

// Helper: call Hugging Face (via router.huggingface.co)
async function callHuggingFace(prompt, HF_API_KEY, model) {
  try {
    const response = await fetch(`https://router.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });
    const data = await response.json();
    if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
    return data?.generated_text || "";
  } catch (err) {
    return `Error from Hugging Face: ${err.message}`;
  }
}

// Helper: call OpenRouter
async function callOpenRouter(prompt, OR_API_KEY, model) {
  try {
    const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
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
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (err) {
    return `Error from OpenRouter: ${err.message}`;
  }
}

// Main handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in request body." });

  // Environment variables
  const { GEMINI_API_KEY, HF_API_KEY, OR_API_KEY } = process.env;
  const missingKeys = [];
  if (!GEMINI_API_KEY) missingKeys.push("GEMINI_API_KEY");
  if (!HF_API_KEY) missingKeys.push("HF_API_KEY");
  if (!OR_API_KEY) missingKeys.push("OR_API_KEY");
  if (missingKeys.length > 0) {
    return res.status(500).json({ error: "Missing API keys in environment variables.", missing: missingKeys });
  }

  // Models for Hugging Face and OpenRouter
  const HF_MODELS = [
    "mistralai/Codestral-22B-v0.1",
    "deepseek-ai/DeepSeek-Coder-33b-instruct",
    "codellama/CodeLlama-70b-Instruct-hf",
  ];
  const OR_MODELS = [
    "mistralai/mistral-7b-instruct",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen-2.5-coder-32b-instruct",
  ];

  try {
    // Call all 7 AIs in parallel
    const [
      geminiAnswer,
      hfAnswer1,
      hfAnswer2,
      hfAnswer3,
      orAnswer1,
      orAnswer2,
      orAnswer3,
    ] = await Promise.all([
      callGemini(prompt, GEMINI_API_KEY),
      callHuggingFace(prompt, HF_API_KEY, HF_MODELS[0]),
      callHuggingFace(prompt, HF_API_KEY, HF_MODELS[1]),
      callHuggingFace(prompt, HF_API_KEY, HF_MODELS[2]),
      callOpenRouter(prompt, OR_API_KEY, OR_MODELS[0]),
      callOpenRouter(prompt, OR_API_KEY, OR_MODELS[1]),
      callOpenRouter(prompt, OR_API_KEY, OR_MODELS[2]),
    ]);

    // Combine answers into one final answer
    const finalAnswer = [
      geminiAnswer,
      hfAnswer1,
      hfAnswer2,
      hfAnswer3,
      orAnswer1,
      orAnswer2,
      orAnswer3,
    ].join("\n\n");

    return res.status(200).json({ answer: finalAnswer });
  } catch (err) {
    return res.status(500).json({ error: "AI fetch failed", details: err.message });
  }
}
