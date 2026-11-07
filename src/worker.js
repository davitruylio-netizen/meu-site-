
const SYSTEM_PROMPT = `
Você é a NEXORA, uma consultora empresarial especializada em
estratégia, gestão, inovação, marketing, tecnologia e operações.

Sua missão é analisar empresas e produzir diagnósticos práticos,
profissionais e estratégicos.

Responda sempre em português brasileiro.

Organize cada relatório com estas seções:

1. RESUMO EXECUTIVO
Apresente uma visão geral da empresa e do desafio informado.

2. DIAGNÓSTICO EMPRESARIAL
Analise os pontos apresentados e identifique possíveis causas.

3. PONTOS FORTES
Identifique oportunidades e vantagens competitivas informadas.

4. PONTOS DE MELHORIA
Mostre os problemas e riscos que merecem atenção.

5. OPORTUNIDADES DE CRESCIMENTO
Apresente oportunidades realistas para o negócio.

6. PLANO DE AÇÃO
Crie ações práticas, organizadas por prioridade:
- Imediatas: até 30 dias.
- Curto prazo: 31 a 90 dias.
- Médio prazo: 91 a 180 dias.

7. INDICADORES DE RESULTADO
Sugira indicadores para acompanhar a evolução.

8. CONCLUSÃO ESTRATÉGICA
Finalize com recomendações objetivas.

REGRAS IMPORTANTES:
- Não invente informações sobre a empresa.
- Diferencie fatos fornecidos de hipóteses.
- Não afirme que pesquisou informações externas se isso não ocorreu.
- Evite recomendações genéricas.
- Explique os motivos das recomendações.
- Seja profissional, claro e objetivo.
`;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function clean(value, maxLength = 1000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function createDemoReport(company) {
  return `
DIAGNÓSTICO DEMONSTRATIVO — NEXORA

EMPRESA
${company.companyName}

SEGMENTO
${company.sector}

LOCALIZAÇÃO
${company.location || "Não informada"}

1. RESUMO EXECUTIVO

A empresa atua no segmento de ${company.sector}.
Seu objetivo informado é: ${company.objective}.

Este é um relatório demonstrativo, elaborado com base
exclusivamente nas informações fornecidas.

2. DIAGNÓSTICO EMPRESARIAL

O principal desafio apresentado foi:
${company.challenge}

É necessário aprofundar a análise dos processos,
indicadores e recursos disponíveis para identificar
as causas reais desse desafio.

3. PONTOS FORTES

- A empresa possui um objetivo definido.
- Existe uma oportunidade de organizar prioridades.
- O diagnóstico pode ajudar a estruturar decisões.

4. PONTOS DE MELHORIA

- Mapear as causas do principal desafio.
- Identificar gargalos operacionais.
- Definir indicadores de acompanhamento.

5. OPORTUNIDADES DE CRESCIMENTO

Avaliar melhorias nos processos, produtividade,
experiência dos clientes e gestão de recursos.

6. PLANO DE AÇÃO

IMEDIATO — ATÉ 30 DIAS
- Levantar dados e indicadores atuais.
- Identificar as principais causas do problema.
- Definir responsáveis pelas ações prioritárias.

CURTO PRAZO — 31 A 90 DIAS
- Implementar melhorias prioritárias.
- Acompanhar resultados semanalmente.
- Corrigir desvios identificados.

MÉDIO PRAZO — 91 A 180 DIAS
- Avaliar resultados das iniciativas.
- Padronizar processos eficientes.
- Criar um plano de evolução contínua.

7. INDICADORES DE RESULTADO

- Produtividade.
- Custos operacionais.
- Satisfação dos clientes.
- Cumprimento das metas.
- Evolução do desafio principal.

8. CONCLUSÃO ESTRATÉGICA

A NEXORA recomenda aprofundar o diagnóstico com
dados reais antes de tomar decisões importantes.

IMPORTANTE:
Este é um exemplo demonstrativo. Não representa
uma análise validada ou uma pesquisa externa.
`;
}

function extractText(data) {
  if (typeof data.output_text === "string" && data.output_text) {
    return data.output_text;
  }

  const parts = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n\n");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze") {
      if (request.method !== "POST") {
        return jsonResponse(
          { error: "Método não permitido." },
          405
        );
      }

      let body;

      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { error: "Dados enviados em formato inválido." },
          400
        );
      }

      const company = {
        companyName: clean(body.companyName, 120),
        sector: clean(body.sector, 120),
        location: clean(body.location, 150),
        website: clean(body.website, 300),
        objective: clean(body.objective, 1000),
        audience: clean(body.audience, 500),
        challenge: clean(body.challenge, 1500),
        researchConsent: body.researchConsent === true
      };

      if (
        !company.companyName ||
        !company.sector ||
        !company.objective ||
        !company.challenge
      ) {
        return jsonResponse(
          { error: "Preencha todos os campos obrigatórios." },
          400
        );
      }

      // Modo demonstrativo quando a API ainda não está configurada.
      if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) {
        return jsonResponse({
          mode: "demo",
          report: createDemoReport(company)
        });
      }

      const companyInformation = `
DADOS INFORMADOS PELO USUÁRIO:

Nome da empresa: ${company.companyName}
Segmento: ${company.sector}
Localização: ${company.location || "Não informada"}
Site: ${company.website || "Não informado"}
Objetivo: ${company.objective}
Público-alvo: ${company.audience || "Não informado"}
Principal desafio: ${company.challenge}

Consentimento para pesquisa pública:
${company.researchConsent ? "SIM" : "NÃO"}

Analise somente o que estiver disponível.
Se não houver dados suficientes, deixe isso claro.
`;

      const payload = {
        model: env.OPENAI_MODEL,
        instructions: SYSTEM_PROMPT,
        input: companyInformation,
        store: false,
        max_output_tokens: 4500
      };

      // Pesquisa externa só será ativada com consentimento.
      if (company.researchConsent) {
        payload.tools = [
          { type: "web_search" }
        ];
      }

      try {
        const aiResponse = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );

        const aiData = await aiResponse.json();

        if (!aiResponse.ok) {
          return jsonResponse({
            error: "A inteligência artificial não conseguiu processar a análise.",
            details: "Verifique a configuração da API e tente novamente."
          }, 502);
        }

        const report = extractText(aiData);

        if (!report) {
          return jsonResponse({
            error: "A IA não retornou um relatório. Tente novamente."
          }, 502);
        }

        return jsonResponse({
          mode: "ai",
          report
        });

      } catch (error) {
        return jsonResponse({
          error: "Falha na comunicação com o serviço de inteligência artificial."
        }, 502);
      }
    }

    return new Response("NEXORA — Sua empresa. Novas possibilidades.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
};
