drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations for select using (
  exists (
    select 1 from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id
    join public.company_memberships cm on cm.profile_id = auth.uid() and cm.company_id = conversations.company_id and cm.status = 'ACTIVE'
    where cp.conversation_id = conversations.id and cp.profile_id = auth.uid() and p.status = 'ACTIVE'
  )
);

drop policy if exists conversation_participants_self_read on public.conversation_participants;
create policy conversation_participants_self_read on public.conversation_participants for select using (
  exists (
    select 1 from public.conversation_participants own
    join public.profiles p on p.id = own.profile_id
    join public.conversations c on c.id = own.conversation_id
    join public.company_memberships cm on cm.profile_id = auth.uid() and cm.company_id = c.company_id and cm.status = 'ACTIVE'
    where own.conversation_id = conversation_participants.conversation_id and own.profile_id = auth.uid() and p.status = 'ACTIVE'
  )
);

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages for select using (
  exists (
    select 1 from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id
    join public.conversations c on c.id = cp.conversation_id
    join public.company_memberships cm on cm.profile_id = auth.uid() and cm.company_id = c.company_id and cm.status = 'ACTIVE'
    where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid() and p.status = 'ACTIVE' and c.status = 'ACTIVE'
  )
);

create or replace function public.list_direct_conversations()
returns table (id uuid, company_id uuid, status text, peer_profile_id uuid, peer_name text, peer_role text, last_message text, last_message_at timestamptz)
language plpgsql security definer stable set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p join public.company_memberships cm on cm.profile_id = p.id and cm.status = 'ACTIVE' where p.id = auth.uid() and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  return query
  select c.id, c.company_id, c.status, peer.profile_id, peer_profile.full_name, peer_profile.role,
    latest.body, latest.created_at
  from public.conversations c
  join public.conversation_participants own on own.conversation_id = c.id and own.profile_id = auth.uid()
  join public.company_memberships own_membership on own_membership.profile_id = auth.uid() and own_membership.company_id = c.company_id and own_membership.status = 'ACTIVE'
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
  if not exists (
    select 1 from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id and p.status = 'ACTIVE'
    join public.conversations c on c.id = cp.conversation_id and c.status = 'ACTIVE'
    join public.company_memberships cm on cm.profile_id = auth.uid() and cm.company_id = c.company_id and cm.status = 'ACTIVE'
    where cp.conversation_id = p_conversation_id and cp.profile_id = auth.uid()
  ) then raise exception 'FORBIDDEN'; end if;
  return query select m.id, m.sender_profile_id, m.body, m.created_at from public.messages m where m.conversation_id = p_conversation_id order by m.created_at;
end;
$$;

create or replace function public.send_direct_message(p_conversation_id uuid, p_body text)
returns public.messages language plpgsql security definer set search_path = public, auth
as $$
declare v_message public.messages%rowtype;
begin
  if nullif(btrim(p_body), '') is null or char_length(btrim(p_body)) > 4000 then raise exception 'INVALID_MESSAGE'; end if;
  if not exists (
    select 1 from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id and p.status = 'ACTIVE'
    join public.conversations c on c.id = cp.conversation_id and c.status = 'ACTIVE'
    join public.company_memberships cm on cm.profile_id = auth.uid() and cm.company_id = c.company_id and cm.status = 'ACTIVE'
    where cp.conversation_id = p_conversation_id and cp.profile_id = auth.uid()
  ) then raise exception 'FORBIDDEN'; end if;
  insert into public.messages(conversation_id, sender_profile_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning * into v_message;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return v_message;
end;
$$;
