create table if not exists "user" (
  "id" serial primary key,
  "name" varchar not null,
  "email" varchar not null
)
