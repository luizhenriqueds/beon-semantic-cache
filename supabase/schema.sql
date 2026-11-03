create extension if not exists vector;

create table if not exists faq (
  intent text primary key,
  answer text not null
);

create table if not exists queries (
  id serial primary key,
  text text not null,
  intent text not null,
  split text not null check (split in ('train', 'test'))
);

create table if not exists cache_entries (
  id serial primary key,
  query text not null,
  answer text not null,
  embedding vector(768) not null
);

create index if not exists cache_entries_embedding_idx
  on cache_entries using hnsw (embedding vector_cosine_ops);
