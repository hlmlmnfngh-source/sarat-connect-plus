-- 1) profiles: hide total_earnings & total_orders from public reads
REVOKE SELECT (total_earnings, total_orders) ON public.profiles FROM anon, authenticated, PUBLIC;

-- 2) conversations: prevent hijack via UPDATE. The last_message columns are
-- maintained by a SECURITY DEFINER trigger, so revoke client UPDATE entirely.
DROP POLICY IF EXISTS convs_update_parties ON public.conversations;
REVOKE UPDATE ON public.conversations FROM anon, authenticated;

-- 3) messages: only allow `is_read` to be toggled by the receiver; block any
-- tampering with content/sender/conversation/receiver/attachments.
CREATE OR REPLACE FUNCTION public.messages_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.conversation_id <> OLD.conversation_id
     OR NEW.sender_id <> OLD.sender_id
     OR NEW.receiver_id <> OLD.receiver_id
     OR NEW.content <> OLD.content
     OR NEW.attachments IS DISTINCT FROM OLD.attachments
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify protected message fields';
  END IF;

  IF auth.uid() <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Only the receiver can update this message';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS messages_guard_update_trg ON public.messages;
CREATE TRIGGER messages_guard_update_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_guard_update();

-- Tighten the receiver UPDATE policy with a matching WITH CHECK for defense in depth.
DROP POLICY IF EXISTS msgs_update_receiver ON public.messages;
CREATE POLICY msgs_update_receiver ON public.messages
FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);