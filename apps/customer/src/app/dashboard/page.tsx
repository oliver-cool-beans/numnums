"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import {
  useUserMealPlan,
  useTodayRecipe,
  useWeekPreview,
  useShoppingList,
} from "@/lib/hooks";
import {
  Header,
  GreetingBlock,
  CurrentRecipeCard,
  WeekPreviewCards,
  ShoppingListCard,
  NextUpCard,
  SwapCard,
  BottomNav,
  SideNav,
  PlanWeeksModal,
} from "@/components/dashboard";
import { MealPlanOnboarding } from "@/components/onboarding/MealPlanOnboarding";
import { NumnumsBackground } from "@/components/ui/NumnumsBackground";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { getDayOfWeek, getWeekAtOffset } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type PlanningTarget = { week: number; year: number } | null;

// ─── Plan Ahead card ─────────────────────────────────────────────────────────


function PlanAheadCard({
  onOpenModal,
  onShopNextWeek,
  className,
}: {
  onOpenModal: () => void;
  onShopNextWeek: () => void;
  className?: string;
}) {
  return (
    <div className={className ?? "mx-5 mb-4 overflow-hidden rounded-[20px] bg-white shadow-sm"}>
      <button
        type="button"
        onClick={onOpenModal}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#FAF7F3]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7F6DF]">
            <CalendarDays aria-hidden="true" className="h-5 w-5 text-[#558B2F]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#3A2A1F]">Plan ahead</p>
            <p className="text-xs text-[#6F5B4B]">Schedule recipes for future weeks.</p>
          </div>
        </div>
        <span className="flex-shrink-0 rounded-full bg-[#E7F6DF] px-3 py-1 text-xs font-semibold text-[#3A2A1F]">
          Plan
        </span>
      </button>
      <button
        type="button"
        onClick={onShopNextWeek}
        className="block w-full border-t border-[#F0E8DE] px-4 py-3 text-left transition-colors hover:bg-[#FAF7F3]"
      >
        <span className="text-xs font-medium text-[#7CB342] underline underline-offset-2">
          Shop next week →
        </span>
      </button>
    </div>
  );
}

// ─── Full-screen overlays ─────────────────────────────────────────────────────

function FullScreenOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="mx-auto flex min-h-full w-full max-w-[390px] flex-col md:max-w-[600px]">
        {children}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"week" | "list" | "favorites" | "profile">("week");
  const [planTarget, setPlanTarget] = useState<PlanningTarget>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const { user, loading: userLoading, signOut } = useAuth();
  const { mealPlan, loading: mealPlanLoading } = useUserMealPlan(user?.id);

  const getTodayRecipeId = (): string | undefined => {
    if (!mealPlan) return undefined;
    const dayOfWeek = getDayOfWeek();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    if (dayIndex >= 0 && dayIndex < mealPlan.days.length) {
      return mealPlan.days[dayIndex].recipe?.id;
    }
    return undefined;
  };

  const todayRecipeId = getTodayRecipeId();

  const { recipe: todayRecipe, loading: todayRecipeLoading } = useTodayRecipe(user?.id, todayRecipeId);
  const { week: weekPreview, loading: weekLoading } = useWeekPreview(user?.id);
  const { list: shoppingList, loading: listLoading } = useShoppingList(user?.id);

  const getTomorrowRecipeName = (): string | null => {
    if (!mealPlan) return null;
    const dayOfWeek = getDayOfWeek();
    const tomorrowIndex = dayOfWeek === 0 ? 0 : dayOfWeek;
    if (tomorrowIndex >= 0 && tomorrowIndex < mealPlan.days.length) {
      return mealPlan.days[tomorrowIndex].recipe?.name || null;
    }
    return null;
  };

  const listIsFinalized = shoppingList?.status === "confirmed" || shoppingList?.status === "completed";
  const showSwapCard = !listIsFinalized && shoppingList?.status !== "completed";

  const handleTabChange = (tab: "week" | "list" | "favorites" | "profile") => {
    setActiveTab(tab);
    if (tab === "list") router.push("/dashboard/shopping-list");
  };

  const handleShopNextWeek = () => {
    const { week, year } = getWeekAtOffset(1);
    router.push(`/dashboard/shopping-list?week=${week}&year=${year}`);
  };

  const handlePlanWeek = (week: number, year: number) => {
    setShowPlanModal(false);
    setPlanTarget({ week, year });
  };

  const handlePlanningDone = () => {
    setPlanTarget(null);
    setShowPlanModal(false);
  };

  useEffect(() => {
    if (!userLoading && !user) router.replace("/");
  }, [user, userLoading, router]);

  // We can't know whether to render the dashboard or redirect to "/" until the
  // session resolves, so this is the rare full-page block — same screen as login.
  if (userLoading) {
    return <LoadingScreen title="Loading" message="Getting your account ready..." />;
  }

  if (!user) return null;

  const skipOnboarding = searchParams.get("skipOnboarding") === "1";
  const shouldShowOnboarding = !mealPlanLoading && !mealPlan && !skipOnboarding && !planTarget;

  // ── Overlays (fullscreen) ──
  if (planTarget) {
    return (
      <FullScreenOverlay>
        <MealPlanOnboarding
          userId={user.id}
          targetWeek={planTarget.week}
          targetYear={planTarget.year}
          onCancel={handlePlanningDone}
        />
      </FullScreenOverlay>
    );
  }

  if (shouldShowOnboarding) {
    return (
      <div className="min-h-dvh w-full bg-white md:flex md:h-dvh md:overflow-hidden md:bg-[#FAF6F2]">
        <SideNav activeTab={activeTab} onTabChange={handleTabChange} user={user} onSignOut={signOut} />
        <div className="flex flex-1 flex-col md:items-center md:justify-center md:overflow-y-auto md:p-6">
          <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-white md:min-h-0 md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)]">
            <MealPlanOnboarding
              userId={user.id}
              onCancel={() => router.replace("/dashboard?skipOnboarding=1")}
            />
          </main>
        </div>
      </div>
    );
  }

  if (showPlanModal) {
    return (
      <FullScreenOverlay>
        <PlanWeeksModal
          userId={user.id}
          onClose={() => setShowPlanModal(false)}
          onPlanWeek={handlePlanWeek}
        />
      </FullScreenOverlay>
    );
  }

  const tomorrowRecipeName = getTomorrowRecipeName();
  // The card has two very different final shapes ("today's recipe" hero vs.
  // "build my week" empty state). Once the meal plan resolves we know which one
  // we're heading toward, so pick the matching skeleton to avoid a layout jump —
  // before that, default toward "empty" since it's the smaller of the two shapes.
  const expectingTodayRecipe = !mealPlanLoading && Boolean(todayRecipeId);
  const currentRecipeLoading = mealPlanLoading || (expectingTodayRecipe && todayRecipeLoading);
  const currentRecipeLoadingKind: "recipe" | "empty" = expectingTodayRecipe ? "recipe" : "empty";
  // Without a meal plan the week preview renders nothing at all — without this,
  // a plan-less account would see the skeleton row collapse straight to empty space.
  const weekPreviewLoading = mealPlanLoading || weekLoading;

  return (
    <div className="min-h-dvh w-full bg-white md:flex md:h-dvh md:overflow-hidden">
      <SideNav activeTab={activeTab} onTabChange={handleTabChange} user={user} onSignOut={signOut} />

      {/* ── Mobile layout (hidden on md+) ── */}
      <div className="flex flex-1 flex-col md:hidden">
        <main className="relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-white">
          <NumnumsBackground />
          <div className="relative z-10 flex flex-1 flex-col overflow-y-auto pb-16">
            <Header user={user} onAvatarClick={() => handleTabChange("profile")} onSignOut={signOut} />
            <GreetingBlock userName={user.name} />
            <div className="relative z-10">
              <CurrentRecipeCard
                recipe={todayRecipe || null}
                onBuildWeek={() => router.replace("/dashboard")}
                onPlanAhead={() => setShowPlanModal(true)}
                onStartCooking={() => todayRecipeId && router.push(`/dashboard/recipes/${todayRecipeId}`)}
                isLoading={currentRecipeLoading}
                loadingKind={currentRecipeLoadingKind}
              />
              {weekPreview.length > 0 && (
                <WeekPreviewCards
                  days={weekPreview}
                  onDayClick={(recipeId) => router.push(`/dashboard/recipes/${recipeId}`)}
                  onViewFullWeek={() => {}}
                  onBuildNextWeek={() => setShowPlanModal(true)}
                  isLoading={weekPreviewLoading}
                />
              )}
              <ShoppingListCard
                list={shoppingList || null}
                onViewList={() => router.push("/dashboard/shopping-list")}
                onReviewList={() => router.push("/dashboard/shopping-list")}
                onDoLater={() => {}}
                isLoading={listLoading}
              />
              {todayRecipe?.progress.status === "completed" && (
                <NextUpCard nextRecipeName={tomorrowRecipeName} onViewNext={() => {}} />
              )}
              <SwapCard isVisible={showSwapCard} onSwap={() => {}} />
              <PlanAheadCard
                onOpenModal={() => setShowPlanModal(true)}
                onShopNextWeek={handleShopNextWeek}
              />
            </div>
          </div>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* ── Desktop layout (hidden on mobile) ── */}
      <div className="hidden md:block md:flex-1 md:overflow-y-auto md:bg-[#F7F3EF]">
        <div className="relative">
          <NumnumsBackground />
          <div className="relative z-10 mx-auto w-full max-w-[680px] px-8 pt-6 pb-10">

          <div className="mb-1 flex items-center justify-between">
            <div>
              <h1 className="text-[30px] font-medium tracking-[-0.02em] text-[#3A2A1F]">
                {user.name ? `Hey, ${user.name.split(" ")[0]} 👋` : "Hey there 👋"}
              </h1>
              <p className="mt-1 text-base text-[#6F5B4B]">Here&apos;s what&apos;s next.</p>
            </div>
            <div className="greeting-pot relative h-[160px] w-[144px] shrink-0">
              <Image src="/pot-angle.png" alt="" fill className="object-contain object-center" sizes="144px" />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <CurrentRecipeCard
              className="overflow-hidden rounded-[28px] bg-[#E7F6DF]"
              recipe={todayRecipe || null}
              onBuildWeek={() => router.replace("/dashboard")}
              onPlanAhead={() => setShowPlanModal(true)}
              onStartCooking={() => todayRecipeId && router.push(`/dashboard/recipes/${todayRecipeId}`)}
              isLoading={currentRecipeLoading}
              loadingKind={currentRecipeLoadingKind}
            />

            {weekPreview.length > 0 && (
              <div className="rounded-[24px] bg-white p-5 shadow-[0_2px_12px_rgba(58,42,31,0.06)]">
                <WeekPreviewCards
                  className="space-y-4"
                  flat
                  days={weekPreview}
                  onDayClick={(recipeId) => router.push(`/dashboard/recipes/${recipeId}`)}
                  onViewFullWeek={() => {}}
                  onBuildNextWeek={() => setShowPlanModal(true)}
                  isLoading={weekPreviewLoading}
                />
              </div>
            )}

            <ShoppingListCard
              className=""
              list={shoppingList || null}
              onViewList={() => router.push("/dashboard/shopping-list")}
              onReviewList={() => router.push("/dashboard/shopping-list")}
              onDoLater={() => {}}
              isLoading={listLoading}
            />

            {todayRecipe?.progress.status === "completed" && (
              <NextUpCard
                className="flex items-center justify-between rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
                nextRecipeName={tomorrowRecipeName}
                onViewNext={() => {}}
              />
            )}

            <SwapCard
              className="flex items-center justify-between rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
              isVisible={showSwapCard}
              onSwap={() => {}}
            />

            <PlanAheadCard
              className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
              onOpenModal={() => setShowPlanModal(true)}
              onShopNextWeek={handleShopNextWeek}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
