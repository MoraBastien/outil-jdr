import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/accueil");

  return (
    <main className="login">
      <div className="card login-card">
        <h1 className="title">Outils de la table</h1>
        <p className="muted">Entre le code que ton MJ t&apos;a donné.</p>
        <LoginForm />
      </div>
    </main>
  );
}
