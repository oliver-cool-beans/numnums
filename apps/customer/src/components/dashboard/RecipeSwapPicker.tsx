"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, ChevronRight, Loader2, Search, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type OnboardingRecipe,
  type Weekday,
  buildRecipeBadges,
  buildSchedule,
  chunkRecipes,
  fetchOnboardingRecipes,
  getFilteredRecipes,
} from "@/lib/recipeSchedule";
import { fetchDietaryPreferences } from "@/lib/dietaryPreferences";

type RecipeSwapPickerProps = {
  userId: string;
  day: Weekday;
  title: string;
  currentRecipeId: string | null;
  recentRecipeIds: Set<string>;
  onCancel: () => void;
  onSelect: (recipe: OnboardingRecipe) => void;
};

function matchesSearch(recipe: OnboardingRecipe, query: string) {
  const text = [recipe.name, recipe.headline, recipe.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return text.includes(query.toLowerCase());
}

export function RecipeSwapPicker({
  userId,
  day,
  title,
  currentRecipeId,
  recentRecipeIds,
  onCancel,
  onSelect,
}: RecipeSwapPickerProps) {
  const [recipes, setRecipes] = useState<OnboardingRecipe[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [shownRandomIds, setShownRandomIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchOnboardingRecipes(), fetchDietaryPreferences(userId)])
      .then(([allRecipes, savedPreferences]) => {
        if (!isMounted) return;
        setRecipes(allRecipes);
        setPreferences(savedPreferences);
      })
      .catch((fetchError) => {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : "We couldn't load recipes.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [userId]);

  const filteredPool = useMemo(() => getFilteredRecipes(recipes, preferences), [recipes, preferences]);

  const visibleRecipes = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return filteredPool;
    return filteredPool.filter((recipe) => matchesSearch(recipe, trimmed));
  }, [filteredPool, query]);

  const pages = useMemo(() => chunkRecipes(visibleRecipes), [visibleRecipes]);
  const activePage = pages[page] ?? [];

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  const handleRandom = () => {
    const exclude = new Set([...recentRecipeIds, ...shownRandomIds]);
    if (currentRecipeId) exclude.add(currentRecipeId);

    let pool = filteredPool.filter((r) => !exclude.has(r.id));
    if (pool.length === 0) pool = filteredPool.filter((r) => r.id !== currentRecipeId);
    if (pool.length === 0) pool = filteredPool;
    if (pool.length === 0) return;

    const [pick] = buildSchedule([], pool, [day], preferences, recentRecipeIds);
    if (!pick) return;

    setShownRandomIds((prev) => [...prev, pick.recipe.id]);
    onSelect(pick.recipe);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="mx-auto flex min-h-full w-full max-w-[390px] flex-col px-4 pb-8 pt-3 text-[#3A2A1F] md:max-w-[600px]">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full border border-[#D9CCBB] bg-white/80 text-[#3A2A1F] shadow-sm"
            onClick={onCancel}
          >
            <ArrowLeft />
          </Button>
          <p className="text-center text-base font-semibold leading-none text-[#3A2A1F]">{title}</p>
          <div aria-hidden="true" className="size-11" />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-[#E8DCCB] bg-white px-4 py-2.5 shadow-sm">
          <Search className="size-4 text-[#9E8B7E]" />
          <input
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search recipes..."
            className="flex-1 bg-transparent text-sm text-[#3A2A1F] outline-none placeholder:text-[#9E8B7E]"
          />
        </div>

        <button
          type="button"
          onClick={handleRandom}
          disabled={loading || filteredPool.length === 0}
          className="mt-3 inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#7CB342] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#689F38] disabled:opacity-50"
        >
          <Shuffle className="size-4" />
          Surprise me
        </button>

        {error && (
          <div className="mt-4 rounded-[16px] border border-[#E4B9A3] bg-[#FFF1EB] px-4 py-3 text-sm text-[#9A4B1E]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-[#9E8B7E]" />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {activePage.map((recipe) => {
                const badges = buildRecipeBadges(recipe);
                const isCurrent = recipe.id === currentRecipeId;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => onSelect(recipe)}
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-[24px] border bg-white text-left transition-all",
                      isCurrent
                        ? "border-[#7CB342] shadow-[0_12px_30px_rgba(124,179,66,0.18)]"
                        : "border-[#E8DCCB] hover:-translate-y-0.5 hover:border-[#7CB342]/60",
                    )}
                  >
                    <div className="relative h-28 w-full shrink-0">
                      {recipe.image_url ? (
                        <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" sizes="110px" />
                      ) : (
                        <div className="h-full w-full bg-[#D9CCBB]" />
                      )}
                      {isCurrent && (
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-[#558B2F]">
                          <Check className="size-3" strokeWidth={2.5} />
                          Current
                        </span>
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
                  </button>
                );
              })}
            </div>

            {visibleRecipes.length === 0 && (
              <p className="mt-8 text-center text-sm text-[#9E8B7E]">No recipes match your search.</p>
            )}

            {pages.length > 1 && (
              <div className="mt-3 flex items-center justify-between text-sm text-[#6F5B4B]">
                <span>
                  {pages.length > 0 ? page + 1 : 0} of {pages.length || 1}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-[#3A2A1F] disabled:opacity-40"
                  onClick={() => setPage((p) => (p + 1) % pages.length)}
                >
                  More recipes
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
