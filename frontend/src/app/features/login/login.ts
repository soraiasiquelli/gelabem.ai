import { Component } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import {LoginService} from '../../services/auth/login.service'
import { Usuario } from '../../models/Usuario.model';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LoginRequest } from '../../models/Usuario.model';
import { GoogleLogin } from '../geral/google-login/google-login';
import { TPipe } from '../../i18n/t.pipe';
import { tr } from '../../i18n/i18n.service';
import { SeletorIdioma } from '../geral/seletor-idioma/seletor-idioma';

@Component({
  selector: 'app-login',
  imports: [SeletorIdioma, TPipe, RouterLink, FormsModule, GoogleLogin],
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  email = ''
  senha = ''
  mostrarSenha = false
  erro = ''


  constructor(private loginService: LoginService, private http: HttpClient, private router: Router){

  }

  aoEntrarComGoogle(resultado: { novo: boolean }) {
    // conta criada agora vai direto pra foto; quem já tinha conta segue pro início
    this.router.navigate([resultado.novo ? '/comecar' : '/home'])
  }

  toggleSenha() {
    this.mostrarSenha = !this.mostrarSenha
  }

 login() {
  const usuario: LoginRequest = {
    email: this.email,
    senha: this.senha,
  }

  this.erro = ''

  this.loginService.login(usuario).subscribe({
    next: (res: any) => {
      console.log("Usuario encontrado:", res);
      this.loginService.salvarSessao(res)
      this.router.navigate(['/home'])
    },
    error: (err) => {
      console.log("Erro:", err);
      this.erro = err.error?.error || tr('Não foi possível entrar agora. Tente novamente.')
    }
  });
}



}
