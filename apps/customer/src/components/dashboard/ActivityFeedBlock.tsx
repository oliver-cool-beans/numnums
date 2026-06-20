"use client";

import { useRef } from "react";
import { Heart } from "lucide-react";
import type { ActivityItem } from "@/lib/hooks/useActivityFeed";
import { avatarColor } from "@/lib/avatarColor";
import { Skeleton } from "@/components/ui/skeleton";
import { MealHeroCard } from "./MealHeroCard";

type ActivityFeedBlockProps = {
  items: ActivityItem[];
  currentUserId: string | undefined;
  isFriend: (userId: string) => boolean;
  onRecipeClick?: (recipeId: string) => void;
  onAddToWeek?: (recipeId: string, recipeName: string) => void;
  onToggleLike?: (activityId: number, likedByMe: boolean) => void;
  isLoading?: boolean;
  className?: string;
  flat?: boolean;
};

function eyebrow(item: ActivityItem, currentUserId: string | undefined): string {
  if (item.type === "family_cooked") {
    const family = item.familyName ?? "Your family";
    return `${family}'s cooked`;
  }
  const isMe = item.userId === currentUserId;
  const first = isMe ? "You" : (item.userName ?? "Someone");
  if (item.type === "planned") return isMe ? "You planned your week" : `${first} planned their week`;
  return `${first} cooked`;
}

function avatarLabel(item: ActivityItem): string {
  if (item.type === "family_cooked") return item.familyName?.charAt(0).toUpperCase() ?? "F";
  return item.userName?.charAt(0).toUpperCase() ?? "S";
}

function avatarSeedId(item: ActivityItem): string {
  return item.type === "family_cooked" ? (item.familyId ?? item.userId) : item.userId;
}

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function ActivityCard({
  item,
  currentUserId,
  isFriend,
  onRecipeClick,
  onAddToWeek,
  onToggleLike,
}: {
  item: ActivityItem;
  currentUserId: string | undefined;
  isFriend: (userId: string) => boolean;
  onRecipeClick?: (recipeId: string) => void;
  onAddToWeek?: (recipeId: string, recipeName: string) => void;
  onToggleLike?: (activityId: number, likedByMe: boolean) => void;
}) {
  const isOwnOrFriend = item.userId === currentUserId || isFriend(item.userId);
  const showLike = isOwnOrFriend && item.type !== "planned";

  return (
    <div className="w-[210px] shrink-0 h-[260px]">
      <MealHeroCard
        className="h-full flex flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
        imageHeightClassName="h-[120px]"
        contentClassName="flex flex-1 flex-col px-3.5 pt-3 pb-3.5 overflow-hidden"
        titleClassName="mt-1 line-clamp-2 text-base font-semibold leading-snug text-[#3A2A1F]"
        imageUrl={item.recipeImageUrl}
        title={item.recipeName ?? (item.type === "planned" ? "Planned their week" : "A meal")}
        eyebrow={eyebrow(item, currentUserId)}
        eyebrowClassName="text-[#9B6CD9]"
        onClick={item.recipeId ? () => onRecipeClick?.(item.recipeId!) : undefined}
        avatar={{
          label: avatarLabel(item),
          title: item.type === "family_cooked" ? (item.familyName ?? "Family") : (item.userName ?? "Someone"),
          style: { backgroundColor: avatarColor(avatarSeedId(item)) },
          className:
            "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-sm",
        }}
        meta={
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <p className="text-xs leading-snug text-[#9E8B7E]">{relativeTime(item.createdAt)}</p>
            <div className="flex shrink-0 items-center gap-2">
              {item.recipeId && onAddToWeek && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAddToWeek(item.recipeId!, item.recipeName ?? ""); }}
                  className="rounded-full bg-[#E7F6DF] px-2.5 py-1 text-[10px] font-semibold text-[#558B2F] transition-colors hover:bg-[#D5ECC8]"
                >
                  + Add
                </button>
              )}
              {showLike && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleLike?.(item.id, item.likedByMe); }}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all ${
                    item.likedByMe
                      ? "bg-[#FDE8E8] text-[#E85D5D]"
                      : "text-[#9E8B7E] hover:bg-[#F5F0EB]"
                  }`}
                  aria-label={item.likedByMe ? "Unlike" : "Like"}
                >
                  <Heart
                    className="h-3.5 w-3.5 transition-colors"
                    fill={item.likedByMe ? "#E85D5D" : "none"}
                    stroke={item.likedByMe ? "#E85D5D" : "#9E8B7E"}
                  />
                  {item.likeCount > 0 && <span>{item.likeCount}</span>}
                </button>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}

export function ActivityFeedBlock({
  items,
  currentUserId,
  isFriend,
  onRecipeClick,
  onAddToWeek,
  onToggleLike,
  isLoading,
  className,
  flat,
}: ActivityFeedBlockProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading && items.length === 0) {
    return (
      <div className={className ?? "mx-5 mb-4 space-y-3"}>
        <h3 className="text-lg font-semibold text-[#3A2A1F]">What&apos;s been cooking</h3>
        <div className={flat ? "flex gap-3 overflow-hidden" : "-mx-5 flex gap-3 overflow-hidden px-5"}>
          {["a", "b", "c"].map((key) => (
            <Skeleton key={key} className="h-[260px] w-[210px] shrink-0 rounded-[24px] bg-[#F0E8DE]" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={className ?? "mx-5 mb-4 space-y-3"}>
        <h3 className="text-lg font-semibold text-[#3A2A1F]">What&apos;s been cooking</h3>
        <div className="rounded-[20px] border border-dashed border-[#D9CCBB] bg-[#FAF6F2] px-4 py-4 text-sm text-[#9E8B7E]">
          Activity from friends and the community will show up here.
        </div>
      </div>
    );
  }

  const cards = items.map((item) => (
    <ActivityCard
      key={item.id}
      item={item}
      currentUserId={currentUserId}
      isFriend={isFriend}
      onRecipeClick={onRecipeClick}
      onAddToWeek={onAddToWeek}
      onToggleLike={onToggleLike}
    />
  ));

  const scrollContent = (
    <>
      {flat ? (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cards}
        </div>
      ) : (
        <div className="relative -mx-5">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-9 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent" />
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto px-5 py-2 [scroll-padding-inline:1.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {cards}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className={className ?? "mx-5 mb-4 space-y-3"}>
      <h3 className="text-lg font-semibold text-[#3A2A1F]">What&apos;s been cooking</h3>
      {flat ? (
        <div className="overflow-hidden rounded-[16px]">{scrollContent}</div>
      ) : (
        scrollContent
      )}
    </div>
  );
}
