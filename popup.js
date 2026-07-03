/* Modo Noturno Universal — popup.js */

const PADROES = {
  ativoGlobal: false,
  brilho: 100,
  contraste: 100,
  sepia: 0,
  sitesDesativados: {}
};

const $ = (id) => document.getElementById(id);

let config = { ...PADROES };
let dominioAtual = null;

// ---------- Renderização ----------

function render() {
  document.body.classList.toggle("desligado", !config.ativoGlobal);
  $("estado").textContent = config.ativoGlobal ? "Ativo" : "Desativado";
  $("chaveGlobal").checked = config.ativoGlobal;

  $("brilho").value = config.brilho;
  $("contraste").value = config.contraste;
  $("sepia").value = config.sepia;
  $("valorBrilho").textContent = config.brilho + "%";
  $("valorContraste").textContent = config.contraste + "%";
  $("valorSepia").textContent = config.sepia + "%";

  if (dominioAtual) {
    $("dominio").textContent = dominioAtual;
    $("chaveSite").checked = !config.sitesDesativados[dominioAtual];
  }
}

function salvar(parcial) {
  config = { ...config, ...parcial };
  chrome.storage.sync.set(parcial);
  render();
}

// ---------- Eventos ----------

$("lua").addEventListener("click", () => {
  salvar({ ativoGlobal: !config.ativoGlobal });
});

$("chaveGlobal").addEventListener("change", (e) => {
  salvar({ ativoGlobal: e.target.checked });
});

$("chaveSite").addEventListener("change", (e) => {
  if (!dominioAtual) return;
  const sites = { ...config.sitesDesativados };
  if (e.target.checked) delete sites[dominioAtual];
  else sites[dominioAtual] = true;
  salvar({ sitesDesativados: sites });
});

for (const chave of ["brilho", "contraste", "sepia"]) {
  $(chave).addEventListener("input", (e) => {
    salvar({ [chave]: Number(e.target.value) });
  });
}

$("redefinir").addEventListener("click", () => {
  salvar({ brilho: 100, contraste: 100, sepia: 0 });
});

// ---------- Inicialização ----------

chrome.storage.sync.get(PADROES, (salvo) => {
  config = { ...PADROES, ...salvo };

  chrome.tabs.query({ active: true, currentWindow: true }, ([aba]) => {
    if (!aba?.url || !/^https?:/.test(aba.url)) {
      $("dominio").textContent = "indisponível nesta página";
      $("chaveSite").disabled = true;
      render();
      return;
    }

    dominioAtual = new URL(aba.url).hostname;
    render();

    // Pergunta ao content script se o site foi detectado como já escuro
    chrome.tabs.sendMessage(aba.id, { tipo: "status" }, (resposta) => {
      if (chrome.runtime.lastError || !resposta) return;
      $("aviso").classList.toggle("visivel", resposta.detectadoComoEscuro);
    });
  });
});
