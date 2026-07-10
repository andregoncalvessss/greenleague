// GreenLeague — Edge Function: análise de impacto ambiental por IA (Gemini)
// ---------------------------------------------------------------------------
// Recebe a foto (URL pública) + contexto da ação e devolve uma estimativa
// "real" de CO₂ poupado (kg) e água poupada (litros), calculada pelo Gemini.
//
// Segredo necessário (NÃO fica no cliente):
//   supabase secrets set GEMINI_API_KEY=AIza...
//
// Deploy:
//   supabase functions deploy analisar-impacto
//
// A key do Gemini vem de https://aistudio.google.com/apikey (tier gratuito).

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY não configurada." }, 500);

    const {
      fotoUrl,
      acaoTitulo = "",
      acaoDescricao = "",
      descricaoUser = "",
      quantidade = 1,
      unidade = "unidades",
      co2Manual = null,
      aguaManual = null,
    } = await req.json();

    if (!fotoUrl) return json({ error: "fotoUrl em falta." }, 400);

    // 1) Descarregar a imagem e converter para base64 (inline_data do Gemini)
    const imgResp = await fetch(fotoUrl);
    if (!imgResp.ok) return json({ error: "Não foi possível ler a foto." }, 400);
    const mime = imgResp.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await imgResp.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);

    // 2) Prompt — pede uma estimativa realista e conservadora em JSON
    const prompt = `És um perito em pegada ecológica. Analisa a FOTO e o contexto de uma ação sustentável submetida por um estudante e estima o impacto ambiental REAL poupado.

Ação: "${acaoTitulo}"
Descrição da ação: "${acaoDescricao}"
Comentário do utilizador: "${descricaoUser}"
Quantidade declarada: ${quantidade} ${unidade}
Referência manual (podes ajustar): CO₂ ${co2Manual ?? "?"} kg, Água ${aguaManual ?? "?"} L

Regras:
- Baseia-te no que é VISÍVEL na foto e no contexto. Se a foto não corresponder à ação ou for insuficiente, usa uma estimativa conservadora e baixa a confiança.
- Devolve valores realistas (não inflacionados) para a quantidade indicada.
- co2_kg e agua_litros são o TOTAL poupado (não por unidade).
- justificacao: 1 frase curta em português a explicar a estimativa.
- confianca: 0 a 100 (quão fiável é a análise face à foto).`;

    const geminiBody = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mime, data: base64 } },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            co2_kg: { type: "number" },
            agua_litros: { type: "number" },
            justificacao: { type: "string" },
            confianca: { type: "number" },
          },
          required: ["co2_kg", "agua_litros", "justificacao", "confianca"],
        },
      },
    };

    const gemResp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!gemResp.ok) {
      const txt = await gemResp.text();
      return json({ error: "Falha na chamada ao Gemini.", detalhe: txt }, 502);
    }

    const gemData = await gemResp.json();
    const raw = gemData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return json({ error: "Resposta vazia do Gemini." }, 502);

    const parsed = JSON.parse(raw);
    return json({
      co2_kg: Math.max(0, Number(parsed.co2_kg) || 0),
      agua_litros: Math.max(0, Number(parsed.agua_litros) || 0),
      justificacao: String(parsed.justificacao || "").slice(0, 300),
      confianca: Math.min(100, Math.max(0, Number(parsed.confianca) || 0)),
    });
  } catch (e) {
    return json({ error: "Erro interno.", detalhe: String(e) }, 500);
  }
});
