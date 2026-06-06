"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, ChevronRight, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, getCurrentWeek, getWeekMondayDate, getWeekLabel } from "@/lib/utils";
import {
  type Weekday,
  type OnboardingRecipe,
  type ReadyMeal,
  buildRecipeBadges,
  buildSchedule,
  chunkRecipes,
  fetchOnboardingRecipes,
  formatDifficulty,
  getFilteredRecipes,
  matchesRequirement,
} from "@/lib/recipeSchedule";
import { persistWeekPlan } from "@/lib/mealPlanActions";

type OnboardingStep = "diet" | "recipes" | "days" | "ready";

type ReadyState = {
  meals: ReadyMeal[];
  weekLabel: string;
};

type MealPlanOnboardingProps = {
  userId: string;
  onCancel: () => void;
  targetWeek?: number;
  targetYear?: number;
};

type StepContentProps = {
  step: OnboardingStep;
  selectedRequirements: string[];
  selectedRecipeIds: string[];
  selectedDays: Weekday[];
  recipePages: OnboardingRecipe[][];
  activeRecipePage: OnboardingRecipe[];
  recipePage: number;
  touchStartX: number | null;
  readyState: ReadyState | null;
  isSaving: boolean;
  weekMondayDate: Date;
  weekLabel: string;
  onSetTouchStartX: (value: number | null) => void;
  onToggleRequirement: (value: string) => void;
  onContinueWithoutFilters: () => void;
  onBackToFilters: () => void;
  onToggleRecipe: (value: string) => void;
  onAdvanceRecipePage: () => void;
  onContinueToDays: () => void;
  onToggleDay: (value: Weekday) => void;
  onBuildWeek: () => void;
  onFinish: () => void;
};

const ONBOARDING_STEPS: OnboardingStep[] = ["diet", "recipes", "days", "ready"];
const STEP_SECTION_CLASS = "mt-1 flex flex-1 flex-col";
const REQUIRED_WEEKDAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DAY_ORDER: Weekday[] = [...REQUIRED_WEEKDAYS, "saturday", "sunday"];

const DIETARY_OPTIONS = [
  { id: "high-protein", label: "High protein" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten free" },
  { id: "dairy-free", label: "Dairy free" },
  { id: "quick", label: "Quick wins" },
] as const;

const DAY_LABELS: Record<Weekday, string> = {
  monday: "MON",
  tuesday: "TUE",
  wednesday: "WED",
  thursday: "THU",
  friday: "FRI",
  saturday: "SAT",
  sunday: "SUN",
};

function getDayDate(day: Weekday, weekMondayDate: Date) {
  const date = new Date(weekMondayDate);
  date.setDate(weekMondayDate.getDate() + DAY_ORDER.indexOf(day));
  return {
    dayLabel: DAY_LABELS[day],
    dateLabel: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  };
}

function OnboardingHero({
  step,
  readyState,
  weekLabel,
  isCurrentWeek,
  onCancel,
}: {
  step: OnboardingStep;
  readyState: ReadyState | null;
  weekLabel: string;
  isCurrentWeek: boolean;
  onCancel: () => void;
}) {
  const currentStepIndex = ONBOARDING_STEPS.indexOf(step);

  return (
    <>
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-full border border-[#D9CCBB] bg-white/80 text-[#3A2A1F] shadow-sm"
          onClick={onCancel}
        >
          <ArrowLeft />
        </Button>
        <p className="text-center text-[28px] font-semibold leading-none tracking-[-0.02em] text-[#3A2A1F]">
          numnums
        </p>
        <div aria-hidden="true" className="size-11" />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 px-1">
        {ONBOARDING_STEPS.map((onboardingStep, index) => (
          <span
            key={onboardingStep}
            className={cn(
              "h-2 rounded-full transition-colors",
              index <= currentStepIndex ? "bg-[#7CB342]" : "bg-[#D9CCBB]",
            )}
          />
        ))}
      </div>

      <section className="px-1 pb-1 pt-1">
        <div className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3">
          <div>
            <h1 className="mt-2 text-[1.8rem] leading-[1.02] font-semibold">
              {step === "ready" ? "Your week is ready!" : "Pick the recipes you want"}
            </h1>
            <p className="mt-2 max-w-[17rem] text-sm leading-5 text-[#6F5B4B]">
              {step === "ready"
                ? `${readyState?.meals.length ?? 0} dinners · ${weekLabel}`
                : isCurrentWeek
                ? "We'll build the rest of your week around these."
                : `Planning ${weekLabel}`}
            </p>
          </div>
          <div className="relative ml-auto aspect-[4/5] w-full max-w-[120px] overflow-hidden rounded-[28px]">
            <Image
              src="/pot-angle.png"
              alt="Cooking pot illustration"
              fill
              className="object-cover"
              sizes="120px"
              priority
            />
          </div>
        </div>
      </section>
    </>
  );
}

function ErrorNotice({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="mt-4 rounded-[24px] border border-[#E4B9A3] bg-[#FFF1EB] px-4 py-3 text-sm text-[#9A4B1E]">
      {error}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="mt-10 flex items-center gap-3 rounded-full bg-white px-4 py-3 text-sm text-[#6F5B4B] shadow-sm">
        <Loader2 className="size-4 animate-spin" />
        Pulling in recipes for your first week
      </div>
    </div>
  );
}

function DietStepCard({
  selectedRequirements,
  onToggleRequirement,
  onContinueWithoutFilters,
}: {
  selectedRequirements: string[];
  onToggleRequirement: (value: string) => void;
  onContinueWithoutFilters: () => void;
}) {
  return (
    <section className={STEP_SECTION_CLASS}>
      <div className="flex items-center gap-2 text-sm font-medium text-[#6F5B4B]">
        <Sparkles className="size-4 text-[#7CB342]" />
        Dietary requirements first
      </div>
      <p className="mt-2 text-sm leading-5 text-[#6F5B4B]">
        Tap any preference and we&apos;ll carry it into the recipe picks.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {DIETARY_OPTIONS.map((option) => {
          const selected = selectedRequirements.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggleRequirement(option.id)}
              className={cn(
                "relative min-h-[92px] rounded-[24px] border bg-white px-3 py-3 text-left transition-all",
                selected
                  ? "border-[#7CB342] shadow-[0_12px_30px_rgba(124,179,66,0.18)]"
                  : "border-[#E8DCCB] hover:-translate-y-0.5 hover:border-[#7CB342]/60",
              )}
            >
              <span
                className={cn(
                  "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border bg-white transition-colors",
                  selected
                    ? "border-[#689F38] bg-[#F4FFE8] text-[#689F38] shadow-sm"
                    : "border-[#D9CCBB] text-transparent",
                )}
              >
                <Check className="size-4" />
              </span>
              <div className="pr-8">
                <p className="text-sm font-semibold leading-5 text-[#3A2A1F]">{option.label}</p>
                <p className="mt-1 text-[0.68rem] leading-4 text-[#6F5B4B]">
                  {selected ? "Included in picks" : "Tap to include"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="mt-4 h-11 w-full rounded-full border-[#D9CCBB] bg-[#FFF7E8] text-[#3A2A1F]"
        onClick={onContinueWithoutFilters}
      >
        Continue without filters
      </Button>
    </section>
  );
}

function RecipeStepCard({
  selectedRecipeIds,
  recipePages,
  activeRecipePage,
  recipePage,
  touchStartX,
  onSetTouchStartX,
  onBackToFilters,
  onToggleRecipe,
  onAdvanceRecipePage,
  onContinueToDays,
}: {
  selectedRecipeIds: string[];
  recipePages: OnboardingRecipe[][];
  activeRecipePage: OnboardingRecipe[];
  recipePage: number;
  touchStartX: number | null;
  onSetTouchStartX: (value: number | null) => void;
  onBackToFilters: () => void;
  onToggleRecipe: (value: string) => void;
  onAdvanceRecipePage: () => void;
  onContinueToDays: () => void;
}) {
  return (
    <section className={STEP_SECTION_CLASS}>
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#6F5B4B] transition-colors hover:text-[#3A2A1F]"
          onClick={onBackToFilters}
        >
          <ArrowLeft className="size-4" />
          Re-pick filters
        </button>
      </div>

      <div
        className="mt-2 grid grid-cols-3 gap-2.5"
        onTouchStart={(e) => onSetTouchStartX(e.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const nextX = e.changedTouches[0]?.clientX ?? null;
          if (touchStartX !== null && nextX !== null && Math.abs(nextX - touchStartX) > 60) {
            onAdvanceRecipePage();
          }
          onSetTouchStartX(null);
        }}
      >
        {activeRecipePage.map((recipe) => {
          const selected = selectedRecipeIds.includes(recipe.id);
          const badges = buildRecipeBadges(recipe);
          return (
            <button
              key={recipe.id}
              type="button"
              onClick={() => onToggleRecipe(recipe.id)}
              className={cn(
                "relative flex h-full flex-col overflow-hidden rounded-[24px] border bg-white text-left transition-all",
                selected
                  ? "border-[#7CB342] shadow-[0_12px_30px_rgba(124,179,66,0.18)]"
                  : "border-[#E8DCCB] hover:-translate-y-0.5 hover:border-[#7CB342]/60",
              )}
            >
              <div className="relative h-28 w-full shrink-0">
                {recipe.image_url ? (
                  <Image
                    src={recipe.image_url}
                    alt={recipe.name}
                    fill
                    className="object-cover"
                    sizes="110px"
                  />
                ) : (
                  <div className="h-full w-full bg-[#D9CCBB]" />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between space-y-1.5 px-2.5 py-2.5">
                <p className="line-clamp-2 text-[0.74rem] font-semibold leading-4 text-[#3A2A1F]">
                  {recipe.name}
                </p>
                <div className="flex flex-wrap gap-1">
                  {badges.slice(0, 2).map((badge) => (
                    <span
                      key={`${recipe.id}-${badge}`}
                      className="rounded-full bg-white/80 px-1.5 py-0.5 text-[0.58rem] font-medium text-[#6F5B4B]"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <span
                className={cn(
                  "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border bg-white transition-colors",
                  selected
                    ? "border-[#689F38] bg-[#F4FFE8] text-[#689F38] shadow-sm"
                    : "border-[#D9CCBB] text-transparent",
                )}
              >
                <Check className="size-4" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-[#6F5B4B]">
        <span>
          {recipePages.length > 0 ? recipePage + 1 : 0} of {recipePages.length || 1}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium text-[#3A2A1F]"
          onClick={onAdvanceRecipePage}
        >
          More recipes
          <ChevronRight className="size-4" />
        </button>
      </div>

      <Button
        className="mt-4 h-11 w-full rounded-full bg-[#7CB342] text-base font-semibold text-white hover:bg-[#689F38]"
        onClick={onContinueToDays}
        disabled={selectedRecipeIds.length === 0}
      >
        Continue to days
      </Button>
    </section>
  );
}

function DayStepCard({
  selectedDays,
  isSaving,
  weekLabel,
  onToggleDay,
  onBuildWeek,
}: {
  selectedDays: Weekday[];
  isSaving: boolean;
  weekLabel: string;
  onToggleDay: (value: Weekday) => void;
  onBuildWeek: () => void;
}) {
  return (
    <section className={STEP_SECTION_CLASS}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Which days?</h2>
          <p className="mt-1 text-xs text-[#9E8B7E]">{weekLabel}</p>
          <p className="mt-1 text-sm leading-5 text-[#6F5B4B]">
            Pick any days you want a dinner planned. At least one required.
          </p>
        </div>
        <Badge variant="secondary" className="bg-[#FFF7E8] px-3 text-[#6F5B4B]">
          {selectedDays.length} dinners
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {DAY_ORDER.map((day) => {
          const selected = selectedDays.includes(day);
          const isLastSelected = selected && selectedDays.length === 1;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggleDay(day)}
              disabled={isLastSelected}
              className={cn(
                "relative min-h-[88px] cursor-pointer rounded-[24px] border bg-white px-3 py-3 text-left transition-all",
                selected
                  ? "border-[#7CB342] shadow-[0_12px_30px_rgba(124,179,66,0.18)]"
                  : "border-[#E8DCCB] hover:-translate-y-0.5 hover:border-[#7CB342]/60",
                isLastSelected && "cursor-default opacity-60",
              )}
            >
              <span
                className={cn(
                  "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border bg-white transition-colors",
                  selected
                    ? "border-[#689F38] bg-[#F4FFE8] text-[#689F38] shadow-sm"
                    : "border-[#D9CCBB] text-transparent",
                )}
              >
                <Check className="size-4" />
              </span>
              <div className="pr-8">
                <p className="text-sm font-semibold leading-5 text-[#3A2A1F]">{DAY_LABELS[day]}</p>
                <p className="mt-1 text-[0.68rem] leading-4 text-[#6F5B4B]">
                  {selected ? "On" : "Tap to add"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <Button
        className="mt-4 h-11 w-full rounded-full bg-[#7CB342] text-base font-semibold text-white hover:bg-[#689F38] disabled:cursor-not-allowed disabled:bg-[#B7D58A]"
        onClick={onBuildWeek}
        disabled={isSaving}
      >
        {isSaving ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Building my week
          </span>
        ) : (
          "Build my week"
        )}
      </Button>
    </section>
  );
}

function ReadyStepCard({
  readyState,
  weekMondayDate,
  onFinish,
}: {
  readyState: ReadyState;
  weekMondayDate: Date;
  onFinish: () => void;
}) {
  return (
    <section className={STEP_SECTION_CLASS}>
      <div className="space-y-2.5">
        {readyState.meals.map((meal) => {
          const { dayLabel, dateLabel } = getDayDate(meal.day, weekMondayDate);
          const badges = buildRecipeBadges(meal.recipe);
          return (
            <div
              key={`${meal.day}-${meal.recipe.id}`}
              className="grid grid-cols-[54px_minmax(0,1fr)] gap-3 rounded-[24px] border border-[#E8DCCB] bg-white p-3"
            >
              <div className="rounded-[18px] bg-[#FFF7E8] px-2 py-3 text-center">
                <p className="text-xs font-semibold tracking-[0.18em] text-[#558B2F]">{dayLabel}</p>
                <p className="mt-2 text-xs text-[#6F5B4B]">{dateLabel}</p>
              </div>
              <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3">
                <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[#D9CCBB]">
                  {meal.recipe.image_url ? (
                    <Image
                      src={meal.recipe.image_url}
                      alt={meal.recipe.name}
                      fill
                      className="object-cover"
                      sizes="84px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#3A2A1F]">
                    {meal.recipe.name}
                  </p>
                  <p className="mt-1.5 text-xs text-[#6F5B4B]">
                    {meal.recipe.total_minutes ?? 25} mins · {formatDifficulty(meal.recipe.difficulty)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {badges.slice(0, 3).map((badge) => (
                      <span
                        key={`${meal.recipe.id}-${badge}`}
                        className="rounded-full bg-[#FFF7E8] px-2 py-0.5 text-[0.68rem] font-medium text-[#6F5B4B]"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        className="mt-4 h-11 w-full rounded-full bg-[#7CB342] text-base font-semibold text-white hover:bg-[#689F38]"
        onClick={onFinish}
      >
        Looks good!
      </Button>
    </section>
  );
}

function StepContent({
  step,
  selectedRequirements,
  selectedRecipeIds,
  selectedDays,
  recipePages,
  activeRecipePage,
  recipePage,
  touchStartX,
  readyState,
  isSaving,
  weekMondayDate,
  weekLabel,
  onSetTouchStartX,
  onToggleRequirement,
  onContinueWithoutFilters,
  onBackToFilters,
  onToggleRecipe,
  onAdvanceRecipePage,
  onContinueToDays,
  onToggleDay,
  onBuildWeek,
  onFinish,
}: StepContentProps) {
  switch (step) {
    case "diet":
      return (
        <DietStepCard
          selectedRequirements={selectedRequirements}
          onToggleRequirement={onToggleRequirement}
          onContinueWithoutFilters={onContinueWithoutFilters}
        />
      );
    case "recipes":
      return (
        <RecipeStepCard
          selectedRecipeIds={selectedRecipeIds}
          recipePages={recipePages}
          activeRecipePage={activeRecipePage}
          recipePage={recipePage}
          touchStartX={touchStartX}
          onSetTouchStartX={onSetTouchStartX}
          onBackToFilters={onBackToFilters}
          onToggleRecipe={onToggleRecipe}
          onAdvanceRecipePage={onAdvanceRecipePage}
          onContinueToDays={onContinueToDays}
        />
      );
    case "days":
      return (
        <DayStepCard
          selectedDays={selectedDays}
          isSaving={isSaving}
          weekLabel={weekLabel}
          onToggleDay={onToggleDay}
          onBuildWeek={onBuildWeek}
        />
      );
    case "ready":
      return readyState ? (
        <ReadyStepCard readyState={readyState} weekMondayDate={weekMondayDate} onFinish={onFinish} />
      ) : null;
    default:
      return null;
  }
}

export function MealPlanOnboarding({ userId, onCancel, targetWeek, targetYear }: MealPlanOnboardingProps) {
  const [recipes, setRecipes] = useState<OnboardingRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [step, setStep] = useState<OnboardingStep>("diet");
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [recipePage, setRecipePage] = useState(0);
  const [selectedDays, setSelectedDays] = useState<Weekday[]>(REQUIRED_WEEKDAYS);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [readyState, setReadyState] = useState<ReadyState | null>(null);

  const { week: currentWeek, year: currentYear } = getCurrentWeek();
  const effectiveWeek = targetWeek ?? currentWeek;
  const effectiveYear = targetYear ?? currentYear;
  const weekMondayDate = getWeekMondayDate(effectiveWeek, effectiveYear);
  const weekLabel = getWeekLabel(effectiveWeek, effectiveYear);
  const isCurrentWeek = effectiveWeek === currentWeek && effectiveYear === currentYear;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextRecipes = await fetchOnboardingRecipes();
        if (isMounted) setRecipes(nextRecipes);
      } catch (loadError) {
        if (isMounted)
          setError(loadError instanceof Error ? loadError.message : "We couldn't load recipes yet.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, []);

  const filteredRecipes = getFilteredRecipes(recipes, selectedRequirements);
  const recipePages = chunkRecipes(filteredRecipes);
  const activeRecipePage = recipePages[recipePage] ?? recipePages[0] ?? [];

  const handleToggleRequirement = (requirementId: string) => {
    setRecipePage(0);
    setSelectedRequirements((current) => {
      const exists = current.includes(requirementId);
      return exists ? current.filter((v) => v !== requirementId) : [...current, requirementId];
    });
    if (step === "diet") setStep("recipes");
  };

  const handleToggleRecipe = (recipeId: string) => {
    setSelectedRecipeIds((current) =>
      current.includes(recipeId) ? current.filter((v) => v !== recipeId) : [...current, recipeId],
    );
  };

  const handleAdvanceRecipePage = () => {
    if (recipePages.length <= 1) return;
    setRecipePage((current) => (current + 1) % recipePages.length);
  };

  const handleToggleDay = (day: Weekday) => {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        if (current.length <= 1) return current;
        return current.filter((v) => v !== day);
      }
      return [...current, day];
    });
  };

  const handleBuildWeek = async () => {
    if (selectedRecipeIds.length === 0) {
      setError("Pick at least one recipe so we can build the rest of your week around it.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const selectedRecipes = selectedRecipeIds
        .map((id) => recipes.find((r) => r.id === id) ?? null)
        .filter((r): r is OnboardingRecipe => r !== null);

      const plannedMeals = buildSchedule(selectedRecipes, filteredRecipes, selectedDays, selectedRequirements);
      await persistWeekPlan(userId, plannedMeals, effectiveWeek, effectiveYear);
      setReadyState({ meals: plannedMeals, weekLabel });
      setStep("ready");
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "We couldn't build your week yet.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white px-4 pb-4 pt-3 text-[#3A2A1F]">
      <OnboardingHero
        step={step}
        readyState={readyState}
        weekLabel={weekLabel}
        isCurrentWeek={isCurrentWeek}
        onCancel={onCancel}
      />
      <ErrorNotice error={error} />
      {loading ? (
        <LoadingPanel />
      ) : (
        <StepContent
          step={step}
          selectedRequirements={selectedRequirements}
          selectedRecipeIds={selectedRecipeIds}
          selectedDays={selectedDays}
          recipePages={recipePages}
          activeRecipePage={activeRecipePage}
          recipePage={recipePage}
          touchStartX={touchStartX}
          readyState={readyState}
          isSaving={isSaving}
          weekMondayDate={weekMondayDate}
          weekLabel={weekLabel}
          onSetTouchStartX={setTouchStartX}
          onToggleRequirement={handleToggleRequirement}
          onContinueWithoutFilters={() => setStep("recipes")}
          onBackToFilters={() => setStep("diet")}
          onToggleRecipe={handleToggleRecipe}
          onAdvanceRecipePage={handleAdvanceRecipePage}
          onContinueToDays={() => setStep("days")}
          onToggleDay={handleToggleDay}
          onBuildWeek={() => void handleBuildWeek()}
          onFinish={onCancel}
        />
      )}
    </div>
  );
}
