"use client";

import Image from "next/image";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Loader2, Shuffle, X } from "lucide-react";
import {
  useUserMealPlan,
  useTodayRecipe,
  useWeekPreview,
  useShoppingList,
  useFriendsToday,
  useRecipeSwap,
  useFamilyContext,
} from "@/lib/hooks";
import {
  Header,
  GreetingBlock,
  CurrentRecipeCard,
  WeekPreviewCards,
  ShoppingListCard,
  NextUpCard,
  SwapCard,
  FriendsTodayBlock,
  BottomNav,
  SideNav,
  RecipeSwapPicker,
  EnableNotificationsPrompt,
  SwapSuggestionsBlock,
} from "@/components/dashboard";
import { MealPlanOnboarding } from "@/components/onboarding/MealPlanOnboarding";
import { NumnumsBackground } from "@/components/ui/NumnumsBackground";
import { getCurrentWeek, getDayOfWeek, getWeekAtOffset, getWeekLabel } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Weekday } from "@/lib/recipeSchedule";
import {
  clearQueuedNotificationPrompt,
  peekQueuedNotificationPrompt,
  type NotificationPromptCopy,
} from "@/lib/notificationPrompts";
import { swapWeekDays } from "@/lib/mealPlanActions";
import { toast } from "@/lib/toast";

type DayMenuTarget = { day: Weekday; recipeId: string; recipeName: string | null };

// ─── Day quick-action menu (long-press on a week card) ──────────────────────

function DayActionSheet({
  target,
  onViewRecipe,
  onSwap,
  onClose,
}: {
  target: DayMenuTarget;
  onViewRecipe: () => void;
  onSwap: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-[390px] rounded-t-[28px] bg-white p-4 pb-6 shadow-[0_-8px_40px_rgba(58,42,31,0.16)] md:max-w-[360px] md:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="truncate pr-2 text-sm font-semibold text-[#3A2A1F]">{target.recipeName ?? "This recipe"}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-[#9E8B7E] transition-colors hover:bg-[#FAF6F2]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={onViewRecipe}
            className="block w-full rounded-[16px] border border-[#E8DCCB] bg-white px-4 py-3 text-left text-sm font-medium text-[#3A2A1F] transition-colors hover:bg-[#FAF6F2]"
          >
            View recipe
          </button>
          <button
            type="button"
            onClick={onSwap}
            className="flex w-full items-center gap-2 rounded-[16px] bg-[#7CB342] px-4 py-3 text-left text-sm font-semibold text-white transition-colors hover:bg-[#689F38]"
          >
            <Shuffle className="size-4" />
            Swap this recipe
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [isNavigating, setIsNavigating] = useState(false);

  const handleShopNextWeek = () => {
    setIsNavigating(true);
    onShopNextWeek();
  };

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
        onClick={handleShopNextWeek}
        disabled={isNavigating}
        className="flex w-full items-center gap-2 border-t border-[#F0E8DE] px-4 py-3 text-left transition-colors hover:bg-[#FAF7F3] disabled:opacity-50"
      >
        {isNavigating
          ? <Loader2 className="size-3.5 animate-spin text-[#7CB342]" />
          : <span className="text-xs font-medium text-[#7CB342] underline underline-offset-2">Shop next week →</span>
        }
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"week" | "list" | "profile">("week");
  const [dayMenuTarget, setDayMenuTarget] = useState<DayMenuTarget | null>(null);
  const [notificationPrompt, setNotificationPrompt] = useState<NotificationPromptCopy | null>(() =>
    peekQueuedNotificationPrompt(),
  );

  useEffect(() => {
    clearQueuedNotificationPrompt();
  }, []);

  const { user, loading: userLoading, signOut } = useAuth();

  const familyContext = useFamilyContext(user?.id);

  // While familyContext is loading (undefined) we don't know whose plan to show,
  // so hold off on fetching (pass undefined). Once resolved: non-owner members
  // see the owner's plan; everyone else sees their own.
  const mealPlanUserId =
    familyContext === undefined
      ? undefined
      : familyContext?.ownerId ?? user?.id;

  const { mealPlan, loading: mealPlanLoading, refetch: refetchMealPlan } = useUserMealPlan(mealPlanUserId);

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
  const { week: weekPreview, loading: weekLoading, refetch: refetchWeekPreview } = useWeekPreview(mealPlanUserId);
  const { list: shoppingList, loading: listLoading } = useShoppingList(user?.id);
  const { friendsToday, loading: friendsTodayLoading } = useFriendsToday(user?.id);

  const recipeSwap = useRecipeSwap(user?.id, () => {
    refetchMealPlan();
    refetchWeekPreview();
  });

  const getTomorrowRecipe = (): { name: string; id: string } | null => {
    if (!mealPlan) return null;
    const dayOfWeek = getDayOfWeek();
    const tomorrowIndex = dayOfWeek === 0 ? 0 : dayOfWeek;
    if (tomorrowIndex >= 0 && tomorrowIndex < mealPlan.days.length) {
      const recipe = mealPlan.days[tomorrowIndex].recipe;
      if (recipe?.name && recipe?.id) return { name: recipe.name, id: recipe.id };
    }
    return null;
  };

  const listIsFinalized = shoppingList?.status === "confirmed" || shoppingList?.status === "completed";
  const isFamilyMember = Boolean(familyContext) && !familyContext?.isOwner;
  const showSwapCard =
    !listIsFinalized &&
    Boolean(todayRecipe) &&
    todayRecipe?.progress.status !== "completed" &&
    !isFamilyMember;

  const handleTabChange = (tab: "week" | "list" | "profile") => {
    setActiveTab(tab);
    if (tab === "list") router.push("/dashboard/shopping-list");
    if (tab === "profile") router.push("/dashboard/profile");
  };

  const handleShopNextWeek = () => {
    const { week, year } = getWeekAtOffset(1);
    router.push(`/dashboard/shopping-list?week=${week}&year=${year}`);
  };

  const handleViewFullWeek = () => {
    const { week, year } = getCurrentWeek();
    router.push(`/dashboard/week?week=${week}&year=${year}`);
  };

  const handleLongPressDay = (day: Weekday, recipeId: string) => {
    if (isFamilyMember) return;
    const dayEntry = weekPreview.find((d) => d.day === day);
    setDayMenuTarget({ day, recipeId, recipeName: dayEntry?.recipeName ?? null });
  };

  const handleSwapFromMenu = () => {
    if (!dayMenuTarget) return;
    const { week, year } = getCurrentWeek();
    recipeSwap.open({
      day: dayMenuTarget.day,
      week,
      year,
      currentRecipeId: dayMenuTarget.recipeId,
    });
    setDayMenuTarget(null);
  };

  const handleSwapDays = useCallback(
    (dayA: Weekday, dayB: Weekday) => {
      if (!user) return;
      const { week, year } = getCurrentWeek();
      void swapWeekDays(user.id, week, year, dayA, dayB)
        .then(() => { refetchMealPlan(); refetchWeekPreview(); })
        .catch(() => { toast.error("Failed to save. Try again."); refetchWeekPreview(); });
    },
    [user, refetchMealPlan, refetchWeekPreview],
  );

  const handleSwapFromCard = () => {
    const dayOfWeek = getDayOfWeek();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todayEntry = mealPlan?.days[dayIndex];
    if (!todayEntry?.recipe) return;
    const { week, year } = getCurrentWeek();
    recipeSwap.open({ day: todayEntry.day, week, year, currentRecipeId: todayEntry.recipe.id });
  };

  useEffect(() => {
    if (!userLoading && !user) router.replace("/");
  }, [user, userLoading, router]);

  if (!userLoading && !user) return null;

  const skipOnboarding = searchParams.get("skipOnboarding") === "1";
  // Family members see the owner's plan; never prompt them to build their own.
  const shouldShowOnboarding = !userLoading && user && !mealPlanLoading && !mealPlan && !skipOnboarding && !familyContext;

  if (shouldShowOnboarding && user) {
    return (
      <div className="min-h-dvh w-full bg-white md:flex md:h-dvh md:overflow-hidden md:bg-[#FAF6F2]">
        <SideNav activeTab={activeTab} onTabChange={handleTabChange} onInviteFriends={() => router.push("/dashboard/friends")} onManageGroups={() => router.push("/dashboard/groups")} user={user} onSignOut={signOut} />
        <div className="flex flex-1 flex-col md:items-center md:justify-center md:overflow-y-auto md:p-6">
          <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-white md:min-h-0 md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)]">
            <MealPlanOnboarding
              userId={user.id}
              onCancel={() => router.replace("/dashboard?skipOnboarding=1")}
              onFinish={() => router.push("/dashboard/shopping-list")}
            />
          </main>
        </div>
      </div>
    );
  }

  const tomorrowRecipe = getTomorrowRecipe();

  // Shopping list week label: "This week · 16 Jun – 22 Jun"
  const { week: currentWeek, year: currentYear } = getCurrentWeek();
  const currentWeekDateRange = getWeekLabel(currentWeek, currentYear);
  const shoppingListWeekLabel = `This week · ${currentWeekDateRange}`;
  // Show next-week prompt Thu (4), Fri (5), Sat (6), Sun (0)
  const dayOfWeek = getDayOfWeek();
  const isEndOfWeek = dayOfWeek === 0 || dayOfWeek >= 4;
  const { week: nextWeek, year: nextYear } = getWeekAtOffset(1);
  const nextWeekDateRange = getWeekLabel(nextWeek, nextYear);
  const nextWeekShoppingLabel = isEndOfWeek ? `Next week · ${nextWeekDateRange}` : undefined;

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
      <SideNav activeTab={activeTab} onTabChange={handleTabChange} onInviteFriends={() => router.push("/dashboard/friends")} onManageGroups={() => router.push("/dashboard/groups")} user={user} onSignOut={signOut} />

      {/* ── Mobile layout (hidden on md+) ── */}
      <div className="flex h-dvh flex-col md:hidden">
        <main className="relative mx-auto flex w-full max-w-[390px] flex-1 flex-col overflow-hidden bg-white">
          <NumnumsBackground animated />
          <div className="relative z-10 flex flex-1 flex-col overflow-y-auto pb-6">
            <Header
              user={user}
              onAvatarClick={() => handleTabChange("profile")}
              onInviteFriends={() => router.push("/dashboard/friends")}
              onManageGroups={() => router.push("/dashboard/groups")}
              onSignOut={signOut}
            />
            <GreetingBlock userName={user?.name ?? null} />
            {familyContext && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/groups")}
                className="mx-5 mb-3 flex items-center gap-2 rounded-full bg-[#E7F6DF] px-3 py-1.5 text-xs font-medium text-[#558B2F] transition-colors hover:bg-[#D5ECC8]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#7CB342]" />
                {familyContext.familyName}
                {familyContext.isOwner ? " · Planner" : " · Member"}
              </button>
            )}
            {notificationPrompt && user?.id && (
              <EnableNotificationsPrompt
                userId={user.id}
                title={notificationPrompt.title}
                message={notificationPrompt.message}
                onDismiss={() => setNotificationPrompt(null)}
              />
            )}
            {familyContext && user && (
              <SwapSuggestionsBlock
                familyId={familyContext.familyId}
                ownerId={familyContext.ownerId}
                currentUserId={user.id}
                isOwner={familyContext.isOwner}
              />
            )}
            <div className="relative z-10">
              <CurrentRecipeCard
                recipe={todayRecipe || null}
                hasMealPlan={Boolean(mealPlan)}
                onBuildWeek={() => router.replace("/dashboard")}
                onPlanAhead={() => router.push("/dashboard/plan-ahead")}
                onStartCooking={() => todayRecipeId && router.push(`/dashboard/recipes/${todayRecipeId}`)}
                isLoading={currentRecipeLoading}
                loadingKind={currentRecipeLoadingKind}
              />
              <SwapCard isVisible={showSwapCard} recipeName={todayRecipe?.name} onSwap={handleSwapFromCard} />
              {weekPreview.length > 0 && (
                <WeekPreviewCards
                  days={weekPreview}
                  onDayClick={(recipeId) => router.push(`/dashboard/recipes/${recipeId}`)}
                  onLongPressDay={isFamilyMember ? handleLongPressDay : undefined}
                  onSwapDays={isFamilyMember ? undefined : handleSwapDays}
                  onViewFullWeek={handleViewFullWeek}
                  onBuildNextWeek={() => router.push("/dashboard/plan-ahead")}
                  isLoading={weekPreviewLoading}
                />
              )}
              <ShoppingListCard
                list={shoppingList || null}
                hasMealPlan={Boolean(mealPlan)}
                onViewList={() => router.push("/dashboard/shopping-list")}
                onReviewList={() => router.push("/dashboard/shopping-list")}
                onShopNextWeek={handleShopNextWeek}
                isLoading={listLoading}
                weekLabel={shoppingListWeekLabel}
                nextWeekLabel={nextWeekShoppingLabel}
              />
              <PlanAheadCard
                onOpenModal={() => router.push("/dashboard/plan-ahead")}
                onShopNextWeek={handleShopNextWeek}
              />
              <FriendsTodayBlock
                friendsToday={friendsToday || []}
                onInviteFriends={() => router.push("/dashboard/friends")}
                isLoading={friendsTodayLoading}
              />
              {todayRecipe?.progress.status === "completed" && (
                <NextUpCard
                  nextRecipeName={tomorrowRecipe?.name ?? null}
                  onViewNext={() => tomorrowRecipe && router.push(`/dashboard/recipes/${tomorrowRecipe.id}`)}
                />
              )}
            </div>
          </div>
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </main>
      </div>

      {/* ── Desktop layout (hidden on mobile) ── */}
      <div className="hidden md:block md:flex-1 md:overflow-y-auto md:bg-[#F7F3EF]">
        <div className="relative">
          <NumnumsBackground animated />
          <div className="relative z-10 mx-auto w-full max-w-[680px] px-8 pt-6 pb-10">

          <div className="mb-1 flex items-center justify-between">
            <div>
              <h1 className="text-[30px] font-medium tracking-[-0.02em] text-[#3A2A1F]">
                {user?.name ? `Hey, ${user.name.split(" ")[0]} 👋` : "Hey there 👋"}
              </h1>
              <p className="mt-1 text-base text-[#6F5B4B]">Here&apos;s what&apos;s next.</p>
              {familyContext && (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/groups")}
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E7F6DF] px-3 py-1.5 text-xs font-medium text-[#558B2F] transition-colors hover:bg-[#D5ECC8]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7CB342]" />
                  {familyContext.familyName}
                  {familyContext.isOwner ? " · Planner" : " · Member"}
                </button>
              )}
            </div>
            <div className="greeting-pot relative h-[160px] w-[144px] shrink-0">
              <Image src="/pot-angle.png" alt="" fill className="object-contain object-center" sizes="144px" />
            </div>
          </div>

          {notificationPrompt && user?.id && (
            <EnableNotificationsPrompt
              className="mb-5 rounded-[24px] border border-[#E8DCCB] bg-white px-5 py-4 shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
              userId={user.id}
              title={notificationPrompt.title}
              message={notificationPrompt.message}
              onDismiss={() => setNotificationPrompt(null)}
            />
          )}
          {familyContext && user && (
            <SwapSuggestionsBlock
              className="mb-5"
              familyId={familyContext.familyId}
              ownerId={familyContext.ownerId}
              currentUserId={user.id}
              isOwner={familyContext.isOwner}
            />
          )}

          <div className="flex flex-col gap-5">
            <CurrentRecipeCard
              className="overflow-hidden rounded-[28px] bg-[#E7F6DF]"
              recipe={todayRecipe || null}
              hasMealPlan={Boolean(mealPlan)}
              onBuildWeek={() => router.replace("/dashboard")}
              onPlanAhead={() => router.push("/dashboard/plan-ahead")}
              onStartCooking={() => todayRecipeId && router.push(`/dashboard/recipes/${todayRecipeId}`)}
              isLoading={currentRecipeLoading}
              loadingKind={currentRecipeLoadingKind}
            />

            <SwapCard
              className="flex items-center justify-between rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
              isVisible={showSwapCard}
              recipeName={todayRecipe?.name}
              onSwap={handleSwapFromCard}
            />

            {weekPreview.length > 0 && (
              <div className="rounded-[24px] bg-white p-5 shadow-[0_2px_12px_rgba(58,42,31,0.06)]">
                <WeekPreviewCards
                  className="space-y-4"
                  flat
                  days={weekPreview}
                  onDayClick={(recipeId) => router.push(`/dashboard/recipes/${recipeId}`)}
                  onLongPressDay={isFamilyMember ? handleLongPressDay : undefined}
                  onSwapDays={isFamilyMember ? undefined : handleSwapDays}
                  onViewFullWeek={handleViewFullWeek}
                  onBuildNextWeek={() => router.push("/dashboard/plan-ahead")}
                  isLoading={weekPreviewLoading}
                />
              </div>
            )}

            <ShoppingListCard
              className=""
              list={shoppingList || null}
              hasMealPlan={Boolean(mealPlan)}
              onViewList={() => router.push("/dashboard/shopping-list")}
              onReviewList={() => router.push("/dashboard/shopping-list")}
              onShopNextWeek={handleShopNextWeek}
              isLoading={listLoading}
              weekLabel={shoppingListWeekLabel}
              nextWeekLabel={nextWeekShoppingLabel}
            />

            <PlanAheadCard
              className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
              onOpenModal={() => router.push("/dashboard/plan-ahead")}
              onShopNextWeek={handleShopNextWeek}
            />

            <div className="rounded-[24px] bg-white p-5 shadow-[0_2px_12px_rgba(58,42,31,0.06)]">
              <FriendsTodayBlock
                className="space-y-4"
                flat
                friendsToday={friendsToday || []}
                onInviteFriends={() => router.push("/dashboard/friends")}
                isLoading={friendsTodayLoading}
              />
            </div>

            {todayRecipe?.progress.status === "completed" && (
              <NextUpCard
                className="flex items-center justify-between rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
                nextRecipeName={tomorrowRecipe?.name ?? null}
                onViewNext={() => tomorrowRecipe && router.push(`/dashboard/recipes/${tomorrowRecipe.id}`)}
              />
            )}
          </div>
        </div>
        </div>
      </div>

      {dayMenuTarget && (
        <DayActionSheet
          target={dayMenuTarget}
          onViewRecipe={() => {
            const { recipeId } = dayMenuTarget;
            setDayMenuTarget(null);
            router.push(`/dashboard/recipes/${recipeId}`);
          }}
          onSwap={handleSwapFromMenu}
          onClose={() => setDayMenuTarget(null)}
        />
      )}

      {!isFamilyMember && recipeSwap.target && user && (
        <RecipeSwapPicker
          userId={user.id}
          day={recipeSwap.target.day}
          title="Swap recipe"
          currentRecipeId={recipeSwap.target.currentRecipeId}
          recentRecipeIds={recipeSwap.recentRecipeIds}
          onCancel={recipeSwap.close}
          onSelect={(recipe) => void recipeSwap.handleSelect(recipe)}
        />
      )}
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
