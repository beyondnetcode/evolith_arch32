export interface ILLMProvider {
  /**
   * Generates a structured JSON response from the LLM based on the system prompt and user input.
   * @param systemPrompt Instructions defining the schema and behavior.
   * @param userPrompt The actual requirement to process.
   * @returns A parsed JSON object of the LLM's response.
   */
  generateStructuredJson<T = any>(systemPrompt: string, userPrompt: string): Promise<T>;
}
