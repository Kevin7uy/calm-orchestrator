export default function handler(req, res) {
  try {
    const systemPrompt = process.env.SYSTEM_PROMPT;

    if (!systemPrompt) {
      throw new Error("SYSTEM_PROMPT not found in environment variables");
    }

    res.status(200).json({
      message: "Serverless function works!",
      systemPrompt: systemPrompt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
