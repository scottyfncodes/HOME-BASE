import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/core/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://unset:unset@localhost:5432/unset",
  },
  strict: true,
  verbose: true,
});
