import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";
import { readConfig } from "../../config.js";

const config = readConfig();

// Node local dev: disable ssl
const conn = postgres(config.dbUrl, { ssl: false });

export const db = drizzle(conn, { schema });