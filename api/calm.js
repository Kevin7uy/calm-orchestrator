export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  // Read user prompt
  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt." });
  }

  // Load API keys from Vercel Environment Variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const HF_TOKEN = process.env.HF_TOKEN;

  // If missing API keys → stop
  if (!GEMINI_API_KEY || !OPENROUTER_API_KEY || !HF_TOKEN) {
    return res.status(500).json({
      error: "Missing platform API keys in Vercel Environment Variables.",
    });
  }

  // MASTER SYSTEM PROMPT (CALM Orchestrator)
  const SYSTEM_PROMPT = `
You are CALM — the Central Orchestrator AI.  
Behind you operate 7 specialist AIs from 3 platforms:
HuggingFace (Codelok, Visuox, Mobilis)
OpenRouter (Gamebane, Architek, Animus)
Gemini (Integro)

You combine ALL their thinking into ONE response.

Rules:
• Content must be 100% clean + family-friendly  
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
