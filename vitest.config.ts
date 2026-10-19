import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // The first run may download a MongoDB binary (mongodb-memory-server), which is slow.
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
})
