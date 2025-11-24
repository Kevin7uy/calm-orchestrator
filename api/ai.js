async function callHuggingFace(prompt, model) {
  try {
    const res = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 200,
            temperature: 0.7
          }
        })
      }
    );

    const data = await res.json();

    console.log("HF Response:", data);

    // CASE 1: {"generated_text": "..."}
    if (data.generated_text) return data.generated_text;

    // CASE 2: [{"generated_text": "..."}]
    if (Array.isArray(data) && data[0]?.generated_text)
      return data[0].generated_text;

    // CASE 3: Error response
    if (data.error) return `[HF ERROR] ${data.error}`;

    return "[HF UNKNOWN RESPONSE]";
  } catch (err) {
    return `[HF FETCH ERROR] ${err.message}`;
  }
}
