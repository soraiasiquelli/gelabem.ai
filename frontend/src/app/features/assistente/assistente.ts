import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatService, MensagemChat } from '../../services/chat.service';
import { tr } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';

const SUGESTOES_RAPIDAS = [
  'O que posso fazer com o que eu já tenho?',
  'Quero uma receita rápida',
  'Tenho só 15 minutos',
  'Algo sem comprar nada',
]

@Component({
  selector: 'app-assistente',
  imports: [TPipe, FormsModule],
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
  // true até chegar o primeiro pedaço da resposta (mostra os pontinhos "digitando")
  aguardandoResposta = false
  erro = ''

  private deveRolar = false

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngAfterViewChecked() {
    if (this.deveRolar && this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight
      this.deveRolar = false
    }
  }

  usarSugestao(texto: string) {
    this.enviar(tr(texto))
  }

  enviarDoInput() {
    this.enviar(this.mensagemAtual)
  }

  async enviar(texto: string) {
    const mensagem = texto.trim()
    if (!mensagem || this.enviando) return

    const historico = [...this.mensagens]
    this.mensagens.push({ autor: 'usuario', texto: mensagem })
    this.mensagemAtual = ''
    this.enviando = true
    this.aguardandoResposta = true
    this.erro = ''
    this.deveRolar = true

    let resposta: MensagemChat | null = null

    try {
      await this.chatService.enviarStream(mensagem, historico, (pedaco) => {
        if (!resposta) {
          resposta = { autor: 'assistente', texto: '' }
          this.mensagens.push(resposta)
          this.aguardandoResposta = false
        }
        resposta.texto += pedaco
        this.deveRolar = true
        this.cdr.detectChanges()
      })
    } catch (err: any) {
      if (err?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        this.router.navigate(['/login'])
        return
      }
      this.erro = err?.message || tr('Não conseguimos responder agora. Tenta de novo.')
    } finally {
      this.enviando = false
      this.aguardandoResposta = false
      this.deveRolar = true
      this.cdr.detectChanges()
    }
  }
}
