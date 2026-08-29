import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acuity — ED Triage Decision Support",
  description:
    "PatientTriage.ai by ProjectVector — DOOR intake, FLOW board, WATCH monitoring with age-stratified triage",
  applicationName: "Acuity",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
