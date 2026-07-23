/**
 * JWT type definitions. Separated for clean imports — consumers that only
 * need types don't pull in crypto or verification logic.
 */

export interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  [claim: string]: unknown;
}

export interface JwtVerifyResult {
  ok: boolean;
  payload?: JwtPayload;
  /** Machine-readable failure reason when `ok` is false. */
  reason?:
    | 'malformed'
    | 'unsupported-alg'
    | 'bad-signature'
    | 'expired'
    | 'not-yet-valid';
}
