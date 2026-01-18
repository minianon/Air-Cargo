/**
 * Unit tests for Reference ID Generator
 */

import { generateRefId, isValidRefId } from '../src/utils/refIdGenerator.js';

describe('generateRefId', () => {
    test('should generate a ref_id with correct format', () => {
        const refId = generateRefId();
        expect(refId).toMatch(/^ACB-[A-Z2-9]{6}$/);
    });

    test('should generate unique ref_ids', () => {
        const refIds = new Set();
        for (let i = 0; i < 1000; i++) {
            refIds.add(generateRefId());
        }
        // All 1000 should be unique (extremely unlikely to have collision)
        expect(refIds.size).toBe(1000);
    });

    test('should not include confusing characters (0, 1, I, O)', () => {
        for (let i = 0; i < 100; i++) {
            const refId = generateRefId();
            expect(refId).not.toMatch(/[01IO]/);
        }
    });
});

describe('isValidRefId', () => {
    test('should return true for valid ref_id', () => {
        expect(isValidRefId('ACB-ABCDEF')).toBe(true);
        expect(isValidRefId('ACB-XYZ789')).toBe(true);
        expect(isValidRefId('ACB-AAAAAA')).toBe(true);
        expect(isValidRefId('ACB-222222')).toBe(true);
    });

    test('should return false for invalid prefix', () => {
        expect(isValidRefId('ABC-123456')).toBe(false);
        expect(isValidRefId('XYZ-123456')).toBe(false);
    });

    test('should return false for wrong length', () => {
        expect(isValidRefId('ACB-12345')).toBe(false);  // too short
        expect(isValidRefId('ACB-1234567')).toBe(false); // too long
    });

    test('should return false for invalid characters', () => {
        expect(isValidRefId('ACB-ABCD0E')).toBe(false); // contains 0
        expect(isValidRefId('ACB-ABCD1E')).toBe(false); // contains 1
        expect(isValidRefId('ACB-ABCDiE')).toBe(false); // contains lowercase
    });

    test('should return false for missing hyphen', () => {
        expect(isValidRefId('ACB123456')).toBe(false);
    });

    test('should return false for empty string', () => {
        expect(isValidRefId('')).toBe(false);
    });

    test('should return false for null/undefined', () => {
        expect(isValidRefId(null)).toBe(false);
        expect(isValidRefId(undefined)).toBe(false);
    });
});
