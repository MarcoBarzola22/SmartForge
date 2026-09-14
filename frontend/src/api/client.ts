import type {
  AthleteProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  MesocycleDetail,
  GenerateMesocycleRequest,
  Exercise,
  ExerciseAlternative,
  ExerciseAssignment,
  SwapExerciseRequest,
  TrainingSession,
  CheckInRequest,
  CheckInResponse,
  CreateSetLogRequest,
  UpdateSetLogRequest,
  SetLog,
  CreatePainReportRequest,
  PainReport,
  ProgressionSuggestion,
  SyncRequest,
  SyncResponse,
  WeightLogItem,
  WeightLogResponse,
  WeightLogListResponse,
  CreateWeightLogRequest,
  UpdateWeightLogRequest,
  RoutineTimeBlockItem,
  RoutineTimeBlockConfigResponse,
  MesocycleHistoryItem,
  MesocycleHistoryResponse,
  CancelActiveMesocycleResponse
} from './generated/types';

let authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
  if (token) {
    try {
      localStorage.setItem('smartforge_jwt', token);
    } catch {
      // localStorage may not be accessible in all environments
    }
  } else {
    try {
      localStorage.removeItem('smartforge_jwt');
    } catch {
      // localStorage may not be accessible in all environments
    }
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  try {
    const saved = localStorage.getItem('smartforge_jwt');
    if (saved) {
      authToken = saved;
      return saved;
    }
  } catch {
    // localStorage may not be accessible in all environments
  }
  return null;
};

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers = {}, ...restOptions } = options;

  let url = `${getApiBaseUrl()}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = getAuthToken();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>)
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers: requestHeaders,
    ...restOptions
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // Ignore if response body is not JSON
    }

    const code = errorData?.error?.code || errorData?.code || 'API_ERROR';
    const message =
      errorData?.error?.message ||
      errorData?.error ||
      errorData?.message ||
      `HTTP Error ${response.status}: ${response.statusText}`;

    throw new ApiClientError(response.status, code, message, errorData);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

export async function fetchWeightLogs(): Promise<WeightLogItem[]> {
  const res = await request<WeightLogListResponse | WeightLogItem[]>('/athletes/me/weight-logs');
  return Array.isArray(res) ? res : res.logs;
}

export async function createWeightLog(data: CreateWeightLogRequest): Promise<WeightLogItem> {
  const res = await request<WeightLogResponse | WeightLogItem>('/athletes/me/weight-logs', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return (res as WeightLogResponse).log ?? (res as WeightLogItem);
}

export async function updateWeightLog(id: string, data: UpdateWeightLogRequest): Promise<WeightLogItem> {
  const res = await request<WeightLogResponse | WeightLogItem>(`/athletes/me/weight-logs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return (res as WeightLogResponse).log ?? (res as WeightLogItem);
}

export async function fetchTimeBlockConfig(): Promise<RoutineTimeBlockItem[]> {
  const res = await request<RoutineTimeBlockConfigResponse | RoutineTimeBlockItem[]>('/routines/config/time-blocks');
  return Array.isArray(res) ? res : res.available_blocks;
}

export async function createMesocycleV2(data: GenerateMesocycleRequest): Promise<MesocycleDetail> {
  return request<MesocycleDetail>('/mesocycles', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function cancelActiveMesocycle(reason?: string): Promise<CancelActiveMesocycleResponse> {
  return request<CancelActiveMesocycleResponse>('/mesocycles/active/cancel', {
    method: 'POST',
    body: JSON.stringify(reason !== undefined ? { reason } : {})
  });
}

export async function fetchMesocycleHistory(): Promise<MesocycleHistoryItem[]> {
  const res = await request<MesocycleHistoryResponse | MesocycleHistoryItem[]>('/mesocycles/history');
  return Array.isArray(res) ? res : res.mesocycles;
}

export const apiClient = {
  auth: {
    getMe: () => request<AthleteProfile>('/auth/me')
  },

  profile: {
    get: () => request<AthleteProfile>('/profile'),
    create: (data: CreateProfileRequest) =>
      request<AthleteProfile>('/profile', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (data: UpdateProfileRequest) =>
      request<AthleteProfile>('/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: () =>
      request<void>('/profile', {
        method: 'DELETE'
      })
  },

  weightLogs: {
    list: fetchWeightLogs,
    create: createWeightLog,
    update: updateWeightLog
  },

  routineConfig: {
    getTimeBlocks: fetchTimeBlockConfig
  },

  mesocycles: {
    getCurrent: () => request<MesocycleDetail>('/mesocycles/current'),
    getById: (id: string) => request<MesocycleDetail>(`/mesocycles/${id}`),
    create: (data: GenerateMesocycleRequest) =>
      request<MesocycleDetail>('/mesocycles', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    createV2: createMesocycleV2,
    cancelActive: cancelActiveMesocycle,
    getHistory: fetchMesocycleHistory,
    rotate: (id: string) =>
      request<MesocycleDetail>(`/mesocycles/${id}/rotate`, {
        method: 'POST'
      })
  },

  routine: {
    getAlternatives: (exerciseId: string) =>
      request<ExerciseAlternative[]>(`/exercises/${exerciseId}/alternatives`),
    swapExercise: (assignmentId: string, data: SwapExerciseRequest) =>
      request<ExerciseAssignment>(`/assignments/${assignmentId}/swap`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  sessions: {
    start: (sessionPlanId: string) =>
      request<TrainingSession>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ session_plan_id: sessionPlanId })
      }),
    checkin: (sessionId: string, data: CheckInRequest) =>
      request<CheckInResponse>(`/sessions/${sessionId}/checkin`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    logSet: (sessionId: string, data: CreateSetLogRequest) =>
      request<SetLog>(`/sessions/${sessionId}/sets`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateSet: (setId: string, data: UpdateSetLogRequest) =>
      request<SetLog>(`/sets/${setId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    deleteSet: (setId: string) =>
      request<void>(`/sets/${setId}`, {
        method: 'DELETE'
      }),
    reportPain: (sessionId: string, data: CreatePainReportRequest) =>
      request<PainReport>(`/sessions/${sessionId}/pain-reports`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    complete: (sessionId: string) =>
      request<TrainingSession>(`/sessions/${sessionId}/complete`, {
        method: 'PATCH'
      })
  },

  progression: {
    getSuggestion: (assignmentId: string) =>
      request<ProgressionSuggestion>(`/assignments/${assignmentId}/progression`)
  },

  catalog: {
    list: (params?: { movement_pattern?: string; muscle_group?: string; search?: string }) =>
      request<Exercise[]>('/exercises', { params }),
    getById: (id: string) => request<Exercise>(`/exercises/${id}`)
  },

  sync: {
    syncOffline: (data: SyncRequest) =>
      request<SyncResponse>('/sync', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined })
};
