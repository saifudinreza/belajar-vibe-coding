import { afterAll } from "bun:test";
import { pool } from "../src/db";

afterAll(() => pool.end());
