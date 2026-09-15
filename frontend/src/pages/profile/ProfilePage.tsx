import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
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
import { Check, Dumbbell, User, Calendar, Target, AlertTriangle, Info, Scale } from 'lucide-react';
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

  // Weight tracking & history module (RF-01, RF-02)
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

  return (
    <div
      data-testid="mobile-container"
      className="w-full max-w-[390px] mx-auto flex flex-col min-h-full overflow-x-hidden"
    >
      <header className="mb-4">
        <h1 className="text-lg font-bold text-white">
          {isEditMode ? 'Editar Perfil' : 'Crear Perfil'}
        </h1>
        <span className="text-xs text-zinc-400 font-medium">
          {isEditMode ? 'Ajustes de Atleta' : 'Onboarding de Atleta'}
        </span>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-6 w-full overflow-x-hidden">
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
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-1 border border-border-subtle text-content-secondary">
            <Info className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-content-secondary">
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

              {!isEditMode && (
                <Input
                  label="Peso corporal (kg)"
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="75.0"
                  value={weightKg}
                  onChange={(e) => {
                    setWeightKg(e.target.value);
                    if (errors.weight) setErrors((prev) => ({ ...prev, weight: '' }));
                  }}
                  error={errors.weight}
                />
              )}
            </div>
          </div>
        </Card>

        {/* Sección: Control de Peso Corporal e Historial (RF-01, RF-02) */}
        {isEditMode && (
          <Card title="Peso Corporal e Historial">
            <div className="flex flex-col gap-3 pt-1 w-full">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-content-secondary">Peso más reciente</span>
                    <span className="text-sm font-bold text-content-primary">
                      {weightKg ? `${parseFloat(weightKg).toFixed(1)} kg` : 'Sin registrar'}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingWeightLog(null);
                    setRetroactiveDate(undefined);
                    setIsWeightModalOpen(true);
                  }}
                  className="min-h-[48px] touch-target text-xs font-semibold"
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
                className="min-h-[48px] touch-target flex items-center justify-between text-xs"
              >
                <span>{isWeightHistoryOpen ? 'Ocultar historial de pesajes' : 'Ver historial de pesajes'}</span>
                <span className="text-[11px] text-content-secondary">
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

        {/* Nivel de Experiencia: Apilado vertical en 1 columna (RF-11) */}
        <Card title="Nivel de experiencia">
          <div
            id="experience-section"
            tabIndex={-1}
            className="flex flex-col gap-2 pt-1 w-full outline-none"
          >
            {(
              [
                { id: 'principiante', label: 'Principiante', desc: '< 1 año' },
                { id: 'intermedio', label: 'Intermedio', desc: '1 - 3 años' },
                { id: 'avanzado', label: 'Avanzado', desc: '> 3 años' }
              ] as const
            ).map((lvl) => {
              const isSelected = experienceLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setExperienceLevel(lvl.id)}
                  className={`touch-target min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left border transition-all ${
                    isSelected
                      ? 'bg-brand-primary/15 border-brand-primary text-brand-primary font-bold shadow-sm'
                      : 'bg-surface-2 border-border-interactive text-content-primary hover:border-border-interactive'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{lvl.label}</span>
                    <span className="text-[10px] text-content-secondary font-normal">{lvl.desc}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Objetivo Principal: Apilado vertical en 1 columna (RF-11) */}
        <Card title="Objetivo principal">
          <div
            id="goal-section"
            tabIndex={-1}
            className="flex flex-col gap-2 pt-1 w-full outline-none"
          >
            {(
              [
                { id: 'hipertrofia', label: 'Hipertrofia', icon: Dumbbell },
                { id: 'fuerza', label: 'Fuerza', icon: Target },
                { id: 'mixto', label: 'Mixto', icon: Calendar }
              ] as const
            ).map((goal) => {
              const isSelected = trainingGoal === goal.id;
              const IconComp = goal.icon;
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setTrainingGoal(goal.id)}
                  className={`touch-target min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left border transition-all ${
                    isSelected
                      ? 'bg-brand-primary/15 border-brand-primary text-brand-primary font-bold shadow-sm'
                      : 'bg-surface-2 border-border-interactive text-content-primary hover:border-border-interactive'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className="w-4 h-4 text-brand-primary" />
                    <span className="text-xs font-semibold">{goal.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Días Disponibles: Flex-wrap con dianas táctiles universales >= 48px */}
        <Card title="Días disponibles por semana">
          <div
            id="days-section"
            tabIndex={-1}
            className="flex flex-wrap gap-2 pt-1 w-full outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isSelected = availableDays === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  className={`touch-target min-h-[48px] min-w-[48px] flex-1 rounded-xl flex items-center justify-center font-bold text-sm border transition-all ${
                    isSelected
                      ? 'bg-brand-primary text-brand-contrast border-brand-primary shadow-md'
                      : 'bg-surface-2 border-border-interactive text-content-primary hover:border-border-interactive'
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
            <p className="text-xs text-semantic-error-text font-medium mb-2.5">
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
                  className={`touch-target min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-brand-primary/15 border-brand-primary text-brand-primary shadow-sm'
                      : 'bg-surface-2 border-border-interactive text-content-primary hover:border-border-interactive'
                  }`}
                >
                  <span className="leading-snug pr-2">{item.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-brand-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Acciones en Mitad Inferior: Apiladas verticalmente al 100% (RF-04, RF-05, RF-14) */}
        <div
          data-testid="profile-bottom-actions"
          className="sticky bottom-0 z-30 w-full bg-surface-1/95 backdrop-blur-md border-t border-border-interactive p-3 flex flex-col gap-2.5 rounded-t-2xl shadow-2xl pb-[calc(12px+env(safe-area-inset-bottom))]"
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            id="submit-btn"
            className="shadow-lg min-h-[48px] touch-target"
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
              className="min-h-[48px] touch-target text-content-secondary"
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
            className="min-h-[48px] touch-target"
          >
            Cerrar Sesión
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
              className="min-h-[48px] touch-target"
            >
              Confirmar y Guardar
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsGoalChangeModalOpen(false)}
              className="min-h-[48px] touch-target"
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center gap-2 p-3 bg-brand-primary/10 border border-brand-primary/30 rounded-xl text-brand-primary text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-brand-primary" />
            <span>
              Cambiar tu objetivo de entrenamiento archivará el mesociclo activo y generará un nuevo mesociclo completo de N semanas.
            </span>
          </div>

          <p className="text-xs text-content-secondary leading-relaxed">
            El historial de cargas y sobrecarga progresiva se preservará para calcular con precisión las cargas de tus nuevos ejercicios.
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-base border border-border-interactive text-xs mt-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-content-secondary uppercase tracking-wider">Objetivo Actual</span>
              <span className="font-semibold text-content-primary">{goalLabels[initialGoal]}</span>
            </div>
            <span className="text-content-secondary font-bold">→</span>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-brand-primary uppercase tracking-wider">Nuevo Objetivo</span>
              <span className="font-semibold text-brand-primary">{goalLabels[trainingGoal]}</span>
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
              className="min-h-[48px] touch-target"
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
              className="min-h-[48px] touch-target"
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
              className="min-h-[48px] touch-target text-content-secondary"
            >
              Mantener días actuales
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-1 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Una rutina en curso no admite modificaciones estructurales globales en sus días o tiempos de entrenamiento. Te recomendamos cancelar el ciclo actual para generar uno nuevo con los parámetros actualizados.
            </p>
          </div>

          <p className="text-content-secondary leading-relaxed">
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
