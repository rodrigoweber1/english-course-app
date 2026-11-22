# English Course

App web pessoal para praticar inglês oral (nível B2 alto → C1). Veja a especificação em `Especificación app para practicar inglés oral.md`.

## Como usar
1. Copie `.env.example` para `.env` e coloque sua chave da API da Anthropic em `ANTHROPIC_API_KEY`.
2. Dê dois cliques em `iniciar.bat` (ou rode `node servidor.js`) e abra http://localhost:3000 no Chrome ou Edge.

## Páginas
Aula (25 min, 5 fases) · Prova de nível · Plano · Biblioteca (cartões, vocabulário, erros) · Escuta (RSS) · Escrita · Interesses · Ajustes.

Os dados de progresso ficam no navegador (localStorage); o servidor só guarda a chave e o consumo da API (`usage.json`).

## Versão web (GitHub Pages)
https://rodrigoweber1.github.io/english-course-app/ — só a parte que não precisa de servidor (plano, ajustes, interesses, prova parcial, biblioteca). A Emma, os relatórios, a correção de escrita e a escuta por RSS exigem o servidor local (`iniciar.bat`).
