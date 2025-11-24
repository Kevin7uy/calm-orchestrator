export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, model } = req.body;

    if (!prompt || !model) {
      return res.status(400).json({
        error: "Missing fields",
        message: "Provide 'prompt' and 'model'"
      });
    }

    const HF_API_KEY = process.env.HF_API_KEY;
    if (!HF_API_KEY) {
      return res.status(500).json({
        error: "Server config error",
        message: "HF_API_KEY is missing in Vercel environment"
      });
    }

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    // FIX: HuggingFace sometimes returns HTML (Not Found)
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "Bad response from HuggingFace",
        raw: text
      });
    }

    return res.status(200).json({ output: data });

  } catch (error) {
    return res.status(500).json({
      error: "SERVER FAILED",
      message: error.message || "Unknown server error"
    });
  }
}
