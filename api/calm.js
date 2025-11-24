// File: /api/calm.js
import fetch from "node-fetch";

// Helper: call Gemini (Google AI Studio)
async function callGemini(prompt) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("Missing GEMINI_API_KEY");
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );
  const data = await response.json();
  return data?.candidates?.[0]?.content || data?.error || "";
}

// Helper: call Hugging Face free-tier models
async function callHuggingFace(prompt, model) {
  const API_KEY = process.env.HF_API_KEY;
  if (!API_KEY) throw new Error("Missing HF_API_KEY");
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
  });
  const data = await response.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  return data?.generated_text || data?.error || "";
}

// Helper: call OpenRouter free-tier models
async function callOpenRouter(prompt, model) {
  const API_KEY = process.env.OR_API_KEY;
  if (!API_KEY) throw new Error("Missing OR_API_KEY");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || data?.error || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in body." });

  try {
    // Call all free-tier Hugging Face models
    const hfModels = [
      "codellama/CodeLlama-7b-Instruct-hf",
      "deepseek-ai/deepseek-coder-1.3b-instruct",
      "bigcode/starcoder2-3b",
      "mistralai/Mistral-7B-Instruct-v0.2",
      "microsoft/phi-2",
    ];
    const hfResponses = await Promise.all(hfModels.map((model) => callHuggingFace(prompt, model)));

    // Call OpenRouter free-tier models
    const orModels = [
      "mistralai/mistral-7b-instruct",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-coder-32b-instruct",
    ];
    const orResponses = await Promise.all(orModels.map((model) => callOpenRouter(prompt, model)));

    // Call Gemini
    const geminiResponse = await callGemini(prompt);

    // Merge all AI outputs into one answer (simple concatenation for now)
    const finalAnswer = [geminiResponse, ...hfResponses, ...orResponses]
      .filter(Boolean)
      .join("\n\n---\n\n");

    return res.status(200).json({ answer: finalAnswer });
  } catch (error) {
    console.error("Calm AI Error:", error);
    return res.status(500).json({ error: "AI fetch failed", details: error.message });
  }
}
