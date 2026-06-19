import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://db_user:db_pass@localhost/db_name';

const sql = neon(databaseUrl);
export const db = drizzle({ client: sql, schema });
export type DbType = typeof db;
