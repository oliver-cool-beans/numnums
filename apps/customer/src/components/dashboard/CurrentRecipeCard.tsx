"use client";

import Image from "next/image";
import { Clock } from "lucide-react";
import { getTodayLabel } from "@/lib/utils";
import { TodayRecipe } from "@/lib/hooks";

type CurrentRecipeCardProps = {
  recipe: TodayRecipe | null;
  onStartCooking?: () => void;
  onBuildWeek?: () => void;
  isLoading?: boolean;
  className?: string;
};

export function CurrentRecipeCard({
  recipe,
  onStartCooking,
  onBuildWeek,
  isLoading,
  className,
}: CurrentRecipeCardProps) {
  if (!recipe) {
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
    <div className={className ?? "mx-5 mb-4 overflow-hidden rounded-[28px] bg-[#E7F6DF]"}>
      {/* Hero image */}
      <div className="relative h-52 w-full bg-[#D9CCBB] md:h-64">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.name}
            fill
            className="object-cover"
            sizes="(max-width: 390px) 390px, 390px"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🍽️</div>
        )}
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#558B2F]">
          Today &middot; {getTodayLabel()}
        </p>
        <h2 className="mt-1.5 text-2xl font-semibold leading-tight text-[#3A2A1F]">
          {recipe.name}
        </h2>
        <div className="mt-2 flex items-center gap-1.5 text-[#6F5B4B]">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm font-medium">{recipe.total_minutes} mins</span>
        </div>

        <button
          onClick={onStartCooking}
          disabled={isLoading}
          className="mt-5 w-full rounded-full bg-[#7CB342] px-4 py-4 text-center text-lg font-semibold text-white hover:bg-[#689F38] active:scale-[0.98] disabled:opacity-50 transition-all"
          type="button"
        >
          {getCTAText()}
        </button>
      </div>
    </div>
  );
}
