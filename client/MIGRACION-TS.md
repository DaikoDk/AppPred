# Preparado para migrar a TypeScript

El cliente está escrito en **JSX** (JavaScript), pero deja listo lo necesario para pasar a TypeScript archivo por archivo, sin reescribir todo ni detener el desarrollo. El sistema va a crecer en módulos y usuarios (ver ADR-019), así que estas reglas se aplican desde el primer archivo.

## Lo que ya está configurado

- `tsconfig.json` con `allowJs`, `checkJs` y `strict`. `pnpm typecheck` revisa también los `.js`/`.jsx`. Solo `noImplicitAny` está apagado para poder avanzar; se enciende cuando termine la migración (paso 5).
- `src/types/models.d.ts`: tipos del dominio (`Turno`, `FilaExtra`, `Programa`, `Conductor`, `PuntoReunion`, `Usuario`, `Formato`, `Dia`...). Reflejan la API y `docs/REGLAS-NEGOCIO.md`. **Son la fuente de verdad de las formas de datos**: si cambia la API, se cambia aquí.
- `// @ts-check` en los archivos `.js` de utilidades y API (`src/api`, `src/utils`).
- ESLint, Prettier y `react-hooks` configurados.

## Reglas para escribir JSX "listo para TS"

1. **Tipos del dominio solo desde `types/models`.** No redefinir la forma de un turno en cada componente:
   ```js
   /** @typedef {import('../../types/models').Turno} Turno */
   ```
2. **Props documentadas con JSDoc**, no con PropTypes:
   ```jsx
   /**
    * @param {{ turno: Turno, onCambiar: (t: Turno) => void }} props
    */
   export function FilaTurno({ turno, onCambiar }) { ... }
   ```
3. **Funciones puras con `@param` y `@returns`** (fechas, días, combinar con plantilla, formato). Son las más fáciles de tipar y las que más protegen las reglas de negocio.
4. **Estado con tipo explícito** cuando no se infiere:
   ```js
   const [turnos, setTurnos] = useState(/** @type {Turno[]} */ ([]));
   ```
5. **Llamadas a la API tipadas por genérico** en un solo lugar (`src/modules/<modulo>/api.js`):
   ```js
   /** @returns {Promise<{ programa: Programa }>} */
   export const obtenerPrograma = (id) => apiFetch(`/api/programa-semanal/${id}`);
   ```
6. **Sin `any` implícito nuevo:** si no sabes el tipo, usa `unknown` y estréchalo.
7. **Valores cerrados como constantes con tipo** (`DIAS`, `GRUPOS`, `MODALIDADES`), no cadenas sueltas repetidas.
8. **Un componente por archivo, exportación con nombre o por defecto, nombre en PascalCase.** Facilita renombrar `.jsx` a `.tsx`.
9. **No usar patrones difíciles de tipar:** mutar objetos de estado, props dinámicas por spread sin control, `ref` a nodos sin comprobar `null`.

## Pasos para migrar un archivo

1. Renombrar `Archivo.jsx` a `Archivo.tsx` (o `.js` a `.ts`) y actualizar sus importaciones.
2. Pasar los `@typedef`/`@param` de JSDoc a anotaciones de TypeScript. Los tipos de dominio se importan con `import type { Turno } from '../../types/models'`.
3. Ejecutar `pnpm typecheck` y corregir.
4. Commit propio por módulo: `refactor: pasar <modulo> a TypeScript`.
5. Cuando no queden `.js`/`.jsx` con lógica: activar `noImplicitAny` y quitar `allowJs`.

## Orden recomendado

1. `src/types/` y `src/utils/` (ya tipados con JSDoc).
2. `src/api/`.
3. Componentes de `components/ui`.
4. Módulos simples (Conductores, Puntos, Historial, Admin).
5. Módulos con estado complejo (Programa, Asignación, Plantilla) al final.

## Qué NO conviene tipar de golpe

- El front anterior (`app.js`) ya no existe: se reescribió a React por módulo (ADR-013) y entró tipado con JSDoc. Los módulos nuevos se escriben igual desde el primer archivo (ver `docs/MODULOS.md`).
- El backend: está fuera de este plan. Si más adelante se tipa, los tipos de `types/models.d.ts` pueden compartirse.

## Comandos

- `pnpm typecheck`: revisión de tipos (incluye JS con `checkJs`).
- `pnpm lint`: reglas de ESLint.
- `pnpm format`: Prettier.
- Antes de cada commit del cliente: `lint` y `typecheck` deben pasar.
