# SmartForge — Constitución del Proyecto

1. **Contrato Único:** El esquema OpenAPI + Zod es la única fuente de verdad; todo DTO, validación y tipo se genera o deriva de él. Código que contradiga el contrato no se mergea.
2. **Mobile-First, One-Hand:** Toda interfaz se diseña para operarse con una sola mano en pantalla ≤ 390px. Botones ≥ 48px, zonas de toque en la mitad inferior, cero scroll horizontal.
3. **Capas Estrictas:** Backend = Routes → Controllers → Services → Repositories. Ninguna capa puede saltar a otra no adyacente; la lógica de negocio vive exclusivamente en Services.
4. **Tests como Puerta de Entrada:** PR sin tests unitarios del Service afectado + test de contrato contra el esquema OpenAPI = PR rechazado. El CI debe pasar en < 3 min.
5. **Integridad Relacional:** Toda relación en PostgreSQL lleva FK explícita con `ON DELETE` definido. Eliminaciones lógicas (`deleted_at`) no eximen de FK. Migraciones sin FK = bloqueante.
6. **Idioma Dual:** Código fuente, commits y nombres de rama en inglés. Interfaz de usuario, mensajes de error visibles y documentación funcional en español.
