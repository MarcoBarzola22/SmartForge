# SPEC-001 — SmartForge MVP

## 1. Contexto y objetivo

SmartForge es una PWA de entrenamiento de fuerza e hipertrofia que actúa como un entrenador personal digital. El MVP entrega tres capacidades nucleares:

1. **Generación inteligente de rutinas auto-periodizadas** a partir del perfil, objetivo y disponibilidad del usuario.
2. **Auditoría de fatiga y dolor articular** con reporte pre-sesión y por ejercicio, cuyo resultado ajusta la planificación futura.
3. **Sobrecarga progresiva basada en evidencia**, calculada a partir del registro de peso, repeticiones y RIR (Reps in Reserve) de cada serie.

El sistema debe sentirse como un entrenador personal: genera, adapta, sugiere alternativas y reacciona ante señales de fatiga o fallo.

---

## 2. Usuarios

| Rol                          | Descripción                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Atleta**                   | Usuario final que entrena. Registra sesiones, reporta fatiga/dolor, acepta o modifica rutinas. Opera la app con una sola mano en el gimnasio. |
| **Administrador** _(futuro)_ | Gestiona el catálogo de ejercicios y parámetros del sistema. Fuera de alcance del MVP.                                                        |

---

## 3. Historias de usuario

| ID    | Historia                                                                                                                                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HU-01 | Como atleta, quiero registrarme con mi cuenta de Google y crear mi perfil para que el sistema conozca mi nivel, objetivo y disponibilidad.                                                                 |
| HU-02 | Como atleta, quiero que el sistema genere un mesociclo completo (4–8 semanas) con ejercicios, series, repeticiones y carga estimada para no tener que diseñar mi rutina.                                   |
| HU-03 | Como atleta, quiero proponer cambios a los ejercicios sugeridos y ver alternativas equivalentes para adaptar la rutina a mi gusto o equipamiento.                                                          |
| HU-04 | Como atleta, quiero completar un check-in de fatiga y dolor articular (con intensidad) antes de entrenar para que el sistema lo considere en mi planificación futura.                                      |
| HU-05 | Como atleta, quiero ver las repeticiones objetivo que propone el sistema y registrar peso, repeticiones completadas y RIR de cada serie para que el sistema calcule mi progresión.                         |
| HU-06 | Como atleta, quiero reportar molestia articular después de un ejercicio para que el sistema ajuste las sesiones futuras.                                                                                   |
| HU-07 | Como atleta, quiero que el sistema calcule automáticamente la carga de mi próxima sesión basándose en mi rendimiento previo.                                                                               |
| HU-08 | Como atleta, quiero que cuando fallo un objetivo de reps, el sistema decida si reducir carga, mantener o proponer un deload basándose en criterios de entrenamiento con evidencia.                         |
| HU-09 | Como atleta, quiero ver un video demostrativo de cada ejercicio para asegurarme de ejecutarlo correctamente.                                                                                               |
| HU-10 | Como atleta, quiero que cada 4–8 semanas el sistema renueve los ejercicios de mi rutina y me programe una semana de descarga antes del cambio, para evitar estancamiento y prevenir acumulación de fatiga. |

---

## 4. Requisitos funcionales

### RF-01 — Registro y perfil de atleta

**Cuando** el usuario accede por primera vez, **el sistema debe** autenticarlo mediante OAuth con Google y luego solicitar la creación de su perfil: nombre, edad (mínimo 16 años; el sistema rechaza edades menores), peso corporal (kg), experiencia de entrenamiento (principiante / intermedio / avanzado), objetivo principal (hipertrofia / fuerza / mixto), días disponibles por semana (1–7) y equipamiento accesible (selección múltiple de una taxonomía cerrada).

**Taxonomía de equipamiento:**
Barra olímpica, mancuernas, kettlebell, barra EZ, barra trampa (hex bar), rack/jaula de potencia, banco plano, banco inclinable, polea alta, polea baja, máquina Smith, prensa de piernas, máquina de poleas (cable crossover), banda elástica, TRX/suspensión, barra de dominadas, paralelas/dip station, step/cajón, rueda abdominal, sin equipamiento (peso corporal).

**Criterios de aceptación:**

- CA-01.1: La autenticación se realiza exclusivamente mediante OAuth con Google.
- CA-01.2: Tras el primer login, el sistema redirige al formulario de perfil; todos los campos son obligatorios.
- CA-01.3: No pueden existir dos cuentas con el mismo email de Google.
- CA-01.4: El equipamiento se selecciona de la taxonomía cerrada definida; no se admite texto libre.
- CA-01.5: El perfil se puede editar después del registro. Los cambios de equipamiento y días disponibles se aplican a partir del siguiente mesociclo (ver RF-10). Los cambios de objetivo generan un nuevo mesociclo completo de N semanas (el mesociclo anterior se archiva y el historial de carga se preserva para la progresión).

---

### RF-02 — Generación inteligente de rutinas (mesociclo completo)

**Cuando** el atleta solicita una nueva rutina (o es su primer ingreso tras completar el perfil), **el sistema debe** generar un mesociclo completo de N semanas (donde N = 4–8, determinado por RF-10) distribuyendo para cada sesión: ejercicios, series, repeticiones objetivo y carga estimada, respetando el objetivo del usuario, sus días disponibles, su nivel de experiencia y el equipamiento declarado.

**Criterios de aceptación:**

- CA-02.1: La rutina generada cubre todos los patrones de movimiento principales (empuje, tirón, rodilla-dominante, cadera-dominante, core) de forma balanceada según el objetivo.
- CA-02.2: Solo se asignan ejercicios cuyo equipamiento necesario esté incluido en la selección del atleta (cruce contra taxonomía de RF-01), o ejercicios de peso corporal (sin equipamiento). Si el atleta solo tiene "sin equipamiento", el sistema genera la rutina exclusivamente con ejercicios de peso corporal; si el volumen mínimo del nivel no se alcanza con los ejercicios disponibles, el sistema ajusta al máximo posible y muestra un aviso: "Volumen limitado por el equipamiento disponible".
- CA-02.3: El volumen semanal (series por grupo muscular) respeta los siguientes rangos por nivel: principiante 10–14 series/músculo/semana, intermedio 14–20, avanzado 18–24. Estos rangos se basan en las recomendaciones de Schoenfeld et al. y pueden ajustarse con evidencia posterior.
- CA-02.4: El mesociclo incluye periodización seleccionada según el objetivo del atleta: **lineal** para fuerza (incremento progresivo de intensidad, volumen estable o decreciente), **ondulante** para hipertrofia y mixto (variación de volumen e intensidad entre sesiones o semanas). Las semanas progresan en volumen y/o intensidad, excepto la última semana que es de descarga (ver RF-10).
- CA-02.5: Para atletas sin historial previo (primer mesociclo), la carga inicial se estima a partir del peso corporal y nivel de experiencia. Cada ejercicio del catálogo tiene un campo `initial_load_ratio` (ratio × peso corporal) que el sistema usa para estimar la carga. Para ejercicios sin ratio definido, se aplican los siguientes ratios por defecto:

| Patrón / Tipo                                | Principiante | Intermedio | Avanzado |
| -------------------------------------------- | ------------ | ---------- | -------- |
| Empuje compuesto (ej: press banca)           | 0.50×        | 0.75×      | 1.00×    |
| Tirón compuesto (ej: remo con barra)         | 0.40×        | 0.60×      | 0.80×    |
| Rodilla-dominante compuesto (ej: sentadilla) | 0.50×        | 0.80×      | 1.20×    |
| Cadera-dominante compuesto (ej: peso muerto) | 0.60×        | 0.90×      | 1.30×    |
| Core / monoarticular                         | 0.10×        | 0.15×      | 0.20×    |
| Peso corporal (sin carga externa)            | 0 kg         | 0 kg       | 0 kg     |

---

### RF-03 — Edición de rutina y ejercicios alternativos

**Cuando** el atleta visualiza la rutina generada, **el sistema debe** permitirle solicitar el reemplazo de cualquier ejercicio y presentar alternativas que trabajen el mismo músculo primario y patrón de movimiento, filtradas por el equipamiento disponible del atleta.

**Criterios de aceptación:**

- CA-03.1: El sistema presenta alternativas del catálogo (ver CA-09.2) filtradas por el equipamiento del atleta. Si tras filtrar quedan menos de 2 alternativas, se muestran todas las disponibles (puede ser 1 o 0).
- CA-03.2: Si no existe ninguna alternativa compatible con el equipamiento, el sistema muestra el mensaje "No se encontró alternativa con tu equipamiento" y permite omitir el ejercicio.
- CA-03.3: El usuario puede aceptar la rutina modificada o seguir editando sin límite de cambios.
- CA-03.4: El motivo del cambio se registra (falta de equipamiento, preferencia personal, molestia articular) para mejorar futuras generaciones y la rotación de RF-10.

---

### RF-04 — Check-in pre-sesión (fatiga y dolor)

**Cuando** el atleta inicia una sesión de entrenamiento, **el sistema debe** presentar un formulario de check-in que capture: nivel de fatiga general (escala 1–5) y articulaciones con dolor o molestia, incluyendo la intensidad de cada una (leve / moderada / severa).

**Criterios de aceptación:**

- CA-04.1: El check-in es obligatorio antes de comenzar el registro de series. El check-in funciona completamente offline.
- CA-04.2: La lista de articulaciones incluye como mínimo: hombro, codo, muñeca, columna lumbar, cadera, rodilla, tobillo — bilateral (izquierda/derecha).
- CA-04.3: Para cada articulación seleccionada, el atleta debe indicar la intensidad: leve, moderada o severa.
- CA-04.4: El dato de fatiga y dolor (con intensidad) se almacena vinculado a la sesión y al atleta con fecha y hora.

---

### RF-05 — Registro de series en vivo

**Cuando** el atleta ejecuta una serie, **el sistema debe** mostrar las repeticiones objetivo propuestas por el sistema para esa serie y permitirle registrar: peso utilizado (kg), repeticiones completadas y RIR (Reps in Reserve, escala 0–5).

**Criterios de aceptación:**

- CA-05.1: Cada serie muestra de forma visible las repeticiones objetivo que el sistema propone antes de que el atleta registre.
- CA-05.2: La interfaz permite registrar una serie en ≤ 4 toques: peso → reps → RIR → confirmar. Los campos de peso y reps vienen pre-cargados con los valores sugeridos por el sistema; si el atleta acepta los valores pre-cargados, basta con 1 toque (confirmar).
- CA-05.3: El sistema pre-carga el peso sugerido (basado en progresión o serie anterior) y las reps objetivo. Ambos son editables.
- CA-05.4: El usuario puede eliminar o editar una serie ya registrada dentro de la misma sesión.
- CA-05.5: El peso acepta incrementos de 0.5 kg. El valor mínimo es 0 kg (para ejercicios a peso corporal como dominadas, fondos, planchas, etc.).
- CA-05.6: El registro de series funciona completamente offline (ver RNF-03).

---

### RF-06 — Reporte de molestia por ejercicio

**Cuando** el atleta finaliza las series de un ejercicio, **el sistema debe** ofrecer la opción de reportar molestia articular asociada a ese ejercicio específico.

**Criterios de aceptación:**

- CA-06.1: El reporte es opcional (el atleta puede saltarlo si no tiene molestia).
- CA-06.2: Se captura: articulación afectada (misma lista de RF-04), intensidad de la molestia (leve / moderada / severa).
- CA-06.3: El dato se almacena vinculado al ejercicio, la sesión y el atleta.

---

### RF-07 — Sobrecarga progresiva automática

**Mientras** el atleta tiene al menos una sesión previa registrada para un ejercicio, **el sistema debe** calcular la carga, repeticiones y series de la próxima sesión aplicando reglas de progresión basadas en evidencia (modelo de doble progresión).

**Reglas de progresión por nivel:**

| Parámetro                          | Principiante | Intermedio | Avanzado               |
| ---------------------------------- | ------------ | ---------- | ---------------------- |
| Sesiones exitosas para subir carga | 1            | 2          | 3                      |
| Incremento compuestos              | +5 kg        | +2.5 kg    | +2.5 kg                |
| Incremento monoarticulares         | +2.5 kg      | +1.25 kg   | +1.25 kg (mín. 0.5 kg) |
| Ventana de análisis (fallo)        | 3 sesiones   | 3 sesiones | 3 sesiones             |

- **Doble progresión:** si no se puede incrementar carga (ej: no hay disco más pequeño), el sistema incrementa repeticiones dentro del rango objetivo antes de subir peso.

**Criterios de aceptación:**

- CA-07.1: Cuando el atleta completó todas las reps objetivo con RIR ≥ 2 en todas las series en las últimas N sesiones consecutivas del ejercicio (donde N depende del nivel según la tabla anterior), el sistema incrementa la carga según el nivel.
- CA-07.2: Cuando el atleta no completó las reps objetivo en al menos una serie, el sistema evalúa las últimas 3 sesiones: fallo en 1 sesión → mantiene carga; fallo en 2 sesiones → reduce carga un 5%; fallo en 3 sesiones consecutivas → propone deload del ejercicio (reducción ≥ 10%).
- CA-07.3: El atleta puede ver la lógica de la sugerencia ("Se aumenta carga porque completaste 3×10@60kg con RIR 2+ en la última sesión" para principiante, o "…en las últimas 2 sesiones" para intermedio).

---

### RF-08 — Ajuste de planificación por fatiga y dolor

**Mientras** existan reportes de fatiga o dolor articular en las últimas 3 sesiones del atleta, **el sistema debe** ajustar la planificación futura según las reglas de severidad. Los ajustes se aplican siempre a partir de la **próxima sesión**, nunca a la sesión en curso. Cuando existen múltiples reportes de la misma articulación con distinta intensidad dentro de la ventana de 3 sesiones, **prevalece la intensidad más severa reportada** en la ventana.

**Criterios de aceptación:**

- CA-08.1: Dolor severo en una articulación (reportado en RF-04 o RF-06) → el sistema excluye ejercicios cuya articulación principal sea la afectada y propone alternativas que no la involucren.
- CA-08.2: Dolor moderado → el sistema reduce volumen (series): primer reporte moderado en la ventana → reducción del 30%; reportes moderados sostenidos en 2+ sesiones → reducción del 50%.
- CA-08.3: Dolor leve → se registra sin ajuste automático, pero se marca como dato de seguimiento.
- CA-08.4: Fatiga general alta (≥ 4/5) sostenida por 2+ sesiones consecutivas → el sistema propone un deload reactivo (ver regla de precedencia en RF-10).
- CA-08.5: Si todos los ejercicios de un patrón de movimiento completo quedan excluidos por dolor (ej: dolor severo bilateral en rodillas elimina todo rodilla-dominante), el sistema reduce la sesión a los patrones disponibles y muestra un aviso: "Sesión reducida: se excluyó [patrón] por dolor articular reportado".
- CA-08.6: Los ajustes son visibles para el atleta con una explicación del motivo.

---

### RF-09 — Catálogo de ejercicios con metadatos biomecánicos

**El sistema debe** contener un catálogo precargado de al menos 200 ejercicios, cada uno con: nombre (español), músculo primario, músculos secundarios, articulación principal, patrón de movimiento (empuje / tirón / rodilla-dominante / cadera-dominante / core), tipo de ejercicio (compuesto / monoarticular), equipamiento necesario (de la taxonomía de RF-01, o "sin equipamiento" para peso corporal), ratio de carga inicial (`initial_load_ratio`, opcional) y enlace a video demostrativo en YouTube.

**Nota sobre terminología:** El campo `patrón de movimiento` clasifica el gesto biomecánico (empuje, tirón, etc.). El campo `tipo de ejercicio` clasifica la cantidad de articulaciones involucradas: **compuesto** (multi-articular: sentadilla, press banca) vs. **monoarticular** (una articulación: curl de bíceps, extensión de tríceps). Se usa "monoarticular" en lugar de "aislamiento" para evitar confusión con el patrón de movimiento.

**Criterios de aceptación:**

- CA-09.1: Cada ejercicio tiene todos los metadatos obligatorios completos.
- CA-09.2: A nivel de catálogo, cada ejercicio tiene al menos 2 alternativas vinculadas (mismo músculo primario + mismo patrón). Este requisito es independiente del equipamiento del usuario (la disponibilidad filtrada para un usuario concreto la gestiona RF-03).
- CA-09.3: El enlace de video apunta a YouTube y es accesible. Si un video deja de estar disponible, el sistema muestra "Video no disponible" con el nombre del ejercicio para búsqueda manual. El video no es bloqueante para el uso del ejercicio.
- CA-09.4: El catálogo es extensible sin cambios en el código (inserción en base de datos).

---

### RF-10 — Gestión de mesociclo y rotación de ejercicios

**Cuando** el atleta completa un mesociclo de entre 4 y 8 semanas, **el sistema debe** renovar los ejercicios accesorios de la rutina manteniendo el balance muscular y los patrones de movimiento. La última semana del mesociclo es siempre una semana de descarga (deload) programada.

**Reglas de duración del mesociclo:**

- Principiante: 4 semanas (3 de trabajo + 1 deload).
- Intermedio: 6 semanas (5 de trabajo + 1 deload).
- Avanzado: 8 semanas (7 de trabajo + 1 deload).
- Si durante el mesociclo se activa un deload reactivo (CA-08.4), ese deload cuenta como la semana de descarga del ciclo y el mesociclo se acorta; no se acumulan dos deloads consecutivos.

**Reglas de rotación:**

- Los ejercicios compuestos principales (sentadilla, press banca, peso muerto y sus variantes directas) se mantienen entre mesociclos para preservar la progresión de carga.
- Los ejercicios accesorios y monoarticulares se rotan por variantes del mismo patrón/músculo.
- Los ejercicios que el atleta marcó con "preferencia personal" como motivo de cambio (RF-03 CA-03.4) no se rotan de vuelta al ejercicio original.
- Al rotar, el sistema verifica el historial de dolor articular de las últimas 3 sesiones (RF-08): no se asigna un ejercicio cuya articulación principal tenga reportes de dolor moderado o severo activos.

**Criterios de aceptación:**

- CA-10.1: La duración del mesociclo sigue las reglas por nivel definidas arriba.
- CA-10.2: La última semana del mesociclo es automáticamente una semana de descarga con reducción de volumen (−40%) y/o intensidad (−10% carga).
- CA-10.3: Al iniciar un nuevo mesociclo, el sistema rota los ejercicios accesorios según las reglas de rotación, incluyendo la verificación contra historial de dolor.
- CA-10.4: Los ejercicios nuevos respetan el equipamiento y las preferencias previas del atleta.
- CA-10.5: El atleta ve un aviso in-app (banner al abrir la sesión) indicando que se inicia un nuevo mesociclo, con resumen de los cambios. Esto NO es una notificación push (fuera del MVP).

---

## 5. Requisitos no funcionales

| ID     | Requisito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | La interfaz debe ser operativa con una sola mano en pantalla ≤ 390px. Cero scroll horizontal en cualquier vista (Constitución §2).                                                                                                                                                                                                                                                                                                                                                                                                                 |
| RNF-02 | Botones y zonas de toque ≥ 48px, ubicados en la mitad inferior de la pantalla.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| RNF-03 | La app debe funcionar offline para: visualización de la rutina del día, check-in pre-sesión, y registro de series. Los datos se almacenan localmente y se sincronizan al recuperar red. Política de conflictos: en caso de datos divergentes entre dispositivos, gana la escritura con timestamp más reciente (last-write-wins por registro). Si el token de OAuth expira durante el uso offline, los datos se preservan localmente; al recuperar red, el sistema solicita re-autenticación antes de sincronizar, sin pérdida de datos pendientes. |
| RNF-04 | El tiempo de respuesta para generar un mesociclo completo debe ser ≤ 5 segundos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| RNF-05 | Los mensajes, labels y textos de interfaz deben estar en español (Constitución §6).                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RNF-06 | Los datos del atleta son privados; un atleta no puede ver datos de otro.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| RNF-07 | Todo endpoint y DTO se define primero en el esquema OpenAPI; las validaciones de request/response se derivan de esquemas Zod generados desde el contrato. Código que contradiga el contrato no se mergea (Constitución §1).                                                                                                                                                                                                                                                                                                                        |
| RNF-08 | Toda PR debe incluir tests unitarios del Service afectado + test de contrato contra el esquema OpenAPI. El CI debe pasar en < 3 minutos (Constitución §4).                                                                                                                                                                                                                                                                                                                                                                                         |
| RNF-09 | Toda relación en PostgreSQL lleva FK explícita con `ON DELETE` definido. Se utiliza eliminación lógica (`deleted_at`) para atletas y sesiones; el catálogo de ejercicios no permite eliminación (solo desactivación con campo `active`). Las FK se mantienen independientemente del soft-delete (Constitución §5).                                                                                                                                                                                                                                 |
| RNF-10 | La arquitectura del backend sigue estrictamente el patrón de capas: Routes → Controllers → Services → Repositories. Ninguna capa puede saltar a otra no adyacente. La lógica de negocio vive exclusivamente en Services (Constitución §3).                                                                                                                                                                                                                                                                                                         |

---

## 6. Casos límite

| #     | Caso                                                                                                                                          | Comportamiento esperado                                                                                                                                                                                                                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CL-01 | El atleta declara solo 1 día disponible por semana.                                                                                           | El sistema genera una rutina full-body para ese día único, cubriendo todos los patrones principales.                                                                                                                                                                                                                      |
| CL-02 | El atleta reporta dolor severo en ambos hombros.                                                                                              | El sistema excluye todos los ejercicios de empuje y tirón con articulación de hombro; avisa si la sesión queda desbalanceada (CA-08.5).                                                                                                                                                                                   |
| CL-03 | El atleta falla las reps objetivo en 3+ sesiones consecutivas del mismo ejercicio.                                                            | El sistema propone deload obligatorio para ese ejercicio (reducción de carga ≥ 10%) según CA-07.2.                                                                                                                                                                                                                        |
| CL-04 | No hay alternativa disponible que cumpla el filtro de equipamiento + articulación libre de dolor.                                             | El sistema muestra "No se encontró alternativa adecuada" y permite omitir el ejercicio con justificación (CA-03.2).                                                                                                                                                                                                       |
| CL-05 | El atleta registra un RIR > 5 o un peso negativo.                                                                                             | El sistema rechaza la entrada con mensaje de validación. Peso = 0 kg es válido (ejercicios a peso corporal).                                                                                                                                                                                                              |
| CL-06 | El atleta no completa el check-in y cierra la app.                                                                                            | La sesión queda en estado "pendiente"; al volver, el sistema retoma desde el check-in.                                                                                                                                                                                                                                    |
| CL-07 | El atleta cambia su perfil a mitad de un mesociclo (ej: cambia objetivo o reduce días).                                                       | Cambio de objetivo → se genera un nuevo mesociclo completo de N semanas; el mesociclo anterior se archiva y el historial de carga se preserva. Cambio de días o equipamiento → se aplica a partir del siguiente mesociclo. El sistema avisa del impacto antes de confirmar.                                               |
| CL-08 | El atleta no entrena durante 2+ semanas consecutivas.                                                                                         | Al volver, el sistema reduce la carga un 10% en todos los ejercicios respecto a la última sesión registrada y reanuda el mesociclo desde donde quedó. Si la inactividad supera 4 semanas, se genera un nuevo mesociclo. Si además hubo un cambio de perfil durante la inactividad, se absorbe en el nuevo mesociclo.      |
| CL-09 | El atleta entrena un día no programado (más días de los declarados).                                                                          | El sistema no genera sesiones ad-hoc en el MVP. Si el atleta quiere más días, debe editar su perfil (aplicable desde el próximo mesociclo por CL-07). El sistema muestra un mensaje: "¿Querés entrenar más días? Actualizá tus días disponibles en tu perfil".                                                            |
| CL-10 | El atleta abre la app en dos dispositivos sin red y registra series en ambos.                                                                 | Se aplica la política last-write-wins por registro individual (RNF-03). Al sincronizar, cada serie se identifica por su timestamp; no se duplican ni se pierden.                                                                                                                                                          |
| CL-11 | Primer mesociclo de un atleta sin historial (carga inicial).                                                                                  | La carga inicial se estima a partir del peso corporal, nivel de experiencia y el `initial_load_ratio` de cada ejercicio del catálogo (CA-02.5).                                                                                                                                                                           |
| CL-12 | El atleta completa el check-in pero no registra ninguna serie (abandona la sesión).                                                           | La sesión se marca como "incompleta". El check-in de fatiga/dolor se conserva para análisis (RF-08). La sesión incompleta no cuenta para progresión de carga (RF-07).                                                                                                                                                     |
| CL-13 | Todos los ejercicios de un patrón de movimiento quedan excluidos por dolor bilateral.                                                         | La sesión se reduce a los patrones disponibles con aviso explícito (CA-08.5). Si no queda ningún ejercicio viable, el sistema sugiere descanso total ese día.                                                                                                                                                             |
| CL-14 | Un video de YouTube vinculado a un ejercicio es eliminado o no disponible regionalmente.                                                      | El sistema muestra "Video no disponible" con el nombre del ejercicio. El ejercicio sigue siendo utilizable (CA-09.3).                                                                                                                                                                                                     |
| CL-15 | El atleta está offline e intenta iniciar una sesión.                                                                                          | El check-in pre-sesión, la visualización de la rutina y el registro de series funcionan offline (CA-04.1, CA-05.6, RNF-03). La generación de un nuevo mesociclo requiere conexión.                                                                                                                                        |
| CL-16 | Se activa un deload reactivo (CA-08.4) a mitad del mesociclo.                                                                                 | El deload reactivo cuenta como la semana de descarga del ciclo. El mesociclo se acorta y la rotación (RF-10) ocurre al finalizar esa semana. No se acumulan dos deloads.                                                                                                                                                  |
| CL-17 | El atleta solicita eliminar su cuenta.                                                                                                        | Se aplica soft-delete (`deleted_at`) al atleta y todas sus sesiones (RNF-09). Los datos permanecen en la base de datos por 30 días para permitir recuperación. Tras 30 días, un proceso de limpieza elimina los registros definitivamente. El atleta ve un mensaje de confirmación con aviso del periodo de gracia.       |
| CL-18 | El token de OAuth expira mientras el atleta está offline.                                                                                     | Los datos registrados offline se preservan en almacenamiento local. Al recuperar conexión, el sistema solicita re-autenticación con Google antes de sincronizar. No se pierden datos pendientes (RNF-03).                                                                                                                 |
| CL-19 | El atleta con nivel "principiante" lleva varios mesociclos y su progresión se ralentiza.                                                      | El cambio de nivel es manual (el atleta edita su perfil). El sistema puede sugerir reclasificación mostrando un aviso: "Tu progresión sugiere que podrías beneficiarte del nivel intermedio", pero no cambia el nivel automáticamente. La sugerencia se activa cuando el atleta completa 3+ mesociclos en el mismo nivel. |
| CL-20 | Se detecta fatiga o dolor durante una sesión activa que justificaría un deload.                                                               | Los ajustes de RF-08 (incluyendo deload reactivo) se aplican siempre a partir de la próxima sesión, nunca a la sesión en curso. El atleta puede opcionalmente abandonar la sesión actual (CL-12).                                                                                                                         |
| CL-21 | El atleta selecciona solo "sin equipamiento" (peso corporal) en su perfil.                                                                    | El sistema genera la rutina exclusivamente con ejercicios de peso corporal. Si no se alcanza el volumen mínimo del nivel, se ajusta al máximo posible con un aviso (CA-02.2).                                                                                                                                             |
| CL-22 | Múltiples reportes de dolor en la misma articulación con distinta intensidad dentro de la ventana de 3 sesiones (ej: leve → moderado → leve). | Prevalece la intensidad más severa de la ventana (en este caso, moderado). El ajuste se aplica según la regla de moderado (RF-08 CA-08.2).                                                                                                                                                                                |

---

## 7. Fuera de alcance (MVP)

- Rol de administrador y gestión del catálogo desde la UI.
- Integración con wearables o dispositivos externos.
- Gamificación, logros o componentes sociales.
- Planes de nutrición o seguimiento de macros.
- Soporte multi-idioma (solo español en UI).
- Generación de rutinas mediante IA generativa (LLM); el motor es algorítmico y basado en reglas con evidencia.
- Historial gráfico y analíticas avanzadas de rendimiento.
- Notificaciones push o recordatorios.
- Sesiones ad-hoc fuera del plan (días extra no programados).
- Reclasificación automática de nivel de experiencia.
- Registro de menores de 16 años.

---

## 8. Criterios de finalización del MVP

El MVP se considera completo cuando:

1. Un atleta nuevo puede registrarse con Google OAuth, completar su perfil (con equipamiento de taxonomía cerrada) y recibir un mesociclo generado.
2. El atleta puede editar la rutina sustituyendo ejercicios por alternativas equivalentes filtradas por su equipamiento.
3. El atleta puede completar un check-in pre-sesión de fatiga/dolor con intensidad por articulación.
4. El atleta puede ver las repeticiones objetivo y registrar peso, reps completadas y RIR de cada serie (peso 0 kg válido para peso corporal).
5. El atleta puede reportar molestia articular al finalizar un ejercicio.
6. El sistema calcula la progresión de carga con incrementos diferenciados por nivel (tabla RF-07) y ventana de análisis de 3 sesiones.
7. El sistema ajusta la planificación futura ante reportes de dolor articular (por severidad, con regla escalonada 30%/50%) o fatiga alta sostenida.
8. El sistema gestiona mesociclos de 4–8 semanas (según nivel) con deload fijo en la última semana, regla de precedencia para deload reactivo, y rotación de ejercicios accesorios (con verificación de historial de dolor) al inicio del siguiente ciclo.
9. El catálogo contiene ≥ 200 ejercicios con metadatos completos (incluyendo `initial_load_ratio` y tipo compuesto/monoarticular) y video de YouTube.
10. Todos los flujos son operables con una mano en pantalla ≤ 390px, cero scroll horizontal.
11. La rutina del día, el check-in y el registro de series funcionan offline con política last-write-wins y manejo de token expirado.
12. Todos los endpoints y DTOs se derivan del contrato OpenAPI + Zod (Constitución §1).
13. Toda PR incluye tests unitarios de Service + test de contrato; CI pasa en < 3 min (Constitución §4).
14. Todas las relaciones en PostgreSQL tienen FK explícitas con `ON DELETE` definido (Constitución §5).
15. La arquitectura del backend respeta estrictamente Routes → Controllers → Services → Repositories (Constitución §3).

---

## 9. Decisiones resueltas

| #    | Pregunta                                          | Decisión                                                                                                                                                                          |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Método de autenticación                           | OAuth con Google exclusivamente.                                                                                                                                                  |
| D-02 | Videos de ejercicios                              | Enlaces externos a YouTube. Fallback: mensaje "Video no disponible", no bloqueante.                                                                                               |
| D-03 | Alcance del modo offline                          | Visualización de la rutina del día + check-in pre-sesión + registro de series. Sincronización al recuperar red con política last-write-wins. Re-autenticación si el token expira. |
| D-04 | Duración del mesociclo                            | Principiante 4 sem, intermedio 6 sem, avanzado 8 sem. Última semana siempre es deload.                                                                                            |
| D-05 | Semana de deload                                  | Fija (última del mesociclo). Si hay deload reactivo antes, cuenta como el deload del ciclo y acorta el mesociclo.                                                                 |
| D-06 | Equipamiento                                      | Taxonomía cerrada de 20 categorías seleccionables en el perfil.                                                                                                                   |
| D-07 | Carga inicial (sin historial)                     | Estimada por `initial_load_ratio` del ejercicio × peso corporal × ajuste por nivel.                                                                                               |
| D-08 | Incrementos de progresión                         | Diferenciados por nivel: principiante +5/+2.5 kg, intermedio/avanzado +2.5/+1.25 kg. Doble progresión como alternativa.                                                           |
| D-09 | Ventana de análisis de progresión                 | Últimas 3 sesiones del mismo ejercicio. Sesiones exitosas para subir: 1 (principiante), 2 (intermedio), 3 (avanzado).                                                             |
| D-10 | Cambio de perfil a mitad de mesociclo             | Objetivo → nuevo mesociclo completo (archiva anterior). Días/equipamiento → siguiente mesociclo.                                                                                  |
| D-11 | Ejercicios que rotan entre mesociclos             | Accesorios y monoarticulares rotan (con verificación de dolor). Compuestos principales se mantienen.                                                                              |
| D-12 | Notificación de nuevo mesociclo                   | Banner in-app al abrir sesión, no push notification.                                                                                                                              |
| D-13 | Terminología compuesto vs monoarticular           | Se usa "monoarticular" en lugar de "aislamiento" para el tipo de ejercicio, evitando confusión con patrones de movimiento.                                                        |
| D-14 | Cambio de nivel de experiencia                    | Manual. El sistema sugiere reclasificación tras 3+ mesociclos, pero no cambia automáticamente.                                                                                    |
| D-15 | Eliminación de cuenta                             | Soft-delete con 30 días de gracia para recuperación.                                                                                                                              |
| D-16 | Momento de aplicación de ajustes por fatiga/dolor | Siempre desde la próxima sesión, nunca la sesión en curso.                                                                                                                        |
| D-17 | Reducción por dolor moderado                      | Escalonada: 30% al primer reporte, 50% si se sostiene 2+ sesiones.                                                                                                                |
| D-18 | Edad mínima                                       | 16 años. El sistema rechaza edades menores en el formulario de perfil.                                                                                                            |
| D-19 | Tipo de periodización                             | Lineal para fuerza, ondulante para hipertrofia y mixto.                                                                                                                           |
| D-20 | Dolor con múltiples intensidades en la ventana    | Prevalece la más severa reportada en las últimas 3 sesiones.                                                                                                                      |
| D-21 | Perfil solo peso corporal                         | El sistema genera con ejercicios sin equipamiento; ajusta volumen si no alcanza el mínimo.                                                                                        |
