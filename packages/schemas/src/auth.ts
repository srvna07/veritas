import { z } from 'zod';
import { roleSchema } from './roles';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'));

/**
 * Length matters more than composition rules (NIST SP 800-63B), but we still require a letter
 * and a digit to block the most trivial choices. Max length caps hashing cost (DoS guard).
 */
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/[0-9]/, 'Include at least one number');

const nameSchema = z.string().trim().min(1, 'Name is required').max(80, 'Name is too long');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'Invalid reset link').max(200, 'Invalid reset link'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateUserRoleSchema = z.object({
  userId: z.uuid(),
  role: roleSchema,
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
