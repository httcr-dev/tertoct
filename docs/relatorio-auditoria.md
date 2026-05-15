# Problemas da auditoria que ainda permanecem

## 1. Complexidade alta nas Firestore Rules ⚠️

### Problema

As rules ainda fazem muitos `get()` encadeados.

Exemplos conceituais:

```txt
userDoc()
planDoc()
currentUserPlanId()
```

Isso pode causar:

* aumento de latência;
* custo maior;
* limite de evaluation das rules;
* dificuldade de manutenção.

---

## Impacto

Hoje não é uma falha crítica.

Mas conforme crescer:

* usuários;
* requests;
* relacionamentos;
* coleções;

isso pode virar gargalo real.

---

## Melhor solução

Desnormalizar permissões importantes.

Exemplo:

```ts
users/{uid}
{
  role: "coach",
  coachId: "...",
  activePlanId: "...",
  canAccessStudents: true
}
```

Assim as rules precisariam de menos leituras indiretas.

---

# 2. Observabilidade ainda limitada ⚠️

## Problema

Existe observabilidade básica, porém ainda não é produção enterprise.

Hoje há:

* logs;
* tracking;
* anomaly detection básica.

Mas faltam:

* tracing;
* métricas reais;
* dashboards;
* alertas automáticos;
* monitoramento distribuído.

---

## Risco

Em produção você ainda pode ter:

* erros silenciosos;
* lentidão invisível;
* falhas intermitentes;
* problemas difíceis de reproduzir.

---

## Melhor solução

Adicionar:

* [Sentry](https://sentry.io?utm_source=chatgpt.com)
* [OpenTelemetry](https://opentelemetry.io?utm_source=chatgpt.com)
* métricas centralizadas;
* dashboards;
* alertas.

---

# 3. `trackStatusAnomaly` ainda pode falhar em serverless ⚠️

## Problema

O tracking atual aparenta depender parcialmente de memória/processo local.

Em ambientes serverless:

* cada instância é isolada;
* memória não é compartilhada;
* estado pode sumir.

---

## Risco

Detecção inconsistente de:

* spam;
* ataques;
* loops;
* bursts de erro.

---

## Melhor solução

Persistir estado em:

* Redis;
* Upstash;
* Firestore agregador;
* métricas externas.

---

# 4. `style-src 'unsafe-inline'` ainda existe ⚠️

## Problema

A CSP dos scripts foi corrigida corretamente.

Mas estilos ainda usam:

```txt
style-src 'self' 'unsafe-inline'
```

---

## Impacto

Isso é MUITO comum em:

* React;
* Tailwind;
* Next.js.

Então não é crítico.

Mas ainda reduz o hardening ideal da CSP.

---

## Melhor solução futura

Migrar para:

* nonce-based styles;
* hashes;
* CSS externalizado.

---

# 5. Dependência forte do middleware ⚠️

## Problema

Grande parte da segurança depende de:

```txt
src/proxy.ts
```

O middleware está muito bom.

Porém ele não deveria ser a única barreira.

---

## Risco

Se futuramente alguém:

* esquecer validação numa route;
* criar endpoint novo errado;
* alterar matcher do middleware;

pode abrir bypass.

---

## Melhor prática

Toda API privada deve validar:

```ts
auth
role
ownership
```

mesmo passando pelo middleware.

---

# 6. Cache ainda pouco explorado ⚠️

## Problema

A arquitetura ainda depende muito de:

* requests diretos;
* Firestore reads;
* recomputação.

---

## Impacto

Conforme escalar:

* custo sobe;
* latência aumenta;
* dashboard pode ficar pesado.

---

## Melhor solução

Adicionar:

* `unstable_cache`
* React cache
* aggregation docs
* edge caching
* memoization server-side

---

# 7. Separação arquitetural ainda parcial ⚠️

## Problema

Parte da lógica ainda está espalhada entre:

* route handlers;
* services;
* utils.

---

## Impacto

Hoje ainda é administrável.

Mas projetos maiores sofrem com:

* acoplamento;
* duplicação;
* manutenção difícil.

---

## Melhor evolução

Estrutura mais forte:

```txt
controllers/
services/
repositories/
dto/
validators/
```

---

# 8. Ausência de testes mais profundos ⚠️

## Pelo que apareceu no projeto

Existem alguns testes, mas ainda não parece haver:

* cobertura robusta;
* testes E2E reais;
* testes de segurança;
* testes de middleware;
* testes de Firestore Rules automatizados.

---

## Isso ainda é importante

Principalmente porque o projeto depende fortemente de:

* autorização;
* RBAC;
* middleware;
* rules.

---

## Melhor solução

Adicionar:

* [Playwright](https://playwright.dev?utm_source=chatgpt.com)
* testes de rules com Firebase Emulator
* testes de autorização
* testes de APIs privadas

---

# Resumo

## O que ainda falta

Maior parte agora é:

```txt
engenharia de escala
+
hardening avançado
+
observabilidade
+
performance
```

e não mais vulnerabilidades graves.

O projeto saiu da fase “MVP inseguro” e entrou na fase:

```txt
SaaS estruturado precisando amadurecer infraestrutura
```
