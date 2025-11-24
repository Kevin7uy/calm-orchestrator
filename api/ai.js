// File: /api/ai.js
import fetch from "node-fetch";

function safeEnv(name) {
  return process.env[name] || null;
}

async function callHuggingFace(prompt, model) {
  const HF_KEY = safeEnv("HF_API_KEY");
  if (!HF_KEY) throw new Error("Missing HF_API_KEY");

  const url = "https://router.huggingface.co/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      // optional: limit size
      max_tokens: 512,
    }),
  });

  const data = await res.json();
  // If HF returns structured content
  return data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
}

async function callOpenRouter(prompt, model) {
  const OR_KEY = safeEnv("OR_API_KEY");
  if (!OR_KEY) throw new Error("Missing OR_API_KEY");

  const url = "https://openrouter.ai/api/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OR_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
}

async function callGemini(prompt) {
  const GEMINI_KEY = safeEnv("GEMINI_API_KEY");
  if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await res.json();
  // Google returns candidates -> content parts -> text
  const text =
    data?.candidates?.[0]?.content?.[0]?.text ??
    data?.candidates?.[0]?.content ??
    JSON.stringify(data);
  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const body = req.body || {};
  const prompt = body.prompt || body.message || null;
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' (or 'message') in JSON body." });
  }

  // Check env vars and short-circuit with explicit message
  const missing = [];
  if (!safeEnv("HF_API_KEY")) missing.push("HF_API_KEY");
  if (!safeEnv("OR_API_KEY")) missing.push("OR_API_KEY");
  if (!safeEnv("GEMINI_API_KEY")) missing.push("GEMINI_API_KEY");
  if (missing.length > 0) {
    return res.status(500).json({ error: "Missing API keys in environment variables.", missing });
  }

  try {
    // Use Promise.allSettled so one failing platform doesn't kill the others
    const calls = [
      callGemini(prompt).catch((e) => `ERROR_GEMINI: ${e.message}`),
      callHuggingFace(prompt, "mistralai/Mistral-7B-Instruct-v0.2").catch((e) => `ERROR_HF_Mistral: ${e.message}`),
      callHuggingFace(prompt, "codellama/CodeLlama-7b-Instruct-hf").catch((e) => `ERROR_HF_CL7b: ${e.message}`),
      callHuggingFace(prompt, "deepseek-ai/deepseek-coder-1.3b-instruct").catch((e) => `ERROR_HF_DeepSeek: ${e.message}`),
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct").catch((e) => `ERROR_OR_Mistral: ${e.message}`),
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct").catch((e) => `ERROR_OR_Llama: ${e.message}`),
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct").catch((e) => `ERROR_OR_Qwen: ${e.message}`),
    ];

    const settled = await Promise.allSettled(calls);

    // Build readable results array (map to platform names)
    const results = settled.map((s, idx) => {
      const mapping = [
        "Gemini",
        "HF_Mistral7B",
        "HF_CodeLlama7B",
        "HF_DeepSeek1.3B",
        "OR_Mistral7B",
        "OR_Llama3.3",
        "OR_Qwen2.5",
      ];
      const name = mapping[idx] ?? `AI_${idx}`;
      if (s.status === "fulfilled") {
        return { model: name, output: typeof s.value === "string" ? s.value : JSON.stringify(s.value) };
      } else {
        return { model: name, error: s.reason ? s.reason.toString() : "Unknown error" };
      }
    });

    // Combine successful outputs into one single answer (simple merge)
    const combined = results
      .filter((r) => r.output && !String(r.output).startsWith("ERROR_"))
      .map((r) => `--- ${r.model} ---\n${r.output}`)
      .join("\n\n");

    const fallback = results.map((r) => (r.output ? `${r.model}: ${String(r.output).slice(0, 300)}` : `${r.model}: ERROR`)).join(" | ");

    return res.status(200).json({
      prompt,
      results,
      combinedAnswer: combined || null,
      combinedFallback: combined || fallback,
    });
  } catch (err) {
    console.error("Unexpected handler error:", err);
    return res.status(500).json({ error: "Unexpected server error", details: err.message });
  }
}
