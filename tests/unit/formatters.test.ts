import { describe, expect, it } from 'vitest';
import { bytesToGb, formatDuration, formatFileSize, gbToBytes } from '../../src/utils/formatters';

describe('formatFileSize', () => {
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.00 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1_048_576)).toBe('1.00 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(4_294_967_296)).toBe('4.00 GB');
  });
});

describe('formatDuration', () => {
  it('should format zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('02:05');
  });

  it('should format hours', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });
});

describe('gbToBytes and bytesToGb', () => {
  it('should convert 1 GB to bytes', () => {
    expect(gbToBytes(1)).toBe(1_073_741_824);
  });

  it('should convert bytes back to GB', () => {
    expect(bytesToGb(1_073_741_824)).toBe(1);
  });

  it('should be inverse operations', () => {
    expect(bytesToGb(gbToBytes(4.5))).toBeCloseTo(4.5);
  });
});
