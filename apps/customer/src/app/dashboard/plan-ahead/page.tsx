"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PlanWeeksModal } from "@/components/dashboard/PlanWeeksModal";

export default function PlanAheadPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <PlanWeeksModal
      userId={user.id}
      onClose={() => router.back()}
      onViewWeek={(week, year) => router.push(`/dashboard/week?week=${week}&year=${year}`)}
    />
  );
}
