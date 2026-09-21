import { Component } from '@angular/core';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-landing-page',
  imports: [TPipe, ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPage {}
