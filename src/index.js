import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import { handleIncomingMessage } from "./orderFlow.js";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
});

client.on("qr", (qr) => {
  console.log("QR RECEIVED, escaneie com o WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Bot do WhatsApp está pronto!");
  console.log("Versão do client:", client.info);
});

client.on("message", async (message) => {
  try {
    if (message._data.id.fromMe || !message.from.endsWith("@c.us")) {
      return;
    }

    if (message.type === "location") {
      const fullDescription = message.location.description || "";
      const lines = fullDescription.split("\n");
      message.body =
        lines.length > 1 ? lines.slice(1).join("\n") : fullDescription;
    }

    const from = message.from;
    const phone = from.split("@")[0];
    const text = (message.body || "").trim();

    if (from !== `557185350004@c.us`) {
      return;
    }

    const reply = await handleIncomingMessage({ phone, text });

    if (reply) {
      try {
        await client.pupPage.evaluate(
          async ({ chatId, message }) => {
            const chat = window.Store.Chat.get(chatId);
            if (!chat) throw new Error("Chat não encontrado");

            return await window.WWebJS.sendMessage(chat, message, {
              linkPreview: false,
            });
          },
          { chatId: from, message: reply },
        );
      } catch (sendError) {
        console.error("✗ Erro ao enviar mensagem:", sendError.message);
        console.error("Stack trace:", sendError.stack);
      }
    } else {
      console.log("Nenhuma resposta gerada");
    }
  } catch (err) {
    console.error("✗ Erro ao processar mensagem:", err.message);
    console.error("Stack trace:", err.stack);
  }
});

client.on("disconnected", (reason) => {
  console.log("Cliente desconectado:", reason);
});

client.on("auth_failure", (msg) => {
  console.error("Falha na autenticação:", msg);
});

console.log("Inicializando cliente...");
client.initialize();
