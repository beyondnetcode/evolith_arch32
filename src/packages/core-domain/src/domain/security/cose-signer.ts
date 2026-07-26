import { createSign, createVerify } from 'node:crypto';

export interface CoseSign1 {
  protected: string; // Base64url encoded protected headers
  unprotected: Record<string, unknown>;
  payload: string;   // Base64url encoded payload
  signature: string; // Base64url encoded signature
}

/**
 * Basic COSE Sign1 (RFC 8152) / SCITT Receipt compatible wrapper
 * using Node.js native crypto to avoid external dependencies.
 */
export class CoseSigner {
  constructor(private readonly privateKeyPem: string) {}

  sign(payload: unknown, algorithm = 'SHA256'): CoseSign1 {
    const payloadStr = JSON.stringify(payload);
    const payloadB64Url = Buffer.from(payloadStr).toString('base64url');
    
    const protectedHeaders = { alg: 'ES256', typ: 'application/cose' };
    const protectedB64Url = Buffer.from(JSON.stringify(protectedHeaders)).toString('base64url');

    const sign = createSign(algorithm);
    sign.update(`${protectedB64Url}.${payloadB64Url}`);
    sign.end();
    
    const signature = sign.sign(this.privateKeyPem, 'base64url');

    return {
      protected: protectedB64Url,
      unprotected: {},
      payload: payloadB64Url,
      signature,
    };
  }

  static verify(cose: CoseSign1, publicKeyPem: string, algorithm = 'SHA256'): boolean {
    const verify = createVerify(algorithm);
    verify.update(`${cose.protected}.${cose.payload}`);
    verify.end();
    return verify.verify(publicKeyPem, cose.signature, 'base64url');
  }
}
