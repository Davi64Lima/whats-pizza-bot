/**
 * Ponto de entrada da aplicação
 * Responsável por inicializar e conectar todos os componentes
 */

// Repositories
import { PizzaApiRepository } from "./repositories/pizzaApiRepository.js";
import { FileStorageRepository } from "./repositories/fileStorageRepository.js";

// Services
import { SessionService } from "./services/sessionService.js";
import { MenuService } from "./services/menuService.js";
import { OrderService } from "./services/orderService.js";

// Utils
import { OrderParser } from "./utils/orderParser.js";

// Handlers
import { OrderFlowHandler } from "./handlers/orderFlowHandler.js";
import { WhatsAppHandler } from "./handlers/whatsAppHandler.js";

// API
import { ApiServer } from "./api/server.js";

/**
 * Função principal que inicializa a aplicação
 * Implementa Dependency Injection para facilitar testes e manutenção
 */
async function bootstrap() {
  // 1. Inicializa os Repositories (camada de acesso a dados)
  const pizzaApiRepository = new PizzaApiRepository();
  const fileStorageRepository = new FileStorageRepository();

  // 2. Inicializa os Services (camada de lógica de negócio)
  const sessionService = new SessionService();
  const menuService = new MenuService(pizzaApiRepository);
  const orderService = new OrderService(
    pizzaApiRepository,
    fileStorageRepository,
  );

  // 3. Inicializa os Utils
  const orderParser = new OrderParser(menuService);

  // 4. Inicializa os Handlers
  const orderFlowHandler = new OrderFlowHandler(
    sessionService,
    menuService,
    orderService,
    orderParser,
  );

  const whatsAppHandler = new WhatsAppHandler(orderFlowHandler);

  // 5. Inicializa a API REST
  const apiServer = new ApiServer(whatsAppHandler, orderFlowHandler);

  // 6. Inicia a aplicação
  await whatsAppHandler.initialize();
  await apiServer.start();

  console.log("✓ Aplicação inicializada com sucesso!");
  console.log("✓ Arquitetura em camadas configurada:");
  console.log("  - Repositories: PizzaApi, FileStorage");
  console.log("  - Services: Session, Menu, Order");
  console.log("  - Handlers: OrderFlow, WhatsApp");
  console.log("  - API: REST Server");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n✓ Encerrando aplicação...");
    await apiServer.stop();
    process.exit(0);
  });
}

// Inicia a aplicação
bootstrap();
