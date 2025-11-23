// File: /api/calm.js
import fetch from "node-fetch";

// Helper: call Gemini 2.5 Flash
async function callGemini(prompt, GEMINI_API_KEY) {
  const response = await fetch("https://api.generative.google/v1/models/gemini-2.5-flash:generateText", {
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

// Helper: call Hugging Face
async function callHuggingFace(prompt, HF_API_KEY, model) {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
  });
  const data = await response.json();
  // Hugging Face sometimes returns an array
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  return data?.generated_text || "";
}

// Helper: call OpenRouter
async function callOpenRouter(prompt, OR_API_KEY, model) {
  const response = await fetch(`https://api.openrouter.ai/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OR_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Missing prompt in request body." });

  // Load API keys from environment variables
  const { GEMINI_API_KEY, HF_API_KEY, OR_API_KEY } = process.env;
  if (!GEMINI_API_KEY || !HF_API_KEY || !OR_API_KEY) {
    return res.status(500).json({ error: "Missing platform API keys in environment variables." });
  }

  try {
    // Call all AIs concurrently
    const [
      geminiResp,
      hfCodeLlama,
      hfMistral,
      hfDeepSeek,
      orMistral,
      orLlama3,
      orQwen
    ] = await Promise.all([
      callGemini(prompt, GEMINI_API_KEY),
      callHuggingFace(prompt, HF_API_KEY, "codellama/CodeLlama-70b-Instruct-hf"),
      callHuggingFace(prompt, HF_API_KEY, "mistralai/Codestral-22B-v0.1"),
      callHuggingFace(prompt, HF_API_KEY, "deepseek-ai/deepseek-coder-33b-instruct"),
      callOpenRouter(prompt, OR_API_KEY, "Mistral-7B-Instruct"),
      callOpenRouter(prompt, OR_API_KEY, "Llama-3.3-70B-Instruct"),
      callOpenRouter(prompt, OR_API_KEY, "Qwen2.5-Coder-32B-Instruct")
    ]);

    // Merge all responses into one
    const combinedReply = `
CALM Unified Answer:
-------------------
Gemini: ${geminiResp}
CodeLlama: ${hfCodeLlama}
Mistral HF: ${hfMistral}
DeepSeek: ${hfDeepSeek}
OpenRouter Mistral: ${orMistral}
OpenRouter Llama3: ${orLlama3}
OpenRouter Qwen: ${orQwen}

Final Unified CALM Response:
----------------------------
${geminiResp}  // Gemini leads
    `;

    return res.status(200).json({ reply: combinedReply });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI request failed.", details: err.message });
  }
}
