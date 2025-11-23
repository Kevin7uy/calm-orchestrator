export default async function handler(req, res) {
  try {
    // -----------------------------
    // Get environment variables
    // -----------------------------
    const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT;
    const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

    if (!SYSTEM_PROMPT) {
      throw new Error("SYSTEM_PROMPT not found in environment variables");
    }

    // -----------------------------
    // Accept user prompt
    // -----------------------------
    const userPrompt = req.body?.prompt || "No user prompt provided";

    // -----------------------------
    // For now, just return the system prompt + user prompt
    // -----------------------------
    // Later, we can integrate HF, OpenRouter, Gemini APIs
    const response = {
      message: "CALM serverless function works!",
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: userPrompt,
      aiStatus: "Ready to integrate Hugging Face, OpenRouter, Gemini"
    };

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
