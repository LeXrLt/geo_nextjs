export const appConfig = {
  ai: {
    baseURL: process.env.AI_BASE_URL || 'https://api.openai.com',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },
  promptFission: {
    count: Number.parseInt(process.env.PROMPT_FISSION_COUNT || '5', 10),
    template:
      process.env.PROMPT_FISSION_TEMPLATE ||
      '请基于以下提示词进行提示词裂变，生成 {{count}} 条高质量、风格多样且目标明确的中文提示词。要求：仅返回 JSON 数组（字符串），不要附加任何解释。原始提示词：{{prompt}}',
  },
}
