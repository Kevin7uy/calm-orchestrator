export default function handler(req, res) {
  res.status(200).json({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "OK" : "MISSING",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "OK" : "MISSING",
    HF_TOKEN: process.env.HF_TOKEN ? "OK" : "MISSING",
  });
}
