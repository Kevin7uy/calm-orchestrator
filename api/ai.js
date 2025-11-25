import fetch from 'node-fetch';

export default async function handler(req, res) {
  const response = await fetch('https://api-inference.huggingface.co/models/codellama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: "Hello AI team" })
  });

  const data = await response.json();
  res.status(200).json({ output: data });
}
