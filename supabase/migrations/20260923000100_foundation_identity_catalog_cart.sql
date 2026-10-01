create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  role text not null check (role in ('CUSTOMER', 'INTERNAL_OPERATOR', 'DRIVER', 'PLATFORM_ADMIN')),
  full_name text not null,
  phone text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  check ((role = 'CUSTOMER' and company_id is not null) or (role <> 'CUSTOMER' and company_id is null))
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  company_id uuid not null references public.companies(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  granted_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (profile_id, company_id),
  foreign key (profile_id, company_id) references public.profiles(id, company_id) on delete restrict
);

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  unique (company_id, name)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete restrict,
  label text not null,
  address_line text not null,
  address_number text not null,
  address_complement text,
  district text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index addresses_one_default_per_establishment
  on public.addresses (establishment_id) where is_default and status = 'ACTIVE';

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  brand text,
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_status_idx on public.products (category_id, status);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku_code text not null unique,
  name text not null,
  attributes jsonb not null default '{}'::jsonb,
  sale_unit text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_status_idx on public.product_variants (product_id, status);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  storage_object_path text not null unique,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0),
  alt_text text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check ((product_id is not null) <> (variant_id is not null))
);
create unique index product_images_primary_product_idx on public.product_images (product_id) where is_primary and product_id is not null;
create unique index product_images_primary_variant_idx on public.product_images (variant_id) where is_primary and variant_id is not null;

create table public.prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  sku_id uuid not null references public.product_variants(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  currency_code char(3) not null default 'BRL',
  valid_from timestamptz not null,
  valid_until timestamptz,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  source text not null default 'MANUAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from),
  exclude using gist (company_id with =, sku_id with =, tstzrange(valid_from, coalesce(valid_until, 'infinity'::timestamptz), '[)') with &&) where (status = 'ACTIVE')
);
create index prices_lookup_idx on public.prices (company_id, sku_id, valid_from desc);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  establishment_id uuid not null,
  created_by_profile_id uuid not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CONVERTED')),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (establishment_id, company_id) references public.establishments(id, company_id) on delete restrict,
  foreign key (created_by_profile_id, company_id) references public.profiles(id, company_id) on delete restrict
);
create unique index carts_one_active_per_establishment_idx on public.carts (company_id, establishment_id) where status = 'ACTIVE';

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete restrict,
  sku_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  displayed_unit_price_minor bigint check (displayed_unit_price_minor is null or displayed_unit_price_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, sku_id)
);

create index company_memberships_company_status_idx on public.company_memberships (company_id, status);
create index company_memberships_profile_status_idx on public.company_memberships (profile_id, status);
create index establishments_company_status_idx on public.establishments (company_id, status);
create index addresses_establishment_status_idx on public.addresses (establishment_id, status);
create index carts_company_establishment_idx on public.carts (company_id, establishment_id);

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE';
$$;

create or replace function public.has_active_membership(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    join public.company_memberships m on m.profile_id = p.id and m.company_id = target_company_id
    where p.id = auth.uid() and p.status = 'ACTIVE' and m.status = 'ACTIVE'
  );
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
alter table public.establishments enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.prices enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy companies_member_read on public.companies for select using (public.has_active_membership(id));
create policy memberships_self_read on public.company_memberships for select using (profile_id = auth.uid());
create policy establishments_member_read on public.establishments for select using (public.has_active_membership(company_id));
create policy addresses_member_read on public.addresses for select using (
  exists (select 1 from public.establishments e where e.id = establishment_id and public.has_active_membership(e.company_id))
);
create policy catalog_authenticated_read on public.categories for select using (auth.uid() is not null and status = 'ACTIVE');
create policy products_authenticated_read on public.products for select using (auth.uid() is not null and status = 'ACTIVE');
create policy variants_authenticated_read on public.product_variants for select using (auth.uid() is not null and status = 'ACTIVE');
create policy images_authenticated_read on public.product_images for select using (auth.uid() is not null);
create policy prices_member_read on public.prices for select using (public.has_active_membership(company_id));
create policy carts_member_read on public.carts for select using (public.has_active_membership(company_id));
create policy cart_items_member_read on public.cart_items for select using (
  exists (select 1 from public.carts c where c.id = cart_id and public.has_active_membership(c.company_id))
);
