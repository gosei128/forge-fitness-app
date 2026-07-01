import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './db/schema.ts',  // where you define your tables
    out: './drizzle',          // where migrations get generated
    dialect: 'sqlite',
    driver: 'expo',
});