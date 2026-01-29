import { beforeEach } from 'vitest';

// Reset DOM before each test
beforeEach(() => {
  document.body.innerHTML = '';
  // Reset Hydra singleton if it exists
  if (window.hydra) {
    delete window.hydra;
  }
});