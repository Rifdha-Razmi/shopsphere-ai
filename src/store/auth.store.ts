import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LocalUserRecord, Session, User } from "@/types";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/constants";
import { authenticate, createSession, isSessionValid, refreshSession, registerUser, type RegistrationInput } from "@/services/auth/auth.service";
import { setAuthTokenProvider } from "@/services/api/http";

const TTL_MS = env.sessionTtlMinutes * 60_000;
/** Don't rewrite storage on every keystroke — refresh at most once a minute. */
const TOUCH_THROTTLE_MS = 60_000;

interface AuthState {
  session: Session | null;
  users: LocalUserRecord[];
  /** Set when a session lapses so the sign-in redirect can say why (see RequireAuth). */
  expiredReason: "inactivity" | null;
  login: (identifier: string, password: string) => Promise<User>;
  register: (input: RegistrationInput) => Promise<User>;
  logout: () => void;
  /** Sliding expiry on user activity. */
  touch: () => void;
  /** Ends the session because of inactivity (keeps all local state, e.g. checkout progress). */
  expire: () => void;
  updateUser: (patch: Partial<Pick<User, "firstName" | "lastName" | "email" | "phone" | "avatar">>) => void;
  clearExpiredReason: () => void;
}

function writeCookie(session: Session | null) {
  if (typeof document === "undefined") return;
  // Non-sensitive mirror (role + expiry) so the edge proxy can redirect unauthenticated
  // requests before render. The token itself is never placed in a cookie.
  if (session) {
    const value = encodeURIComponent(`${session.user.role}.${session.expiresAt}`);
    document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${Math.ceil((session.expiresAt - Date.now()) / 1000)}; samesite=lax`;
  } else {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      users: [],
      expiredReason: null,

      login: async (identifier, password) => {
        const user = await authenticate(identifier, password, get().users);
        // Prefer any locally edited profile for this user.
        const local = get().users.find((u) => u.id === user.id);
        const merged = local ? { ...user, firstName: local.firstName, lastName: local.lastName, phone: local.phone, avatar: local.avatar } : user;
        const session = createSession(merged, TTL_MS);
        set({ session, expiredReason: null });
        writeCookie(session);
        return merged;
      },

      register: async (input) => {
        const record = await registerUser(input, get().users);
        const { passwordHash: _hash, createdAt: _created, ...user } = record;
        const session = createSession(user, TTL_MS);
        set({ users: [...get().users, record], session, expiredReason: null });
        writeCookie(session);
        return user;
      },

      logout: () => {
        set({ session: null, expiredReason: null });
        writeCookie(null);
      },

      touch: () => {
        const { session } = get();
        if (!isSessionValid(session)) return;
        if (Date.now() - (session.expiresAt - TTL_MS) < TOUCH_THROTTLE_MS) return;
        const next = refreshSession(session, TTL_MS);
        set({ session: next });
        writeCookie(next);
      },

      expire: () => {
        set({ session: null, expiredReason: "inactivity" });
        writeCookie(null);
      },

      updateUser: (patch) => {
        const { session, users } = get();
        if (!session) return;
        const user = { ...session.user, ...patch };
        const exists = users.some((u) => u.id === user.id);
        set({
          session: { ...session, user },
          users: exists
            ? users.map((u) => (u.id === user.id ? { ...u, ...patch } : u))
            : // Keep profile edits for API/seed users too (no password stored for them).
              [...users, { ...user, passwordHash: "", createdAt: new Date().toISOString() }],
        });
      },

      clearExpiredReason: () => set({ expiredReason: null }),
    }),
    {
      name: "ss-auth",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ session: s.session, users: s.users, expiredReason: s.expiredReason }),
      onRehydrateStorage: () => (state) => {
        if (state && state.session && !isSessionValid(state.session)) {
          state.session = null;
          state.expiredReason = "inactivity";
        }
        writeCookie(state?.session ?? null);
      },
    },
  ),
);

setAuthTokenProvider(() => {
  const session = useAuthStore.getState().session;
  return isSessionValid(session) ? session.token : null;
});

export const selectUser = (s: AuthState) => s.session?.user ?? null;
export const selectIsAdmin = (s: AuthState) => s.session?.user.role === "admin";
