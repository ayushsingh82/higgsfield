import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="mb-6 text-2xl font-semibold">Sign up</h1>
        <SignupForm />
      </div>
    </main>
  );
}
