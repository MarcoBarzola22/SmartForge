# Tareas de Implementación — 002-smartforge-ui-ux: Rediseño del Sistema de Diseño

> **Épica:** Rediseño del Sistema de Diseño UI/UX  
> **Especificación:** [specs/002-smartforge-ui-ux/spec.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/002-smartforge-ui-ux/spec.md)  
> **Plan Técnico:** [specs/002-smartforge-ui-ux/plan.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/002-smartforge-ui-ux/plan.md)  
> **Constitución:** [docs/constitution.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/docs/constitution.md) (Reglas 2, 4 y 6)  
> **Duración estimada por tarea:** 20–30 minutos  

---

## Fase 1: Tokens y Fundaciones de Diseño (Tailwind & CSS)

- [x] **T-01: Importación e integración de tipografías DM Sans y JetBrains Mono**
  - **RF cubiertos:** §2.3, RNF-04, Constitución R2
  - **Archivos:** `index.html`, `src/index.css`
  - **Descripción:** Configurar la carga optimizada de Google Fonts para DM Sans (pesos 400, 500, 600, 700) y JetBrains Mono (pesos 500, 600). Definir las variables y familias tipográficas por defecto en CSS.
  - **Hecho cuando:** `document.fonts.check("16px 'DM Sans'")` y `document.fonts.check("18px 'JetBrains Mono'")` retornan `true` en el navegador y los textos de prueba se renderizan con las fuentes especificadas.

- [x] **T-02: Configuración de tokens de color, superficies y contraste accesible en Tailwind**
  - **RF cubiertos:** §2.1, RNF-01, RNF-02, RNF-03
  - **Archivos:** `tailwind.config.js` (o directivas `@theme` en `src/index.css`)
  - **Descripción:** Declarar la paleta unívoca: fondo base (`#0C0C0E`), Superficie 1 (`#18181B`), Superficie 2 (`#27272A`), Borde interactivo (`#52525B`), Azul Primario (`#3B82F6`), Texto carbón de botón (`#0C0C0E`), Anillo de foco (`#60A5FA`), Error de texto (`#F87171`), Error de fondo (`#EF4444`) y Éxito (`#22C55E`).
  - **Hecho cuando:** Las clases utilitarias (`bg-base`, `bg-surface-1`, `bg-surface-2`, `text-brand-contrast`, `text-status-error-text`) compilan sin advertencias y aplican los valores hexadecimales exactos.

- [ ] **T-03: Configuración de escala de espaciado estricta base 4px y breakpoints móviles**
  - **RF cubiertos:** §2.2, RF-08, RF-09, RF-10, Constitución R2
  - **Archivos:** `tailwind.config.js`
  - **Descripción:** Extender Tailwind con la escala estricta: `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px), `space-5` (20px), `space-6` (24px), `space-8` (32px), `space-12` (48px), `space-16` (64px). Configurar breakpoints móviles `xs: 320px` y `mobile-max: 390px`.
  - **Hecho cuando:** Las clases `h-bar` (64px), `min-h-touch` (48px) y `gap-2` (8px) compilan y el contenedor de layout restringe el ancho máximo a 390px en pantalla móvil.

- [ ] **T-04: Blindaje global contra scroll horizontal y utilidades táctiles en `index.css`**
  - **RF cubiertos:** RF-10, CF-02, Constitución R2
  - **Archivos:** `src/index.css`
  - **Descripción:** Establecer reglas globales de reseteo: `overflow-x: hidden` a nivel `html, body, #root`, `box-sizing: border-box`, eliminación de highlights nativos táctiles (`-webkit-tap-highlight-color: transparent`) y clase `.touch-target` con dimensiones mínimas de `48×48px`.
  - **Hecho cuando:** `document.documentElement.scrollWidth === window.innerWidth` en emulación móvil de 320px de ancho y no existe desborde horizontal.

---

## Fase 2: Componentes Atómicos Primitivos de UI

- [ ] **T-05: Rediseño y tests unitarios de `Button.tsx`**
  - **RF cubiertos:** RF-08, RF-14, RF-19, RF-21, RNF-01, CF-01
  - **Archivos:** `src/components/ui/Button.tsx`, `src/components/ui/Button.test.tsx`
  - **Descripción:** Implementar el botón accesible con altura mínima de 48px y ancho mínimo de 120px (o 48px para solo icono). Aplicar fondo `#3B82F6` con texto `#0C0C0E` (variante primaria), wrap a 2 líneas hasta 64px de alto con elipsis en 2ª línea, debounce táctil `< 50ms` con spinner inline y estado deshabilitado.
  - **Hecho cuando:** `npm run test src/components/ui/Button.test.tsx` pasa al 100%, validando que el botón mide ≥ 48px de alto, aplica wrap a 64px ante textos largos y rechaza clicks múltiples cuando está en estado de carga.

- [ ] **T-06: Rediseño y tests de normalización decimal en `Input.tsx`**
  - **RF cubiertos:** RF-08, RF-13, RF-23, RNF-02, RNF-03, CF-10
  - **Archivos:** `src/components/ui/Input.tsx`, `src/components/ui/Input.test.tsx`
  - **Descripción:** Implementar el input sobre Superficie 2 (`#27272A`) con borde `#52525B` y anillo `:focus-visible` `#60A5FA`. Soporte para etiqueta externa de unidad ("kg", "reps") y normalización automática de coma (`,`) a punto (`.`) en tiempo real sin perder foco.
  - **Hecho cuando:** `npm run test src/components/ui/Input.test.tsx` pasa, comprobando que teclear `82,5` emite `82.5` en el onChange y el elemento mide al menos 48px de altura.

- [ ] **T-07: Implementación de `Card.tsx` rígido y modular**
  - **RF cubiertos:** RF-10, RF-12, CF-02
  - **Archivos:** `src/components/ui/Card.tsx`, `src/components/ui/Card.test.tsx`
  - **Descripción:** Tarjeta con fondo Superficie 1 (`#18181B`), borde `#27272A`, radio de 12px y `w-full overflow-hidden`. Sin desbordes en viewports de 320px.
  - **Hecho cuando:** La tarjeta renderiza al 100% de ancho del contenedor padre sin generar barras de scroll lateral en 320px.

- [ ] **T-08: Implementación de `Sheet.tsx` (Bottom Sheet con bloqueo de scroll y soporte de teclado)**
  - **RF cubiertos:** RF-06, RF-16, RF-17, CF-08, CF-12
  - **Archivos:** `src/components/ui/Sheet.tsx`, `src/components/ui/Sheet.test.tsx`
  - **Descripción:** Bottom Sheet anclado a la base (`bottom-0 w-full`) con `overscroll-behavior: contain`. Intercepta el evento `popstate` para cerrarse con el gesto de retroceso del SO sin salir de la sesión, y conmuta a `h-full` cuando el teclado virtual está activo.
  - **Hecho cuando:** El Bottom Sheet se cierra al disparar `window.dispatchEvent(new PopStateEvent('popstate'))` y mantiene el scroll del fondo bloqueado.

- [ ] **T-09: Implementación de `AlertDialog.tsx` para confirmación destructiva en dos pasos**
  - **RF cubiertos:** RF-04, RF-18, CF-13
  - **Archivos:** `src/components/ui/AlertDialog.tsx`, `src/components/ui/AlertDialog.test.tsx`
  - **Descripción:** Modal de confirmación presentado como Bottom Sheet en la mitad inferior. Incluye mensaje de advertencia claro en español, botón rojo destructivo (`#EF4444`, texto blanco) de 48px y botón secundario "Cancelar" de 48px.
  - **Hecho cuando:** El diálogo renderiza ambos botones con altura ≥ 48px en la mitad inferior de la pantalla y emite el callback de confirmación únicamente al pulsar el botón destructivo.

- [ ] **T-10: Rediseño de `Toast.tsx` y `ToastContainer` sobre la Bottom Bar**
  - **RF cubiertos:** RF-17, RF-19, RF-21, CF-09, Constitución R6
  - **Archivos:** `src/components/ui/Toast.tsx`, `src/components/ui/Toast.test.tsx`
  - **Descripción:** Alerta flotante anclada a `bottom-[76px]` (12px sobre la barra inferior de 64px). Mensajes exclusivamente en español, soporte para botón accesible de reintento de acción y cierre automático accesible (`role="alert"`).
  - **Hecho cuando:** El toast se renderiza a exactamente 76px de la base de la ventana y expone botón de reintentar ante fallos de red simulados.

- [ ] **T-11: Implementación de `CentralizedSpinner.tsx` y `EmptyState.tsx` en español**
  - **RF cubiertos:** RF-20, RF-22, CF-14, Constitución R6
  - **Archivos:** `src/components/common/CentralizedSpinner.tsx`, `src/components/common/EmptyState.tsx`
  - **Descripción:** Spinner con texto en español (ej. "Cargando rutinas…") con ratio de contraste ≥ 4.5:1. Componente de estado vacío con icono neutro, texto descriptivo y botón de acción principal de 48px.
  - **Hecho cuando:** Ambos componentes se renderizan con textos en español y botón primario accesible sin arrojar advertencias de accesibilidad.

---

## Fase 3: Arquitectura de Layout y Navegación Inferior

- [ ] **T-12: Rediseño de `BottomNav.tsx` con altura exacta de 64px y dianas de 48px**
  - **RF cubiertos:** RF-01, RF-02, RNF-05, CF-01, CF-06, Constitución R2, R6
  - **Archivos:** `src/components/navigation/BottomNav.tsx`, `src/components/navigation/BottomNav.test.tsx`
  - **Descripción:** Barra de navegación fija inferior con altura base de 64px (`h-16`) más `safe-area-inset-bottom`. Cada tab tiene un área táctil mínima de 48×48px con icono de 24px y label de 12px en español.
  - **Hecho cuando:** `npm run test src/components/navigation/BottomNav.test.tsx` pasa, verificando altura computada de 64px y que ningún tab mide menos de 48×48px.

- [ ] **T-13: Implementación de `useVisualViewport.ts` para ajuste dinámico ante teclado**
  - **RF cubiertos:** RF-03, RF-16, CF-04
  - **Archivos:** `src/hooks/useVisualViewport.ts`, `src/hooks/useVisualViewport.test.ts`
  - **Descripción:** Hook de React que escucha los cambios en `window.visualViewport` para detectar la apertura del teclado virtual, calcular la altura restante exacta (`visualViewport.height - 64px`) y gestionar la visibilidad de la Bottom Tab Bar.
  - **Hecho cuando:** El hook retorna `isKeyboardOpen: true` y `availableHeight: visualViewport.height - 64` al reducirse la altura de la ventana visible.

- [ ] **T-14: Implementación de `KeyboardActionBar.tsx` fijada sobre el teclado**
  - **RF cubiertos:** RF-03, RF-04, RF-14, CF-04
  - **Archivos:** `src/components/layout/KeyboardActionBar.tsx`
  - **Descripción:** Barra de acciones fijada en la parte inferior del `visualViewport` con altura exacta de 64px. Contiene el botón secundario ("Cancelar" o "Atrás") y el botón primario ("Guardar"), ambos con `min-h: 48px`.
  - **Hecho cuando:** La barra se ubica inmediatamente sobre el teclado virtual en el simulador móvil y permite guardar o cancelar sin que los botones queden tapados.

- [ ] **T-15: Implementación de sub-navegación inferior (`SegmentedSubNav.tsx`)**
  - **RF cubiertos:** RF-04, CF-06, Constitución R2
  - **Archivos:** `src/components/navigation/SegmentedSubNav.tsx`
  - **Descripción:** Selector segmentado para alternar sub-vistas internas (ej. "Historial" vs "Estadísticas") ubicado en la zona baja de pulgar (inmediatamente encima de la Bottom Tab Bar), erradicando tabs superiores.
  - **Hecho cuando:** El selector se renderiza en la mitad inferior de la pantalla y permite cambiar de sub-vista con toques de pulgar a una mano.

- [ ] **T-16: Refactorización de `MobileLayout.tsx` integrando safe-areas y layout de 1 columna**
  - **RF cubiertos:** RF-02, RF-03, RF-10, RF-11, CF-02, CF-04
  - **Archivos:** `src/components/layout/MobileLayout.tsx`
  - **Descripción:** Integrar el contenedor scrolleable dinámico, el header contextual simplificado, el `ToastContainer` a 12px sobre la barra, y la conmutación entre `BottomNav` y `KeyboardActionBar`.
  - **Hecho cuando:** La aplicación se renderiza en viewport de 320px sin scroll horizontal y oculta la barra de navegación al emerger el teclado.

---

## Fase 4: Rediseño Ergonómico de la Pantalla de Sesión y Sets

- [ ] **T-17: Implementación de `ModularSetCard.tsx` con disposición modular para 320px**
  - **RF cubiertos:** RF-08, RF-09, RF-12, RF-13, CF-07
  - **Archivos:** `src/pages/session/ModularSetCard.tsx`, `src/pages/session/ModularSetCard.test.tsx`
  - **Descripción:** Tarjeta de serie estructurada en bloques verticales de ancho completo: Fila 1 (N° set + historial previo truncado con modal informativo), Fila 2 (Peso completo con steppers de 48px con `shrink-0`), Fila 3 (Reps completo con steppers de 48px con `shrink-0`), Fila 4 (RPE + Checkmark de 48×48px con debounce).
  - **Hecho cuando:** `npm run test src/pages/session/ModularSetCard.test.tsx` pasa en viewport simulado de 320px sin desbordamiento de ningún elemento y con todos los steppers midiendo exactamente 48×48px.

- [ ] **T-18: Implementación de `ActiveExerciseWorkspace.tsx` con Sticky Workspace**
  - **RF cubiertos:** RF-05, RF-07, CF-06
  - **Archivos:** `src/pages/session/ActiveExerciseWorkspace.tsx`
  - **Descripción:** Contenedor de entrenamiento en vivo que mantiene la serie en curso activa anclada y centrada en la mitad inferior de la pantalla (zona de pulgar). Al completar una serie, ejecuta un auto-scroll suave que posiciona la siguiente serie en el cuadrante interactivo inferior.
  - **Hecho cuando:** Al completar un set de prueba, la vista se desplaza automáticamente situando el siguiente set dentro del 50% inferior del viewport visible.

- [ ] **T-19: Implementación de `RestTimerBar.tsx` con Display 32px y cancelación anticipada**
  - **RF cubiertos:** RF-18, RF-20, CF-11
  - **Archivos:** `src/pages/session/RestTimerBar.tsx`, `src/pages/session/RestTimerBar.test.tsx`
  - **Descripción:** Barra de cronómetro con tipografía Display (32px bold). Al llegar a cero emite borde verde y vibración; si el atleta pulsa "Siguiente serie" antes de agotar el tiempo, resetea a cero y cancela formalmente las notificaciones web pendientes.
  - **Hecho cuando:** El test unitario comprueba que avanzar de serie antes de expirar el timer invoca la cancelación en el Notification Manager y apaga el cronómetro.

- [ ] **T-20: Implementación de truncamiento táctil reversible en nombres y notas de ejercicios**
  - **RF cubiertos:** RF-15, CF-05
  - **Archivos:** `src/components/common/TruncatedTextToggle.tsx`, `src/components/common/TruncatedTextToggle.test.tsx`
  - **Descripción:** Componente para nombres largos de ejercicios y notas. Trunca a 1 o 2 líneas con elipsis (`…`). Un tap expande el texto inline y un segundo tap lo vuelve a contraer. Ejecuta auto-scroll suave para evitar que controles inferiores salgan de la pantalla.
  - **Hecho cuando:** El test valida que el componente conmuta clases de `line-clamp-1` a expandido al disparar un click/tap y no usa atributos de hover.

---

## Fase 5: Catálogo de Ejercicios y Búsqueda en Zona de Pulgar

- [ ] **T-21: Implementación de `FilterBottomSheet.tsx` para filtros musculares**
  - **RF cubiertos:** RF-06, RF-08, RF-09, CF-08, Constitución R2
  - **Archivos:** `src/pages/catalog/FilterBottomSheet.tsx`
  - **Descripción:** Reemplazar el antiguo carrusel horizontal de chips por un Bottom Sheet modal con lista vertical de grupos musculares, chips con `min-h: 48px`, separación de 8px y botón inferior de "Aplicar filtros" de 48px.
  - **Hecho cuando:** El catálogo de ejercicios no contiene ninguna propiedad `overflow-x: auto` y los filtros se seleccionan dentro del Bottom Sheet vertical sin scroll horizontal.

- [ ] **T-22: Implementación de la barra de búsqueda accesible en mitad inferior en `ExerciseCatalogPage.tsx`**
  - **RF cubiertos:** RF-04, RF-05, RF-06, CF-06
  - **Archivos:** `src/pages/catalog/ExerciseCatalogPage.tsx`
  - **Descripción:** Reposicionar el disparador de búsqueda y el botón de filtrado en la mitad inferior de la pantalla (zona de pulgar). Lista de ejercicios con carga progresiva para mantener 60 FPS estables.
  - **Hecho cuando:** El botón de búsqueda y filtro es accionable con el pulgar en el cuadrante inferior y filtra el catálogo en tiempo real.

---

## Fase 6: Formularios Accesibles y Thumb-Zone Initializer

- [ ] **T-23: Refactorización de `ProfilePage.tsx` con disposición vertical estricta**
  - **RF cubiertos:** RF-05, RF-11, RF-14, Constitución R2
  - **Archivos:** `src/pages/profile/ProfilePage.tsx`
  - **Descripción:** Apilar todos los campos en 1 sola columna vertical para viewports ≤ 390px. Añadir botones de navegación secuencial inferior ("Siguiente campo") y botón de guardado en la mitad inferior.
  - **Hecho cuando:** La página de perfil no presenta campos lado a lado en 320px–390px y se puede completar con una sola mano.

- [ ] **T-24: Refactorización de `RoutineEditorPage.tsx` y `CheckInModal.tsx`**
  - **RF cubiertos:** RF-04, RF-11, RF-16, RF-18
  - **Archivos:** `src/pages/routine/RoutineEditorPage.tsx`, `src/pages/session/CheckInModal.tsx`
  - **Descripción:** Adaptar el editor de rutinas para apilar ejercicios en tarjetas modulares y transformar el Check-In modal en un Bottom Sheet accesible que respeta safe areas y botones ≥ 48px.
  - **Hecho cuando:** El Check-In se abre como Bottom Sheet desde la base y permite confirmar con el pulgar en la zona baja.

- [ ] **T-25: Refactorización de `LoginPage.tsx` con botones apilados y dianas accesibles**
  - **RF cubiertos:** RF-08, RF-11, RF-14
  - **Archivos:** `src/pages/auth/LoginPage.tsx`
  - **Descripción:** Formulario de login en 1 columna vertical con inputs de 48px, botón de login primario de ancho completo (`w-full`, fondo `#3B82F6`, texto `#0C0C0E`) y recuperación de contraseña en zona inferior accesible.
  - **Hecho cuando:** El formulario de login no colapsa en viewport de 320px y supera la prueba de contraste WCAG AAA en el botón principal.

---

## Fase 7: Validación de Calidad, Accesibilidad y Regresión

- [ ] **T-26: Suite de tests automatizados de ratios de contraste y accesibilidad ARIA (`axe-core`)**
  - **RF cubiertos:** RNF-01, RNF-02, RNF-03, CF-03
  - **Archivos:** `src/audit/accessibility.test.tsx`
  - **Descripción:** Ejecutar auditoría automatizada con `axe-core` sobre los componentes y vistas renderizadas, validando contraste de texto (≥ 4.5:1), componentes (≥ 3:1), y roles ARIA (`role="navigation"`, `role="alert"`, `aria-modal="true"`).
  - **Hecho cuando:** `npm run test src/audit/accessibility.test.tsx` pasa con 0 violaciones detectadas por axe-core.

- [ ] **T-27: Suite de tests responsive automatizados de cero scroll horizontal en 320px, 360px, 375px y 390px**
  - **RF cubiertos:** RF-10, CF-02, Constitución R2
  - **Archivos:** `src/audit/responsiveOverflow.test.tsx`
  - **Descripción:** Test que monta cada pantalla del sistema (`LoginPage`, `ExerciseCatalogPage`, `SessionPage`, `RoutineEditorPage`, `ProfilePage`) en viewports emulados de 320px a 390px y evalúa que ningún contenedor supere el ancho de la ventana.
  - **Hecho cuando:** `npm run test src/audit/responsiveOverflow.test.tsx` pasa exitosamente certificando `scrollWidth === innerWidth` en todas las pantallas.

- [ ] **T-28: Auditoría de idioma español en interfaz y mensajes visibles**
  - **RF cubiertos:** RNF-05, CF-14, Constitución R6
  - **Archivos:** `src/audit/i18nSpanish.test.tsx`
  - **Descripción:** Test de verificación estática de strings en componentes UI que comprueba que ningún botón, placeholder, toast o mensaje orientador contenga cadenas no traducidas o en inglés.
  - **Hecho cuando:** `npm run test src/audit/i18nSpanish.test.tsx` pasa sin discrepancias, cumpliendo la Regla 6 de la Constitución.
