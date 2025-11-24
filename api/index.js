import calm from "./calm.js"; // import the AI module

// If using Vercel serverless function
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const { provider, model, message } = req.body;

    if (!provider || !model || !message) {
      return res.status(400).json({ error: "Missing provider, model, or message in body." });
    }

    // Call our AI unified function
    const aiResponse = await calm.chat({
      provider: { group: provider, model },
      message,
    });

    return res.status(200).json({ response: aiResponse });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
