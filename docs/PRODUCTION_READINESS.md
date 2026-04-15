# Tertoct - Production Readiness Guide

## 1) Visao geral do projeto

Tertoct e uma aplicacao SaaS para academias de boxe baseada em Next.js + Firebase:

- Frontend e backend no App Router do Next.js.
- Autenticacao via Firebase Authentication (Google).
- Persistencia no Cloud Firestore.
- Controle de acesso por regras no Firestore e verificacao de token no servidor.

### Componentes principais

- `src/app`: rotas e APIs (`/api/auth/cookie`, `/api/auth/verify`).
- `src/proxy.ts`: middleware de seguranca (headers, controle de acesso por rota).
- `src/lib/auth`: verificacao de token, RBAC e rate limit.
- `src/services`: camada de acesso e regras de negocio para Firestore.
- `firestore.rules`: regras de seguranca no banco.

## 2) Revisao tecnica para producao

### Pontos positivos encontrados

- Cookie de sessao com `httpOnly`, `sameSite: strict`, `secure` em producao.
- Verificacao de token no backend antes de liberar rotas privadas.
- Rate limiting em endpoints sensiveis de autenticacao.
- Middleware com headers de seguranca e CSP.
- Boa base de testes unitarios para servicos e autenticacao.

### Pontos criticos e riscos

1. **Confianca de cabecalhos de proxy (`TRUST_PROXY_HEADERS`)**
   - Se habilitado em ambiente sem proxy confiavel, pode distorcer identificacao de cliente.
   - Mitigacao: habilitar apenas atras de load balancer/proxy controlado.

2. **Rate limit depende de Firestore admin**
   - Em indisponibilidade, endpoints podem falhar por desenho fail-closed (mais seguro, menor disponibilidade).
   - Mitigacao: monitorar erros de `_rateLimits` e alertar rapidamente.

3. **Dependencia forte de variaveis de ambiente**
   - Ambientes incompletos podem causar falhas de auth e Firestore.
   - Mitigacao: validar env no pipeline antes de deploy.

4. **Observabilidade ainda basica**
   - Ja existe estrutura de logs/erros, mas sem garantia de dashboard e alerta configurados.
   - Mitigacao: configurar monitoramento de 401/403/429/500 e latencia.

## 3) Qualidade e testes

### Gate minimo recomendado

- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`

### Cobertura

- Meta de aprovacao: **>= 80%** (statements, branches, functions, lines).
- O threshold de Jest foi configurado para barrar merge abaixo desse valor.

## 4) Passo a passo para subir em producao

## 4.1 Pre-requisitos

1. Projeto Firebase de producao criado.
2. Dominio e HTTPS configurados.
3. Variaveis de ambiente de producao definidas:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_PROJECT_ID` (server/admin)
   - `TRUST_PROXY_HEADERS=true` somente se existir proxy confiavel.

## 4.2 Checklist pre-deploy

1. Atualizar branch com `main`.
2. Instalar dependencias: `npm ci`.
3. Rodar qualidade local/CI:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:coverage`
4. Confirmar cobertura >= 80%.
5. Revisar `firestore.rules`.

## 4.3 Build e validacao

1. Build de producao:
   - `npm run build`
2. Smoke test local:
   - `npm run start`
   - validar login, dashboard, fluxo de check-in e logout.

## 4.4 Deploy

1. Deploy da aplicacao Next.js no provedor escolhido.
2. Deploy de regras do Firestore:
   - `firebase deploy --only firestore:rules`
3. (Opcional) seed de dados iniciais:
   - `npm run seed`

## 4.5 Pos-deploy

1. Validar manualmente:
   - Login Google.
   - Escrita/leitura de alunos e planos.
   - Criacao de check-in respeitando limite semanal.
   - Endpoints `/api/auth/cookie` e `/api/auth/verify`.
2. Monitorar:
   - Taxa de erro 5xx.
   - Picos de 401/403/429.
   - Latencia de API e operacoes de Firestore.
3. Definir rollback:
   - manter versao anterior pronta para reverter rapidamente.

## 5) Politica de seguranca recomendada

- Nunca expor credenciais server-side no cliente.
- Rotacionar chaves periodicamente.
- Revisar regras de Firestore a cada mudanca de modelo de dados.
- Auditar logs de autenticacao e tentativas de abuso regularmente.
- Proteger branches de deploy com aprovacoes e checks obrigatorios.
