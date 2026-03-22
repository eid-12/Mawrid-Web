/**
 * Saudi Arabia phone number validation and formatting
 * Valid formats: 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX
 */

export const SAUDI_PHONE_REGEX = /^(05|5|(\+9665)|(009665))[0-9]{8}$/;

export const SAUDI_PHONE_ERROR = 'Please enter a valid Saudi phone number (e.g., 05xxxxxxxx).';

export function isValidSaudiPhone(value: string | null | undefined): boolean {
  if (value == null || value.trim() === '') return false;
  const normalized = value.trim().replace(/\s/g, '');
  return SAUDI_PHONE_REGEX.test(normalized);
}

/**
 * Format for display as user types: 05X XXX XXXX
 * Accepts digits only; normalizes to 05XXXXXXXX format.
 * Allows full deletion - single "5" is NOT auto-prefixed so user can clear the field.
 */
export function maskSaudiPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';

  let normalized = digits;
  if (digits.startsWith('9665') && digits.length >= 12) {
    normalized = '0' + digits.slice(3, 12);
  } else if (digits.startsWith('009665') && digits.length >= 14) {
    normalized = '0' + digits.slice(4, 13);
  } else if (digits.startsWith('5') && !digits.startsWith('05') && digits.length > 1 && digits.length <= 9) {
    // Only prefix "0" when multiple digits - allow single "5" so user can delete it
    normalized = '0' + digits;
  } else if (!digits.startsWith('05') && digits.startsWith('0') && digits.length > 1) {
    normalized = digits;
  } else if (digits.startsWith('5') && digits.length > 1) {
    normalized = '0' + digits.slice(0, 9);
  }
  const ten = normalized.slice(0, 10);
  if (ten.length <= 3) return ten;
  // 05X XXX XXXX - keep structure when deleting (e.g. 053 195 -> 053 19, not 05 319)
  if (ten.length <= 6) return `${ten.slice(0, 3)} ${ten.slice(3)}`;
  return `${ten.slice(0, 3)} ${ten.slice(3, 6)} ${ten.slice(6)}`;
}

/**
 * Normalize to 05XXXXXXXX for API (10 digits)
 */
export function normalizeSaudiPhoneForApi(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('9665') && digits.length >= 12) return '0' + digits.slice(3, 12);
  if (digits.startsWith('009665') && digits.length >= 14) return '0' + digits.slice(4, 13);
  if (digits.startsWith('5') && digits.length === 9) return '0' + digits;
  if (digits.startsWith('05') && digits.length === 10) return digits;
  return digits.slice(0, 10);
}
