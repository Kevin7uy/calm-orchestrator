import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ error: "METHOD NOT ALLOWED" });
    }

    const { provider, model, prompt } = req.body;

    if (!provider || !model || !prompt) {
      return res.status(400).json({ error: "MISSING PARAMETERS" });
    }

    // HuggingFace API call
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Add 'Authorization': `Bearer ${process.env.HF_API_KEY}` if model is private
      },
      body: JSON.stringify({ inputs: prompt })
    });

    // Parse response
    const data = await response.json();

    // Return clean output
    res.status(200).json({ output: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER FAILED", message: err.message });
  }
}
