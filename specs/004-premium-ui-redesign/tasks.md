# Tareas de Implementación — 004-premium-ui-redesign: Rediseño Visual Premium

> **Épica:** Rediseño Visual Premium (Design System Lovable)  
> **Especificación:** [specs/004-premium-ui-redesign/spec.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/004-premium-ui-redesign/spec.md)  
> **Plan Técnico:** [specs/004-premium-ui-redesign/plan.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/004-premium-ui-redesign/plan.md)  
> **Constitución:** [docs/constitution.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/docs/constitution.md) (R2 One-Hand Mobile, R4 Tests, R6 Español)  
> **Prototipo de Referencia:** `_lovable_reference` (Solo lectura)  
> **Duración estimada por tarea:** 20–30 minutos  

---

## Fase 1: Configuración Global (Tailwind, CSS Vars, index.css)

- [x] **T-01: Extensión del sistema de colores y sombras glow en `tailwind.config.js`**
  - **RF cubiertos:** RF-01, RF-04, RNF-01, Plan §3.1
  - **Archivos:** `frontend/tailwind.config.js`
  - **Descripción:** Extender la configuración de Tailwind con los tokens cromáticos de `_lovable_reference` (`ink`, `shell`, `surface-elevated`, `brand`, `brand-focus`, `neon`, `success`, `amber`, `fatigue`, `fatigue-text`, `line`, `line-strong`, `content`, `content-2`, `content-3`) y registrar utilidades de sombra volumétrica con glow (`shadow-neon/10`, `shadow-neon/20`, `shadow-brand/10`, `shadow-brand/30`, `shadow-amber/30`, `shadow-success/20`, `shadow-success/30`, `shadow-brand/5`). Preservar los tokens hexadecimales preexistentes como fallback para asegurar retrocompatibilidad con los tests de auditoría.
  - **Hecho cuando:** Las clases utilitarias (`bg-ink`, `bg-shell`, `bg-surface-elevated`, `text-neon`, `shadow-neon/20`, `shadow-brand/30`) compilan sin advertencias en Vite y `npm test src/audit/colorTokens.test.ts` pasa al 100%.

- [x] **T-02: Definición de variables CSS OKLCH y utilidades avanzadas en `src/index.css`**
  - **RF cubiertos:** RF-01, RF-04, RF-05, Plan §3.2
  - **Archivos:** `frontend/src/index.css`
  - **Descripción:** Registrar en `:root` y en el bloque `@theme inline` las variables de color OKLCH extraídas de `_lovable_reference/src/styles.css` (`--shell`, `--base`, `--surface-1`, `--surface-2`, `--surface-elevated`, `--brand-primary`, `--brand-focus`, `--neon-progress`, `--neon-progress-muted`, `--amber-energy`, `--fatigue-red`, `--fatigue-text`, `--content-primary`, `--content-secondary`, `--content-disabled`, `--border-subtle`, `--border-interactive`). Implementar las utilidades CSS nativas: `@utility glass` (`color-mix` 90% con `backdrop-filter: blur(24px)`), `@utility hero-gradient`, `@utility top-gradient`, `@utility progress-gradient` con `@keyframes shimmer` (desplazamiento en 3s) y `@utility press` (`active:scale(0.97)` en 100ms).
  - **Hecho cuando:** Las clases utilitarias `.glass`, `.hero-gradient`, `.top-gradient`, `.progress-gradient` y `.press` están activas en el bundle CSS generado y se comprueba en el navegador que `.press` produce una compresión de `0.97` en el estado activo.

- [x] **T-03: Optimización de tipografías y metadatos en `index.html`**
  - **RF cubiertos:** RF-01, RNF-04, Plan §3.3
  - **Archivos:** `frontend/index.html`
  - **Descripción:** Configurar la preconexión e importación de Google Fonts para soportar los pesos completos requeridos por el prototipo: `DM Sans` (pesos 400, 500, 700, 800) y `JetBrains Mono` (pesos 500, 600, 700). Actualizar la etiqueta `<meta name="theme-color">` al tono carbón/negro OLED oficial (`#0C0C0E`).
  - **Hecho cuando:** La llamada `document.fonts.check("700 16px 'DM Sans'")` y `document.fonts.check("700 24px 'JetBrains Mono'")` retornan `true` en el entorno de ejecución sin requerir fuentes de respaldo del sistema.

---

## Fase 2: Refactorización de Primitivos UI (Botones, Cards, Inputs, Steppers, Modales)

- [x] **T-04: Refactorización de `Button.tsx` con efecto `press` y variantes glow cromáticas**
  - **RF cubiertos:** RF-02, RF-04, RF-05, RNF-01, Plan §4.1
  - **Archivos:** `frontend/src/components/ui/Button.tsx`, `frontend/src/components/ui/Button.test.tsx`
  - **Descripción:** Incorporar la clase utilitaria `press` en los estilos base de `buttonVariants`. Actualizar las variantes visuales para incorporar los glows del prototipo: `primary` / `brand` (`bg-brand text-content shadow-lg shadow-brand/30 hover:bg-brand/90`), `success` (`bg-success text-ink font-extrabold shadow-lg shadow-success/30`), `amber` (`bg-amber text-ink font-bold shadow-lg shadow-amber/30`) y `fatigue` / `destructive` (`bg-fatigue/15 text-fatigue-text hover:bg-fatigue/25`). Añadir soporte para altura maestra de 56px (`min-h-14`) para la acción principal de registro de serie, preservando el debounce de 50ms contra toques dobles.
  - **Hecho cuando:** `npm test src/components/ui/Button.test.tsx` pasa al 100%, validando que el botón conserva un área táctil ≥ 48px, rechaza clicks repetidos en < 50ms y aplica la clase `press` y los estilos de sombra cromática especificados.

- [x] **T-05: Refactorización de `Card.tsx` con radio `rounded-2xl`, sombras sutiles y variantes hero/elevated**
  - **RF cubiertos:** RF-02, RF-03, RF-04, Plan §4.2
  - **Archivos:** `frontend/src/components/ui/Card.tsx`, `frontend/src/components/ui/Card.test.tsx`
  - **Descripción:** Modificar el contenedor base de `Card` para adoptar el radio `rounded-2xl` (16px), fondo `bg-surface-1`, delimitador `border border-line` y sombra `shadow-lg shadow-brand/5`. Añadir soporte mediante props o variantes para tarjeta de alta prioridad (`variant="elevated"` con `bg-surface-elevated` y corona `top-gradient h-1`) y tarjeta de bloque (`variant="hero"` con `hero-gradient` y `shadow-lg shadow-brand/10`).
  - **Hecho cuando:** `npm test src/components/ui/Card.test.tsx` pasa exitosamente y las tarjetas se adaptan fluidamente a anchos desde 320px sin generar scroll horizontal.

- [x] **T-06: Refactorización de `Input.tsx` con fondo `surface-2`, borde interactivo y tipografía técnica**
  - **RF cubiertos:** RF-02, RF-03, RF-09, RNF-01, Plan §4.3
  - **Archivos:** `frontend/src/components/ui/Input.tsx`, `frontend/src/components/ui/Input.test.tsx`
  - **Descripción:** Actualizar el input para renderizar sobre contenedor `rounded-xl bg-surface-2 border border-line-strong text-content`. Configurar el indicador de foco accesible con `focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:border-brand-focus`. Asegurar que las etiquetas de unidad contiguas ("kg", "reps") utilicen `font-mono text-xs font-semibold text-content-2` con posicionamiento absoluto protegido, preservando la normalización instantánea de coma a punto.
  - **Hecho cuando:** `npm test src/components/ui/Input.test.tsx` pasa al 100%, comprobando que el input mide ≥ 48px de alto, normaliza `82,5` a `82.5` y no superpone la unidad con el texto digitado.

- [x] **T-07: Creación del componente primitivo táctil `Stepper.tsx` (Patrón 3 Columnas Lovable)**
  - **RF cubiertos:** RF-02, RF-03, RF-05, Plan §4.5
  - **Archivos:** `frontend/src/components/ui/Stepper.tsx`, `frontend/src/components/ui/Stepper.test.tsx`
  - **Descripción:** Implementar el componente táctil reutilizable basado fielmente en `_lovable_reference/src/components/forge/SessionView.tsx`: contenedor en `rounded-xl bg-surface-2 p-3`, etiqueta superior en mayúsculas `text-[11px] uppercase tracking-wider text-content-2`, y cuadrícula de tres columnas `grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2`. Columna izquierda botón restar `[ - ]` (48×48px con `press`, `border-line-strong` y `bg-surface-1`), centro valor en `font-mono text-2xl font-bold text-content` con unidad legible contigua, y columna derecha botón sumar `[ + ]` (48×48px con `press`).
  - **Hecho cuando:** `npm test src/components/ui/Stepper.test.tsx` pasa, verificando que los botones de incremento/decremento tienen tamaño exacto de 48×48px, aplican el paso (`step`) configurado respetando límites mínimos y formatean los decimales correctamente.

- [x] **T-08: Creación del componente primitivo de telemetría `Sparkline.tsx` (Gráfico Vectorial SVG)**
  - **RF cubiertos:** RF-12, RNF-02, Plan §4.5
  - **Archivos:** `frontend/src/components/ui/Sparkline.tsx`, `frontend/src/components/ui/Sparkline.test.tsx`
  - **Descripción:** Implementar el componente gráfico vectorial SVG ligero basado en `_lovable_reference/src/components/forge/ProfileView.tsx`: renderizado responsivo con `viewBox="0 0 300 64"` y `preserveAspectRatio="none"`, cálculo dinámico de puntos de curva, gradiente lineal de relleno semitransparente (`linearGradient` con opacidad 0.35 a 0), trazo nítido de 2.5px en `stroke="currentColor"` (`text-success`) y círculo de anclaje de radio 4px en la última muestra.
  - **Hecho cuando:** `npm test src/components/ui/Sparkline.test.tsx` valida que para una serie de pesos dada (ej. `[84.2, 83.9, 83.5, 82.7]`) se genera el string `d` de path SVG correspondiente y se renderiza el nodo circular en la coordenada final.

- [x] **T-09: Refactorización de `AlertDialog.tsx` y `Sheet.tsx` al estilo Bottom Sheet Lovable**
  - **RF cubiertos:** RF-02, RF-10, RNF-01, Plan §4.4
  - **Archivos:** `frontend/src/components/ui/AlertDialog.tsx`, `frontend/src/components/ui/Sheet.tsx`
  - **Descripción:** Actualizar las ventanas modales emergentes para adoptar la apariencia de Bottom Sheets modernos: contenedor anclado a la base (`bottom-0`) con esquinas superiores `rounded-t-2xl`, fondo `bg-surface-1`, delimitador `border-t border-line-strong` y sombra `shadow-2xl`. Fondo de backdrop difuminado `bg-black/75 backdrop-blur-sm`. Configurar botones de confirmación destructiva con estilo `bg-fatigue text-white min-h-[48px]` y cancelación en `bg-surface-2 text-content`.
  - **Hecho cuando:** `npm test src/components/ui/AlertDialog.test.tsx` y `npm test src/components/ui/Sheet.test.tsx` pasen al 100%, garantizando área táctil de botones ≥ 48px y preservación de intercepción de eventos `popstate`.

- [x] **T-10: Refactorización de `Badge.tsx`, `Toast.tsx` y contenedores de feedback**
  - **RF cubiertos:** RF-04, RF-05, RF-10, Plan §4.4
  - **Archivos:** `frontend/src/components/ui/Badge.tsx`, `frontend/src/components/ui/Toast.tsx`
  - **Descripción:** Adaptar los componentes auxiliares: `Badge` con radio `rounded-full` y variantes de baja opacidad con texto saturado (`bg-neon/15 text-neon`, `bg-success/15 text-success`, `bg-amber/15 text-amber`, `bg-surface-2 text-content-2`). Actualizar `ToastContainer` y `Toast` para utilizar fondo de cristal `glass border border-white/5 shadow-xl` situado a exactamente `bottom-[76px]` (sobre la barra inferior), manteniendo los mensajes e indicadores en español.
  - **Hecho cuando:** `npm test src/components/ui/Toast.test.tsx` pasa sin errores y los badges renderizan con las clases de opacidad y radio `rounded-full` especificadas.

---

## Fase 3: Integración en Vistas (Tomando como Plantilla Exacta el JSX de `_lovable_reference/`)

- [x] **T-11: Modernización de Layout y Barra de Navegación (`MobileLayout.tsx` & `BottomNav.tsx`)**
  - **RF cubiertos:** RF-01, RF-02, RF-03, RF-06, Plan §5.1, §5.2
  - **Archivos:** `frontend/src/components/layout/MobileLayout.tsx`, `frontend/src/components/navigation/BottomNav.tsx`
  - **Descripción:** Configurar `MobileLayout` con fondo exterior `bg-shell` (`#000000`), encuadre central móvil `max-w-[390px] mx-auto min-h-screen bg-ink relative overflow-x-hidden border-x border-line/40` y padding inferior dinámico (`pb-28` estándar / `pb-56` cuando la pestaña activa sea `session`). Transformar `BottomNav` tomando la estructura exacta de `_lovable_reference/src/routes/index.tsx`: contenedor `glass relative grid grid-cols-4 border-t border-white/5 px-2 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]`, barra indicadora deslizante superior (`absolute top-0 h-0.5 w-1/4 bg-brand shadow-lg shadow-brand/50 transition-all duration-200` con cálculo dinámico de `left`), y botones de pestaña con clase `press`, área táctil ≥ 48px, icono activo en `text-brand-focus` e inactivo en `text-content-3`.
  - **Hecho cuando:** `npm test src/components/navigation/BottomNav.test.tsx` y `npm test src/components/layout/MobileLayout.test.tsx` pasen al 100% y se valide que el indicador superior se traslada suavemente al alternar entre pestañas.

- [x] **T-12: Integración en Sesión: Cabecera En Vivo y Selector de Ejercicios (`SessionPage.tsx`, `ActiveExerciseWorkspace.tsx`)**
  - **RF cubiertos:** RF-02, RF-03, RF-04, RF-05, Plan §6.1
  - **Archivos:** `frontend/src/pages/session/SessionPage.tsx`, `frontend/src/pages/session/ActiveExerciseWorkspace.tsx`
  - **Descripción:** Integrar el patrón exacto de cabecera de `_lovable_reference/src/components/forge/SessionView.tsx`: cabecera flotante `glass sticky top-0 z-20 -mx-4 -mt-4 border-b border-white/5 px-4 pb-3 pt-4`, indicador "EN VIVO" con punto luminoso doble (`relative flex h-2.5 w-2.5` con `animate-ping bg-success`) y contador de tiempo en `font-mono`, botón "Finalizar" con clase `press bg-fatigue/15 px-4 text-[13px] font-bold text-fatigue-text min-h-12 rounded-xl`, y barra de progreso superior animada con `progress-gradient` y `transition-all duration-500`. Envolver el selector de ejercicio en una tarjeta `rounded-2xl border border-line bg-surface-1 p-2` con botones chevron de navegación de 48×48px (`bg-surface-2 text-content disabled:opacity-30 press`) y título con animación `animate-in fade-in duration-200`.
  - **Hecho cuando:** `npm test src/pages/session/ActiveExerciseWorkspace.test.tsx` pase exitosamente y el header muestre el beacon animado y la barra con gradiente continuo sin alterar las llamadas a `onFinishSession`.

- [x] **T-13: Integración en Sesión: Tarjeta de Sobrecarga Progresiva y Alerta Técnica**
  - **RF cubiertos:** RF-04, RF-05, RF-07, RF-11, Plan §6.1
  - **Archivos:** `frontend/src/pages/session/SessionPage.tsx`, `frontend/src/pages/session/ActiveExerciseWorkspace.tsx`
  - **Descripción:** Integrar la tarjeta de recomendación de sobrecarga progresiva tomando la plantilla exacta de `_lovable_reference/src/components/forge/SessionView.tsx`: contenedor `bg-surface-elevated rounded-2xl border border-line shadow-lg shadow-neon/10` con línea corona `top-gradient h-1`, badge superior de acción con icono `TrendingUp` ("Incrementar carga") animado con `animate-pulse` en `bg-neon/15 text-neon shadow-lg shadow-neon/20`, bloque de carga sugerida en `font-mono text-4xl font-bold text-content` con delta en verde neón (`+X kg vs. sesión anterior`), bloque de objetivo en `font-mono text-2xl font-bold` y justificación en prosa con tipografía `text-[13px] leading-relaxed text-content-2`. Añadir la tarjeta de advertencia técnica con borde izquierdo `border-l-4 border-amber bg-amber/10 p-3` e icono `AlertTriangle`.
  - **Hecho cuando:** La tarjeta de sobrecarga progresiva renderiza la carga recomendada, el badge pulsante y la justificación técnica en español respetando estrictamente el layout de Lovable.

- [x] **T-14: Integración en Sesión: Registro de Series, RIR y Botón Maestro (`SetLogger.tsx`, `ModularSetCard.tsx`)**
  - **RF cubiertos:** RF-02, RF-03, RF-05, RF-09, Plan §6.1
  - **Archivos:** `frontend/src/pages/session/SetLogger.tsx`, `frontend/src/pages/session/ModularSetCard.tsx`
  - **Descripción:** Reemplazar los controles de registro de serie adoptando la plantilla JSX exacta de `_lovable_reference/src/components/forge/SessionView.tsx`: las series ya completadas se listan en filas de `min-h-12 items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-3` con icono checkmark en círculo verde (`bg-success text-ink`) y datos en `font-mono`. La serie en curso utiliza el nuevo `Stepper` para Carga (kg) y Repeticiones (reps). El selector de RIR se organiza en cuadrícula de 5 columnas (`grid grid-cols-5 gap-2`) con botones de 48px `rounded-full font-mono text-sm font-bold press`, activo en `bg-brand text-content shadow-lg shadow-brand/30` e inactivo en `bg-surface-2 text-content-2`. El botón maestro de guardado se implementa como `press flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-success text-ink font-extrabold shadow-lg shadow-success/30` con texto "Registrar Serie".
  - **Hecho cuando:** `npm test src/pages/session/SetLogger.test.tsx` y `npm test src/pages/session/ModularSetCard.test.tsx` pasen al 100%, verificando que la lógica de guardado offline en `offlineStore` permanece intacta.

- [x] **T-15: Integración en Sesión: Barra de Temporizador de Descanso (`RestTimerBar.tsx`)**
  - **RF cubiertos:** RF-02, RF-04, RF-08, Plan §6.1
  - **Archivos:** `frontend/src/pages/session/RestTimerBar.tsx`, `frontend/src/pages/session/RestTimerBar.test.tsx`
  - **Descripción:** Implementar la barra flotante de descanso tomando la plantilla exacta de `_lovable_reference/src/components/forge/SessionView.tsx` (`RestTimerBar`): contenedor `glass animate-in slide-in-from-bottom-4 duration-200 border-t border-white/5 px-4 py-3`, visualizador de tiempo regresivo en `font-mono text-3xl font-bold leading-none text-content`, botón de incremento `+30s` en `bg-surface-2 min-h-12 min-w-12 rounded-xl font-mono text-sm font-bold text-content press`, botón "Saltar" en `bg-amber text-ink min-h-12 px-4 rounded-xl font-bold shadow-lg shadow-amber/30 press`, y barra de progreso inferior en `bg-amber rounded-full h-1.5 transition-all duration-500 ease-out`.
  - **Hecho cuando:** `npm test src/pages/session/RestTimerBar.test.tsx` pase al 100% y al pulsar "+30s" o "Saltar" el contador responda con la animación y persistencia programada.

- [x] **T-16: Integración en Rutina: Tarjeta Hero de Mesociclo, Semanas y Sesiones (`MesocyclePage.tsx`)**
  - **RF cubiertos:** RF-01, RF-02, RF-04, RF-05, RF-11, Plan §6.2
  - **Archivos:** `frontend/src/pages/mesocycle/MesocyclePage.tsx`, `frontend/src/pages/mesocycle/MesocyclePage.test.tsx`
  - **Descripción:** Reemplazar la vista de mesociclo adoptando la plantilla exacta de `_lovable_reference/src/components/forge/RoutineView.tsx`: tarjeta hero con clase `hero-gradient animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-2xl border border-line p-4 shadow-lg shadow-brand/10`, badge "Activo" con punto pulsante en verde éxito (`bg-success/15 text-success shadow-lg shadow-success/20`), chips de metadatos en `bg-surface-2 rounded-full px-3 py-1 text-[11px] text-content-2` y barra de progreso de mesociclo con `progress-gradient`. Selector de semanas en cuadrícula de 4 columnas con botones de 48px; semana activa en `bg-amber text-ink shadow-lg shadow-amber/30 press` e inactiva en `bg-surface-1 border border-line text-content-2 press`, con icono `Zap` en la semana 6. Al seleccionar semana de descarga, mostrar la tarjeta de advertencia en ámbar `border-l-4 border-amber bg-amber/10 p-3 shadow-lg shadow-amber/10`. Lista de sesiones en tarjetas `article` con retardo de entrada escalonado (`animationDelay: ${idx * 60}ms`), icono de grupo muscular en contenedor cuadrado de 48px (`bg-brand/15 text-brand-focus` o `bg-success/20 text-success`), chips de ejercicios y botón primario "Iniciar" con `bg-brand shadow-lg shadow-brand/30 press`.
  - **Hecho cuando:** `npm test src/pages/mesocycle/MesocyclePage.test.tsx` pase al 100% y la vista de mesociclo replique con exactitud pixel-perfect el diseño de `RoutineView.tsx`.

- [x] **T-17: Integración en Rutina: Editor de Rutina e Historial (`RoutineEditorPage.tsx`, `RoutineHistoryPage.tsx`)**
  - **RF cubiertos:** RF-02, RF-03, RF-04, Plan §6.2
  - **Archivos:** `frontend/src/pages/routine/RoutineEditorPage.tsx`, `frontend/src/pages/routine/RoutineHistoryPage.tsx`
  - **Descripción:** Modernizar las tarjetas de sesión y ejercicio en el editor adoptando el estilo `rounded-2xl border border-line bg-surface-1 p-3 shadow-lg shadow-brand/5`, botones de reordenamiento e intercambio de ejercicio con diana de 48px y clase `press`, y modal de reemplazo (`SwapExerciseModal.tsx`) adaptado al estilo Bottom Sheet de Lovable.
  - **Hecho cuando:** `npm test src/pages/routine/RoutineEditorPage.test.tsx` y `npm test src/pages/routine/RoutineHistoryPage.test.tsx` pasen al 100%.

- [x] **T-18: Integración en Catálogo: Buscador, Filtros Bottom Sheet y Detalle (`ExerciseCatalogPage.tsx`, `ExerciseDetailPage.tsx`)**
  - **RF cubiertos:** RF-02, RF-03, RF-10, Plan §6.3
  - **Archivos:** `frontend/src/pages/catalog/ExerciseCatalogPage.tsx`, `frontend/src/pages/catalog/ExerciseDetailPage.tsx`, `frontend/src/pages/catalog/FilterBottomSheet.tsx`
  - **Descripción:** Actualizar el catálogo de ejercicios: campo de búsqueda con diana ≥ 48px, botón de filtro en la mitad inferior que despliega `FilterBottomSheet` como Bottom Sheet vertical limpio sin carruseles desbordantes, tarjetas de catálogo con clase `press`, esquinas `rounded-2xl`, borde `border-line` y badges musculares en `bg-surface-2 text-content-2`. Actualizar la página de detalle con telemetría en `font-mono` y descripción técnica formateada.
  - **Hecho cuando:** `npm test src/pages/catalog/ExerciseCatalogPage.test.tsx` y `npm test src/pages/catalog/ExerciseDetailPage.test.tsx` pasen al 100%.

- [x] **T-19: Integración en Perfil del Atleta: Hero, Pesaje con Sparkline y PillGroups (`ProfilePage.tsx`)**
  - **RF cubiertos:** RF-01, RF-02, RF-12, Plan §6.4
  - **Archivos:** `frontend/src/pages/profile/ProfilePage.tsx`, `frontend/src/pages/profile/ProfilePage.test.tsx`
  - **Descripción:** Reemplazar el layout de `ProfilePage` adoptando la plantilla exacta de `_lovable_reference/src/components/forge/ProfileView.tsx`: tarjeta hero con fondo `hero-gradient rounded-2xl border border-line p-4 shadow-lg shadow-brand/10`, avatar circular en `bg-brand text-content shadow-lg shadow-brand/30 grid h-14 w-14 place-items-center rounded-full text-xl font-extrabold`, nombre y datos en `font-mono`. Sección de peso corporal con telemetría en `font-mono text-3xl font-bold text-content`, badge de delta comparativo (`▲ +` o `▼ -` con `text-success` / `text-amber`), integración del componente `Sparkline` SVG, tabla histórica con `divide-y divide-line` y botón "Registrar pesaje". Implementar el componente interno `PillGroup` para Objetivo (con iconos Trophy, Dumbbell, Flame, HeartPulse), Nivel de experiencia (Sprout, Zap, Medal) y selector de Días por semana en cuadrícula de 7 columnas con botones circulares de 48px. Añadir la barra de guardado pegajosa inferior `glass sticky bottom-[72px] z-10 -mx-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-white/5 px-4 pt-3 pb-3` con botón "Guardar cambios" en `bg-brand shadow-brand/30` y botón de cerrar sesión en `bg-fatigue/15 text-fatigue-text`.
  - **Hecho cuando:** `npm test src/pages/profile/ProfilePage.test.tsx` pase al 100%, comprobando que el sparkline se dibuja, los pill groups responden al tacto y los labels/inputs requeridos en español permanecen accesibles.

- [x] **T-20: Integración en Autenticación y Onboarding Inicial (`LoginPage.tsx`)**
  - **RF cubiertos:** RF-01, RF-02, RF-04, Plan §6.4
  - **Archivos:** `frontend/src/pages/auth/LoginPage.tsx`
  - **Descripción:** Ajustar la pantalla de bienvenida y login para integrarse dentro del marco móvil de 390px centrado sobre fondo `bg-shell`, agregando tarjeta con `hero-gradient`, isotipo con acento de marca y botón de inicio de sesión con `bg-brand shadow-lg shadow-brand/30 press`, preservando los mensajes y validaciones en español.
  - **Hecho cuando:** `npm test src/App.test.tsx` pase exitosamente y el flujo de login renderice con los estilos cromáticos y sombras del nuevo Design System.

- [x] **T-21: Auditoría Final de Regresiones, Cero Scroll Horizontal y Accesibilidad WCAG**
  - **RF cubiertos:** RF-01 a RF-12, RNF-01 a RNF-05, Plan §7
  - **Archivos:** Toda la suite de tests en `frontend/src/audit/` y `frontend/src/`
  - **Descripción:** Ejecutar la suite completa de auditorías: `vitest run src/audit/` comprobando tokens de color (`colorTokens.test.ts`), espaciado (`spacingBreakpoints.test.ts`), accesibilidad WCAG (`accessibility.test.tsx`, `mobile-accessibility-audit.test.tsx`), reglas de español (`i18nSpanish.test.tsx`) y ausencia de scroll horizontal (`responsiveOverflow.test.tsx`) en 320px, 360px y 390px. Ejecutar el chequeo estático de TypeScript con `npm run typecheck`.
  - **Hecho cuando:** Todos los tests de la suite pasen al 100%, `npm run typecheck` complete con 0 errores, y la aplicación mantenga estrictamente cero scroll horizontal con contrastes ≥ 4.5:1 en texto y ≥ 3:1 en controles interactivos.
