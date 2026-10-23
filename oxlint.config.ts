import { defineConfig } from 'oxlint';

export default defineConfig({
  categories: {
    correctness: 'error',
  },
  ignorePatterns: [
    '**/coverage/**',
    '**/dist/**',
    '**/node_modules/**',
    'tools/oxlint/anti-slop/**',
  ],
  plugins: ['eslint', 'typescript', 'oxc', 'react', 'vitest'],
  jsPlugins: [
    { name: 'anti-slop', specifier: './tools/oxlint/anti-slop/index.ts' },
  ],
  options: {
    denyWarnings: true,
    reportUnusedDisableDirectives: 'error',
  },
  rules: {
    'typescript/no-explicit-any': 'off',
    'react/rules-of-hooks': 'error',
    'react/exhaustive-deps': 'off',
    'react/jsx-no-duplicate-props': 'error',
    'react/immutability': 'off',
    'react/refs': 'off',
    'react/set-state-in-effect': 'off',
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^(_.*|currentUser)$',
        varsIgnorePattern:
          '^(_.*|canEdit|currentUser|expandedMilestoneId|isGradeTeacher|isSETeacher|isSubjectTeacher|otherSubject|requiredYear|refreshData|setExpandedMilestoneId|setObservationResultsStudentId)$',
      },
    ],
    'vitest/no-conditional-expect': 'off',
    'vitest/no-standalone-expect': 'off',
    'vitest/require-mock-type-parameters': 'off',
    'vitest/require-to-throw-message': 'off',
    'vitest/valid-expect': 'off',
    'oxc/no-accumulating-spread': 'off',
    'anti-slop/no-reduce-accumulator-copy': 'off',
    'anti-slop/no-reflect-apply': 'off',
    'anti-slop/no-reflect-get': 'off',
    'anti-slop/no-unknown-type-aliases': 'off',
    'anti-slop/no-widen-then-assert': 'off',
  },
});
