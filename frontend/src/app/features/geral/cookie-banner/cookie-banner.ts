import { Component, inject } from '@angular/core';
import { Analytics } from '../../../analytics/analytics.service';
import { TPipe } from '../../../i18n/t.pipe';

// Aviso de cookies de análise (LGPD). Aparece uma vez; a escolha pode ser mudada no Perfil.
@Component({
  selector: 'app-cookie-banner',
  imports: [TPipe],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.css',
})
export class CookieBanner {
  analytics = inject(Analytics)
}
