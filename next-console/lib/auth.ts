import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { Pool } from "pg";

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Public site URL(s) for CSRF / origin checks behind HTTPS ingress. */
function trustedOriginsFromEnv(): string[] | undefined {
  const fromList = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => stripTrailingSlash(s.trim()))
    .filter(Boolean);
  const single = [
    process.env.BETTER_AUTH_URL?.trim(),
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
  ]
    .filter(Boolean)
    .map(stripTrailingSlash);
  const merged = [...new Set([...single, ...fromList])];
  return merged.length > 0 ? merged : undefined;
}

export const auth = betterAuth({
  trustedOrigins: trustedOriginsFromEnv(),
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  user: {
    additionalFields: {
      username: { type: "string", required: false, defaultValue: "" },
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "keycloak",
          discoveryUrl: `${(process.env.KEYCLOAK_ISSUER ?? "").replace(/\/$/, "")}/.well-known/openid-configuration`,
          clientId: process.env.KEYCLOAK_CLIENT_ID!,
          clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
          scopes: ["openid", "profile", "email"],
          mapProfileToUser(profile) {
            return {
              name: profile.name || profile.preferred_username || profile.sub,
              email: profile.email,
              image: profile.picture ?? null,
              username: profile.preferred_username ?? profile.sub ?? "",
            };
          },
        },
      ],
    }),
    nextCookies(),
  ],
});
