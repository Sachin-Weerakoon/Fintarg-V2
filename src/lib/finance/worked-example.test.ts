import { describe, expect, it } from 'vitest';
import { workedExample } from './analysis';

describe('worked example', () => {
  it('keeps the sample monthly shortfall example consistent', () => {
    const result = workedExample();
    expect(result.totalOutflow).toBe(5_500_000);
    expect(result.shortfall).toBe(500_000);
  });
});
