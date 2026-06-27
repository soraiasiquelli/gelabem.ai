import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-footer-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './footer-nav.html',
  styleUrl: './footer-nav.css',
})
export class FooterNav {
}
