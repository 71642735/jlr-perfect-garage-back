import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = createPool({
	port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
	host: process.env.DB_HOST ?? '',
	user: process.env.DB_USER ?? '',
	password: process.env.DB_PWD ?? '',
	database: process.env.MYSQL_DB ?? '',
	connectionLimit: 50,
});

