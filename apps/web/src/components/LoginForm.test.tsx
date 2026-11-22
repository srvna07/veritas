import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { jsonResponse, lastRequest, mockFetch } from './test-utils';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe('LoginForm', () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('shows validation errors and does not call the API for empty input', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/dashboard" />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts normalized credentials to the versioned endpoint and navigates on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ user: { id: '1' } }));
    const user = userEvent.setup();
    render(<LoginForm next="/projects" />);

    await user.type(screen.getByLabelText('Email'), '  Asha@Example.COM ');
    await user.type(screen.getByLabelText('Password'), 'Passw0rdok');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/projects'));
    expect(refresh).toHaveBeenCalled();
    expect(lastRequest(fetchMock)).toEqual({
      url: '/api/v1/auth/login',
      method: 'POST',
      body: { email: 'asha@example.com', password: 'Passw0rdok' },
    });
  });

  it('shows the server error and stays on the page for invalid credentials', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401),
    );
    const user = userEvent.setup();
    render(<LoginForm next="/dashboard" />);

    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows a friendly message when the network fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    render(<LoginForm next="/dashboard" />);

    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'Passw0rdok');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(/Unable to reach the server/)).toBeInTheDocument();
  });

  it('links to forgot password and shows the reset confirmation', () => {
    render(<LoginForm next="/dashboard" passwordReset />);
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByText(/Your password was updated/)).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginForm next="/dashboard" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
