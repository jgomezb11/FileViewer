import { describe, expect, it } from 'vitest';
import { isValidPartitionSize, isVideoFile } from '../../src/utils/validators';

describe('isValidPartitionSize', () => {
  it('should accept valid sizes', () => {
    expect(isValidPartitionSize(4)).toBe(true);
    expect(isValidPartitionSize(0.5)).toBe(true);
    expect(isValidPartitionSize(100)).toBe(true);
  });

  it('should reject zero', () => {
    expect(isValidPartitionSize(0)).toBe(false);
  });

  it('should reject negative values', () => {
    expect(isValidPartitionSize(-1)).toBe(false);
  });

  it('should reject values over 100', () => {
    expect(isValidPartitionSize(101)).toBe(false);
  });

  it('should reject Infinity', () => {
    expect(isValidPartitionSize(Infinity)).toBe(false);
  });
});

describe('isVideoFile', () => {
  it('should accept mp4 files', () => {
    expect(isVideoFile('video.mp4')).toBe(true);
  });

  it('should accept mkv with full path', () => {
    expect(isVideoFile('C:\\Users\\test\\movie.mkv')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isVideoFile('file.AVI')).toBe(true);
    expect(isVideoFile('file.MP4')).toBe(true);
  });

  it('should reject non-video extensions', () => {
    expect(isVideoFile('image.png')).toBe(false);
    expect(isVideoFile('document.pdf')).toBe(false);
    expect(isVideoFile('script.js')).toBe(false);
  });
});
