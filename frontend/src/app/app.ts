import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FooterNav } from './features/geral/footer-nav/footer-nav';
import { I18n } from './i18n/i18n.service';
import { FeedbackModal } from './features/geral/feedback-modal/feedback-modal';
import { CookieBanner } from './features/geral/cookie-banner/cookie-banner';
import { Analytics } from './analytics/analytics.service';

const ROTAS_SEM_FOOTER = ['/', '/login', '/criar-conta', '/escolher-armazenamento', '/planos', '/comecar'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterNav, FeedbackModal, CookieBanner],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  mostrarFooter = signal(false);

  constructor(private router: Router, _i18n: I18n, _analytics: Analytics) {
    this.atualizarFooter(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.atualizarFooter(event.urlAfterRedirects);
      }
    });
  }

  private atualizarFooter(url: string) {
    const caminho = url.split('?')[0];
    this.mostrarFooter.set(!ROTAS_SEM_FOOTER.includes(caminho));
  }
}
