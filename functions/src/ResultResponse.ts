export default class ResultResponse {
  result: {
    status: string
    message: string
    payload: any
  }
  constructor(status: string, message: string, payload?: any) {
    this.result = {
      status,
      message,
      payload,
    }
  }
}
