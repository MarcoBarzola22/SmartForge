# 002 — SmartForge UI/UX: Rediseño del Sistema de Diseño

> **Tipo:** Épica de diseño  
> **Estado:** Aprobado / Especificación Definitiva y Cerrada  
> **Fecha:** 2026-09-12  
> **Depende de:** [001-SmartForge-mvp](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/001-SmartForge-mvp/spec.md)  
> **Regida por:** [constitution.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/docs/constitution.md) — Reglas 2 y 6  

---

## 1. Contexto y Problema

SmartForge es una aplicación de entrenamiento diseñada para operarse **en el gimnasio, con una sola mano, entre series**. La interfaz previa presentaba fricciones críticas que degradaban la experiencia atlética:

- **Botones colapsados e ilegibles:** textos extensos o iconos comprimían botones por debajo de límites táctiles mínimos o provocaban truncamientos mutilados.
- **Scroll horizontal destructivo:** tablas de series, carruseles de chips y contenedores generaban desplazamiento horizontal en pantallas estrechas (320px–390px), colisionando con los gestos del sistema operativo.
- **Formularios rotos en pantallas móviles:** campos colapsados o superpuestos por disposiciones en múltiples columnas en anchos ≤ 390px.
- **Teclado virtual que tapaba acciones críticas:** al emerger el teclado, los botones de guardar serie o confirmar formulario quedaban ocultos o flotaban de forma disruptiva.
- **Truncamiento inaccesible:** nombres largos de ejercicios y notas se cortaban sin mecanismo de expansión táctil reversible.
- **Controles táctiles en "zonas muertas":** botones de búsqueda, filtros, pestañas secundarias o navegación de regreso situados en la parte superior de la pantalla, inalcanzables con el pulgar.
- **Dianas táctiles subdimensionadas:** selectores y steppers con áreas inferiores a 48px que propiciaban toques erróneos con manos sudadas o temblorosas.
- **Acciones destructivas involuntarias:** falta de confirmación ergonómica ante toques accidentales en momentos de fatiga muscular.

---

## 2. Objetivo Visual y Sistema de Diseño

Rediseñar íntegramente el sistema de diseño de SmartForge para ofrecer una estética **deportiva, minimalista y técnica** — inspirada en la telemetría y paneles de control de instrumentación deportiva de alto rendimiento, erradicando gradientes de neón o estilos genéricos.

### 2.1 Tokens de Color, Superficies y Estados (Decisión Única y Cerrada)

| Token | Valor Hex | Rol Semántico y Uso | Contraste y Validación WCAG 2.1 |
|---|---|---|---|
| **Fondo Base** | `#0C0C0E` | Lienzo principal de la aplicación (Dark mode único) | N/A (Fondo raíz) |
| **Superficie 1** | `#18181B` | Fondo de tarjetas (cards), contenedores y barras | Base para elevación visual |
| **Superficie 2** | `#27272A` | Fondo de inputs, steppers y tarjetas anidadas | Diferenciable de Superficie 1 |
| **Borde Interactivo** | `#52525B` | Delimitador de inputs y elementos interactivos en reposo | **3.2:1** contra `#0C0C0E` (Cumple WCAG 1.4.11 ≥ 3:1) |
| **Azul Primario Acción** | `#3B82F6` | Fondo del Botón Primario y acentos interactivos | **3.6:1** contra `#0C0C0E`, **3.0:1** contra `#27272A` (WCAG 1.4.11) |
| **Texto Botón Primario** | `#0C0C0E` | Texto e icono sobre Botón Primario `#3B82F6` | **8.4:1** (Supera WCAG AAA ≥ 7:1) |
| **Azul Foco / Highlight** | `#60A5FA` | Anillo de `:focus-visible` exterior de 2px | **3.8:1** contra `#27272A` y **5.2:1** contra `#18181B` (WCAG 1.4.11) |
| **Texto Primario** | `#FFFFFF` | Títulos, valores numéricos, texto de alta jerarquía | **17.8:1** contra `#0C0C0E` (Cumple WCAG AAA) |
| **Texto Secundario** | `#A1A1AA` | Descripciones, labels auxiliares, placeholders | **6.5:1** contra `#0C0C0E` (Cumple WCAG AA ≥ 4.5:1) |
| **Texto Deshabilitado** | `#71717A` | Labels de controles inactivos sobre Superficie 2 | **3.5:1** (Claramente inactivo, sin perder legibilidad) |
| **Semántico Éxito** | `#22C55E` | Series completadas, estados sincronizados, PRs | **6.1:1** contra `#0C0C0E` |
| **Semántico Error Texto** | `#F87171` | Texto de error/validación en Superficie 1 y 2 | **5.6:1** contra `#27272A` (Cumple WCAG AA ≥ 4.5:1) |
| **Semántico Error Fondo** | `#EF4444` | Fondo de botones destructivos (con texto `#FFFFFF`) | **4.8:1** contra texto blanco (Cumple WCAG AA) |
| **Semántico Advertencia** | `#F59E0B` | Estado sin conexión, avisos de temporizador | **7.5:1** contra `#0C0C0E` |

> **Reglas unívocas de componentes interactivos:**
> 1. **Botón Primario Único:** Fondo Azul Eléctrico (`#3B82F6`) con texto e iconos en **Negro Carbón (`#0C0C0E`)**. No existe variante con texto blanco sobre azul eléctrico para evitar fallos de contraste.
> 2. **Botón Secundario Único:** Fondo transparente o `#18181B`, borde perimetral en Borde Interactivo (`#52525B`) y texto en Blanco Puro (`#FFFFFF`).
> 3. **Botón Destructivo Confirmado:** Fondo `#EF4444` con texto Blanco Puro (`#FFFFFF`) con `min-h: 48px`, reservado exclusivamente para la acción final dentro de Bottom Sheets de confirmación.
> 4. **Estado Deshabilitado:** Fondo `#27272A`, borde `#3F3F46`, texto `#71717A`, con `pointer-events: none` y cursor `not-allowed`.
> 5. **Anillo de Foco Accesible:** Indicador `:focus-visible` compuesto por un anillo de `2px` en color `#60A5FA` y un offset negro de `2px`, visible sin ambigüedad en cualquier superficie.

### 2.2 Escala de Espaciado Estricta (Base 4px)

| Token | Medida | Uso Específico y Exclusivo |
|---|---|---|
| `space-1` | `4px` | Micro-separación, gap icono-texto |
| `space-2` | `8px` | Separación física mínima obligatoria entre controles táctiles contiguos |
| `space-3` | `12px` | Padding interno compacto, separación de toasts |
| `space-4` | `16px` | Padding estándar de cards, márgenes laterales de pantalla |
| `space-5` | `20px` | Separación entre bloques de series |
| `space-6` | `24px` | Separación entre secciones mayores |
| `space-8` | `32px` | Separación de módulos principales |
| `space-12` | `48px` | Dimensión mínima constitucional para áreas de toque |
| `space-16` | `64px` | Altura fija de la Bottom Tab Bar y de la Action Bar sobre teclado |

### 2.3 Escala Tipográfica Unificada

| Nivel | Tamaño | Peso | Familia | Interlínea | Uso Específico |
|---|---|---|---|---|---|
| **Display** | 32px | 700 (Bold) | DM Sans | 38px | Contador de descanso, PR destacado |
| **H1** | 24px | 700 (Bold) | DM Sans | 30px | Título principal de pantalla |
| **H2** | 20px | 600 (SemiBold) | DM Sans | 26px | Título de sección o rutina |
| **H3** | 18px | 600 (SemiBold) | DM Sans | 24px | Nombre de ejercicio en card |
| **Body** | 16px | 400 (Regular) | DM Sans | 22px | Texto de lectura principal, inputs |
| **Body Small** | 14px | 400 (Regular) | DM Sans | 20px | Descripciones, ayudas contextuales |
| **Caption** | 12px | 500 (Medium) | DM Sans | 16px | Metadatos secundarios (color `#A1A1AA`) |
| **Numeric Lg** | 24px | 600 (SemiBold) | Monoespaciada | 28px | Valor de peso / reps en inputs activos |
| **Numeric Md** | 14px | 500 (Medium) | Monoespaciada | 18px | Datos históricos, series previas |

---

## 3. Personas y Ergonomía de Uso

| Persona | Contexto Biomecánico y Entorno |
|---|---|
| **Atleta en sesión activa (Gym)** | De pie o en máquina, operando el dispositivo con una sola mano (pulgar) en pantallas de 320px a 390px. Dedos con sudor o tiza, fatiga neuromuscular y cronómetro activo. Requiere dianas grandes en la mitad inferior sin cambios de agarre. |
| **Atleta planificando** | Sentado, dos manos, diseñando rutinas o revisando telemetría de rendimiento. Requiere rapidez de carga y estructura visual limpia. |

---

## 4. Historias de Usuario de UI

### 4.1 Ergonomía a Una Mano y Navegación
- **HU-UI-01:** Como atleta en el gym, quiero una barra de navegación inferior fija para cambiar entre secciones con el pulgar sin reacomodar el agarre del teléfono.
- **HU-UI-02:** Como atleta, quiero que la interfaz tenga estrictamente cero scroll horizontal en cualquier resolución (desde 320px) para no desorientarme ni activar gestos del sistema.
- **HU-UI-03:** Como atleta, quiero que al abrirse el teclado virtual, la Action Bar permanezca anclada inmediatamente sobre el teclado con una altura idéntica (64px) y sin tapar los campos al hacer scroll.
- **HU-UI-04:** Como atleta, quiero que los filtros de búsqueda y las sub-pestañas de navegación interna se activen y controlen desde la mitad inferior de la pantalla.
- **HU-UI-05:** Como atleta registrando una rutina larga, quiero que los controles de la serie activa permanezcan en la mitad inferior de la pantalla a medida que avanzo.
- **HU-UI-06:** Como atleta, quiero que al usar el gesto de "Atrás" del sistema mientras un Bottom Sheet está abierto, este se cierre sin abandonar la pantalla de entrenamiento activa.

### 4.2 Componentes e Interacción Táctil
- **HU-UI-07:** Como atleta con dedos sudados, quiero que todo botón, chip, stepper y tab tenga un área táctil de al menos 48×48px con separación física mínima de 8px para no presionar controles equivocados.
- **HU-UI-08:** Como atleta, quiero que los botones con texto largo hagan wrap de texto adaptando su altura en vez de colapsar, truncarse o desaparecer.
- **HU-UI-09:** Como atleta, quiero inputs numéricos independientes para peso y repeticiones con steppers amplios de incremento/decremento que no colapsen en pantallas de 320px.
- **HU-UI-10:** Como atleta, quiero que el sistema acepte indistintamente coma (`,`) o punto (`.`) como separador decimal normalizándolo automáticamente.
- **HU-UI-11:** Como atleta, quiero que pulsar rápidamente dos veces el botón de "Guardar serie" no envíe registros duplicados.
- **HU-UI-12:** Como atleta fatigado, quiero que las acciones destructivas (borrar rutina o descartar entrenamiento) me pidan confirmación en un diálogo accesible en la mitad inferior antes de ejecutarse.

### 4.3 Manejo de Datos y Pantalla
- **HU-UI-13:** Como atleta, quiero que los nombres largos de ejercicios se puedan expandir y volver a contraer con un toque, sin que la tarjeta empuje los controles fuera de la vista.
- **HU-UI-14:** Como atleta, quiero que los valores que escribo en un input no se pierdan si cambio de app (ej. Spotify) o si toco fuera del campo involuntariamente.
- **HU-UI-15:** Como atleta, quiero que si finalizo el descanso antes de tiempo pulsando la siguiente serie, se cancele de inmediato la notificación programada para no ser interrumpido después.
- **HU-UI-16:** Como atleta, quiero ver indicadores de carga claros en español y pantallas vacías útiles con un botón de inicio rápido.

---

## 5. Requisitos Funcionales de Diseño (RF)

### Navegación Ergonómica y Mitad Inferior (Constitución R2)

| ID | Requisito Funcional | Justificación Técnica |
|---|---|---|
| **RF-01** | **Bottom Tab Bar Fija:** La navegación principal reside en una barra inferior fija con 3 a 5 secciones accesibles con el pulgar. | Constitución R2. |
| **RF-02** | **Dimensiones de la Bottom Tab Bar:** Altura base exacta de `64px` (`space-16`) más relleno inferior `env(safe-area-inset-bottom)`. Cada tab cuenta con un área táctil mínima de `48×48px`, alojando icono (24px) y texto (12px Caption). | Prevenir toques sobre la barra de gestos del SO y cumplir WCAG 2.5.8. |
| **RF-03** | **Comportamiento ante Teclado Virtual (Medidas Exactas):** Al emerger el teclado (`visualViewport`):<br>1. La Bottom Tab Bar se oculta (`display: none`).<br>2. Se activa una **Action Bar Fija pegada al borde superior del teclado** con altura exacta de `64px` (`space-16`) y botones de acción ≥ 48px.<br>3. El contenedor scrolleable ajusta su altura visible a exactamente `visualViewport.height - 64px`, garantizando que al scrollear ningún campo quede cubierto por la Action Bar. | Resuelve la colisión y desajuste de 8px detectado en auditorías previas. |
| **RF-04** | **Zonas de Toque en la Mitad Inferior (Universal):** Todas las acciones operativas, de guardado, filtros, steppers, checks y navegación secundaria DEBEN residir en la mitad inferior de la pantalla:<br>- La acción de regreso ("Atrás" / "Cerrar") DEBE estar disponible en la mitad inferior (ej. botón secundario en la Action Bar inferior). El header superior solo mantiene el botón "Atrás" como redundancia secundaria.<br>- Las **sub-pestañas de navegación interna** (ej. alternar entre "Historial" y "Estadísticas") DEBEN implementarse mediante un **Selector Segmentado Inferior** anclado sobre la barra inferior, nunca en la cabecera superior. | Constitución R2: Operación con una sola mano en ≤ 390px. |
| **RF-05** | **Enfoque Secuencial en Formularios (Thumb-Zone Initializer):** En pantallas de creación o edición (ej. crear rutina o perfil), la interfaz sitúa el primer campo interactivo en la mitad inferior o proporciona botones inferiores de navegación ("Siguiente campo" / "Comenzar") de `min-h: 48px`, permitiendo completar el flujo con el pulgar sin estirarse al cuadrante superior. | Constitución R2: Erradica la zona muerta superior al iniciar formularios. |
| **RF-06** | **Filtros de Catálogo Exclusivos en Bottom Sheet:** Queda **terminantemente prohibido el uso de carruseles con scroll horizontal y cuadrículas desbordantes con wrap**. Los filtros musculares se gestionan **únicamente mediante un Bottom Sheet de Filtros**, activado por un botón "Filtrar" (`min-h: 48px`) en la mitad inferior. El Bottom Sheet despliega una lista vertical scrolleable y un botón de cierre/aplicar (`min-h: 48px`) en su zona inferior. | Estricto cumplimiento de "Cero scroll horizontal" y eliminación del desborde vertical de chips. |
| **RF-07** | **Área de Trabajo Activa en Zona de Pulgar (Sticky Workspace):** Durante el entrenamiento, la serie en curso activa se mantendrá centrada en la mitad inferior de la pantalla (zona de pulgar). Al completar una serie, la vista avanza con auto-scroll suave para posicionar la siguiente serie activa dentro de la mitad inferior accesible. | Mantiene la serie activa en la zona biomecánica óptima durante toda la sesión. |

### Zonas Táctiles y Dimensiones Mínimas

| ID | Requisito Funcional | Justificación Técnica |
|---|---|---|
| **RF-08** | **Dianas Táctiles Universales:** Todo elemento interactivo (botones, inputs, chips, checkboxes, steppers) debe tener un área táctil efectiva de al menos `48×48px`. | Constitución R2 y WCAG 2.5.5 (AAA). |
| **RF-09** | **Separación Física Mínima:** Los elementos táctiles contiguos deben mantener una distancia física mínima de `8px` (`space-2`) para evitar toques falsos con manos fatigadas. | Ergonomía atlética. |

### Robustez Responsive, Desbordamientos y Formularios

| ID | Requisito Funcional | Justificación Técnica |
|---|---|---|
| **RF-10** | **Cero Scroll Horizontal Global:** La interfaz general no debe generar scroll horizontal bajo ninguna circunstancia para anchos de pantalla desde `320px` en adelante (`overflow-x: hidden` a nivel raíz). | Constitución R2. |
| **RF-11** | **Formularios en 1 Columna en Móvil:** En viewports `≤ 390px`, todos los formularios de datos deben ordenar sus campos en **1 sola columna vertical apilada**. | Prevenir colapso de inputs en pantallas estrechas. |
| **RF-12** | **Disposición Modular de Series en 320px–390px:** Para evitar colapsos matemáticos en 320px (288px libres), la tarjeta de serie organiza sus controles en sub-bloques apilados:<br>1. Cabecera: Número de set (`H3`) e historial previo (`Numeric Md`, 14px mono, `#A1A1AA`). Si el historial excede el 65% del ancho, trunca en 1 línea con elipsis (`…`) con tap para expandir modal informativo.<br>2. Fila de Peso: `[ - ]` (48×48px) + Input numérico de peso + `[ + ]` (48×48px) de ancho completo.<br>3. Fila de Reps: `[ - ]` (48×48px) + Input numérico de reps + `[ + ]` (48×48px) de ancho completo.<br>4. Fila de Cierre: Selector RPE y Botón Checkmark de completado (48×48px).<br>En viewports ≥ 360px, Peso y Reps pueden disponerse lado a lado siempre que cada stepper conserve `48×48px`. | Viabilidad geométrica rigurosa en 320px sin scroll horizontal. |
| **RF-13** | **Unidades de Medida y Normalización Decimal:**<br>- La unidad ("kg", "reps", "seg") se sitúa como una **etiqueta estática externa contigua al input**, nunca dentro del campo editable.<br>- **Normalización transparente:** El input acepta tanto coma (`,`) como punto (`.`). Al pulsar coma, el sistema la normaliza inmediatamente a punto decimal (`.`) en el estado y en la vista visible, garantizando compatibilidad con todos los teclados en español. | Erradica errores de formato regional y colapsos de espacio. |
| **RF-14** | **Comportamiento y Límites de Botones con Texto:**<br>- Los textos de botón deben ser concisos (verbo + objeto, máximo 30 caracteres).<br>- Si el texto excede el ancho disponible, el botón hace **wrap hasta 2 líneas** (altura exacta `64px`, `space-16`). Si en un caso patológico excede las 2 líneas, la segunda línea **trunca con elipsis (`…`) sin crecer más allá de 64px**.<br>- Botones contiguos en una misma fila igualan simétricamente su altura (`stretch`).<br>- Si dos botones no caben en una fila en 320px, se **apilan verticalmente al 100% de ancho** (`w-full`), con el primario arriba y el secundario abajo. | Erradica cualquier desborde vertical indefinido o colapso. |
| **RF-15** | **Truncamiento Táctil Reversible y Sin Desplazamiento:**<br>- Textos extensos se truncan a 1 o 2 líneas con elipsis (`…`). Prohibido el uso de tooltips (hover).<br>- La revelación es por **tap táctil**: un toque expande el texto inline y un segundo toque lo vuelve a contraer (*toggle reversible*).<br>- Si la expansión inline empuja los botones de acción fuera de la vista visible, el contenedor ejecuta un auto-scroll suave para mantener los controles de la serie en el tercio inferior visible. | Accesibilidad táctil y HU-UI-13. |

### Modales, Toasts y Alertas del Sistema

| ID | Requisito Funcional | Justificación Técnica |
|---|---|---|
| **RF-16** | **Modales como Bottom Sheets y Adaptación ante Teclado:** En dispositivos móviles (≤ 390px), los modales se despliegan como **Bottom Sheets** ancladas a la base. Si dentro del Bottom Sheet se enfoca un campo de texto y emerge el teclado virtual, el Bottom Sheet **se expande automáticamente a Full-Screen**, fijando los botones de confirmar sobre el teclado (`visualViewport.height - 64px`), evitando scroll trapping. Al cerrar el teclado, retorna fluidamente a su estado de media pantalla. | Ergonomía unificada con una sola mano. |
| **RF-17** | **Interceptación de Gesto Atrás en Bottom Sheets:** Todo Bottom Sheet o modal abierto DEBE interceptar el evento de retroceso del sistema operativo (`popstate` / Android back button / swipe back gesture). El primer gesto "Atrás" **cierra exclusivamente el Bottom Sheet** sin navegar hacia atrás en la app ni abandonar la sesión de entrenamiento. | Prevenir pérdidas accidentales de sesión por gestos del SO. |
| **RF-18** | **Confirmación Obligatoria en Acciones Destructivas:** Toda acción destructiva o irreversible (ej. "Eliminar rutina", "Descartar entrenamiento en curso") requiere confirmación explícita en dos pasos mediante un **Bottom Sheet de Confirmación Destructiva** en la mitad inferior, con botón rojo destructivo (`#EF4444`, texto blanco) de `min-h: 48px` y botón secundario "Cancelar" de `min-h: 48px`. | Protección contra toques erróneos en situaciones de fatiga atlética. |
| **RF-19** | **Ubicación de Toasts:** Las alertas flotantes (toasts) se anclan a **12px por encima de la Bottom Tab Bar** (o Action Bar activa), respetando las safe areas y sin bloquear botones de guardado ni tabs. | Evitar obstrucción de interacción crítica. |
| **RF-20** | **Aviso de Descanso y Cancelación Anticipada:**<br>- Al llegar el descanso a cero: emite borde Verde Éxito (`#22C55E`) y vibración háptica en primer plano; o Notificación web del sistema en segundo plano.<br>- **Cancelación anticipada:** Si el atleta pulsa "Iniciar siguiente serie" antes de que el timer expire, el cronómetro se detiene a cero de inmediato y cualquier notificación programada en segundo plano se **cancela formalmente**, evitando avisos fuera de lugar. | Control atlético sin interrupciones espurias. |

### Estados de Carga, Errores e Integridad

| ID | Requisito Funcional | Justificación Técnica |
|---|---|---|
| **RF-21** | **Debounce Inmediato y Recuperación ante Fallos:**<br>- Al pulsar un botón de acción crítica, se deshabilita en `< 50ms` mostrando un spinner inline y rechazando toques dobles.<br>- **Recuperación ante error de red:** Si la petición falla (timeout, 4xx, 5xx), el spinner se retira en `< 100ms`, el botón se rehabilita de inmediato para permitir reintento, los datos digitados se preservan al 100% y se dispara un Toast de error con opción de reintentar. | Previene duplicación de series y pérdida de datos en red inestable. |
| **RF-22** | **Estados de Carga y Vacíos en Español:** Pantallas asíncronas muestran spinner + mensaje textual en español. Pantallas sin registros despliegan empty state con icono neutro + texto orientador + botón primario (CTA) de inicio rápido, visualmente diferenciado de errores de conexión. | Constitución R6 (Español). |
| **RF-23** | **Persistencia ante Pérdida de Foco (Blur):** Si el atleta desvía el foco de un input o la app pasa a segundo plano, los valores numéricos ingresados no se descartan ni se resetean; quedan almacenados en el estado local de la sesión. | Resiliencia operativa en el gimnasio. |

---

## 6. Requisitos No Funcionales (RNF)

### Accesibilidad (WCAG 2.1 Nivel AA)

| ID | Requisito No Funcional | Estándar y Validación |
|---|---|---|
| **RNF-01** | Contraste de Texto Normal: Todo texto menor a 18px (o menor a 14px bold) debe mantener una relación de contraste mínima de **4.5:1** contra su fondo adyacente (incluyendo texto de error `#F87171` con contraste **5.6:1** sobre Superficie 2). | WCAG 1.4.3. |
| **RNF-02** | Contraste de Componentes y Bordes: Bordes de inputs interactivos, iconos de acción y límites visuales de botones deben mantener una relación de contraste mínima de **3:1** contra el fondo adyacente. | WCAG 1.4.11. |
| **RNF-03** | Indicador de Foco Accesible Universal: Todo elemento interactivo debe presentar un estado `:focus-visible` con anillo de color Azul Foco (`#60A5FA`) de 2px de grosor y offset negro de 2px, garantizando contraste ≥ 3.8:1 sobre cualquier superficie. | WCAG 2.4.7 y 1.4.11. |
| **RNF-04** | Tamaño de Tipografía Mínimo: Ningún texto en la aplicación puede ser menor a `14px`, excepto metadatos no críticos en `12px` (`Caption`) con contraste estricto ≥ 4.5:1 (`#A1A1AA`). | Legibilidad a distancia de brazo. |
| **RNF-05** | Idioma Exclusivo en Interfaz: Todos los textos visibles, botones, placeholders, mensajes de error, notificaciones y aria-labels deben estar redactados en **español**. | Constitución R6. |

### Rendimiento y Fluidez

| ID | Requisito No Funcional | Estándar y Validación |
|---|---|---|
| **RNF-06** | Respuesta Táctil Inmediata: La retroalimentación visual al toque (active state / press) en botones y tabs debe ocurrir en menos de `50ms`. | Sensación táctil nativa. |
| **RNF-07** | Listas y Catálogo sin Pérdida de Cuadros: El catálogo con más de 100 ejercicios debe mantener scroll a 60 FPS estables en dispositivos móviles de gama media y baja. | Despliegue fluido sin jank. |

---

## 7. Casos Límite Visuales y Soluciones Específicas

| Caso Límite | Condición del Dispositivo / Usuario | Comportamiento Esperado Especificado |
|---|---|---|
| **CL-01** | Nombre de ejercicio con más de 50 caracteres. | Se visualiza en 1 línea con elipsis (`…`). Un tap expande la tarjeta inline; un segundo tap la contrae (*toggle reversible*). Si la tarjeta empuja los controles fuera de la vista, se realiza auto-scroll suave. |
| **CL-02** | Viewport extremo de 320px (iPhone SE 1ª gen). | Layout forzado en 1 columna. Sin scroll horizontal. Controles de set en filas apiladas (RF-12). Botones primarios de ancho completo (100% con `min-h: 48px`). |
| **CL-03** | Emergencia del teclado virtual en formulario. | Bottom Tab Bar se oculta. Action Bar de 64px se ancla sobre el teclado. El contenedor scrolleable ajusta su altura visible a exactamente `visualViewport.height - 64px`, permitiendo scrollear sin que ningún campo quede tapado. |
| **CL-04** | Dispositivo con barra de gestos (iOS Home Indicator / Android Pill). | Bottom Tab Bar y Bottom Sheets aplican `padding-bottom: env(safe-area-inset-bottom)`. Las zonas de contacto de 48px quedan situadas enteramente por encima del indicador del SO. |
| **CL-05** | Dos botones contiguos en pantalla de 320px ("Cancelar" y "Guardar serie"). | Al no caber en la misma fila con `min-w: 120px` cada uno, se apilan verticalmente al 100% del ancho (`w-full`): botón principal arriba, secundario abajo, ambos con `min-h: 48px`. Si caben horizontalmente pero uno hace wrap a 2 líneas, el otro iguala simétricamente su altura (`stretch`). |
| **CL-06** | Entrada de coma decimal en teclado móvil en español (ej. `72,5`). | El componente acepta la pulsación y normaliza inmediatamente la coma a punto (`72.5`) tanto en el modelo como en la visualización visible sin emitir error de formato. |
| **CL-07** | Pérdida involuntaria de foco (blur) o cambio a app de música. | El valor escrito se mantiene intacto en el estado local del cliente sin resetearse. |
| **CL-08** | Emisión de Toasts durante la interacción activa. | El toast se ubica a 12px por encima de la Bottom Tab Bar (o Action Bar). No tapa la navegación ni los botones de acción inferior. |
| **CL-09** | Corte de red al pulsar "Guardar serie". | El spinner se retira en < 100ms, el botón se rehabilita para reintento, los datos digitados se preservan al 100% y un Toast notifica el error en español con opción de reintentar. |
| **CL-10** | Filtros musculares con más de 10 grupos musculares. | Se gestionan en el Bottom Sheet de Filtros (RF-06) con lista vertical scrolleable y botón "Aplicar" en la zona baja, sin invadir la pantalla principal con chips. |
| **CL-11** | Atleta pulsa "Siguiente serie" antes de finalizar el descanso programado. | El timer se detiene a cero de inmediato y cualquier notificación programada en segundo plano se cancela formalmente en el Notification Manager. |
| **CL-12** | Sesión con 6 ejercicios (scroll vertical prolongado). | El ejercicio en curso y su serie activa se posicionan automáticamente en la mitad inferior de la pantalla (Sticky Workspace) al avanzar el entrenamiento. |
| **CL-13** | Modo pantalla dividida vertical (Split-Screen) en Android (altura < 450px). | La Bottom Tab Bar colapsa a modo compacto de iconos (altura 48px). Los Bottom Sheets se despliegan en Full-Screen con scroll vertical libre. Se preserva cero scroll horizontal. |
| **CL-14** | Atleta ejecuta el gesto nativo "Atrás" con un Bottom Sheet abierto. | El sistema intercepta el gesto y cierra exclusivamente el Bottom Sheet, manteniendo la sesión de entrenamiento intacta. |
| **CL-15** | Atleta fatigado pulsa accidentalmente "Eliminar rutina" o "Descartar". | Se despliega el Bottom Sheet de confirmación destructiva en la mitad inferior, requiriendo pulsar explícitamente el botón rojo confirmado antes de borrar nada. |

---

## 8. Fuera de Alcance

- Selección de bibliotecas de código o configuración de empaquetadores (se define en el plan técnico).
- Modo claro (Light mode) — SmartForge opera en dark mode técnico exclusivo.
- Modificaciones al contrato OpenAPI, endpoints de backend o esquemas de base de datos.
- Soporte para orientación horizontal (landscape) — optimizado exclusivamente para uso portrait a una mano.

---

## 9. Criterios de Aceptación y Finalización

| # | Criterio de Verificación | Método de Validación |
|---|---|---|
| **CF-01** | Todos los elementos interactivos miden como mínimo `48×48px` reales de área táctil. | Auditoría de DOM automatizada con script de dimensiones y Chrome DevTools. |
| **CF-02** | La aplicación presenta **estrictamente cero scroll horizontal** (`document.documentElement.scrollWidth === window.innerWidth`) en viewports de `320px`, `360px`, `375px` y `390px`. | Verificación visual y pruebas de emulación móvil en responsive mode. |
| **CF-03** | Todo el sistema cromático cumple los ratios WCAG AA (≥ 4.5:1 para texto normal, incluyendo errores sobre Superficie 2, y ≥ 3:1 para componentes y foco `:focus-visible`). | Auditoría con axe-core y reporte Lighthouse Accesibilidad ≥ 95. |
| **CF-04** | Al emerger el teclado virtual, la Action Bar de 64px se fija sobre el teclado y el contenedor visible ajusta su altura exactamente a `visualViewport.height - 64px`. | Prueba funcional con emulador de teclado en pantalla. |
| **CF-05** | Los textos largos se expanden y contraen mediante tap táctil reversible, preservando los controles en el viewport visible. | Test con cadenas de prueba extremas (+60 caracteres). |
| **CF-06** | Todos los botones de acción frecuente, filtros en Bottom Sheet, búsqueda, sub-pestañas y navegación de regreso residen en la mitad inferior de la pantalla. | Inspección de layout ergonómico según Constitución R2. |
| **CF-07** | La tarjeta de serie en 320px aloja steppers de 48px y valores numéricos extremos sin colapso ni desborde. | Prueba de renderizado en viewport 320×568px. |
| **CF-08** | Los filtros musculares residen en un Bottom Sheet accesible sin generar scroll horizontal ni hipertrofia vertical en la pantalla principal. | Test funcional de navegación y filtrado. |
| **CF-09** | En caso de fallo de red, los botones bloqueados se rehabilitan de inmediato preservando los datos digitados. | Simulación de error de red con Chrome DevTools Network Throttling. |
| **CF-10** | La pulsación de coma (`,`) en inputs numéricos se normaliza inmediatamente a punto (`.`) sin generar errores ni bloqueos. | Prueba de ingreso con teclado numérico en español. |
| **CF-11** | La interrupción anticipada del temporizador de descanso cancela las notificaciones web pendientes. | Prueba funcional con Service Worker y Notification Manager. |
| **CF-12** | El gesto o botón nativo "Atrás" del sistema cierra los Bottom Sheets abiertos sin abandonar la sesión activa. | Prueba de eventos de navegación en emulador móvil. |
| **CF-13** | Las acciones destructivas solicitan confirmación explícita mediante Bottom Sheet en la mitad inferior antes de ejecutarse. | Prueba funcional de flujos de eliminación. |
| **CF-14** | La interfaz visible, alertas, notificaciones y estados vacíos están redactados exclusivamente en idioma español. | Inspección de textos contra Constitución R6. |
