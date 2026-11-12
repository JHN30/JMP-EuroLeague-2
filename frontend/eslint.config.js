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
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Under LazyMotion strict (src/lib/LazyMotionFeatures.jsx) a `motion.<tag>` component throws when it renders.
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'motion/react',
          importNames: ['motion'],
          message: 'Use `m` from motion/react; `motion` throws under LazyMotion strict and pulls every feature into the main bundle.',
        }],
      }],
    },
  },
  {
    files: ['playwright.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
