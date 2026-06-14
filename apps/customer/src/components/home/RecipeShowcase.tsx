"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Clock, Users } from "lucide-react";
import { supabase } from "@/lib/supabase-client";

type Recipe = {
  id: string;
  name: string;
  headline: string | null;
  image_url: string | null;
  total_minutes: number | null;
  servings: number | null;
};

type FilterDef = {
  id: string;
  label: string;
  keywords?: string[];
  maxMinutes?: number;
};

const PAGE_SIZE = 50;

const FILTERS: FilterDef[] = [
  { id: "all", label: "All" },
  { id: "chicken", label: "Chicken", keywords: ["chicken"] },
  { id: "beef", label: "Beef", keywords: ["beef", "steak", "mince", "burger"] },
  { id: "fish", label: "Fish & Seafood", keywords: ["fish", "salmon", "tuna", "prawn", "shrimp", "seafood", "cod", "haddock"] },
  { id: "veggie", label: "Veggie", keywords: ["veggie", "vegetarian", "vegan", "tofu", "halloumi", "lentil", "chickpea"] },
  { id: "pasta", label: "Pasta & Noodles", keywords: ["pasta", "spaghetti", "penne", "noodle", "fettuccine", "linguine", "risotto"] },
  { id: "quick", label: "Under 30 min", maxMinutes: 30 },
];

const EP_BASE = "https://media.everyplate.com/w_800,q_auto,f_auto,c_limit,fl_lossy/everyplate_s3";
const EP_CF_HOST = "d3hvwccx09j84u.cloudfront.net";

function normalizeImageUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("/image/")) return `${EP_BASE}${raw}`;
  try {
    const u = new URL(raw);
    if (u.hostname === EP_CF_HOST) {
      const m = /^\/0,0(\/image\/.+)$/.exec(u.pathname);
      if (m) return `${EP_BASE}${m[1]}`;
    }
  } catch { /* not a URL */ }
  return raw;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchRecipes(filter: FilterDef): Promise<Recipe[]> {
  let q = supabase
    .from("recipes")
    .select("id, name, headline, image_url, total_minutes, servings")
    .not("image_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (filter.id !== "all") {
    if (filter.maxMinutes !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      q = (q.not("total_minutes", "is", null) as any).lte("total_minutes", filter.maxMinutes);
    } else if (filter.keywords?.length) {
      const parts = filter.keywords.flatMap((k) => [
        `name.ilike.%${k}%`,
        `headline.ilike.%${k}%`,
      ]);
      q = q.or(parts.join(","));
    }
  }

  const { data } = await q;
  return shuffle(data ?? []);
}

function RecipeSkeleton() {
  return (
    <div className="overflow-hidden">
      <div className="aspect-[4/3] animate-pulse rounded-xl bg-gray-100" />
      <div className="flex flex-col gap-2 pt-3">
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
        <div className="flex gap-3 pt-0.5">
          <div className="h-3 w-14 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-14 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const imageUrl = normalizeImageUrl(recipe.image_url);
  const [loaded, setLoaded] = useState(false);
  if (!imageUrl) return null;
  return (
    <div className="group overflow-hidden">
      <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 ${!loaded ? "animate-pulse" : ""}`}>
        <Image
          src={imageUrl}
          alt={recipe.name}
          fill
          loading="lazy"
          className={`object-cover transition-all duration-500 ease-out group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
          sizes="(max-width: 768px) 50vw, 25vw"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="flex flex-col gap-0.5 pt-2 pb-1 md:gap-1 md:pt-3 md:pb-2">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#18181B] md:text-[14px]">
          {recipe.name}
        </p>
        {recipe.headline && (
          <p className="line-clamp-1 text-[11px] text-[#71717A] md:text-[12px]">{recipe.headline}</p>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#71717A] md:gap-3 md:text-[12px]">
          {!!recipe.total_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {recipe.total_minutes} min
            </span>
          )}
          {!!recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 shrink-0" />
              {recipe.servings} servings
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecipeShowcase() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterDef>(FILTERS[0]);

  useEffect(() => {
    setRecipes(null);
    fetchRecipes(activeFilter).then(setRecipes);
  }, [activeFilter]);

  return (
    <div>
      <h2 className="mb-3 text-[20px] font-bold tracking-[-0.02em] text-[#18181B] md:mb-4 md:text-[22px]">
        What&apos;s for dinner?
      </h2>

      {/* Filter pills — left-aligned on mobile so scroll starts from the left */}
      <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-5 md:justify-center md:px-5 lg:-mx-10 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              activeFilter.id === f.id
                ? "border-[#22C55E] bg-[#22C55E] text-white"
                : "border-[#E4E4E7] bg-white text-[#71717A] hover:border-[#22C55E] hover:text-[#22C55E]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {recipes === null
          ? Array.from({ length: 10 }, (_, i) => <RecipeSkeleton key={`sk-${i}`} />)
          : recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
      </div>

      {recipes !== null && recipes.length === 0 && (
        <p className="py-16 text-center text-[15px] text-[#71717A]">
          No recipes match this filter.
        </p>
      )}
    </div>
  );
}
