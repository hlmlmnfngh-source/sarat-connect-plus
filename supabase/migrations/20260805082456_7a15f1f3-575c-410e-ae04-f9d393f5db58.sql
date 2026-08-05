CREATE POLICY "contact_messages_read_own"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());