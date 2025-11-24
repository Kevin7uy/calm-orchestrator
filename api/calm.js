GEMINI_API_KEY  return data?.generated_text || "";
}

// OpenRouter
async function callOpenRouter(prompt, model) {
  const key = process.env.OPENROUTER_API_KEY;
  const res = await fetch("https://api.openrouter.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

// === Main Handler ===
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const requiredKeys = ["GEMINI_API_KEY", "HF_API_KEY", "OPENROUTER_API_KEY"];
  const missing = requiredKeys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing platform API keys in Vercel Environment Variables.",
      missing,
    });
  }

  try {
    const prompt = req.body?.prompt;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt in request body." });
    }

    // Call all AIs in parallel
    const [
      geminiText,
      hfCodestral,
      hfDeepseek,
      hfCodeLlama,
      orMistral,
      orLlama33,
      orQwen,
    ] = await Promise.all([
      callGemini(prompt),
      callHuggingFace(prompt, "mistralai/Codestral-22B-v0.1"),
      callHuggingFace(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"),
      callHuggingFace(prompt, "codellama/CodeLlama-70b-Instruct-hf"),
      callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),
      callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),
      callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct"),
    ]);

    // Combine all answers into one final response
    const combinedAnswer = [
      geminiText,
      hfCodestral,
      hfDeepseek,
      hfCodeLlama,
      orMistral,
      orLlama33,
      orQwen,
    ].filter(Boolean).join("\n\n---\n\n");

    return res.status(200).json({ response: combinedAnswer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
    });
    const json = await res.json();
    if (Array.isArray(json) && json[0]?.generated_text) return json[0].generated_text;
    return json?.generated_text || json?.[0] || "";
  } catch (e) {
    console.error("callHuggingFace error:", e?.message || e);
    return "";
  }
}

async function callOpenRouter(prompt, model) {
  try {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return "";
    const res = await fetch("https://api.openrouter.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const json = await res.json();
    return json?.choices?.[0]?.message?.content || json?.result || "";
  } catch (e) {
    console.error("callOpenRouter error:", e?.message || e);
    return "";
  }
}

async function gatherAIResponses(prompt) {
  // Run HuggingFace 3 models in parallel
  const hfModels = [
    "mistralai/Codestral-22B-v0.1",
    "deepseek-ai/DeepSeek-Coder-33b-instruct",
    "codellama/CodeLlama-70b-Instruct-hf",
  ];
  const hfPromises = hfModels.map((m) => callHuggingFace(prompt, m));

  // Run OpenRouter 3 models in parallel
  const orModels = [
    "mistralai/mistral-7b-instruct",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen-2.5-coder-32b-instruct",
  ];
  const orPromises = orModels.map((m) => callOpenRouter(prompt, m));

  // Gemini (single call)
  const geminiPromise = callGemini(prompt);

  // Wait for all
  const results = await Promise.all([geminiPromise, ...hfPromises, ...orPromises]);

  // results order: [gemini, hf1, hf2, hf3, or1, or2, or3]
  const [gemini, ...others] = results;

  // Build a readable merged answer
  const merged = [
    `--- Gemini (lead) ---\n${gemini || "[no gemini output]"}`,
    `--- HuggingFace (Codestral) ---\n${others[0] || "[no output]"}`,
    `--- HuggingFace (DeepSeek) ---\n${others[1] || "[no output]"}`,
    `--- HuggingFace (CodeLlama) ---\n${others[2] || "[no output]"}`,
    `--- OpenRouter (Mistral 7B) ---\n${others[3] || "[no output]"}`,
    `--- OpenRouter (Llama 3.3) ---\n${others[4] || "[no output]"}`,
    `--- OpenRouter (Qwen2.5) ---\n${others[5] || "[no output]"}`,
  ].join("\n\n");

  // Make a final unified paragraph — simplest merge: Gemini first + concat
  const finalUnified = `${gemini || ""}\n\n${others.filter(Boolean).join("\n\n")}`;

  // truncate to avoid huge responses
  return {
    merged,
    finalUnified: finalUnified.slice(0, 12000),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const prompt = req.body?.prompt;
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  // check env variables
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

  try {
    const { merged, finalUnified } = await gatherAIResponses(prompt);

    return res.status(200).json({
      success: true,
      finalUnified,
      details: merged,
    });
  } catch (err) {
    console.error("handler error:", err);
    return res.status(500).json({ error: "Internal error", detail: err?.message || String(err) });
  }
}
