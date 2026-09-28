/* =========================================================
   Estação de Monitoramento IoT — Dashboard Web
   ========================================================= */

/* ---------- CONFIGURAÇÃO (ajuste aqui) ---------- */
const CONFIG = {
  // IP do PC onde o Mosquitto roda. Se a página abrir no mesmo PC, "localhost" funciona.
  // Se abrir por outro dispositivo, use o IP do PC (ex.: "192.168.0.10").
  host: window.location.hostname || "localhost",
  porta: 9001,               // WebSockets no mosquitto.conf
  usuario: "grupo",          // só é enviado se houver senha salva
  chaveSenha: "iot_senha_grupo",
};

/* Tópicos usados no ESP32 (troque se os seus forem diferentes) */
const TOPICOS = {
  "aulas/professor/temperatura":  { id: "temperatura",  limite: 28,  casas: 1, max: 50 },
  "aulas/professor/umidade":      { id: "umidade",      limite: 56,  casas: 0, max: 100 },
  "aulas/professor/qualidade_ar": { id: "qualidade_ar", limite: 400, casas: 0, max: 1000 },
};

/* ---------- Navegação por abas (SPA) ---------- */
const botoesAba = document.querySelectorAll(".menu__aba");
const abas = document.querySelectorAll(".aba");

function mostrarAba(nome) {
  abas.forEach((a) => a.classList.toggle("ativa", a.id === "aba-" + nome));
  botoesAba.forEach((b) => {
    const ativa = b.dataset.aba === nome;
    b.classList.toggle("ativa", ativa);
    if (ativa) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0 });
}

botoesAba.forEach((b) => b.addEventListener("click", () => mostrarAba(b.dataset.aba)));

/* ---------- Senha do grupo no localStorage ---------- */
const formSenha = document.getElementById("form-senha");
const campoSenha = document.getElementById("senha");
const msgSenha = document.getElementById("senha-msg");

function lerSenha() {
  try { return localStorage.getItem(CONFIG.chaveSenha) || ""; }
  catch (e) { return ""; }
}

campoSenha.value = lerSenha();
if (campoSenha.value) msgSenha.textContent = "Senha carregada do navegador.";

formSenha.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const senha = campoSenha.value.trim();
  try {
    if (senha) {
      localStorage.setItem(CONFIG.chaveSenha, senha);
      msgSenha.textContent = "Senha salva. Reconectando...";
    } else {
      localStorage.removeItem(CONFIG.chaveSenha);
      msgSenha.textContent = "Senha removida.";
    }
  } catch (e) {
    msgSenha.textContent = "Não foi possível salvar neste navegador.";
    return;
  }
  reconectar();
});

/* ---------- Status de conexão ---------- */
const elStatus = document.getElementById("status");
const elStatusTexto = document.getElementById("status-texto");

function definirStatus(conectado) {
  elStatus.classList.toggle("conectado", conectado);
  elStatus.classList.toggle("desconectado", !conectado);
  elStatusTexto.textContent = conectado ? "Conectado" : "Desconectado";
}

/* ---------- Marcas de limite nas barras ---------- */
Object.values(TOPICOS).forEach((c) => {
  document.getElementById("m-" + c.id).style.left = (c.limite / c.max) * 100 + "%";
});

/* ---------- Mini-gráfico (últimas 30 leituras) ---------- */
const historico = {};
function desenharGrafico(id, dados, max) {
  const n = Math.max(dados.length - 1, 1);
  const pontos = dados
    .map((v, i) => (i / n) * 100 + "," + (28 - Math.min(v / max, 1) * 26))
    .join(" ");
  document.getElementById("s-" + id).setAttribute("points", pontos);
}

/* ---------- Atualização dos cartões ---------- */
function atualizarCard(topico, texto) {
  const cfg = TOPICOS[topico];
  if (!cfg) return;

  const valor = parseFloat(String(texto).replace(",", "."));
  if (Number.isNaN(valor)) return;

  const elValor = document.getElementById("v-" + cfg.id);
  const elEstado = document.getElementById("e-" + cfg.id);
  const card = document.getElementById("card-" + cfg.id);
  const emAlerta = valor > cfg.limite;

  elValor.textContent = valor.toFixed(cfg.casas);
  elEstado.textContent = emAlerta ? "ALERTA: acima do limite" : "Normal";
  card.classList.toggle("alerta", emAlerta);
  card.classList.toggle("normal", !emAlerta);

  // barra de nível e mini-gráfico
  const pct = Math.min(100, Math.max(0, (valor / cfg.max) * 100));
  document.getElementById("b-" + cfg.id).style.width = pct + "%";
  const hist = (historico[cfg.id] = historico[cfg.id] || []);
  hist.push(valor);
  if (hist.length > 30) hist.shift();
  desenharGrafico(cfg.id, hist, cfg.max);

  document.getElementById("ultima").textContent = new Date().toLocaleTimeString("pt-BR");
}

/* ---------- MQTT via WebSockets (Paho) ---------- */
let cliente = null;
let tentativa = null;

function novoClientId() {
  return "web_" + Math.random().toString(16).slice(2, 10);
}

function conectar() {
  clearTimeout(tentativa);
  cliente = new Paho.MQTT.Client(CONFIG.host, CONFIG.porta, novoClientId());

  cliente.onConnectionLost = () => {
    definirStatus(false);
    tentativa = setTimeout(conectar, 3000); // tenta de novo
  };

  cliente.onMessageArrived = (msg) => {
    atualizarCard(msg.destinationName, msg.payloadString);
  };

  const opcoes = {
    timeout: 5,
    keepAliveInterval: 30,
    cleanSession: true,
    onSuccess: () => {
      definirStatus(true);
      Object.keys(TOPICOS).forEach((t) => cliente.subscribe(t));
    },
    onFailure: () => {
      definirStatus(false);
      tentativa = setTimeout(conectar, 3000);
    },
  };

  const senha = lerSenha();
  if (senha) {
    opcoes.userName = CONFIG.usuario;
    opcoes.password = senha;
  }

  cliente.connect(opcoes);
}

function reconectar() {
  clearTimeout(tentativa);
  try {
    if (cliente && cliente.isConnected()) {
      cliente.onConnectionLost = () => {};
      cliente.disconnect();
    }
  } catch (e) { /* ignora */ }
  definirStatus(false);
  conectar();
}

definirStatus(false);
conectar();
