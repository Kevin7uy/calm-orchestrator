export default async function handler(req, res) {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // This is just the placeholder for now
    // Later we add: HuggingFace, OpenRouter, Gemini, DeepSeek, etc.
    const response = {
      ai: "AI core initialized",
      message: "Your 7-AI system is ready for multi-model development.",
      input: prompt
    };

    res.status(200).json(response);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
