// File: /api/calm.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  // Check environment variables
  const missingKeys = [];
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || missingKeys.push("GEMINI_API_KEY");
  const HF_API_KEY = process.env.HF_API_KEY || missingKeys.push("HF_API_KEY");
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || missingKeys.push("OPENROUTER_API_KEY");

  if (missingKeys.length > 0) {
    return res.status(500).json({ error: "Missing platform API keys.", missing: missingKeys });
  }

  // Helper: call Gemini
  async function callGemini(prompt) {
    try {
      const response = await fetch(
        "https://api.generative.google/v1/models/gemini-2.5-flash:generateText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GEMINI_API_KEY}`,
          },
          body: JSON.stringify({ prompt }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        console.error("Gemini API Error:", data);
        throw new Error(`Gemini API error: ${JSON.stringify(data)}`);
      }

      return data?.text || "";
    } catch (err) {
      console.error("Gemini fetch failed:", err.message);
      return `Error from Gemini: ${err.message}`;
    }
  }

  // Helper: call Hugging Face
  async function callHuggingFace(prompt, model) {
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Hugging Face API Error:", data);
        throw new Error(`Hugging Face API error: ${JSON.stringify(data)}`);
      }

      if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
      return data?.generated_text || "";
    } catch (err) {
      console.error("Hugging Face fetch failed:", err.message);
      return `Error from Hugging Face: ${err.message}`;
    }
  }

  // Helper: call OpenRouter
  async function callOpenRouter(prompt, model) {
    try {
      const response = await fetch("https://api.openrouter.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("OpenRouter API Error:", data);
        throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
      }

      return data?.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.error("OpenRouter fetch failed:", err.message);
      return `Error from OpenRouter: ${err.message}`;
    }
  }

  try {
    // Call 7 AIs (you can assign your 7 models here)
    const results = await Promise.all([
      callGemini(prompt),                          // 1 Gemini
      callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"), // 2 HF
      callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"), // 3 HF
      callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"),      // 4 HF
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),             // 5 OR
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),         // 6 OR
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"),          // 7 OR
    ]);

    // Combine all AI answers into one response
    const finalAnswer = results.filter(r => r).join("\n\n");

    return res.status(200).json({ answer: finalAnswer });
  } catch (err) {
    console.error("CALM Orchestrator error:", err.message);
    return res.status(500).json({ error: "CALM Orchestrator failed.", details: err.message });
  }
}
