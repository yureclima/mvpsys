"use server";

export async function getOrCreateInstanceToken(instanceName: string): Promise<string> {
  const baseUrl = process.env.UAZAPI_BASE_URL;
  const adminToken = process.env.UAZAPI_API_KEY; // Em nosso caso, UAZAPI_API_KEY é o Admin Token

  if (!baseUrl || !adminToken) {
    throw new Error("Configuração da UAZAPI ausente.");
  }

  // 1. Verifica se a instância já existe
  const fetchRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
    method: "GET",
    headers: {
      admintoken: adminToken,
    },
  });

  if (fetchRes.ok) {
    const fetchData = await fetchRes.json();
    if (fetchData && Array.isArray(fetchData)) {
      const existing = fetchData.find((inst: any) => inst.instance?.instanceName === instanceName);
      if (existing && existing.instance?.token) {
        return existing.instance.token;
      }
    }
  }

  // 2. Cria a instância via UAZAPI caso não exista
  const response = await fetch(`${baseUrl}/instance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      admintoken: adminToken,
    },
    body: JSON.stringify({ Name: instanceName }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("UAZAPI Create Error:", response.status, errText);
    throw new Error(`Falha ao criar instância: ${errText}`);
  }

  const data = await response.json();
  return data.token || data.hash?.token || data.instance?.token;
}

export async function connectWhatsAppInstance(instanceToken: string) {
  const baseUrl = process.env.UAZAPI_BASE_URL;

  if (!baseUrl || !instanceToken) {
    return { error: "Configuração da UAZAPI ausente ou Token não informado." };
  }

  // Faz POST para conectar a instância, usando o header 'token'
  const response = await fetch(`${baseUrl}/instance/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: instanceToken,
    },
    body: JSON.stringify({
      browser: "auto",
      systemName: "proagency",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("UAZAPI Connect Error:", response.status, errText);
    return { error: `Token inválido ou falha na UAZAPI. (Status: ${response.status})` };
  }

  const data = await response.json();
  return data;
}

export async function logoutWhatsAppInstance(instanceToken: string) {
  const baseUrl = process.env.UAZAPI_BASE_URL;

  const response = await fetch(`${baseUrl}/instance/disconnect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: instanceToken,
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao desconectar");
  }

  return await response.json();
}

export async function triggerWhatsAppConnectWebhook(instanceToken: string, uazapiResponse: any) {
  const webhookUrl = "https://webhook.proagency.site/webhook/90efe872-f714-457e-818e-8cd951af249a";
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "whatsapp.connected",
        token: instanceToken,
        uazapi_response: uazapiResponse,
      }),
    });
    return { success: response.ok };
  } catch (error: any) {
    console.error("Error triggering WhatsApp connect webhook:", error);
    return { error: error.message };
  }
}
