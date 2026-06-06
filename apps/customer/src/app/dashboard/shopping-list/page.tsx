"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, ShoppingCart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useShoppingListFull, type EnrichedItem } from "@/lib/hooks/useShoppingListFull";
import { SideNav } from "@/components/dashboard";
import { NumnumsBackground } from "@/components/ui/NumnumsBackground";
import { cn, getCurrentWeek, getWeekAtOffset, getWeekLabel } from "@/lib/utils";

// ─── Category helpers ────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Meat & Fish",
  "Dairy & Eggs",
  "Vegetables",
  "Fruit",
  "Bakery",
  "Fresh Herbs",
  "Pantry & Other",
];

function deriveCategory(handle: string, productCategory: string | null, isPantry: boolean): string {
  if (isPantry) return "Pantry & Other";

  if (productCategory) {
    const c = productCategory.toLowerCase();
    if (/(meat|poultry|fish|seafood)/.test(c)) return "Meat & Fish";
    if (/(dairy|egg|cheese|milk)/.test(c)) return "Dairy & Eggs";
    if (/(veg|produce|salad|fresh)/.test(c)) return "Vegetables";
    if (/fruit/.test(c)) return "Fruit";
    if (/(bread|bakery)/.test(c)) return "Bakery";
    if (/(herb|spice)/.test(c)) return "Fresh Herbs";
  }

  const h = handle.toLowerCase();
  if (/(chicken|beef|pork|lamb|turkey|bacon|sausage|mince|salmon|tuna|cod|fish|prawn|shrimp|ham|steak|duck)/.test(h)) return "Meat & Fish";
  if (/(^milk|cheese|butter|cream|yogur|cheddar|mozzarella|parmesan|feta|ricotta|-egg)/.test(h)) return "Dairy & Eggs";
  if (/(bread|baguette|tortilla|pitta|wrap|naan)/.test(h)) return "Bakery";
  if (/(coriander|parsley|basil|mint|thyme|rosemary|chive|dill|sage|oregano)/.test(h)) return "Fresh Herbs";
  if (/(lemon|lime|orange|apple|banana|mango|strawberry|raspberry|grape|pear|blueberry|kiwi|melon|pineapple|cherry|peach)/.test(h)) return "Fruit";
  if (/(tomato|onion|garlic|carrot|potato|broccoli|spinach|lettuce|pepper|aubergine|mushroom|leek|celery|cucumber|beetroot|asparagus|courgette|kale|cabbage|cauliflower|ginger|parsnip|squash|pumpkin|capsicum|avocado)/.test(h)) return "Vegetables";

  return "Pantry & Other";
}

function formatHandle(handle: string): string {
  return handle
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function groupByCategory(items: EnrichedItem[]): { category: string; items: EnrichedItem[] }[] {
  const map = new Map<string, EnrichedItem[]>();
  for (const item of items) {
    const cat = deriveCategory(item.ingredient_handle, item.product_category, item.is_pantry);
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => ({
    category: cat,
    items: map.get(cat)!,
  }));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ItemRow({ item, onToggle }: { item: EnrichedItem; onToggle: (id: string, checked: boolean) => void }) {
  const name = item.ingredient_handle ? formatHandle(item.ingredient_handle) : "Item";
  const qty = item.quantity_needed > 1 ? `×${item.quantity_needed}` : null;

  return (
    <button
      type="button"
      onClick={() => onToggle(item.id, !item.is_checked)}
      className={cn(
        "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors active:bg-[#FFF7E8]",
        item.is_checked ? "opacity-40" : "",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          item.is_checked ? "border-[#7CB342] bg-[#7CB342]" : "border-[#D9CCBB] bg-white",
        )}
        aria-hidden="true"
      >
        {item.is_checked && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
      </span>
      <span
        className={cn(
          "flex-1 text-base font-medium text-[#3A2A1F]",
          item.is_checked && "line-through",
        )}
      >
        {name}
      </span>
      {qty && <span className="text-sm font-semibold text-[#9E8B7E]">{qty}</span>}
    </button>
  );
}

function CategorySection({
  category,
  items,
  onToggle,
}: {
  category: string;
  items: EnrichedItem[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  const remaining = items.filter((i) => !i.is_checked).length;
  return (
    <section>
      <div className="flex items-center justify-between bg-[#FFF7E8] px-5 py-2">
        <span className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">{category}</span>
        {remaining > 0 && <span className="text-xs text-[#B8A898]">{remaining} left</span>}
      </div>
      <div className="divide-y divide-[#F0E8DE]">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} onToggle={onToggle} />
        ))}
      </div>
    </section>
  );
}

// ─── Week navigation bar ─────────────────────────────────────────────────────

function WeekNav({
  week,
  year,
  onPrev,
  onNext,
  onCurrent,
  isCurrentWeek,
}: {
  week: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  onCurrent: () => void;
  isCurrentWeek: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-1">
      <button
        type="button"
        onClick={onPrev}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5EDE0] text-[#3A2A1F] transition-colors hover:bg-[#EAD9C6]"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onCurrent}
        className={cn(
          "flex-1 mx-2 rounded-full py-1.5 text-center text-xs font-semibold transition-colors",
          isCurrentWeek
            ? "bg-[#7CB342] text-white"
            : "bg-[#F5EDE0] text-[#6F5B4B] hover:bg-[#EAD9C6]",
        )}
      >
        {isCurrentWeek ? "This week" : getWeekLabel(week, year)}
      </button>

      <button
        type="button"
        onClick={onNext}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5EDE0] text-[#3A2A1F] transition-colors hover:bg-[#EAD9C6]"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Shared shell wrapper ─────────────────────────────────────────────────────

function PageShell({
  children,
  router,
}: {
  children: React.ReactNode;
  router: ReturnType<typeof useRouter>;
}) {
  const handleNavChange = (tab: "week" | "list" | "favorites" | "profile") => {
    if (tab === "week") router.push("/dashboard");
  };

  return (
    <div className="min-h-dvh w-full bg-white md:flex md:h-dvh md:overflow-hidden md:bg-[#FAF6F2]">
      <SideNav activeTab="list" onTabChange={handleNavChange} />
      <div className="flex flex-1 flex-col md:overflow-y-auto">
        <div className="relative flex flex-1 flex-col">
          <NumnumsBackground />
          <div className="relative z-10 flex flex-1 flex-col md:items-center md:justify-start md:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inner page (reads search params) ────────────────────────────────────────

function ShoppingListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const paramWeek = searchParams.get("week");
  const paramYear = searchParams.get("year");
  const { week: currentWeek, year: currentYear } = getCurrentWeek();

  const activeWeek = paramWeek ? Number(paramWeek) : currentWeek;
  const activeYear = paramYear ? Number(paramYear) : currentYear;
  const isCurrentWeek = activeWeek === currentWeek && activeYear === currentYear;

  const weekFilter =
    !isCurrentWeek ? { weekNumber: activeWeek, weekYear: activeYear } : undefined;

  const { list, loading, error, toggleItem, completeList, quickComplete } = useShoppingListFull(
    user?.id,
    weekFilter,
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const navigate = (weekOffset: number) => {
    // Compute the target week by adding offset weeks
    const target = new Date();
    target.setDate(target.getDate() + weekOffset * 7);
    // We need getWeekAtOffset relative to the active week, not current date.
    // So compute: active week's Monday + offset * 7
    const { week: cw, year: cy } = getCurrentWeek();
    const weekDiff = (activeYear - cy) * 52 + (activeWeek - cw) + weekOffset;
    const { week: nextWeek, year: nextYear } = (() => {
      const d = new Date();
      d.setDate(d.getDate() + weekDiff * 7);
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = utc.getUTCDay() || 7;
      utc.setUTCDate(utc.getUTCDate() + 4 - day);
      const ys = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
      const wk = Math.ceil((((utc.getTime() - ys.getTime()) / 86400000) + 1) / 7);
      return { week: wk, year: utc.getUTCFullYear() };
    })();
    router.push(`/dashboard/shopping-list?week=${nextWeek}&year=${nextYear}`);
  };

  const goToCurrent = () => router.push("/dashboard/shopping-list");

  if (authLoading || loading) {
    return (
      <PageShell router={router}>
        <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-[400px] md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
          <header className="flex items-center gap-3 px-5 pb-4 pt-14">
            <div className="h-10 w-10 rounded-full bg-[#F0E8DE]" />
            <div className="h-6 w-32 rounded-lg bg-[#F0E8DE]" />
          </header>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-[#9E8B7E]">Loading your list...</p>
          </div>
        </main>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell router={router}>
        <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-[400px] md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
          <header className="flex items-center gap-3 px-5 pb-4 pt-14">
            <button type="button" onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-[#3A2A1F]">Shopping list</h1>
          </header>
          <div className="flex flex-1 items-center justify-center px-5">
            <p className="text-center text-sm text-[#9E8B7E]">Couldn't load your list. Please try again.</p>
          </div>
        </main>
      </PageShell>
    );
  }

  if (!list || list.items.length === 0) {
    return (
      <PageShell router={router}>
        <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-[400px] md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
          <header className="flex items-center gap-3 px-5 pb-3 pt-14">
            <button type="button" onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-[#3A2A1F]">Shopping list</h1>
          </header>
          <WeekNav
            week={activeWeek}
            year={activeYear}
            onPrev={() => navigate(-1)}
            onNext={() => navigate(1)}
            onCurrent={goToCurrent}
            isCurrentWeek={isCurrentWeek}
          />
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7E8]">
              <ShoppingCart className="h-8 w-8 text-[#C4A882]" />
            </div>
            <p className="text-center text-[#6F5B4B]">No list for this week yet.</p>
            <p className="text-center text-sm text-[#9E8B7E]">Plan this week's recipes first to generate a list.</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-1 rounded-full bg-[#7CB342] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Go to dashboard
            </button>
          </div>
        </main>
      </PageShell>
    );
  }

  const groups = groupByCategory(list.items);
  const totalItems = list.items.length;
  const checkedItems = list.items.filter((i) => i.is_checked).length;
  const isCompleted = list.status === "completed";

  if (isCompleted) {
    return (
      <PageShell router={router}>
        <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-[400px] md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
          <header className="flex items-center gap-3 px-5 pb-3 pt-14">
            <button type="button" onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-[#3A2A1F]">Shopping list</h1>
          </header>
          <WeekNav
            week={activeWeek}
            year={activeYear}
            onPrev={() => navigate(-1)}
            onNext={() => navigate(1)}
            onCurrent={goToCurrent}
            isCurrentWeek={isCurrentWeek}
          />
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E7F6DF]">
              <Check className="h-10 w-10 text-[#7CB342]" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-[#3A2A1F]">Shopping done!</p>
              <p className="mt-1 text-sm text-[#8B7355]">Great job picking everything up.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-2 w-full rounded-[20px] bg-[#7CB342] py-4 text-base font-semibold text-white transition-all active:scale-[0.98]"
            >
              Back to dashboard
            </button>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell router={router}>
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
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-[#3A2A1F]">Shopping list</h1>
          </div>
          <span className="shrink-0 text-sm text-[#9E8B7E]">{checkedItems} / {totalItems}</span>
        </header>

        <WeekNav
          week={activeWeek}
          year={activeYear}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onCurrent={goToCurrent}
          isCurrentWeek={isCurrentWeek}
        />

        <div className="mx-5 mb-1 h-1.5 overflow-hidden rounded-full bg-[#F0E8DE]">
          <div
            className="h-full rounded-full bg-[#7CB342] transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }}
          />
        </div>

        <div className="flex justify-end px-5 pb-2 pt-2">
          <button
            type="button"
            onClick={() => quickComplete(list.id)}
            className="text-sm text-[#9E8B7E] underline underline-offset-2 transition-colors active:text-[#3A2A1F]"
          >
            Mark all done
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-28 md:pb-0">
          <div className="divide-y divide-[#F0E8DE]">
            {groups.map(({ category, items }) => (
              <CategorySection key={category} category={category} items={items} onToggle={toggleItem} />
            ))}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-[#F0E8DE] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-[0_-8px_24px_rgba(58,42,31,0.06)] md:relative md:inset-auto md:bottom-auto md:shadow-none md:border-t md:px-5 md:pb-5 md:pt-4">
          <div className="mx-auto max-w-[390px] md:max-w-none">
            <button
              type="button"
              onClick={() => completeList(list.id)}
              className="w-full rounded-[20px] bg-[#7CB342] py-4 text-base font-semibold text-white transition-all active:scale-[0.98] active:bg-[#558B2F]"
            >
              {checkedItems === totalItems ? "Done shopping" : `Done shopping  ·  ${totalItems - checkedItems} left`}
            </button>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ShoppingListPage() {
  return (
    <Suspense>
      <ShoppingListInner />
    </Suspense>
  );
}
