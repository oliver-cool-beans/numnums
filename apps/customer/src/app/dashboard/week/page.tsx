"use client";

import Image from "next/image";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Shuffle, Sparkles } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { toast } from "@/lib/toast";

import { useAuth } from "@/lib/auth-context";
import { SubPageShell } from "@/components/dashboard/SubPageShell";
import { useUserMealPlan, useRecipeSwap, useFamilyContext } from "@/lib/hooks";
import { RecipeSwapPicker, FamilyWeekPlan } from "@/components/dashboard";
import { FriendsWeekPanel } from "@/components/dashboard/FriendsWeekPanel";
import { AddToWeekSheet } from "@/components/dashboard/AddToWeekSheet";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentWeek, getWeekAtOffset, getWeekLabel } from "@/lib/utils";
import { formatDifficulty } from "@/lib/recipeSchedule";
import { generateWeekPlan, swapWeekDays } from "@/lib/mealPlanActions";
import { supabase } from "@/lib/supabase-client";
import type { MealPlanDay } from "@/lib/hooks/useUserMealPlan";
import type { Weekday } from "@/lib/recipeSchedule";

// ─── Drag overlay (ghost card shown while dragging) ──────────────────────────

function DayRowOverlay({ entry }: { entry: MealPlanDay }) {
  const recipe = entry.recipe;
  const dayLabel = entry.dayLabel.charAt(0) + entry.dayLabel.slice(1).toLowerCase();
  return (
    <div className="rounded-2xl border-2 border-[#7CB342] bg-white px-3 py-3 shadow-2xl ring-4 ring-[#7CB342]/20 scale-[1.04]">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[16px] bg-[#E7D9CD]">
          {recipe?.image_url && (
            <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" sizes="64px" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9E8B7E]">{dayLabel}</p>
          <p className="truncate text-sm font-medium text-[#3A2A1F]">{recipe?.name ?? "—"}</p>
          {recipe && (
            <p className="mt-0.5 text-xs text-[#6F5B4B]">
              {recipe.total_minutes ?? 25} mins · {formatDifficulty(recipe.difficulty)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable day row ─────────────────────────────────────────────────────────

function DraggableDayRow({
  entry,
  week,
  year,
  recipeSwap,
}: {
  entry: MealPlanDay;
  week: number;
  year: number;
  recipeSwap: ReturnType<typeof useRecipeSwap>;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: entry.day });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: entry.day });

  const setRef = useCallback(
    (el: HTMLLIElement | null) => {
      setDragRef(el);
      setDropRef(el);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const recipe = entry.recipe;
  const isPending = recipeSwap.pending && recipeSwap.target?.day === entry.day;
  const dayLabel = entry.dayLabel.charAt(0) + entry.dayLabel.slice(1).toLowerCase();

  return (
    <li
      ref={setRef}
      {...attributes}
      className={[
        "rounded-2xl border px-3 py-3 transition-all select-none",
        isOver && !isDragging ? "border-[#7CB342] bg-[#F0F9E8] scale-[1.02]" : "border-[#F0E8DE]",
        isDragging ? "opacity-25" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle — the image square */}
        <div
          {...listeners}
          className="relative h-16 w-16 shrink-0 cursor-grab overflow-hidden rounded-[16px] bg-[#E7D9CD] touch-none active:cursor-grabbing"
        >
          {recipe?.image_url && (
            <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" sizes="64px" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9E8B7E]">{dayLabel}</p>
          <p className="truncate text-sm font-medium text-[#3A2A1F]">
            {recipe?.name ?? "—"}
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
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function WeekViewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useAuth();

  const current = getCurrentWeek();
  const week = Number(searchParams.get("week")) || current.week;
  const year = Number(searchParams.get("year")) || current.year;
  const weekLabel = getWeekLabel(week, year);
  const isCurrentWeek = week === current.week && year === current.year;

  const familyContext = useFamilyContext(user?.id);

  const { mealPlan, loading: mealPlanLoading, refetch } = useUserMealPlan(user?.id, week, year);
  const recipeSwap = useRecipeSwap(user?.id, refetch);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [activeWeekTab, setActiveWeekTab] = useState<"mine" | "friends">("mine");
  const [addToWeekTarget, setAddToWeekTarget] = useState<{ recipeId: string; recipeName: string } | null>(null);

  // Local copy of days for optimistic DnD updates
  const [localDays, setLocalDays] = useState<MealPlanDay[]>([]);
  const [activeDragDay, setActiveDragDay] = useState<string | null>(null);

  useEffect(() => {
    if (mealPlan?.days) setLocalDays(mealPlan.days);
  }, [mealPlan?.days]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragDay(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragDay(null);
      const { active, over } = event;
      if (!over || active.id === over.id || !user) return;

      const srcDay = String(active.id) as Weekday;
      const dstDay = String(over.id) as Weekday;

      // Optimistic swap: keep day labels fixed, swap recipes
      const srcEntry = localDays.find((d) => d.day === srcDay);
      const dstEntry = localDays.find((d) => d.day === dstDay);
      const newDays = localDays.map((d) => {
        if (d.day === srcDay) return { ...d, recipe: dstEntry?.recipe ?? null };
        if (d.day === dstDay) return { ...d, recipe: srcEntry?.recipe ?? null };
        return d;
      });
      setLocalDays(newDays);

      void swapWeekDays(user.id, week, year, srcDay, dstDay).catch(() => {
        toast.error("Failed to save. Try again.");
        if (mealPlan?.days) setLocalDays(mealPlan.days);
      });
    },
    [localDays, user, week, year, mealPlan?.days],
  );

  const handleRegenerateWeek = async () => {
    if (!user) return;
    setShowRegenConfirm(false);
    setRegenerating(true);
    try {
      await generateWeekPlan(user.id, week, year);
      await refetch();
      toast.success("Week regenerated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regeneration failed. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyWeek = async (days: { day: Weekday; recipeId: string | null }[]) => {
    if (!user) return;
    const nextWeek = getWeekAtOffset(1);
    const updates: Record<string, string | null> = {};
    for (const d of days) updates[`${d.day}_recipe_id`] = d.recipeId;
    const { error } = await supabase
      .from("user_meal_plans")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ user_id: user.id, week_number: nextWeek.week, year: nextWeek.year, ...updates } as any, { onConflict: "user_id,week_number,year" });
    if (error) { toast.error("Couldn't copy week. Try again."); return; }
    toast.success("Week copied to next week!");
    refetch();
  };

  if (userLoading) {
    return <LoadingScreen title="Your week" message="Just a moment..." />;
  }

  if (!user) return null;

  const activeDayEntry = activeDragDay ? localDays.find((d) => d.day === activeDragDay) : null;

  return (
    <SubPageShell>
      <main className="mx-auto flex h-full w-full max-w-[390px] flex-col bg-white md:h-auto md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
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
          {(!familyContext || familyContext.isOwner) && (
            <button
              type="button"
              onClick={() => setShowRegenConfirm(true)}
              disabled={regenerating || mealPlanLoading}
              aria-label="Regenerate week"
              title="Regenerate week"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7CB342] text-white shadow-sm transition-colors hover:bg-[#689F38] disabled:opacity-50"
            >
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </button>
          )}
        </header>

        {/* Tab bar — only shown when not in a family context */}
        {!familyContext && (
          <div className="flex gap-1 border-b border-[#F0E8DE] px-5">
            {(["mine", "friends"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveWeekTab(tab)}
                className={`pb-2.5 pt-1 text-sm font-semibold capitalize transition-colors border-b-2 mr-3 ${
                  activeWeekTab === tab
                    ? "border-[#7CB342] text-[#3A2A1F]"
                    : "border-transparent text-[#9E8B7E] hover:text-[#6F5B4B]"
                }`}
              >
                {tab === "mine" ? "My week" : "Friends"}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-10">
          {familyContext ? (
            <FamilyWeekPlan
              familyId={familyContext.familyId}
              ownerId={familyContext.ownerId}
              ownerName={familyContext.ownerName}
              currentUserId={user.id}
              isOwner={familyContext.isOwner}
              week={week}
              year={year}
            />
          ) : activeWeekTab === "friends" ? (
            <FriendsWeekPanel
              currentUserId={user.id}
              onAddDay={(recipeId, recipeName) => setAddToWeekTarget({ recipeId, recipeName })}
              onCopyWeek={(days) => void handleCopyWeek(days)}
            />
          ) : (
            <>
              {(mealPlanLoading || regenerating) && (
                <ul className="mt-2 space-y-2.5">
                  {["mon", "tue", "wed", "thu", "fri"].map((d) => (
                    <li key={d} className="rounded-2xl border border-[#F0E8DE] px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-16 w-16 shrink-0 rounded-[16px] bg-[#F0E8DE]" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-2.5 w-8 bg-[#F0E8DE]" />
                          <Skeleton className="h-4 w-40 bg-[#F0E8DE]" />
                          <Skeleton className="h-3 w-24 bg-[#F0E8DE]" />
                        </div>
                        <Skeleton className="h-7 w-16 shrink-0 rounded-full bg-[#F0E8DE]" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!mealPlanLoading && !regenerating && !mealPlan && (
                <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FAF6F2] px-4 py-6 text-center">
                  <p className="text-sm text-[#6F5B4B]">Nothing planned for this week yet.</p>
                </div>
              )}
              {!mealPlanLoading && !regenerating && mealPlan && (
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <ul className="mt-2 space-y-2.5">
                    {localDays.map((entry) => (
                      <DraggableDayRow
                        key={entry.day}
                        entry={entry}
                        week={week}
                        year={year}
                        recipeSwap={recipeSwap}
                      />
                    ))}
                  </ul>
                  <DragOverlay dropAnimation={null}>
                    {activeDayEntry && <DayRowOverlay entry={activeDayEntry} />}
                  </DragOverlay>
                </DndContext>
              )}
            </>
          )}
        </div>
      </main>

      {!familyContext && recipeSwap.target && (
        <RecipeSwapPicker
          userId={user.id}
          day={recipeSwap.target.day}
          title="Swap recipe"
          currentRecipeId={recipeSwap.target.currentRecipeId}
          currentRecipeName={
            mealPlan?.days.find((d) => d.day === recipeSwap.target?.day)?.recipe?.name ?? null
          }
          recentRecipeIds={recipeSwap.recentRecipeIds}
          onCancel={recipeSwap.close}
          onSelect={(recipe) => void recipeSwap.handleSelect(recipe)}
        />
      )}

      {showRegenConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#3A2A1F]">Regenerate this week?</h2>
            <p className="mt-2 text-sm leading-5 text-[#6F5B4B]">
              This will reset and repick all recipes for {isCurrentWeek ? "this week" : weekLabel}. Any swaps you&apos;ve made will be lost.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowRegenConfirm(false)}
                className="flex-1 rounded-[14px] border border-[#E7D9CD] bg-white py-3 text-sm font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F5EDE0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRegenerateWeek()}
                className="flex-1 rounded-[14px] bg-[#7CB342] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#689F38]"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {addToWeekTarget && (
        <AddToWeekSheet
          recipeName={addToWeekTarget.recipeName}
          onAdd={(day, targetWeek, targetYear) => {
            const col = `${day}_recipe_id`;
            void supabase
              .from("user_meal_plans")
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .upsert({ user_id: user.id, week_number: targetWeek, year: targetYear, [col]: addToWeekTarget.recipeId } as any, { onConflict: "user_id,week_number,year" })
              .then(({ error }) => {
                if (error) toast.error("Couldn't add recipe. Try again.");
                else { toast.success("Added to your week!"); refetch(); }
              });
            setAddToWeekTarget(null);
          }}
          onClose={() => setAddToWeekTarget(null)}
        />
      )}
    </SubPageShell>
  );
}

export default function WeekViewPage() {
  return (
    <Suspense>
      <WeekViewInner />
    </Suspense>
  );
}
