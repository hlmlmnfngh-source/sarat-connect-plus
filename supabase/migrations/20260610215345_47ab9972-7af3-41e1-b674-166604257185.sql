
-- 1) Remove the public postgres_changes broadcast for these tables
ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;

-- 2) Realtime Authorization: policies on realtime.messages
-- Enabling RLS makes all channels private by default; only matching policies allow subscription.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies we may have created (idempotent re-run support)
DROP POLICY IF EXISTS "rt_read_user_topic" ON realtime.messages;
DROP POLICY IF EXISTS "rt_read_conversation_topic" ON realtime.messages;

-- Allow a user to receive messages on their own user:{uid} topic
CREATE POLICY "rt_read_user_topic"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() = 'user:' || (SELECT auth.uid())::text
);

-- Allow a user to receive messages on conversation:{id} only if they are a party
CREATE POLICY "rt_read_conversation_topic"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'conversation:%'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = split_part(realtime.topic(), ':', 2)
      AND ((SELECT auth.uid()) = c.user_a OR (SELECT auth.uid()) = c.user_b)
  )
);

-- 3) Server-side broadcasters (SECURITY DEFINER; not callable from API)
CREATE OR REPLACE FUNCTION public.broadcast_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Push the new message to the conversation channel
  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'receiver_id', NEW.receiver_id,
      'content', NEW.content,
      'created_at', NEW.created_at,
      'is_read', NEW.is_read
    ),
    'new_message',
    'conversation:' || NEW.conversation_id::text,
    true
  );

  -- Push a conversation-list update to both parties' personal channels
  PERFORM realtime.send(
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'last_message', NEW.content,
      'last_message_at', NEW.created_at
    ),
    'conversation_updated',
    'user:' || NEW.sender_id::text,
    true
  );

  PERFORM realtime.send(
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'last_message', NEW.content,
      'last_message_at', NEW.created_at
    ),
    'conversation_updated',
    'user:' || NEW.receiver_id::text,
    true
  );

  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.broadcast_message_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS messages_broadcast_trg ON public.messages;
CREATE TRIGGER messages_broadcast_trg
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.broadcast_message_insert();

CREATE OR REPLACE FUNCTION public.broadcast_notification_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id,
      'type', NEW.type,
      'title', NEW.title,
      'message', NEW.message,
      'link', NEW.link,
      'is_read', NEW.is_read,
      'created_at', NEW.created_at
    ),
    'new_notification',
    'user:' || NEW.user_id::text,
    true
  );
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.broadcast_notification_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_broadcast_trg ON public.notifications;
CREATE TRIGGER notifications_broadcast_trg
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.broadcast_notification_insert();
