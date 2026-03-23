import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { Pool } from "pg";

export const auth = betterAuth({
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
