// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Vibro Acoustic Therapy",
  description: "Binaural beat generator, curated sound pads and a session timeline for vibro-acoustic sound therapy",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
