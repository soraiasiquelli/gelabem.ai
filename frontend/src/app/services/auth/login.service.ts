import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, LoginRequest } from '../../models/Usuario.model';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private api = environment.apiUrl

  constructor(private http: HttpClient) {}

  addItemBD(usuario: Usuario) {
    return this.http.post(`${this.api}/usuarios`, usuario)
  }

  getItensBD(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.api}/itens`)
  }

  login(usuario: LoginRequest) {
    return this.http.post(`${this.api}/login`, usuario)
  }

  salvarArmazenamentos(usuarioId: number, armazenamentos: string[]) {
    return this.http.post(`${this.api}/usuarios/${usuarioId}/armazenamentos`, { armazenamentos })
  }

  getArmazenamentos(usuarioId: number): Observable<{ id: number, nome: string, usuario_id: number }[]> {
    return this.http.get<{ id: number, nome: string, usuario_id: number }[]>(`${this.api}/usuarios/${usuarioId}/armazenamentos`)
  }

  getLogin(){
    return localStorage.getItem('token')
  }

  isLoggedIn(): boolean{
    return !!localStorage.getItem('token')
  }
logout() {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
}

 
}