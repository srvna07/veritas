import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LogoutButton } from './LogoutButton';
import { ResetPasswordForm } from './ResetPasswordForm';
import { jsonResponse, lastRequest, mockFetch } from './test-utils';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe('recovery and session components', () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('ForgotPasswordForm', () => {
    it('validates the email before calling the API', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText('Email'), 'not-an-email');
      await user.click(screen.getByRole('button', { name: 'Send reset link' }));

      expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('shows a neutral confirmation after submitting', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'ok' }));
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText('Email'), 'Asha@Example.com');
      await user.click(screen.getByRole('button', { name: 'Send reset link' }));

      expect(await screen.findByRole('status')).toHaveTextContent('If an account exists for asha@example.com');
      expect(lastRequest(fetchMock)).toEqual({
        url: '/api/v1/auth/forgot-password',
        method: 'POST',
        body: { email: 'asha@example.com' },
      });
    });

    it('surfaces rate limiting errors', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } }, 429),
      );
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText('Email'), 'asha@example.com');
      await user.click(screen.getByRole('button', { name: 'Send reset link' }));

      expect(await screen.findByText('Too many attempts. Please try again later.')).toBeInTheDocument();
    });
  });

  describe('ResetPasswordForm', () => {
    it('submits the token with the new password and returns to login', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'done' }));
      const user = userEvent.setup();
      render(<ResetPasswordForm token="abc-token" />);

      await user.type(screen.getByLabelText('New password'), 'BrandNew123');
      await user.type(screen.getByLabelText('Confirm new password'), 'BrandNew123');
      await user.click(screen.getByRole('button', { name: 'Update password' }));

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?reset=1'));
      expect(lastRequest(fetchMock)).toEqual({
        url: '/api/v1/auth/reset-password',
        method: 'POST',
        body: { token: 'abc-token', password: 'BrandNew123' },
      });
    });

    it('requires matching passwords', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="abc-token" />);

      await user.type(screen.getByLabelText('New password'), 'BrandNew123');
      await user.type(screen.getByLabelText('Confirm new password'), 'Mismatch123');
      await user.click(screen.getByRole('button', { name: 'Update password' }));

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('offers a new link when the token is invalid or expired', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'This reset link is invalid or has expired' } },
          400,
        ),
      );
      const user = userEvent.setup();
      render(<ResetPasswordForm token="stale" />);

      await user.type(screen.getByLabelText('New password'), 'BrandNew123');
      await user.type(screen.getByLabelText('Confirm new password'), 'BrandNew123');
      await user.click(screen.getByRole('button', { name: 'Update password' }));

      expect(await screen.findByRole('link', { name: 'Request a new link' })).toHaveAttribute(
        'href',
        '/forgot-password',
      );
      expect(replace).not.toHaveBeenCalled();
    });
  });

  describe('LogoutButton', () => {
    it('calls the logout endpoint and returns to login', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'Signed out' }));
      const user = userEvent.setup();
      render(<LogoutButton />);

      await user.click(screen.getByRole('button', { name: 'Log out' }));

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
      expect(refresh).toHaveBeenCalled();
      expect(lastRequest(fetchMock).url).toBe('/api/v1/auth/logout');
    });

    it('stays on the page and shows an error if logout fails', async () => {
      fetchMock.mockRejectedValue(new TypeError('offline'));
      const user = userEvent.setup();
      render(<LogoutButton />);

      await user.click(screen.getByRole('button', { name: 'Log out' }));

      expect(await screen.findByText(/Unable to reach the server/)).toBeInTheDocument();
      expect(replace).not.toHaveBeenCalled();
    });
  });
});
