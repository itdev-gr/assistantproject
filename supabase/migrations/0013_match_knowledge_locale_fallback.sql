-- Fall back to other-locale knowledge chunks instead of hard-filtering them out,
-- so own-locale-only FAQs/policies stay visible to other-locale guests, ranked
-- after same-locale matches.
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
  order by (case when kc.locale = p_locale then 0 else 1 end), kc.embedding <=> p_embedding
  limit p_count;
$$;
