import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || '';
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL') || '';
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY') || '';

// Função simples para assinar JWT e obter token do Google OAuth2
async function getAccessToken(): Promise<string> {
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: tokenUrl,
    exp: now + 3600,
    iat: now,
  };

  const textEncoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header));
  const claimBase64 = btoa(JSON.stringify(claim));
  const stringToSign = `${headerBase64}.${claimBase64}`;

  const pemContents = FIREBASE_PRIVATE_KEY
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\"/g, "")
    .replace(/\s/g, "");
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    textEncoder.encode(stringToSign)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${headerBase64}.${claimBase64}.${signatureBase64}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await response.json();
  return data.access_token;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Calcular data limite (hoje + 30 dias)
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 30);
    const limitDateStr = limitDate.toISOString().split('T')[0];

    // 2. Buscar documentos vencidos ou a vencer em 30 dias
    const { data: documentos, error: docError } = await supabase
      .from('documentos')
      .select('tipo_documento, data_vencimento, funcionario_id')
      .lte('data_vencimento', limitDateStr);

    if (docError) {
      console.error("Erro ao buscar documentos:", docError);
    }

    // 3. Buscar integrações vencidas ou a vencer em 30 dias
    const { data: integracoes, error: intError } = await supabase
      .from('funcionario_integracoes')
      .select('empresa_nome, data_vencimento, funcionario_id')
      .lte('data_vencimento', limitDateStr);

    if (intError) {
      console.error("Erro ao buscar integrações:", intError);
    }

    const hasDocs = documentos && documentos.length > 0;
    const hasInts = integracoes && integracoes.length > 0;

    if (!hasDocs && !hasInts) {
      return new Response(JSON.stringify({ message: "Nenhum documento ou integração a vencer nos próximos 30 dias." }), { status: 200 });
    }

    // Coletar IDs únicos de funcionários/perfis envolvidos
    const docsFuncIds = documentos?.map(d => d.funcionario_id) || [];
    const intsFuncIds = integracoes?.map(i => i.funcionario_id) || [];
    const funcionarioIds = [...new Set([...docsFuncIds, ...intsFuncIds])].filter(Boolean);

    // Buscar nomes dos funcionários a partir da tabela user_profiles (já que a tabela funcionarios não existe no banco)
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, name')
      .in('id', funcionarioIds);

    if (profileError) {
      console.error("Erro ao buscar perfis de usuário:", profileError);
    }

    const funcionarioMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    // 4. Buscar administradores cadastrados (role = ADMIN)
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'ADMIN');

    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum administrador encontrado." }), { status: 200 });
    }

    // 5. Buscar tokens de push desses administradores
    const adminIds = admins.map(a => a.id);
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', adminIds);

    if (tokensError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum token de push encontrado para administradores." }), { status: 200 });
    }

    // Obter Token de Autenticação do Firebase
    const accessToken = await getAccessToken();

    // 6. Enviar as notificações
    const results = [];

    const sendPush = async (title: string, body: string) => {
      for (const t of tokens) {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: {
                title,
                body,
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  click_action: 'FCM_PLUGIN_ACTIVITY',
                  icon: 'fcm_push_icon'
                }
              }
            },
          }),
        });
        results.push(await res.json());
      }
    };

    // Alertas de documentos
    if (documentos) {
      for (const doc of documentos) {
        const nomeFuncionario = funcionarioMap.get(doc.funcionario_id) || 'Funcionário';
        const formattedDate = formatDate(doc.data_vencimento);
        const bodyText = `${doc.tipo_documento} - ${nomeFuncionario} - ${formattedDate}`;
        await sendPush('Alerta de Vencimento!', bodyText);
      }
    }

    // Alertas de integrações
    if (integracoes) {
      for (const int of integracoes) {
        const nomeFuncionario = funcionarioMap.get(int.funcionario_id) || 'Funcionário';
        const formattedDate = formatDate(int.data_vencimento);
        const bodyText = `Integração ${int.empresa_nome || 'Cliente'} - ${nomeFuncionario} - ${formattedDate}`;
        await sendPush('Alerta de Vencimento!', bodyText);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
