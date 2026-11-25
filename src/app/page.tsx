import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";
import PageMain from "@/components/PageMain";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/accueil");

  return (
    <PageMain className="login">
      <div className="card login-card">
        <span className="login-mark" aria-hidden="true">
          ✦
        </span>
        <div className="stack-xs">
          <h1 className="title">Le Navire</h1>
          <p className="muted">Entre le code que ton MJ t&apos;a donné.</p>
        </div>
        <LoginForm />
      </div>
    </PageMain>
  );
}
