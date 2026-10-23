import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  PERMISSION_MANIFEST,
  permissionsByRole,
} from '../utils/authorization.js';

describe('permission manifest', () => {
  it('contains exactly every runtime permission key once', () => {
    const keys = PERMISSION_MANIFEST.map((entry) => entry.key);
    expect(keys).toEqual(PERMISSIONS);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only requires existing permissions and never itself', () => {
    const keys = new Set(PERMISSIONS);
    for (const entry of PERMISSION_MANIFEST) {
      expect(entry.description.trim().length).toBeGreaterThan(0);
      for (const required of entry.requires ?? []) {
        expect(keys.has(required)).toBe(true);
        expect(required).not.toBe(entry.key);
      }
    }
  });

  it('only assigns manifest permissions to roles', () => {
    const keys = new Set(PERMISSION_MANIFEST.map((entry) => entry.key));
    for (const rolePermissions of Object.values(permissionsByRole)) {
      for (const permission of rolePermissions) {
        expect(keys.has(permission)).toBe(true);
      }
    }
  });

  it('keeps permissions.json synchronized with the TypeScript source', async () => {
    const document = JSON.parse(
      await readFile(
        new URL('../../../../permissions.json', import.meta.url),
        'utf8',
      ),
    ) as unknown;
    expect(document).toEqual({ permissions: PERMISSION_MANIFEST });
  });
});
