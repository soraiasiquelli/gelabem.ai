import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TipoFeedback = 'ideia' | 'problema' | 'elogio'

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {

  private api = environment.apiUrl

  /** controla o modal global "Sugerir melhoria" (renderizado uma vez no App) */
  aberto = signal(false)

  constructor(private http: HttpClient) {}

  abrir() {
    this.aberto.set(true)
  }

  fechar() {
    this.aberto.set(false)
  }

  enviar(tipo: TipoFeedback, mensagem: string, pagina: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/feedback`, { tipo, mensagem, pagina })
  }
}
