import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s · NumNums",
    default: "NumNums",
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
