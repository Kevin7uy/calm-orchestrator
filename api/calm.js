export default function handler(req, res) {
  // Check request method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  // Debug: check every env variable
  const checkVars = {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    XAI_API_KEY: !!process.env.XAI_API_KEY,
    DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
  };

  // If ANY variable is missing, show exactly which one
  const missing = Object.keys(checkVars).filter((k) => !checkVars[k]);

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing platform API keys in Vercel Environment Variables.",
      missing,
    });
  }

  // If everything OK
  return res.status(200).json({
    success: true,
    message: "All environment variables loaded correctly!",
  });
}
      return "";
    }
  }

  const codestral = callHF("mistralai/Codestral-22B-v0.1");
  const deepseek = callHF("deepseek-ai/deepseek-coder-33b-instruct");
  const codellama = callHF("codellama/CodeLlama-70b-Instruct-hf");

  // ---------------------------------------
  // 🧠 WAIT FOR ALL 7 AIs
  // ---------------------------------------
  const results = await Promise.all([
    callGemini(),
    mistral,
    llama,
    qwen,
    codestral,
    deepseek,
    codellama,
  ]);

  // ---------------------------------------
  // 🟣 MERGE INTO ONE ANSWER (CALM MODE)
  // ---------------------------------------
  const calmAnswer = `
You are CALM — a union of 7 powerful AIs working together as ONE mind.
Below are each AI’s insights, merged into a unified answer.

⚪ **Gemini:**  
${results[0]}

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
