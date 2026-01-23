import axios from "axios";
import fs from "fs";

const API_BASE_URL = process.env.PIZZA_API_URL || "http://localhost:3001";

export async function enviarPedidoParaApi(order) {
  try {
    const url = `${API_BASE_URL}/orders`;

    console.log(order);

    const response = await axios.post(url, order);
    console.log("Pedido enviado para API com sucesso:", response.data);

    // MVP: também logar em arquivo
    logOrderToFile(order);

    return response.data;
  } catch (err) {
    console.error("Erro ao enviar pedido para API:", err.message);
    // Mesmo em erro, log a pedido localmente
    logOrderToFile(order, true);
    throw err;
  }
}

export async function getFlavors() {
  try {
    const url = `${API_BASE_URL}/flavors`;

    const response = await axios.get(url);

    return response.data;
  } catch (err) {
    console.error("Erro ao enviar pedido para API:", err.message);
    // Mesmo em erro, log a pedido localmente
    logOrderToFile(order, true);
    throw err;
  }
}

function logOrderToFile(order, failed = false) {
  const logEntry = {
    ...order,
    failedToSend: failed,
    createdAt: new Date().toISOString(),
  };

  const file = "orders-log.json";
  let content = [];
  if (fs.existsSync(file)) {
    try {
      const txt = fs.readFileSync(file, "utf-8");
      content = JSON.parse(txt || "[]");
    } catch (e) {
      console.error("Erro ao ler orders-log.json, recriando arquivo.");
    }
  }
  content.push(logEntry);
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
}
