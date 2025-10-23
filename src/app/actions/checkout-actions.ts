// src/app/actions/checkout-actions.ts
'use server';

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

interface PaymentInput {
    userId: string;
    userName: string;
    userEmail: string;
    userDocument: string; // taxId (CPF)
    userPhone: string; // cellphone
    amount: number;
}

interface PaymentOutput {
    paymentId?: string; // ID da transação (ex: pix_char_123456)
    qrCode?: string; // Mapeado de brCodeBase64
    pixCode?: string; // Mapeado de brCode
    error?: string;
}

interface StatusOutput {
    status?: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELED';
    error?: string;
}

function initializeAdminApp() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida para atualizar o status do usuário.');
    }

    try {
        const serviceAccountJson = JSON.parse(serviceAccountKey);
        if (serviceAccountJson.private_key) {
            serviceAccountJson.private_key = serviceAccountJson.private_key.replace(/\\n/g, '\n');
        }

        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJson),
        });
    } catch (error: any) {
        console.error("Falha crítica ao inicializar o Firebase Admin SDK:", error.message);
        throw new Error("Erro de parsing na chave de serviço do Firebase.");
    }
}


/**
 * Gera um pagamento Pix com a Abacate Pay API.
 * @param input - Dados do usuário e do pagamento.
 * @returns Um objeto com o ID do pagamento, a URL do QR Code e o código Pix, ou um erro.
 */
export async function generatePixPayment(input: PaymentInput): Promise<PaymentOutput> {
    console.log("Gerando pagamento para:", input.userName);

    const apiKey = process.env.ABACATE_PAY_API_KEY;
    if (!apiKey) {
        console.error("A chave da API da Abacate Pay não está configurada.");
        return { error: 'O serviço de pagamento não está configurado corretamente.' };
    }

    if (!input.userDocument || !input.userEmail) {
        return { error: 'Documento e e-mail são obrigatórios.' };
    }
    
    const amountInCents = Math.round(input.amount * 100);

    const requestBody = {
        amount: amountInCents,
        expiresIn: 3600, // Expira em 1 hora
        description: "Assinatura NutriSmart Premium",
        customer: {
            name: input.userName,
            cellphone: input.userPhone,
            email: input.userEmail,
            taxId: input.userDocument
        },
        metadata: {
            externalId: input.userId
        }
    };

    try {
        const url = 'https://api.abacatepay.com/v1/pixQrCode/create';
        const options = {
          method: 'POST',
          headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        };
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha na comunicação com a Abacate Pay.');
        }
        const paymentDataResponse = await response.json();
        
        const paymentData = paymentDataResponse.data;

        if (!paymentData || !paymentData.brCodeBase64 || !paymentData.brCode || !paymentData.id) {
            throw new Error('A resposta da API de pagamento está incompleta.');
        }

        return {
            paymentId: paymentData.id,
            qrCode: paymentData.brCodeBase64,
            pixCode: paymentData.brCode,
        };

    } catch (error: any) {
        console.error("[generatePixPayment] Falha na Server Action:", error);
        return { error: error.message || 'Ocorreu um erro desconhecido ao gerar o pagamento.' };
    }
}


/**
 * Verifica o status de um pagamento Pix na Abacate Pay API.
 * @param paymentId - O ID da transação Pix a ser verificada.
 * @param userId - O ID do usuário para atualizar o perfil em caso de sucesso.
 * @returns Um objeto com o status do pagamento ou um erro.
 */
export async function checkPixPaymentStatus(paymentId: string, userId: string): Promise<StatusOutput> {
    const apiKey = process.env.ABACATE_PAY_API_KEY;
    if (!apiKey) {
        console.error("A chave da API da Abacate Pay não está configurada.");
        return { error: 'O serviço de pagamento não está configurado corretamente.' };
    }

    try {
        const url = `https://api.abacatepay.com/v1/pixQrCode/check/${paymentId}`;
        const options = {
          method: 'GET',
          headers: {
              Authorization: `Bearer ${apiKey}`
          }
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Route GET:${errorData.path} not found` || 'Falha ao verificar o status do pagamento.');
        }

        const statusResponse = await response.json();
        const status = statusResponse.data?.status;
        
        if (!status) {
             throw new Error('A resposta da API de status está incompleta.');
        }

        // Se o pagamento foi confirmado, atualiza o status do usuário no Firestore
        if (status === 'PAID') {
            try {
                initializeAdminApp();
                const db = getFirestore();
                const userRef = db.collection('users').doc(userId);
                
                await userRef.update({
                    subscriptionStatus: 'active'
                });
                
                console.log(`Pagamento confirmado para usuário ${userId}. Status atualizado para 'active'.`);

            } catch (dbError: any) {
                console.error(`Falha ao atualizar o status do usuário ${userId} para 'active' após o pagamento ${paymentId} ser confirmado.`, dbError);
                // Mesmo que o DB falhe, continuamos retornando o status 'PAID' para a UI,
                // mas logamos o erro crítico no servidor.
            }
        }

        return { status };

    } catch (error: any) {
        console.error(`[checkPixPaymentStatus] Falha na Server Action para o paymentId ${paymentId}:`, error);
        return { error: error.message || 'Ocorreu um erro desconhecido ao verificar o pagamento.' };
    }
}
