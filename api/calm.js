// File: /api/calm.js
import fetch from "node-fetch";

// -------------------- Helpers --------------------

// Gemini (Google AI Studio)
async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const res = await fetch("https://api.generative.google/v1/models/gemini-2.5-flash:generateText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  if (!data?.text) throw new Error("Gemini returned empty response");
  return data.text;
}

// Hugging Face
async function callHuggingFace(prompt, model) {
  const key = process.env.HF_API_KEY;
  if (!key) throw new Error("Missing HF_API_KEY");
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: prompt })
  });
  const data = await res.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  if (data?.generated_text) return data.generated_text;
  throw new Error(`HuggingFace returned invalid response for model ${model}`);
}

// OpenRouter
async function callOpenRouter(prompt, model) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY");
  const res = await fetch("https://api.openrouter.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  if (!data?.choices?.[0]?.message?.content) throw new Error(`OpenRouter returned invalid response for model ${model}`);
  return data.choices[0].message.content;
}

// -------------------- Main Handler --------------------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in request body." });

  try {
    // Run all 7 AIs (3 platforms) in parallel
    const [
      geminiResponse,
      hfCodestral,
      hfDeepSeek,
      hfCodeLlama,
      orMistral,
      orLlama,
      orQwen
    ] = await Promise.all([
      callGemini(prompt),
      callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"),
      callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"),
      callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"),
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct")
    ]);

    // Combine all outputs into one final answer
    const combinedAnswer = [
      geminiResponse,
      hfCodestral,
      hfDeepSeek,
      hfCodeLlama,
      orMistral,
      orLlama,
      orQwen
    ].join("\n\n---\n\n");

    return res.status(200).json({
      success: true,
      answer: combinedAnswer
    });
  } catch (err) {
    console.error("Fetch failed:", err.message);
    return res.status(500).json({
      error: "Fetch failed",
      detail: err.message
    });
  }
}
