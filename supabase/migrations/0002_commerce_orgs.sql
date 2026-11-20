-- Mike Salemi App v2 — commerce, access, organizations, offers.
-- Only server functions and webhooks (service role / security definer) write these tables.

create type public.benefit_type as enum ('none', 'discount', 'included');
create type public.benefit_scope as enum ('content', 'retreat', 'coaching');
create type public.grant_source as enum ('purchase', 'subscription', 'organization', 'inclusion', 'migration', 'admin', 'reward');

-- ---------------------------------------------------------------- plans and prices
create table public.plans (
  id text primary key,                  -- free | pro | max
  name text not null,
  tagline text,
  rank int not null,                    -- higher = better; higher plans never get less
  features text[] not null default '{}',
  is_active boolean not null default true,
  draft_note text
);

create table public.prices (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('plan', 'program', 'bundle', 'run', 'coaching', 'org_seat')),
  ref_id text not null,                 -- plan id, program uuid, bundle uuid, run uuid, coaching package uuid
  label text,
  interval text not null default 'one_time' check (interval in ('one_time', 'month', 'year')),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  access_days int,                      -- one-time purchase term; null = lifetime
  stripe_price_id text,
  revenuecat_product_id text,
  is_active boolean not null default true,
  draft_note text
);
create index prices_ref_idx on public.prices (kind, ref_id) where is_active;

create table public.plan_program_benefits (
  plan_id text not null references public.plans(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  benefit public.benefit_type not null default 'none',
  discount_percent int check (discount_percent between 1 and 100),
  scope public.benefit_scope not null default 'content',
  coaching_credits int,                 -- for scope = coaching: credits per billing period
  primary key (plan_id, program_id, scope),
  check ((benefit = 'discount') = (discount_percent is not null))
);
create index plan_program_benefits_program_idx on public.plan_program_benefits (program_id);

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true
);
create table public.bundle_items (
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  primary key (bundle_id, program_id)
);
create index bundle_items_program_idx on public.bundle_items (program_id);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off int check (percent_off between 1 and 100),
  amount_off_cents int,
  applies_to jsonb not null default '{}'::jsonb,   -- {kinds:[], ref_ids:[]}
  max_redemptions int,
  redeemed int not null default 0,
  expires_at timestamptz,
  stripe_coupon_id text,
  is_active boolean not null default true
);

-- Programs a confirmed booking or purchase includes (retreat run -> preparation course)
create table public.program_inclusions (
  parent_program_id uuid not null references public.programs(id) on delete cascade,
  included_program_id uuid not null references public.programs(id) on delete cascade,
  access_days int,
  primary key (parent_program_id, included_program_id)
);
create index program_inclusions_included_idx on public.program_inclusions (included_program_id);

-- ---------------------------------------------------------------- organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  plan_id text references public.plans(id),
  seats int not null default 5 check (seats >= 1),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled')),
  grace_until timestamptz,
  join_domain text,                      -- auto-join by email domain
  join_token text unique default encode(gen_random_bytes(12), 'hex'),
  is_partner boolean not null default false,
  revenue_share_percent int,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'coach', 'member')),
  coach_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members (user_id);
create index org_members_coach_idx on public.org_members (coach_id);

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'coach', 'member')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  unique (org_id, email)
);
create index org_invites_invited_by_idx on public.org_invites (invited_by);

-- Programs an organization buys for all of its seats, beyond its plan
create table public.org_programs (
  org_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  primary key (org_id, program_id)
);
create index org_programs_program_idx on public.org_programs (program_id);

-- ---------------------------------------------------------------- subscriptions, orders, grants
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  interval text not null default 'month' check (interval in ('month', 'year')),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  provider text not null default 'stripe' check (provider in ('stripe', 'revenuecat', 'admin', 'migration')),
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((user_id is null) <> (org_id is null))
);
create index subscriptions_user_idx on public.subscriptions (user_id, status);
create index subscriptions_org_idx on public.subscriptions (org_id, status);
create index subscriptions_plan_idx on public.subscriptions (plan_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  org_id uuid references public.organizations(id) on delete set null,
  reference text not null unique default ('MS-' || upper(encode(gen_random_bytes(5), 'hex'))),
  status text not null check (status in ('pending', 'paid', 'refunded', 'failed')),
  subtotal_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null default 0,
  currency text not null default 'usd',
  coupon_id uuid references public.coupons(id),
  offer_id uuid,                        -- smart offer that led here (fk added in 0003)
  provider text not null default 'stripe',
  provider_ref text,
  is_test boolean not null default true,
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_org_idx on public.orders (org_id);
create index orders_coupon_idx on public.orders (coupon_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  price_id uuid references public.prices(id),
  kind text not null,
  ref_id text not null,
  name text not null,
  quantity int not null default 1,
  unit_cents int not null,
  benefit_applied text                  -- 'pro:discount:20' etc.
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_price_idx on public.order_items (price_id);

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  scope public.benefit_scope not null default 'content',
  source public.grant_source not null,
  source_ref text,                      -- order id, subscription id, org id, run id ...
  starts_at timestamptz not null default now(),
  ends_at timestamptz,                  -- null = no end
  revoked_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index access_grants_user_idx on public.access_grants (user_id, program_id);
create index access_grants_program_idx on public.access_grants (program_id);

create table public.payment_events (
  id text primary key,                  -- provider event id (idempotency)
  provider text not null,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- smart offers
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- admin label
  is_active boolean not null default true,
  priority int not null default 100,     -- lower = first
  trigger jsonb not null default '{"kind":"always"}'::jsonb,
    -- {kind:'always'} | {kind:'completed', scope:'phase'|'path'|'program', program_id?}
    -- | {kind:'tool_result', tool_id, result?} | {kind:'inactive_days', days} | {kind:'intake_answer', key, value}
    -- | {kind:'watched_topic', tag, count} | {kind:'run_upcoming', program_id, days}
  audience jsonb not null default '{}'::jsonb,
    -- {has_program?:[], lacks_program?:[], plans?:[], goals?:[], org_member?:bool, signed_out?:bool}
  placements text[] not null default '{today}',
    -- today | program_page | day_complete | program_complete | library | tool_result | checkout | email | push
  target_kind text not null check (target_kind in ('program', 'plan', 'bundle', 'run', 'coaching', 'resource', 'url')),
  target_ref text not null,
  coupon_id uuid references public.coupons(id),
  headline text not null,
  body text,
  cta_label text not null default 'Learn more',
  image_url text,
  max_views int not null default 5,
  cooldown_days int not null default 3,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index offers_coupon_idx on public.offers (coupon_id);

create table public.offer_events (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.offers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  placement text not null,
  event text not null check (event in ('view', 'click', 'dismiss', 'convert')),
  created_at timestamptz not null default now()
);
create index offer_events_user_idx on public.offer_events (user_id, offer_id, created_at desc);
create index offer_events_offer_idx on public.offer_events (offer_id, event);

alter table public.orders add constraint orders_offer_fk foreign key (offer_id) references public.offers(id) on delete set null;
create index orders_offer_idx on public.orders (offer_id);
