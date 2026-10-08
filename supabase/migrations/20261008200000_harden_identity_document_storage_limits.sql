-- Keep identity verification documents private and restrict uploads at the Storage layer.
-- This complements client-side checks, which can be bypassed by direct API requests.
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
WHERE id = 'id-verification';
