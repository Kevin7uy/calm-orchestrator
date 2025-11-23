// CALM Orchestrator Configuration (Starter)
// We will add your full system prompt later step-by-step.

export const calmConfig = {
  systemPrompt: "", // We will insert your prompt slowly later
  models: {
    huggingface: {
      codestral: process.env.HF_API_KEY,
      deepseek: process.env.HF_API_KEY,
      codellama: process.env.HF_API_KEY,
    },
    openrouter: {
      mistral7b: process.env.OPENROUTER_API_KEY,
      llama33: process.env.OPENROUTER_API_KEY,
      qwen25: process.env.OPENROUTER_API_KEY,
    },
    google: {
      geminiFlash: process.env.GOOGLE_API_KEY,
    },
  },
};
