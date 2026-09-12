export interface EquipmentTaxonomyItem {
  id: string;
  name: string;
  category: 'free_weights' | 'racks_benches' | 'machines' | 'cable_machines' | 'bodyweight_accessories' | 'accessories' | 'bodyweight';
}

export const EQUIPMENT_TAXONOMY: EquipmentTaxonomyItem[] = [
  { id: 'barbell', name: 'Barra olímpica', category: 'free_weights' },
  { id: 'dumbbells', name: 'Mancuernas', category: 'free_weights' },
  { id: 'kettlebell', name: 'Kettlebell', category: 'free_weights' },
  { id: 'ez_bar', name: 'Barra EZ', category: 'free_weights' },
  { id: 'trap_bar', name: 'Barra trampa (hex bar)', category: 'free_weights' },
  { id: 'power_rack', name: 'Rack/jaula de potencia', category: 'racks_benches' },
  { id: 'flat_bench', name: 'Banco plano', category: 'racks_benches' },
  { id: 'incline_bench', name: 'Banco inclinable', category: 'racks_benches' },
  { id: 'lat_pulldown', name: 'Polea alta', category: 'cable_machines' },
  { id: 'low_row_pulley', name: 'Polea baja', category: 'cable_machines' },
  { id: 'smith_machine', name: 'Máquina Smith', category: 'machines' },
  { id: 'leg_press', name: 'Prensa de piernas', category: 'machines' },
  { id: 'cable_crossover', name: 'Máquina de poleas (cable crossover)', category: 'cable_machines' },
  { id: 'resistance_band', name: 'Banda elástica', category: 'bodyweight_accessories' },
  { id: 'suspension_trainer', name: 'TRX/suspensión', category: 'bodyweight_accessories' },
  { id: 'pull_up_bar', name: 'Barra de dominadas', category: 'bodyweight_accessories' },
  { id: 'dip_station', name: 'Paralelas/dip station', category: 'bodyweight_accessories' },
  { id: 'plyo_box', name: 'Step/cajón', category: 'accessories' },
  { id: 'ab_wheel', name: 'Rueda abdominal', category: 'accessories' },
  { id: 'bodyweight', name: 'Sin equipamiento (peso corporal)', category: 'bodyweight' }
];
