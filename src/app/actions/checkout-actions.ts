// src/app/actions/checkout-actions.ts
'use server';

interface PaymentInput {
    userId: string;
    userName: string;
    userEmail: string;
    userDocument: string; // taxId (CPF)
    userPhone: string; // cellphone
    amount: number;
}

interface PaymentOutput {
    qrCode?: string; // Mapeado de brCodeBase64
    pixCode?: string; // Mapeado de brCode
    error?: string;
}

/**
 * Gera um pagamento Pix com a Abacate Pay API.
 * @param input - Dados do usuário e do pagamento.
 * @returns Um objeto com a URL do QR Code e o código Pix, ou um erro.
 */
export async function generatePixPayment(input: PaymentInput): Promise<PaymentOutput> {
    console.log("Gerando pagamento para:", input.userName);

    const apiKey = process.env.ABACATE_PAY_API_KEY;
    if (!apiKey) {
        console.error("A chave da API da Abacate Pay não está configurada.");
        return { error: 'O serviço de pagamento não está configurado corretamente.' };
    }

    // Validação de entrada básica
    if (!input.userDocument || !input.userEmail) {
        return { error: 'Documento e e-mail são obrigatórios.' };
    }
    
    // Converte o valor para centavos
    const amountInCents = Math.round(input.amount * 100);

    // Estrutura o corpo da requisição conforme a documentação da Abacate Pay
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

        if (!paymentData || !paymentData.brCodeBase64 || !paymentData.brCode) {
            throw new Error('A resposta da API de pagamento está incompleta.');
        }

        return {
            qrCode: paymentData.brCodeBase64,
            pixCode: paymentData.brCode,
        };

    } catch (error: any) {
        console.error("[generatePixPayment] Falha na Server Action:", error);
        return { error: error.message || 'Ocorreu um erro desconhecido ao gerar o pagamento.' };
    }
}
