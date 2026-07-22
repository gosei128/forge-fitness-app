import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

// Opens (or creates) forge.db on the device
export const sqlite = openDatabaseSync('forge.db');

export const db = drizzle(sqlite);