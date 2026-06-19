import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://placeholder-user:placeholder-pass@localhost/placeholder-db';

const sql = neon(databaseUrl);
export const db = drizzle({ client: sql, schema });
export type DbType = typeof db;
