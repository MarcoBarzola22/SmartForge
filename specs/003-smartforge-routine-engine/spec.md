# SPEC-003 — Evolución del Perfil y Motor de Rutinas V2

## 1. Contexto y objetivo

La Épica 003 evoluciona la experiencia central de SmartForge abordando dos pilares esenciales: el seguimiento de la composición y progreso físico del atleta (peso corporal semanal) y una personalización biomecánica y logística avanzada en el diseño de entrenamientos (Motor de Rutinas V2).

En la versión inicial, la generación de mesociclos operaba con supuestos genéricos de duración y volumen por sesión. El **Motor de Rutinas V2** empodera al atleta para alinear su entrenamiento con su disponibilidad real de tiempo por sesión (bloques fijos uniformes) y su preferencia de densidad de ejercicios por día, respetando rigurosamente las pausas fisiológicas de descanso necesarias entre series, contemplando ejercicios unilaterales, respetando el piso de Dosis Mínima Efectiva y garantizando el techo de seguridad fisiológica mediante una regla jerárquica de poda para evitar sobreentrenamiento.

Asimismo, se introduce un **sistema de auditoría e historial de mesociclos** que registra un punto de partida inmutable y compara las cargas iniciales frente a las finales alcanzadas en base al mejor rendimiento de fuerza máxima estimada (discriminando con sensibilidad cargas corporales libres, lastradas, asistidas con piso de 1.0 kg y externas, y aislando las semanas de descarga programada o reactiva para evitar distorsiones), junto con un mecanismo formal de **cancelación controlada del ciclo activo** con soporte offline-first, resolución determinista de sincronización y restricción estricta de unicidad activa (Art. 5 de la Constitución), preservando los registros de rendimiento para nutrir el modelo de sobrecarga progresiva continua.

---

## 2. Usuarios

| Rol | Descripción |
| :--- | :--- |
| **Atleta** | Usuario final que entrena en sala de musculación o gimnasio. Registra su peso corporal semanalmente, define su disponibilidad de tiempo y preferencias de ejercicios, consulta su historial de progreso entre ciclos y gestiona el ciclo de vida de su mesociclo activo con una sola mano en el dispositivo móvil (≤ 390px). |

---

## 3. Historias de usuario

| ID | Historia |
| :--- | :--- |
| **HU-01** | Como atleta, quiero registrar y actualizar mi peso corporal una vez por semana para visualizar mi evolución a lo largo del tiempo. |
| **HU-02** | Como atleta, quiero poder ingresar pesajes de semanas pasadas que haya olvidado o corregir registros previos en caso de error (ajustando valor y día dentro de la misma semana), recibiendo una advertencia sobre la consistencia histórica. |
| **HU-03** | Como atleta, quiero definir los días disponibles semanales (escala 1 a 7), la duración por sesión en bloques fijos uniformes y mi preferencia de ejercicios diarios (o elegir la recomendación dinámica) para que el motor adapte la rutina a mi tiempo real. |
| **HU-04** | Como atleta, quiero que el motor de rutinas impida combinaciones manualmente forzadas que sean físicamente inviables, explicándome la razón fisiológica (tiempo de series, factor unilateral y descansos). |
| **HU-05** | Como atleta, quiero que el sistema capture un punto de partida inmutable de mis marcas al iniciar un mesociclo para tener una línea base sólida de comparación. |
| **HU-06** | Como atleta, quiero consultar un historial de mesociclos en formato de tarjetas móviles que muestre la comparativa directa entre mi carga inicial y la serie de mayor fuerza máxima estimada alcanzada previa a la descarga, evaluando el progreso considerando el peso corporal de cada fecha (libre, lastrado o asistido) y cargas externas, tanto en ciclos completados como cancelados. |
| **HU-07** | Como atleta, quiero poder anular/cancelar mi mesociclo activo de forma inmediata (incluso sin conexión a internet en el gimnasio), sabiendo que se cancela la planificación futura pero se conservan mis registros históricos y marcas de fuerza para los próximos ciclos. |
| **HU-08** | Como atleta, si mis horarios o disponibilidad cambian drásticamente a mitad de un ciclo, quiero recibir la recomendación de cancelar el mesociclo actual y generar uno nuevo ajustado a mi nueva realidad. |

---

## 4. Requisitos funcionales

### RF-01 — Registro semanal de peso corporal y guarda de intervalo
El sistema debe permitir al atleta documentar su peso corporal con periodicidad semanal para dar seguimiento a su tendencia física, garantizando la consistencia temporal entre registros.

- **CA-01.1 (EARS - Ubicuo):** El sistema debe almacenar el peso corporal expresado en kilogramos con precisión de un decimal (ej. 75.4 kg).
- **CA-01.2 (EARS - Ubicuo):** Se define la "semana calendario" como el período comprendido entre el lunes a las 00:00:00 y el domingo a las 23:59:59 según el huso horario local del dispositivo del atleta. Para prevenir duplicidades accidentales por desplazamientos de huso horario, el sistema debe almacenar la marca temporal en UTC y exigir una distancia mínima de **120 horas (5 días completos)** evaluada estrictamente entre las **fechas calendario asignadas a los registros de pesaje** (y no sobre el momento de la transacción en el dispositivo).
- **CA-01.3 (EARS - Event-driven):** **Cuando** el atleta registra su peso corporal semanal, **el sistema debe** asociar la fecha correspondiente a dicha semana y actualizar el peso actual de referencia en su perfil.
- **CA-01.4 (EARS - Unwanted behaviour):** Manejo de colisiones temporales en el registro de peso:
  1. **Si** el atleta intenta registrar un nuevo peso para una semana calendario que ya cuenta con un registro, **entonces el sistema debe** notificarle que ya existe un pesaje en esa semana y habilitar directamente el modo de edición de dicho registro.
  2. **Si** el atleta intenta registrar un nuevo peso para una nueva semana calendario pero la fecha asignada dista menos de 120 horas de su pesaje anterior (ej. registro previo en sábado y nuevo intento en martes), **entonces el sistema debe** rechazar la creación y mostrar el aviso: *"Para garantizar la consistencia de tu tendencia, debe existir un intervalo de al menos 5 días entre pesajes. Podrás registrar tu nuevo peso a partir de [fecha/hora]"*.
- **CA-01.5 (EARS - Unwanted behaviour):** **Si** el valor ingresado es menor a 30.0 kg o superior a 300.0 kg, **entonces el sistema debe** rechazar el registro con un mensaje de validación explicativo.

---

### RF-02 — Historial, pesajes retroactivos, edición e inmutabilidad de series
El sistema debe ofrecer una vista cronológica de las mediciones de peso y permitir correcciones y cargas retroactivas controladas, preservando la inmutabilidad de los registros de rendimiento ya ejecutados.

- **CA-02.1 (EARS - Ubicuo):** El sistema debe listar cronológicamente todos los pesajes semanales registrados, indicando fecha, peso en kg y la variación (delta) respecto al pesaje previo.
- **CA-02.2 (EARS - Event-driven):** **Cuando** el atleta no haya registrado peso en una semana calendario pasada, **el sistema debe** permitirle ingresar un pesaje retroactivo para esa fecha específica, siempre que dicha fecha respete la guarda mínima de 120 horas respecto a registros adyacentes, permitiendo cargar múltiples semanas pendientes en una misma sesión.
- **CA-02.3 (EARS - Event-driven):** **Cuando** el atleta selecciona un registro de peso existente para editarlo, **el sistema debe** mostrar una advertencia contextual indicando: *"Modificar datos históricos puede alterar la consistencia de tu gráfica de progreso"*.
- **CA-02.4 (EARS - Event-driven):** **Cuando** el atleta confirma la edición de un pesaje previo, **el sistema debe** permitirle modificar tanto el valor numérico en kg como el día asignado (siempre que la nueva fecha permanezca dentro de la **misma semana calendario** y respete la distancia de 120 horas con las semanas adyacentes), actualizando la marca de auditoría interna de modificación y recalculando las diferencias subsiguientes en la vista del historial de peso.
- **CA-02.5 (EARS - Ubicuo):** La corrección retroactiva de un pesaje semanal actualiza la curva del gráfico de peso corporal, pero **no recalcula retrospectivamente los valores de rendimiento ni el 1RM estimado guardado en las series calisténicas de entrenamientos pasados**, preservando la inmutabilidad de los registros históricos de sesión.

---

### RF-03 — Parámetros del Motor de Rutinas V2 y homogeneidad de sesiones
Al generar un nuevo mesociclo, el sistema debe recolectar la disponibilidad horaria y las preferencias de densidad de entrenamiento del atleta.

- **CA-03.1 (EARS - Ubicuo):** El sistema debe ofrecer la selección de la cantidad escalar de días disponibles por semana dentro del rango de 1 a 7 días. La rutina programa sesiones secuenciales (Sesión 1 a Sesión K) sin anclaje forzado a días rígidos del calendario.
- **CA-03.2 (EARS - Ubicuo):** El sistema debe ofrecer la selección del tiempo disponible por sesión exclusivamente mediante bloques fijos predefinidos: **30 min, 45 min, 60 min, 75 min, 90 min y 120 min**. El bloque seleccionado aplica de forma uniforme como duración estándar para todas las sesiones del mesociclo.
- **CA-03.3 (EARS - Ubicuo):** El sistema debe permitir elegir la cantidad de ejercicios diarios entre valores fijos: **2, 3, 4, 5, 6 o 7 ejercicios por día**, o la opción dinámica **"Recomendado por SmartForge (N ej/día)"**. El valor seleccionado aplica de forma homogénea como la cantidad exacta de ejercicios programados en cada sesión de la semana.
- **CA-03.4 (EARS - Ubicuo):** Conforme al principio de Contrato Único (Art. 1 de la Constitución) y Capas Estrictas (Art. 3 de la Constitución), la matriz de viabilidad temporal y la resolución de *N* para la opción recomendada está gobernada por el contrato de backend (`/routines/config/time-blocks`) y validada con esquemas Zod. El cliente refleja reactivamente en tiempo real el valor de *N* correspondiente al bloque de tiempo seleccionado (ej. 2 ej/día para 30 min, 4 ej/día para 60 min, 6 ej/día para 90 min). Esta opción recomendada está matemáticamente garantizada de ser viable y jamás disparará un bloqueo de inviabilidad.
- **CA-03.5 (EARS - Ubicuo):** El sistema debe considerar el peso corporal más reciente del atleta como parámetro de entrada en la generación del mesociclo.

---

### RF-04 — Validación de viabilidad temporal, límites de reducción y regla jerárquica de poda
El motor de rutinas debe garantizar que la rutina sea realizable dentro del bloque de tiempo asignado, garantizando descansos seguros y efectivos a lo largo de todo el ciclo, sin caer por debajo del estímulo mínimo ni superar el volumen seguro.

- **CA-04.1 (EARS - Ubicuo):** El motor debe calcular el tiempo proyectado de la sesión considerando la **semana de máximo volumen proyectado (semana pico)** del mesociclo, sumando:
  1. Tiempo de ejecución por serie bilateral (estimado en 45 segundos según tempo y rango de repeticiones).
  2. Tiempo de ejecución por serie unilateral (factor multiplicador de **1.8×**, estimado en 80 segundos para cubrir ambos lados).
  3. Tiempo fisiológico de descanso entre series (mínimo 60s en ejercicios monoarticulares/accesorios, mínimo 120s–180s en compuestos pesados).
  4. Tiempo fijo de calentamiento y aproximación por sesión (estimado entre 5 y 10 minutos según nivel).
- **CA-04.2 (EARS - Unwanted behaviour):** **Si** el atleta selecciona manualmente una cantidad de ejercicios que excede el presupuesto del bloque de tiempo en la semana pico (ej. 30 min con 4 ejercicios compuestos), **entonces el sistema debe** bloquear la generación y mostrar un mensaje pedagógico explicativo indicando el déficit de tiempo para pausas y series de calidad.
- **CA-04.3 (EARS - Event-driven):** **Cuando** se detecte una combinación manual inviable, **el sistema debe** sugerir el número máximo de ejercicios compatible con el tiempo elegido (ej: *"Para 30 minutos recomendamos un máximo de 2 a 3 ejercicios"*).
- **CA-04.4 (EARS - State-driven):** **Mientras** la combinación de tiempo y días impida alcanzar el volumen mínimo estándar de hipertrofia de SPEC-001 (10–14 series/músculo/semana), **el sistema debe** priorizar la restricción temporal del atleta aplicando el principio de **Dosis Mínima Efectiva (DME)** (6–8 series de alta calidad con mayor proximidad al fallo / RIR 1-2) y mostrar la nota informativa: *"Rutina optimizada para tiempo reducido (Dosis mínima efectiva)"*.
- **CA-04.5 (EARS - Event-driven):** **Cuando** el atleta reemplaza un ejercicio en la pantalla de revisión de rutina por una variante unilateral o de mayor demanda temporal que amenace con desbordar el bloque de tiempo en la semana pico, **el sistema debe** recalcular las series reduciendo el volumen hasta un piso no menor a 2 series por ejercicio (asegurando el cumplimiento de la DME de ≥ 6 series semanales por músculo). **Si** incluso con el piso de 2 series la sesión excede el tiempo disponible, **entonces el sistema debe** impedir dicho reemplazo y notificar al atleta: *"La variante seleccionada excede el tiempo disponible. Te sugerimos mantener una alternativa bilateral o ampliar el bloque de tiempo a [X] min"*.
- **CA-04.6 (EARS - State-driven):** **Mientras** una selección de alta disponibilidad (ej. 7 días, 120 min, 7 ejercicios) proyecte un volumen semanal superior al techo de seguridad fisiológica (máximo 24 series por grupo muscular por semana según SPEC-001 CA-02.3), **el sistema debe aplicar una regla jerárquica de poda**:
  1. Preservar intactas las series efectivas (3 a 4 series) de los ejercicios compuestos principales.
  2. Podar series de los ejercicios de aislamiento / monoarticulares hasta alcanzar el techo de 24 series.
  3. Si aún persiste el exceso, podar series de los ejercicios accesorios compuestos secundarios hasta estabilizar el volumen en 24 series/semana.
  4. El tiempo restante de la sesión se destina a pausas de descanso completas y calentamiento prolongado, informando: *"Volumen ajustado jerárquicamente al techo seguro (24 series/músculo/semana)"*.

---

### RF-05 — Punto de partida inmutable y normalización de RIR submáximo
Al formalizar el mesociclo, el sistema debe registrar el punto de partida de rendimiento del atleta para cada ejercicio.

- **CA-05.1 (EARS - Event-driven):** **Cuando** se confirma y activa un nuevo mesociclo, **el sistema debe** capturar automáticamente un punto de partida inmutable (peso base en kg y reps) para cada ejercicio programado.
- **CA-05.2 (EARS - State-driven):** Para definir la carga del punto de partida de un ejercicio:
  1. Si el atleta registra al menos una serie efectiva completada con `RIR ≤ 3` en los **últimos 90 días naturales**, el sistema tomará la serie que arroje el mayor 1RM estimado (desempatando por mayor peso absoluto en kg).
  2. Si en los últimos 90 días no existen series con `RIR ≤ 3`, pero existen series completadas con `RIR 4 o 5`, el sistema normaliza la serie de mayor peso a su equivalente en RIR 2 mediante la fórmula: `carga_base = carga_registrada * (1 + (RIR_registrado - 2) * 0.025)`.
  3. Si no existe ningún registro en los últimos 90 días, el sistema calculará la carga estimada de partida basándose en los ratios de peso corporal y nivel de experiencia (según tabla de SPEC-001 CA-02.5).
- **CA-05.3 (EARS - Ubicuo):** Una vez generado el punto de partida de un mesociclo, este es estrictamente inmutable; modificaciones retroactivas de pesajes en el perfil no alteran los puntos de partida de mesociclos ya creados o en curso.

---

### RF-06 — Historial comparativo, taxonomía de cargas y desempate por fuerza máxima estimada
El atleta debe poder auditar todos los mesociclos transitados y medir su ganancia de fuerza real distinguiendo con exactitud matemática el tipo de carga empleada y evaluando el progreso sobre el 1RM estimado.

- **CA-06.1 (EARS - Ubicuo):** El sistema debe proporcionar una vista de historial que liste los mesociclos pasados en orden cronológico inverso, detallando: nombre/objetivo, fecha de inicio, fecha de fin, estado (*Completado*, *Completado (Descarga omitida)* o *Cancelado*) y porcentaje de cumplimiento/adherencia:
  - Para mesociclos completados: `(sesiones completadas / sesiones planificadas) * 100`.
  - Para mesociclos cancelados: `min(100, round((sesiones_efectivas_completadas / max(1, (dias_semanales / 7) * dias_transcurridos_hasta_cancelacion)) * 100))`.
  - **Cómputo de sesiones efectivas completadas:** Una sesión cuenta como 1.0 sesión completada si se ejecutó al menos el 50% de sus series planificadas. Si una sesión se interrumpió con menos del 50% de sus series completadas, computa como fracción proporcional `(series_completadas / series_planificadas)`, impidiendo distorsiones de cumplimiento. Si el atleta completó más sesiones que la tasa esperada, se acompaña con la leyenda: *"Cumplimiento: 100% (con sesiones adelantadas)"* y el contador de avance (ej. *"Semana 2 de 6 completada"*).
- **CA-06.2 (EARS - Ubicuo):** Conforme al principio de Contrato Único (Art. 1 de la Constitución), cada ejercicio en el catálogo cuenta con el atributo tipado `load_type` (`'bodyweight'`, `'bodyweight_loadable'`, `'assisted_bodyweight'` o `'external_load'`). La carga total movilizada (`carga_total`) para el cálculo de fuerza se define como:
  - Para `'bodyweight'` (peso corporal puro): `carga_total = peso_corporal_vigente`.
  - Para `'bodyweight_loadable'` (peso corporal con posible lastre): `carga_total = peso_corporal_vigente + lastre_registrado`.
  - Para `'assisted_bodyweight'` (calisténico asistido con contrapeso/máquina): `carga_total = max(1.0, peso_corporal_vigente - asistencia_registrada)` (el piso de 1.0 kg previene valores negativos y preserva la sensibilidad de progresión en principiantes).
  - Para `'external_load'` (barra, mancuerna, máquina, polea): `carga_total = peso_externo_registrado`.
- **CA-06.3 (EARS - Ubicuo):** La resolución de `peso_corporal_vigente` para una sesión se rige por la regla de **arrastre del último pesaje conocido (carry-forward)**: se utiliza el pesaje registrado con fecha anterior o igual más cercana a la fecha de la sesión; si no existiera ninguno previo, se utiliza el peso inicial registrado al activar el mesociclo.
- **CA-06.4 (EARS - Ubicuo):** Conforme a la regla de cero scroll horizontal en pantallas móviles ≤ 390px (Art. 2 de la Constitución), la comparativa de marcas por ejercicio debe presentarse mediante **tarjetas verticales apiladas (Card layout)** detallando:
  - Nombre del ejercicio y grupo muscular.
  - **Punto de partida:** Carga registrada al inicio con el peso corporal correspondiente a la fecha de inicio (ej. *75.0 kg (PC) + 0 kg × 6 reps*, *75.0 kg (PC) - 20 kg (asist.) × 8 reps* o *60.0 kg × 10 reps*).
  - **Carga final alcanzada:** La serie completada con RIR ≤ 3 que arrojó el **mayor 1RM estimado** en la **última semana de sobrecarga regular previa a la descarga (programada o reactiva por fatiga)**, desempatando en caso de igualdad por el mayor peso absoluto en kg, y evaluada con el peso corporal correspondiente a la fecha de la sesión de cierre (ej. *73.5 kg (PC) + 10 kg × 8 reps*, *73.5 kg (PC) - 10 kg (asist.) × 8 reps* o *67.5 kg × 8 reps*). Si el ciclo fue cancelado, se toma la serie de mayor 1RM estimado lograda antes de la cancelación.
  - **Progreso en fuerza máxima estimada (1RM est.):**
    - Para series de `reps ≤ 10`: Fórmula de Brzycki: `e1RM = carga_total / (1.0278 - 0.0278 * reps)`.
    - Para series de `11 ≤ reps ≤ 30`: Fórmula de Wathan: `e1RM = (100 * carga_total) / (48.8 + (53.8 * e^(-0.075 * reps)))`.
    - Para series de `reps > 30`: El cálculo se satura a un tope de 30 repeticiones para preservar la estabilidad matemática.
    - El progreso se exhibe mediante el incremento neto de fuerza máxima estimada (`delta_kg = e1RM_cierre - e1RM_inicio`) y su variación porcentual (ej. *"+5.2 kg (+8.4% 1RM est.)"*), garantizando que en esquemas de doble progresión (mismo peso y más repeticiones) el delta absoluto en kg refleje fielmente la ganancia equivalente de fuerza.
- **CA-06.5 (EARS - State-driven):** **Si** un ejercicio asignado a un ciclo cancelado nunca llegó a ejecutarse antes de la cancelación, **el sistema debe** mostrar en su tarjeta el estado *"No ejecutado (Ciclo cancelado)"* y un progreso de *"0 kg / Sin variación"*.
- **CA-06.6 (EARS - State-driven):** **Mientras** se visualiza un mesociclo con estado *Cancelado*, **el sistema debe** indicar prominentemente la insignia de cancelación, la fecha de interrupción y las comparativas logradas hasta ese momento.

---

### RF-07 — Cancelación del mesociclo activo, unicidad relacional y reconciliación determinista
El sistema debe permitir anular el mesociclo en curso ante imprevistos, lesiones o cambios de horario, resguardando la integridad relacional estricta y resolviendo pacíficamente discrepancias multi-dispositivo.

- **CA-07.1 (EARS - Ubicuo):** Conforme al principio de Integridad Relacional (Art. 5 de la Constitución), el modelo de datos impone una **restricción estricta de unicidad** (`UNIQUE WHERE status = 'active'` por atleta). El sistema garantiza que no pueden coexistir dos mesociclos en estado *Activo* en paralelo.
- **CA-07.2 (EARS - State-driven):** **Mientras** exista un mesociclo en estado *Activo*, **el sistema debe** disponibilizar la acción de anular/cancelar dicho mesociclo en la configuración o vista del ciclo.
- **CA-07.3 (EARS - Event-driven):** **Cuando** el atleta activa la opción de anulación, **el sistema debe** desplegar un diálogo modal de confirmación destructiva advirtiendo explícitamente:
  > *"Al cancelar el mesociclo actual, se cancelará la planificación de las sesiones futuras restantes. Las sesiones ya completadas y tus pesos levantados quedarán guardados en tu historial."*
- **CA-07.4 (EARS - Ubicuo):** Conforme al principio de funcionamiento Offline-First de la PWA (SPEC-001 RNF-03), la acción de cancelación del mesociclo activo **se ejecuta y valida localmente sin requerir conectividad de red síncrona**. En caso de no contar con red, el cliente aplica los cambios localmente en IndexedDB, muestra el aviso *"Cancelado localmente. Se sincronizará con el servidor al recuperar conexión"* y encola la mutación de sincronización idempotente.
- **CA-07.5 (EARS - Ubicuo):** Conforme a la regla de resolución determinista de sincronización multi-dispositivo: **el estado Completado prevalece sobre la cancelación**. Si el backend recibe una mutación de cancelación offline para un mesociclo que ya fue marcado como *Completado* en el servidor desde otro dispositivo, el servidor rechaza pacíficamente la cancelación (`NOOP`), preserva el ciclo completado y actualiza la caché local del dispositivo cliente con el estado completado real. Si el ciclo sigue *Activo* en el servidor, la cancelación se procesa normalmente.
- **CA-07.6 (EARS - Event-driven):** **Si** existe una sesión de entrenamiento con estado *En curso* al momento de la confirmación de cancelación, **entonces el sistema debe** finalizarla automáticamente en ese instante, guardando las series efectivamente registradas hasta ese momento y cancelando las series pendientes.
- **CA-07.7 (EARS - Event-driven):** **Cuando** el atleta confirma la cancelación, **el sistema debe**:
  1. Cambiar el estado del mesociclo a *Cancelado*.
  2. Actualizar el estado de todas las sesiones futuras no realizadas a *Canceladas* (cumpliendo con la integridad relacional sin borrados físicos en cascada, de acuerdo con el Art. 5 de la Constitución).
  3. Redirigir al atleta al panel principal (Dashboard), estableciendo el estado general de entrenamiento en *Sin mesociclo activo*.
- **CA-07.8 (EARS - State-driven):** **Si** un mesociclo se cancela habiendo completado **0 sesiones de entrenamiento**, **el sistema debe** descartarlo sin incorporarlo al historial principal de progreso, evitando saturar la vista con ciclos vacíos.
- **CA-07.9 (EARS - State-driven):** **Mientras** el atleta permanezca en estado *Sin mesociclo activo*, las pantallas dependientes de entrenamiento activo (ej. "Sesión de Hoy", "Check-in") deben mostrar una vista de estado vacío con un llamado a la acción (CTA) destacado: *"No tienes un mesociclo activo. Genera tu nueva rutina para continuar entrenando"*, manteniendo accesibles el Perfil y el Historial.
- **CA-07.10 (EARS - Unwanted behaviour):** **Si** un mesociclo ya se encuentra en estado *Completado* o previamente *Cancelado*, **entonces el sistema debe** impedir y deshabilitar cualquier acción de anulación sobre el mismo.
- **CA-07.11 (EARS - State-driven):** **Si** la anulación del mesociclo se solicita habiendo completado el **100% de las semanas regulares de sobrecarga y durante el transcurso de la semana de descarga final**, **el sistema debe** archivar el ciclo con el estado **"Completado (Descarga omitida)"** en lugar de "Cancelado", preservando su registro positivo en las métricas de adherencia global.

---

### RF-08 — Preservación de registros, protección contra fatiga acumulada y sobrecarga continua
La anulación de un ciclo no debe perjudicar la memoria de entrenamiento del sistema, ni provocar fatiga excesiva ni distorsionar la progresión de ejercicios básicos.

- **CA-08.1 (EARS - State-driven):** **Cuando** el motor de rutinas genera un nuevo mesociclo tras una cancelación, **el sistema debe** utilizar todas las series y cargas efectivamente ejecutadas durante el ciclo cancelado como base de datos histórica para el cálculo de sobrecarga progresiva y pesos de partida.
- **CA-08.2 (EARS - State-driven):** **Si** un mesociclo fue cancelado habiendo completado **menos del 50% de sus semanas programadas**, **el sistema debe** mantener el mismo conjunto de ejercicios accesorios en el nuevo ciclo para no cortar prematuramente las adaptaciones neuromusculares del bloque interrumpido (permitiendo al atleta reemplazarlos manualmente si así lo desea).
- **CA-08.3 (EARS - State-driven):** **Si** el mesociclo fue cancelado con el **50% o más de sus semanas programadas completadas**, **el sistema debe** aplicar la rotación estándar de ejercicios accesorios estipulada en SPEC-001 RF-10.
- **CA-08.4 (EARS - Ubicuo):** Para los **ejercicios compuestos principales** (press de banca, sentadilla, peso muerto y sus variantes directas según SPEC-001 RF-10), el nuevo mesociclo generado tras una cancelación **adoptará siempre como carga de partida la máxima carga efectiva lograda en el ciclo cancelado** (con RIR ≤ 3), garantizando que la sobrecarga de fuerza básica nunca sufra retrocesos artificiales.
- **CA-08.5 (EARS - State-driven):** **Si** el atleta cancela un mesociclo habiendo acumulado **4 o más semanas de sobrecarga regular consecutivas** y genera inmediatamente un nuevo ciclo, el motor debe detectar la fatiga residual acumulada y programar un ciclo adaptativo acortado con una semana de descarga temprana (a la tercera semana de trabajo), previniendo que el atleta acumule más de 6 semanas continuas sin semana de descarga.

---

### RF-09 — Gestión de cambios de disponibilidad a mitad de ciclo
El sistema debe educar al atleta cuando sus condiciones horarias o semanales cambian antes de terminar su ciclo.

- **CA-09.1 (EARS - Event-driven):** **Cuando** un atleta con un mesociclo activo intenta modificar sus días o tiempos de entrenamiento desde su perfil, **el sistema debe** informarle que una rutina en curso no admite modificaciones estructurales globales y recomendarle formalmente cancelar el ciclo actual para generar uno nuevo con los parámetros actualizados.

---

## 5. Requisitos no funcionales

1. **Ergonomía Mobile-First y Operación a Una Mano (Constitución Art. 2):**
   - Todas las pantallas (formulario de pesaje semanal, wizard de generación con bloques fijos, diálogo modal de cancelación y comparativa de cargas) deben estar rigurosamente optimizadas para anchos de pantalla ≤ 390px.
   - Todas las comparativas de marcas se diseñan en tarjetas verticales apiladas; se prohíbe el scroll horizontal en toda la experiencia.
   - Todos los botones interactivos principales y acciones de confirmación destructiva deben tener una altura mínima de 48px y estar ubicados en la mitad inferior de la pantalla para operarse cómodamente con el pulgar.
2. **Rendimiento de cálculo:**
   - La validación de viabilidad temporal, el cálculo reactivo del selector dinámico y la generación del mesociclo con el Motor V2 debe completarse y responder en un tiempo inferior a 1.5 segundos.
3. **Integridad relacional y consistencia histórica (Constitución Art. 5):**
   - Toda sesión y serie debe mantener claves foráneas (FK) explícitas con integridad referencial garantizada.
   - La cancelación de un mesociclo nunca aplica `DELETE` en cascada sobre las entidades de entrenamiento. Las sesiones no ejecutadas transicionan formalmente al estado `cancelled` para preservar la trazabilidad y los contratos de datos.
   - Se aplica una restricción de unicidad (`UNIQUE WHERE status = 'active'`) por atleta para blindar la base de datos contra múltiples mesociclos activos concurrentes.
4. **Claridad de comunicación y lenguaje en español (Constitución Art. 6):**
   - Toda la interfaz, mensajes de error, etiquetas y descripciones de estado deben expresarse en español sin anglicismos no traducidos (*Semana de descarga*, *Punto de partida*, *Dosis mínima efectiva*, *Fuerza máxima estimada*).
5. **Operabilidad Offline-First (Constitución Art. 1 y SPEC-001 RNF-03):**
   - La funcionalidad de cancelación, registro de pesaje y consulta de historial debe operar íntegramente de forma local en IndexedDB y sincronizarse de manera eventual e idempotente al restablecerse la conectividad.

---

## 6. Casos límite (Edge Cases)

1. **Atleta novato o sin marcas recientes (> 90 días):**
   - Al generar el mesociclo, el punto de partida toma como referencia las estimaciones basales por ratio según experiencia y peso corporal actual (SPEC-001 CA-02.5).
2. **Cancelación inmediata sin sesiones completadas:**
   - Si el atleta genera un mesociclo y lo cancela de inmediato sin haber completado ninguna sesión, el sistema descarta el ciclo sin ensuciar la vista de historial de progreso.
3. **Cancelación con sesión en curso:**
   - Si la cancelación ocurre mientras una sesión está en progreso, las series ya confirmadas se marcan como completadas y se incorporan al historial; la sesión se finaliza automáticamente en ese instante y las series pendientes se cancelan.
4. **Semana sin registro de peso e ingreso retroactivo en lote:**
   - Si el atleta pasa semanas sin registrar peso, puede ingresar de forma retroactiva varios pesajes pendientes en una misma sesión siempre que las fechas calendario de los pesajes guarden al menos 120 horas de separación entre sí.
5. **Intento de registrar peso con valores atípicos abruptos:**
   - Si el atleta registra un peso que difiere en más de un 15% respecto a su pesaje previo (ej. de 80 kg a 65 kg), el sistema solicitará una confirmación visual rápida: *"¿Confirmas que tu peso actual es 65 kg?"* para prevenir errores de tipeo.
6. **Inmutabilidad de registros de sesión ante correcciones de peso:**
   - Si el atleta edita un peso corporal pasado, se actualiza la curva gráfica de peso, pero no se alteran retrospectivamente los valores de 1RM estimado guardados en sesiones de ejercicios calisténicos ya completadas.
7. **Cancelación durante la semana de descarga:**
   - Si la cancelación ocurre durante la semana de deload habiendo completado todas las semanas de sobrecarga, el ciclo se archiva como *"Completado (Descarga omitida)"* sin computar como abandono.
8. **Ejercicios con lastre corporal o asistidos:**
   - En dominadas con lastre, se suma el peso corporal más el lastre. En dominadas asistidas, se resta la asistencia del peso corporal con un piso de 1.0 kg, asegurando sensibilidad métrica y consistencia matemática.
9. **Reconciliación de conflicto de cancelación en dos dispositivos:**
   - Si el dispositivo móvil envía una cancelación tardía generada offline de un mesociclo que ya fue completado en otro dispositivo, el backend preserva el ciclo como completado sin alteración.
10. **Prevención de doble ciclo activo por concurrencia offline:**
    - La restricción de unicidad a nivel de base de datos rechaza la creación de un nuevo mesociclo si el ciclo anterior no ha sido efectivamente marcado como completado o cancelado en el servidor.

---

## 7. Fuera de alcance

- Sincronización automática con básculas inteligentes vía Bluetooth o APIs de salud de terceros (Apple Health, Google Fit, Garmin).
- Carga de fotografías de progreso corporal o mediciones de perímetros con cinta métrica.
- Bloques de tiempo heterogéneos o asimétricos por día dentro de un mismo mesociclo (ej. 45 min el lunes y 90 min el sábado; en este release el bloque es uniforme).
- Edición dinámica de la duración de una sesión individual dentro del mesociclo activo (requiere cancelación y regeneración).
- Exportación del historial de mesociclos y marcas a formatos externos (PDF, CSV, Excel).

---

## 8. Criterios de finalización (Definition of Done de la Épica)

1. El atleta puede registrar su peso semanalmente con delimitación de semana calendario por zona horaria local y guarda temporal de 120 horas basada en la fecha del evento.
2. El atleta puede cargar pesajes retroactivos para semanas vacías y editar pesajes existentes (ajustando valor y día dentro de la misma semana) con advertencia de consistencia, preservando la inmutabilidad de los registros de rendimiento pasados.
3. El wizard de generación V2 permite elegir días secuenciales (1-7), bloques fijos de tiempo uniformes (30 a 120 min) y cantidad homogénea de ejercicios (2 a 7 ej/día, con recomendación dinámica en tiempo real gobernada por contrato OpenAPI/Zod).
4. El motor calcula la viabilidad temporal evaluando la semana pico de volumen, tiempos de ejecución (con multiplicador 1.8× para unilaterales) y descansos fisiológicos.
5. Ante restricciones severas de tiempo, el motor aplica Dosis Mínima Efectiva (DME) y restringe la reducción de series a un piso no menor a 2 series por ejercicio (≥ 6 series semanales por músculo), aplicando una regla jerárquica de poda para respetar el techo fisiológico de 24 series/músculo/semana.
6. Al crearse el mesociclo, se captura el punto de partida inmutable (con filtro de validez de 90 días, desempate por e1RM y normalización de series submáximas con RIR 4–5).
7. El historial de mesociclos se renderiza en tarjetas móviles verticales (cero scroll horizontal) listando ciclos con su estado (*Completado*, *Completado (Descarga omitida)* o *Cancelado*), adherencia proporcional por series acotada al 100% y comparativa *Punto de partida ➔ Carga final* evaluando la serie de mayor fuerza máxima estimada mediante fórmula híbrida Brzycki/Wathan, exhibiendo el delta en kg sobre el 1RM estimado y discriminando con precisión `load_type` (peso corporal resuelto por carry-forward, lastres, asistencias con piso de 1.0 kg y cargas externas).
8. El atleta puede anular su mesociclo activo de manera offline-first con confirmación destructiva; las sesiones pendientes pasan al estado cancelado preservando la integridad relacional (Art. 5 Constitución), garantizando la unicidad de un solo ciclo activo y reconciliación determinista en backend.
9. Los ciclos cancelados con 0 sesiones no saturan el historial, y aquellos con sesiones completadas alimentan la sobrecarga progresiva respetando la regla del 50% para la rotación de accesorios, preservando de manera absoluta la carga acumulada en ejercicios compuestos principales y programando una descarga temprana ante cancelaciones tardías consecutivas para prevenir fatiga acumulada.
10. Toda la interfaz respeta el principio de ergonomía móvil a una mano (≤ 390px, controles en mitad inferior, botones ≥ 48px) y lenguaje 100% en español (Art. 6 Constitución).

---

## 9. Dudas abiertas marcadas como [NECESITA ACLARACIÓN]

- *Ninguna duda abierta.* Todas las ambigüedades, inconsistencias matemáticas y biomecánicas, desempates de series de rendimiento, colisiones temporales de pesajes, casos límite de sincronización multi-dispositivo e interacciones con el catálogo, la capacidad offline y la Constitución han quedado formalmente resueltas y blindadas en este documento de especificación.
