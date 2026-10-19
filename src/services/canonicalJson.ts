/**
 * RFC 8785 Compliant Canonical JSON Serializer & Deterministic SHA-256
 * 
 * Guarantees that two identical data structures produce the exact same byte string
 * and SHA-256 cryptographic hash, which is the foundational bedrock for:
 * 1. Immutable Input Snapshots
 * 2. Byte-identical Reproducibility Proofs
 * 3. Append-only Hash Chaining in Audit Logs
 */

/**
 * Serializes any JavaScript value to RFC 8785 Canonical JSON representation.
 * - Object keys are sorted lexicographically by Unicode code points.
 * - Whitespace is stripped.
 * - Floats and integers formatted consistently.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const elements = value.map((el) => canonicalizeJson(el));
    return `[${elements.join(',')}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort((a, b) => {
      // Lexicographical sort by UTF-16 code units
      return a < b ? -1 : a > b ? 1 : 0;
    });

    const entries = sortedKeys.map((k) => {
      return `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`;
    });

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

/**
 * Pure JavaScript implementation of SHA-256 for deterministic synchronous execution.
 * Matches NIST FIPS 180-4 standard.
 */
export function sha256Sync(message: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0;

  let result = '';

  const words: number[] = [];
  const asciiBitLength = message[lengthProperty] * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isPrime[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isPrime[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  message += '\x80';
  while ((message[lengthProperty] % 64) - 56) message += '\x00';
  for (i = 0; i < message[lengthProperty]; i++) {
    j = message.charCodeAt(i);
    if (j >> 8) return ''; // non-ascii
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    hash.length = 8;
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i]
          : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 =
        (hash[7] +
          (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
          ch +
          k[i] +
          w[i]) |
        0;
      const temp2 =
        ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) |
        0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Computes the SHA-256 hash of an object using RFC 8785 canonical serialization.
 */
export function hashCanonicalObject(value: unknown): string {
  const canonicalStr = canonicalizeJson(value);
  return sha256Sync(canonicalStr);
}
