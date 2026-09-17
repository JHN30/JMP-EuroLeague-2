import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  DB_URL: process.env.DB_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
};
