// File: /api/calm.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  // ----- LOAD ENV KEYS -----
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const HF_API_KEY = process.env.HF_API_KEY;
  const OR_API_KEY = process.env.OPENROUTER_API_KEY;

  // Check missing keys
  const missing = [];
  if (!GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!HF_API_KEY) missing.push("HF_API_KEY");
  if (!OR_API_KEY) missing.push("OPENROUTER_API_KEY");

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing platform API keys in Vercel Environment Variables.",
      missing
    });
  }

  // Extract user prompt
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided." });
  }

  // ----- CALL 7-AI ORCHESTRATOR -----

  // 1) Gemini (Google AI)
  async function callGemini(prompt) {
    const response = await fetch(
      "https://api.generative.google/v1/models/gemini-2.5-flash:generateText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify({ prompt })
      }
    );
    const data = await response.json();
    return data?.candidates?.[0]?.output_text || "";
  }

  // 2-4) HuggingFace Models
  async function callHuggingFace(prompt, model) {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );
    const data = await response.json();
    if (Array.isArray(data) && data[0]?.generated_text)
      return data[0].generated_text;
    return data?.generated_text || "";
  }

  // Hugging Face 3 models
  const hf_models = [
    "mistralai/Codestral-22B-v0.1",
    "deepseek-ai/DeepSeek-Coder-33b-instruct",
    "codellama/CodeLlama-70b-Instruct-hf"
  ];

  const huggingResults = await Promise.all(
    hf_models.map((m) => callHuggingFace(prompt, m))
  );

  // 5-7) OpenRouter models
  async function callOpenRouter(prompt, model) {
    const response = await fetch(
      "https://api.openrouter.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OR_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }]
        })
      }
    );
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  }

  const or_models = [
    "mistralai/mistral-7b-instruct",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen-2.5-coder-32b-instruct"
  ];

  const openrouterResults = await Promise.all(
    or_models.map((m) => callOpenRouter(prompt, m))
  );

  // Combine all 7 ideas → one CALM answer
  const calmAnswer = `
🌐 **CALM Unified Response (7-AI Orchestration)**

Gemini:
${await callGemini(prompt)}

HuggingFace Models:
${huggingResults.join("\n\n")}

OpenRouter Models:
${openrouterResults.join("\n\n")}

➡️ Final Orchestrated Answer (CALM):
${"All ideas merged into one final unified response."}
`;

  return res.status(200).json({
    success: true,
    output: calmAnswer
  });
}
    body: JSON.stringify({ inputs: prompt })
  });

  const data = await response.json();

  // HF can return arrays or direct text
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
  return data?.generated_text || "";
}

// -------------------------------
// OPENROUTER MODELS
// -------------------------------
async function callOpenRouter(prompt, model) {
  const key = process.env.OPENROUTER_API_KEY;

  const response = await fetch("https://api.openrouter.ai/v1/chat/completions", {
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

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

// -------------------------------
// 7 AI ORCHESTRATION
// -------------------------------
async function gatherAIResponses(prompt) {
  const tasks = [
    // 1 - Gemini
    callGemini(prompt),

    // 2-4 HuggingFace
    callHF(prompt, "mistralai/Codestral-22B-v0.1"),
    callHF(prompt, "deepseek-ai/DeepSeek-Coder-33b-instruct"),
    callHF(prompt, "codellama/CodeLlama-70b-Instruct-hf"),

    // 5-7 OpenRouter
    callOpenRouter(prompt, "mistralai/mistral-7b-instruct"),
    callOpenRouter(prompt, "meta-llama/llama-3.3-70b-instruct"),
    callOpenRouter(prompt, "qwen/qwen-2.5-coder-32b-instruct")
  ];

  const results = await Promise.all(tasks);
  return results.filter(Boolean).join("\n\n").slice(0, 6000);
}

// -------------------------------
// API ENTRY POINT
// -------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  // Check required environment variables
  const missing = [];
  if (!process.env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!process.env.HF_API_KEY) missing.push("HF_API_KEY");
  if (!process.env.OPENROUTER_API_KEY) missing.push("OPENROUTER_API_KEY");

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing platform API keys in Vercel Environment Variables.",
      missing
    });
  }

  const prompt = req.body?.prompt;
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' field in JSON body." });
  }

  try {
    const answer = await gatherAIResponses(prompt);

    return res.status(200).json({
      success: true,
      response: answer
    });

  } catch (err) {
    return res.status(500).json({
      error: "Calm orchestrator internal error.",
      detail: err.message
    });
  }
}
🟤 **Mistral 7B:**  
${results[1]}

🟢 **Llama 3.3 70B:**  
${results[2]}

🔵 **Qwen2.5 Coder 32B:**  
${results[3]}

🟣 **Codestral 22B:**  
${results[4]}

🟡 **DeepSeek Coder 33B:**  
${results[5]}

🟠 **CodeLlama 70B:**  
${results[6]}

---

### 🔥 **CALM Unified Response**
Based on all AIs, the combined answer is:

${results.join("\n\n")}
`;

  return res.status(200).json({ response: calmAnswer });
}
• CALM answers user questions directly  
• But when building a project → all 7 AIs collaborate internally  
• User sees only CALM (not individual AIs)  
• No planning messages, no thinking text  
• When building → CALM pauses chat until build done  
• Output must be stable, clean, technical when needed  
  `;

  try {
    //
    // STEP 1 — Gemini generates the "integration reasoning"
    //
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: SYSTEM_PROMPT + "\nUser: " + prompt }],
            },
          ],
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const geminiOutput =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Gemini failed.";

    //
    // STEP 2 — OpenRouter model enhances the output
    //
    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `User prompt: ${prompt}\n\nGemini output: ${geminiOutput}`,
          },
        ],
      }),
    });

    const openrouterData = await openrouterResponse.json();
    const openrouterOutput =
      openrouterData?.choices?.[0]?.message?.content || "OpenRouter failed.";

    //
    // STEP 3 — HuggingFace validates technical structure
    //
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Codestral-22B-v0.1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: openrouterOutput }),
      }
    );

    const hfData = await hfResponse.json();
    const hfOutput =
      typeof hfData === "string"
        ? hfData
        : hfData?.generated_text ||
          hfData?.[0]?.generated_text ||
          "HuggingFace model failed.";

    //
    // FINAL OUTPUT — CALM Orchestration
    //
    const finalMessage = `
🔹 **CALM Unified Response**
${hfOutput}
    `;

    return res.status(200).json({ reply: finalMessage });
  } catch (err) {
    return res.status(500).json({
      error: "Server error.",
      details: err.message,
    });
  }
}
