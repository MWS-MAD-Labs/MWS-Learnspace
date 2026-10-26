import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PERMISSION_MANIFEST } from '../utils/authorization.js';
import { buildRolePresets } from '../utils/role-presets.js';

describe('role presets for Central', () => {
  it('keeps role-presets.json synchronized with the roles in code', async () => {
    const file = JSON.parse(
      await readFile(
        new URL('../../../../role-presets.json', import.meta.url),
        'utf8',
      ),
    );
    expect(file).toEqual(buildRolePresets());
  });

  it('only uses permissions of the manifest, with what each one requires', () => {
    const requires = new Map<string, readonly string[]>(
      PERMISSION_MANIFEST.map((item) => [
        item.key,
        (item as { requires?: readonly string[] }).requires ?? [],
      ]),
    );
    for (const role of buildRolePresets().roles) {
      for (const permission of role.permissions) {
        expect(requires.has(permission), `${role.key} ${permission}`).toBe(
          true,
        );
        for (const needed of requires.get(permission) ?? []) {
          expect(role.permissions, `${role.key} ${permission}`).toContain(
            needed,
          );
        }
      }
    }
  });

  it('has no two roles with the same permissions, which Central refuses', () => {
    const sets = buildRolePresets().roles.map((role) =>
      [...role.permissions].sort().join('\n'),
    );
    expect(new Set(sets).size).toBe(sets.length);
  });
});
