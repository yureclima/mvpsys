"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bot, MessageSquare, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function DashboardPage() {
  const [leadCount, setLeadCount] = useState(0);
  const [wpStatus, setWpStatus] = useState("disconnected");
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      // Get lead count
      const { count } = await supabase
        .from("crm_cards")
        .select("*", { count: "exact", head: true });
      
      if (count !== null) setLeadCount(count);

      // Get WhatsApp status
      const { data } = await supabase
        .from("whatsapp_instance")
        .select("status")
        .limit(1)
        .single();
        
      if (data) setWpStatus(data.status);
    }
    
    fetchData();
  }, []);

  const getWpStatusColor = (status: string) => {
    if (status === 'connected') return 'text-emerald-600';
    if (status === 'connecting') return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getWpStatusText = (status: string) => {
    if (status === 'connected') return 'Conectado';
    if (status === 'connecting') return 'Conectando...';
    return 'Desconectado';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-500">Visão geral do seu sistema e integrações.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Leads no CRM
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadCount}</div>
            <p className="text-xs text-zinc-500">
              Total de contatos cadastrados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Status do WhatsApp
            </CardTitle>
            <MessageSquare className={`h-4 w-4 ${getWpStatusColor(wpStatus)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getWpStatusColor(wpStatus)}`}>
              {getWpStatusText(wpStatus)}
            </div>
            <p className="text-xs text-zinc-500">
              Sessão da UAZAPI
            </p>
          </CardContent>
        </Card>

        {/* Locked Cards */}
        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Taxa de Conversão IA
              <span className="bg-zinc-200 text-zinc-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Em breve</span>
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--%</div>
            <p className="text-xs text-zinc-500">
              Estatística futura
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Tempo Médio de Resposta
              <span className="bg-zinc-200 text-zinc-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Em breve</span>
            </CardTitle>
            <Bot className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-- min</div>
            <p className="text-xs text-zinc-500">
              Estatística futura
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
