# 004 — SmartForge UI: Rediseño Visual Premium (Design System Lovable)

> **Tipo:** Épica de diseño e interfaz de usuario  
> **Estado:** Aprobado / Especificación de Rediseño Definitiva  
> **Fecha:** 2026-10-07  
> **Depende de:** [001-SmartForge-mvp](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/001-SmartForge-mvp/spec.md), [002-smartforge-ui-ux](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/002-smartforge-ui-ux/spec.md), [003-smartforge-routine-engine](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/003-smartforge-routine-engine/spec.md)  
> **Regida por:** [constitution.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/docs/constitution.md) — Reglas 2 y 6  
> **Prototipo de Referencia:** `_lovable_reference` (Solo lectura)  

---

## 1. Contexto y Objetivos

SmartForge cuenta con un motor de sobrecarga progresiva sólido, persistencia offline con IndexedDB y sincronización asíncrona. No obstante, la experiencia visual de la versión inicial se basaba en interfaces funcionales sobrias con contrastes básicos. 

Para elevar la aplicación al nivel de las mejores herramientas de entrenamiento de clase mundial (como *Hevy*, *RP Hypertrophy*, *Strong* o *MacroFactor*), se ha construido un prototipo interactivo de alta fidelidad en `_lovable_reference`.

### 1.1 Objetivo del Rediseño
Trasladar de forma fiel, metódica y no invasiva el **Design System** extraído del prototipo Lovable a toda la base de código real de SmartForge (`frontend/src/`), garantizando que:
1. **La estética visual sea premium, deportiva y técnica**, incorporando la paleta cromática perceptualmente uniforme OKLCH, efectos de cristal difuminado (*glassmorphism*), sombras volumétricas con destellos de color (*glows*), y micro-interacciones táctiles nativas (`press`, `shimmer`, `ping`).
2. **Las directrices ergonómicas de la [Constitución](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/docs/constitution.md) permanezcan inalteradas**: operación con una sola mano en la mitad inferior de la pantalla (viewports ≤ 390px), touch targets de al menos 48×48px, separación física mínima de 8px y cero scroll horizontal.
3. **La lógica de negocio y arquitectura permanezcan 100% intactas**: React Query, offlineStore con IndexedDB, hooks de sincronización, servicios y contratos OpenAPI permanecen inmunes a alteraciones no visuales.

---

## 2. Design System Extraído de `_lovable_reference`

El sistema de diseño de Lovable se fundamenta en el espacio de color moderno **OKLCH**, logrando tonos de saturación profunda sin degradar la legibilidad ni la uniformidad luminosa en pantallas OLED/AMOLED móviles.

### 2.1 Paleta Cromática y Tokens Semánticos (OKLCH)

| Token CSS | Valor OKLCH / Definición | Alias Funcional Tailwind | Rol Semántico y Uso en la UI |
|---|---|---|---|
| `--shell` | `oklch(0 0 0)` | `bg-shell` | Marco exterior y encuadre general (Negro absoluto OLED). |
| `--base` | `oklch(0.15 0.004 286)` | `bg-ink`, `bg-base` | Lienzo principal de la aplicación móvil (Gris carbón profundo con matiz frío). |
| `--surface-1` | `oklch(0.21 0.006 286)` | `bg-surface-1` | Fondo principal de tarjetas (cards), contenedores y modales. |
| `--surface-2` | `oklch(0.274 0.006 286)` | `bg-surface-2` | Fondo de steppers, inputs numéricos, chips inactivos y pill buttons. |
| `--surface-elevated` | `oklch(0.235 0.007 286)` | `bg-surface-elevated` | Tarjetas de alta prioridad (Sobrecarga progresiva, KPIs destacados). |
| `--brand-primary` | `oklch(0.623 0.188 259.8)` | `bg-brand`, `text-brand` | Botón Primario de acción, acentos de navegación y branding. |
| `--brand-focus` | `oklch(0.707 0.143 254.6)` | `text-brand-focus`, `ring-brand-focus` | Anillo de `:focus-visible`, pestañas activas e iconos con énfasis. |
| `--neon-progress` | `oklch(0.866 0.29 142.5)` | `bg-neon`, `text-neon` | Insignias de incremento de carga, hitos de sobrecarga y shimmer de progreso. |
| `--neon-progress-muted` | `oklch(0.723 0.192 149.6)` | `bg-success`, `text-success` | Series completadas, indicador "EN VIVO", mesociclo activo y sparkline. |
| `--amber-energy` | `oklch(0.769 0.165 70.1)` | `bg-amber`, `text-amber` | Barra y botón de descanso, semana de descarga (deload), selector de semanas activo y avisos técnicos. |
| `--fatigue-red` | `oklch(0.637 0.208 25.3)` | `bg-fatigue` | Acciones destructivas, reporte de molestia muscular, botón "Finalizar sesión". |
| `--fatigue-text` | `oklch(0.711 0.166 22.2)` | `text-fatigue-text` | Texto de alta visibilidad sobre contenedores con transparencia `bg-fatigue/15`. |
| `--content-primary` | `oklch(1 0 0)` | `text-content` | Blanco puro para títulos, números métricos destacados y texto de primer orden. |
| `--content-secondary` | `oklch(0.712 0.013 286)` | `text-content-2` | Subtítulos, metadatos, unidades ("kg", "reps", "@ RIR 2") y texto explicativo. |
| `--content-disabled` | `oklch(0.552 0.014 286)` | `text-content-3` | Pestañas inactivas, etiquetas menores ("Día 1") y texto de apoyo no interactivo. |
| `--border-subtle` | `oklch(0.274 0.006 286)` | `border-line` | Delimitador perimetral estándar de cards y divisiones horizontales. |
| `--border-interactive` | `oklch(0.442 0.014 286)` | `border-line-strong` | Borde de steppers, botones interactivos en reposo y campos editables. |

### 2.2 Patrones de Sombreado Volumétrico y Resplandores (Glows)

A diferencia de los sombreados grises tradicionales, el prototipo aplica **sombras cromáticas difuminadas con baja opacidad** vinculadas al estado semántico:

1. **Brand Glow:** `shadow-lg shadow-brand/30` en botones primarios (ej. "Iniciar", "Guardar cambios") y `shadow-brand/10` en tarjetas hero.
2. **Neon Glow:** `shadow-lg shadow-neon/20` y `shadow-neon/10` en el bloque de recomendación de sobrecarga progresiva ("Incrementar carga").
3. **Success Glow:** `shadow-lg shadow-success/30` en el botón maestro "Registrar Serie" y `shadow-success/20` en el chip de mesociclo activo.
4. **Energy Amber Glow:** `shadow-lg shadow-amber/30` en el botón "Saltar descanso" y en el selector de la semana activa.
5. **Card Base Glow:** `shadow-lg shadow-brand/5` en cards secundarias para despegarlas sutilmente del fondo `bg-ink`.

### 2.3 Sistema de Bordes y Radios (Border Radii)

- **Radio Base (`--radius`):** `0.5rem` (8px).
- **Tarjetas y Contenedores:** `rounded-2xl` (16px) con `border border-line`.
- **Controles Internos y Steppers:** `rounded-xl` (12px) con `border border-line-strong` o fondos en `bg-surface-2`.
- **Badges, Pills y Selectores Segmentados:** `rounded-full` con padding horizontal proporcional (`px-3 py-1`).
- **Accent Top-Border (Línea de Corona):** Utilidad `top-gradient h-1` que añade una barra superior de gradiente a tarjetas de alta telemetría.

### 2.4 Patrones de Glassmorphism (Superficies de Cristal)

El prototipo utiliza superficies traslúcidas con desenfoque de fondo en zonas fijas para permitir la visibilidad sutil del contenido scrolleable por debajo:

- **Header Superior de Sesión:** `glass sticky top-0 z-20 -mx-4 -mt-4 border-b border-white/5 px-4 pb-3 pt-4`.
- **Bottom Navigation Bar:** `glass relative grid grid-cols-4 border-t border-white/5 px-2 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]`.
- **Sticky Bottom Action Bars:** `glass sticky bottom-[72px] z-10 -mx-4 border-t border-white/5 px-4 pt-3 pb-3`.
- **Rest Timer Bar:** `glass border-t border-white/5 px-4 py-3`.
- **Implementación Técnica:**
  ```css
  @utility glass {
    background: color-mix(in oklab, var(--surface-1) 90%, transparent);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }
  ```

### 2.5 Micro-Animaciones y Sensación Táctil (Haptics Visuales)

1. **Respuesta Táctil Instantánea (`press`):**
   ```css
   @utility press {
     transition: transform 100ms;
     &:active { transform: scale(0.97); }
   }
   ```
2. **Gradiente de Progreso Dinámico (`progress-gradient` con `shimmer`):**
   ```css
   @utility progress-gradient {
     background: linear-gradient(90deg, var(--brand-primary), var(--neon-progress));
     background-size: 200% 100%;
     animation: shimmer 3s linear infinite;
   }
   @keyframes shimmer {
     from { background-position: 0% 0; }
     to { background-position: 200% 0; }
   }
   ```
3. **Indicador de Sesión Activa ("EN VIVO"):**
   Beacon animado compuesto por un punto central fijo y un halo exterior continuo:
   `relative flex h-2.5 w-2.5` con `animate-ping rounded-full bg-success opacity-75`.
4. **Entrada Suave de Contenido:**
   `animate-in fade-in slide-in-from-bottom-2 duration-200` aplicado a secciones y tarjetas, con retardo escalonado opcional (`animationDelay: ${idx * 60}ms`) para listas de ejercicios.
5. **Confirmación Visual:**
   `animate-in zoom-in-50 duration-300` al marcar una serie o sesión como completada.

---

## 3. Requisitos Funcionales de UI (RF)

### RF-01: Jerarquía de Color y Superficies OKLCH
- **RF-01.1:** Toda la interfaz debe utilizar estrictamente los tokens del sistema OKLCH descritos en la sección 2.1.
- **RF-01.2:** El fondo de la ventana principal debe ser `bg-shell` (`#000000`), mientras que el contenedor móvil de 390px debe ser `bg-ink` (`oklch(0.15 0.004 286)`).
- **RF-01.3:** Se prohíbe el uso de fondos blancos o claros; la aplicación funciona exclusivamente en modo oscuro técnico.
- **RF-01.4:** Para preservar la compatibilidad con los tests de auditoría existentes (`colorTokens.test.ts`), se mantendrán las variables de compatibilidad hexadecimal como alias secundarios, garantizando que tanto los componentes nuevos como los existentes resuelvan estilos armoniosos.

### RF-02: Dianas Táctiles (Touch Targets) ≥ 48px y Steppers Deportivos
- **RF-02.1:** Todo elemento interactivo (botones, inputs, toggles, steppers, selectores de RIR, botones de sumar/restar y tabs) debe poseer una dimensión táctil mínima efectiva de **48×48px** (`min-h-12` o `min-h-[48px]`).
- **RF-02.2:** La acción maestra de guardado ("Registrar Serie") debe contar con un área táctil destacada de **56px** (`min-h-14`) para facilitar el toque con fatiga o dedos temblorosos.
- **RF-02.3:** Los controles de entrada numérica rápida se implementarán mediante el patrón **Stepper de Tres Columnas**:
  - Columna 1: Botón `[ - ]` de 48×48px (`press grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-surface-1 text-content`).
  - Columna 2: Valor numérico monoespaciado centrado (`font-mono text-2xl font-bold text-content`) acompañado de su unidad contigua externa (`text-[11px] text-content-2`).
  - Columna 3: Botón `[ + ]` de 48×48px (`press grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-surface-1 text-content`).
- **RF-02.4:** Los elementos interactivos contiguos deben conservar una separación física mínima de **8px** (`gap-2`).

### RF-03: Cero Scroll Horizontal Global en Viewports Móviles (≤ 390px)
- **RF-03.1:** El contenedor de la aplicación móvil debe estar restringido a `max-w-[390px] mx-auto` con `overflow-x: hidden` a nivel raíz, contenedor y tarjeta.
- **RF-03.2:** Queda terminantemente prohibido cualquier elemento que genere scroll horizontal involuntario en anchos de 320px a 390px.
- **RF-03.3:** Tablas, listas de chips y carruseles deben utilizar `flex-wrap` con `gap-1.5` o transformarse en paneles verticales accesibles (como en `FilterBottomSheet`).
- **RF-03.4:** Los selectores segmentados de opciones (ej. RIR 0 a 4) deben distribuirse en cuadrículas fluidas adaptadas al ancho disponible (`grid grid-cols-5 gap-2`) garantizando que ninguna celda sea menor a 48px de alto.

### RF-04: Superficies Glassmorphism y Elevación Visual
- **RF-04.1:** Los encabezados pegajosos superiores (`sticky top-0`) y las barras fijas inferiores (`fixed bottom-0` o `sticky bottom-[72px]`) deben implementar la utilidad `glass` con desenfoque de 24px (`backdrop-filter: blur(24px)`) y borde perimetral sutil (`border-white/5`).
- **RF-04.2:** Las tarjetas hero y tarjetas de sobrecarga progresiva deben presentar elevación visual mediante `hero-gradient` (`linear-gradient(135deg, var(--surface-1), var(--surface-2))`) y resplandor perimetral mediante clases de glow (`shadow-lg shadow-brand/10` o `shadow-lg shadow-neon/10`).
- **RF-04.3:** La tarjeta de sobrecarga progresiva debe incluir en su extremo superior la línea decorativa de corona de 1px (`top-gradient h-1`).

### RF-05: Micro-Interacciones y Retroalimentación Táctil
- **RF-05.1:** Todos los botones interactivos, steppers, tarjetas clickeables y pestañas deben incorporar la clase utilitaria `press` para proporcionar compresión háptica visual al presionar (`active:scale-[0.97]` con transición de 100ms).
- **RF-05.2:** Las barras de progreso de mesociclo y sesión activa deben renderizar la animación `progress-gradient` con desplazamiento de shimmer continuo de 3 segundos.
- **RF-05.3:** El estado de sesión en curso debe exhibir el indicador lumínico activo con `animate-ping` continuo en color `--neon-progress-muted` (`text-success`).
- **RF-05.4:** Los cambios de pestaña o navegación entre tarjetas deben utilizar animaciones de entrada fluidas (`animate-in fade-in slide-in-from-bottom-2 duration-200`).

### RF-06: Barra de Navegación Inferior (BottomNav) con Puntero Deslizante
- **RF-06.1:** La navegación principal debe situarse anclada a la base de la pantalla, con altura de al menos 64px y relleno inferior para `safe-area-inset-bottom`.
- **RF-06.2:** La barra debe estructurarse con la clase `glass` y un borde superior `border-white/5`.
- **RF-06.3:** La pestaña activa debe indicarse mediante:
  1. Color destacado de icono y tipografía en `--brand-focus` (`text-brand-focus font-bold`).
  2. Barra indicadora luminosa deslizante superior (`absolute top-0 h-0.5 w-1/4 bg-brand shadow-lg shadow-brand/50 transition-all duration-200`) que se traslada dinámicamente según el índice activo.

### RF-07: Sobrecarga Progresiva y Telemetría Técnica
- **RF-07.1:** La recomendación de sobrecarga progresiva debe presentarse en una tarjeta elevada (`bg-surface-elevated`) con:
  - Etiqueta superior en mayúsculas `text-[11px] font-medium uppercase tracking-wider text-content-2`.
  - Botón/badge destacado de recomendación con pulso suave (`animate-pulse`), fondo `bg-neon/15`, texto `text-neon` y sombra `shadow-lg shadow-neon/20`.
  - Carga sugerida en tipografía monoespaciada grande (`font-mono text-4xl font-bold text-content`) con unidad en `text-sm text-content-2`.
  - Delta comparativo respecto a la sesión previa con color neón (`+2.5 kg vs. sesión anterior`).
  - Justificación biomecánica en prosa clara en español (`text-[13px] leading-relaxed text-content-2`).

### RF-08: Temporizador de Descanso (RestTimerBar) Ergonómico
- **RF-08.1:** El temporizador debe presentarse como una barra flotante de cristal anclada directamente sobre la navegación inferior (`glass border-t border-white/5`).
- **RF-08.2:** El contador regresivo debe mostrarse en formato monoespaciado gigante (`font-mono text-3xl font-bold leading-none text-content`).
- **RF-08.3:** Debe proporcionar acceso rápido a un botón de adición `+30s` (`min-h-12 min-w-12 rounded-xl bg-surface-2`) y un botón de salto de descanso en color ámbar (`bg-amber text-ink font-bold shadow-lg shadow-amber/30`).
- **RF-08.4:** Debe exhibir una barra de progreso inferior de color ámbar con transición suave de 500ms (`transition-all duration-500 ease-out`).

### RF-09: Normalización Decimal y Manejo de Entradas Numéricas
- **RF-09.1:** Los inputs deben admitir indistintamente punto (`.`) o coma (`,`) en teclados móviles, transformándola instantáneamente a punto en el estado.
- **RF-09.2:** Las unidades ("kg", "reps", "seg") deben situarse siempre de forma externa o con posicionamiento absoluto protegido, sin interferir con la edición numérica ni recortar el valor visible.
- **RF-09.3:** Ante pérdida de foco (`blur`), los valores ingresados deben persistir automáticamente en el estado de la serie en curso sin resetearse.

### RF-10: Modales, Bottom Sheets y Prevención de Descartes Accidentales
- **RF-10.1:** En pantallas móviles, los modales se despliegan como **Bottom Sheets** con fondo `bg-surface-1`, esquinas superiores redondeadas (`rounded-t-2xl`), borde superior `border-line-strong` y backdrop oscuro difuminado (`bg-black/70 backdrop-blur-xs`).
- **RF-10.2:** Acciones destructivas (ej. "Descartar sesión", "Eliminar rutina") requieren diálogo de confirmación de dos pasos con botón de alerta en rojo fatiga (`bg-fatigue text-white min-h-[48px]`).
- **RF-10.3:** El evento de retroceso del navegador (`popstate`) debe ser interceptado para cerrar el modal o sheet abierto sin abandonar la sesión de entrenamiento.

### RF-11: Estados de Sobrecarga, Descarga (Deload) y Molestia/Fatiga
- **RF-11.1:** Las semanas de descarga (*deload*) deben destacarse con una tarjeta de advertencia suave con acento ámbar: `border-l-4 border-amber bg-amber/10 p-3 shadow-lg shadow-amber/10` con icono de rayo (`Zap text-amber`).
- **RF-11.2:** Los reportes de dolor o molestia articular durante la sesión deben destacar en un contenedor con borde ámbar o rojo fatiga y texto orientador sobre ajuste de rango y tempo.

### RF-12: Visualización de Progreso del Atleta y Sparklines Vectoriales
- **RF-12.1:** La sección de perfil del atleta debe incorporar un gráfico de línea minimalista (*Sparkline SVG*) para el pesaje corporal reciente, con gradiente de relleno vertical y trazo nítido en color de éxito (`text-success`).
- **RF-12.2:** La selección de objetivos atléticos, experiencia y días por semana debe emplear selectores tipo *Pill Group* con icono representativo, área táctil mínima de 48px y estado activo con borde e iluminación de marca (`border-brand bg-brand/15 text-content shadow-lg shadow-brand/20`).

---

## 4. Requisitos No Funcionales (RNF)

| ID | Requisito No Funcional | Criterio de Aceptación y Validación |
|---|---|---|
| **RNF-01** | **Accesibilidad y Contraste WCAG 2.1 AA** | Todo texto menor a 18px debe conservar un contraste mínimo de **4.5:1** contra su superficie adyacente. Elementos interactivos y bordes funcionales deben cumplir con al menos **3:1** (WCAG 1.4.11). |
| **RNF-02** | **Fluidez de Renderizado a 60 FPS** | Las transiciones de pestañas, expansión de steppers y micro-animaciones no deben producir bloqueos del hilo principal (*jank* o *layout shifts*); `transform` y `opacity` deben usarse para todas las animaciones de interacción. |
| **RNF-03** | **Cero Regresiones en Lógica de Negocio** | Ningún cambio estético debe alterar la firma de props, llamadas a la API (`apiClient`), mutaciones de React Query, transacciones en `offlineStore` o hooks de sincronización offline. |
| **RNF-04** | **Compatibilidad Estricta de Idioma (Español)** | Todos los títulos, labels, botones, unidades, modales y mensajes orientadores visibles deben permanecer redactados íntegramente en español, en cumplimiento de la Regla 6 de la Constitución. |
| **RNF-05** | **Ergonomía One-Hand en 320px–390px** | La interfaz completa debe ser utilizable con una sola mano en pantallas de 320px (ej. iPhone SE) hasta 390px (ej. iPhone 14/15/16 estándar) sin reacomodo de agarre ni truncamiento de textos esenciales. |

---

## 5. Matriz de Mapeo de Tokens (Compatibilidad entre Sistemas)

Para garantizar una transición limpia sin romper tests unitarios de estilo o componentes preexistentes, el siguiente mapa define la coexistencia y equivalencia entre tokens actuales y los nuevos tokens de Lovable:

| Concepto Visual | Token Actual SmartForge | Nuevo Token Lovable | Valor CSS / Expresión |
|---|---|---|---|
| Fondo Pantalla Exterior | `bg-black` | `bg-shell` | `oklch(0 0 0)` / `#000000` |
| Fondo Contenedor Móvil | `bg-base` / `#0C0C0E` | `bg-ink`, `bg-base` | `oklch(0.15 0.004 286)` (~`#111114`) |
| Tarjeta Estándar | `bg-surface-1` / `#18181B` | `bg-surface-1`, `bg-card` | `oklch(0.21 0.006 286)` (~`#1a1a20`) |
| Control Elevado / Input | `bg-surface-2` / `#27272A` | `bg-surface-2`, `bg-input` | `oklch(0.274 0.006 286)` (~`#272730`) |
| Tarjeta Sobrecarga / KPI | N/A | `bg-surface-elevated` | `oklch(0.235 0.007 286)` (~`#212128`) |
| Botón Primario / Brand | `bg-brand-primary` / `#3B82F6` | `bg-brand`, `bg-primary` | `oklch(0.623 0.188 259.8)` |
| Foco / Tab Activo | `brand-focus` / `#60A5FA` | `text-brand-focus`, `ring-brand-focus` | `oklch(0.707 0.143 254.6)` |
| Éxito / Serie Registrada | `status-success` / `#22C55E` | `text-success`, `bg-success` | `oklch(0.723 0.192 149.6)` |
| Sobrecarga / Hiper-Progreso | N/A | `text-neon`, `bg-neon` | `oklch(0.866 0.29 142.5)` |
| Descanso / Energía | `status-warning` / `#F59E0B` | `text-amber`, `bg-amber` | `oklch(0.769 0.165 70.1)` |
| Destructivo / Fatiga | `status-error-bg` / `#EF4444` | `bg-fatigue`, `text-fatigue-text` | `oklch(0.637 0.208 25.3)` |
| Borde Sutil | `border-border-subtle` / `#27272A` | `border-line`, `border-border` | `oklch(0.274 0.006 286)` |
| Borde Fuerte / Interactivo | `border-border-interactive` / `#52525B` | `border-line-strong` | `oklch(0.442 0.014 286)` |
| Borde Vidrio Flotante | N/A | `border-white/5` | `rgba(255, 255, 255, 0.05)` |
| Texto Principal | `content-primary` / `#FFFFFF` | `text-content`, `text-foreground` | `oklch(1 0 0)` / `#FFFFFF` |
| Texto Secundario | `content-secondary` / `#A1A1AA` | `text-content-2`, `text-muted-foreground` | `oklch(0.712 0.013 286)` |
| Texto Inactivo / Caption | `content-disabled` / `#71717A` | `text-content-3` | `oklch(0.552 0.014 286)` |
