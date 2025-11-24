// File: /api/calm.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  // Load environment variables
  const {
    GEMINI_API_KEY,
    HF_API_KEY,
    OPENROUTER_API_KEY
  } = process.env;

  // Check for missing keys
  const missingKeys = [];
  if (!GEMINI_API_KEY) missingKeys.push("GEMINI_API_KEY");
  if (!HF_API_KEY) missingKeys.push("HF_API_KEY");
  if (!OPENROUTER_API_KEY) missingKeys.push("OPENROUTER_API_KEY");

  if (missingKeys.length > 0) {
    return res.status(500).json({
      error: "Missing platform API keys in Vercel Environment Variables.",
      missing: missingKeys,
    });
  }

  // Read user prompt from POST body
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  try {
    // === Gemini call ===
    async function callGemini(prompt) {
      // TODO: Replace with the current Gemini endpoint
      const url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateText";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      return data?.text || "";
    }

    // === Hugging Face call ===
    async function callHuggingFace(prompt, model) {
      const url = `https://router.huggingface.co/models/${model}`;
      const response = await fetch(url, {
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
    }

    // === OpenRouter call ===
    async function callOpenRouter(prompt, model) {
      const url = "https://api.openrouter.ai/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
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

    // === Call all 7 AIs in parallel ===
    const [
      geminiAnswer,
      hfAnswer1, // Codestral-22B
      hfAnswer2, // DeepSeek-Coder-33B
      hfAnswer3, // CodeLlama-70B
      orAnswer1, // Mistral 7B
      orAnswer2, // Llama 3.3 70B
      orAnswer3  // Qwen2.5 Coder
    ] = await Promise.all([
      callGemini(prompt),
      callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"),
      callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"),
      callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"),
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"),
    ]);

    // === Combine answers ===
    const combinedAnswer = `
Gemini: ${geminiAnswer}
HuggingFace Codestral-22B: ${hfAnswer1}
HuggingFace DeepSeek-Coder-33B: ${hfAnswer2}
HuggingFace CodeLlama-70B: ${hfAnswer3}
OpenRouter Mistral 7B: ${orAnswer1}
OpenRouter Llama 3.3 70B: ${orAnswer2}
OpenRouter Qwen2.5 Coder: ${orAnswer3}
`;

    return res.status(200).json({ answer: combinedAnswer });

  } catch (error) {
    return res.status(500).json({ error: "AI fetch failed", details: error.message });
  }
}
