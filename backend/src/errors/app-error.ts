export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado o no disponible.') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ProfileNotFoundError extends AppError {
  constructor(message = 'Perfil de atleta no encontrado. Complete el onboarding.') {
    super(404, 'PROFILE_NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'El recurso ya existe o genera un conflicto.') {
    super(409, 'CONFLICT', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado. Token ausente, inválido o expirado.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Petición inválida.') {
    super(400, 'BAD_REQUEST', message);
  }
}
