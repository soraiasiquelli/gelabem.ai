import { Component, OnInit} from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  imports: [],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    // Fade out e navega para /login
    setTimeout(() => {
      document.getElementById('splash')?.classList.add('hide');
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 800); // espera o fade terminar
    }, 2800);
  }
}