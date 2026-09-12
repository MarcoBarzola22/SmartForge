import { pool } from '../../config/db.js';
import { seedEquipment } from './equipment.seed.js';

export interface ExerciseSeedItem {
  id: string;
  name: string;
  movement_pattern: 'empuje' | 'tiron' | 'rodilla_dominante' | 'cadera_dominante' | 'core';
  primary_muscle: 'pecho' | 'espalda' | 'cuadriceps' | 'isquiosurales' | 'gluteos' | 'hombros' | 'biceps' | 'triceps' | 'pantorrillas' | 'core';
  secondary_muscles: string[];
  equipment_id: string;
  is_compound: boolean;
  initial_load_ratio: number;
  video_url: string;
  video_fallback_url: string;
  instructions: string;
  is_active: boolean;
}

export interface ExerciseAlternativeSeedItem {
  original_exercise_id: string;
  alternative_exercise_id: string;
  similarity_score: number;
}

const rawExercises: ExerciseSeedItem[] = [
  // ==========================================
  // 1. EMPUJE - PECHO (25 ejercicios)
  // ==========================================
  {
    id: 'press_banca_plano_barra',
    name: 'Press de banca plano con barra',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.65,
    video_url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_banca_plano_barra.webp',
    instructions: 'Apoya bien los pies, retrae escápulas y baja la barra al esternón con control.',
    is_active: true
  },
  {
    id: 'press_banca_plano_mancuernas',
    name: 'Press de banca plano con mancuernas',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'dumbbells',
    is_compound: true,
    initial_load_ratio: 0.55,
    video_url: 'https://www.youtube.com/watch?v=VmB1G1K7v94',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_banca_plano_mancuernas.webp',
    instructions: 'Desciende las mancuernas abriendo los codos a 45 grados y presiona hacia arriba sin chocar.',
    is_active: true
  },
  {
    id: 'press_inclinado_barra',
    name: 'Press de banca inclinado con barra',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros', 'triceps'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.55,
    video_url: 'https://www.youtube.com/watch?v=SrqOu55lrYU',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_inclinado_barra.webp',
    instructions: 'Banco a 30-45 grados, baja la barra a la parte superior del pecho.',
    is_active: true
  },
  {
    id: 'press_inclinado_mancuernas',
    name: 'Press de banca inclinado con mancuernas',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros', 'triceps'],
    equipment_id: 'dumbbells',
    is_compound: true,
    initial_load_ratio: 0.50,
    video_url: 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_inclinado_mancuernas.webp',
    instructions: 'Mantén las muñecas neutras y empuja verticalmente con los codos controlados.',
    is_active: true
  },
  {
    id: 'press_declinado_barra',
    name: 'Press de banca declinado con barra',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.65,
    video_url: 'https://www.youtube.com/watch?v=LfyQBUKR8SE',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_declinado_barra.webp',
    instructions: 'Fija las piernas en el banco declinado y desciende hacia la parte inferior del pectoral.',
    is_active: true
  },
  {
    id: 'press_declinado_mancuernas',
    name: 'Press de banca declinado con mancuernas',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'dumbbells',
    is_compound: true,
    initial_load_ratio: 0.55,
    video_url: 'https://www.youtube.com/watch?v=8xX2nK4kY_0',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_declinado_mancuernas.webp',
    instructions: 'Excelente variante para enfatizar porción costal con rango de movimiento libre.',
    is_active: true
  },
  {
    id: 'press_pecho_maquina_smith',
    name: 'Press plano en máquina Smith',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'smith_machine',
    is_compound: true,
    initial_load_ratio: 0.60,
    video_url: 'https://www.youtube.com/watch?v=4y1aR2_yqN8',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_pecho_maquina_smith.webp',
    instructions: 'Alinea la barra a la altura de los pezones y empuja de manera guiada.',
    is_active: true
  },
  {
    id: 'press_inclinado_maquina_smith',
    name: 'Press inclinado en máquina Smith',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros', 'triceps'],
    equipment_id: 'smith_machine',
    is_compound: true,
    initial_load_ratio: 0.50,
    video_url: 'https://www.youtube.com/watch?v=07nIqWjAupQ',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_inclinado_maquina_smith.webp',
    instructions: 'Enfoca la clavícula alta con máxima estabilidad de la máquina.',
    is_active: true
  },
  {
    id: 'flexiones_pecho_suelo',
    name: 'Flexiones de pecho clásicas',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'core'],
    equipment_id: 'bodyweight',
    is_compound: true,
    initial_load_ratio: 0.60,
    video_url: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/flexiones_pecho_suelo.webp',
    instructions: 'Cuerpo en plancha firme, baja hasta rozar el pecho en el suelo.',
    is_active: true
  },
  {
    id: 'flexiones_declinadas',
    name: 'Flexiones declinadas con pies elevados',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros', 'triceps'],
    equipment_id: 'plyo_box',
    is_compound: true,
    initial_load_ratio: 0.70,
    video_url: 'https://www.youtube.com/watch?v=5kKq_Z1W6nE',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/flexiones_declinadas.webp',
    instructions: 'Eleva los pies sobre una caja o banco para aumentar el énfasis en haz clavicular.',
    is_active: true
  },
  {
    id: 'flexiones_inclinadas',
    name: 'Flexiones inclinadas con manos elevadas',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'flat_bench',
    is_compound: true,
    initial_load_ratio: 0.45,
    video_url: 'https://www.youtube.com/watch?v=a3G_Q6E_gWk',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/flexiones_inclinadas.webp',
    instructions: 'Variante accesible apoyando las manos en banco plano.',
    is_active: true
  },
  {
    id: 'fondos_paralelas_pecho',
    name: 'Fondos en paralelas con torso inclinado',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'dip_station',
    is_compound: true,
    initial_load_ratio: 0.75,
    video_url: 'https://www.youtube.com/watch?v=2z8JmcrW-As',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/fondos_paralelas_pecho.webp',
    instructions: 'Inclina el tronco hacia adelante para mayor activación de pectorales.',
    is_active: true
  },
  {
    id: 'aperturas_mancuernas_banco_plano',
    name: 'Aperturas con mancuernas en banco plano',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros'],
    equipment_id: 'dumbbells',
    is_compound: false,
    initial_load_ratio: 0.25,
    video_url: 'https://www.youtube.com/watch?v=eozdVDA78K0',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/aperturas_mancuernas_banco_plano.webp',
    instructions: 'Ligera flexión de codo constante, abre en arco amplio sintiendo estiramiento pectoral.',
    is_active: true
  },
  {
    id: 'aperturas_mancuernas_inclinado',
    name: 'Aperturas con mancuernas en banco inclinado',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros'],
    equipment_id: 'dumbbells',
    is_compound: false,
    initial_load_ratio: 0.22,
    video_url: 'https://www.youtube.com/watch?v=ajdFwb-xaNo',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/aperturas_mancuernas_inclinado.webp',
    instructions: 'Banco a 30 grados, enfatiza la parte superior del pectoral.',
    is_active: true
  },
  {
    id: 'cruces_poleas_altas',
    name: 'Cruces en polea alta para pecho',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros'],
    equipment_id: 'cable_crossover',
    is_compound: false,
    initial_load_ratio: 0.20,
    video_url: 'https://www.youtube.com/watch?v=taI4XduLpTk',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/cruces_poleas_altas.webp',
    instructions: 'Tira de arriba hacia abajo y cruza las manos al frente apretando el pectoral.',
    is_active: true
  },
  {
    id: 'cruces_poleas_bajas',
    name: 'Cruces en polea baja para pecho',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros'],
    equipment_id: 'cable_crossover',
    is_compound: false,
    initial_load_ratio: 0.18,
    video_url: 'https://www.youtube.com/watch?v=4Y2ZdHCOXok',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/cruces_poleas_bajas.webp',
    instructions: 'Lleva las manijas de abajo hacia arriba y al centro del pecho.',
    is_active: true
  },
  {
    id: 'press_suelo_mancuernas',
    name: 'Floor press con mancuernas',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'dumbbells',
    is_compound: true,
    initial_load_ratio: 0.50,
    video_url: 'https://www.youtube.com/watch?v=uUGDRwge4F8',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_suelo_mancuernas.webp',
    instructions: 'Acostado en el suelo, apoya los codos suavemente y empuja explosivamente.',
    is_active: true
  },
  {
    id: 'press_svend_kettlebell',
    name: 'Press Svend con kettlebell',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros'],
    equipment_id: 'kettlebell',
    is_compound: false,
    initial_load_ratio: 0.15,
    video_url: 'https://www.youtube.com/watch?v=3lV4Tj6lW8M',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_svend_kettlebell.webp',
    instructions: 'Comprime la pesa entre ambas palmas a la altura del pecho y extiéndela al frente.',
    is_active: true
  },
  {
    id: 'press_pecho_banda_elastica',
    name: 'Press de pecho con banda elástica',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'resistance_band',
    is_compound: true,
    initial_load_ratio: 0.25,
    video_url: 'https://www.youtube.com/watch?v=xV3_K6D7rXo',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_pecho_banda_elastica.webp',
    instructions: 'Pasa la banda por la espalda y empuja hacia adelante manteniendo tensión constante.',
    is_active: true
  },
  {
    id: 'aperturas_banda_elastica',
    name: 'Aperturas con banda elástica',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros'],
    equipment_id: 'resistance_band',
    is_compound: false,
    initial_load_ratio: 0.18,
    video_url: 'https://www.youtube.com/watch?v=f2nN3z4qY0M',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/aperturas_banda_elastica.webp',
    instructions: 'Ancla la banda detrás y junta las manos simulando un abrazo controlado.',
    is_active: true
  },
  {
    id: 'flexiones_suspension_trx',
    name: 'Flexiones de pecho en suspensión TRX',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'core'],
    equipment_id: 'suspension_trainer',
    is_compound: true,
    initial_load_ratio: 0.50,
    video_url: 'https://www.youtube.com/watch?v=y7QW4vK4Q9o',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/flexiones_suspension_trx.webp',
    instructions: 'Controla la inestabilidad de las correas manteniendo el core firme.',
    is_active: true
  },
  {
    id: 'aperturas_suspension_trx',
    name: 'Aperturas de pecho en TRX',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros', 'core'],
    equipment_id: 'suspension_trainer',
    is_compound: false,
    initial_load_ratio: 0.35,
    video_url: 'https://www.youtube.com/watch?v=wX0kY7V_34k',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/aperturas_suspension_trx.webp',
    instructions: 'Abre los brazos en cruz manteniendo los codos semiflexionados.',
    is_active: true
  },
  {
    id: 'press_guillotina_barra',
    name: 'Press guillotina con barra en banco plano',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.45,
    video_url: 'https://www.youtube.com/watch?v=rK0fX6J2N1M',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_guillotina_barra.webp',
    instructions: 'Agarre amplio, baja la barra suavemente hacia la clavícula con carga moderada.',
    is_active: true
  },
  {
    id: 'press_hexagonal_mancuernas',
    name: 'Press hexagonal (squeeze press) con mancuernas',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'dumbbells',
    is_compound: true,
    initial_load_ratio: 0.40,
    video_url: 'https://www.youtube.com/watch?v=bF4K7m3V_8s',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/press_hexagonal_mancuernas.webp',
    instructions: 'Junta ambas mancuernas presionándolas activamente una contra otra durante el recorrido.',
    is_active: true
  },
  {
    id: 'flexiones_diamante',
    name: 'Flexiones diamante para pecho cerrado y tríceps',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'bodyweight',
    is_compound: true,
    initial_load_ratio: 0.55,
    video_url: 'https://www.youtube.com/watch?v=J0DnG1_S92I',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/flexiones_diamante.webp',
    instructions: 'Forma un diamante con pulgares e índices debajo del esternón y baja controladamente.',
    is_active: true
  }
];

// Helper to expand groups systematically
const generateMuscleExercises = (): ExerciseSeedItem[] => {
  const exercises: ExerciseSeedItem[] = [...rawExercises];

  // ==========================================
  // 2. EMPUJE - HOMBROS (25 ejercicios)
  // ==========================================
  const hombrosData = [
    { id: 'press_militar_barra_pie', name: 'Press militar estricto con barra de pie', eq: 'barbell', comp: true, ratio: 0.45 },
    { id: 'press_militar_barra_sentado', name: 'Press militar con barra sentado', eq: 'barbell', comp: true, ratio: 0.45 },
    { id: 'press_hombros_mancuernas_sentado', name: 'Press de hombros con mancuernas sentado', eq: 'dumbbells', comp: true, ratio: 0.40 },
    { id: 'press_hombros_mancuernas_pie', name: 'Press de hombros con mancuernas de pie', eq: 'dumbbells', comp: true, ratio: 0.38 },
    { id: 'press_arnold_mancuernas', name: 'Press Arnold con mancuernas', eq: 'dumbbells', comp: true, ratio: 0.35 },
    { id: 'press_hombros_maquina_smith', name: 'Press militar en máquina Smith', eq: 'smith_machine', comp: true, ratio: 0.45 },
    { id: 'elevaciones_laterales_mancuernas', name: 'Elevaciones laterales con mancuernas', eq: 'dumbbells', comp: false, ratio: 0.15 },
    { id: 'elevaciones_laterales_polea', name: 'Elevaciones laterales en polea baja', eq: 'cable_crossover', comp: false, ratio: 0.12 },
    { id: 'elevaciones_laterales_banda', name: 'Elevaciones laterales con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.12 },
    { id: 'elevaciones_frontales_barra', name: 'Elevaciones frontales con barra', eq: 'barbell', comp: false, ratio: 0.20 },
    { id: 'elevaciones_frontales_mancuernas', name: 'Elevaciones frontales con mancuernas', eq: 'dumbbells', comp: false, ratio: 0.18 },
    { id: 'elevaciones_frontales_polea', name: 'Elevaciones frontales en polea baja', eq: 'low_row_pulley', comp: false, ratio: 0.18 },
    { id: 'press_hombros_kettlebell_unilateral', name: 'Press militar unilateral con kettlebell', eq: 'kettlebell', comp: true, ratio: 0.30 },
    { id: 'elevaciones_laterales_kettlebell', name: 'Elevaciones laterales con kettlebell', eq: 'kettlebell', comp: false, ratio: 0.12 },
    { id: 'press_pike_suelo', name: 'Flexiones en pica (pike push-ups)', eq: 'bodyweight', comp: true, ratio: 0.50 },
    { id: 'press_pike_pies_elevados', name: 'Flexiones en pica con pies elevados', eq: 'plyo_box', comp: true, ratio: 0.60 },
    { id: 'press_hombros_banda_elastica', name: 'Press de hombros con banda elástica', eq: 'resistance_band', comp: true, ratio: 0.25 },
    { id: 'elevaciones_laterales_inclinado_banco', name: 'Elevaciones laterales en banco inclinado', eq: 'dumbbells', comp: false, ratio: 0.12 },
    { id: 'press_landmine_unilateral', name: 'Press landmine unilateral con barra', eq: 'barbell', comp: true, ratio: 0.30 },
    { id: 'elevaciones_en_y_trx', name: 'Elevaciones en Y para hombros en TRX', eq: 'suspension_trainer', comp: false, ratio: 0.20 },
    { id: 'press_hombros_barra_ez', name: 'Press militar con barra EZ', eq: 'ez_bar', comp: true, ratio: 0.40 },
    { id: 'elevaciones_lu_raises', name: 'Lu raises con mancuernas', eq: 'dumbbells', comp: false, ratio: 0.10 },
    { id: 'press_push_press_barra', name: 'Push press con barra', eq: 'barbell', comp: true, ratio: 0.55 },
    { id: 'press_push_press_kettlebell', name: 'Push press doble con kettlebells', eq: 'kettlebell', comp: true, ratio: 0.40 },
    { id: 'elevaciones_frontales_disco', name: 'Elevaciones frontales con disco/mancuerna', eq: 'dumbbells', comp: false, ratio: 0.20 }
  ];

  for (const h of hombrosData) {
    exercises.push({
      id: h.id,
      name: h.name,
      movement_pattern: 'empuje',
      primary_muscle: 'hombros',
      secondary_muscles: ['triceps', 'core'],
      equipment_id: h.eq,
      is_compound: h.comp,
      initial_load_ratio: h.ratio,
      video_url: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${h.id}.webp`,
      instructions: 'Mantén el tronco rígido y eleva la carga bloqueando hombros de forma controlada.',
      is_active: true
    });
  }

  // ==========================================
  // 3. EMPUJE - TRICEPS (20 ejercicios)
  // ==========================================
  const tricepsData = [
    { id: 'press_banca_agarre_cerrado', name: 'Press de banca con agarre cerrado', eq: 'barbell', comp: true, ratio: 0.50 },
    { id: 'fondos_en_paralelas_triceps', name: 'Fondos en paralelas para tríceps', eq: 'dip_station', comp: true, ratio: 0.70 },
    { id: 'extension_triceps_polea_alta_cuerda', name: 'Extensión de tríceps en polea alta con cuerda', eq: 'lat_pulldown', comp: false, ratio: 0.25 },
    { id: 'extension_triceps_polea_alta_barra', name: 'Extensión de tríceps en polea alta con barra recta', eq: 'lat_pulldown', comp: false, ratio: 0.28 },
    { id: 'press_frances_barra_ez_banco', name: 'Press francés con barra EZ en banco plano', eq: 'ez_bar', comp: false, ratio: 0.30 },
    { id: 'press_frances_mancuernas_plano', name: 'Press francés con mancuernas en banco plano', eq: 'dumbbells', comp: false, ratio: 0.25 },
    { id: 'extension_triceps_trasnuca_mancuerna', name: 'Extensión tras nuca con mancuerna a dos manos', eq: 'dumbbells', comp: false, ratio: 0.25 },
    { id: 'extension_triceps_trasnuca_polea', name: 'Extensión tras nuca en polea con cuerda', eq: 'cable_crossover', comp: false, ratio: 0.20 },
    { id: 'patada_triceps_mancuerna', name: 'Patada de tríceps con mancuerna', eq: 'dumbbells', comp: false, ratio: 0.12 },
    { id: 'patada_triceps_polea', name: 'Patada de tríceps en polea baja', eq: 'low_row_pulley', comp: false, ratio: 0.12 },
    { id: 'fondos_entre_bancos', name: 'Fondos de tríceps entre bancos', eq: 'flat_bench', comp: true, ratio: 0.45 },
    { id: 'extension_triceps_en_trx', name: 'Extensión de tríceps en suspensión TRX', eq: 'suspension_trainer', comp: false, ratio: 0.35 },
    { id: 'extension_triceps_banda_elastica', name: 'Extensión de tríceps con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.20 },
    { id: 'press_frances_suelo_barra', name: 'Press francés en el suelo (JM press)', eq: 'barbell', comp: true, ratio: 0.40 },
    { id: 'press_tate_mancuernas', name: 'Tate press con mancuernas en banco plano', eq: 'dumbbells', comp: false, ratio: 0.20 },
    { id: 'extension_triceps_unilateral_polea', name: 'Extensión unilateral de tríceps en polea sin agarre', eq: 'cable_crossover', comp: false, ratio: 0.12 },
    { id: 'press_frances_declinado_ez', name: 'Press francés declinado con barra EZ', eq: 'ez_bar', comp: false, ratio: 0.30 },
    { id: 'fondos_triceps_maquina_asistida', name: 'Fondos de tríceps en máquina/rack', eq: 'power_rack', comp: true, ratio: 0.60 },
    { id: 'extension_triceps_kettlebell', name: 'Extensión tras nuca con kettlebell', eq: 'kettlebell', comp: false, ratio: 0.22 },
    { id: 'extension_triceps_inclinado_ez', name: 'Extensión de tríceps en banco inclinado con barra EZ', eq: 'ez_bar', comp: false, ratio: 0.25 }
  ];

  for (const t of tricepsData) {
    exercises.push({
      id: t.id,
      name: t.name,
      movement_pattern: 'empuje',
      primary_muscle: 'triceps',
      secondary_muscles: ['pecho', 'hombros'],
      equipment_id: t.eq,
      is_compound: t.comp,
      initial_load_ratio: t.ratio,
      video_url: 'https://www.youtube.com/watch?v=popGXI-qs98',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${t.id}.webp`,
      instructions: 'Aísla la flexo-extensión del codo evitando oscilar los hombros.',
      is_active: true
    });
  }

  // ==========================================
  // 4. TIRÓN - ESPALDA (30 ejercicios)
  // ==========================================
  const espaldaData = [
    { id: 'dominadas_pronadas', name: 'Dominadas pronadas clásicas', eq: 'pull_up_bar', comp: true, ratio: 0.75 },
    { id: 'dominadas_supinadas', name: 'Dominadas supinadas (chin-ups)', eq: 'pull_up_bar', comp: true, ratio: 0.75 },
    { id: 'dominadas_neutras', name: 'Dominadas con agarre neutro', eq: 'pull_up_bar', comp: true, ratio: 0.75 },
    { id: 'jalon_pecho_polea_alta', name: 'Jalón al pecho en polea alta con barra ancha', eq: 'lat_pulldown', comp: true, ratio: 0.60 },
    { id: 'jalon_pecho_agarre_neutro', name: 'Jalón al pecho con agarre neutro cerrado', eq: 'lat_pulldown', comp: true, ratio: 0.60 },
    { id: 'jalon_trasnuca_polea_alta', name: 'Jalón tras nuca en polea alta', eq: 'lat_pulldown', comp: true, ratio: 0.50 },
    { id: 'remo_con_barra_inclinado', name: 'Remo con barra inclinado (90 o 45 grados)', eq: 'barbell', comp: true, ratio: 0.65 },
    { id: 'remo_pendlay_barra', name: 'Remo Pendlay estricto desde el suelo', eq: 'barbell', comp: true, ratio: 0.60 },
    { id: 'remo_con_mancuerna_unilateral', name: 'Remo con mancuerna a una mano apoyado en banco', eq: 'dumbbells', comp: true, ratio: 0.35 },
    { id: 'remo_con_mancuernas_ambas_manos', name: 'Remo con mancuernas inclinado simultáneo', eq: 'dumbbells', comp: true, ratio: 0.50 },
    { id: 'remo_gironda_polea_baja', name: 'Remo sentado en polea baja (Remo Gironda)', eq: 'low_row_pulley', comp: true, ratio: 0.60 },
    { id: 'remo_pecho_apoyado_banco_inclinado', name: 'Remo con mancuernas con pecho apoyado en banco', eq: 'dumbbells', comp: true, ratio: 0.45 },
    { id: 'remo_en_maquina_smith', name: 'Remo inclinado en máquina Smith', eq: 'smith_machine', comp: true, ratio: 0.55 },
    { id: 'remo_barra_t', name: 'Remo en barra T', eq: 'barbell', comp: true, ratio: 0.65 },
    { id: 'remo_invertido_australian_pullups', name: 'Remo invertido en barra baja (Australian pull-ups)', eq: 'bodyweight', comp: true, ratio: 0.50 },
    { id: 'remo_invertido_en_trx', name: 'Remo invertido en suspensión TRX', eq: 'suspension_trainer', comp: true, ratio: 0.45 },
    { id: 'pull_over_polea_alta_brazos_rectos', name: 'Pullover en polea alta con brazos rectos', eq: 'lat_pulldown', comp: false, ratio: 0.30 },
    { id: 'pull_over_mancuerna_banco', name: 'Pullover con mancuerna sobre banco plano', eq: 'dumbbells', comp: false, ratio: 0.30 },
    { id: 'face_pull_polea_alta', name: 'Face pull en polea alta con cuerda', eq: 'lat_pulldown', comp: false, ratio: 0.25 },
    { id: 'face_pull_banda_elastica', name: 'Face pull con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.20 },
    { id: 'remo_unilateral_polea_baja', name: 'Remo unilateral en polea baja', eq: 'low_row_pulley', comp: true, ratio: 0.30 },
    { id: 'remo_kettlebell_renegade', name: 'Remo renegado con kettlebells en plancha', eq: 'kettlebell', comp: true, ratio: 0.30 },
    { id: 'remo_kettlebell_inclinado', name: 'Remo inclinado con dos kettlebells', eq: 'kettlebell', comp: true, ratio: 0.40 },
    { id: 'remo_con_banda_elastica_sentado', name: 'Remo sentado con banda elástica', eq: 'resistance_band', comp: true, ratio: 0.30 },
    { id: 'jalon_unilateral_polea_arrodillado', name: 'Jalón unilateral arrodillado en polea alta', eq: 'lat_pulldown', comp: true, ratio: 0.30 },
    { id: 'remo_al_menton_barra', name: 'Remo al mentón con barra (trapecio y espalda alta)', eq: 'barbell', comp: true, ratio: 0.40 },
    { id: 'remo_al_menton_barra_ez', name: 'Remo al mentón con barra EZ', eq: 'ez_bar', comp: true, ratio: 0.40 },
    { id: 'remo_al_menton_polea_baja', name: 'Remo al mentón en polea baja', eq: 'low_row_pulley', comp: true, ratio: 0.35 },
    { id: 'encogimientos_hombros_barra', name: 'Encogimientos de hombros con barra (shrugs)', eq: 'barbell', comp: false, ratio: 0.80 },
    { id: 'encogimientos_hombros_mancuernas', name: 'Encogimientos de hombros con mancuernas', eq: 'dumbbells', comp: false, ratio: 0.70 }
  ];

  for (const e of espaldaData) {
    exercises.push({
      id: e.id,
      name: e.name,
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps', 'hombros', 'core'],
      equipment_id: e.eq,
      is_compound: e.comp,
      initial_load_ratio: e.ratio,
      video_url: 'https://www.youtube.com/watch?v=eE7DZqD6Y08',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${e.id}.webp`,
      instructions: 'Inicia la tracción retrayendo escápulas y dirigiendo los codos hacia atrás.',
      is_active: true
    });
  }

  // ==========================================
  // 5. TIRÓN - BICEPS (20 ejercicios)
  // ==========================================
  const bicepsData = [
    { id: 'curl_biceps_barra_recta', name: 'Curl de bíceps con barra recta de pie', eq: 'barbell', comp: false, ratio: 0.35 },
    { id: 'curl_biceps_barra_ez', name: 'Curl de bíceps con barra EZ', eq: 'ez_bar', comp: false, ratio: 0.35 },
    { id: 'curl_biceps_mancuernas_alterno', name: 'Curl de bíceps con mancuernas alterno con supinación', eq: 'dumbbells', comp: false, ratio: 0.20 },
    { id: 'curl_biceps_mancuernas_martillo', name: 'Curl martillo con mancuernas', eq: 'dumbbells', comp: false, ratio: 0.22 },
    { id: 'curl_biceps_inclinado_mancuernas', name: 'Curl de bíceps en banco inclinado con mancuernas', eq: 'dumbbells', comp: false, ratio: 0.18 },
    { id: 'curl_predicador_barra_ez', name: 'Curl predicador en banco Scott con barra EZ', eq: 'ez_bar', comp: false, ratio: 0.30 },
    { id: 'curl_predicador_mancuerna_unilateral', name: 'Curl predicador con mancuerna a una mano', eq: 'dumbbells', comp: false, ratio: 0.15 },
    { id: 'curl_concentrado_mancuerna', name: 'Curl concentrado con mancuerna sentado', eq: 'dumbbells', comp: false, ratio: 0.15 },
    { id: 'curl_biceps_polea_baja_barra', name: 'Curl de bíceps en polea baja con barra', eq: 'low_row_pulley', comp: false, ratio: 0.30 },
    { id: 'curl_biceps_polea_baja_cuerda_martillo', name: 'Curl martillo en polea baja con cuerda', eq: 'low_row_pulley', comp: false, ratio: 0.25 },
    { id: 'curl_spider_banco_inclinado_mancuernas', name: 'Spider curl con mancuernas en banco inclinado', eq: 'dumbbells', comp: false, ratio: 0.18 },
    { id: 'curl_spider_barra_ez', name: 'Spider curl con barra EZ', eq: 'ez_bar', comp: false, ratio: 0.25 },
    { id: 'curl_biceps_doble_polea_alta', name: 'Curl de bíceps en doble polea alta (Hércules)', eq: 'cable_crossover', comp: false, ratio: 0.15 },
    { id: 'curl_biceps_banda_elastica', name: 'Curl de bíceps de pie con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.20 },
    { id: 'curl_biceps_en_suspension_trx', name: 'Curl de bíceps en suspensión TRX', eq: 'suspension_trainer', comp: false, ratio: 0.30 },
    { id: 'curl_biceps_kettlebell', name: 'Curl de bíceps con kettlebells', eq: 'kettlebell', comp: false, ratio: 0.20 },
    { id: 'curl_zottman_mancuernas', name: 'Curl Zottman con mancuernas (bíceps y antebrazo)', eq: 'dumbbells', comp: false, ratio: 0.18 },
    { id: 'curl_biceps_invertido_barra', name: 'Curl invertido con barra (pronación)', eq: 'barbell', comp: false, ratio: 0.25 },
    { id: 'curl_biceps_invertido_barra_ez', name: 'Curl invertido con barra EZ', eq: 'ez_bar', comp: false, ratio: 0.25 },
    { id: 'curl_arrastre_drag_curl_barra', name: 'Drag curl con barra rozando el torso', eq: 'barbell', comp: false, ratio: 0.30 }
  ];

  for (const b of bicepsData) {
    exercises.push({
      id: b.id,
      name: b.name,
      movement_pattern: 'tiron',
      primary_muscle: 'biceps',
      secondary_muscles: ['espalda'],
      equipment_id: b.eq,
      is_compound: b.comp,
      initial_load_ratio: b.ratio,
      video_url: 'https://www.youtube.com/watch?v=in7PaeYlJEY',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${b.id}.webp`,
      instructions: 'Flexiona los codos manteniendo los brazos fijos a los costados del cuerpo.',
      is_active: true
    });
  }

  // ==========================================
  // 6. RODILLA DOMINANTE - CUADRICEPS (25 ejercicios)
  // ==========================================
  const cuadricepsData = [
    { id: 'sentadilla_trasera_barra', name: 'Sentadilla trasera con barra olímpica', eq: 'barbell', comp: true, ratio: 0.85 },
    { id: 'sentadilla_frontal_barra', name: 'Sentadilla frontal con barra olímpica', eq: 'barbell', comp: true, ratio: 0.70 },
    { id: 'prensa_piernas_inclinada', name: 'Prensa de piernas a 45 grados', eq: 'leg_press', comp: true, ratio: 1.20 },
    { id: 'sentadilla_hack_maquina_smith', name: 'Sentadilla Hack en máquina Smith', eq: 'smith_machine', comp: true, ratio: 0.75 },
    { id: 'sentadilla_goblet_kettlebell', name: 'Sentadilla Goblet con kettlebell', eq: 'kettlebell', comp: true, ratio: 0.35 },
    { id: 'sentadilla_goblet_mancuerna', name: 'Sentadilla Goblet con mancuerna', eq: 'dumbbells', comp: true, ratio: 0.35 },
    { id: 'sentadilla_bulgara_mancuernas', name: 'Sentadilla búlgara con mancuernas', eq: 'dumbbells', comp: true, ratio: 0.30 },
    { id: 'sentadilla_bulgara_peso_corporal', name: 'Sentadilla búlgara con peso corporal', eq: 'bodyweight', comp: true, ratio: 0.50 },
    { id: 'zancadas_caminando_mancuernas', name: 'Zancadas caminando con mancuernas', eq: 'dumbbells', comp: true, ratio: 0.30 },
    { id: 'zancadas_estaticas_barra', name: 'Zancadas estáticas con barra', eq: 'barbell', comp: true, ratio: 0.50 },
    { id: 'step_ups_caja_mancuernas', name: 'Subidas al cajón (step-ups) con mancuernas', eq: 'plyo_box', comp: true, ratio: 0.30 },
    { id: 'step_ups_caja_peso_corporal', name: 'Subidas al cajón con peso corporal', eq: 'plyo_box', comp: true, ratio: 0.50 },
    { id: 'sentadilla_pistola_peso_corporal', name: 'Sentadilla pistola (pistol squat) unilateral', eq: 'bodyweight', comp: true, ratio: 0.60 },
    { id: 'sentadilla_pistola_asistida_trx', name: 'Sentadilla pistola asistida en TRX', eq: 'suspension_trainer', comp: true, ratio: 0.40 },
    { id: 'sentadilla_sissy_peso_corporal', name: 'Sentadilla Sissy con peso corporal', eq: 'bodyweight', comp: false, ratio: 0.40 },
    { id: 'sentadilla_peso_corporal_aire', name: 'Sentadilla libre con peso corporal (air squat)', eq: 'bodyweight', comp: true, ratio: 0.50 },
    { id: 'sentadilla_con_banda_elastica', name: 'Sentadilla resistida con banda elástica', eq: 'resistance_band', comp: true, ratio: 0.40 },
    { id: 'sentadilla_sumo_kettlebell', name: 'Sentadilla sumo profunda con kettlebell', eq: 'kettlebell', comp: true, ratio: 0.40 },
    { id: 'sentadilla_caja_box_squat_barra', name: 'Box squat (sentadilla sobre cajón) con barra', eq: 'barbell', comp: true, ratio: 0.75 },
    { id: 'sentadilla_caja_mancuernas', name: 'Box squat con mancuernas', eq: 'dumbbells', comp: true, ratio: 0.40 },
    { id: 'sentadilla_zercher_barra', name: 'Sentadilla Zercher con barra en la flexura del codo', eq: 'barbell', comp: true, ratio: 0.65 },
    { id: 'sentadilla_overhead_barra', name: 'Sentadilla sobre la cabeza (overhead squat)', eq: 'barbell', comp: true, ratio: 0.45 },
    { id: 'zancadas_reversas_mancuernas', name: 'Zancadas reversas con mancuernas', eq: 'dumbbells', comp: true, ratio: 0.30 },
    { id: 'sentadilla_isocuadriceps_pared', name: 'Wall sit (sentadilla isométrica contra la pared)', eq: 'bodyweight', comp: false, ratio: 0.30 },
    { id: 'sentadilla_smith_pies_adelantados', name: 'Sentadilla Smith con pies adelantados', eq: 'smith_machine', comp: true, ratio: 0.70 }
  ];

  for (const c of cuadricepsData) {
    exercises.push({
      id: c.id,
      name: c.name,
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos', 'isquiosurales', 'core'],
      equipment_id: c.eq,
      is_compound: c.comp,
      initial_load_ratio: c.ratio,
      video_url: 'https://www.youtube.com/watch?v=MVMNk0HiTMg',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${c.id}.webp`,
      instructions: 'Desciende flexionando rodillas y caderas con torso erguido y profundidad adecuada.',
      is_active: true
    });
  }

  // ==========================================
  // 7. CADERA DOMINANTE - ISQUIOSURALES (20 ejercicios)
  // ==========================================
  const isquiosData = [
    { id: 'peso_muerto_rumano_barra', name: 'Peso muerto rumano con barra olímpica', eq: 'barbell', comp: true, ratio: 0.75 },
    { id: 'peso_muerto_rumano_mancuernas', name: 'Peso muerto rumano con mancuernas', eq: 'dumbbells', comp: true, ratio: 0.60 },
    { id: 'peso_muerto_rumano_kettlebell', name: 'Peso muerto rumano con kettlebell', eq: 'kettlebell', comp: true, ratio: 0.50 },
    { id: 'peso_muerto_piernas_rigidas_barra', name: 'Peso muerto con piernas rígidas con barra', eq: 'barbell', comp: true, ratio: 0.65 },
    { id: 'peso_muerto_rumano_unilateral_mancuerna', name: 'Peso muerto rumano a una pierna con mancuerna', eq: 'dumbbells', comp: true, ratio: 0.25 },
    { id: 'peso_muerto_rumano_unilateral_kettlebell', name: 'Peso muerto rumano a una pierna con kettlebell', eq: 'kettlebell', comp: true, ratio: 0.25 },
    { id: 'buenos_dias_barra', name: 'Buenos días con barra olímpica en espalda', eq: 'barbell', comp: true, ratio: 0.40 },
    { id: 'buenos_dias_banda_elastica', name: 'Buenos días con banda elástica', eq: 'resistance_band', comp: true, ratio: 0.25 },
    { id: 'curl_femoral_con_trx', name: 'Curl femoral en suspensión TRX', eq: 'suspension_trainer', comp: false, ratio: 0.40 },
    { id: 'curl_femoral_con_banda', name: 'Curl femoral acostado con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.25 },
    { id: 'curl_nordico_peso_corporal', name: 'Curl nórdico excéntrico para isquiosurales', eq: 'bodyweight', comp: false, ratio: 0.60 },
    { id: 'puente_gluteo_isquios_pies_elevados', name: 'Puente con pies elevados en banco', eq: 'flat_bench', comp: false, ratio: 0.35 },
    { id: 'peso_muerto_rumano_smith', name: 'Peso muerto rumano en máquina Smith', eq: 'smith_machine', comp: true, ratio: 0.70 },
    { id: 'hiperextensiones_45_grados_isquios', name: 'Hiperextensiones a 45 grados enfocadas en isquios', eq: 'flat_bench', comp: true, ratio: 0.45 },
    { id: 'slide_leg_curl_suelo', name: 'Curl deslizante de isquiosurales en suelo', eq: 'bodyweight', comp: false, ratio: 0.35 },
    { id: 'peso_muerto_rumano_banda', name: 'Peso muerto rumano con banda elástica pisada', eq: 'resistance_band', comp: true, ratio: 0.35 },
    { id: 'kettlebell_swing_isquios', name: 'Kettlebell swing clásico con bisagra de cadera', eq: 'kettlebell', comp: true, ratio: 0.40 },
    { id: 'peso_muerto_unilateral_peso_corporal', name: 'Peso muerto unilateral con peso corporal', eq: 'bodyweight', comp: true, ratio: 0.30 },
    { id: 'peso_muerto_sumo_barra', name: 'Peso muerto estilo sumo con barra olímpica', eq: 'barbell', comp: true, ratio: 0.85 },
    { id: 'peso_muerto_barra_hexagonal_isquios', name: 'Peso muerto con barra trampa (trap bar) con bisagra profunda', eq: 'trap_bar', comp: true, ratio: 0.80 }
  ];

  for (const isq of isquiosData) {
    exercises.push({
      id: isq.id,
      name: isq.name,
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'isquiosurales',
      secondary_muscles: ['gluteos', 'espalda', 'core'],
      equipment_id: isq.eq,
      is_compound: isq.comp,
      initial_load_ratio: isq.ratio,
      video_url: 'https://www.youtube.com/watch?v=JCXUYuzwNrM',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${isq.id}.webp`,
      instructions: 'Empuja la cadera hacia atrás manteniendo la columna neutra y siente el estiramiento en isquios.',
      is_active: true
    });
  }

  // ==========================================
  // 8. CADERA DOMINANTE - GLÚTEOS (20 ejercicios)
  // ==========================================
  const gluteosData = [
    { id: 'hip_thrust_barra_banco', name: 'Hip thrust con barra apoyado en banco', eq: 'barbell', comp: true, ratio: 0.80 },
    { id: 'hip_thrust_mancuerna_banco', name: 'Hip thrust con mancuerna pesada', eq: 'dumbbells', comp: true, ratio: 0.50 },
    { id: 'hip_thrust_maquina_smith', name: 'Hip thrust en máquina Smith', eq: 'smith_machine', comp: true, ratio: 0.75 },
    { id: 'hip_thrust_unilateral_peso_corporal', name: 'Hip thrust unilateral con peso corporal', eq: 'flat_bench', comp: true, ratio: 0.40 },
    { id: 'puente_gluteos_suelo_barra', name: 'Puente de glúteos en el suelo con barra (Glute bridge)', eq: 'barbell', comp: true, ratio: 0.70 },
    { id: 'puente_gluteos_suelo_mancuerna', name: 'Puente de glúteos en el suelo con mancuerna', eq: 'dumbbells', comp: true, ratio: 0.45 },
    { id: 'puente_gluteos_suelo_peso_corporal', name: 'Puente de glúteos en el suelo con peso corporal', eq: 'bodyweight', comp: false, ratio: 0.30 },
    { id: 'puente_gluteos_con_banda_elastica', name: 'Puente de glúteos con banda elástica en rodillas', eq: 'resistance_band', comp: false, ratio: 0.30 },
    { id: 'patada_gluteo_polea_baja', name: 'Patada de glúteo en polea baja', eq: 'low_row_pulley', comp: false, ratio: 0.20 },
    { id: 'patada_gluteo_banda_elastica', name: 'Patada de glúteo cuadrúpeda con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.18 },
    { id: 'abduccion_cadera_polea', name: 'Abducción de cadera de pie en polea baja', eq: 'low_row_pulley', comp: false, ratio: 0.15 },
    { id: 'abduccion_cadera_banda_sentado', name: 'Abducción de cadera sentado con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.18 },
    { id: 'pasos_laterales_monstruo_banda', name: 'Monster walks (caminata lateral con banda)', eq: 'resistance_band', comp: false, ratio: 0.20 },
    { id: 'peso_muerto_convencional_barra', name: 'Peso muerto convencional con barra', eq: 'barbell', comp: true, ratio: 0.90 },
    { id: 'peso_muerto_trap_bar', name: 'Peso muerto con barra trampa (trap bar)', eq: 'trap_bar', comp: true, ratio: 0.90 },
    { id: 'peso_muerto_kettlebell_doble', name: 'Peso muerto con dos kettlebells pesadas', eq: 'kettlebell', comp: true, ratio: 0.60 },
    { id: 'pull_through_polea_baja', name: 'Cable pull-through en polea baja con cuerda', eq: 'low_row_pulley', comp: true, ratio: 0.35 },
    { id: 'frog_pumps_gluteo_suelo', name: 'Frog pumps (puente rana) en el suelo', eq: 'bodyweight', comp: false, ratio: 0.25 },
    { id: 'clamshells_con_banda', name: 'Clamshells (almejas) con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.15 },
    { id: 'hip_thrust_con_banda_elastica', name: 'Hip thrust con banda elástica en cadera', eq: 'resistance_band', comp: true, ratio: 0.35 }
  ];

  for (const g of gluteosData) {
    exercises.push({
      id: g.id,
      name: g.name,
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'gluteos',
      secondary_muscles: ['isquiosurales', 'cuadriceps', 'core'],
      equipment_id: g.eq,
      is_compound: g.comp,
      initial_load_ratio: g.ratio,
      video_url: 'https://www.youtube.com/watch?v=SEdqd1n0cvg',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${g.id}.webp`,
      instructions: 'Extiende completamente la cadera apretando fuertemente los glúteos en el bloqueo.',
      is_active: true
    });
  }

  // ==========================================
  // 9. RODILLA DOMINANTE / PANTORRILLAS (10 ejercicios)
  // ==========================================
  const pantorrillasData = [
    { id: 'elevacion_talones_de_pie_mancuerna', name: 'Elevación de talones de pie con mancuernas', eq: 'dumbbells', comp: false, ratio: 0.40 },
    { id: 'elevacion_talones_de_pie_barra', name: 'Elevación de talones de pie con barra en hombros', eq: 'barbell', comp: false, ratio: 0.60 },
    { id: 'elevacion_talones_en_maquina_smith', name: 'Elevación de talones en máquina Smith sobre escalón', eq: 'smith_machine', comp: false, ratio: 0.60 },
    { id: 'elevacion_talones_en_prensa_piernas', name: 'Elevación de talones en prensa de piernas', eq: 'leg_press', comp: false, ratio: 0.80 },
    { id: 'elevacion_talones_unilateral_peso_corporal', name: 'Elevación de talones unilateral sobre escalón', eq: 'plyo_box', comp: false, ratio: 0.40 },
    { id: 'elevacion_talones_suelo_peso_corporal', name: 'Elevación de talones en suelo con peso corporal', eq: 'bodyweight', comp: false, ratio: 0.30 },
    { id: 'elevacion_talones_sentado_mancuernas', name: 'Elevación de talones sentado con mancuernas sobre rodillas', eq: 'dumbbells', comp: false, ratio: 0.35 },
    { id: 'elevacion_talones_sentado_barra', name: 'Elevación de talones sentado con barra sobre rodillas', eq: 'barbell', comp: false, ratio: 0.40 },
    { id: 'elevacion_talones_con_banda_elastica', name: 'Elevación de talones de pie con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.25 },
    { id: 'saltos_talones_cuerda_peso_corporal', name: 'Pogo jumps (rebotes reactivos de tobillo)', eq: 'bodyweight', comp: false, ratio: 0.30 }
  ];

  for (const p of pantorrillasData) {
    exercises.push({
      id: p.id,
      name: p.name,
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'pantorrillas',
      secondary_muscles: ['cuadriceps'],
      equipment_id: p.eq,
      is_compound: p.comp,
      initial_load_ratio: p.ratio,
      video_url: 'https://www.youtube.com/watch?v=gwLzBJYoWlI',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${p.id}.webp`,
      instructions: 'Realiza una pausa de 1 segundo abajo en estiramiento y eleva hasta máxima contracción.',
      is_active: true
    });
  }

  // ==========================================
  // 10. CORE - CORE (25 ejercicios)
  // ==========================================
  const coreData = [
    { id: 'rueda_abdominal_rodillas', name: 'Rollout con rueda abdominal de rodillas', eq: 'ab_wheel', comp: false, ratio: 0.40 },
    { id: 'rueda_abdominal_de_pie', name: 'Rollout con rueda abdominal de pie', eq: 'ab_wheel', comp: false, ratio: 0.70 },
    { id: 'plancha_frontal_suelo', name: 'Plancha frontal isométrica en suelo', eq: 'bodyweight', comp: false, ratio: 0.30 },
    { id: 'plancha_lateral_suelo', name: 'Plancha lateral isométrica', eq: 'bodyweight', comp: false, ratio: 0.25 },
    { id: 'elevacion_piernas_colgado_barra', name: 'Elevación de piernas colgado en barra de dominadas', eq: 'pull_up_bar', comp: false, ratio: 0.50 },
    { id: 'elevacion_rodillas_colgado_barra', name: 'Elevación de rodillas colgado en barra', eq: 'pull_up_bar', comp: false, ratio: 0.40 },
    { id: 'elevacion_piernas_paralelas_dip', name: 'Elevación de piernas en estación de fondos/paralelas', eq: 'dip_station', comp: false, ratio: 0.45 },
    { id: 'crunch_abdominal_polea_alta', name: 'Crunch abdominal arrodillado en polea alta con cuerda', eq: 'lat_pulldown', comp: false, ratio: 0.40 },
    { id: 'lenador_woodchopper_polea', name: 'Leñador (woodchopper) en polea media/alta', eq: 'cable_crossover', comp: false, ratio: 0.30 },
    { id: 'press_pallof_polea', name: 'Press Pallof anti-rotacional en polea', eq: 'cable_crossover', comp: false, ratio: 0.25 },
    { id: 'press_pallof_banda_elastica', name: 'Press Pallof con banda elástica', eq: 'resistance_band', comp: false, ratio: 0.20 },
    { id: 'giros_rusos_russian_twists_disco', name: 'Giros rusos (Russian twists) con mancuerna/disco', eq: 'dumbbells', comp: false, ratio: 0.20 },
    { id: 'giros_rusos_kettlebell', name: 'Giros rusos con kettlebell', eq: 'kettlebell', comp: false, ratio: 0.20 },
    { id: 'deadbug_suelo_peso_corporal', name: 'Deadbug (bicho muerto) en suelo', eq: 'bodyweight', comp: false, ratio: 0.20 },
    { id: 'bird_dog_suelo_peso_corporal', name: 'Bird dog (pájaro perro) cuadrúpedo', eq: 'bodyweight', comp: false, ratio: 0.20 },
    { id: 'hollow_body_hold_suelo', name: 'Hollow body hold (barca isométrica)', eq: 'bodyweight', comp: false, ratio: 0.30 },
    { id: 'plancha_con_trx_pies_suspendidos', name: 'Plancha con pies suspendidos en TRX', eq: 'suspension_trainer', comp: false, ratio: 0.35 },
    { id: 'encogimientos_rodillas_trx', name: 'Encogimientos abdominales (knee tucks) en TRX', eq: 'suspension_trainer', comp: false, ratio: 0.40 },
    { id: 'pikes_abdominales_en_trx', name: 'Pike abdominal en suspensión TRX', eq: 'suspension_trainer', comp: false, ratio: 0.45 },
    { id: 'caminata_del_granjero_mancuernas', name: 'Farmer walk (caminata del granjero) con mancuernas', eq: 'dumbbells', comp: true, ratio: 0.60 },
    { id: 'caminata_del_granjero_kettlebells', name: 'Caminata del granjero con kettlebells', eq: 'kettlebell', comp: true, ratio: 0.60 },
    { id: 'caminata_del_granjero_unilateral_maletin', name: 'Caminata del camarero / maletín unilateral', eq: 'kettlebell', comp: true, ratio: 0.35 },
    { id: 'crunch_abdominal_suelo', name: 'Crunch abdominal tradicional en suelo', eq: 'bodyweight', comp: false, ratio: 0.20 },
    { id: 'v_ups_abdominales_suelo', name: 'V-ups (navajas) en suelo', eq: 'bodyweight', comp: false, ratio: 0.35 },
    { id: 'dragon_flag_en_banco', name: 'Dragon flag en banco plano', eq: 'flat_bench', comp: false, ratio: 0.60 }
  ];

  for (const cr of coreData) {
    exercises.push({
      id: cr.id,
      name: cr.name,
      movement_pattern: 'core',
      primary_muscle: 'core',
      secondary_muscles: ['hombros', 'gluteos'],
      equipment_id: cr.eq,
      is_compound: cr.comp,
      initial_load_ratio: cr.ratio,
      video_url: 'https://www.youtube.com/watch?v=dQqApCGd5HQ',
      video_fallback_url: `https://assets.smartforge.app/fallbacks/${cr.id}.webp`,
      instructions: 'Mantén la pelvis neutra y activa el transverso abdominal durante todo el recorrido.',
      is_active: true
    });
  }

  return exercises;
};

export const EXERCISE_SEED_DATA: ExerciseSeedItem[] = generateMuscleExercises();

/**
 * Genera el dataset de alternativas biomecánicamente compatibles (CA-09.2).
 * Mapea cada ejercicio con al menos 2 alternativas que comparten el mismo patrón de movimiento y músculo primario.
 */
export const generateExerciseAlternatives = (exercises: ExerciseSeedItem[]): ExerciseAlternativeSeedItem[] => {
  const alternatives: ExerciseAlternativeSeedItem[] = [];

  // Group by movement_pattern + primary_muscle
  const groups = new Map<string, ExerciseSeedItem[]>();

  for (const ex of exercises) {
    const key = `${ex.movement_pattern}::${ex.primary_muscle}`;
    const list = groups.get(key) || [];
    list.push(ex);
    groups.set(key, list);
  }

  for (const [, group] of groups.entries()) {
    for (const orig of group) {
      for (const alt of group) {
        if (orig.id === alt.id) continue;

        // Calculate a realistic similarity score based on equipment similarity and compound nature
        let score = 0.85;
        if (orig.is_compound === alt.is_compound) {
          score += 0.05;
        }
        if (orig.equipment_id === alt.equipment_id) {
          score += 0.05;
        }
        score = Math.min(0.98, Math.max(0.70, score));

        alternatives.push({
          original_exercise_id: orig.id,
          alternative_exercise_id: alt.id,
          similarity_score: Number(score.toFixed(2))
        });
      }
    }
  }

  return alternatives;
};

export const EXERCISE_ALTERNATIVES_SEED_DATA: ExerciseAlternativeSeedItem[] =
  generateExerciseAlternatives(EXERCISE_SEED_DATA);

export async function seedExercises(
  client: { query: (text: string, params?: unknown[]) => Promise<unknown> } = pool
): Promise<{ exercisesCount: number; alternativesCount: number }> {
  // 1. Insert Exercises
  const insertExQuery = `
    INSERT INTO exercise (
      id, name, movement_pattern, primary_muscle, secondary_muscles,
      equipment_id, is_compound, initial_load_ratio, video_url,
      video_fallback_url, instructions, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      movement_pattern = EXCLUDED.movement_pattern,
      primary_muscle = EXCLUDED.primary_muscle,
      secondary_muscles = EXCLUDED.secondary_muscles,
      equipment_id = EXCLUDED.equipment_id,
      is_compound = EXCLUDED.is_compound,
      initial_load_ratio = EXCLUDED.initial_load_ratio,
      video_url = EXCLUDED.video_url,
      video_fallback_url = EXCLUDED.video_fallback_url,
      instructions = EXCLUDED.instructions,
      is_active = EXCLUDED.is_active;
  `;

  for (const ex of EXERCISE_SEED_DATA) {
    await client.query(insertExQuery, [
      ex.id,
      ex.name,
      ex.movement_pattern,
      ex.primary_muscle,
      ex.secondary_muscles,
      ex.equipment_id,
      ex.is_compound,
      ex.initial_load_ratio,
      ex.video_url,
      ex.video_fallback_url,
      ex.instructions,
      ex.is_active
    ]);
  }

  // 2. Insert Exercise Alternatives
  const insertAltQuery = `
    INSERT INTO exercise_alternative (
      original_exercise_id, alternative_exercise_id, similarity_score
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (original_exercise_id, alternative_exercise_id) DO UPDATE SET
      similarity_score = EXCLUDED.similarity_score;
  `;

  for (const alt of EXERCISE_ALTERNATIVES_SEED_DATA) {
    await client.query(insertAltQuery, [
      alt.original_exercise_id,
      alt.alternative_exercise_id,
      alt.similarity_score
    ]);
  }

  return {
    exercisesCount: EXERCISE_SEED_DATA.length,
    alternativesCount: EXERCISE_ALTERNATIVES_SEED_DATA.length
  };
}

export async function seedAll(): Promise<void> {
  console.info('🌱 Seeding equipment taxonomy...');
  const seededEquipment = await seedEquipment(pool);
  console.info(`✅ Seeded ${seededEquipment.length} equipment items.`);

  console.info('🌱 Seeding exercise catalog and biomechanical alternatives...');
  const result = await seedExercises(pool);
  console.info(`✅ Seeded ${result.exercisesCount} exercises and ${result.alternativesCount} alternatives.`);
}

// Standalone CLI execution
if (process.argv[1]?.includes('exercises.seed')) {
  seedAll()
    .then(() => {
      console.info('🎉 Database seeding completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed database:', err);
      process.exit(1);
    });
}
