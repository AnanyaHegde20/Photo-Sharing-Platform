import { describe, it, expect } from "vitest";
import {
  isValidUUID,
  isValidPin,
  isValidSlug,
  sanitizeString,
  validateEventName,
  validateDescription,
  validateEventDate,
} from "@/lib/validation";

describe("isValidUUID", () => {
  it("accepts valid UUID v4", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects invalid UUIDs", () => {
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false);
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000-extra")).toBe(
      false
    );
    expect(isValidUUID("gggggggg-gggg-gggg-gggg-gggggggggggg")).toBe(false);
  });
});

describe("isValidPin", () => {
  it("accepts valid 6-digit PINs", () => {
    expect(isValidPin("000000")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("999999")).toBe(true);
  });

  it("rejects invalid PINs", () => {
    expect(isValidPin("")).toBe(false);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("abcdef")).toBe(false);
    expect(isValidPin("12-34-56")).toBe(false);
    expect(isValidPin("12 34 56")).toBe(false);
    expect(isValidPin("12345a")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it("accepts valid 24-char alphanumeric slugs", () => {
    expect(isValidSlug("abcdefghijklmnopqrstuvwx")).toBe(true); // 24 lowercase alpha
    expect(isValidSlug("a1b2c3d4e5f6g7h8i9j0k1l2")).toBe(true); // 24 alphanumeric
    expect(isValidSlug("012345678901234567890123")).toBe(true); // 24 digits
  });

  it("rejects invalid slugs", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("short")).toBe(false); // too short
    expect(isValidSlug("abcdefghijklmnopqrstuvwxyz012345")).toBe(false); // 32 chars
    expect(isValidSlug("has spaces in it")).toBe(false);
    expect(isValidSlug("has-special-chars!")).toBe(false);
    expect(isValidSlug("ABCDEFGHIJKLMNOPQRSTUVWXYZ012345")).toBe(false); // uppercase
  });
});

describe("sanitizeString", () => {
  it("trims and truncates", () => {
    expect(sanitizeString("  hello  ", 10)).toBe("hello");
    expect(sanitizeString("hello world", 5)).toBe("hello");
    expect(sanitizeString("hello", 10)).toBe("hello");
  });

  it("handles empty strings", () => {
    expect(sanitizeString("", 10)).toBe("");
    expect(sanitizeString("   ", 10)).toBe("");
  });
});

describe("validateEventName", () => {
  it("accepts valid names", () => {
    expect(validateEventName("Wedding")).toBeNull();
    expect(validateEventName("Arjun & Priya Wedding")).toBeNull();
  });

  it("rejects empty names", () => {
    expect(validateEventName("")).toBe("Event name is required.");
    expect(validateEventName("   ")).toBe("Event name is required.");
  });

  it("rejects names exceeding 200 characters", () => {
    expect(validateEventName("a".repeat(201))).toBe(
      "Event name must be 200 characters or less."
    );
  });

  it("accepts names at exactly 200 characters", () => {
    expect(validateEventName("a".repeat(200))).toBeNull();
  });
});

describe("validateDescription", () => {
  it("accepts valid descriptions", () => {
    expect(validateDescription("")).toBeNull();
    expect(validateDescription("A short description")).toBeNull();
  });

  it("rejects descriptions exceeding 2000 characters", () => {
    expect(validateDescription("a".repeat(2001))).toBe(
      "Description must be 2000 characters or less."
    );
  });

  it("accepts descriptions at exactly 2000 characters", () => {
    expect(validateDescription("a".repeat(2000))).toBeNull();
  });
});

describe("validateEventDate", () => {
  it("accepts null and empty dates", () => {
    expect(validateEventDate(null)).toBeNull();
    expect(validateEventDate("")).toBeNull();
    expect(validateEventDate("   ")).toBeNull();
  });

  it("accepts valid dates", () => {
    expect(validateEventDate("2025-12-25")).toBeNull();
    expect(validateEventDate("2025-01-01T00:00:00")).toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(validateEventDate("not-a-date")).toBe("Please enter a valid date.");
    expect(validateEventDate("2025-13-01")).toBe("Please enter a valid date.");
  });
});
