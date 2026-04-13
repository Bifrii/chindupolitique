CREATE TABLE IF NOT EXISTS public.veille_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trends_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  analyse_globale text,
  tension_level integer DEFAULT 0,
  fetched_at timestamptz DEFAULT now()
);
ALTER TABLE public.veille_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cache" ON public.veille_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cache" ON public.veille_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cache" ON public.veille_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cache" ON public.veille_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.veille_alertes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  trend_title text,
  severity text NOT NULL DEFAULT 'info',
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.veille_alertes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alertes" ON public.veille_alertes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alertes" ON public.veille_alertes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alertes" ON public.veille_alertes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alertes" ON public.veille_alertes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.veille_alertes;
