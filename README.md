# Estação de Monitoramento IoT — Grupo 2 (Turma 2TSD2)

Dashboard web que recebe, em tempo real, os dados de um ESP32 (temperatura, umidade e qualidade do ar) via MQTT sobre WebSockets.

**Projeto IOT SESI SENAI Valinhos Grupo 2**

## Integrantes
Felipe Antunes Campos, Gustavo Alves, Matheus Leitão, Vinicius Bertunho e Ana Julia

## Arquivos
- `index.html`, `index.css`, `index.js` — página web (SPA com 2 abas)
- `imagens/` — fotos do projeto

## Como rodar
1. Ligue o Mosquitto com os listeners 1883 (MQTT) e 9001 (WebSockets).
2. Abra `index.html` no navegador do PC que roda o broker (ou use a extensão Live Server do VS Code).
3. Ajuste `CONFIG.host` em `index.js` se o broker estiver em outro IP.
