# Smoke test pós-deploy — Firestore rules + fluxos críticos

Use este checklist **após publicar código e `firestore.rules` na mesma janela** (ou código primeiro, rules em seguida).

Cada item indica se há teste automatizado e como rodá-lo.

## Pré-requisitos

```bash
# Unit + integração (sem emulador, exceto rules)
npm test

# Rules Firestore (emulador obrigatório)
npm run test:rules

# E2E completo (Auth + Firestore + Next dev)
npm run test:e2e
```

---

## 1. Visitante (sem login)

| # | Cenário | Esperado | Teste automatizado |
|---|---------|----------|-------------------|
| 1.1 | Landing carrega hero e planos | Planos do seed visíveis | `e2e/guest.spec.ts` |
| 1.2 | `/dashboard` sem sessão | Redirect para `/` | `e2e/guest.spec.ts` |
| 1.3 | Leitura pública de `plans` | OK (rules: `read: true`) | `firestore.rules.test.ts` — *plans read* |
| 1.4 | Leitura pública de `publicProfiles` | OK | `firestore.rules.test.ts` |

---

## 2. Aluno — login e perfil

| # | Cenário | Esperado | Teste automatizado |
|---|---------|----------|-------------------|
| 2.1 | Primeiro login cria doc `users/{uid}` como `student` | Perfil criado | `firestore.rules.test.ts` — self-create student |
| 2.2 | Self-create com role elevada | **Negado** | `firestore.rules.test.ts` |
| 2.3 | Dashboard visão geral | Plano ativo visível | `e2e/student.spec.ts`, `e2e/smoke-post-deploy.spec.ts` |
| 2.4 | Sync de nome/email/foto (Google) | `updateDoc` só campos permitidos | `firestore.rules.test.ts` — self-update |
| 2.5 | Aluno tenta editar `planId` no client | **Negado** | `firestore.rules.test.ts` |

---

## 3. Aluno — turmas e check-in

| # | Cenário | Esperado | Teste automatizado |
|---|---------|----------|-------------------|
| 3.1 | Lista turmas **ativas** no check-in | Turma E2E visível | `e2e/smoke-post-deploy.spec.ts` |
| 3.2 | Turma **inativa** não aparece na UI | Sem turma inativa | `e2e/smoke-post-deploy.spec.ts` |
| 3.3 | Leitura direta de turma inativa (Firestore client) | **Negado** | `firestore.rules.test.ts` |
| 3.4 | Leitura de turma ativa | OK | `firestore.rules.test.ts` |
| 3.5 | Check-in via API | 200 + doc criado | `checkins/route.test.ts`, `e2e/student-checkin.spec.ts` |
| 3.6 | Write direto em `checkins` / contadores | **Negado** | `firestore.rules.test.ts` |
| 3.7 | Cancelamento via API | OK | `checkins/[checkinId]/route.test.ts` |
| 3.8 | Sem plano / mensalidade / prazo / limite | UI bloqueia | `e2e/student-checkin.spec.ts` |
| 3.9 | Check-in em turma inativa | API rejeita | `checkins/route.test.ts` |

---

## 4. Aluno — feedback

| # | Cenário | Esperado | Teste automatizado |
|---|---------|----------|-------------------|
| 4.1 | Enviar feedback via API (`POST /api/private/feedback`) | 200 + aparece na lista | `e2e/student.spec.ts`, `feedback/route.test.ts` |
| 4.2 | Write direto em `feedbacks` no client | **Negado** | `firestore.rules.test.ts` |
| 4.3 | Apagar próprio feedback via API | 200 + some da lista | `e2e/smoke-post-deploy.spec.ts`, `feedback/[id]/route.test.ts` |
| 4.4 | Delete direto no Firestore client | **Negado** | `firestore.rules.test.ts` |
| 4.5 | Listener `listenMyFeedbacks` | Lê só os próprios | `firestore.rules.test.ts` |
| 4.6 | Aluno inativo / sem plano ativo | API 403 | `feedback/route.test.ts` |

---

## 5. Coach / admin

| # | Cenário | Esperado | Teste automatizado |
|---|---------|----------|-------------------|
| 5.1 | Dashboard visão geral | Carrega | `e2e/coach.spec.ts`, `e2e/smoke-post-deploy.spec.ts` |
| 5.2 | Lista alunos (`users` role=student) | Aluno E2E visível | `e2e/coach.spec.ts` |
| 5.3 | Lista turmas e planos | Seed visível | `e2e/coach.spec.ts` |
| 5.4 | Coach lê turma **inativa** (Firestore) | OK | `firestore.rules.test.ts` |
| 5.5 | Coach lê check-in de aluno | OK | `firestore.rules.test.ts` |
| 5.6 | Coach lê feedback de aluno | OK | `firestore.rules.test.ts` |
| 5.7 | CRUD turma/plano/aluno via API | OK (Admin SDK) | `planService.test.ts`, `classService.test.ts`, `userService.test.ts` |
| 5.8 | Write direto em `classes` / `plans` no client | **Negado** | `firestore.rules.test.ts` |
| 5.9 | Check-ins recentes no dashboard | API `/api/private/checkins/recent` | `e2e/coach-checkin.spec.ts` |

---

## 6. Deploy desalinhado (regressão conhecida)

| # | Cenário | Risco | Mitigação |
|---|---------|-------|-----------|
| 6.1 | Rules novas + bundle JS **antigo** (feedback client write) | Feedback falha com permission denied | Deploy conjunto; hard refresh |
| 6.2 | Rules novas sem API de feedback | Idem | Garantir `feedbackService` usa fetch |
| 6.3 | Doc `users/{uid}` ausente ou role errada | Leituras coach/aluno falham | Seed / login via `ensureUserDocument` |

---

## Ordem recomendada de deploy

1. Deploy da aplicação (Next.js + APIs)
2. Deploy de `firestore.rules`
3. Rodar smoke manual (5 min) ou `npm run test:e2e`
4. Validar login aluno → check-in → feedback → logout
5. Validar login coach → alunos → turmas → check-ins

---

## Smoke manual rápido (~5 min)

1. **Guest:** abrir `/` → planos visíveis
2. **Aluno:** login Google → dashboard → aba Check-in → turma ativa → check-in (se dia útil)
3. **Aluno:** aba Feedback → enviar → apagar
4. **Coach:** login → Alunos → Turmas → Planos → Check-Ins (filtro por data)
5. **DevTools:** confirmar que mutações vão para `/api/private/*`, não Firestore client writes (exceto login sync)

---

## Comandos CI sugeridos

```bash
npm run lint
npm run typecheck
npm test
npm run test:rules    # pipeline com emulador Firestore
npm run test:e2e      # pipeline com emuladores Auth + Firestore
```

**Pre-commit (Husky):** `npm run precommit` executa lint + typecheck + testes acima + deploy dev condicional de rules/indexes. Ver README.
