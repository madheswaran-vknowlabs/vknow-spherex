import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { logAuditEvent } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@vknowlabs.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password");
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email.toLowerCase() }).select("+password");

        if (!user) {
          await logAuditEvent({
            actor: { name: credentials.email, role: "user", email: credentials.email },
            action: "FAILED_LOGIN",
            entityType: "Auth",
            entityId: null,
            after: { reason: "User not found" },
          });
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          await logAuditEvent({
            actor: { userId: user._id.toString(), name: user.name, role: user.role, email: user.email },
            action: "FAILED_LOGIN",
            entityType: "Auth",
            entityId: user._id.toString(),
            after: { reason: "Account deactivated" },
          });
          throw new Error("Your account has been deactivated. Please contact an admin.");
        }

        if (!user.password) {
          throw new Error("Please sign in with your SSO / Google account");
        }

        const isMatch = await bcrypt.compare(credentials.password, user.password);

        if (!isMatch) {
          await logAuditEvent({
            actor: { userId: user._id.toString(), name: user.name, role: user.role, email: user.email },
            action: "FAILED_LOGIN",
            entityType: "Auth",
            entityId: user._id.toString(),
            after: { reason: "Incorrect password" },
          });
          throw new Error("Invalid email or password");
        }

        await logAuditEvent({
          actor: { userId: user._id.toString(), name: user.name, role: user.role, email: user.email },
          action: "LOGIN",
          entityType: "Auth",
          entityId: user._id.toString(),
          after: { loginType: "credentials" },
        });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          avatar: user.avatar,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
        token.department = (user as any).department;
        token.avatar = (user as any).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as "admin" | "manager" | "employee" | "user";
        (session.user as any).department = token.department as string;
        (session.user as any).avatar = token.avatar as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "spherex_fallback_secret_key_change_me",
};

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user as
    | {
        id: string;
        name: string;
        email: string;
        role: "admin" | "manager" | "employee" | "user";
        department?: string;
        avatar?: string;
      }
    | null;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Response(
      JSON.stringify({ error: "Forbidden. Admin privileges required." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}

export async function requireAdminOrManager() {
  const user = await requireAuth();
  if (user.role !== "admin" && user.role !== "manager") {
    throw new Response(
      JSON.stringify({ error: "Forbidden. Admin or Manager privileges required." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}
