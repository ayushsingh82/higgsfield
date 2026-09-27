import { GenerationForm } from "@/components/GenerationForm";

export const metadata = { title: "Cinema Studio" };

export default function StudioPage() {
  return (
    <main className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cinema Studio</h1>
        <p className="mono mt-1 text-sm text-[var(--muted-foreground)]">
          Describe the video you want, then generate.
        </p>
      </div>
      <GenerationForm />
    </main>
  );
}
