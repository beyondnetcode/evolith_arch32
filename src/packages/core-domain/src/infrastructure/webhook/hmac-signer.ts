import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signs and verifies webhook payloads using HMAC-SHA256.
 *
 * The signature is delivered in the `X-Evolith-Signature` HTTP header in the
 * format `sha256=<hex>`, following the convention established by GitHub webhooks.
 */
export class HmacSigner {
  static readonly HEADER_NAME = 'X-Evolith-Signature';

  /**
   * Computes the HMAC-SHA256 hex digest for the given payload.
   */
  sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Returns the full header value: `sha256=<hex>`.
   */
  headerValue(payload: string, secret: string): string {
    return `sha256=${this.sign(payload, secret)}`;
  }

  /**
   * Verifies a signature in constant time to prevent timing attacks.
   *
   * @param payload   The raw request body string.
   * @param secret    The shared secret for this subscription.
   * @param signature The value of the `X-Evolith-Signature` header (may include `sha256=` prefix).
   */
  verify(payload: string, secret: string, signature: string): boolean {
    const hex = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    const expected = this.sign(payload, secret);
    try {
      return timingSafeEqual(Buffer.from(hex, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }
}
