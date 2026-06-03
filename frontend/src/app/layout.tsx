import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "drive-pleya",
  description: "personal video streaming from google drive",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* navbar */}
        <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur">
          <nav className="container-main flex items-center gap-6 h-14">
            <a
              href="/"
              className="text-lg font-semibold tracking-tight text-text hover:text-brand transition-colors"
            >
              drive-pleya
            </a>
          </nav>
        </header>

        {/* main content */}
        <main className="flex-1 container-main py-6">{children}</main>
      </body>
    </html>
  );
}
