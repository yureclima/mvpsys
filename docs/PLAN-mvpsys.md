# Plano de Projeto: MVP Painel Single-User

## 1. Stack Tecnológica Confirmada
- **Framework:** Next.js (App Router) + React 18
- **Estilização:** Tailwind CSS + Shadcn UI
- **Backend/Auth:** Supabase (Auth, Database)
- **Integrações:** n8n (Webhooks), UAZAPI (WhatsApp)
- **Kanban:** `@hello-pangea/dnd` (Leve, sem over-engineering)
- **Infra:** Docker/Standalone mode para Easypanel

## 2. Fases do Projeto

### Fase 1: Setup e Infraestrutura
- [ ] Inicializar projeto Next.js com Tailwind CSS e TypeScript.
- [ ] Configurar `next.config.mjs` para modo `standalone`.
- [ ] Configurar Shadcn UI.
- [ ] Instalar dependências essenciais (Supabase JS, `lucide-react`, `@hello-pangea/dnd`).
- [ ] Inicializar repositório Git (https://github.com/yureclima/mvpsys.git).

### Fase 2: Banco de Dados e Autenticação (Supabase)
- [ ] Configurar conexão com Supabase e cliente.
- [ ] Implementar middleware de proteção de rotas `/` para redirecionar para `/login`.
- [ ] Criar página de `/login` simples (Email/Senha).
- [ ] Criar Layout base da dashboard com Sidebar.

### Fase 3: Dashboard e Contatos
- [ ] Criar página principal (Dashboard) com layout de cards.
- [ ] Criar tela de Contatos (tabela simples).

### Fase 4: Módulo Agente IA
- [ ] Criar interface para controle de status (ON/OFF).
- [ ] Implementar lógica de salvamento e envio (Webhook n8n).

### Fase 5: Módulo CRM (Kanban)
- [ ] Implementar Drag and Drop usando `@hello-pangea/dnd`.
- [ ] Adicionar lógica de Optimistic Updates e persistência.

### Fase 6: Módulo WhatsApp (UAZAPI)
- [ ] Criar UI de status e QRCode.
- [ ] Implementar polling de conexão.

### Fase 7: Revisão e Deploy
- [ ] Checagem de Lint e Typescript.
- [ ] Push para o GitHub.
