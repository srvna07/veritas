import { z } from 'zod';
import { emailSchema, loginSchema, nameSchema, passwordSchema } from '@veritas/schemas';

const passwordsMatch = (value: { password: string; confirmPassword: string }) =>
  value.password === value.confirmPassword;

const mismatch = { message: 'Passwords do not match', path: ['confirmPassword'] };

export const loginFormSchema = loginSchema;

export const signupFormSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine(passwordsMatch, mismatch);

export const forgotPasswordFormSchema = z.object({ email: emailSchema });

export const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine(passwordsMatch, mismatch);

export type LoginFormInput = z.input<typeof loginFormSchema>;
export type LoginFormOutput = z.output<typeof loginFormSchema>;
export type SignupFormInput = z.input<typeof signupFormSchema>;
export type SignupFormOutput = z.output<typeof signupFormSchema>;
export type ForgotPasswordFormInput = z.input<typeof forgotPasswordFormSchema>;
export type ForgotPasswordFormOutput = z.output<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormInput = z.input<typeof resetPasswordFormSchema>;
export type ResetPasswordFormOutput = z.output<typeof resetPasswordFormSchema>;
