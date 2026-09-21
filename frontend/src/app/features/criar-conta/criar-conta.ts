import { Component } from '@angular/core';
import { LoginService } from '../../services/auth/login.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Usuario } from '../../models/Usuario.model';
import { GoogleLogin } from '../geral/google-login/google-login';
import { TPipe } from '../../i18n/t.pipe';
import { tr } from '../../i18n/i18n.service';
import { SeletorIdioma } from '../geral/seletor-idioma/seletor-idioma';
@Component({
  selector: 'app-criar-conta',
  imports: [SeletorIdioma, TPipe, FormsModule, RouterLink, GoogleLogin],
  standalone: true,
  templateUrl: './criar-conta.html',
  styleUrl: './criar-conta.css',
})
export class CriarConta {
    nome = ''
    email = ''
    senha = ''
    repetirsenha = ''
    mostrarSenha = false
    mostrarConfirmarSenha = false
    erro = ''


  constructor(private loginService: LoginService, private http: HttpClient, private router: Router){

  }

  aoEntrarComGoogle(resultado: { novo: boolean }) {
    // quem já tinha conta cai no início; conta nova começa pela foto
    this.router.navigate([resultado.novo ? '/comecar' : '/home'])
  }

  toggleSenha() {
    this.mostrarSenha = !this.mostrarSenha
  }

  toggleConfirmarSenha() {
    this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha
  }

validarSenha(){
  if(this.senha === this.repetirsenha){
    this.adicionarUsuario()
  }else{
    alert(tr("As senhas não coincidem, tente novamente"))
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

  this.erro = ''

  this.loginService.addItemBD(novoUsuario).subscribe({
    next: (res: any) => {
      console.log("Salvo no banco:", res);
      this.loginService.salvarSessao(res)
      // a conta já nasce com a geladeira; o primeiro passo é fotografar, não escolher armazenamentos
      this.router.navigate(['/comecar'])
    },
    error: (err) => {
      console.log("Erro:", err);
      this.erro = err.error?.error || tr('Não foi possível criar sua conta agora. Tente novamente.')
    }
  });
}
}
