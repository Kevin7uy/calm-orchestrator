export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    }

    const { provider, model, prompt } = req.body;

    if (!provider || !model || !prompt) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "provider, model, and prompt are required"
      });
    }

    let hfUrl = `https://api-inference.huggingface.co/models/${model}`;

    const hfResponse = await fetch(hfUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    // If HuggingFace sends HTML (not JSON)
    const text = await hfResponse.text();

    try {
      const data = JSON.parse(text);

      return res.status(200).json({
        output: data[0]?.generated_text || "",
        raw: data
      });

    } catch (jsonError) {
      return res.status(500).json({
        error: "SERVER FAILED",
        message: "HuggingFace did not send JSON",
        raw: text
      });
    }

  } catch (err) {
    return res.status(500).json({
      error: "SERVER FAILED",
      message: err.message
    });
  }
}
