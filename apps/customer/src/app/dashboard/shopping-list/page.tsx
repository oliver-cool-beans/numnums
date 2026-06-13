"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, ShoppingCart, Copy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useShoppingListFull, useFamilyContext, type EnrichedItem } from "@/lib/hooks";
import { SubPageShell } from "@/components/dashboard";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Skeleton } from "@/components/ui/skeleton";
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

function categoryFromProductCategory(c: string): string | null {
  if (/(meat|poultry|fish|seafood)/.test(c)) return "Meat & Fish";
  if (/(dairy|egg|cheese|milk)/.test(c)) return "Dairy & Eggs";
  if (/(veg|produce|salad|fresh)/.test(c)) return "Vegetables";
  if (/fruit/.test(c)) return "Fruit";
  if (/(bread|bakery)/.test(c)) return "Bakery";
  if (/(herb|spice)/.test(c)) return "Fresh Herbs";
  return null;
}

function categoryFromHandle(h: string): string {
  if (/(chicken|beef|pork|lamb|turkey|bacon|sausage|mince|salmon|tuna|cod|fish|prawn|shrimp|ham|steak|duck)/.test(h)) return "Meat & Fish";
  if (/(^milk|cheese|butter|cream|yogur|cheddar|mozzarella|parmesan|feta|ricotta|-egg)/.test(h)) return "Dairy & Eggs";
  if (/(bread|baguette|tortilla|pitta|wrap|naan)/.test(h)) return "Bakery";
  if (/(coriander|parsley|basil|mint|thyme|rosemary|chive|dill|sage|oregano)/.test(h)) return "Fresh Herbs";
  if (/(lemon|lime|orange|apple|banana|mango|strawberry|raspberry|grape|pear|blueberry|kiwi|melon)/.test(h)) return "Fruit";
  if (/(pineapple|cherry|peach)/.test(h)) return "Fruit";
  if (/(tomato|onion|garlic|carrot|potato|broccoli|spinach|lettuce|pepper|aubergine|mushroom|leek)/.test(h)) return "Vegetables";
  if (/(celery|cucumber|beetroot|asparagus|courgette|kale|cabbage|cauliflower|ginger|parsnip|squash|pumpkin|capsicum|avocado)/.test(h)) return "Vegetables";
  return "Pantry & Other";
}

function deriveCategory(handle: string, productCategory: string | null, isPantry: boolean): string {
  if (isPantry) return "Pantry & Other";
  if (productCategory) {
    const result = categoryFromProductCategory(productCategory.toLowerCase());
    if (result) return result;
  }
  return categoryFromHandle(handle.toLowerCase());
}

const SOURCE_LOGOS: Record<string, { src: string; alt: string }> = {
  aldi: { src: "/aldi.svg", alt: "ALDI" },
};

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

function deriveName(item: EnrichedItem): string {
  if (item.product_name) return item.product_name;
  if (item.ingredient_handle) return formatHandle(item.ingredient_handle);
  return "Item";
}

function ItemRow({ item, onToggle }: { item: EnrichedItem; onToggle: (id: string, checked: boolean) => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const name = deriveName(item);
  const subtitle = item.product_name && item.ingredient_handle ? formatHandle(item.ingredient_handle) : null;
  const qty = item.product_id && item.quantity_needed > 1 ? `×${item.quantity_needed}` : null;
  const sourceLogo = item.product_source ? SOURCE_LOGOS[item.product_source.toLowerCase()] : null;

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
      {item.product_image_url ? (
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#F5EDE0]">
          {!imgLoaded && <Skeleton className="absolute inset-0 rounded-xl bg-[#F0E8DE]" />}
          <Image src={item.product_image_url} alt={name} fill className="object-contain" sizes="44px" onLoad={() => setImgLoaded(true)} />
          {sourceLogo && (
            <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
              <Image src={sourceLogo.src} alt={sourceLogo.alt} width={24} height={24} className="object-contain" />
            </span>
          )}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-base font-medium text-[#3A2A1F]",
            item.is_checked && "line-through",
          )}
        >
          {name}
        </span>
        <span className="flex items-center gap-1.5">
          {subtitle && (
            <span className="truncate text-xs text-[#9E8B7E]">{subtitle}</span>
          )}
          {sourceLogo && !item.product_image_url && (
            <Image src={sourceLogo.src} alt={sourceLogo.alt} width={14} height={14} className="shrink-0 object-contain" />
          )}
          {sourceLogo && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#7CB342]">
              {sourceLogo.alt}
            </span>
          )}
        </span>
      </span>
      {qty && <span className="shrink-0 text-sm font-semibold text-[#9E8B7E]">{qty}</span>}
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

function CategorySkeleton({ rows }: { rows: number }) {
  return (
    <section>
      <div className="bg-[#FFF7E8] px-5 py-2">
        <Skeleton className="h-3 w-24 bg-[#F0E8DE]" />
      </div>
      <div className="divide-y divide-[#F0E8DE]">
        {Array.from({ length: rows }, (_, i) => `row-${i}`).map((key) => (
          <div key={key} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full bg-[#F0E8DE]" />
            <Skeleton className="h-4 flex-1 max-w-[60%] bg-[#F0E8DE]" />
          </div>
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
}: {
  children: React.ReactNode;
}) {
  return (
    <SubPageShell activeTab="list">
      {children}
    </SubPageShell>
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

  const weekFilter = isCurrentWeek ? undefined : { weekNumber: activeWeek, weekYear: activeYear };

  // For family members, show the owner's shopping list (same as the owner's meal plan)
  const familyContext = useFamilyContext(user?.id);
  const isFamilyLoading = user?.id !== undefined && familyContext === undefined;
  const listUserId = isFamilyLoading ? undefined : (familyContext?.ownerId ?? user?.id);

  const { list, loading: listLoading, error, toggleItem, completeList, uncompleteList, quickComplete } = useShoppingListFull(
    listUserId,
    weekFilter,
  );
  const loading = authLoading || isFamilyLoading || listLoading;

  const [listCopied, setListCopied] = useState(false);
  const [showPantry, setShowPantry] = useState(false);

  const visibleItems = list
    ? list.items.filter((i) => showPantry || !i.is_pantry)
    : [];
  const pantryCount = list
    ? list.items.filter((i) => i.is_pantry).length
    : 0;

  const copyList = () => {
    if (!list) return;
    const groups = groupByCategory(visibleItems);
    const lines: string[] = ["Shopping list:"];
    for (const { category, items } of groups) {
      lines.push("", category);
      for (const item of items) {
        const name = item.product_name || formatHandle(item.ingredient_handle);
        const qty = item.quantity_needed > 1 ? ` ×${item.quantity_needed}` : "";
        lines.push(`• ${name}${qty}`);
      }
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setListCopied(true);
    setTimeout(() => setListCopied(false), 2000);
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const navigate = (weekOffset: number) => {
    const totalOffset = (activeYear - currentYear) * 52 + (activeWeek - currentWeek) + weekOffset;
    const { week: nextWeek, year: nextYear } = getWeekAtOffset(totalOffset);
    router.push(`/dashboard/shopping-list?week=${nextWeek}&year=${nextYear}`);
  };

  const goToCurrent = () => router.push("/dashboard/shopping-list");

  // We can't know whether to render this page or redirect to "/" until the
  // session resolves, so this is the rare full-page block — same screen as login.
  if (authLoading) {
    return <LoadingScreen title="Loading" message="Getting your account ready..." />;
  }

  // The list itself mirrors the loaded layout (header, week nav, progress bar,
  // categorized item rows) so the real content can drop straight into place.
  if (loading) {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-0 md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
          <header className="flex items-center gap-3 px-5 pb-3 pt-14">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-[#3A2A1F]">Shopping list</h1>
            </div>
            <Skeleton className="h-4 w-12 bg-[#F0E8DE]" />
          </header>

          <div className="flex items-center justify-between px-5 pb-2 pt-1">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-[#F0E8DE]" />
            <Skeleton className="mx-2 h-7 flex-1 rounded-full bg-[#F0E8DE]" />
            <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-[#F0E8DE]" />
          </div>

          <Skeleton className="mx-5 mb-1 h-2.5 rounded-full bg-[#F0E8DE]" />

          <div className="flex justify-end px-5 pb-2 pt-2">
            <Skeleton className="h-4 w-24 bg-[#F0E8DE]" />
          </div>

          <div className="flex-1 overflow-hidden pb-28 md:pb-0">
            <div className="divide-y divide-[#F0E8DE]">
              <CategorySkeleton rows={3} />
              <CategorySkeleton rows={2} />
              <CategorySkeleton rows={4} />
            </div>
          </div>
        </main>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-[400px] md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
          <header className="flex items-center gap-3 px-5 pb-4 pt-14">
            <button type="button" onClick={() => router.push("/dashboard")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm" aria-label="Go back">
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

  if (!list) {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-[400px] md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
          <header className="flex items-center gap-3 px-5 pb-3 pt-14">
            <button type="button" onClick={() => router.push("/dashboard")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm" aria-label="Go back">
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
            <p className="text-center text-sm text-[#9E8B7E]">Plan this week&apos;s recipes first to generate a list.</p>
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

  const groups = groupByCategory(visibleItems);
  const totalItems = visibleItems.length;
  const checkedItems = visibleItems.filter((i) => i.is_checked).length;
  const isCompleted = list.status === "completed";

  if (isCompleted) {
    return (
      <PageShell>
        <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-[400px] md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
          <header className="flex items-center gap-3 px-5 pb-3 pt-14">
            <button type="button" onClick={() => router.push("/dashboard")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm" aria-label="Go back">
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
            <button
              type="button"
              onClick={() => uncompleteList(list.id)}
              className="text-sm text-[#9E8B7E] underline underline-offset-2 transition-colors active:text-[#3A2A1F]"
            >
              Marked this by accident? Undo
            </button>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-white md:min-h-0 md:max-w-[600px] md:rounded-[28px] md:shadow-[0_4px_40px_rgba(58,42,31,0.10)] md:overflow-hidden">
        <header className="flex items-center gap-3 px-5 pb-3 pt-14">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#3A2A1F] shadow-sm transition-colors hover:bg-[#F5EDE0]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 min-w-0 items-center gap-1">
            <h1 className="text-2xl font-semibold text-[#3A2A1F]">Shopping list</h1>
            <button
              type="button"
              onClick={copyList}
              aria-label="Copy shopping list"
              className="flex items-center justify-center rounded-full p-2 text-[#A89080] transition-colors active:text-[#3A2A1F]"
            >
              {listCopied ? <Check className="h-[18px] w-[18px] text-[#7CB342]" strokeWidth={2.5} /> : <Copy className="h-[18px] w-[18px]" />}
            </button>
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

        <div className="mx-5 mb-1 h-2.5 overflow-hidden rounded-full bg-[#F0E8DE]">
          <div
            className="h-full rounded-full bg-[#7CB342] transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-5 pb-3 pt-2">
          {pantryCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowPantry((v) => !v)}
              className="text-sm text-[#9E8B7E] underline underline-offset-2 transition-colors active:text-[#3A2A1F]"
            >
              {showPantry ? "Hide pantry items" : `Show pantry items (${pantryCount})`}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => quickComplete(list.id)}
            className="rounded-full bg-[#F0E8DE] px-3 py-1.5 text-xs font-semibold text-[#6F5B4B] transition-colors active:bg-[#E7D9CD] active:text-[#3A2A1F]"
          >
            Mark all done
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-28 md:pb-0">
          {list.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
              <p className="text-[#6F5B4B]">Your shopping list is empty.</p>
              <p className="text-sm text-[#9E8B7E]">The recipes in this week&apos;s plan may not have ingredients linked yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0E8DE]">
              {groups.map(({ category, items }) => (
                <CategorySection key={category} category={category} items={items} onToggle={toggleItem} />
              ))}
            </div>
          )}
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
