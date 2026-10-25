import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Sin eslint-plugin-react, no-unused-vars no ve el uso en JSX: los componentes
      // (Mayúscula) y `motion` (<motion.div>) cuentan como usados.
      'no-unused-vars': ['error', { varsIgnorePattern: '^([A-Z_]|motion$)', argsIgnorePattern: '^[A-Z_]' }],
      // Hook junto a su Provider: patrón deliberado.
      'react-refresh/only-export-components': ['error', { allowExportNames: ['useTheme', 'useToast'] }],
    },
  },
  {
    // Código de React Bits: `try { setPointerCapture… } catch {}` a propósito.
    files: ['src/components/bits/**'],
    rules: { 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  {
    // Generados por shadcn: exportan sus `*Variants` junto al componente.
    files: ['src/components/ui/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['vite.config.js'],
    languageOptions: { globals: globals.node },
  },
])
