"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { getWeekAtOffset, getCurrentWeek, getWeekLabel } from "@/lib/utils";
import type { Weekday } from "@/lib/recipeSchedule";

type Friend = { id: string; name: string | null };

type DayPlan = {
  day: Weekday;
  label: string;
  recipeId: string | null;
  recipeName: string | null;
  recipeImage: string | null;
};

const DAY_COLS: { day: Weekday; col: string; label: string }[] = [
  { day: "monday", col: "monday_recipe_id", label: "Monday" },
  { day: "tuesday", col: "tuesday_recipe_id", label: "Tuesday" },
  { day: "wednesday", col: "wednesday_recipe_id", label: "Wednesday" },
  { day: "thursday", col: "thursday_recipe_id", label: "Thursday" },
  { day: "friday", col: "friday_recipe_id", label: "Friday" },
];

function useFriends(userId: string) {
  const [friends, setFriends] = useState<Friend[] | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, requester:users!friendships_requester_id_fkey(id, name), addressee:users!friendships_addressee_id_fkey(id, name)")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      type Row = {
        requester_id: string;
        addressee_id: string;
        requester: Friend | Friend[] | null;
        addressee: Friend | Friend[] | null;
      };
      const single = (v: Friend | Friend[] | null): Friend | null => Array.isArray(v) ? (v[0] ?? null) : v;
      const list = ((data ?? []) as Row[])
        .map((row) => row.requester_id === userId ? single(row.addressee) : single(row.requester))
        .filter((f): f is Friend => Boolean(f));
      setFriends(list);
    };
    void load();
  }, [userId]);

  return friends;
}

function useFriendWeek(friendId: string | null, week: number, year: number) {
  const [days, setDays] = useState<DayPlan[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!friendId) { setDays(null); return; }
    setLoading(true);
    setDays(null);

    const load = async () => {
      const { data: plan } = await supabase
        .from("user_meal_plans")
        .select("monday_recipe_id, tuesday_recipe_id, wednesday_recipe_id, thursday_recipe_id, friday_recipe_id")
        .eq("user_id", friendId)
        .eq("week_number", week)
        .eq("year", year)
        .maybeSingle();

      if (!plan) { setDays([]); setLoading(false); return; }

      const recipeIds = DAY_COLS
        .map(({ col }) => (plan as Record<string, string | null>)[col])
        .filter((id): id is string => Boolean(id));

      const { data: recipes } = recipeIds.length > 0
        ? await supabase.from("recipes").select("id, name, image_url").in("id", recipeIds)
        : { data: [] };

      const recipeMap = new Map((recipes ?? []).map((r) => [r.id, r]));
      const row = plan as Record<string, string | null>;

      setDays(DAY_COLS.map(({ day, col, label }) => {
        const id = row[col] ?? null;
        const recipe = id ? recipeMap.get(id) : null;
        return { day, label, recipeId: id, recipeName: recipe?.name ?? null, recipeImage: recipe?.image_url ?? null };
      }));
      setLoading(false);
    };

    void load();
  }, [friendId, week, year]);

  return { days, loading };
}

type FriendsWeekPanelProps = {
  currentUserId: string;
  onAddDay: (recipeId: string, recipeName: string) => void;
  onCopyWeek: (days: DayPlan[]) => void;
};

export function FriendsWeekPanel({ currentUserId, onAddDay, onCopyWeek }: FriendsWeekPanelProps) {
  const friends = useFriends(currentUserId);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [showLastWeek, setShowLastWeek] = useState(false);

  const current = getCurrentWeek();
  const last = getWeekAtOffset(-1);
  const { week, year } = showLastWeek ? last : current;
  const weekLabel = showLastWeek ? `Last week · ${getWeekLabel(last.week, last.year)}` : `This week · ${getWeekLabel(current.week, current.year)}`;

  const { days, loading } = useFriendWeek(selectedFriendId, week, year);

  if (friends === null) {
    return <p className="mt-6 px-1 text-sm text-[#9E8B7E]">Loading friends...</p>;
  }

  if (friends.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FAF6F2] px-4 py-6 text-center">
        <p className="text-sm text-[#6F5B4B]">Add friends to see their weeks here.</p>
      </div>
    );
  }

  const selectedFriend = friends.find((f) => f.id === selectedFriendId) ?? friends[0];
  const effectiveFriendId = selectedFriend.id;
  const effectiveDays = selectedFriendId ? days : null;

  // Auto-select first friend
  if (!selectedFriendId && friends.length > 0) {
    setSelectedFriendId(friends[0].id);
  }

  return (
    <div className="mt-2">
      {/* Friend selector */}
      <div className="relative">
        <select
          value={effectiveFriendId}
          onChange={(e) => setSelectedFriendId(e.target.value)}
          className="w-full appearance-none rounded-[16px] border border-[#E8DCCB] bg-white py-3 pl-4 pr-10 text-sm font-medium text-[#3A2A1F] focus:outline-none focus:ring-2 focus:ring-[#7CB342]"
        >
          {friends.map((f) => (
            <option key={f.id} value={f.id}>{f.name || "Friend"}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E8B7E]" />
      </div>

      {/* Week toggle */}
      <div className="mt-3 flex rounded-full border border-[#E8DCCB] bg-[#FAF6F2] p-1">
        <button
          type="button"
          onClick={() => setShowLastWeek(false)}
          className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${!showLastWeek ? "bg-white text-[#3A2A1F] shadow-sm" : "text-[#9E8B7E]"}`}
        >
          This week
        </button>
        <button
          type="button"
          onClick={() => setShowLastWeek(true)}
          className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${showLastWeek ? "bg-white text-[#3A2A1F] shadow-sm" : "text-[#9E8B7E]"}`}
        >
          Last week
        </button>
      </div>
      <p className="mt-1.5 px-1 text-xs text-[#9E8B7E]">{weekLabel}</p>

      {/* Plan rows */}
      <div className="mt-3">
        {loading && (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-[#9E8B7E]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        )}

        {!loading && effectiveDays && effectiveDays.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FAF6F2] px-4 py-6 text-center">
            <p className="text-sm text-[#6F5B4B]">
              {selectedFriend.name?.split(" ")[0] ?? "Your friend"} hasn&apos;t planned {showLastWeek ? "last" : "this"} week yet.
            </p>
          </div>
        )}

        {!loading && effectiveDays && effectiveDays.length > 0 && (
          <>
            <ul className="space-y-2.5">
              {effectiveDays.map((d) => (
                <li key={d.day} className="flex items-center gap-3 rounded-2xl border border-[#F0E8DE] px-3 py-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-[#E7D9CD]">
                    {d.recipeImage && (
                      <Image src={d.recipeImage} alt={d.recipeName ?? ""} fill className="object-cover" sizes="48px" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9E8B7E]">{d.label}</p>
                    <p className="truncate text-sm font-medium text-[#3A2A1F]">{d.recipeName ?? "—"}</p>
                  </div>
                  {d.recipeId && d.recipeName && (
                    <button
                      type="button"
                      onClick={() => onAddDay(d.recipeId!, d.recipeName!)}
                      className="flex shrink-0 items-center gap-1 rounded-full border border-[#D9CCBB] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A2A1F] transition-colors hover:bg-[#F0F9E8] hover:border-[#7CB342]"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => onCopyWeek(effectiveDays)}
              className="mt-4 w-full rounded-[16px] bg-[#7CB342] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#689F38]"
            >
              Copy whole week →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
