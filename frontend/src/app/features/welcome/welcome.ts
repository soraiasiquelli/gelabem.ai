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
    // Gera as partículas
    const container = document.getElementById('particles');
    if (container) {
      for (let i = 0; i < 28; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 4 + 2;
        p.style.cssText = `
          width:${size}px; height:${size}px;
          left:${Math.random() * 100}%;
          animation-duration:${Math.random() * 6 + 5}s;
          animation-delay:${Math.random() * 4}s;
          opacity:0;
        `;
        container.appendChild(p);
      }
    }

    // Fade out e navega para /login
    setTimeout(() => {
      document.getElementById('splash')?.classList.add('hide');
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 800); // espera o fade terminar
    }, 2800);
  }
}