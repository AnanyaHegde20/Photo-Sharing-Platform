import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "gallery_access";
const TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours
const TOKEN_LENGTH = 32;

function getSigningKey(): Uint8Array {
  const secret = process.env.GALLERY_COOKIE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // Fallback: derive from anon key for development only
    const fallback = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dev-fallback-key";
    return crypto.createHash("sha256").update(fallback).digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function sign(data: string): string {
  const key = getSigningKey();
  const hmac = crypto.createHmac("sha256", key).update(data).digest();
  return hmac.toString("base64url");
}

export interface GalleryAccessPayload {
  galleryId: string;
  slug: string;
  token: string;
  expiresAt: number;
}

interface SignedPayload {
  payload: GalleryAccessPayload;
  signature: string;
}

function encodePayload(payload: GalleryAccessPayload): string {
  const payloadStr = JSON.stringify(payload);
  const signature = sign(payloadStr);
  const signed: SignedPayload = { payload, signature };
  return Buffer.from(JSON.stringify(signed)).toString("base64url");
}

function decodePayload(encoded: string): GalleryAccessPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const signed = JSON.parse(json) as SignedPayload;

    if (!signed.payload || !signed.signature) return null;

    // Verify HMAC signature
    const expectedSig = sign(JSON.stringify(signed.payload));
    if (signed.signature !== expectedSig) return null;

    return signed.payload;
  } catch {
    return null;
  }
}

export function generateAccessToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

export async function setGalleryAccessCookie(
  galleryId: string,
  slug: string
): Promise<string> {
  const token = generateAccessToken();
  const payload: GalleryAccessPayload = {
    galleryId,
    slug,
    token,
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  };

  const encoded = encodePayload(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/gallery/${slug}`,
    maxAge: TOKEN_EXPIRY_MS / 1000,
  });

  return token;
}

export async function getGalleryAccessPayload(): Promise<GalleryAccessPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie?.value) return null;

  const payload = decodePayload(cookie.value);
  if (!payload) return null;

  if (Date.now() > payload.expiresAt) {
    return null;
  }

  return payload;
}

export async function verifyGalleryAccess(
  galleryId: string,
  slug: string
): Promise<boolean> {
  const payload = await getGalleryAccessPayload();
  if (!payload) return false;

  return (
    payload.galleryId === galleryId &&
    payload.slug === slug &&
    Date.now() <= payload.expiresAt
  );
}

export async function clearGalleryAccessCookie(slug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: COOKIE_NAME,
    path: `/gallery/${slug}`,
  });
}
