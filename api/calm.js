// File: /api/calm.js
import fetch from "node-fetch";

// -------------------------------
// PLATFORM HELPERS
// -------------------------------

// 1) Gemini (Google)
async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + key,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    }
  );

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// 2) HuggingFace
async function callHuggingFace(prompt, modelName) {
  const key = process.env.HF_API_KEY;

  const response = await fetch(`https://api-inference.huggingface.co/models/${modelName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  const data = await response.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  return data?.generated_text || "";
}

// 3) OpenRouter
async function callOpenRouter(prompt, modelName) {
  const key = process.env.OPENROUTER_API_KEY;

  const response = await fetch("https://api.openrouter.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

// -------------------------------
// 7 AIs (from 3 platforms)
// -------------------------------
async function gatherAIResponses(prompt) {
  const tasks = [
    // Gemini x2
    callGemini(prompt),
    callGemini(prompt + " (different angle)"),

    // HuggingFace x2
    callHuggingFace(prompt, "gpt2"),
    callHuggingFace(prompt, "tiiuae/falcon-7b-instruct"),

    // OpenRouter x3
    callOpenRouter(prompt, "meta-llama/llama-3-70b-instruct"),
    callOpenRouter(prompt, "google/gemma-2-27b-it"),
    callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),
  ];

  const results = await Promise.all(tasks);

  // Merge 7 responses into 1
  return results
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000); // prevent huge output
}

// -------------------------------
// API HANDLER
// -------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  // Check ENV variables
  const missing = [];
  if (!process.env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!process.env.HF_API_KEY) missing.push("HF_API_KEY");
  if (!process.env.OPENROUTER_API_KEY) missing.push("OPENROUTER_API_KEY");

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing platform API keys in Vercel Environment Variables.",
      missing,
    });
  }

  const prompt = req.body?.prompt;
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in JSON body." });
  }

  try {
    const finalAnswer = await gatherAIResponses(prompt);

    return res.status(200).json({
      success: true,
      response: finalAnswer,
    });

  } catch (err) {
    return res.status(500).json({
      error: "Internal AI Orchestrator Error",
      details: err.message,
    });
  }
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
