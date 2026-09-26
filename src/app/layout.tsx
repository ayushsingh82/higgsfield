import type { ReactNode } from "react";

export const metadata = {
  title: "higgsfield",
  description: "Prompt-to-video, one core loop, done well.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
