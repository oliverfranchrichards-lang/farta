create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id),
  foreign key (conversation_id, company_id) references public.conversations(id, company_id) on delete restrict
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete restrict,
  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index conversations_company_status_idx on public.conversations (company_id, status, updated_at desc);
create index conversation_participants_profile_idx on public.conversation_participants (profile_id, conversation_id);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy conversations_participant_read on public.conversations for select using (
  exists (
    select 1 from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id
    where cp.conversation_id = conversations.id and cp.profile_id = auth.uid() and p.status = 'ACTIVE'
  )
);

create policy conversation_participants_self_read on public.conversation_participants for select using (
  exists (
    select 1 from public.conversation_participants own
    join public.profiles p on p.id = own.profile_id
    where own.conversation_id = conversation_participants.conversation_id and own.profile_id = auth.uid() and p.status = 'ACTIVE'
  )
);

create policy messages_participant_read on public.messages for select using (
  exists (
    select 1 from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id
    join public.conversations c on c.id = cp.conversation_id
    where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid() and p.status = 'ACTIVE' and c.status = 'ACTIVE'
  )
);

create or replace function public.chat_shared_company(p_peer_profile_id uuid)
returns uuid language plpgsql security definer stable set search_path = public, auth
as $$
declare v_company_id uuid;
begin
  if p_peer_profile_id is null or p_peer_profile_id = auth.uid() then return null; end if;
  select mine.company_id into v_company_id
  from public.company_memberships mine
  join public.company_memberships peer on peer.company_id = mine.company_id and peer.status = 'ACTIVE'
  join public.profiles actor on actor.id = mine.profile_id and actor.status = 'ACTIVE'
  join public.profiles target on target.id = peer.profile_id and target.status = 'ACTIVE'
  where mine.profile_id = auth.uid() and mine.status = 'ACTIVE' and peer.profile_id = p_peer_profile_id
    and target.role in ('CUSTOMER', 'INTERNAL_OPERATOR', 'DRIVER')
  limit 1;
  return v_company_id;
end;
$$;

create or replace function public.create_direct_conversation(p_peer_profile_id uuid)
returns public.conversations language plpgsql security definer set search_path = public, auth
as $$
declare v_company_id uuid; v_conversation public.conversations%rowtype;
begin
  v_company_id := public.chat_shared_company(p_peer_profile_id);
  if v_company_id is null then raise exception 'FORBIDDEN'; end if;
  select c.* into v_conversation from public.conversations c
  where c.company_id = v_company_id and c.status = 'ACTIVE'
    and exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id and cp.profile_id = auth.uid())
    and exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id and cp.profile_id = p_peer_profile_id)
  limit 1;
  if v_conversation.id is not null then return v_conversation; end if;
  insert into public.conversations(company_id, created_by_profile_id) values (v_company_id, auth.uid()) returning * into v_conversation;
  insert into public.conversation_participants(conversation_id, profile_id, company_id) values (v_conversation.id, auth.uid(), v_company_id), (v_conversation.id, p_peer_profile_id, v_company_id);
  return v_conversation;
exception when unique_violation then
  select c.* into v_conversation from public.conversations c
  where c.company_id = v_company_id and c.status = 'ACTIVE'
    and exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id and cp.profile_id = auth.uid())
    and exists (select 1 from public.conversation_participants cp where cp.conversation_id = c.id and cp.profile_id = p_peer_profile_id)
  limit 1;
  if v_conversation.id is null then raise; end if;
  return v_conversation;
end;
$$;

create or replace function public.list_direct_conversations()
returns table (id uuid, company_id uuid, status text, peer_profile_id uuid, peer_name text, peer_role text, last_message text, last_message_at timestamptz)
language plpgsql security definer stable set search_path = public, auth
as $$
begin
  return query
  select c.id, c.company_id, c.status, peer.profile_id, peer_profile.full_name, peer_profile.role,
    latest.body, latest.created_at
  from public.conversations c
  join public.conversation_participants own on own.conversation_id = c.id and own.profile_id = auth.uid()
  join public.conversation_participants peer on peer.conversation_id = c.id and peer.profile_id <> auth.uid()
  join public.profiles peer_profile on peer_profile.id = peer.profile_id and peer_profile.status = 'ACTIVE'
  left join lateral (select m.body, m.created_at from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) latest on true
  where c.status = 'ACTIVE'
  order by coalesce(latest.created_at, c.updated_at) desc;
end;
$$;

create or replace function public.list_direct_messages(p_conversation_id uuid)
returns table (id uuid, sender_profile_id uuid, body text, created_at timestamptz)
language plpgsql security definer stable set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.conversation_participants cp join public.profiles p on p.id = cp.profile_id where cp.conversation_id = p_conversation_id and cp.profile_id = auth.uid() and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  return query select m.id, m.sender_profile_id, m.body, m.created_at from public.messages m where m.conversation_id = p_conversation_id order by m.created_at;
end;
$$;

create or replace function public.send_direct_message(p_conversation_id uuid, p_body text)
returns public.messages language plpgsql security definer set search_path = public, auth
as $$
declare v_message public.messages%rowtype;
begin
  if nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 4000 then raise exception 'INVALID_MESSAGE'; end if;
  if not exists (select 1 from public.conversation_participants cp join public.profiles p on p.id = cp.profile_id join public.conversations c on c.id = cp.conversation_id where cp.conversation_id = p_conversation_id and cp.profile_id = auth.uid() and p.status = 'ACTIVE' and c.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  insert into public.messages(conversation_id, sender_profile_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning * into v_message;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return v_message;
end;
$$;

revoke all on function public.chat_shared_company(uuid), public.create_direct_conversation(uuid), public.list_direct_conversations(), public.list_direct_messages(uuid), public.send_direct_message(uuid, text) from public, anon;
grant execute on function public.create_direct_conversation(uuid), public.list_direct_conversations(), public.list_direct_messages(uuid), public.send_direct_message(uuid, text) to authenticated;
