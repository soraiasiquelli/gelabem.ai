import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, throwError } from 'rxjs'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token')
  const router = inject(Router)

  const reqComToken = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req

  return next(reqComToken).pipe(
    catchError((erro) => {
      // Sessão expirada ou inválida: limpa os dados locais e manda pro login,
      // sem tentar mostrar o app com dados que não pertencem mais a ninguém.
      if (erro.status === 401 && token) {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        router.navigate(['/login'])
      }
      return throwError(() => erro)
    })
  )
}
