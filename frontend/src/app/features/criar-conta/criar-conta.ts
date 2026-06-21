import { Component } from '@angular/core';
import { LoginService } from '../../services/auth/login.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Usuario } from '../../models/Usuario.model';
@Component({
  selector: 'app-criar-conta',
  imports: [FormsModule],
  standalone: true,
  templateUrl: './criar-conta.html',
  styleUrl: './criar-conta.css',
})
export class CriarConta {
    nome = ''
    email = ''
    senha = ''
    repetirsenha = ''


  constructor(private loginService: LoginService, private http: HttpClient, private router: Router){

  }

validarSenha(){
  if(this.senha === this.repetirsenha){
    this.adicionarUsuario()
  }else{
    alert("As senhas não coincidem, tente novamente")
  }
}


adicionarUsuario() {
  console.log("Funcao chamada")
  const novoUsuario: Usuario = {
    id: Date.now(),
    nome: this.nome,
    email: this.email,
    senha: this.senha
  }
  console.log(novoUsuario)

  this.loginService.addItemBD(novoUsuario).subscribe({
    next: (res: any) => {
      console.log("Salvo no banco:", res);
      localStorage.setItem('token', res.token)
      localStorage.setItem('usuario', JSON.stringify(res.usuario))
      this.router.navigate(['/escolher-armazenamento'])
    },
    error: (err) => {
      console.log("Erro:", err);
    }
  });
}
}
