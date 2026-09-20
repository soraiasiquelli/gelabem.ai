import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MensagemChat {
  autor: 'usuario' | 'assistente';
  texto: string;
}

export interface FimChat {
  usosIA: number;
  limiteIA: number | null;
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

  // Resposta em streaming (SSE): chama onTexto a cada pedaço que chega e resolve no fim.
  // Usa fetch porque o HttpClient do Angular só entrega a resposta quando ela termina.
  async enviarStream(
    mensagem: string,
    historico: MensagemChat[],
    onTexto: (pedaco: string) => void
  ): Promise<FimChat> {
    const token = localStorage.getItem('token')

    const res = await fetch(`${this.api}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ mensagem, historico })
    })

    if (!res.ok) {
      const corpo = await res.json().catch(() => ({}))
      throw { status: res.status, message: corpo.error || 'Não conseguimos responder agora. Tente de novo.' }
    }
    if (!res.body) throw { status: 0, message: 'Não conseguimos responder agora. Tente de novo.' }

    const leitor = res.body.getReader()
    const decodificador = new TextDecoder()
    let buffer = ''
    let fim: FimChat = { usosIA: 0, limiteIA: null }

    while (true) {
      const { done, value } = await leitor.read()
      if (done) break
      buffer += decodificador.decode(value, { stream: true })

      let corte: number
      while ((corte = buffer.indexOf('\n\n')) >= 0) {
        const evento = buffer.slice(0, corte)
        buffer = buffer.slice(corte + 2)
        if (!evento.startsWith('data: ')) continue

        const dados = JSON.parse(evento.slice(6))
        if (dados.erro) throw { status: 500, message: dados.erro }
        if (dados.t) onTexto(dados.t)
        if (dados.fim) fim = { usosIA: dados.usosIA, limiteIA: dados.limiteIA }
      }
    }

    return fim
  }
}
