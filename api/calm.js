// ai.js
// Basic example for calling HuggingFace Inference API
// Make sure to replace YOUR_API_KEY with your real key

const model = "gpt2"; // change to the model you want
const url = `https://api-inference.huggingface.co/models/${model}`;

async function query(payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.HF_API_KEY || "YOUR_API_KEY"}`,
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

// Example usage
(async () => {
  try {
    const result = await query({
      inputs: "Hello! Write a short poem about the sky.",
    });
    console.log(result);
  } catch (error) {
    console.error("Error:", error);
  }
})();
