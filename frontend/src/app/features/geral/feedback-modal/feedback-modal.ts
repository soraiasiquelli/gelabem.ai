import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FeedbackService, TipoFeedback } from '../../../services/feedback.service';

const TIPOS: { valor: TipoFeedback, label: string, dica: string }[] = [
  { valor: 'ideia', label: '💡 Ideia', dica: 'Ex.: queria receber um aviso quando algo estiver pra vencer...' },
  { valor: 'problema', label: '🐞 Problema', dica: 'Ex.: ao tirar a foto, a lista veio com itens errados...' },
  { valor: 'elogio', label: '❤️ Elogio', dica: 'O que você mais gostou até agora?' },
]

const LIMITE = 2000

/** Modal global de "Sugerir melhoria". Abre com FeedbackService.abrir(); vive uma vez só, no App. */
@Component({
  selector: 'app-feedback-modal',
  imports: [FormsModule],
  templateUrl: './feedback-modal.html',
  styleUrl: './feedback-modal.css',
})
export class FeedbackModal {

  tipos = TIPOS
  limite = LIMITE

  tipo: TipoFeedback = 'ideia'
  mensagem = ''
  enviando = false
  enviado = false
  erro = ''

  constructor(
    public feedback: FeedbackService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get dica(): string {
    return TIPOS.find(t => t.valor === this.tipo)?.dica ?? ''
  }

  @HostListener('document:keydown.escape')
  aoApertarEsc() {
    if (this.feedback.aberto()) this.fechar()
  }

  fechar() {
    this.feedback.fechar()
    this.tipo = 'ideia'
    this.mensagem = ''
    this.erro = ''
    this.enviado = false
    this.enviando = false
  }

  enviar() {
    const mensagem = this.mensagem.trim()
    if (mensagem.length < 5) {
      this.erro = 'Conta um pouco mais pra gente entender.'
      return
    }
    if (this.enviando) return

    this.enviando = true
    this.erro = ''

    this.feedback.enviar(this.tipo, mensagem, this.router.url.split('?')[0]).subscribe({
      next: () => {
        this.enviando = false
        this.enviado = true
        this.cdr.markForCheck()
      },
      error: (err) => {
        this.enviando = false
        this.erro = err.error?.error || 'Não foi possível enviar agora. Tente de novo em instantes.'
        this.cdr.markForCheck()
      }
    })
  }
}
