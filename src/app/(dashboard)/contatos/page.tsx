"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Contact, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function ContatosPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      // 1. Pegar a instância conectada
      const { data: instanceData, error: instanceError } = await supabase
        .from("whatsapp_instance")
        .select("phone_instance, status")
        .limit(1)
        .single();

      if (instanceError) throw instanceError;

      if (instanceData && instanceData.status === "connected" && instanceData.phone_instance) {
        setConnectedPhone(instanceData.phone_instance);

        // 2. Pegar os contatos do owner
        const { data: contactsData, error: contactsError } = await supabase
          .from("contatos")
          .select("*")
          .eq("owner", instanceData.phone_instance)
          .order("created_at", { ascending: false });

        if (contactsError) throw contactsError;
        setContacts(contactsData || []);
      }
    } catch (err) {
      console.error("Erro ao carregar contatos", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockContact = async (contactId: string, currentBlockedStatus: boolean) => {
    const newStatus = !currentBlockedStatus;
    
    // Atualiza o estado localmente para otimismo (UI reage rápido)
    setContacts(contacts.map(c => c.id === contactId ? { ...c, blocked: newStatus } : c));
    
    try {
      const { error } = await supabase
        .from("contatos")
        .update({ blocked: newStatus })
        .eq("id", contactId);

      if (error) throw error;
      
    } catch (err) {
      console.error("Erro ao atualizar bloqueio do contato", err);
      // Reverte em caso de erro
      setContacts(contacts.map(c => c.id === contactId ? { ...c, blocked: currentBlockedStatus } : c));
      alert("Não foi possível atualizar o status do contato.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
        <p className="text-zinc-500">
          Lista de contatos vinculados ao seu WhatsApp conectado.
        </p>
      </div>

      {!connectedPhone ? (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-6">
            <p className="text-amber-800 dark:text-amber-500">
              Nenhum WhatsApp conectado detectado. Por favor, conecte seu WhatsApp na aba "WhatsApp" para visualizar seus contatos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Contact className="w-5 h-5" />
              <span>Contatos de +{connectedPhone}</span>
            </CardTitle>
            <CardDescription>
              Esses contatos são criados automaticamente via n8n após uma interação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 border border-dashed rounded-lg bg-zinc-50 dark:bg-zinc-950">
                Nenhum contato encontrado para este número.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-zinc-500">Nome</th>
                      <th className="px-4 py-3 font-medium text-zinc-500">Telefone</th>
                      <th className="px-4 py-3 font-medium text-zinc-500">Data de Criação</th>
                      <th className="px-4 py-3 font-medium text-zinc-500 text-center">Bloquear interação IA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                        <td className="px-4 py-3 font-medium">{contact.name || "Sem Nome"}</td>
                        <td className="px-4 py-3">{contact.phone}</td>
                        <td className="px-4 py-3 text-zinc-500">
                          {new Date(contact.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-center flex justify-center">
                          <Switch
                            checked={contact.blocked === true}
                            onCheckedChange={() => toggleBlockContact(contact.id, contact.blocked === true)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
