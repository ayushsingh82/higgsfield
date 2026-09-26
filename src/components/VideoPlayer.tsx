export function VideoPlayer({ src }: { src: string }) {
  return <video src={src} controls />;
}
