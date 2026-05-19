"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createClient } from "@/lib/supabase";
import { CrmColumn, CrmCard, KanbanData } from "@/types/kanban";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export function KanbanBoard() {
  const [data, setData] = useState<KanbanData>({ columns: [], cards: {} });
  const [loading, setLoading] = useState(true);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const supabase = createClient();

  // Fix for hydration issues with react-beautiful-dnd / hello-pangea
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch columns
      const { data: cols, error: colErr } = await supabase
        .from("crm_columns")
        .select("*")
        .order("order_index", { ascending: true });

      if (colErr) throw colErr;

      // Fetch cards
      const { data: cardsRaw, error: cardErr } = await supabase
        .from("crm_cards")
        .select("*")
        .order("order_index", { ascending: true });

      if (cardErr) throw cardErr;

      const groupedCards: Record<string, CrmCard[]> = {};
      
      // Initialize empty arrays for all columns
      cols?.forEach(c => { groupedCards[c.id] = []; });
      
      // Populate cards
      cardsRaw?.forEach((card: CrmCard) => {
        if (!groupedCards[card.column_id]) {
          groupedCards[card.column_id] = [];
        }
        groupedCards[card.column_id].push(card);
      });

      setData({
        columns: cols || [],
        cards: groupedCards,
      });
    } catch (error: any) {
      toast.error("Erro ao carregar dados do Kanban: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // ----------------------------------------------------
    // COLUMNS REORDERING (If we had a droppable for columns)
    // ----------------------------------------------------
    if (type === "column") {
       // Optional: implement column drag and drop later
       return;
    }

    // ----------------------------------------------------
    // CARDS REORDERING
    // ----------------------------------------------------
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const sourceCards = Array.from(data.cards[sourceColId] || []);
    const destCards = sourceColId === destColId ? sourceCards : Array.from(data.cards[destColId] || []);

    const [movedCard] = sourceCards.splice(source.index, 1);
    
    // Update destination reference
    movedCard.column_id = destColId;
    destCards.splice(destination.index, 0, movedCard);

    // Re-calculate order_index for destination (and source if different)
    const updateIndices = (cards: CrmCard[]) => cards.map((c, i) => ({ ...c, order_index: i }));
    
    const newCardsState = { ...data.cards };
    
    if (sourceColId === destColId) {
      newCardsState[sourceColId] = updateIndices(sourceCards);
    } else {
      newCardsState[sourceColId] = updateIndices(sourceCards);
      newCardsState[destColId] = updateIndices(destCards);
    }

    // OPTIMISTIC UI UPDATE
    setData((prev) => ({
      ...prev,
      cards: newCardsState,
    }));

    // BACKEND PERSISTENCE
    try {
       // Find the card in DB and update its column_id and order_index
       const { error } = await supabase
         .from("crm_cards")
         .update({ column_id: destColId, order_index: destination.index })
         .eq("id", draggableId);
         
       if (error) throw error;
       
       // Note: in a production app with concurrent users, we might need to batch update all affected cards' order_index.
       // For this Single-User MVP, updating the moved card is usually enough if we sort carefully, but let's be robust:
       
       const updates = newCardsState[destColId].map(c => ({
         id: c.id,
         column_id: c.column_id,
         contact_name: c.contact_name,
         contact_phone: c.contact_phone,
         order_index: c.order_index
       }));

       // Upsert is available, we can upsert the array to bulk update order
       await supabase.from("crm_cards").upsert(updates);
       
       if (sourceColId !== destColId) {
          const sourceUpdates = newCardsState[sourceColId].map(c => ({
            id: c.id,
            column_id: c.column_id,
            contact_name: c.contact_name,
            contact_phone: c.contact_phone,
            order_index: c.order_index
          }));
          await supabase.from("crm_cards").upsert(sourceUpdates);
       }

    } catch (err: any) {
      toast.error("Erro ao mover lead. Revertendo...");
      fetchData(); // Revert UI
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    try {
      const newOrder = data.columns.length;
      const { data: newCol, error } = await supabase
        .from("crm_columns")
        .insert({ title: newColumnTitle, order_index: newOrder })
        .select()
        .single();
        
      if (error) throw error;

      setData(prev => ({
        columns: [...prev.columns, newCol],
        cards: { ...prev.cards, [newCol.id]: [] }
      }));
      setNewColumnTitle("");
      toast.success("Coluna adicionada!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };
  
  const handleDeleteColumn = async (id: string) => {
    if (!confirm("Tem certeza? Isso apagará todos os leads dessa coluna.")) return;
    try {
      const { error } = await supabase.from("crm_columns").delete().eq("id", id);
      if (error) throw error;
      
      setData(prev => {
        const newCols = prev.columns.filter(c => c.id !== id);
        const newCards = { ...prev.cards };
        delete newCards[id];
        return { columns: newCols, cards: newCards };
      });
      toast.success("Coluna removida.");
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

  if (!isMounted || loading) {
    return <div className="h-64 flex items-center justify-center">Carregando CRM...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4">
        <form onSubmit={handleAddColumn} className="flex gap-2 max-w-sm">
          <Input 
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="Nova coluna (ex: Negociação)" 
          />
          <Button type="submit"><Plus className="w-4 h-4 mr-2"/> Adicionar</Button>
        </form>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full items-start">
            {data.columns.map((col) => (
              <div key={col.id} className="bg-zinc-100 dark:bg-zinc-900 rounded-lg min-w-[300px] max-w-[300px] flex flex-col max-h-full border border-zinc-200 dark:border-zinc-800">
                <div className="p-3 font-semibold text-sm flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{col.title}</span>
                    <span className="bg-zinc-200 dark:bg-zinc-800 text-xs px-2 py-0.5 rounded-full">
                      {data.cards[col.id]?.length || 0}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteColumn(col.id)} className="text-zinc-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 p-3 overflow-y-auto min-h-[150px] transition-colors ${
                        snapshot.isDraggingOver ? "bg-zinc-200/50 dark:bg-zinc-800/50" : ""
                      }`}
                    >
                      {data.cards[col.id]?.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-3 shadow-sm ${snapshot.isDragging ? "opacity-75 ring-2 ring-primary scale-105" : ""}`}
                            >
                              <CardContent className="p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-sm">{card.contact_name}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{card.contact_phone}</p>
                                  </div>
                                  <GripVertical className="w-4 h-4 text-zinc-300" />
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
            
            {data.columns.length === 0 && (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-200 rounded-xl dark:border-zinc-800">
                <Users className="w-12 h-12 mb-4 text-zinc-300" />
                <p>Nenhuma coluna encontrada.</p>
                <p className="text-sm">Crie a primeira coluna para iniciar seu funil.</p>
              </div>
            )}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

// Temporary icon needed for the empty state
import { Users } from "lucide-react";
