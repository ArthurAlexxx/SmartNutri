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
        // --- CÓDIGO REAL DA API (COMENTADO PARA SIMULAÇÃO) ---
        // const url = 'https://api.abacatepay.com/v1/pixQrCode/create';
        // const options = {
        //   method: 'POST',
        //   headers: {
        //       Authorization: `Bearer ${apiKey}`,
        //       'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify(requestBody)
        // };
        // const response = await fetch(url, options);

        // if (!response.ok) {
        //     const errorData = await response.json();
        //     throw new Error(errorData.message || 'Falha na comunicação com a Abacate Pay.');
        // }
        // const paymentData = await response.json();
        // --- FIM DO CÓDIGO REAL ---


        // ** SIMULAÇÃO DE RESPOSTA DA API **
        await new Promise(resolve => setTimeout(resolve, 1500));
        const simulatedApiResponse = {
          data: {
            id: "pix_char_123456",
            amount: amountInCents,
            status: "PENDING",
            brCode: "00020126360014br.gov.bcb.pix0114+55119999988885204000053039865802BR5913NOME DO LOJISTA6008BRASILIA62070503***6304E2A5",
            brCodeBase64: "data:image/png;base64,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"
          },
          error: null
        };
        // ** FIM DA SIMULAÇÃO **

        const paymentData = simulatedApiResponse.data;

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
