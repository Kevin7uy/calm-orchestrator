// api/calm.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  const userPrompt = req.body?.prompt;
  if (!userPrompt) {
    return res.status(400).json({ error: "No prompt provided." });
  }

  // --------------------------
  //  ENVIRONMENT VARIABLES (PLATFORM KEYS)
  // --------------------------
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Google AI Studio platform key
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY; // OpenRouter platform key
  const HF_API_KEY = process.env.HF_API_KEY;         // Hugging Face platform key

  if (!GEMINI_API_KEY || !OPENROUTER_KEY || !HF_API_KEY) {
    return res.status(500).json({
      error: "Missing platform API keys in Vercel Environment Variables.",
    });
  }

  // --------------------------
  //  🧠 1. GEMINI 2.5 FLASH (Google AI)
  // --------------------------
  async function callGemini() {
    try {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
          GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
          }),
        }
      );
      const data = await r.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
      console.error("Gemini error:", e);
      return "";
    }
  }

  // --------------------------
  //  🧠 2,3,4 — OPENROUTER (Mistral 7B, Llama 3.3, Qwen2.5-Coder)
  // --------------------------
  async function callOpenRouter(modelName) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_KEY}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await r.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (e) {
      console.error(modelName, "OpenRouter error:", e);
      return "";
    }
  }

  const mistral = callOpenRouter("mistralai/mistral-7b-instruct");
  const llama = callOpenRouter("meta-llama/llama-3.3-70b-instruct");
  const qwen = callOpenRouter("qwen/qwen-2.5-coder-32b-instruct");

  // --------------------------
  //  🧠 5,6,7 — HUGGING FACE (Codestral, DeepSeek, CodeLlama)
  // --------------------------
  async function callHF(modelName) {
    try {
      const r = await fetch(`https://api-inference.huggingface.co/models/${modelName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HF_API_KEY}`,
        },
        body: JSON.stringify({ inputs: userPrompt }),
      });
      const data = await r.json();
      return data[0]?.generated_text || "";
    } catch (e) {
      console.error(modelName, "Hugging Face error:", e);
      return "";
    }
  }

  const codestral = callHF("mistralai/Codestral-22B-v0.1");
  const deepseek = callHF("deepseek-ai/deepseek-coder-33b-instruct");
  const codellama = callHF("codellama/CodeLlama-70b-Instruct-hf");

  // --------------------------
  //  🧠 WAIT FOR ALL 7 AIs
  // --------------------------
  const results = await Promise.all([
    callGemini(),  // Gemini goes first
    mistral,
    llama,
    qwen,
    codestral,
    deepseek,
    codellama,
  ]);

  // --------------------------
  //  🟣 MERGE INTO ONE ANSWER (CALM MODE)
  // --------------------------
  const calmAnswer = `
You are CALM — a union of 7 powerful AIs working together as ONE mind. Below are each AI’s insights, merged into a unified answer.

⚪ Gemini 2.5 Flash: ${results[0]}
🟤 Mistral 7B: ${results[1]}
🟢 Llama 3.3 70B: ${results[2]}
🔵 Qwen2.5 Coder: ${results[3]}
🟣 Codestral 22B: ${results[4]}
🟡 DeepSeek Coder 33B: ${results[5]}
🟠 CodeLlama 70B: ${results[6]}

### 🔥 CALM Unified Response
${results.join("\n\n")}
`;

  return res.status(200).json({ response: calmAnswer });
}
