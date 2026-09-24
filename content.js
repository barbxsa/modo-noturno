/* ============================================================
   Modo Noturno Universal — content.js
   Roda em document_start para evitar "flash branco".
   ============================================================ */

(() => {
  const dominio = location.hostname;

  const PADROES = {
    ativoGlobal: false,
    brilho: 100,     // %
    contraste: 100,  // %
    sepia: 0,        // %
    sitesDesativados: {} 
  };

  let config = { ...PADROES };
  let detectadoComoEscuro = false;

  // ---------- Aplicação ----------

  function aplicar() {
    const html = document.documentElement;
    const desativadoNoSite = !!config.sitesDesativados[dominio];
    const deveAtivar =
      config.ativoGlobal && !desativadoNoSite && !detectadoComoEscuro;

    if (deveAtivar) {
      html.style.setProperty("--mn-brilho", config.brilho / 100);
      html.style.setProperty("--mn-contraste", config.contraste / 100);
      html.style.setProperty("--mn-sepia", config.sepia / 100);
      html.setAttribute("data-modo-noturno", "on");
    } else {
      html.removeAttribute("data-modo-noturno");
    }
  }

  // ---------- Detecção de site já escuro ----------

  function luminancia(corCss) {
    const m = corCss.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    const [, r, g, b, a] = m;
    if (a !== undefined && parseFloat(a) === 0) return null; // transparente
    // Luminância relativa aproximada (0 = preto, 255 = branco)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function detectarSiteEscuro() {
    try {
      const corpo = document.body;
      if (!corpo) return false;

      // Preferência declarada pelo próprio site
      const esquema = getComputedStyle(document.documentElement)
        .getPropertyValue("color-scheme");
      if (esquema && esquema.includes("dark") && !esquema.includes("light")) {
        return true;
      }

      const lumBody = luminancia(getComputedStyle(corpo).backgroundColor);
      const lumHtml = luminancia(
        getComputedStyle(document.documentElement).backgroundColor
      );
      const lum = lumBody ?? lumHtml;

      // Fundo escuro (< 60 de 255) => site já é dark
      return lum !== null && lum < 60;
    } catch {
      return false;
    }
  }

  // ---------- Inicialização ----------

  chrome.storage.sync.get(PADROES, (salvo) => {
    config = { ...PADROES, ...salvo };
    aplicar(); // aplica cedo para evitar flash branco

    // Reavalia quando o body existir / carregar,
    // pois a cor de fundo real só é conhecida depois.
    const reavaliar = () => {
      const antes = detectadoComoEscuro;
      detectadoComoEscuro = detectarSiteEscuro();
      if (antes !== detectadoComoEscuro) aplicar();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", reavaliar);
    } else {
      reavaliar();
    }
    window.addEventListener("load", reavaliar);
  });

  // ---------- Sincronização com o popup ----------

  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area !== "sync") return;
    for (const chave of Object.keys(mudancas)) {
      config[chave] = mudancas[chave].newValue;
    }
    aplicar();
  });

  chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
    if (msg?.tipo === "status") {
      responder({
        dominio,
        detectadoComoEscuro,
        ativoNestaAba:
          document.documentElement.hasAttribute("data-modo-noturno")
      });
    }
    return true;
  });
})();
