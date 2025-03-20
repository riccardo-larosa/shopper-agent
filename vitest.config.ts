import { defineConfig, defaultExclude } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      ...defaultExclude,
      'test/openapi.test.ts',
      'test/openapi.tools.test.ts'
    ]
  }
})
