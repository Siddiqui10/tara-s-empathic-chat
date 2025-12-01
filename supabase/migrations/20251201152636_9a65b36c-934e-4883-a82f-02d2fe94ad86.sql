create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  content text not null,
  is_user boolean not null,
  emotion text,
  agent text,
  created_at timestamp with time zone default now()
);

alter table public.chat_messages enable row level security;

create index idx_messages_user on public.chat_messages(user_id, created_at desc);