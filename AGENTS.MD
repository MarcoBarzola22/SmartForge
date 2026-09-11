# AGENTS.md — SmartForge

## Proyecto

SmartForge es una Progressive Web App (PWA) orientada al entrenamiento de fuerza e hipertrofia, impulsada por una base de datos biomecánica relacional. El sistema genera rutinas auto-periodizadas, audita fatiga/dolor articular y calcula sobrecarga progresiva.
Stack principal: React (Vite) + TS + Tailwind + React Query (Frontend) | Node.js (Express) + TS (Backend) | PostgreSQL (Base de datos) | Docker (Infraestructura).

## Comandos (Ejemplos a definir en la implementación)

- Levantar entorno local: `docker-compose up -d`
- Frontend Dev: `npm run dev --prefix frontend`
- Backend Dev: `npm run dev --prefix backend`
- Validar Contrato API: `npm run lint:openapi`
- Tests: `npm run test`
- Lint/formato: `npm run lint` y `npm run format`

## Estilo y convenciones

- Versión: Node 20+, TypeScript estricto (no `any`).
- Convenciones de nombres: `camelCase` para variables/funciones, `PascalCase` para componentes React/Clases, `snake_case` para tablas y columnas en PostgreSQL.
- Idioma: El código fuente, nombres de variables, commits y PRs deben estar en **Inglés**.
- Interfaz: La UI y los mensajes de error mostrados al usuario final deben estar en **Español**.

## Reglas

- Lee `docs/constitution.md` y el archivo `spec.md` activo antes de proponer o tocar cualquier código.
- Spec-Driven API: No se puede escribir código de backend (rutas/controladores) sin que el endpoint esté previamente definido y aprobado en el contrato OpenAPI 3.1.
- Interfaz Mobile-First: Todo componente de UI debe estar diseñado para usarse con una mano en el gimnasio (botones táctiles mínimos de 48px, alto contraste, flujos rápidos).
- No modificar el esquema de la base de datos sin actualizar primero la spec técnica y generar la migración correspondiente.

## Al terminar cualquier tarea

- Ejecutar el linter y el formateador de código.
- Verificar que la compilación de TypeScript pase sin errores (`tsc --noEmit`).
- Asegurar que los tests unitarios de la tarea implementada estén en verde.
- Marcar la tarea como completada en el archivo `tasks.md` activo.
