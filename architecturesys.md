Documento de Arquitetura e Requisitos: MVP Painel Single-User
1. Visão Geral
Este documento define as diretrizes estritas para a criação de um Painel de Controle MVP para um único usuário. O sistema integra gerenciamento de leads (CRM/Kanban), automação de WhatsApp via UAZAPI e configuração de um Agente de IA integrado ao n8n.

Regra de Ouro para a IA Coder: Não faça overengineering de sistemas multi-tenant (SaaS). O sistema é para apenas UM usuário autenticado. Mantenha o código limpo, modular e focado em resolver os requisitos descritos abaixo.

2. Stack Tecnológica Recomendada
Framework: Next.js (App Router) com React 18+

Estilização: Tailwind CSS + Shadcn UI (para componentes rápidos e bonitos)

Backend/BaaS: Supabase (Auth, Database PostgreSQL, Realtime)

Integrações Externas: n8n (Webhooks do Agente), UAZAPI (WhatsApp)

Drag & Drop (Kanban): @hello-pangea/dnd ou dnd-kit

3. Estrutura do Banco de Dados (Supabase)
A IA deve criar ou assumir o seguinte schema de tabelas no Supabase:

agent_config: (Apenas 1 registro)

id (uuid)

system_prompt (text)

is_active (boolean, default false)

whatsapp_instance: (Apenas 1 registro)

id (uuid)

instance_key (text)

status (text - 'disconnected', 'connecting', 'connected')

updated_at (timestamp)

crm_columns:

id (uuid)

title (text)

order_index (integer)

crm_cards (Leads/Contatos):

id (uuid)

column_id (uuid - FK para crm_columns)

contact_name (text)

contact_phone (text)

order_index (integer)

created_at (timestamp)

4. Requisitos por Módulo
4.1. Autenticação e Layout Base
Auth: Tela de login simples com E-mail e Senha usando Supabase Auth. Sem registro público (o usuário será criado manualmente no painel do Supabase).

Layout: Sidebar lateral de navegação (Dashboard, Agente IA, CRM, Contatos, WhatsApp) e uma área de conteúdo principal.

4.2. Dashboard
Métricas Reais: Cards exibindo "Leads recebidos no WhatsApp" com filtro (Dropdown/Tabs) para: Hoje, Esta Semana, Este Mês (Baseado na tabela crm_cards).

Métricas Bloqueadas: Adicionar 2 ou 3 cards com opacidade reduzida e um ícone de cadeado/badge escrito "Em breve" (ex: "Taxa de Conversão da IA", "Tempo Médio de Resposta").

4.3. Agente IA
Status Bar: Exibir no topo da página:

Status do Agente: Badge Verde (Online) ou Vermelho (Offline).

Status do WhatsApp: Ligar com a tabela whatsapp_instance (Conectado/Desconectado).

Controle (ON/OFF):

Um Switch/Toggle para ligar e desligar a IA.

Ação: Ao alternar, disparar uma requisição HTTP POST (Webhook) para o n8n informando o status ({"status": "on"} ou {"status": "off"}). Também deve salvar o estado na tabela agent_config.

Prompt System:

Um <textarea> grande para o usuário digitar as instruções do agente.

Botão "Salvar Prompt": Salva o texto na tabela agent_config no Supabase (o n8n lerá essa tabela a cada execução).

4.4. CRM (Kanban) - ⚠️ Atenção Redobrada
Interface: Estilo Trello.

Funcionalidades:

O usuário deve poder criar novas colunas (ex: "Lead Frio", "Negociação") e deletar colunas.

Drag and Drop para mover cards (contatos) entre colunas e reordená-los.

Boas Práticas exigidas da IA para o Kanban:

Optimistic Updates: Ao soltar o card (onDragEnd), atualize a UI imediatamente antes de esperar a resposta do Supabase, para evitar "engasgos" visuais.

Indexação: Ao mover um card, atualize a propriedade order_index e column_id no banco de dados para persistir a posição.

Tratamento de Erro: Se a requisição ao Supabase falhar, reverta o card para a coluna original silenciosamente e mostre um Toast de erro.

4.5. Módulo WhatsApp (Integração UAZAPI)
Este módulo é restrito a apenas 1 instância. Deve verificar o Supabase primeiro; se não houver registro, criar um no momento da primeira conexão.

Interface Visual:

Card informando o status atual (disconnected, connecting, connected).

Se disconnected: Exibir botão "Conectar WhatsApp".

Se connecting: Exibir o QR Code retornado pela API e um loader.

Se connected: Exibir botão "Desconectar".

Lógica de Conexão (POST /instance/connect):

Ao clicar em conectar, enviar POST para a UAZAPI.

Pegar o QR Code (base64) retornado e exibir na tela.

Atualizar o banco para status: 'connecting'.

Monitoramento em Tempo Real (GET /instance/status):

Enquanto o status for connecting, implementar um Polling de requisição (a cada 3-5 segundos) para o endpoint GET /instance/status.

Se o usuário escanear o QR code, o status da UAZAPI mudará para connected. A UI deve capturar isso, parar o polling, salvar o status no Supabase e atualizar a tela imediatamente.

Boas Práticas exigidas da IA para UAZAPI:

Implementar Cleanup no useEffect do React para garantir que o Polling pare quando o componente for desmontado.

Gerenciar os limites de timeout informados pela UAZAPI (2 minutos para QRCode). Após isso, exibir botão "Gerar novo QR Code".

4.6. Contatos
Tabela simples listando todos os contatos que entraram pelo WhatsApp e estão no CRM.

Colunas: Nome, Telefone, Data de Criação e Coluna Atual no CRM.

5. System Prompt Rigoroso para a Execução (Regras para a IA)
Quando for gerar o código, siga estas regras estritamente:

Sem Mock de Dados Permanente: Você pode usar mock inicial para o visual, mas deve conectar as páginas ao Supabase assim que a estrutura estiver aprovada.

Tipagem: Use TypeScript rigoroso. Crie as interfaces/tipos baseados no schema do banco de dados mencionado na seção 3.

Responsividade: O painel deve funcionar de forma decente no mobile, embora o foco seja desktop. No mobile, o Kanban pode empilhar horizontalmente com scroll (overflow-x-auto).

Segurança: O painel inteiro (todas as rotas após /) deve ser protegido por um middleware do Supabase Auth que redireciona usuários não logados para /login.

6. Infraestrutura, Deploy e CI/CD (Easypanel + GitHub)
O projeto será hospedado no Easypanel, conectado via repositório do GitHub. O agente de IA deve preparar o projeto para que o comando npm run build execute sem erros e o deploy seja otimizado.

6.1. Configuração do Next.js para Easypanel (Docker/Nixpacks)
Para garantir que o Easypanel empacote a aplicação da forma mais leve e rápida possível, a IA deve configurar o Next.js para o modo standalone.

Arquivo exigido: O next.config.js (ou .mjs) deve conter obrigatoriamente a propriedade output: 'standalone'. Isso reduz drasticamente o tamanho da imagem gerada pelo Easypanel.

6.2. Gerenciamento de Variáveis de Ambiente
A IA deve construir o sistema utilizando variáveis de ambiente estritas. Nenhuma chave deve ser "chumbada" (hardcoded) no código. O código deve estar preparado para ler as seguintes variáveis que o usuário irá configurar manualmente no painel do Easypanel:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY (Apenas para rotas de API seguras, se necessário)

N8N_WEBHOOK_URL (Para o envio do status ON/OFF e prompts)

UAZAPI_BASE_URL (URL da API do WhatsApp)

UAZAPI_API_KEY (Token de autenticação da UAZAPI)

6.3. Supabase via MCP (Model Context Protocol)
Como a IA tem acesso direto ao Supabase via MCP:

A IA não precisa gerar arquivos de migração SQL massivos, pois pode interagir diretamente com a estrutura se necessário.

Regra de Build: A IA deve garantir que todas as chamadas ao Supabase utilizem o cliente oficial (@supabase/supabase-js ou @supabase/ssr para o App Router) e que os tipos gerados pelo Supabase sejam utilizados corretamente para que o TypeScript não falhe durante o npm run build.

6.4. Qualidade de Código para Build
O Easypanel roda o npm run build na nuvem. Se houver qualquer erro de TypeScript ou Lint, o deploy falhará.

Ordem Estrita: A IA deve rodar verificações locais de TypeScript (tsc --noEmit) e Linting (next lint) antes de dar uma tarefa como concluída, garantindo que o código enviado ao GitHub passará limpo no build do Easypanel.

repositorio git enviar prod https://github.com/yureclima/mvpsys.git