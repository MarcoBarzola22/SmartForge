# Plan de Implementación Técnica — 002-smartforge-ui-ux

> **Épica:** Rediseño del Sistema de Diseño UI/UX  
> **Especificación:** [specs/002-smartforge-ui-ux/spec.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/specs/002-smartforge-ui-ux/spec.md)  
> **Constitución:** [docs/constitution.md](file:///f:/INGENIERIA/Proyectos%20Personales/SmartForge/docs/constitution.md) (Reglas 2 y 6)  
> **Estado:** Listo para Ejecución  

---

## 1. Árbol de Jerarquía de Componentes React Afectados

El rediseño impacta tanto la capa de arquitectura de layout como los componentes atómicos primitivos y las vistas compuestas de SmartForge.

```text
App (Root)
│
├── MobileLayout [RF-02, RF-03, RF-10]
│   │
│   ├── ContextHeader (Contextual / Redundancia Superior) [RF-04]
│   │   ├── Title + Subtitle (DM Sans, H1/Caption)
│   │   └── SyncStatusBadge [RNF-05]
│   │
│   ├── ScrollableContentArea (Viewport dinámico: height: visualViewport.height - 64px) [RF-03, RF-10]
│   │   │
│   │   ├── [Vistas / Pantallas]
│   │   │   ├── LoginPage [RF-11, RF-14]
│   │   │   ├── ProfilePage [RF-05, RF-11]
│   │   │   ├── MesocyclePage / RoutineEditorPage [RF-05, RF-14]
│   │   │   │
│   │   │   ├── ExerciseCatalogPage [RF-06, RF-08, RF-09]
│   │   │   │   ├── SearchTriggerBar (Zona de pulgar) [RF-04, RF-06]
│   │   │   │   ├── FilterTriggerButton [RF-06, RF-08]
│   │   │   │   ├── ExerciseList (Virtualized / Progressive) [RF-15, RNF-07]
│   │   │   │   │   └── ExerciseCard [RF-08, RF-15]
│   │   │   │   │       ├── ExerciseTitle (1 línea elipsis + tap toggle) [RF-15]
│   │   │   │   │       └── MuscleGroupBadge [RF-08]
│   │   │   │   └── FilterBottomSheet (Lista vertical modal) [RF-06, RF-16, RF-17]
│   │   │   │
│   │   │   └── SessionPage (Entrenamiento en Vivo) [RF-07, RF-12, RF-13]
│   │   │       ├── RestTimerBar (Display 32px + Cancelación anticipada) [RF-18, RF-20]
│   │   │       └── ActiveExerciseWorkspace (Sticky Workspace inferior) [RF-07]
│   │   │           └── ModularSetCard (Estructura apilada para 320px) [RF-12]
│   │   │               ├── SetHeader (Set N° + Historial truncado < 65%) [RF-12]
│   │   │               ├── WeightInputRow [RF-08, RF-12, RF-13]
│   │   │               │   ├── StepperButton [-] (48×48px) [RF-08]
│   │   │               │   ├── NumericInputField (Normalización decimal , -> .) [RF-13, RF-23]
│   │   │               │   ├── ExternalUnitLabel ("kg") [RF-13]
│   │   │               │   └── StepperButton [+] (48×48px) [RF-08]
│   │   │               ├── RepsInputRow [RF-08, RF-12, RF-13]
│   │   │               │   ├── StepperButton [-] (48×48px) [RF-08]
│   │   │               │   ├── NumericInputField (Dígitos enteros) [RF-13, RF-23]
│   │   │               │   ├── ExternalUnitLabel ("reps") [RF-13]
│   │   │               │   └── StepperButton [+] (48×48px) [RF-08]
│   │   │               └── SetCompletionRow [RF-04, RF-08, RF-21]
│   │   │                   ├── RpeSelectorButton (≥ 48×48px) [RF-08]
│   │   │                   └── CheckCompleteButton (48×48px + Debounce < 50ms) [RF-19, RF-21]
│   │   │
│   │   ├── EmptyState [RF-20, RF-22]
│   │   └── CentralizedSpinner [RF-20, RF-22]
│   │
│   ├── ToastContainer (Anclado a 12px sobre la barra activa) [RF-17, RF-19]
│   │   └── Toast (Accesible, auto-dismiss con acción de reintento) [RF-19, RF-21]
│   │
│   ├── KeyboardActionBar (Anclada sobre visualViewport, h: 64px) [RF-03, RF-14]
│   │   ├── SecondaryActionButton ("Volver / Cancelar", 48px) [RF-04, RF-14]
│   │   └── PrimaryActionButton ("Guardar", 48px, texto carbón) [RF-04, RF-14, RNF-01]
│   │
│   ├── BottomNav (Tab Bar Fija, h: 64px + safe-area-bottom) [RF-01, RF-02]
│   │   ├── NavTabItem (Área táctil 48×48px, Icono 24px + Label 12px) [RF-02]
│   │   └── SegmentedSubNav (Sub-navegación interna anclada en zona de pulgar) [RF-04]
│   │
│   └── BottomSheetModal / ConfirmDialog [RF-16, RF-17, RF-18]
│       ├── SheetBackdrop (Bloqueo de scroll: overscroll-behavior: contain) [RF-16]
│       ├── SheetContent (Transición a Full-Screen con teclado) [RF-16]
│       └── DestructiveActionConfirm (Confirmación en dos pasos, botón #EF4444) [RF-18]
```

---

## 2. Configuración Base del Sistema de Diseño (Tailwind Tokens)

La arquitectura de estilos se asienta sobre la escala tipográfica, métrica y cromática unívoca especificada en `spec.md` (§2), respetando la Regla 2 (Mobile-First, One-Hand) y la Regla 6 (Interfaz en Español).

### 2.1 Definición de Tokens (`tailwind.config.js` / `@theme` de Tailwind)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      'xs': '320px',
      'mobile': '360px',
      'mobile-max': '390px', // Techo constitucional (docs/constitution.md R2)
      'sm': '640px',
      'md': '768px',
    },
    extend: {
      colors: {
        base: '#0C0C0E',           // Fondo raíz Dark mode único
        surface: {
          1: '#18181B',             // Elevación 1: Cards y barras
          2: '#27272A',             // Elevación 2: Inputs y steppers
          disabled: '#27272A',      // Fondo controles inactivos
        },
        border: {
          subtle: '#27272A',
          interactive: '#52525B',  // 3.2:1 WCAG 1.4.11
          disabled: '#3F3F46',
        },
        brand: {
          primary: '#3B82F6',       // Azul Eléctrico
          contrast: '#0C0C0E',      // Texto sobre botón primario (8.4:1 AAA)
          focus: '#60A5FA',         // Anillo focus-visible (3.8:1 a 5.2:1)
        },
        content: {
          primary: '#FFFFFF',       // Títulos y valores (17.8:1 AAA)
          secondary: '#A1A1AA',     // Metadatos y labels (6.5:1 AA)
          disabled: '#71717A',      // Labels inactivos (3.5:1)
        },
        status: {
          success: '#22C55E',       // Series completadas, PRs (6.1:1)
          error: {
            text: '#F87171',        // Texto de error en Surface 1 y 2 (5.6:1 AA)
            bg: '#EF4444',          // Botón destructivo con texto blanco (4.8:1 AA)
          },
          warning: '#F59E0B',       // Offline y descanso (7.5:1)
        },
      },
      spacing: {
        '1': '4px',                 // space-1
        '2': '8px',                 // space-2 (separación táctil mínima obligatoria)
        '3': '12px',                // space-3
        '4': '16px',                // space-4 (padding estándar)
        '5': '20px',                // space-5
        '6': '24px',                // space-6
        '8': '32px',                // space-8
        '12': '48px',               // space-12 (diana táctil mínima constitucional)
        '16': '64px',               // space-16 (altura fija Bottom Tab Bar y Action Bar)
      },
      minWidth: {
        'touch': '48px',            // Diana mínima de toque
        'btn-text': '120px',        // Botón interactivo con texto
      },
      minHeight: {
        'touch': '48px',            // Diana mínima constitucional R2
        'bar': '64px',              // Barras fijas
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '38px', fontWeight: '700' }],
        'h1': ['24px', { lineHeight: '30px', fontWeight: '700' }],
        'h2': ['20px', { lineHeight: '26px', fontWeight: '600' }],
        'h3': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'num-lg': ['24px', { lineHeight: '28px', fontWeight: '600' }],
        'num-md': ['14px', { lineHeight: '18px', fontWeight: '500' }],
      },
      borderRadius: {
        'component': '8px',
        'card': '12px',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
```
*(Cubre: §2.1, §2.2, §2.3, RF-02, RF-03, RF-08, RF-09, RNF-01, RNF-02, RNF-03, RNF-04)*

---

## 3. Mapeo de Componentes shadcn/ui Requeridos

Se adaptan e implementan bajo la arquitectura atómica de SmartForge para cumplir estrictamente las restricciones de accesibilidad y dimensiones mínimas:

| Componente shadcn/ui | Adaptación y Requisito Funcional en SmartForge | Archivo Objetivo |
|---|---|---|
| **Button** | Altura fija base `min-h-[48px]`, `min-w-[120px]` (o `min-w-[48px]` para icono). Soporta variante primaria (Azul `#3B82F6` + texto negro `#0C0C0E`), secundaria (borde `#52525B` + texto blanco), destructiva (`#EF4444`) e inline spinner. Manejo estricto de wrap hasta 2 líneas (`max-h-[64px]`) con elipsis en 2ª línea. *(Cubre: RF-08, RF-14, RF-19, RF-21)* | `src/components/ui/Button.tsx` |
| **Card** | Superficie `#18181B`, bordes `#27272A`, `rounded-card` (12px), `p-4`. Contenedor rígido con `w-full overflow-hidden` para blindar contra scroll horizontal. *(Cubre: RF-10, RF-12)* | `src/components/ui/Card.tsx` |
| **Sheet (Bottom Sheet)** | Reemplaza modales flotantes. Anclado al fondo (`bottom-0 w-full`), con `overscroll-behavior: contain`. Transición automática a pantalla completa (`h-full`) cuando emerge el teclado virtual. Interceptación de `popstate` para cerrar con botón atrás del SO. *(Cubre: RF-06, RF-16, RF-17)* | `src/components/ui/Sheet.tsx` |
| **Input** | Superficie `#27272A`, borde `#52525B` en idle y anillo `#60A5FA` en focus. Altura `min-h-[48px]`. Soporta normalización transparente de coma a punto decimal (`, -> .`). Etiqueta de unidad externa ("kg", "reps"). *(Cubre: RF-08, RF-13, RF-23, RNF-02)* | `src/components/ui/Input.tsx` |
| **Badge** | Altura mínima adaptada para selección interactiva (Chips de `min-h-[48px]` y badges informativos de `min-h-[24px]`). Colores de estado estandarizados. *(Cubre: RF-08, RF-09)* | `src/components/ui/Badge.tsx` |
| **Toast** | Alerta flotante no bloqueante. Anclada a `bottom-[76px]` (exactamente 12px sobre la Bottom Tab Bar de 64px). Acción de reintento integrada. Texto en español. *(Cubre: RF-17, RF-19, RF-21)* | `src/components/ui/Toast.tsx` |
| **AlertDialog (Confirm)** | Bottom Sheet de confirmación en 2 pasos para acciones destructivas en la mitad inferior. Botón rojo confirmado de 48px + Botón cancelar de 48px. *(Cubre: RF-04, RF-18)* | `src/components/ui/AlertDialog.tsx` |

---

## 4. Estrategia de Prevención de Colapsos y Desbordamientos

Para erradicar definitivamente los colapsos de botones y desbordamientos en pantallas desde `320px` (iPhone SE 1ª gen) hasta `390px` (techo constitucional), se aplican las siguientes reglas de composición CSS:

### 4.1 Protección de Dianas Interactivas (`flex-shrink-0`)
- **Regla:** Ningún botón de control táctil (steppers `[-]` / `[+]`, botones de check, avatares o iconos de navegación) puede tener permitido encogerse.
- **Implementación:** Se aplica obligatoriamente la clase `flex-shrink-0` (o `shrink-0`) en combinación con `w-12 h-12` (`48×48px`). Si el contenedor padre se comprime, el contenido fluido (inputs o textos) absorbe la reducción, nunca los botones táctiles. *(Cubre: RF-08, RF-12)*

### 4.2 Botones con Texto Largo y Wraps Controlados
- **Regla:** Si dos botones coexisten horizontalmente en un viewport de 320px y el ancho combinado supera `288px` (320px menos padding), la barra de botones conmuta a `flex-col w-full`, apilando los botones verticalmente.
- **Implementación:** 
  ```css
  /* Estructura para botones con texto */
  min-height: 48px;
  max-height: 64px;
  min-width: 120px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.2;
  ```
  Si el texto sobrepasa 1 línea, salta a 2 líneas aumentando la altura hasta `64px`. Si un texto patológico supera 2 líneas, se corta en la segunda línea mediante `line-clamp-2` con elipsis (`…`), impidiendo deformaciones de layout. Los botones hermanos en la misma fila adoptan `self-stretch` para igualar la altura. *(Cubre: RF-14)*

### 4.3 Truncamiento Táctil Reversible en Tarjetas
- **Regla:** Los títulos de ejercicios y descripciones largas tienen `line-clamp-1` o `line-clamp-2` con elipsis en estado normal.
- **Implementación:** El componente encapsula el estado `isExpanded: boolean`. Un toque sobre el texto conmuta (`toggle`) la expansión inline. Si la expansión vertical empuja controles de acción fuera de la vista visible, un observador (`scrollIntoView({ block: 'nearest', behavior: 'smooth' })`) reubica los controles en el tercio inferior del viewport. Prohibido el uso de tooltips (hover). *(Cubre: RF-15)*

### 4.4 Blindaje Global contra Scroll Horizontal (`w-full` y `overflow-x-hidden`)
- **Regla:** La raíz `MobileLayout` y todo contenedor de página implementa `w-full max-w-[390px] overflow-x-hidden mx-auto`.
- **Implementación:** Las tablas clásicas se reemplazan por tarjetas modulares apiladas (`ModularSetCard`). Cada fila del set ocupa el 100% del ancho interno sin depender de anchos fijos mayores a `280px`. *(Cubre: RF-10, RF-12)*

---

## 5. Estrategia de Tests y Validación de Calidad

Siguiendo la **Regla 4 de la Constitución** (*Tests como puerta de entrada*), ningún componente o vista se considerará terminado sin tests automatizados que verifiquen renderizado, dimensiones mínimas y accesibilidad.

### 5.1 Tests Unitarios de Renderizado y Dimensiones Táctiles (Vitest + Testing Library)
Se implementará una suite de pruebas para verificar las dimensiones computadas de los componentes:

1. **`Button.test.tsx`:**
   - Verifica que el botón primario renderiza con fondo `#3B82F6` y texto `#0C0C0E` (*WCAG AAA*).
   - Verifica que en estado de carga (`isLoading={true}`) el botón se deshabilita (`disabled`), muestra el rol `status` o spinner inline y rechaza eventos de click (*RF-19, RF-21*).
   - Verifica que ante un texto largo de prueba, el botón aplica `line-clamp-2` y no colapsa su altura por debajo de 48px (*RF-14*).

2. **`Input.test.tsx`:**
   - Verifica que al teclear coma (`,`) en un campo numérico, el valor se normaliza automáticamente a punto (`.`) (*RF-13*).
   - Verifica que el input mantiene su área de contacto táctil de al menos 48px de alto (*RF-08*).

3. **`BottomNav.test.tsx`:**
   - Verifica que la barra inferior tiene una altura base de 64px (`h-16`) y que cada tab interactivo mide como mínimo 48×48px (*RF-02*).
   - Verifica que todos los labels e iconos están presentes en idioma español (*RNF-05, Constitución R6*).

4. **`ModularSetCard.test.tsx`:**
   - Renderiza la tarjeta en un viewport simulado de `320px`.
   - Verifica que los steppers `[-]` y `[+]` tienen la clase `shrink-0` y dimensiones de 48×48px (*RF-12*).
   - Verifica que no existen desbordamientos de ancho que excedan `320px`.

### 5.2 Verificación de Roles ARIA y Accesibilidad
- **Roles y Atributos:**
  - `role="button"` y `aria-disabled="true"` en botones interactivos deshabilitados.
  - `role="navigation"` y `aria-label="Navegación principal"` en la Bottom Tab Bar.
  - `role="dialog"` y `aria-modal="true"` con `aria-labelledby` en los Bottom Sheets.
  - `role="alert"` y `aria-live="polite"` en notificaciones Toast y mensajes de error de validación.
  - `:focus-visible`: Verificación de la presencia del anillo de foco `#60A5FA` con offset en componentes accionados por teclado.
- **Auditoría Automatizada:**
  - Inclusión de `axe-core` / `@axe-core/react` en la batería de tests para verificar automáticamente contraste cromático (WCAG 2.1 AA) y targets táctiles en cada componente.

---

## 6. Mapeo de Cobertura de Requisitos Funcionales (RF)

| Requisito Funcional | Sección del Plan que lo Cubre | Mecanismo de Implementación |
|---|---|---|
| **RF-01** (Bottom Tab Bar Fija) | §1 (Árbol), §3 (Mapeo) | `BottomNav.tsx` como footer fijo en `MobileLayout`. |
| **RF-02** (Altura 64px + Safe Area) | §2 (Tokens), §5 (Tests) | Token `space-16` (64px) + `pb-[env(safe-area-inset-bottom)]`. |
| **RF-03** (Teclado Virtual y Action Bar 64px) | §1 (Árbol), §4 (Estrategia) | Viewport ajustado a `height - 64px` + Action Bar pegada al teclado. |
| **RF-04** (Mitad Inferior Universal) | §1 (Árbol), §3 (Mapeo) | Action Bar inferior para "Atrás" y sub-navegación segmentada en zona baja. |
| **RF-05** (Thumb-Zone Initializer) | §1 (Árbol) | Enfoque secuencial y botones inferiores de avance en formularios. |
| **RF-06** (Filtros en Bottom Sheet) | §1 (Árbol), §3 (Mapeo) | Bottom Sheet modal vertical para filtros musculares (cero scroll horizontal). |
| **RF-07** (Sticky Workspace de Serie Activa) | §1 (Árbol) | Área activa centrada en la mitad inferior con auto-scroll suave. |
| **RF-08** (Dianas Táctiles ≥ 48×48px) | §2 (Tokens), §4 (Prevención) | Utilidades `min-h-[48px]`, `min-w-[48px]` y `touch-target`. |
| **RF-09** (Separación Mínima 8px) | §2 (Tokens) | Token `space-2` (8px) obligatorio entre controles contiguos. |
| **RF-10** (Cero Scroll Horizontal) | §4 (Prevención), §5 (Tests) | `overflow-x-hidden` global y tarjetas modulares apiladas en 1 columna. |
| **RF-11** (Formularios en 1 Columna) | §1 (Árbol), §4 (Prevención) | Disposición vertical estricta en viewports ≤ 390px. |
| **RF-12** (Series Modulares en 320px) | §1 (Árbol), §4 (Prevención) | Fila de peso y reps independientes de ancho completo con steppers de 48px. |
| **RF-13** (Unidad Externa y Normalización) | §3 (Mapeo), §5 (Tests) | Label estático exterior y normalización en tiempo real de `,` a `.`. |
| **RF-14** (Botones con Wrap a 64px) | §2 (Tokens), §4 (Prevención) | Wrap a 2 líneas, `line-clamp-2` con elipsis, apilamiento vertical en 320px. |
| **RF-15** (Truncamiento Táctil Reversible) | §4 (Prevención) | Tap toggle para expandir/contraer con auto-scroll corrector. |
| **RF-16** (Bottom Sheet y Teclado Full-Screen) | §3 (Mapeo), §4 (Prevención) | `Sheet.tsx` que conmuta a pantalla completa ante teclado abierto. |
| **RF-17** (Gesto Atrás del SO en Sheets) | §3 (Mapeo) | Interceptación de evento `popstate` para cerrar solo el sheet activo. |
| **RF-18** (Confirmación Destructiva en 2 Pasos) | §3 (Mapeo) | `AlertDialog.tsx` en mitad inferior con botón rojo destructivo. |
| **RF-19** (Toasts a 12px sobre Barra) | §1 (Árbol), §3 (Mapeo) | `Toast.tsx` anclado a `bottom-[76px]` sin obstruir navegación. |
| **RF-20** (Descanso y Cancelación Anticipada) | §1 (Árbol) | Timer con reseteo y cancelación en Notification Manager al avanzar de serie. |
| **RF-21** (Debounce < 50ms y Red) | §3 (Mapeo), §5 (Tests) | Bloqueo inmediato, spinner inline y recuperación ante errores de red. |
| **RF-22** (Estados de Carga y Vacíos en Español) | §1 (Árbol), §5 (Tests) | Textos y mensajes orientadores en español (Constitución R6). |
| **RF-23** (Persistencia ante Blur) | §1 (Árbol), §3 (Mapeo) | Almacenamiento local del estado en inputs sin reseteo. |
