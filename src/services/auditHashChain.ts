import { AuditBlock, AuditVerificationResult, Role, Desk, Region } from '../types/workbench';
import { canonicalizeJson, hashCanonicalObject, sha256Sync } from './canonicalJson';

export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes block hash deterministically from sequence, timestamp, actor, action,
 * entityType, entityId, payloadHash, and previousHash.
 */
export function computeBlockHash(
  sequenceNumber: number,
  timestamp: string,
  actor: { userId: string; userName: string; role: Role; desk: Desk; region: Region },
  action: AuditBlock['action'],
  entityType: AuditBlock['entityType'],
  entityId: string,
  payloadHash: string,
  previousHash: string
): string {
  const blockHeader = {
    action,
    actor: {
      desk: actor.desk,
      region: actor.region,
      role: actor.role,
      userId: actor.userId,
      userName: actor.userName,
    },
    entityId,
    entityType,
    payloadHash,
    previousHash,
    sequenceNumber,
    timestamp,
  };

  const canonicalHeader = canonicalizeJson(blockHeader);
  return sha256Sync(canonicalHeader);
}

/**
 * Creates a new immutable block to append to the existing chain.
 */
export function createAuditBlock(
  existingChain: AuditBlock[],
  actor: { userId: string; userName: string; role: Role; desk: Desk; region: Region },
  action: AuditBlock['action'],
  entityType: AuditBlock['entityType'],
  entityId: string,
  payload: Record<string, unknown>,
  timestamp = new Date().toISOString()
): AuditBlock {
  const sequenceNumber = existingChain.length;
  const previousHash = sequenceNumber === 0 
    ? GENESIS_PREVIOUS_HASH 
    : existingChain[existingChain.length - 1].blockHash;

  const payloadHash = hashCanonicalObject(payload);
  const blockHash = computeBlockHash(
    sequenceNumber,
    timestamp,
    actor,
    action,
    entityType,
    entityId,
    payloadHash,
    previousHash
  );

  return {
    sequenceNumber,
    timestamp,
    actor,
    action,
    entityType,
    entityId,
    payload,
    payloadHash,
    previousHash,
    blockHash,
  };
}

/**
 * Verifies the mathematical integrity of the entire audit hash chain.
 * Checks:
 * 1. Genesis block has null/zero previous hash.
 * 2. Every subsequent block's previousHash matches the preceding block's blockHash.
 * 3. Every block's payloadHash matches the RFC 8785 canonical hash of its payload.
 * 4. Every block's blockHash matches the recalculation of its header fields.
 */
export function verifyAuditChainIntegrity(chain: AuditBlock[]): AuditVerificationResult {
  const now = new Date().toISOString();

  if (chain.length === 0) {
    return {
      isValid: true,
      verifiedBlocks: 0,
      totalBlocks: 0,
      verifiedAt: now,
      firstBrokenBlockSequence: null,
    };
  }

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];

    // Check sequence numbering continuity
    if (block.sequenceNumber !== i) {
      return {
        isValid: false,
        verifiedBlocks: i,
        totalBlocks: chain.length,
        verifiedAt: now,
        firstBrokenBlockSequence: i,
        failureReason: `Sequence gap detected at index ${i}: expected sequenceNumber ${i}, found ${block.sequenceNumber}`,
      };
    }

    // Check Genesis previousHash
    if (i === 0) {
      if (block.previousHash !== GENESIS_PREVIOUS_HASH) {
        return {
          isValid: false,
          verifiedBlocks: 0,
          totalBlocks: chain.length,
          verifiedAt: now,
          firstBrokenBlockSequence: 0,
          expectedHash: GENESIS_PREVIOUS_HASH,
          actualHash: block.previousHash,
          failureReason: 'Genesis block (sequence 0) previousHash does not match standard genesis zero-hash anchor.',
        };
      }
    } else {
      // Check previous block hash linkage
      const precedingBlock = chain[i - 1];
      if (block.previousHash !== precedingBlock.blockHash) {
        return {
          isValid: false,
          verifiedBlocks: i,
          totalBlocks: chain.length,
          verifiedAt: now,
          firstBrokenBlockSequence: i,
          expectedHash: precedingBlock.blockHash,
          actualHash: block.previousHash,
          failureReason: `Cryptographic link broken at block #${i}. Block #${i}'s previousHash does not match Block #${i - 1}'s blockHash.`,
        };
      }
    }

    // Check payload hash integrity
    const calculatedPayloadHash = hashCanonicalObject(block.payload);
    if (calculatedPayloadHash !== block.payloadHash) {
      return {
        isValid: false,
        verifiedBlocks: i,
        totalBlocks: chain.length,
        verifiedAt: now,
        firstBrokenBlockSequence: i,
        expectedHash: calculatedPayloadHash,
        actualHash: block.payloadHash,
        failureReason: `Payload tamper detected at block #${i}. Stored payloadHash does not match canonical payload calculation.`,
      };
    }

    // Check block header hash
    const calculatedBlockHash = computeBlockHash(
      block.sequenceNumber,
      block.timestamp,
      block.actor,
      block.action,
      block.entityType,
      block.entityId,
      block.payloadHash,
      block.previousHash
    );

    if (calculatedBlockHash !== block.blockHash) {
      return {
        isValid: false,
        verifiedBlocks: i,
        totalBlocks: chain.length,
        verifiedAt: now,
        firstBrokenBlockSequence: i,
        expectedHash: calculatedBlockHash,
        actualHash: block.blockHash,
        failureReason: `Block header hash mismatch at block #${i}. Stored blockHash differs from cryptographic hash of block attributes.`,
      };
    }
  }

  return {
    isValid: true,
    verifiedBlocks: chain.length,
    totalBlocks: chain.length,
    verifiedAt: now,
    firstBrokenBlockSequence: null,
  };
}
