import { ILLMProvider } from './ILLMProvider';

export class GeminiProvider implements ILLMProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model;
    
    if (!this.apiKey) {
      console.warn('[GeminiProvider] No GEMINI_API_KEY provided. Calls will fail.');
    }
  }

  async generateStructuredJson<T = any>(systemPrompt: string, userPrompt: string): Promise<T> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        parts: [{ text: userPrompt }]
      }],
      generationConfig: {
        response_mime_type: "application/json",
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidate) {
      throw new Error('No candidate content received from Gemini');
    }

    try {
      return JSON.parse(candidate) as T;
    } catch (e) {
      throw new Error(`Failed to parse LLM JSON response: ${e.message}\nRaw response: ${candidate}`);
    }
  }
}
