import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    // Read the system prompt file
    const filePath = path.join(process.cwd(), "system-prompt.txt");
    const systemPrompt = fs.readFileSync(filePath, "utf8");

    res.status(200).json({
      message: "Serverless function works!",
      systemPrompt: systemPrompt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read system prompt" });
  }
}
