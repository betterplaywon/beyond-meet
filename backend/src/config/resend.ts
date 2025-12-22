/**
 * Resend Email Service Configuration
 */
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('[RESEND] Warning: RESEND_API_KEY not configured. Email verification will be disabled.');
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export default resend;
