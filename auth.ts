import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import { sql } from "@vercel/postgres";
import type { User } from "@/app/lib/definitions";
import bcrypt from "bcrypt";
import { ICreateUser } from "@/app/lib/action";

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
});

// export async function createUser({
//   username,
//   password,
//   email,
// }: {
//   username: string;
//   password: string;
//   email: string;
// }): Promise<User | undefined> {
//   const hashPassword = await bcrypt.hash(password, 10);

//   try {
//     const user =
//       await sql<User>`INSERT INTO USERS (name, email, password) VALUES(${username}, ${email.toLowerCase()}, ${hashPassword})`;

//     return user.rows[0];
//   } catch (error) {
//     console.log("Failed to create new user: ", error);
//     throw new Error("Failed to create new user");
//   }
// }
