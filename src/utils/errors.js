class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const createError = (status, message) => {
  return new AppError(status, message);
};

module.exports = {
  AppError,
  createError
};