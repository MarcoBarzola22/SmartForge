import React, { useState, useEffect } from 'react';
import { MobileLayout } from '../../components/layout/MobileLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { EQUIPMENT_TAXONOMY } from '../../constants/equipment';
import { apiClient } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import type {
  ExperienceLevel,
  TrainingGoal,
  AthleteProfile,
  CreateProfileRequest,
  UpdateProfileRequest
} from '../../api';
import { Check, Dumbbell, User, Calendar, Target, AlertTriangle, Info } from 'lucide-react';

export interface ProfilePageProps {
  mode?: 'create' | 'edit';
  initialProfile?: AthleteProfile | null;
  onProfileCreated?: () => void;
  onProfileUpdated?: (updatedProfile: AthleteProfile) => void;
  onCancel?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  mode,
  initialProfile,
  onProfileCreated,
  onProfileUpdated,
  onCancel
}) => {
  const { user, restoreSession } = useAuth();
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
  const [equipmentIds, setEquipmentIds] = useState<string[]>(
    currentProfile?.equipment?.map((e) => e.id) ?? []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoalChangeModalOpen, setIsGoalChangeModalOpen] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setName(currentProfile.name ?? '');
      setAge(String(currentProfile.age ?? ''));
      setWeightKg(String(currentProfile.weight_kg ?? ''));
      setExperienceLevel(currentProfile.experience_level ?? 'intermedio');
      setTrainingGoal(currentProfile.training_goal ?? 'hipertrofia');
      setAvailableDays(currentProfile.available_days_per_week ?? 4);
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

        const updated = await apiClient.profile.update(updatePayload);
        await restoreSession();
        setSuccessMessage('Perfil actualizado exitosamente');
        setIsGoalChangeModalOpen(false);
        onProfileUpdated?.(updated);
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

        await apiClient.profile.create(createPayload);
        await restoreSession();
        onProfileCreated?.();
      }
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ||
        err?.message ||
        (isEditMode
          ? 'Error al actualizar el perfil'
          : 'Error al crear el perfil de atleta');
      setServerError(msg);
      setIsGoalChangeModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const goalLabels: Record<TrainingGoal, string> = {
    hipertrofia: 'Hipertrofia',
    fuerza: 'Fuerza',
    mixto: 'Mixto'
  };

  return (
    <MobileLayout
      title={isEditMode ? 'Editar Perfil' : 'Crear Perfil'}
      subtitle={isEditMode ? 'Ajustes de Atleta' : 'Onboarding de Atleta'}
      isOnline={true}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-6">
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
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-zinc-300">
              Los cambios de equipamiento y días disponibles se aplican a partir del siguiente mesociclo (ver RF-10).
            </p>
          </div>
        )}

        {/* Datos Personales */}
        <Card title="Datos del Atleta">
          <div className="flex flex-col gap-3.5 pt-1">
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

            <div className="grid grid-cols-2 gap-3">
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
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  if (errors.weight) setErrors((prev) => ({ ...prev, weight: '' }));
                }}
                error={errors.weight}
              />
            </div>
          </div>
        </Card>

        {/* Nivel de Experiencia */}
        <Card title="Nivel de experiencia">
          <div className="grid grid-cols-3 gap-2 pt-1">
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
                  className={`touch-target min-h-[48px] p-2 rounded-xl flex flex-col items-center justify-center text-center border transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs">{lvl.label}</span>
                  <span className="text-[10px] text-zinc-400 font-normal">{lvl.desc}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Objetivo Principal */}
        <Card title="Objetivo principal">
          <div className="grid grid-cols-3 gap-2 pt-1">
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
                  className={`touch-target min-h-[48px] p-2 rounded-xl flex flex-col items-center justify-center text-center border transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <IconComp className="w-4 h-4 mb-1" />
                  <span className="text-xs">{goal.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Días Disponibles */}
        <Card title="Días disponibles por semana">
          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isSelected = availableDays === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setAvailableDays(day)}
                  className={`touch-target min-h-[48px] rounded-xl flex items-center justify-center font-bold text-sm border transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Equipamiento Accesible (Taxonomía cerrada de 20 ítems) */}
        <Card
          title="Equipamiento disponible"
          subtitle="Seleccioná los implementos a los que tenés acceso"
        >
          {errors.equipment && (
            <p className="text-xs text-red-400 font-medium mb-2.5">
              {errors.equipment}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {EQUIPMENT_TAXONOMY.map((item) => {
              const isSelected = equipmentIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleEquipment(item.id)}
                  className={`touch-target min-h-[48px] px-3 py-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-sm'
                      : 'bg-zinc-900/90 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="leading-snug pr-2">{item.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="pt-2 sticky bottom-4 z-20 flex flex-col gap-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            className="shadow-xl"
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
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {/* Confirmation Modal for Training Goal Changes (CA-01.5) */}
      <Modal
        isOpen={isGoalChangeModalOpen}
        onClose={() => setIsGoalChangeModalOpen(false)}
        title="Confirmar cambio de objetivo"
        description="Atención: Modificación estructural del plan"
        footer={
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              onClick={performSave}
            >
              Confirmar y Guardar
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsGoalChangeModalOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              Cambiar tu objetivo de entrenamiento archivará el mesociclo activo y generará un nuevo mesociclo completo de N semanas.
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            El historial de cargas y sobrecarga progresiva se preservará para calcular con precisión las cargas de tus nuevos ejercicios.
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs mt-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Objetivo Actual</span>
              <span className="font-semibold text-zinc-300">{goalLabels[initialGoal]}</span>
            </div>
            <span className="text-zinc-500 font-bold">→</span>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-amber-400 uppercase tracking-wider">Nuevo Objetivo</span>
              <span className="font-semibold text-amber-300">{goalLabels[trainingGoal]}</span>
            </div>
          </div>
        </div>
      </Modal>
    </MobileLayout>
  );
};

export default ProfilePage;
