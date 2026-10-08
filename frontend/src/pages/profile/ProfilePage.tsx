import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Sparkline } from '../../components/ui/Sparkline';
import { EQUIPMENT_TAXONOMY } from '../../constants/equipment';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryClient } from '../../api/query-client';
import { useAuth } from '../../hooks/useAuth';
import type {
  ExperienceLevel,
  TrainingGoal,
  AthleteProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  WeightLogItem
} from '../../api';
import { fetchWeightLogs, createWeightLog, updateWeightLog } from '../../api';
import {
  Check,
  Dumbbell,
  User,
  AlertTriangle,
  Info,
  Scale,
  TrendingDown,
  TrendingUp,
  Sprout,
  Zap,
  Medal,
  Trophy,
  Flame,
  LogOut
} from 'lucide-react';
import { WeightLogModal } from '../../components/weight/WeightLogModal';
import { WeightHistoryList } from '../../components/weight/WeightHistoryList';
import { CancellationModal } from '../../components/mesocycle/CancellationModal';

export interface ProfilePageProps {
  mode?: 'create' | 'edit';
  initialProfile?: AthleteProfile | null;
  hasActiveMesocycle?: boolean;
  onProfileCreated?: () => void;
  onProfileUpdated?: (updatedProfile: AthleteProfile) => void;
  onCancel?: () => void;
  onCancelActiveMesocycle?: () => void;
}

function getInitials(nameStr: string): string {
  if (!nameStr) return 'SF';
  const parts = nameStr.trim().split(/\s+/);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase();
  }
  if (first && first.length >= 2) {
    return first.slice(0, 2).toUpperCase();
  }
  return 'SF';
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  mode,
  initialProfile,
  hasActiveMesocycle: propHasActiveMesocycle,
  onProfileCreated,
  onProfileUpdated,
  onCancel,
  onCancelActiveMesocycle
}) => {
  const { user, restoreSession, logout } = useAuth();
  const currentProfile = initialProfile ?? (mode === 'edit' ? user : null);
  const isEditMode = mode === 'edit' || Boolean(initialProfile);

  const [name, setName] = useState(currentProfile?.name ?? '');
  const [age, setAge] = useState(currentProfile ? String(currentProfile.age) : '');
  const [weightKg, setWeightKg] = useState(currentProfile ? String(currentProfile.weight_kg) : '');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    currentProfile?.experience_level ?? 'intermedio'
  );
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>(
    currentProfile?.training_goal ?? 'hipertrofia'
  );
  const [initialGoal] = useState<TrainingGoal>(
    currentProfile?.training_goal ?? 'hipertrofia'
  );
  const [availableDays, setAvailableDays] = useState<number>(
    currentProfile?.available_days_per_week ?? 4
  );
  const [initialSavedDays, setInitialSavedDays] = useState<number>(
    currentProfile?.available_days_per_week ?? 4
  );
  const [equipmentIds, setEquipmentIds] = useState<string[]>(
    currentProfile?.equipment?.map((e) => e.id) ?? []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoalChangeModalOpen, setIsGoalChangeModalOpen] = useState(false);

  // Active mesocycle detection & availability warning (RF-09 CA-09.1)
  const [hasActiveMeso, setHasActiveMeso] = useState<boolean>(propHasActiveMesocycle ?? false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [pendingDays, setPendingDays] = useState<number | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Weight tracking & history module (RF-01, RF-02, T-19)
  const [weightLogs, setWeightLogs] = useState<WeightLogItem[]>([]);
  const [isLoadingWeightLogs, setIsLoadingWeightLogs] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [editingWeightLog, setEditingWeightLog] = useState<WeightLogItem | null>(null);
  const [retroactiveDate, setRetroactiveDate] = useState<string | undefined>(undefined);
  const [isWeightHistoryOpen, setIsWeightHistoryOpen] = useState(false);

  useEffect(() => {
    if (propHasActiveMesocycle !== undefined) {
      setHasActiveMeso(propHasActiveMesocycle);
    } else if (isEditMode) {
      apiClient.mesocycles
        .getCurrent()
        .then((meso) => {
          if (meso && meso.status === 'active') {
            setHasActiveMeso(true);
          }
        })
        .catch(() => {});
    }
  }, [propHasActiveMesocycle, isEditMode]);

  const loadWeightLogs = async () => {
    setIsLoadingWeightLogs(true);
    try {
      const logs = await fetchWeightLogs();
      setWeightLogs(logs);
      if (logs.length > 0 && logs[0]) {
        setWeightKg(String(logs[0].weight_kg));
      }
    } catch {
      // Offline or empty
    } finally {
      setIsLoadingWeightLogs(false);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      loadWeightLogs();
    }
  }, [isEditMode]);

  const handleSaveWeight = async (data: { weight_kg: number; logged_date: string; id?: string }) => {
    if (data.id) {
      await updateWeightLog(data.id, { weight_kg: data.weight_kg });
    } else {
      await createWeightLog({ weight_kg: data.weight_kg, logged_date: data.logged_date });
    }
    setWeightKg(String(data.weight_kg));
    await loadWeightLogs();
    await queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    setIsWeightModalOpen(false);
    setEditingWeightLog(null);
    setRetroactiveDate(undefined);
  };

  const handleDaySelect = (day: number) => {
    if (isEditMode && hasActiveMeso && day !== initialSavedDays) {
      setPendingDays(day);
      setIsAvailabilityModalOpen(true);
      return;
    }
    setAvailableDays(day);
  };

  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name ?? '');
      setAge(String(currentProfile.age ?? ''));
      setWeightKg(String(currentProfile.weight_kg ?? ''));
      setExperienceLevel(currentProfile.experience_level ?? 'intermedio');
      setTrainingGoal(currentProfile.training_goal ?? 'hipertrofia');
      setAvailableDays(currentProfile.available_days_per_week ?? 4);
      setInitialSavedDays(currentProfile.available_days_per_week ?? 4);
      setEquipmentIds(currentProfile.equipment?.map((e) => e.id) ?? []);
    }
  }, [currentProfile]);

  const toggleEquipment = (id: string) => {
    setEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (errors.equipment) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.equipment;
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre completo es requerido';
    }

    if (!isEditMode) {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum)) {
        newErrors.age = 'Ingresá una edad válida';
      } else if (ageNum < 16) {
        newErrors.age = 'La edad mínima requerida es 16 años';
      }
    }

    const weightNum = parseFloat(weightKg);
    if (isNaN(weightNum) || weightNum <= 0) {
      newErrors.weight = 'Ingresá un peso corporal válido (> 0 kg)';
    }

    if (equipmentIds.length === 0) {
      newErrors.equipment = 'Seleccioná al menos un ítem de equipamiento disponible';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mutation for updating/creating athlete profile (T-93)
  const saveProfileMutation = useMutation(
    {
      mutationFn: async (payload: { isEdit: boolean; data: UpdateProfileRequest | CreateProfileRequest }) => {
        if (payload.isEdit) {
          return await apiClient.profile.update(payload.data as UpdateProfileRequest);
        } else {
          return await apiClient.profile.create(payload.data as CreateProfileRequest);
        }
      },
      onSuccess: async (data, variables) => {
        await restoreSession();
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
        await queryClient.invalidateQueries({ queryKey: ['mesocycle'] });
        if (variables.isEdit) {
          setSuccessMessage('Perfil actualizado exitosamente');
          setIsGoalChangeModalOpen(false);
          onProfileUpdated?.(data as AthleteProfile);
        } else {
          onProfileCreated?.();
        }
      },
      onError: (err: any, variables) => {
        const msg =
          err?.data?.error?.message ||
          err?.message ||
          (variables.isEdit
            ? 'Error al actualizar el perfil'
            : 'Error al crear el perfil de atleta');
        setServerError(msg);
        setIsGoalChangeModalOpen(false);
      }
    },
    queryClient
  );

  const performSave = async () => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      if (isEditMode) {
        const updatePayload: UpdateProfileRequest = {
          name: name.trim(),
          weight_kg: parseFloat(weightKg),
          experience_level: experienceLevel,
          training_goal: trainingGoal,
          available_days_per_week: availableDays,
          equipment_ids: equipmentIds
        };

        await saveProfileMutation.mutateAsync({ isEdit: true, data: updatePayload });
      } else {
        const createPayload: CreateProfileRequest = {
          name: name.trim(),
          age: parseInt(age, 10),
          weight_kg: parseFloat(weightKg),
          experience_level: experienceLevel,
          training_goal: trainingGoal,
          available_days_per_week: availableDays,
          equipment_ids: equipmentIds
        };

        await saveProfileMutation.mutateAsync({ isEdit: false, data: createPayload });
      }
    } catch {
      // Handled in onError callback
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    // CA-01.5: If editing and goal has changed, request explicit confirmation
    if (isEditMode && trainingGoal !== initialGoal) {
      setIsGoalChangeModalOpen(true);
      return;
    }

    await performSave();
  };

  const handleLogout = () => {
    logout();
    try {
      localStorage.removeItem('smartforge_jwt');
    } catch {
      // localStorage may not be accessible in all environments
    }
    try {
      window.location.href = '/login';
    } catch {
      // jsdom fallback
    }
  };

  const goalLabels: Record<TrainingGoal, string> = {
    hipertrofia: 'Hipertrofia',
    fuerza: 'Fuerza',
    mixto: 'Mixto'
  };

  // Sparkline weight data & delta calculation
  const sparklineData = useMemo(() => {
    if (weightLogs.length >= 2) {
      return [...weightLogs].reverse().map((l) => l.weight_kg);
    }
    const current = parseFloat(weightKg) || 80;
    return [current - 1.2, current - 0.8, current - 0.4, current - 0.2, current];
  }, [weightLogs, weightKg]);

  const weightDelta = useMemo(() => {
    if (weightLogs.length >= 2 && weightLogs[0] && weightLogs[1]) {
      return +(weightLogs[0].weight_kg - weightLogs[1].weight_kg).toFixed(1);
    }
    return null;
  }, [weightLogs]);

  const currentDisplayWeight = useMemo(() => {
    const w = parseFloat(weightKg);
    return isNaN(w) ? 0 : w;
  }, [weightKg]);

  return (
    <div
      data-testid="mobile-container"
      className="w-full max-w-[390px] mx-auto flex flex-col min-h-full overflow-x-hidden text-content"
    >
      {/* Header Contextual: Hero Gradient en Edit Mode o Header clásico en Onboarding (T-19) */}
      <header className="mb-4">
        <h1 className="text-xl font-extrabold text-content tracking-tight">
          {isEditMode ? 'Editar Perfil' : 'Crear Perfil'}
        </h1>
        <span className="text-xs text-content-3 font-medium">
          {isEditMode ? 'Ajustes de Atleta' : 'Onboarding de Atleta'}
        </span>
      </header>

      {isEditMode && (
        <section className="hero-gradient animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-3.5 rounded-2xl border border-line p-4 shadow-lg shadow-brand/10 mb-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-xl font-extrabold text-content shadow-lg shadow-brand/30">
            {getInitials(name || 'Atleta')}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold tracking-tight text-content">
              {name || 'Atleta SmartForge'}
            </h2>
            <p className="text-[13px] text-content-2">
              <span className="font-mono">{age || '25'}</span> años · <span className="font-mono">{currentDisplayWeight.toFixed(1)} kg</span>
            </p>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-6 w-full overflow-x-hidden">
        {serverError && (
          <Toast
            type="error"
            message={serverError}
            onClose={() => setServerError(null)}
          />
        )}

        {successMessage && (
          <Toast
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        )}

        {/* CA-01.5 Notice in edit mode */}
        {isEditMode && (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-1 border border-line text-content-2 shadow-sm">
            <Info className="w-5 h-5 text-amber shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-content-2">
              Los cambios de equipamiento y días disponibles se aplican a partir del siguiente mesociclo (ver RF-10).
            </p>
          </div>
        )}

        {/* Datos Personales: Disposición estricta en 1 columna vertical (RF-11, Constitución R2) */}
        <Card title="Datos del Atleta">
          <div className="flex flex-col gap-3.5 pt-1 w-full">
            <Input
              label="Nombre completo"
              id="name"
              placeholder="Ej. Lucas Barzola"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={errors.name}
              iconLeft={<User className="w-4 h-4" />}
            />

            <div className="flex flex-col gap-3.5 w-full">
              <Input
                label="Edad"
                id="age"
                type="number"
                placeholder="≥ 16"
                value={age}
                disabled={isEditMode}
                onChange={(e) => {
                  setAge(e.target.value);
                  if (errors.age) setErrors((prev) => ({ ...prev, age: '' }));
                }}
                error={errors.age}
                helperText={isEditMode ? 'Edad registrada' : 'Mínimo 16 años'}
              />

              <Input
                label="Peso corporal (kg)"
                id="weight"
                type="number"
                step="0.1"
                placeholder="75.0"
                value={weightKg}
                disabled={isEditMode}
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  if (errors.weight) setErrors((prev) => ({ ...prev, weight: '' }));
                }}
                error={errors.weight}
              />
            </div>
          </div>
        </Card>

        {/* Sección: Control de Peso Corporal e Historial con Sparkline SVG (T-19, RF-01, RF-02) */}
        {isEditMode && (
          <Card title="Peso Corporal e Historial">
            <div className="flex flex-col gap-3 pt-1 w-full">
              <div className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-surface-2 border border-line">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-content-3 font-semibold">
                    <Scale className="h-3.5 w-3.5 text-amber" /> Peso más reciente
                  </p>
                  <p className="font-mono text-3xl font-bold text-content mt-0.5">
                    {currentDisplayWeight > 0 ? `${currentDisplayWeight.toFixed(1)}` : 'Sin registrar'}{' '}
                    <span className="text-sm text-content-3 font-normal">kg</span>
                  </p>
                </div>
                {weightDelta !== null && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-mono text-[11px] font-bold ${
                      weightDelta < 0 ? 'bg-success/15 text-success' : 'bg-amber/15 text-amber'
                    }`}
                  >
                    {weightDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {weightDelta > 0 ? `+${weightDelta.toFixed(1)}` : `${weightDelta.toFixed(1)}`} kg
                  </span>
                )}
              </div>

              {/* Sparkline SVG vectorial */}
              <div className="mt-1">
                <Sparkline data={sparklineData} className="h-16 w-full text-success" />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingWeightLog(null);
                    setRetroactiveDate(undefined);
                    setIsWeightModalOpen(true);
                  }}
                  className="press min-h-[48px] touch-target text-xs font-semibold rounded-xl bg-brand text-content shadow-lg shadow-brand/30 w-full"
                >
                  + Registrar pesaje
                </Button>
              </div>

              {/* Botón para alternar historial de pesajes */}
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setIsWeightHistoryOpen(!isWeightHistoryOpen)}
                className="press min-h-[48px] touch-target flex items-center justify-between text-xs rounded-xl border-line"
              >
                <span>{isWeightHistoryOpen ? 'Ocultar historial de pesajes' : 'Ver historial de pesajes'}</span>
                <span className="text-[11px] text-content-3 font-mono">
                  ({weightLogs.length} {weightLogs.length === 1 ? 'registro' : 'registros'})
                </span>
              </Button>

              {/* Lista cronológica con deltas y semanas vacías (TASK-33) */}
              {isWeightHistoryOpen && (
                <div className="pt-1 w-full">
                  <WeightHistoryList
                    logs={weightLogs}
                    isLoading={isLoadingWeightLogs}
                    onEditLog={(log) => {
                      setEditingWeightLog(log);
                      setRetroactiveDate(undefined);
                      setIsWeightModalOpen(true);
                    }}
                    onLogRetroactive={(date) => {
                      setEditingWeightLog(null);
                      setRetroactiveDate(date);
                      setIsWeightModalOpen(true);
                    }}
                    onAddNewLog={() => {
                      setEditingWeightLog(null);
                      setRetroactiveDate(undefined);
                      setIsWeightModalOpen(true);
                    }}
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Nivel de Experiencia: PillGroup con Sprout, Zap, Medal (T-19) */}
        <Card title="Nivel de experiencia">
          <div
            id="experience-section"
            tabIndex={-1}
            className="flex flex-col gap-2 pt-1 w-full outline-none"
          >
            {(
              [
                { id: 'principiante', label: 'Principiante', desc: '< 1 año', icon: Sprout },
                { id: 'intermedio', label: 'Intermedio', desc: '1 - 3 años', icon: Zap },
                { id: 'avanzado', label: 'Avanzado', desc: '> 3 años', icon: Medal }
              ] as const
            ).map((lvl) => {
              const isSelected = experienceLevel === lvl.id;
              const IconComp = lvl.icon;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setExperienceLevel(lvl.id)}
                  className={`press touch-target min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left border transition-all ${
                    isSelected
                      ? 'border-brand bg-brand/15 text-content shadow-lg shadow-brand/20 font-bold'
                      : 'border-line bg-surface-2 text-content-2 hover:border-line'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all ${
                        isSelected ? 'bg-brand text-content' : 'bg-surface-1 text-content-3'
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{lvl.label}</span>
                      <span className="text-[10px] text-content-3 font-normal">{lvl.desc}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-focus shrink-0 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Objetivo Principal: PillGroup con Trophy, Dumbbell, Flame (T-19) */}
        <Card title="Objetivo principal">
          <div
            id="goal-section"
            tabIndex={-1}
            className="flex flex-col gap-2 pt-1 w-full outline-none"
          >
            {(
              [
                { id: 'hipertrofia', label: 'Hipertrofia', icon: Dumbbell },
                { id: 'fuerza', label: 'Fuerza', icon: Trophy },
                { id: 'mixto', label: 'Mixto', icon: Flame }
              ] as const
            ).map((goal) => {
              const isSelected = trainingGoal === goal.id;
              const IconComp = goal.icon;
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setTrainingGoal(goal.id)}
                  className={`press touch-target min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left border transition-all ${
                    isSelected
                      ? 'border-brand bg-brand/15 text-content shadow-lg shadow-brand/20 font-bold'
                      : 'border-line bg-surface-2 text-content-2 hover:border-line'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all ${
                        isSelected ? 'bg-brand text-content' : 'bg-surface-1 text-content-3'
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-bold">{goal.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-focus shrink-0 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Días Disponibles: Cuadrícula de 7 columnas con botones circulares de 48px (T-19) */}
        <Card title="Días disponibles por semana">
          <div
            id="days-section"
            tabIndex={-1}
            className="grid grid-cols-7 gap-1 pt-1 w-full outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isSelected = availableDays === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  className={`press touch-target mx-auto grid h-12 w-full max-w-12 place-items-center rounded-full font-mono text-sm font-bold transition-all ${
                    isSelected
                      ? 'bg-amber bg-brand-primary text-ink shadow-lg shadow-amber/30 border-brand-primary'
                      : 'bg-surface-2 border border-line text-content-2 hover:bg-surface-3'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Equipamiento Accesible: Apilado vertical en 1 columna (RF-11, RF-08) */}
        <Card
          title="Equipamiento disponible"
          subtitle="Seleccioná los implementos a los que tenés acceso"
        >
          {errors.equipment && (
            <p className="text-xs text-fatigue-text font-medium mb-2.5">
              {errors.equipment}
            </p>
          )}

          <div
            id="equipment-section"
            tabIndex={-1}
            className="flex flex-col gap-2 pt-1 w-full outline-none"
          >
            {EQUIPMENT_TAXONOMY.map((item) => {
              const isSelected = equipmentIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleEquipment(item.id)}
                  className={`press touch-target min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-brand/15 border-brand text-content shadow-sm'
                      : 'bg-surface-2 border-line text-content-2 hover:border-line'
                  }`}
                >
                  <span className="leading-snug pr-2">{item.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-brand-focus shrink-0 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Acciones en Mitad Inferior: Sticky glass dock apilado verticalmente (T-19, RF-14) */}
        <div
          data-testid="profile-bottom-actions"
          className="glass sticky bottom-0 z-30 w-full p-3 flex flex-col gap-2.5 rounded-t-2xl border-t border-line shadow-2xl pb-[calc(12px+env(safe-area-inset-bottom))]"
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            id="submit-btn"
            className="press shadow-lg shadow-brand/30 min-h-[48px] touch-target font-bold bg-brand text-content rounded-xl"
          >
            {isEditMode ? 'Guardar Cambios' : 'Crear Perfil y Generar Mesociclo'}
          </Button>

          {isEditMode && onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={onCancel}
              className="press min-h-[48px] touch-target text-content-2 rounded-xl"
            >
              Cancelar
            </Button>
          )}

          <Button
            type="button"
            variant="destructive"
            size="md"
            fullWidth
            onClick={handleLogout}
            className="press min-h-[48px] touch-target font-bold rounded-xl bg-fatigue/15 text-fatigue-text border border-fatigue/30 hover:bg-fatigue/25"
          >
            <LogOut className="w-4 h-4 mr-2 inline" />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      </form>

      {/* Confirmation Modal for Training Goal Changes (CA-01.5) */}
      <Modal
        isOpen={isGoalChangeModalOpen}
        onClose={() => setIsGoalChangeModalOpen(false)}
        title="Confirmar cambio de objetivo"
        description="Atención: Modificación estructural del plan"
        footer={
          <div className="flex flex-col gap-2 w-full">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              onClick={performSave}
              className="press min-h-[48px] touch-target font-bold bg-brand shadow-lg shadow-brand/30"
            >
              Confirmar y Guardar
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsGoalChangeModalOpen(false)}
              className="press min-h-[48px] touch-target"
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center gap-2 p-3 bg-amber/10 border border-amber/30 rounded-xl text-amber text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber" />
            <span>
              Cambiar tu objetivo de entrenamiento archivará el mesociclo activo y generará un nuevo mesociclo completo de N semanas.
            </span>
          </div>

          <p className="text-xs text-content-2 leading-relaxed">
            El historial de cargas y sobrecarga progresiva se preservará para calcular con precisión las cargas de tus nuevos ejercicios.
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-line text-xs mt-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-content-3 uppercase tracking-wider font-semibold">Objetivo Actual</span>
              <span className="font-bold text-content">{goalLabels[initialGoal]}</span>
            </div>
            <span className="text-content-3 font-bold">→</span>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-brand-focus uppercase tracking-wider font-semibold">Nuevo Objetivo</span>
              <span className="font-bold text-brand-focus">{goalLabels[trainingGoal]}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Advertencia de Cambio de Disponibilidad con Ciclo Activo (RF-09 CA-09.1) */}
      <Modal
        isOpen={isAvailabilityModalOpen}
        onClose={() => {
          setIsAvailabilityModalOpen(false);
          setPendingDays(null);
        }}
        title="Modificación de disponibilidad"
        description="Atención: Mesociclo activo en curso"
        footer={
          <div className="flex flex-col gap-2 w-full">
            <Button
              variant="destructive"
              size="lg"
              fullWidth
              onClick={() => {
                setIsAvailabilityModalOpen(false);
                if (onCancelActiveMesocycle) {
                  onCancelActiveMesocycle();
                } else {
                  setIsCancelModalOpen(true);
                }
              }}
              className="press min-h-[48px] touch-target font-bold"
            >
              Cancelar mesociclo actual
            </Button>

            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                if (pendingDays !== null) {
                  setAvailableDays(pendingDays);
                }
                setIsAvailabilityModalOpen(false);
              }}
              className="press min-h-[48px] touch-target"
            >
              Aplicar para el próximo ciclo
            </Button>

            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => {
                setIsAvailabilityModalOpen(false);
                setPendingDays(null);
              }}
              className="press min-h-[48px] touch-target text-content-2"
            >
              Mantener días actuales
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-1 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber/10 border border-amber/30 text-amber">
            <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Una rutina en curso no admite modificaciones estructurales globales en sus días o tiempos de entrenamiento. Te recomendamos cancelar el ciclo actual para generar uno nuevo con los parámetros actualizados.
            </p>
          </div>

          <p className="text-content-2 leading-relaxed">
            Al cancelar el mesociclo actual, las sesiones y cargas ya completadas se preservarán intactas en tu historial para calibrar tu nuevo ciclo.
          </p>
        </div>
      </Modal>

      {/* Cancellation Modal Fallback */}
      <CancellationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onCancelSuccess={() => {
          setHasActiveMeso(false);
          onCancelActiveMesocycle?.();
        }}
      />

      {/* Modal de Registro y Edición de Peso Corporal (RF-01, RF-02) */}
      <WeightLogModal
        isOpen={isWeightModalOpen}
        onClose={() => {
          setIsWeightModalOpen(false);
          setEditingWeightLog(null);
          setRetroactiveDate(undefined);
        }}
        onSave={handleSaveWeight}
        initialLog={editingWeightLog}
        initialDate={retroactiveDate}
        existingLogs={weightLogs}
      />
    </div>
  );
};

export default ProfilePage;
