import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Casa, CasaService, MoradorCasa } from '../../services/casa.service';
import { FeedbackService } from '../../services/feedback.service';
import { LoginService } from '../../services/auth/login.service';
import { UsoIA, UsoIAService } from '../../services/uso-ia.service';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnDestroy {

  usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

  usoIA?: UsoIA

  casa: Casa | null = null
  carregandoCasa = true
  erroCasa = ''
  ocupado = false

  nomeNovaCasa = ''
  codigoConvite = ''

  copiado = false
  private timerCopiado?: ReturnType<typeof setTimeout>

  constructor(
    private casaService: CasaService,
    private feedbackService: FeedbackService,
    private loginService: LoginService,
    private usoIAService: UsoIAService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.carregarCasa()
    this.usoIAService.obter().subscribe({
      next: (uso) => {
        this.usoIA = uso
        this.cdr.markForCheck()
      },
      error: () => {}
    })
  }

  ngOnDestroy() {
    clearTimeout(this.timerCopiado)
  }

  get inicial(): string {
    return (this.usuario?.nome || '?').trim().charAt(0).toUpperCase()
  }

  get percentualIA(): number {
    if (!this.usoIA?.limiteIA) return 0
    return Math.min(100, Math.round((this.usoIA.usosIA / this.usoIA.limiteIA) * 100))
  }

  get souDono(): boolean {
    return !!this.casa && this.casa.dono_id === this.usuario?.id
  }

  carregarCasa() {
    this.carregandoCasa = true
    this.casaService.obter().subscribe({
      next: (casa) => {
        this.casa = casa
        this.carregandoCasa = false
        this.cdr.markForCheck()
      },
      error: () => {
        this.erroCasa = 'Não foi possível carregar sua casa agora.'
        this.carregandoCasa = false
        this.cdr.markForCheck()
      }
    })
  }

  /** Roda uma ação da casa tratando "ocupado", erro do servidor e o novo estado da casa. */
  private executar(acao: Observable<unknown>, aoConcluir?: () => void) {
    if (this.ocupado) return
    this.ocupado = true
    this.erroCasa = ''

    acao.subscribe({
      next: (resultado) => {
        this.ocupado = false
        aoConcluir?.()
        this.casa = (resultado as Casa | null)?.id ? (resultado as Casa) : null
        this.cdr.markForCheck()
      },
      error: (err) => {
        this.ocupado = false
        this.erroCasa = err.error?.error || 'Não foi possível concluir. Tente novamente.'
        this.cdr.markForCheck()
      }
    })
  }

  criarCasa() {
    this.executar(this.casaService.criar(this.nomeNovaCasa.trim() || undefined), () => this.nomeNovaCasa = '')
  }

  entrarNaCasa() {
    const codigo = this.codigoConvite.trim()
    if (!codigo) {
      this.erroCasa = 'Digite o código que você recebeu.'
      return
    }
    this.executar(this.casaService.entrar(codigo), () => this.codigoConvite = '')
  }

  sairDaCasa() {
    if (!confirm('Sair da casa? Você leva o que cadastrou, mas deixa de ver os itens dos outros moradores.')) return
    this.executar(this.casaService.sair())
  }

  renovarCodigo() {
    if (!confirm('Gerar um novo código? O código atual deixa de funcionar pra quem ainda não entrou.')) return
    this.executar(this.casaService.renovarCodigo())
  }

  removerMorador(morador: MoradorCasa) {
    if (!confirm(`Remover ${morador.nome} da casa?`)) return
    this.executar(this.casaService.removerMorador(morador.id))
  }

  async copiarCodigo() {
    if (!this.casa) return
    await this.copiar(this.casa.codigo)
  }

  async compartilhar() {
    if (!this.casa) return

    const texto = `Entra na nossa casa no Gelabem! Crie sua conta em ${window.location.origin} e, em Minha conta > Minha casa, use o código ${this.casa.codigo}.`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gelabem', text: texto })
      } catch {
        // o usuário fechou a folha de compartilhamento: nada a fazer
      }
      return
    }
    await this.copiar(texto)
  }

  private async copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      this.copiado = true
      this.cdr.markForCheck()
      clearTimeout(this.timerCopiado)
      this.timerCopiado = setTimeout(() => {
        this.copiado = false
        this.cdr.markForCheck()
      }, 2000)
    } catch {
      this.erroCasa = 'Não conseguimos copiar automaticamente. Anote o código acima.'
      this.cdr.markForCheck()
    }
  }

  sugerirMelhoria() {
    this.feedbackService.abrir()
  }

  sair() {
    this.loginService.logout()
    this.router.navigate(['/login'])
  }

  goBack() {
    this.router.navigate(['/home'])
  }
}
