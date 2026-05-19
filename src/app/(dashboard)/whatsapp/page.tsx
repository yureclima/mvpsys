"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Smartphone, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { connectWhatsAppInstance, logoutWhatsAppInstance, getOrCreateInstanceToken, triggerWhatsAppConnectWebhook } from "@/app/actions/uazapi";

export default function WhatsAppPage() {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [instanceNameInput, setInstanceNameInput] = useState("");
  const [connectedInfo, setConnectedInfo] = useState<{name: string, phone: string, picUrl: string} | null>(null);
  const supabase = createClient();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const INSTANCE_KEY = "mvp_instance_01"; // Hardcoded MVP instance

  useEffect(() => {
    fetchInitialStatus();
    
    // Cleanup polling on unmount
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const fetchInitialStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_instance")
        .select("status, instance_key")
        .limit(1)
        .single();
        
      if (error && error.code !== "PGRST116") throw error; // ignore not found
      
      if (data) {
        setStatus(data.status as any);
        if (data.status === "connecting" && data.instance_key) {
          // Verifica imediatamente antes de deixar em "connecting"
          try {
            const res = await connectWhatsAppInstance(data.instance_key);
            const isConnected = res.connected || res.instance?.status === "connected" || res.status?.connected;
            
            if (isConnected) {
              let phoneInstance = undefined;
              if (res.instance) {
                phoneInstance = res.instance.owner?.split("@")[0] || res.instance.name;
                setConnectedInfo({
                  name: res.instance.profileName || "WhatsApp Vinculado",
                  phone: phoneInstance || "Número Desconhecido",
                  picUrl: res.instance.profilePicUrl || "",
                });
              }
              setStatus("connected");
              await updateDbStatus("connected", data.instance_key, phoneInstance);
            } else {
              startPolling(data.instance_key);
            }
          } catch (e) {
            startPolling(data.instance_key);
          }
        } else if (data.status === "connected" && data.instance_key) {
          // Busca os dados da instancia (foto, numero) na UAZAPI
          try {
            const res = await connectWhatsAppInstance(data.instance_key);
            if (res.instance) {
              setConnectedInfo({
                name: res.instance.profileName || "WhatsApp Vinculado",
                phone: res.instance.owner?.split("@")[0] || res.instance.name || "Número Desconhecido",
                picUrl: res.instance.profilePicUrl || "",
              });
            }
          } catch (e) {
             console.error("Falha ao recuperar info da instância", e);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar status do DB", err);
    } finally {
      setLoading(false);
    }
  };

  const updateDbStatus = async (newStatus: string, instanceKey: string = INSTANCE_KEY, phoneInstance?: string) => {
    const payload: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (phoneInstance) {
      payload.phone_instance = phoneInstance;
    }
    await supabase
      .from("whatsapp_instance")
      .update(payload)
      .eq("instance_key", instanceKey);
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      setStatus("connecting");
      
      const { data: exist } = await supabase.from("whatsapp_instance").select("id").limit(1).single();
      
      // 1. Cria ou pega o Token da UAZAPI usando o Admin Token
      const instanceToken = await getOrCreateInstanceToken(INSTANCE_KEY);
      
      if (exist) {
        await supabase.from("whatsapp_instance").update({ instance_key: instanceToken, status: "connecting" }).eq("id", exist.id);
      }
      
      // 2. Conecta
      const res = await connectWhatsAppInstance(instanceToken);
      
      if (res.error) {
        throw new Error(res.error);
      }
      
      const isConnected = res.connected || res.instance?.status === "connected" || res.status?.connected;
      const qrcodeBase64 = res.instance?.qrcode || res.qrcode || res.base64;
      
      if (qrcodeBase64) {
        setQrCode(qrcodeBase64);
        startPolling(instanceToken);
      } else if (isConnected) {
        // If already connected
        let phoneInstance = undefined;
        if (res.instance) {
          phoneInstance = res.instance.owner?.split("@")[0] || res.instance.name;
          setConnectedInfo({
            name: res.instance.profileName || "WhatsApp Vinculado",
            phone: phoneInstance || "Número Desconhecido",
            picUrl: res.instance.profilePicUrl || "",
          });
        }
        setStatus("connected");
        await updateDbStatus("connected", instanceToken, phoneInstance);
        await triggerWhatsAppConnectWebhook(instanceToken, res);
      } else {
        // Still connecting, start polling to wait for QR code
        startPolling(instanceToken);
      }
    } catch (err: any) {
      toast.error("Erro ao conectar: " + err.message);
      setStatus("disconnected");
      await updateDbStatus("disconnected", INSTANCE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      stopPolling();
      const { data } = await supabase.from("whatsapp_instance").select("instance_key").limit(1).single();
      if (data?.instance_key) {
        await logoutWhatsAppInstance(data.instance_key);
        await updateDbStatus("disconnected", data.instance_key);
      }
      setStatus("disconnected");
      setQrCode(null);
      toast.success("WhatsApp desconectado.");
    } catch (err: any) {
      toast.error("Erro ao desconectar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (instanceKey: string) => {
    stopPolling(); // Evita múltiplos intervals
    pollingRef.current = setInterval(async () => {
      try {
        const res = await connectWhatsAppInstance(instanceKey);
        
        const isConnected = res.connected || res.instance?.status === "connected" || res.status?.connected;
        const qrcodeBase64 = res.instance?.qrcode || res.qrcode || res.base64;

        if (isConnected) {
          stopPolling();
          let phoneInstance = undefined;
          if (res.instance) {
            phoneInstance = res.instance.owner?.split("@")[0] || res.instance.name;
            setConnectedInfo({
              name: res.instance.profileName || "WhatsApp Vinculado",
              phone: phoneInstance || "Número Desconhecido",
              picUrl: res.instance.profilePicUrl || "",
            });
          }
          setStatus("connected");
          setQrCode(null);
          await updateDbStatus("connected", instanceKey, phoneInstance);
          toast.success("WhatsApp conectado com sucesso!");
          await triggerWhatsAppConnectWebhook(instanceKey, res);
        } else if (qrcodeBase64) {
          setQrCode(qrcodeBase64);
        }
      } catch (err) {
        console.error("Erro no polling", err);
      }
    }, 4000);
  };

  if (loading && status === "disconnected") return <div className="p-4">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp (UAZAPI)</h1>
        <p className="text-zinc-500">Gerencie a conexão do seu WhatsApp.</p>
      </div>
      
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Status da Instância</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col items-center justify-center py-6">
            
            {status === "disconnected" && (
              <>
                <div className="w-24 h-24 bg-zinc-100 rounded-lg flex items-center justify-center dark:bg-zinc-900 border">
                   <QrCode className="w-10 h-10 text-zinc-400" />
                </div>
                <div className="text-center w-full">
                    <h3 className="font-medium text-lg mb-2">Desconectado</h3>
                    <p className="text-sm text-zinc-500 mb-4">Conecte o seu WhatsApp para a IA começar a trabalhar.</p>
                </div>
                <Button className="w-full" onClick={handleConnect} disabled={loading}>
                  {loading ? "Conectando..." : "Conectar WhatsApp"}
                </Button>
              </>
            )}

            {status === "connecting" && (
              <>
                <div className="w-64 h-64 bg-zinc-100 rounded-lg flex items-center justify-center dark:bg-zinc-900 border overflow-hidden p-2">
                   {qrCode ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                   ) : (
                     <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm">Gerando QR Code...</span>
                     </div>
                   )}
                </div>
                <div className="text-center">
                    <h3 className="font-medium text-lg text-yellow-600">Aguardando Leitura...</h3>
                    <p className="text-sm text-zinc-500">Abra o WhatsApp no seu celular e aponte a câmera para o QR Code acima.</p>
                </div>
                <Button variant="outline" className="w-full" onClick={handleDisconnect}>
                  Cancelar
                </Button>
              </>
            )}

            {status === "connected" && (
              <>
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center dark:bg-emerald-950/30 overflow-hidden border border-emerald-100 dark:border-emerald-900/50">
                   {connectedInfo?.picUrl ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={connectedInfo.picUrl} alt={connectedInfo.name} className="w-full h-full object-cover" />
                   ) : (
                     <Smartphone className="w-10 h-10 text-emerald-600 dark:text-emerald-500" />
                   )}
                </div>
                <div className="text-center w-full">
                    <h3 className="font-medium text-lg text-emerald-600 dark:text-emerald-500 mb-1">
                      {connectedInfo?.name || "Conectado!"}
                    </h3>
                    <p className="text-sm text-zinc-500 mb-6">
                      {connectedInfo?.phone 
                        ? `Número: +${connectedInfo.phone}` 
                        : "Seu WhatsApp está vinculado e pronto para uso."}
                    </p>
                </div>
                <Button variant="destructive" className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none shadow-none dark:bg-red-950/30 dark:hover:bg-red-900/40" onClick={handleDisconnect} disabled={loading}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {loading ? "Desconectando..." : "Desconectar"}
                </Button>
              </>
            )}

        </CardContent>
      </Card>
    </div>
  );
}
