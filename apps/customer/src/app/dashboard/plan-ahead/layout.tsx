import type { Metadata } from "next";
export const metadata: Metadata = { title: "Plan ahead" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
