import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI does not read .env by itself, so dotenv loads it here.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
