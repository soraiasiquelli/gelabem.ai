    export interface Usuario {
    id: number;
    nome: string;
    email: string;
    senha: string;
    }

    export interface LoginRequest {
    email: string;
    senha: string;
    }