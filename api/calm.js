export default {
  models: {
    huggingface: {
      // FREE TIER MODELS (HuggingFace Router)
      codellama: {
        name: "CodeLlama-7B Instruct",
        url: "https://router.huggingface.co/models/codellama/CodeLlama-7b-Instruct-hf",
        token: process.env.HF_TOKEN,
        model: "codellama/CodeLlama-7b-Instruct-hf",
      },
      deepseek: {
        name: "DeepSeek Coder 1.3B",
        url: "https://router.huggingface.co/models/deepseek-ai/deepseek-coder-1.3b-instruct",
        token: process.env.HF_TOKEN,
        model: "deepseek-ai/deepseek-coder-1.3b-instruct",
      },
      starcoder: {
        name: "StarCoder2-3B",
        url: "https://router.huggingface.co/models/bigcode/starcoder2-3b",
        token: process.env.HF_TOKEN,
        model: "bigcode/starcoder2-3b",
      },
      mistral7b: {
        name: "Mistral 7B Instruct",
        url: "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
        token: process.env.HF_TOKEN,
        model: "mistralai/Mistral-7B-Instruct-v0.2",
      },
      phi2: {
        name: "Phi-2",
        url: "https://router.huggingface.co/models/microsoft/phi-2",
        token: process.env.HF_TOKEN,
        model: "microsoft/phi-2",
      },
    },

    // OPENROUTER FREE MODELS
    openrouter: {
      mistral7b: {
        name: "OpenRouter Mistral 7B",
        url: "https://openrouter.ai/api/v1/chat/completions",
        token: process.env.OPENROUTER_TOKEN,
        model: "mistralai/mistral-7b-instruct",
      },
      llama33: {
        name: "Llama 3.3 70B FREE",
        url: "https://openrouter.ai/api/v1/chat/completions",
        token: process.env.OPENROUTER_TOKEN,
        model: "meta-llama/llama-3.3-70b-instruct",
      },
      qwenCoder: {
        name: "Qwen 2.5 Coder 32B FREE",
        url: "https://openrouter.ai/api/v1/chat/completions",
        token: process.env.OPENROUTER_TOKEN,
        model: "qwen/qwen-2.5-coder-32b-instruct",
      },
    },

    // GOOGLE AI STUDIO FREE MODEL
    google: {
      geminiFlash: {
        name: "Gemini 2.5 Flash",
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        token: process.env.GOOGLE_API_KEY,
        model: "gemini-2.5-flash",
      },
    },
  },

  // ---- UNIFIED CHAT FUNCTION ----
  async chat({ provider, message }) {
    const config = this.models[provider.group][provider.model];

    if (!config) {
      throw new Error("Model config not found.");
    }

    if (provider.group === "huggingface") {
      return await this.callHuggingFace(config, message);
    }

    if (provider.group === "openrouter") {
      return await this.callOpenRouter(config, message);
    }

    if (provider.group === "google") {
      return await this.callGoogle(config, message);
    }
  },

  // ---- HUGGINGFACE REQUEST ----
  async callHuggingFace(config, message) {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: message,
        parameters: { max_new_tokens: 300, temperature: 0.7 },
      }),
    });

    const result = await res.json();
    return result?.generated_text ?? "[HF ERROR]";
  },

  // ---- OPENROUTER REQUEST ----
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

  // ---- GOOGLE GEMINI REQUEST ----
  async callGoogle(config, message) {
    const res = await fetch(`${config.url}?key=${config.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
      }),
    });

    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[GOOGLE ERROR]";
  },
};
