-- Ask Enma: preparo do banco no Supabase. Rode UMA vez em SQL Editor.

-- 1) Rotina de keep-alive (evita a pausa do plano gratuito)
create table if not exists keepalive (id int primary key default 1, pinged_at timestamptz default now());
insert into keepalive (id) values (1) on conflict do nothing;
alter table keepalive enable row level security;
drop policy if exists "anon can read keepalive" on keepalive;
create policy "anon can read keepalive" on keepalive for select to anon using (true);

-- 2) Contador de consumo da IA (só a Edge Function, com a chave de serviço, lê e escreve)
create table if not exists ai_usage (
  month text not null, model text not null,
  input bigint not null default 0, output bigint not null default 0, calls bigint not null default 0,
  primary key (month, model)
);
alter table ai_usage enable row level security;   -- sem políticas: ninguém de fora acessa

create or replace function add_usage(p_month text, p_model text, p_input bigint, p_output bigint)
returns void language sql security definer set search_path = public as $$
  insert into ai_usage (month, model, input, output, calls) values (p_month, p_model, p_input, p_output, 1)
  on conflict (month, model) do update
    set input = ai_usage.input + excluded.input, output = ai_usage.output + excluded.output, calls = ai_usage.calls + 1;
$$;
revoke all on function add_usage(text, text, bigint, bigint) from public, anon, authenticated;
grant execute on function add_usage(text, text, bigint, bigint) to service_role;

-- 3) Backup automático do progresso de cada aluno (uma linha por conta; cada um só enxerga a própria)
create table if not exists user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table user_data enable row level security;
drop policy if exists "own row select" on user_data;
drop policy if exists "own row insert" on user_data;
drop policy if exists "own row update" on user_data;
create policy "own row select" on user_data for select to authenticated using (user_id = auth.uid());
create policy "own row insert" on user_data for insert to authenticated with check (user_id = auth.uid());
create policy "own row update" on user_data for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create or replace function touch_user_data() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists user_data_touch on user_data;
create trigger user_data_touch before insert or update on user_data for each row execute function touch_user_data();
