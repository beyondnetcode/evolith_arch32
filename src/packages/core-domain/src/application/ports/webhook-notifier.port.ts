export interface IWebhookNotifier {
  notify(url: string, evidence: unknown): Promise<void>;
}
