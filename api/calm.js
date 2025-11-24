import fetch from "node-fetch";

export default {
  models: {
    huggingface: {
      codellama: {
        name: "CodeLlama-7B Instruct",
        url: "https://router.huggingface.co/models/codellama/CodeLlama-7b-Instruct-hf",
        token: process.env.HF_API_KEY,
        model: "codellama/CodeLlama-7b-Instruct-hf",
      },
      deepseek: {
        name: "DeepSeek Coder 1.3B",
        url: "https://router.huggingface.co/models/deepseek-ai/deepseek-coder-1.3b-instruct",
        token: process.env.HF_API_KEY,
        model: "deepseek-ai/deepseek-coder-1.3b-instruct",
      },
      starcoder: {
        name: "StarCoder2-3B",
        url: "https://router.huggingface.co/models/bigcode/starcoder2-3b",
        token: process.env.HF_API_KEY,
        model: "bigcode/starcoder2-3b",
      },
      mistral7b: {
        name: "Mistral 7B Instruct",
        url: "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
        token: process.env.HF_API_KEY,
        model: "mistralai/Mistral-7B-Instruct-v0.2",
      },
      phi2: {
        name: "Phi-2",
        url: "https://router.huggingface.co/models/microsoft/phi-2",
        token: process.env.HF_API_KEY,
        model: "microsoft/phi-2",
      },
    },

    openrouter: {
      mistral7b: {
        name: "OpenRouter Mistral 7B",
        url: "https://api.openrouter.ai/v1/chat/completions",
        token: process.env.OPENROUTER_API_KEY,
        model: "mistralai/mistral-7b-instruct",
      },
      llama33: {
        name: "Llama 3.3 70B FREE",
        url: "https://api.openrouter.ai/v1/chat/completions",
        token: process.env.OPENROUTER_API_KEY,
        model: "meta-llama/llama-3.3-70b-instruct",
      },
      qwenCoder: {
        name: "Qwen 2.5 Coder 32B FREE",
        url: "https://api.openrouter.ai/v1/chat/completions",
        token: process.env.OPENROUTER_API_KEY,
        model: "qwen/qwen-2.5-coder-32b-instruct",
      },
    },

    google: {
      geminiFlash: {
        name: "Gemini 2.5 Flash",
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        token: process.env.GEMINI_API_KEY,
        model: "gemini-2.5-flash",
      },
    },
  },

  async chat({ provider, message }) {
    const config = this.models[provider.group][provider.model];
    if (!config) throw new Error("Model config not found.");

    if (provider.group === "huggingface") return await this.callHuggingFace(config, message);
    if (provider.group === "openrouter") return await this.callOpenRouter(config, message);
    if (provider.group === "google") return await this.callGoogle(config, message);
  },

  async callHuggingFace(config, message) {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: message, parameters: { max_new_tokens: 300, temperature: 0.7 } }),
    });
    const result = await res.json();
    return result?.generated_text ?? "[HF ERROR]";
  },

  async callOpenRouter(config, message) {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: message }],
      }),
    });
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? "[OR ERROR]";
  },

  async callGoogle(config, message) {
    const res = await fetch(`${config.url}?key=${config.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] }),
    });
    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[GOOGLE ERROR]";
  },
};
