import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from './SignupForm';
import { jsonResponse, lastRequest, mockFetch } from './test-utils';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  values: { name?: string; email?: string; password?: string; confirm?: string },
) {
  await user.type(screen.getByLabelText('Full name'), values.name ?? 'Asha Rao');
  await user.type(screen.getByLabelText('Email'), values.email ?? 'asha@example.com');
  await user.type(screen.getByLabelText('Password'), values.password ?? 'Passw0rdok');
  await user.type(screen.getByLabelText('Confirm password'), values.confirm ?? values.password ?? 'Passw0rdok');
}

describe('SignupForm', () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('blocks submission when the passwords differ', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillForm(user, { confirm: 'Different123' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a weak password client-side', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillForm(user, { password: 'abcdefgh' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must contain at least one letter and one number')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends only name, email, and password, then goes to the dashboard', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ user: { id: '1', role: 'contributor' } }, 201));
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillForm(user, {});
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(lastRequest(fetchMock)).toEqual({
      url: '/api/v1/auth/signup',
      method: 'POST',
      body: { name: 'Asha Rao', email: 'asha@example.com', password: 'Passw0rdok' },
    });
  });

  it('shows the server message when the email is already registered', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' } },
        409,
      ),
    );
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillForm(user, {});
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('maps server validation details onto the matching field', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The request contains invalid data',
            details: { email: ['Enter a valid email address'] },
          },
        },
        422,
      ),
    );
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillForm(user, {});
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('tells the user which role new accounts receive', () => {
    render(<SignupForm />);
    expect(screen.getByText(/join as a Contributor/)).toBeInTheDocument();
  });
});
