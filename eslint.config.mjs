// Nomix — configuración ESLint (flat config)
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', '**/coverage/**'],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // === Módulos de NestJS ===
  // Un `@Module` es un contenedor de metadatos: la clase existe para colgarle
  // el decorador y no tiene —ni debe tener— miembros. `no-extraneous-class`
  // marcaba como error TODOS los módulos del proyecto (auth, crypto, db,
  // auditoría) por hacer lo único que un módulo puede hacer. El override es
  // estrecho a propósito: solo `*.module.ts`, para que la regla siga cazando
  // clases-cajón de verdad en el resto del código.
  //
  // Esto NO deja el lint en verde: quedan errores previos y generalizados
  // (sobre todo `no-non-null-assertion`) en auth, crypto y colaborador, que
  // son deuda anterior a este cambio y se limpian aparte.
  {
    files: ['apps/**/*.module.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },

  // === Contramedida decimal obligatoria (ADR-010) ===
  // En el motor de cálculo y en el código de dominio de la API, la
  // aritmética monetaria pasa SIEMPRE por el tipo Money (decimal.js).
  // La primera línea de defensa es de tipos: Money no expone operadores,
  // así que `montoA + montoB` ni compila. Esta regla es el segundo cerco:
  // prohíbe literales numéricos con parte decimal, que es como se cuela
  // una tasa cableada (`x * 0.0975`). Las tasas vienen como string desde
  // la configuración de reglas (ADR-001), nunca como number en el código.
  {
    files: ['packages/payroll-engine/src/**/*.ts', 'apps/api/src/**/dominio/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[raw=/^[0-9]+\\.[0-9]+$/]',
          message:
            'Prohibido literal decimal en código monetario (ADR-010). Las tasas y montos ' +
            'vienen como string desde la configuración de reglas y pasan por Money/decimal.js. ' +
            'Nunca escribas 0.0975 como number.',
        },
      ],
    },
  },
);
