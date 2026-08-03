DROP POLICY IF EXISTS "contact_messages_insert_any" ON public.contact_messages;
CREATE POLICY "contact_messages_insert_valid" ON public.contact_messages
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(name)) > 0
  AND length(btrim(email)) BETWEEN 3 AND 320
  AND length(btrim(message)) BETWEEN 1 AND 5000
  AND (user_id IS NULL OR user_id = auth.uid())
);