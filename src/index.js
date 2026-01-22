import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import { handleIncomingMessage } from "./orderFlow.js";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("QR RECEIVED, escaneie com o WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Bot do WhatsApp está pronto!");
});

client.on("message", async (message) => {
  try {
    const from = message.from;
    const phone = from.split("@")[0];
    const text = (message.body || "").trim();

    console.log(`Mensagem recebida de ${phone}: ${text}`);

    if (from.includes("@g.us")) return;

    const reply = await handleIncomingMessage({ phone, text });

    if (reply) {
      try {
        await client.sendMessage(from, reply);
      } catch (sendError) {
        console.error("Erro ao enviar mensagem:", sendError.message);
        // Tenta reenviar após um delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await client.sendMessage(from, reply);
      }
    }
  } catch (err) {
    console.error("Erro ao processar mensagem:", err.message);
  }
});

client.initialize();
