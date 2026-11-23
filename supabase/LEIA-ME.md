# Publicar a Edge Function do Ask Enma

A função `api` faz na nuvem o que o `servidor.js` faz no computador: conversa da Enma, relatórios, correção de escrita e podcasts. Só responde a quem está logado **e** tem o e-mail na lista `ALLOWED_EMAILS`.

## 1. Banco (uma vez)
No painel do Supabase: **SQL Editor** > New query > cole o conteúdo de `supabase/setup.sql` > Run.

## 2. Segredos
**Edge Functions > Secrets** (ou *Project Settings > Edge Functions*):
- `ANTHROPIC_API_KEY` = a chave da Claude
- `ALLOWED_EMAILS` = seu e-mail (vários: separe por vírgula)

## 3. Publicar a função
Caminho pelo painel: **Edge Functions > Deploy a new function > Via Editor**, nome **`api`**, cole todo o conteúdo de `supabase/functions/api/index.ts` e faça o Deploy.
Depois, nas configurações da função `api`, **desligue "Verify JWT"** (a própria função confere o login).

Caminho pelo terminal (exige token de acesso da conta do projeto):
```
npx supabase functions deploy api --project-ref qzuislxznhbehcfkrdom --no-verify-jwt
```

## 4. Depois de mudar prompts
Edite `prompts.js` (ou `edge/handler.ts`), rode `node scripts/build-edge.js` e publique de novo.

## 5. Recomendado
Depois de criar a sua conta no app, em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**. Assim ninguém mais cria conta.
