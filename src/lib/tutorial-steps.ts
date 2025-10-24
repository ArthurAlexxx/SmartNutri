// src/lib/tutorial-steps.ts
import { PopoverProps } from '@radix-ui/react-popover';

export interface TutorialStep {
  elementId: string;
  title: string;
  description: string;
  side?: PopoverProps['side'];
  path?: string;
}

export const tutorialSteps: TutorialStep[] = [
  {
    elementId: 'add-meal-button',
    title: 'Adicione sua Refeição',
    description: 'Clique aqui para registrar suas refeições e obter uma análise nutricional completa com nossa IA.',
    side: 'bottom',
    path: '/dashboard',
  },
  {
    elementId: 'nav-history',
    title: 'Veja seu Histórico',
    description: 'Acesse o histórico completo de suas refeições e consumo de água para acompanhar sua jornada.',
    side: 'right',
    path: '/history',
  },
  {
    elementId: 'nav-analysis',
    title: 'Análise com IA',
    description: 'Nesta seção (Premium), você terá acesso a gráficos detalhados e insights gerados por IA sobre seu progresso.',
    side: 'right',
    path: '/analysis',
  },
   {
    elementId: 'user-profile-button',
    title: 'Suas Configurações',
    description: 'Clique aqui para ajustar suas metas, dados pessoais, gerenciar sua assinatura e compartilhar seu perfil com um nutricionista.',
    side: 'bottom',
    path: '/analysis', // Stay on the same page for the last one
  },
];
