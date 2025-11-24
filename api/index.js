export default function handler(req, res) {
  res.status(200).send(`
    <html>
      <head>
        <title>Calm AI Orchestrator</title>
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Welcome to Calm AI Orchestrator</h1>
        <p>This is your Vercel homepage.</p>
        <p>API endpoint is ready at <code>/api/ai</code>.</p>
        <p>Try sending a POST request with JSON like:</p>
        <pre>{
  "prompt": "Hello AI team"
}</pre>
      </body>
    </html>
  `);
}
