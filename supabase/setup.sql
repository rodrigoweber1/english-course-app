-- Ask Emma: preparo do banco no Supabase. Rode UMA vez em SQL Editor.

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
