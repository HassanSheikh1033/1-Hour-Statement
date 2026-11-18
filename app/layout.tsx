import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Post Scheduler",
  description: "Generate on-brand social captions with Gemini, schedule them in Supabase, and get email reminders.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <Toaster richColors closeButton position="bottom-right" theme="light" />
      </body>
    </html>
  );
}
