import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    return { success: false, error: "Email sudah terdaftar" };
  }

  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
  });

  await db.insert(users).values({ name, email, password: hashedPassword });

  return { success: true };
}
