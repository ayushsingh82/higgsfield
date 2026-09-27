import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
