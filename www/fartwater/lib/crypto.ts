import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

/**
 * Verify a Solana wallet signature by decoding from base58 and using ed25519 verification.
 */
function decodeSignature(signature: string): Uint8Array | null {
  try {
    return bs58.decode(signature);
  } catch (error) {
    // Not base58, try base64 next.
  }

  try {
    return Uint8Array.from(Buffer.from(signature, 'base64'));
  } catch (error) {
    return null;
  }
}

export function verifySignature(message: string, signature: string, publicKey: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = decodeSignature(signature);
    if (!signatureBytes) {
      return false;
    }
    const publicKeyBytes = bs58.decode(publicKey);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Generate a short-lived message that asks the user to sign for wallet verification.
 */
export function generateChallenge(): string {
  return `Sign this message to verify your wallet ownership.\n\nTimestamp: ${Date.now()}\nNonce: ${Math.random().toString(36)}`;
}
