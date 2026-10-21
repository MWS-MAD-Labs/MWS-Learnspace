import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = join(process.cwd(), 'src');
const allowedLegacyReaders = new Set([
  'dev/legacy-export/LegacyExportTool.tsx',
  'dev/legacy-export/legacyStorageReader.ts',
]);
const sourceExtensions = new Set(['.ts', '.tsx']);
const sensitiveLegacyKeys = [
  'mws_users_v2',
  'mws_current_user_id_v2',
  'mws_students_v2',
  'mws_learning_journeys_v2',
  'mws_fedc_observations_v2',
  'mws_sensory_profiles_v2',
  'mws_sfa_observations_v2',
  'mws_iep_records_v2',
  'mws_iep_reports_v2',
  'mws_observation_assignments_v2',
  'mws_observation_forms_v2',
];

function productionSourceFiles(directory = sourceRoot): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSourceFiles(path);
    if (
      !sourceExtensions.has(extname(entry.name)) ||
      entry.name.includes('.test.')
    ) {
      return [];
    }
    const sourcePath = relative(sourceRoot, path);
    return allowedLegacyReaders.has(sourcePath) ||
      sourcePath.startsWith('test/')
      ? []
      : [path];
  });
}

describe('sensitive browser persistence policy', () => {
  it('does not access browser storage from production application paths', () => {
    const violations = productionSourceFiles().flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return /\b(?:localStorage|sessionStorage)\b/.test(source)
        ? [relative(sourceRoot, path)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it('does not restore browser repositories, fake-data mode, or runtime seed data', () => {
    const forbidden = [
      'storageService',
      'VITE_FAKE_DATA_MODE',
      'VITE_ENABLE_DEMO_ROLE_SWITCHER',
      "from '../data/seedData'",
      "from '../../data/seedData'",
    ];
    const violations = productionSourceFiles().flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return forbidden
        .filter((value) => source.includes(value))
        .map((value) => `${relative(sourceRoot, path)}: ${value}`);
    });

    expect(violations).toEqual([]);
  });

  it.each([
    ['student', ['mws_students_v2']],
    ['IEP', ['mws_iep_records_v2']],
    [
      'observation',
      [
        'mws_fedc_observations_v2',
        'mws_sensory_profiles_v2',
        'mws_sfa_observations_v2',
        'mws_observation_assignments_v2',
        'mws_observation_forms_v2',
      ],
    ],
    ['report', ['mws_iep_reports_v2']],
  ])(
    'does not retain %s browser-storage keys in production paths',
    (_domain, keys) => {
      const violations = productionSourceFiles().flatMap((path) => {
        const source = readFileSync(path, 'utf8');
        return keys
          .filter((key) => source.includes(key))
          .map((key) => `${relative(sourceRoot, path)}: ${key}`);
      });

      expect(violations).toEqual([]);
    },
  );

  it('keeps every historical sensitive key confined to the development export reader', () => {
    const productionSource = productionSourceFiles()
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');

    for (const key of sensitiveLegacyKeys) {
      expect(productionSource).not.toContain(key);
    }
  });
});
