import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthGate } from '@/src/features/auth/components/AuthGate';
import { useAuth } from '@/src/features/auth/context/AuthContext';

vi.mock('@/src/features/auth/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('AuthGate shared authentication states', () => {
  it('uses Hub wording and returns denied users directly to Hub', () => {
    const backToHub = vi.fn();
    const login = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      status: 'denied',
      isSharedSession: true,
      backToHub,
      login,
      retry: vi.fn(),
    } as never);

    render(<AuthGate>protected</AuthGate>);

    expect(screen.getByText(/MWS identity was verified/i)).toBeVisible();
    expect(screen.queryByText(/Google/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /return to MWS Hub/i }));
    expect(backToHub).toHaveBeenCalledOnce();
    expect(login).not.toHaveBeenCalled();
  });
});
