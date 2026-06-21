import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { LoginService } from '../services/auth/login.service'

export const authGuard: CanActivateFn = () => {
  const loginService = inject(LoginService)
  const router = inject(Router)

  if (loginService.isLoggedIn()) {
    return true // tem token, deixa passar
  }

  router.navigate(['/login']) // não tem token, manda para o login
  return false
}