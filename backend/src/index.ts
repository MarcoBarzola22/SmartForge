import { createApp } from './app.js';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`SmartForge backend listening on port ${port}`);
});
