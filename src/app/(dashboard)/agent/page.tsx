"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

export default function AgentPage() {
  const [isActive, setIsActive] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_config")
        .select("*")
        .limit(1)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setIsActive(data.is_active);
        setPrompt(data.system_prompt || "");
      }
    } catch (err: any) {
      toast.error("Erro ao carregar configurações da IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setIsActive(checked);
    try {
      // 1. Atualizar banco
      const { error } = await supabase
        .from("agent_config")
        .update({ is_active: checked })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Pega o único registro
        
      if (error) throw error;

      // 2. Notificar webhook n8n (simulação no frontend, pode precisar de API route para evitar CORS, mas vamos tentar direto se o n8n aceitar CORS ou usaremos uma Rota de API Next.js futuramente)
      toast.success(checked ? "Agente ativado com sucesso!" : "Agente desativado!");
      
      // Chamar webhook
      const webhookUrl = "https://webhook.proagency.site/webhook/54fe17e5-c60b-4c2f-852a-ed57b407e2cb";
      fetch(webhookUrl, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ status: checked ? "ON" : "OFF" })
      }).catch(e => console.error("Webhook falhou", e));

    } catch (err: any) {
      toast.error("Falha ao alterar status.");
      setIsActive(!checked); // Revert UI
    }
  };

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agent_config")
        .update({ system_prompt: prompt })
        .neq("id", "00000000-0000-0000-0000-000000000000");
        
      if (error) throw error;
      toast.success("Prompt salvo! A IA usará as novas instruções na próxima interação.");
    } catch (err: any) {
      toast.error("Erro ao salvar o prompt.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agente IA (n8n)</h1>
        <p className="text-zinc-500">Configure e ative seu agente de atendimento.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status do Agente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-950">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Ativar Agente</Label>
                <p className="text-sm text-zinc-500">Liga ou desliga o atendimento via IA no WhatsApp</p>
              </div>
              <Switch checked={isActive} onCheckedChange={handleToggle} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Instruções base</Label>
              <Textarea 
                placeholder="Você é um assistente virtual para a empresa..." 
                className="min-h-[150px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <Button onClick={handleSavePrompt} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Prompt"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
