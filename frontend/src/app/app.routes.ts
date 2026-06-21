import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { Tela } from './features/geladeira/tela/tela';
import { TelaCriar } from './features/geladeira/tela-criar/tela-criar';
import { Welcome } from './features/welcome/welcome';
import { Login } from './features/login/login';
import { CriarConta } from './features/criar-conta/criar-conta';
import { authGuard } from './guards/auth.guard';
import { EscolherArmazenamento } from './features/escolher-armazenamento/escolher-armazenamento';

export const routes: Routes = [
    {
        path: '',
        component: Welcome
    },
    {
        path: 'login',
        component: Login
    },
    {
        path: 'armazenamento/:tipo',
        component: Tela,
        canActivate:[authGuard]
    },
    {
        path: 'armazenamento/:tipo/adicionar',
        component: TelaCriar,
        canActivate: [authGuard]
    },
    {
        path: 'criar-conta',
        component: CriarConta

    },
    { path: 'escolher-armazenamento', component: EscolherArmazenamento },
    {
        path: 'home',
        component: Home,
        canActivate: [authGuard]
    }
];
