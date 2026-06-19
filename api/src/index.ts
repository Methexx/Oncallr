import { createApp } from "./app";

async function start() {
  const app = await createApp();

  try {
    await app.listen({
      host: app.config.host,
      port: app.config.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
