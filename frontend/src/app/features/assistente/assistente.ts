import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService, MensagemChat } from '../../services/chat.service';

const SUGESTOES_RAPIDAS = [
  'O que posso fazer com o que eu já tenho?',
  'Quero uma receita rápida',
  'Tenho só 15 minutos',
  'Algo sem comprar nada',
]

@Component({
  selector: 'app-assistente',
  imports: [FormsModule],
  templateUrl: './assistente.html',
  styleUrl: './assistente.css',
})
export class Assistente implements AfterViewChecked {

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLDivElement>

  sugestoesRapidas = SUGESTOES_RAPIDAS

  mensagens: MensagemChat[] = [
    { autor: 'assistente', texto: 'Oi! Me conta o que você tem em casa ou pergunta o que dá pra cozinhar hoje 🍳' }
  ]

  mensagemAtual = ''
  enviando = false
  erro = ''

  private deveRolar = false

  constructor(private chatService: ChatService) {}

  ngAfterViewChecked() {
    if (this.deveRolar && this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight
      this.deveRolar = false
    }
  }

  usarSugestao(texto: string) {
    this.enviar(texto)
  }

  enviarDoInput() {
    this.enviar(this.mensagemAtual)
  }

  enviar(texto: string) {
    const mensagem = texto.trim()
    if (!mensagem || this.enviando) return

    const historico = [...this.mensagens]
    this.mensagens.push({ autor: 'usuario', texto: mensagem })
    this.mensagemAtual = ''
    this.enviando = true
    this.erro = ''
    this.deveRolar = true

    this.chatService.enviar(mensagem, historico).subscribe({
      next: (res) => {
        this.mensagens.push({ autor: 'assistente', texto: res.resposta })
        this.enviando = false
        this.deveRolar = true
      },
      error: (err) => {
        this.erro = err.error?.error || 'Não conseguimos responder agora. Tenta de novo.'
        this.enviando = false
        this.deveRolar = true
      }
    })
  }
}
