import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM Kanban</h1>
        <p className="text-zinc-500">Gerencie seus contatos através de nosso sistema Trello-like.</p>
      </div>
      
      <KanbanBoard />
    </div>
  );
}
