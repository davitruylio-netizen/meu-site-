
const form = document.getElementById("analysisForm");
const result = document.getElementById("result");
const resultContent = document.getElementById("resultContent");
const submitButton = document.getElementById("submitButton");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function showResult(message) {
  resultContent.textContent = message;
  result.classList.add("active");
  result.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const formData = new FormData(form);

  const companyData = {
    companyName: formData.get("companyName")?.trim(),
    sector: formData.get("sector")?.trim(),
    location: formData.get("location")?.trim(),
    website: formData.get("website")?.trim(),
    objective: formData.get("objective")?.trim(),
    audience: formData.get("audience")?.trim(),
    challenge: formData.get("challenge")?.trim(),
    researchConsent: formData.get("researchConsent") === "on"
  };

  if (!companyData.companyName ||
      !companyData.sector ||
      !companyData.objective ||
      !companyData.challenge) {
    showResult("Preencha os campos obrigatórios para continuar.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Preparando diagnóstico...";

  result.classList.add("active");
  resultContent.textContent =
    "Estamos analisando as informações da empresa. Aguarde...";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(companyData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível gerar o diagnóstico."
      );
    }

    showResult(
      data.report || "A análise foi concluída, mas não retornou conteúdo."
    );

  } catch (error) {
    showResult(
      "Não conseguimos concluir a análise.\n\n" +
      (error.message || "Verifique sua conexão e tente novamente.")
    );

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Gerar diagnóstico empresarial";
  }
});

document.getElementById("printReport")?.addEventListener("click", () => {
  window.print();
});
