import React from 'react';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StateCard: React.FC<{
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}> = ({ title, message, action }) => (
  <main className="min-h-screen bg-[#FAF6F0] grid place-items-center px-6">
    <section className="w-full max-w-md rounded-3xl border border-[#E8DEC7] bg-[#FFFDF9] p-8 text-center shadow-xl">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#6E161E] text-white">
        <LockKeyhole className="h-7 w-7" />
      </div>
      <h1 className="font-heading text-2xl font-black text-stone-900">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-6 w-full rounded-xl bg-[#6E161E] px-4 py-3 text-sm font-bold text-white hover:bg-[#541017]"
        >
          {action.label}
        </button>
      )}
    </section>
  </main>
);

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { status, login, retry } = useAuth();

  if (status === 'loading') {
    return (
      <main
        className="min-h-screen bg-[#FAF6F0] grid place-items-center"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-stone-700">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Verifying your secure session…
        </div>
      </main>
    );
  }
  if (status === 'anonymous') {
    return (
      <StateCard
        title="Sign in to Learnspace"
        message="Use your approved Google Workspace account. Your access and role are assigned by the school, not by this browser."
        action={{ label: 'Continue with Google', onClick: login }}
      />
    );
  }
  if (status === 'disabled') {
    return (
      <StateCard
        title="Account disabled"
        message="This account has been disabled. Contact your Learnspace administrator if you believe this is an error."
      />
    );
  }
  if (status === 'denied') {
    return (
      <StateCard
        title="Access denied"
        message="Your Google identity was verified, but it has not been admitted to this Learnspace environment."
        action={{ label: 'Try another account', onClick: login }}
      />
    );
  }
  if (status === 'error') {
    return (
      <StateCard
        title="Unable to verify session"
        message="Learnspace could not reach the authentication service. No application data was loaded."
        action={{ label: 'Try again', onClick: () => void retry() }}
      />
    );
  }
  return <>{children}</>;
};
