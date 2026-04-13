import { supabase } from "@/integrations/supabase/client";

export interface ArchiveEntry {
  id: string;
  user_id: string;
  type: string;
  title: string;
  summary: string | null;
  content: any;
  source_module: string;
  created_at: string;
}

export async function saveArchive({
  type,
  title,
  summary,
  content,
  source_module,
}: {
  type: string;
  title: string;
  summary?: string;
  content?: any;
  source_module: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("archives" as any)
    .insert({
      user_id: user.id,
      type,
      title,
      summary: summary || null,
      content: content || null,
      source_module,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("Failed to save archive:", error);
    return null;
  }
  return data;
}

export async function fetchArchives(search?: string): Promise<ArchiveEntry[]> {
  let query = supabase
    .from("archives" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch archives:", error);
    return [];
  }
  return (data || []) as unknown as ArchiveEntry[];
}

export async function deleteArchive(id: string) {
  const { error } = await supabase
    .from("archives" as any)
    .delete()
    .eq("id", id);
  return !error;
}
