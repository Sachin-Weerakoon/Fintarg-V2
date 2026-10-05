import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE } from './limits';

describe('Application Limits', () => {
  it('defines MAX_FILE_SIZE as 4MB (4194304 bytes)', () => {
    expect(MAX_FILE_SIZE).toBe(4 * 1024 * 1024);
    expect(MAX_FILE_SIZE).toBe(4194304);
  });
});
