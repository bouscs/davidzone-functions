export default class ErrorResponse {
  error: {
    status: string
    message: string
    payload: any
  }
  constructor(status: string, message: string, payload?: any) {
    this.error = {
      status,
      message,
      payload,
    }
  }
}
