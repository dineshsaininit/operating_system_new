/** `npm run seed` — wipe both stores and reload the synthetic dataset (dates relative to now). */
import { config } from './config.js';
import { initStores, resetAll } from './store.js';

initStores();
resetAll();
console.log(`Reseeded synthetic data in ${config.dataDir}`);
