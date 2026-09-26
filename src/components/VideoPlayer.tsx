export function VideoPlayer({ src }: { src: string }) {
  return <video src={src} controls className="w-full rounded-sm border border-[var(--line)]" />;
}
