import fs from 'fs';
import path from 'path';

// Load environment variables (Vercel automatically provides them)
const hfKey = process.env.HF_API_KEY;
const openRouterKey = process.env.OPENROUTER_API_KEY;
const googleKey = process.env.GOOGLE_API_KEY;

// Read the system prompt from the file
const promptPath = path.join(process.cwd(), 'system-prompt.txt');
const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPrompt } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'userPrompt is required' });
  }

  // Here you will orchestrate your 3 AI calls
  // For now, just return the prompt to verify
  return res.status(200).json({
    systemPrompt: systemPrompt.slice(0, 200) + '...', // preview first 200 chars
    userPrompt,
    message: 'Serverless function works! Ready to integrate AI calls.'
  });
}
