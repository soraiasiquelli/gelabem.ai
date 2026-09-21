import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { LoginService } from '../../../services/auth/login.service';
import { TPipe } from '../../../i18n/t.pipe';
import { tr } from '../../../i18n/i18n.service';

const GIS_URL = 'https://accounts.google.com/gsi/client'

declare const google: any

let carregandoScript: Promise<void> | null = null

/** Carrega o Google Identity Services uma única vez. */
function carregarScriptGoogle(): Promise<void> {
  if (carregandoScript) return carregandoScript

  carregandoScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      carregandoScript = null
      reject(new Error(tr('Não foi possível carregar o login do Google.')))
    }
    document.head.appendChild(script)
  })

  return carregandoScript
}

/**
 * Botão "Continuar com Google". Só aparece quando `environment.googleClientId` está preenchido.
 * Emite `entrou` depois de a sessão já estar salva; quem usa decide pra onde navegar.
 */
@Component({
  selector: 'app-google-login',
  imports: [TPipe, ],
  templateUrl: './google-login.html',
  styleUrl: './google-login.css',
})
export class GoogleLogin implements AfterViewInit {

  @ViewChild('botao') botao?: ElementRef<HTMLDivElement>

  /** `novo` = a conta foi criada agora (vai pro onboarding) */
  @Output() entrou = new EventEmitter<{ novo: boolean }>()
  @Output() erro = new EventEmitter<string>()

  habilitado = !!environment.googleClientId
  entrando = false

  constructor(private loginService: LoginService, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    if (!this.habilitado) return

    carregarScriptGoogle()
      .then(() => {
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (resposta: { credential: string }) => this.aoReceber(resposta.credential),
        })

        const largura = Math.min(Math.max(this.botao?.nativeElement.clientWidth || 300, 200), 400)
        google.accounts.id.renderButton(this.botao!.nativeElement, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          locale: document.documentElement.lang || 'pt-BR',
          width: largura,
        })
      })
      .catch((e: Error) => this.erro.emit(e.message))
  }

  private aoReceber(credential: string) {
    this.entrando = true
    this.cdr.markForCheck()

    this.loginService.loginGoogle(credential).subscribe({
      next: (res) => {
        this.loginService.salvarSessao(res)
        this.entrando = false
        this.entrou.emit({ novo: res.novo })
      },
      error: (err) => {
        this.entrando = false
        this.erro.emit(err.error?.error || tr('Não foi possível entrar com o Google. Tente novamente.'))
        this.cdr.markForCheck()
      }
    })
  }
}
