const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PIN_REGEX = /^\d{6}$/;
const SLUG_REGEX = /^[a-z0-9]{24}$/;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isValidPin(value: string): boolean {
  return PIN_REGEX.test(value);
}

export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value);
}

export function sanitizeString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function validateEventName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Event name is required.";
  if (trimmed.length > 200) return "Event name must be 200 characters or less.";
  return null;
}

export function validateDescription(description: string): string | null {
  if (description.trim().length > 2000) return "Description must be 2000 characters or less.";
  return null;
}

export function validateEventDate(date: string | null): string | null {
  if (!date || date.trim().length === 0) return null;
  if (isNaN(Date.parse(date))) return "Please enter a valid date.";
  return null;
}
