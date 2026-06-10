"use client";

import { useRef } from "react";
import { Clock } from "lucide-react";
import { FriendToday } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { MealHeroCard } from "./MealHeroCard";

type FriendsTodayBlockProps = {
  friendsToday: FriendToday[];
  onRecipeClick?: (recipeId: string) => void;
  onInviteFriends?: () => void;
  isLoading?: boolean;
  className?: string;
  flat?: boolean;
};

const AVATAR_COLORS = ["#7CB342", "#F4B942", "#E85D5D", "#5B9BD5", "#9B6CD9", "#EC8B5E"];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = Math.trunc(hash * 31 + (id.codePointAt(i) ?? 0));
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// A little flavour so the block reads as "what your friends are up to"
// rather than a flat list of recipe names.
function blurb(entry: FriendToday): string {
  const name = entry.friend.name?.split(" ")[0] || "Your friend";
  if (!entry.recipe) return `${name} is taking the night off`;
  if (entry.recipe.total_minutes <= 20) return `${name} is keeping it quick tonight`;
  if (entry.recipe.total_minutes >= 50) return `${name} is going all out tonight`;
  return `${name} is cooking up something good`;
}

export function FriendsTodayBlock({
  friendsToday,
  onRecipeClick,
  onInviteFriends,
  isLoading,
  className,
  flat,
}: FriendsTodayBlockProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading && friendsToday.length === 0) {
    return (
      <div className={className ?? "mx-5 mb-4 space-y-3"}>
        <h3 className="text-lg font-semibold text-[#3A2A1F]">What friends are cooking</h3>
        <div className={flat ? "flex gap-3 overflow-hidden" : "-mx-5 flex gap-3 overflow-hidden px-5"}>
          {["a", "b"].map((key) => (
            <Skeleton key={key} className="h-[270px] w-[230px] shrink-0 rounded-[24px] bg-[#F0E8DE]" />
          ))}
        </div>
      </div>
    );
  }

  if (friendsToday.length === 0) {
    const inviteButton = (
      <button
        type="button"
        onClick={onInviteFriends}
        className="flex w-full items-center justify-between rounded-[20px] border border-dashed border-[#D9CCBB] bg-[#FAF6F2] p-4 text-left transition-colors hover:bg-[#F5EDE0]"
      >
        <div>
          <p className="text-sm font-semibold text-[#3A2A1F]">See what friends are cooking</p>
          <p className="text-xs text-[#6F5B4B]">Invite a friend to compare dinners</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#7CB342] px-3 py-1 text-xs font-semibold text-white">
          Invite
        </span>
      </button>
    );

    if (flat) return inviteButton;

    return <div className={className ?? "mx-5 mb-4"}>{inviteButton}</div>;
  }

  const cards = friendsToday.map(({ friend, recipe }) => {
    const initial = friend.name?.charAt(0).toUpperCase() || "?";

    return (
      <div key={friend.id} className="w-[230px] shrink-0">
        <MealHeroCard
          className="overflow-hidden rounded-[24px] bg-white shadow-[0_2px_12px_rgba(58,42,31,0.06)]"
          imageHeightClassName="h-[140px]"
          imageUrl={recipe?.image_url ?? null}
          title={recipe?.name ?? "Day off"}
          eyebrow={friend.name || "Friend"}
          eyebrowClassName="text-[#9B6CD9]"
          onClick={recipe ? () => onRecipeClick?.(recipe.id) : undefined}
          avatar={{
            label: initial,
            title: friend.name || "Friend",
            style: { backgroundColor: avatarColor(friend.id) },
            className:
              "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-sm",
          }}
          meta={
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs leading-snug text-[#6F5B4B]">{blurb({ friend, recipe })}</p>
              {recipe && (
                <span className="flex shrink-0 items-center gap-1 text-[#9E8B7E]">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  <span className="text-xs font-medium">{recipe.total_minutes}m</span>
                </span>
              )}
            </div>
          }
        />
      </div>
    );
  });

  return (
    <div className={className ?? "mx-5 mb-4 space-y-3"}>
      <h3 className="text-lg font-semibold text-[#3A2A1F]">What friends are cooking</h3>

      {flat ? (
        <div className="overflow-hidden rounded-[16px]">
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {cards}
          </div>
        </div>
      ) : (
        <div className="relative -mx-5">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-9 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent" />
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto px-5 [scroll-padding-inline:1.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {cards}
          </div>
        </div>
      )}
    </div>
  );
}
