import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FooterNav } from './features/geral/footer-nav/footer-nav';

const ROTAS_SEM_FOOTER = ['/', '/login', '/criar-conta', '/escolher-armazenamento', '/planos'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterNav],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  mostrarFooter = signal(false);

  constructor(private router: Router) {
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
