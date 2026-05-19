export interface CrmColumn {
  id: string;
  title: string;
  order_index: number;
}

export interface CrmCard {
  id: string;
  column_id: string;
  contact_name: string;
  contact_phone: string;
  order_index: number;
  created_at: string;
}

export interface KanbanData {
  columns: CrmColumn[];
  cards: Record<string, CrmCard[]>; // Key is column_id
}
