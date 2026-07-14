-- Per-hotel knowledge index for the OpenAI-grounded assistant + chat rate limiting
create extension if not exists vector;

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  locale text not null check (locale in ('el', 'en')),
  source_table text not null,
  source_id uuid not null,
  title text not null,
  content text not null,
  content_hash text not null,
  embedding vector(1536) not null,
  updated_at timestamptz not null default now(),
  unique (hotel_id, locale, source_table, source_id)
);
create index if not exists knowledge_chunks_embedding_idx
  on knowledge_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists knowledge_chunks_hotel_idx on knowledge_chunks(hotel_id, locale);
alter table knowledge_chunks enable row level security;

create table if not exists rate_limit_events (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_key_idx on rate_limit_events(key, created_at);
alter table rate_limit_events enable row level security;

create or replace function match_knowledge_chunks(
  p_hotel uuid,
  p_embedding vector(1536),
  p_locale text,
  p_count int default 8
) returns table (
  id uuid,
  title text,
  content text,
  source_table text,
  source_id uuid,
  similarity float
) language sql stable as $$
  select
    kc.id, kc.title, kc.content, kc.source_table, kc.source_id,
    1 - (kc.embedding <=> p_embedding) as similarity
  from knowledge_chunks kc
  where kc.hotel_id = p_hotel
    and kc.locale = p_locale
  order by kc.embedding <=> p_embedding
  limit p_count;
$$;

-- Enable the LLM chat for the demo hotel only (flag checked by /api/chat)
insert into feature_flags (hotel_id, flag, enabled)
select h.id, 'llm_chat', true from hotels h where h.slug = 'aegean-blue'
on conflict do nothing;
