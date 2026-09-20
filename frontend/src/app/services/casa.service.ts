import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MoradorCasa {
  id: number
  nome: string
  email: string
}

export interface Casa {
  id: number
  nome: string
  codigo: string
  dono_id: number
  limite_membros: number
  membros: MoradorCasa[]
}

@Injectable({
  providedIn: 'root'
})
export class CasaService {

  private api = environment.apiUrl

  constructor(private http: HttpClient) {}

  /** null quando o usuário usa o app sozinho */
  obter(): Observable<Casa | null> {
    return this.http.get<{ casa: Casa | null }>(`${this.api}/casa`).pipe(map(res => res.casa))
  }

  criar(nome?: string): Observable<Casa> {
    return this.http.post<{ casa: Casa }>(`${this.api}/casa`, { nome }).pipe(map(res => res.casa))
  }

  entrar(codigo: string): Observable<Casa> {
    return this.http.post<{ casa: Casa }>(`${this.api}/casa/entrar`, { codigo }).pipe(map(res => res.casa))
  }

  sair(): Observable<unknown> {
    return this.http.post(`${this.api}/casa/sair`, {})
  }

  renovarCodigo(): Observable<Casa> {
    return this.http.post<{ casa: Casa }>(`${this.api}/casa/codigo/renovar`, {}).pipe(map(res => res.casa))
  }

  removerMorador(usuarioId: number): Observable<Casa> {
    return this.http.delete<{ casa: Casa }>(`${this.api}/casa/membros/${usuarioId}`).pipe(map(res => res.casa))
  }
}
