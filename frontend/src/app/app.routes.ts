import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { Tela } from './features/geladeira/tela/tela';
import { TelaCriar } from './features/geladeira/tela-criar/tela-criar';
import { Welcome } from './features/welcome/welcome';
import { Login } from './features/login/login';
import { CriarConta } from './features/criar-conta/criar-conta';
import { authGuard } from './guards/auth.guard';
import { EscolherArmazenamento } from './features/escolher-armazenamento/escolher-armazenamento';
import { LerNotafiscal } from './features/ler-notafiscal/ler-notafiscal';
import { Receita } from './features/geladeira/receita/receita';
import { Receitas } from './features/receitas/receitas';
import { Assistente } from './features/assistente/assistente';
import { ListaCompras } from './features/lista-compras/lista-compras';
import { Perfil } from './features/perfil/perfil';
import { Comecar } from './features/comecar/comecar';

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
        path: 'armazenamento/:tipo/editar/:itemId',
        component: TelaCriar,
        canActivate: [authGuard]
    },
    {
        path: 'receita/:armazenamento',
        component: Receita,
        canActivate: [authGuard]
    },
    {
        path: 'receitas',
        component: Receitas,
        canActivate: [authGuard]
    },
    {
        path: 'assistente',
        component: Assistente,
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
    },
    {
        path: 'ler-nota-fiscal',
        component: LerNotafiscal,
        canActivate: [authGuard]
    },
    {
        path: 'lista-compras',
        component: ListaCompras,
        canActivate: [authGuard]
    },
    {
        path: 'perfil',
        component: Perfil,
        canActivate: [authGuard]
    },
    {
        path: 'comecar',
        component: Comecar,
        canActivate: [authGuard]
    }
];
