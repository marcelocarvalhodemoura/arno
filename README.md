# Grupo Escoteiro Arno Friedrich

Repositório com as duas frentes do projeto do grupo (43/RS).

| Pasta          | O que é                                                   | Tecnologia                                  |
| -------------- | --------------------------------------------------------- | ------------------------------------------- |
| `site/`        | Site institucional público                                | React + TypeScript + Vite (estático)        |
| `application/` | Sistema de tesouraria (área administrativa, com login)    | React + Node.js/Express + PostgreSQL        |

## Site institucional

```bash
cd site
npm install
npm run dev     # desenvolvimento
npm run build   # gera site/dist para publicação
```

O build em `site/dist` é composto só de arquivos estáticos, então roda em qualquer
hospedagem compartilhada. O `.htaccess` incluído no build cuida do roteamento do
React Router no Apache: qualquer URL cai no `index.html`.

## Sistema de tesouraria

Precisa de Node.js e PostgreSQL. Instruções completas em
[`application/README.md`](application/README.md).

```bash
cd application
cp .env.example .env    # preencha as senhas antes de subir
npm install
npm run db:up
npm run dev
```

## Configuração e segredos

Nenhuma senha, chave ou dado real fica neste repositório:

- Todas as credenciais vêm de variáveis de ambiente, listadas em `application/.env.example`.
  O `.env` de verdade não é versionado.
- No primeiro start, sem `ADMIN_PASSWORD` definida, a API gera uma senha aleatória
  para os usuários iniciais e a imprime uma vez no console.
- O extrato usado nos testes é fictício e pode ser regerado com
  `node backend/tests/fixtures/make-sample-statement.mjs`.

## Testes

```bash
cd application
npm run test:unit   # unitários (frontend e backend)
npm run test:int    # integração da API no banco tesouraria_test
npm run test:e2e    # Playwright no Chromium
```
