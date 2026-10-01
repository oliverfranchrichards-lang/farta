create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  status text not null default 'PENDING' check (status in ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED')),
  recipient_name text not null,
  address_snapshot jsonb not null,
  delivery_window jsonb,
  delivered_at timestamptz,
  delivery_completed_event_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_driver_assignments (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  driver_profile_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by_profile_id uuid references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  check (unassigned_at is null or unassigned_at >= assigned_at)
);
create unique index delivery_one_active_driver_idx
  on public.delivery_driver_assignments (delivery_id) where unassigned_at is null;
create index delivery_assignments_driver_idx on public.delivery_driver_assignments (driver_profile_id, assigned_at desc);

create table public.delivery_status_history (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  from_status text,
  to_status text not null,
  changed_by_profile_id uuid references public.profiles(id) on delete restrict,
  reason text,
  correlation_id uuid,
  changed_at timestamptz not null default now()
);
create index delivery_status_history_delivery_idx on public.delivery_status_history (delivery_id, changed_at);

create table public.delivery_occurrences (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  occurrence_type text not null,
  description text not null,
  occurred_by_profile_id uuid references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now()
);
create index delivery_occurrences_delivery_idx on public.delivery_occurrences (delivery_id, occurred_at desc);

create table public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete restrict,
  storage_object_path text not null unique,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0),
  captured_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  captured_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  opened_by_profile_id uuid not null,
  order_id uuid references public.orders(id) on delete restrict,
  delivery_id uuid references public.deliveries(id) on delete restrict,
  subject text not null,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED')),
  assigned_to_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  foreign key (opened_by_profile_id, company_id) references public.profiles(id, company_id) on delete restrict
);
create index support_tickets_company_status_idx on public.support_tickets (company_id, status, created_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create table public.support_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  from_status text,
  to_status text not null,
  changed_by_profile_id uuid references public.profiles(id) on delete restrict,
  reason text,
  changed_at timestamptz not null default now()
);
create index support_status_history_ticket_idx on public.support_status_history (ticket_id, changed_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete restrict,
  notification_type text not null,
  title text not null,
  body text not null,
  resource_type text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_created_idx on public.notifications (recipient_profile_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  actor_role text,
  company_id uuid references public.companies(id) on delete restrict,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  correlation_id uuid,
  outcome text not null check (outcome in ('SUCCESS', 'FAILURE')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_company_created_idx on public.audit_logs (company_id, created_at desc);
create index audit_logs_resource_idx on public.audit_logs (resource_type, resource_id, created_at desc);

create table public.idempotency_records (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  command text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (scope_key, actor_profile_id, command, idempotency_key)
);
create index idempotency_records_expiry_idx on public.idempotency_records (expires_at);

alter table public.deliveries enable row level security;
alter table public.delivery_driver_assignments enable row level security;
alter table public.delivery_status_history enable row level security;
alter table public.delivery_occurrences enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.idempotency_records enable row level security;

create policy deliveries_member_read on public.deliveries for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.has_active_membership(o.company_id))
  or exists (select 1 from public.delivery_driver_assignments a where a.delivery_id = id and a.driver_profile_id = auth.uid() and a.unassigned_at is null)
);
create policy delivery_assignments_authorized_read on public.delivery_driver_assignments for select using (
  driver_profile_id = auth.uid()
  or exists (select 1 from public.deliveries d join public.orders o on o.id = d.order_id where d.id = delivery_id and public.has_active_membership(o.company_id))
);
create policy delivery_history_authorized_read on public.delivery_status_history for select using (
  exists (select 1 from public.deliveries d join public.orders o on o.id = d.order_id where d.id = delivery_id and public.has_active_membership(o.company_id))
  or exists (select 1 from public.delivery_driver_assignments a where a.delivery_id = delivery_id and a.driver_profile_id = auth.uid() and a.unassigned_at is null)
);
create policy delivery_occurrences_authorized_read on public.delivery_occurrences for select using (
  exists (select 1 from public.deliveries d join public.orders o on o.id = d.order_id where d.id = delivery_id and public.has_active_membership(o.company_id))
  or exists (select 1 from public.delivery_driver_assignments a where a.delivery_id = delivery_id and a.driver_profile_id = auth.uid() and a.unassigned_at is null)
);
create policy delivery_proofs_authorized_read on public.delivery_proofs for select using (
  exists (select 1 from public.deliveries d join public.orders o on o.id = d.order_id where d.id = delivery_id and public.has_active_membership(o.company_id))
  or captured_by_profile_id = auth.uid()
);
create policy support_tickets_member_read on public.support_tickets for select using (public.has_active_membership(company_id));
create policy support_messages_member_read on public.support_messages for select using (
  exists (select 1 from public.support_tickets t where t.id = ticket_id and public.has_active_membership(t.company_id))
);
create policy support_history_member_read on public.support_status_history for select using (
  exists (select 1 from public.support_tickets t where t.id = ticket_id and public.has_active_membership(t.company_id))
);
create policy notifications_self_read on public.notifications for select using (recipient_profile_id = auth.uid());
create policy audit_logs_platform_read on public.audit_logs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE')
);
