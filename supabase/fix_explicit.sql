-- Step 1: Explicitly drop every old policy by exact name
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own full_name" ON public.profiles;
DROP POLICY IF EXISTS "p1" ON public.profiles;
DROP POLICY IF EXISTS "p2" ON public.profiles;
DROP POLICY IF EXISTS "p3" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

DROP POLICY IF EXISTS "Admins can create events" ON public.events;
DROP POLICY IF EXISTS "Admins can view own events" ON public.events;
DROP POLICY IF EXISTS "Team members can view assigned events" ON public.events;
DROP POLICY IF EXISTS "Admins can update own events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete own events" ON public.events;
DROP POLICY IF EXISTS "p4" ON public.events;
DROP POLICY IF EXISTS "p5" ON public.events;
DROP POLICY IF EXISTS "p6" ON public.events;
DROP POLICY IF EXISTS "p7" ON public.events;
DROP POLICY IF EXISTS "p8" ON public.events;
DROP POLICY IF EXISTS "events_insert_admin" ON public.events;
DROP POLICY IF EXISTS "events_select_admin" ON public.events;
DROP POLICY IF EXISTS "events_select_team" ON public.events;
DROP POLICY IF EXISTS "events_update_admin" ON public.events;
DROP POLICY IF EXISTS "events_delete_admin" ON public.events;

DROP POLICY IF EXISTS "Admins can add event members" ON public.event_members;
DROP POLICY IF EXISTS "Admins can view event members" ON public.event_members;
DROP POLICY IF EXISTS "Team members can view own assignments" ON public.event_members;
DROP POLICY IF EXISTS "Admins can delete event members" ON public.event_members;
DROP POLICY IF EXISTS "p9" ON public.event_members;
DROP POLICY IF EXISTS "p10" ON public.event_members;
DROP POLICY IF EXISTS "p11" ON public.event_members;
DROP POLICY IF EXISTS "p12" ON public.event_members;
DROP POLICY IF EXISTS "em_insert_admin" ON public.event_members;
DROP POLICY IF EXISTS "em_select_admin" ON public.event_members;
DROP POLICY IF EXISTS "em_select_team" ON public.event_members;
DROP POLICY IF EXISTS "em_delete_admin" ON public.event_members;

DROP POLICY IF EXISTS "Team members can upload photos to assigned events" ON public.photos;
DROP POLICY IF EXISTS "Team members can view own photos" ON public.photos;
DROP POLICY IF EXISTS "Admins can view photos for own events" ON public.photos;
DROP POLICY IF EXISTS "Admins can update photos for own events" ON public.photos;
DROP POLICY IF EXISTS "Admins can delete photos for own events" ON public.photos;
DROP POLICY IF EXISTS "p13" ON public.photos;
DROP POLICY IF EXISTS "p14" ON public.photos;
DROP POLICY IF EXISTS "p15" ON public.photos;
DROP POLICY IF EXISTS "p16" ON public.photos;
DROP POLICY IF EXISTS "p17" ON public.photos;
DROP POLICY IF EXISTS "photos_insert_team" ON public.photos;
DROP POLICY IF EXISTS "photos_select_team" ON public.photos;
DROP POLICY IF EXISTS "photos_select_admin" ON public.photos;
DROP POLICY IF EXISTS "photos_update_admin" ON public.photos;
DROP POLICY IF EXISTS "photos_delete_admin" ON public.photos;

DROP POLICY IF EXISTS "Admins can create galleries" ON public.galleries;
DROP POLICY IF EXISTS "Admins can view own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Admins can update own galleries" ON public.galleries;
DROP POLICY IF EXISTS "Admins can delete own galleries" ON public.galleries;
DROP POLICY IF EXISTS "p18" ON public.galleries;
DROP POLICY IF EXISTS "p19" ON public.galleries;
DROP POLICY IF EXISTS "p20" ON public.galleries;
DROP POLICY IF EXISTS "p21" ON public.galleries;
DROP POLICY IF EXISTS "galleries_insert_admin" ON public.galleries;
DROP POLICY IF EXISTS "galleries_select_admin" ON public.galleries;
DROP POLICY IF EXISTS "galleries_update_admin" ON public.galleries;
DROP POLICY IF EXISTS "galleries_delete_admin" ON public.galleries;

DROP POLICY IF EXISTS "Admins can add photos to own galleries" ON public.gallery_photos;
DROP POLICY IF EXISTS "Admins can view photos in own galleries" ON public.gallery_photos;
DROP POLICY IF EXISTS "Admins can remove photos from own galleries" ON public.gallery_photos;
DROP POLICY IF EXISTS "p22" ON public.gallery_photos;
DROP POLICY IF EXISTS "p23" ON public.gallery_photos;
DROP POLICY IF EXISTS "p24" ON public.gallery_photos;
DROP POLICY IF EXISTS "gp_insert_admin" ON public.gallery_photos;
DROP POLICY IF EXISTS "gp_select_admin" ON public.gallery_photos;
DROP POLICY IF EXISTS "gp_delete_admin" ON public.gallery_photos;

DROP POLICY IF EXISTS "Team members can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read event photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete event photos" ON storage.objects;
DROP POLICY IF EXISTS "s1" ON storage.objects;
DROP POLICY IF EXISTS "s2" ON storage.objects;
DROP POLICY IF EXISTS "s3" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_team" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_admin" ON storage.objects;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS public.get_user_role();

-- Step 3: Recreate with SECURITY DEFINER + search_path = ''
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Step 4: Recreate all policies
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
