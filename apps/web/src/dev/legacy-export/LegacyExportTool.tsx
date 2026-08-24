import { useState } from 'react';
import {
  LegacyExportError,
  buildLegacyExport,
  downloadLegacyExport,
} from './legacyStorageReader';

export default function LegacyExportTool() {
  const [organizationId, setOrganizationId] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const validate = (download: boolean) => {
    try {
      const document = buildLegacyExport(window.localStorage, {
        applicationVersion: __APP_VERSION__,
        targetOrganizationId: organizationId.trim() || null,
      });
      setErrors([]);
      setReady(true);
      if (download) downloadLegacyExport(document);
    } catch (error) {
      setReady(false);
      setErrors(
        error instanceof LegacyExportError
          ? [error.message, ...error.issues]
          : ['Unexpected export failure.'],
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-3xl rounded-2xl border border-amber-500/60 bg-slate-900 p-8 shadow-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-amber-400">
          Development-only migration utility
        </p>
        <h1 className="text-3xl font-bold">Legacy browser data export</h1>
        <div className="mt-6 rounded-xl border border-red-500 bg-red-950/50 p-5 text-red-100">
          <strong>Sensitive output:</strong> the downloaded file may contain
          student, guardian, disability, accommodation, observation, IEP, and
          staff data. Store it only in an approved encrypted location and never
          send it through chat, email, analytics, or support tools.
        </div>
        <p className="mt-6 text-slate-300">
          This page reads this browser&apos;s legacy <code>localStorage</code>,
          validates a versioned <code>learnspace-export</code> document, and
          downloads it locally. It does not transmit the data.
        </p>
        <label
          className="mt-6 block font-medium"
          htmlFor="target-organization-id"
        >
          Target organization UUID (optional during extraction)
        </label>
        <input
          id="target-organization-id"
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => validate(false)}
            className="rounded-lg bg-slate-700 px-5 py-3 font-semibold hover:bg-slate-600"
          >
            Validate only
          </button>
          <button
            type="button"
            onClick={() => validate(true)}
            className="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400"
          >
            Validate and download sensitive export
          </button>
        </div>
        {ready && (
          <p className="mt-5 rounded-lg border border-emerald-500 bg-emerald-950/40 p-4 text-emerald-200">
            Export validation succeeded.
          </p>
        )}
        {errors.length > 0 && (
          <div className="mt-5 rounded-lg border border-red-500 bg-red-950/40 p-4">
            <h2 className="font-semibold text-red-200">Export blocked</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-100">
              {errors.map((error, index) => (
                <li key={`${index}-${error}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
