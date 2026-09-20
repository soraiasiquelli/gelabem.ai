import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MensagemChat {
  autor: 'usuario' | 'assistente';
  texto: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private api = environment.apiUrl

  constructor(private http: HttpClient) {}

  enviar(mensagem: string, historico: MensagemChat[]): Observable<{ resposta: string }> {
    return this.http.post<{ resposta: string }>(`${this.api}/chat`, { mensagem, historico })
  }
}
