import { Component } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import {LoginService} from '../../services/auth/login.service'
import { Usuario } from '../../models/Usuario.model';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LoginRequest } from '../../models/Usuario.model';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  email = ''
  senha = ''
  mostrarSenha = false


  constructor(private loginService: LoginService, private http: HttpClient, private router: Router){

  }

  toggleSenha() {
    this.mostrarSenha = !this.mostrarSenha
  }

 login() {
  const usuario: LoginRequest = {
    email: this.email,
    senha: this.senha,
  }

  this.loginService.login(usuario).subscribe({
    next: (res: any) => {
      console.log("Usuario encontrado:", res);
      localStorage.setItem('token', res.token)
      localStorage.setItem('usuario', JSON.stringify(res.usuario))
      this.router.navigate(['/home'])
    },
    error: (err) => {
      console.log("Erro:", err);
    }
  });
}



}
