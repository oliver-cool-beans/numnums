"use client";

import { CalendarDays, Clock } from "lucide-react";
import { getTodayLabel } from "@/lib/utils";
import { TodayRecipe } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { MealHeroCard } from "./MealHeroCard";

type CurrentRecipeCardProps = {
  recipe: TodayRecipe | null;
  /** True when the user has a meal plan for this week but simply didn't pick a recipe for today. */
  hasMealPlan?: boolean;
  onStartCooking?: () => void;
  onBuildWeek?: () => void;
  onPlanAhead?: () => void;
  isLoading?: boolean;
  /**
   * Which final layout to skeleton toward — the card has two very different
   * shapes ("today's recipe" hero vs. "build my week" empty state), so the
   * caller tells us which one we're waiting on to avoid a layout jump once
   * the real content lands. Defaults to "recipe", the common case.
   */
  loadingKind?: "recipe" | "empty";
  className?: string;
};

export function CurrentRecipeCard({
  recipe,
  hasMealPlan,
  onStartCooking,
  onBuildWeek,
  onPlanAhead,
  isLoading,
  loadingKind = "recipe",
  className,
}: CurrentRecipeCardProps) {
  if (isLoading && !recipe && loadingKind === "recipe") {
    return (
      <div className={className ?? "mx-5 mb-4 overflow-hidden rounded-[28px] bg-[#E7F6DF]"}>
        <Skeleton className="h-52 w-full rounded-none bg-[#D9CCBB]/70 md:h-64" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-3 w-24 bg-white/60" />
          <Skeleton className="h-6 w-3/4 bg-white/60" />
          <Skeleton className="h-4 w-20 bg-white/60" />
          <Skeleton className="mt-4 h-12 w-full rounded-full bg-white/60" />
        </div>
      </div>
    );
  }

  if (isLoading && !recipe && loadingKind === "empty") {
    return (
      <div className={className ?? "mx-5 mb-4 rounded-[28px] bg-[#E7F6DF] p-5 text-center"}>
        <Skeleton className="mx-auto h-5 w-28 bg-white/60" />
        <Skeleton className="mx-auto mt-3 h-4 w-3/5 bg-white/60" />
        <Skeleton className="mx-auto mt-4 h-12 w-full rounded-full bg-white/60" />
        <Skeleton className="mx-auto mt-3 h-4 w-48 bg-white/60" />
      </div>
    );
  }

  if (!recipe) {
    if (hasMealPlan) {
      return (
        <div className={className ?? "mx-5 mb-4 rounded-[28px] bg-[#E7F6DF] p-5 text-center"}>
          <p className="text-lg font-medium text-[#3A2A1F]">No dinner planned today</p>
          <p className="mt-2 text-sm text-[#6F5B4B]">Enjoy the night off — or plan ahead for next time.</p>
          <button
            onClick={onPlanAhead}
            className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[#558B2F] underline underline-offset-2 transition-colors hover:text-[#3A2A1F]"
            type="button"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Plan ahead for future weeks
          </button>
        </div>
      );
    }

    return (
      <div className={className ?? "mx-5 mb-4 rounded-[28px] bg-[#E7F6DF] p-5 text-center"}>
        <p className="text-lg font-medium text-[#3A2A1F]">No week yet</p>
        <p className="mt-2 text-sm text-[#6F5B4B]">Tell us what you like and we&apos;ll build one.</p>
        <button
          onClick={onBuildWeek}
          className="mt-4 w-full rounded-full bg-[#7CB342] px-4 py-4 text-center text-lg font-semibold text-white hover:bg-[#689F38] transition-colors"
          type="button"
        >
          Build my week
        </button>
        <button
          onClick={onPlanAhead}
          className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[#558B2F] underline underline-offset-2 transition-colors hover:text-[#3A2A1F]"
          type="button"
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          Or plan ahead for future weeks
        </button>
      </div>
    );
  }

  const isCompleted = recipe.progress.status === "completed";
  const isInProgress = recipe.progress.status === "in_progress";

  const getCTAText = () => {
    if (isCompleted) return "Mark dinner done";
    if (isInProgress) return "Continue cooking";
    return "Start cooking";
  };

  return (
    <MealHeroCard
      className={className ?? "mx-5 mb-4 overflow-hidden rounded-[28px] bg-[#E7F6DF]"}
      priority
      imageUrl={recipe.image_url}
      title={recipe.name}
      eyebrow={`Today · ${getTodayLabel()}`}
      meta={
        <div className="mt-2 flex items-center gap-1.5 text-[#6F5B4B]">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm font-medium">{recipe.total_minutes} mins</span>
        </div>
      }
      footer={
        <button
          onClick={onStartCooking}
          disabled={isLoading}
          className="mt-5 w-full rounded-full bg-[#7CB342] px-4 py-4 text-center text-lg font-semibold text-white hover:bg-[#689F38] active:scale-[0.98] disabled:opacity-50 transition-all"
          type="button"
        >
          {getCTAText()}
        </button>
      }
    />
  );
}
