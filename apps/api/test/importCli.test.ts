import { describe, expect, it } from 'vitest';
import { parseImportArguments } from '../src/importerCli.js';

describe('parseImportArguments', () => {
  it('accepts explicit dry-run mode', () => {
    expect(
      parseImportArguments([
        '--file',
        'export.json',
        '--manifest',
        'manifest.json',
        '--dry-run',
      ]),
    ).toMatchObject({ mode: 'dry-run' });
  });

  it('requires exactly one mode', () => {
    expect(() =>
      parseImportArguments([
        '--file',
        'export.json',
        '--manifest',
        'manifest.json',
      ]),
    ).toThrow('Usage');
    expect(() =>
      parseImportArguments([
        '--file',
        'export.json',
        '--manifest',
        'manifest.json',
        '--dry-run',
        '--apply',
      ]),
    ).toThrow('Usage');
  });

  it('requires organization confirmation for apply', () => {
    expect(() =>
      parseImportArguments([
        '--file',
        'export.json',
        '--manifest',
        'manifest.json',
        '--apply',
      ]),
    ).toThrow('--confirm-organization');
  });
});
