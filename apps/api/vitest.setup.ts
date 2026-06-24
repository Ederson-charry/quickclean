import { config } from "dotenv";

// Carga apps/api/.env (cwd = apps/api al correr vitest) para que PrismaClient
// y demás servicios lean DATABASE_URL / JWT_SECRET durante los tests.
config();
