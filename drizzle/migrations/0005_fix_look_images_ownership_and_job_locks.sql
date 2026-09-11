DROP POLICY IF EXISTS "Users can delete their look images" ON storage.objects;
CREATE POLICY "Users can delete their look images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'look-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload look images" ON storage.objects;
CREATE POLICY "Users can upload look images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'look-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

REVOKE ALL ON public.job_locks FROM anon, authenticated;
GRANT ALL ON public.job_locks TO service_role;
ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.job_locks IS 'Internal job coordination table. Service-role only: no end-user access by design.';