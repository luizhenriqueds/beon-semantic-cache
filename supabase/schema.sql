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
