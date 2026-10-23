import { describe, expect, it } from 'vitest';
import { parseCentralAccessSyncArguments } from '../application/central-access-sync-cli.js';

describe('Central access sync CLI', () => {
  it('requires an explicit dry-run or apply mode', () => {
    expect(parseCentralAccessSyncArguments(['--dry-run'])).toBe('dry-run');
    expect(parseCentralAccessSyncArguments(['--apply'])).toBe('apply');
    expect(() => parseCentralAccessSyncArguments([])).toThrow(/Usage/);
    expect(() =>
      parseCentralAccessSyncArguments(['--apply', '--dry-run']),
    ).toThrow(/Usage/);
  });
});
