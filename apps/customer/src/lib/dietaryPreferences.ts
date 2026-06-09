import { supabase } from "./supabase-client";

export const DIETARY_OPTIONS = [
  { id: "high-protein", label: "High protein" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten-free", label: "Gluten free" },
  { id: "dairy-free", label: "Dairy free" },
  { id: "quick", label: "Quick wins" },
] as const;

export async function fetchDietaryPreferences(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_dietary_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.preferences ?? [];
}

export async function saveDietaryPreferences(userId: string, preferences: string[]): Promise<void> {
  const { error } = await supabase
    .from("user_dietary_preferences")
    .upsert({ user_id: userId, preferences }, { onConflict: "user_id" });

  if (error) throw error;
}
