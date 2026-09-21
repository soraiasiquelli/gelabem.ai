import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TPipe } from '../../../i18n/t.pipe';

@Component({
  selector: 'app-footer-nav',
  imports: [TPipe, RouterLink, RouterLinkActive],
  templateUrl: './footer-nav.html',
  styleUrl: './footer-nav.css',
})
export class FooterNav {
}
