// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

// A inicialização agora é feita diretamente na Server Action para garantir o acesso
// às variáveis de ambiente no ambiente serverless da Vercel.
// Este arquivo é mantido para exportar a instância do admin, caso seja usada em outros locais no futuro.

export { admin };
