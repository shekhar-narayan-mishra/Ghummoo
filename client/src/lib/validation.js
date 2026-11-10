// Shared form rules. They mirror the server (server/src/utils/text.js), which is the real check.

// An optional leading +, then 8-17 digits, spaces or hyphens, e.g. +91 98765 43210.
export const PHONE_PATTERN = /^[+\d][\d\s-]{7,16}$/;
export const PHONE_MAX_LENGTH = 17; // the longest string PHONE_PATTERN accepts
export const EMERGENCY_CONTACT_MAX_LENGTH = 120;

export const isPhone = (value) => PHONE_PATTERN.test(String(value ?? '').trim());

// For optional phone fields: blank is fine, anything else must look like a phone number.
export const optionalPhoneError = (value) =>
  String(value ?? '').trim() && !isPhone(value) ? 'Enter a valid phone number, e.g. +91 98765 43210' : undefined;
