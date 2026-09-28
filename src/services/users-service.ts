import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, sessions } from "../db/schema";

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

export async function loginUser(
  email: string,
  password: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    return { success: false, error: "Email atau password salah" };
  }

  const valid = await Bun.password.verify(password, user.password);

  if (!valid) {
    return { success: false, error: "Email atau password salah" };
  }

  const token = crypto.randomUUID();

  await db.insert(sessions).values({ token, userId: user.id });

  return { success: true, token };
}

export async function getCurrentUser(token: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token));

  return user ?? null;
}

export async function logoutUser(token: string): Promise<boolean> {
  const [result] = await db.delete(sessions).where(eq(sessions.token, token));

  return result.affectedRows > 0;
}
