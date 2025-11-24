import fetch from "node-fetch";

function env(name) {
  return process.env[name] || null;
}

async function callHuggingFace(prompt, model) {
  const key = env("HF_API_KEY");
  if (!key) throw new Error("Missing HF_API_KEY");

  const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    }),
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || JSON.stringify(data);
}

async function callOpenRouter(prompt, model) {
  const key = env("OPENROUTER_API_KEY");
  if (!key) throw new Error("Missing OPENROUTER_API_KEY");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || JSON.stringify(data);
}

async function callGemini(prompt) {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content ||
    JSON.stringify(data)
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST only." });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt." });
  }

  const missing = [];
  if (!env("HF_API_KEY")) missing.push("HF_API_KEY");
  if (!env("OPENROUTER_API_KEY")) missing.push("OPENROUTER_API_KEY");
  if (!env("GEMINI_API_KEY")) missing.push("GEMINI_API_KEY");

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing environment variables",
      missing,
    });
  }

  try {
    const calls = [
      callGemini(prompt),
      callHuggingFace(prompt, "mistralai/Mistral-7B-Instruct-v0.2"),
      callHuggingFace(prompt, "codellama/CodeLlama-7b-Instruct-hf"),
      callHuggingFace(prompt, "deepseek-ai/deepseek-coder-1.3b-instruct"),
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"),
    ];

    const outputs = await Promise.allSettled(calls);

    const result = outputs.map((r, i) => ({
      model: [
        "Gemini",
        "HF_Mistral7B",
        "HF_CodeLlama7B",
        "HF_DeepSeek1.3B",
        "OR_Mistral7B",
        "OR_Llama3.3",
        "OR_Qwen2.5",
      ][i],
      ...(r.status === "fulfilled"
        ? { output: r.value }
        : { error: r.reason.message }),
    }));

    res.status(200).json({
      prompt,
      result,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
