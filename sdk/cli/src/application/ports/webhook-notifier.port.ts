export interface IWebhookNotifier {
  notify(url: string, evidence: any): Promise<void>;
}
