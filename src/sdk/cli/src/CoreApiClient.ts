export class CoreApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.EVOLITH_CORE_URL || 'http://localhost:3000';
  }

  async evaluateArchitecturePlan(plan: any): Promise<any> {
    const url = `${this.baseUrl}/v1/architecture-plans/evaluate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plan)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Core API Evaluation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }
}
