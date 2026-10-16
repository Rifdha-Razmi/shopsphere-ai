export type UserRole = "customer" | "admin";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar: string | null;
  role: UserRole;
  /** "dummyjson" users authenticate through the API; "local" users were registered in this browser. */
  source: "dummyjson" | "local" | "seed";
}

/**
 * A JWT-shaped session object (PRD §11.2). The token is a locally minted,
 * unsigned JWT-like string so the client code is shaped exactly like it would
 * be against a real auth backend.
 */
export interface Session {
  token: string;
  user: User;
  issuedAt: number;
  expiresAt: number;
}

export interface LocalUserRecord extends User {
  /** SHA-256 hash (hex) of the password — see services/auth for the dev-stage caveat. */
  passwordHash: string;
  createdAt: string;
}
