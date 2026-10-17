import type { LocalUserRecord, Session, User } from "@/types";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { ApiError } from "@/services/api/http";
import { loginWithDummyJson } from "@/services/api/users.api";
import { createId } from "@/utils/id";

/**
 * Development-stage authentication (PRD §11). Shaped like a JWT backend:
 * login issues a token-like session object with an expiry, the HTTP client
 * attaches it to authenticated calls, and the session expires on inactivity.
 *
 * Caveat (documented in README): passwords for locally registered users are
 * SHA-256 hashed in the browser. That is NOT production-grade — real systems
 * hash server-side with a slow KDF (bcrypt/argon2) behind an identity provider.
 */

export class AuthError extends Error {
  readonly field: "identifier" | "password" | "email" | "form";
  constructor(field: AuthError["field"], message: string) {
    super(message);
    this.name = "AuthError";
    this.field = field;
  }
}

const SEED_USERS: (User & { password: string })[] = [
  {
    id: "seed_customer",
    username: "customer",
    email: DEMO_ACCOUNTS.customer.email,
    password: DEMO_ACCOUNTS.customer.password,
    firstName: "Asha",
    lastName: "Raman",
    phone: "9876543210",
    avatar: null,
    role: "customer",
    source: "seed",
  },
  {
    id: "seed_admin",
    username: "admin",
    email: DEMO_ACCOUNTS.admin.email,
    password: DEMO_ACCOUNTS.admin.password,
    firstName: "Arjun",
    lastName: "Menon",
    phone: "9123456780",
    avatar: null,
    role: "admin",
    source: "seed",
  },
];

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`shopsphere:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64url(input: string): string {
  const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(input))) : Buffer.from(input).toString("base64");
  return b64.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString();
}

export interface TokenPayload {
  sub: string;
  role: User["role"];
  iat: number;
  exp: number;
  jti: string;
}

/** Mints an unsigned, JWT-shaped token (header.payload.signature). */
export function createToken(user: User, ttlMs: number, now = Date.now()): string {
  const header = base64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload: TokenPayload = { sub: user.id, role: user.role, iat: Math.floor(now / 1000), exp: Math.floor((now + ttlMs) / 1000), jti: createId("jti") };
  return `${header}.${base64url(JSON.stringify(payload))}.dev-unsigned`;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split(".");
    const parsed = JSON.parse(fromBase64url(payload)) as TokenPayload;
    return typeof parsed.exp === "number" && typeof parsed.sub === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function createSession(user: User, ttlMs: number, now = Date.now()): Session {
  return { token: createToken(user, ttlMs, now), user, issuedAt: now, expiresAt: now + ttlMs };
}

export function isSessionValid(session: Session | null, now = Date.now()): session is Session {
  if (!session) return false;
  const payload = decodeToken(session.token);
  return !!payload && session.expiresAt > now && payload.sub === session.user.id;
}

/** Sliding expiry: activity extends the session (inactivity timeout). */
export function refreshSession(session: Session, ttlMs: number, now = Date.now()): Session {
  return { ...session, token: createToken(session.user, ttlMs, now), expiresAt: now + ttlMs };
}

function stripPassword<T extends User>(user: T): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    source: user.source,
  };
}

/**
 * Resolves credentials in order: seeded demo accounts → users registered in
 * this browser → DummyJSON's /auth/login (accepts a DummyJSON username).
 */
export async function authenticate(identifier: string, password: string, localUsers: LocalUserRecord[]): Promise<User> {
  const id = identifier.trim().toLowerCase();
  if (!id) throw new AuthError("identifier", "Enter your email or username.");
  if (!password) throw new AuthError("password", "Enter your password.");

  const seed = SEED_USERS.find((u) => u.email === id || u.username === id);
  if (seed) {
    if (seed.password !== password) throw new AuthError("password", "That password is incorrect.");
    return stripPassword(seed);
  }

  // Records without a hash are profile edits of seed/API users, not credentials.
  const local = localUsers.find((u) => u.passwordHash && (u.email.toLowerCase() === id || u.username.toLowerCase() === id));
  if (local) {
    if ((await hashPassword(password)) !== local.passwordHash) throw new AuthError("password", "That password is incorrect.");
    return stripPassword(local);
  }

  if (id.includes("@")) throw new AuthError("identifier", "No account found with that email. Check the spelling or create an account.");

  try {
    return await loginWithDummyJson(id, password);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 401 || error.kind === "unauthorized")) {
      throw new AuthError("form", "Username or password is incorrect.");
    }
    if (error instanceof ApiError && (error.kind === "network" || error.kind === "timeout")) {
      throw new AuthError("form", "We couldn't reach the sign-in service. Check your connection and try again.");
    }
    throw new AuthError("form", "Sign-in failed. Please try again.");
  }
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export async function registerUser(input: RegistrationInput, localUsers: LocalUserRecord[]): Promise<LocalUserRecord> {
  const email = input.email.trim().toLowerCase();
  if (SEED_USERS.some((u) => u.email === email) || localUsers.some((u) => u.email.toLowerCase() === email)) {
    throw new AuthError("email", "An account with this email already exists. Try signing in.");
  }
  return {
    id: createId("usr"),
    username: email.split("@")[0],
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone.trim(),
    avatar: null,
    role: "customer",
    source: "local",
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
}

export function seedUsers(): User[] {
  return SEED_USERS.map(stripPassword);
}
