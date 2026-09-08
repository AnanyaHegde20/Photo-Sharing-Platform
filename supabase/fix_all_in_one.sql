DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, schemaname, tablename FROM pg_policies WHERE schemaname IN ('public', 'storage') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT USING (public.get_user_role() = 'ADMIN');
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "events_insert_admin" ON public.events FOR INSERT WITH CHECK (public.get_user_role() = 'ADMIN');
CREATE POLICY "events_select_admin" ON public.events FOR SELECT USING (public.get_user_role() = 'ADMIN' AND created_by = auth.uid());
CREATE POLICY "events_select_team" ON public.events FOR SELECT USING (public.get_user_role() = 'TEAM_MEMBER' AND EXISTS (SELECT 1 FROM public.event_members WHERE event_members.event_id = events.id AND event_members.user_id = auth.uid()));
CREATE POLICY "events_update_admin" ON public.events FOR UPDATE USING (public.get_user_role() = 'ADMIN' AND created_by = auth.uid());
CREATE POLICY "events_delete_admin" ON public.events FOR DELETE USING (public.get_user_role() = 'ADMIN' AND created_by = auth.uid());
CREATE POLICY "em_insert_admin" ON public.event_members FOR INSERT WITH CHECK (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.events WHERE events.id = event_members.event_id AND events.created_by = auth.uid()));
CREATE POLICY "em_select_admin" ON public.event_members FOR SELECT USING (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.events WHERE events.id = event_members.event_id AND events.created_by = auth.uid()));
CREATE POLICY "em_select_team" ON public.event_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "em_delete_admin" ON public.event_members FOR DELETE USING (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.events WHERE events.id = event_members.event_id AND events.created_by = auth.uid()));
CREATE POLICY "photos_insert_team" ON public.photos FOR INSERT WITH CHECK (public.get_user_role() = 'TEAM_MEMBER' AND uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.event_members WHERE event_members.event_id = photos.event_id AND event_members.user_id = auth.uid()));
CREATE POLICY "photos_select_team" ON public.photos FOR SELECT USING (public.get_user_role() = 'TEAM_MEMBER' AND uploaded_by = auth.uid());
CREATE POLICY "photos_select_admin" ON public.photos FOR SELECT USING (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.events WHERE events.id = photos.event_id AND events.created_by = auth.uid()));
CREATE POLICY "photos_update_admin" ON public.photos FOR UPDATE USING (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.events WHERE events.id = photos.event_id AND events.created_by = auth.uid()));
CREATE POLICY "photos_delete_admin" ON public.photos FOR DELETE USING (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.events WHERE events.id = photos.event_id AND events.created_by = auth.uid()));
CREATE POLICY "galleries_insert_admin" ON public.galleries FOR INSERT WITH CHECK (public.get_user_role() = 'ADMIN' AND created_by = auth.uid());
CREATE POLICY "galleries_select_admin" ON public.galleries FOR SELECT USING (public.get_user_role() = 'ADMIN' AND created_by = auth.uid());
CREATE POLICY "galleries_update_admin" ON public.galleries FOR UPDATE USING (public.get_user_role() = 'ADMIN' AND created_by = auth.uid());
CREATE POLICY "galleries_delete_admin" ON public.galleries FOR DELETE USING (public.get_user_role() = 'ADMIN' AND created_by = auth.uid());
CREATE POLICY "gp_insert_admin" ON public.gallery_photos FOR INSERT WITH CHECK (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.galleries WHERE galleries.id = gallery_photos.gallery_id AND galleries.created_by = auth.uid()));
CREATE POLICY "gp_select_admin" ON public.gallery_photos FOR SELECT USING (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.galleries WHERE galleries.id = gallery_photos.gallery_id AND galleries.created_by = auth.uid()));
CREATE POLICY "gp_delete_admin" ON public.gallery_photos FOR DELETE USING (public.get_user_role() = 'ADMIN' AND EXISTS (SELECT 1 FROM public.galleries WHERE galleries.id = gallery_photos.gallery_id AND galleries.created_by = auth.uid()));
CREATE POLICY "storage_insert_team" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-photos' AND public.get_user_role() = 'TEAM_MEMBER');
CREATE POLICY "storage_select_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'event-photos');
CREATE POLICY "storage_delete_admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-photos' AND public.get_user_role() = 'ADMIN');
