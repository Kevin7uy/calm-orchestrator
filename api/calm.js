export default function handler(req, res) {
  // Check request method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed." });
  }

  // Debug: check every env variable
  const checkVars = {
    HF_TOKEN: !!process.env.HF_TOKEN,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
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
