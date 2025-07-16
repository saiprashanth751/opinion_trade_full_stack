export type SuccessResponseType<T = unknown> = {
  status: true;
  code: number;
  message: string;
  additional?: T;
};
export { SuccessResponse };

class SuccessResponse<R = unknown> {
  status: true;
  code: number;
  additional?: R;
  message: string;
  constructor(message: string, code: number, additional?: R) {
    this.message = message;
    this.status = true;
    this.code = code;
    this.additional = additional;
  }
  serialize() {
    return {
      message: this.message,
      status: this.status,
      code: this.code,
      additional: this.additional,
    };
  }
}
