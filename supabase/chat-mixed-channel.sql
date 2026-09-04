-- EDEM Study App — Add a "Mixto" chat channel (degree is null) on top of the ADE/IGE ones.
-- Run this AFTER chat-by-degree.sql.

-- Defense in depth: a message's degree must be either null (mixed channel, open
-- to everyone) or the poster's own degree — never a spoofed other degree, even
-- via a raw request that bypasses the app's own server-side derivation.
create or replace function public.guard_chat_message_degree()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  own_degree text;
begin
  if new.degree is null then
    return new;
  end if;
  select degree into own_degree from public.user_profiles where id = new.user_id;
  if new.degree is distinct from own_degree then
    raise exception 'degree must match your own profile, or be null for the mixed channel';
  end if;
  return new;
end;
$$;

drop trigger if exists on_chat_message_degree_guard on public.chat_messages;
create trigger on_chat_message_degree_guard
  before insert on public.chat_messages
  for each row execute function public.guard_chat_message_degree();
