// src/lib/supabase/server.ts
import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { envConfig, hasSupabaseConfig } from "@/lib/env-config";
import { demoCredentials } from "@/lib/mock/users";
import type { UserRole } from "@/lib/types";
import { ApiError } from "@/lib/api/errors";

export interface AuthenticatedActor {
  id: string;
  email: string;
  displayName: string;
  role: UserRole | "super_admin";
  isDemoAccount: boolean;
}

const DEMO_USER_IDS: Record<string, string> = {
  [demoCredentials.bpbd.email]: "00000000-0000-4000-8000-000000000001",
  [demoCredentials.warga.email]: "00000000-0000-4000-8000-000000000002",
};

/**
 * Membuat Supabase Server Client terikat cookie request aktif (Next.js 15 async cookies).
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(
    envConfig.supabase.url,
    envConfig.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Pemanggilan setAll dari Server Component diabaikan dengan aman
          }
        },
      },
    },
  );
}

/**
 * Memvalidasi sesi pengguna dari Supabase Auth + tabel `public.profiles`.
 * Jika Supabase belum dikonfigurasi atau pengguna masuk memakai akun demo Judge Mode,
 * memverifikasi header `x-demo-user-email` secara ketat terhadap `demoCredentials` resmi.
 */
export async function getServerActor(
  request?: Request,
): Promise<AuthenticatedActor | null> {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .maybeSingle();

      const rawRole = (profile?.role as string | undefined) ?? "citizen";
      const validRole: AuthenticatedActor["role"] =
        rawRole === "bpbd_admin" ||
        rawRole === "community" ||
        rawRole === "super_admin"
          ? rawRole
          : "citizen";

      return {
        id: user.id,
        email: user.email ?? "",
        displayName:
          (profile?.display_name as string | undefined) ??
          user.email ??
          "Pengguna",
        role: validRole,
        isDemoAccount: Boolean(
          user.email && DEMO_USER_IDS[user.email] !== undefined,
        ),
      };
    }
  }

  if (request) {
    const demoEmail = request.headers.get("x-demo-user-email")?.trim();
    if (demoEmail) {
      const match = Object.values(demoCredentials).find(
        (c) => c.email === demoEmail,
      );
      if (match) {
        return {
          id: DEMO_USER_IDS[match.email] ?? "00000000-0000-4000-8000-000000000099",
          email: match.email,
          displayName: match.displayName,
          role: match.role,
          isDemoAccount: true,
        };
      }
    }
  }

  return null;
}

/**
 * Memastikan request berasal dari pengguna terautentikasi dan memiliki salah satu role yang diizinkan.
 */
export async function requireServerRole(
  request: Request,
  allowedRoles?: Array<UserRole | "super_admin">,
): Promise<AuthenticatedActor> {
  const actor = await getServerActor(request);
  if (!actor) {
    throw new ApiError(
      "UNAUTHORIZED",
      "Autentikasi diperlukan untuk mengakses tindakan ini",
    );
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(actor.role)
  ) {
    throw new ApiError(
      "FORBIDDEN",
      "Peran akun Anda tidak memiliki izin untuk melakukan tindakan ini",
    );
  }

  return actor;
}