import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  poolSize: 20,
  connectTimeoutMS: 30000,
  extra: {
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
  },
});
