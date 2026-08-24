import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acuity — ED Triage Decision Support",
  description:
    "PatientTriage.ai / ProjectVector — age-stratified triage with uncertainty, surge, and clinician overrides",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
