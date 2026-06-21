import { HttpInterceptorFn } from '@angular/common/http'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token')

  if (token) {
    // clona a requisição e adiciona o header Authorization
    const reqComToken = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
    return next(reqComToken)
  }

  return next(req) // se não tiver token, manda a requisição normal
}