"use client";

import Image from "next/image";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Shuffle } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useUserMealPlan, useRecipeSwap } from "@/lib/hooks";
import { RecipeSwapPicker } from "@/components/dashboard";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { getCurrentWeek, getWeekLabel } from "@/lib/utils";
import { formatDifficulty } from "@/lib/recipeSchedule";

function WeekViewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useAuth();

  const current = getCurrentWeek();
  const week = Number(searchParams.get("week")) || current.week;
  const year = Number(searchParams.get("year")) || current.year;
  const weekLabel = getWeekLabel(week, year);
  const isCurrentWeek = week === current.week && year === current.year;

  const { mealPlan, loading: mealPlanLoading, refetch } = useUserMealPlan(user?.id, week, year);
  const recipeSwap = useRecipeSwap(user?.id, refetch);

  if (userLoading) {
    return <LoadingScreen title="Your week" message="Just a moment..." />;
  }

  if (!user) return null;

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-0 md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
        <header className="flex items-center gap-3 px-5 pb-3 pt-14">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm transition-colors hover:bg-[#F5EDE0]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-[#3A2A1F]">{isCurrentWeek ? "This week" : "Your week"}</h1>
            <p className="text-sm text-[#9E8B7E]">{weekLabel}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-10">
          {recipeSwap.error && (
            <div className="mb-3 rounded-[16px] border border-[#E4B9A3] bg-[#FFF1EB] px-4 py-3 text-sm text-[#9A4B1E]">
              {recipeSwap.error}
            </div>
          )}

          {mealPlanLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-[#9E8B7E]" />
            </div>
          ) : !mealPlan ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FAF6F2] px-4 py-6 text-center">
              <p className="text-sm text-[#6F5B4B]">Nothing planned for this week yet.</p>
            </div>
          ) : (
            <ul className="mt-2 space-y-2.5">
              {mealPlan.days.map((entry) => {
                const recipe = entry.recipe;
                const isPending = recipeSwap.pending && recipeSwap.target?.day === entry.day;
                const dayLabel = entry.dayLabel.charAt(0) + entry.dayLabel.slice(1).toLowerCase();

                return (
                  <li key={entry.day} className="rounded-2xl border border-[#F0E8DE] px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[16px] bg-[#E7D9CD]">
                        {recipe?.image_url && (
                          <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" sizes="64px" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9E8B7E]">{dayLabel}</p>
                        <p className="truncate text-sm font-medium text-[#3A2A1F]">
                          {recipe?.name ?? "Nothing planned"}
                        </p>
                        {recipe && (
                          <p className="mt-0.5 text-xs text-[#6F5B4B]">
                            {recipe.total_minutes ?? 25} mins · {formatDifficulty(recipe.difficulty)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          recipeSwap.open({
                            day: entry.day,
                            week,
                            year,
                            currentRecipeId: recipe?.id ?? null,
                          })
                        }
                        disabled={isPending}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D9CCBB] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F5EDE0] disabled:opacity-50"
                      >
                        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Shuffle className="size-3.5" />}
                        Swap
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      {recipeSwap.target && (
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
    </>
  );
}

export default function WeekViewPage() {
  return (
    <Suspense>
      <WeekViewInner />
    </Suspense>
  );
}
