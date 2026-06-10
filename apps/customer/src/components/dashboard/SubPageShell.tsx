"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { NumnumsBackground } from "@/components/ui/NumnumsBackground";

type SubPageShellProps = {
  children: React.ReactNode;
  activeTab?: "week" | "list" | "profile";
};

export function SubPageShell({ children, activeTab = "week" }: SubPageShellProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleTabChange = (tab: "week" | "list" | "profile") => {
    if (tab === "week") router.push("/dashboard");
    if (tab === "list") router.push("/dashboard/shopping-list");
    if (tab === "profile") router.push("/dashboard/profile");
  };

  return (
    <div className="h-dvh w-full bg-[#FAF6F2] md:flex md:overflow-hidden">
      <SideNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onInviteFriends={() => router.push("/dashboard/friends")}
        onManageGroups={() => router.push("/dashboard/groups")}
        user={user}
        onSignOut={signOut}
      />
      {/* Right panel: content + mobile bottom nav */}
      <div className="flex h-full flex-col md:flex-1 md:overflow-y-auto">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <NumnumsBackground />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto md:items-center md:py-6 md:px-8">
            {children}
          </div>
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}
