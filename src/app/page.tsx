import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (role === "admin") {
    redirect("/dashboard");
  } else if (role === "manager") {
    redirect("/dashboard");
  } else {
    redirect("/daily-update");
  }
}

