-- EDEM Study App — Split the global chat into one channel per degree (ADE / IGE)
-- Run this AFTER simplify-chat.sql and degree-subjects.sql.

alter table public.chat_messages add column if not exists degree text check (degree in ('ADE', 'IGE'));
create index if not exists idx_chat_messages_degree on public.chat_messages(degree, created_at);
