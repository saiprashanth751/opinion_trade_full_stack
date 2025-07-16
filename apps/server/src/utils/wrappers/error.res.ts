// Got throught the file...

import { ZodError } from "zod";
import { generateErrorMessage } from "zod-error";
import { ERROR_CODE, ERROR_NAME } from "../../config/error.config";
import { JsonWebTokenError } from "jsonwebtoken";
export type ErrorResponseType = {
  name: string;
  message: string;
  code: number;
  status: false;
};
export type ErrorDetails = {
  message: string;
  stack?: string;
  [key: string]: unknown;
};
class ErrorHandler extends Error {
  status: false;
  error?: ErrorDetails;
  code: number;

  constructor(
    message: string,
    code: keyof typeof ERROR_CODE,
    error?: ErrorDetails
  ) {
    super(message);
    this.status = false;
    this.error = error;
    this.code = ERROR_CODE[code];
    this.name = ERROR_NAME[code];
  }
}
function standardizeApiError(error: unknown): ErrorResponseType {
  if (error instanceof ErrorHandler) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
    };
  }
  if (error instanceof JsonWebTokenError) {
    return {
      name: ERROR_NAME.UNAUTHORIZED,
      message: error.message,
      code: ERROR_CODE.UNAUTHORIZED,
      status: false,
    };
  }
  if (error instanceof ZodError) {
    return {
      name: error.name,
      message: generateErrorMessage(error.issues, {
        maxErrors: 2,
        delimiter: {
          component: ": ",
        },
        message: {
          enabled: true,
          label: "",
        },
        path: {
          enabled: true,
          label: "",
          type: "objectNotation",
        },
        code: {
          enabled: false,
        },
      }),
      code: ERROR_CODE.UNPROCESSABLE_ENTITY,
      status: false,
    };
  }

  return {
    name: ERROR_NAME.INTERNAL_SERVER_ERROR,
    message: "Internal server error",
    code: ERROR_CODE.INTERNAL_SERVER_ERROR,
    status: false,
  };
}

export { ErrorHandler, standardizeApiError };
