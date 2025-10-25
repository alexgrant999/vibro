// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Vibro Acoustic App",
  description: "12-button vibro acoustic pad player",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
