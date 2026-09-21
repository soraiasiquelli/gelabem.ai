import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, throwError } from 'rxjs'
import { I18n } from '../i18n/i18n.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token')
  const router = inject(Router)
  const idioma = inject(I18n).idioma()

  const reqComToken = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}`, 'Accept-Language': idioma } })
    : req.clone({ setHeaders: { 'Accept-Language': idioma } })

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
