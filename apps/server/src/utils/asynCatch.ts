import { Request, Response, NextFunction } from "express";
import { standardizeApiError } from "./wrappers/error.res";
type AsyncHandler<T = unknown> = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<T>;

export const AsyncWrapper = <T>(handler: AsyncHandler<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch((error: unknown) => {
      console.log(error);
      const standardizedError = standardizeApiError(error);
      res.status(standardizedError.code).json(standardizedError);
    });
  };
};