import dotenv from 'dotenv';
import Server from '@/server/server';

process.env.NODE_ENV = 'test';
dotenv.config();

const server = new Server();

export default server.getApp();
