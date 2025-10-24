
// src/app/pro/library/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Library, BookCopy, FileText, Search } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { PlanTemplate, Guideline } from '@/types/library';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import CreatePlanTemplateModal from '@/components/pro/create-plan-template-modal';
import CreateGuidelineModal from '@/components/pro/create-guideline-modal';

const EmptyState = ({ title, description, icon: Icon, onActionClick, buttonLabel }: { title: string; description: string; icon: React.ElementType; onActionClick: () => void; buttonLabel: string; }) => (
    <div className="mt-12">
        <Card className="max-w-2xl mx-auto shadow-sm rounded-2xl animate-fade-in border-dashed" style={{ animationDelay: '150ms' }}>
            <CardHeader className="text-center p-8">
                <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-2xl font-heading">{title}</CardTitle>
                <CardDescription className="mt-2">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
                <Button onClick={onActionClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> {buttonLabel}
                </Button>
            </CardContent>
        </Card>
    </div>
);

export default function ProLibraryPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPlanModalOpen, setPlanModalOpen] = useState(false);
  const [isGuidelineModalOpen, setGuidelineModalOpen] = useState(false);

  useEffect(() => {
    if (isUserLoading || !firestore) return;
    if (!user) {
        router.push('/login');
        return;
    }
    
    if(userProfile) {
        if (userProfile.profileType !== 'professional') {
            router.push('/dashboard');
            return;
        }

        const tenantId = userProfile.tenantId;
        if (!tenantId) {
            setLoading(false);
            return;
        }

        const templatesQuery = query(collection(firestore, 'tenants', tenantId, 'plan_templates'), orderBy('name', 'asc'));
        const unsubTemplates = onSnapshot(templatesQuery, (snapshot) => {
            setPlanTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlanTemplate)));
            setLoading(false);
        }, () => setLoading(false));
        
        const guidelinesQuery = query(collection(firestore, 'tenants', tenantId, 'guidelines'), orderBy('title', 'asc'));
        const unsubGuidelines = onSnapshot(guidelinesQuery, (snapshot) => {
            setGuidelines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guideline)));
            setLoading(false);
        }, () => setLoading(false));

        return () => {
            unsubTemplates();
            unsubGuidelines();
        };
    } else if (!isUserLoading) {
        setLoading(false);
    }

  }, [user, userProfile, isUserLoading, router, firestore]);

  if (isUserLoading || loading) {
    return (
      <AppLayout user={user} userProfile={userProfile} onProfileUpdate={onProfileUpdate}>
        <div className="flex w-full h-full flex-col bg-background items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando biblioteca...</p>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
       <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8 animate-fade-in text-center">
                <h1 className="text-3xl font-bold text-foreground font-heading">Central de Recursos</h1>
                <p className="text-muted-foreground max-w-2xl mt-2 mx-auto">Crie e gerencie seus modelos de planos e orientações para reutilizar com seus pacientes.</p>
            </div>

            <Tabs defaultValue="plans" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="plans">
                        <BookCopy className="mr-2 h-4 w-4" />
                        Modelos de Plano ({planTemplates.length})
                    </TabsTrigger>
                    <TabsTrigger value="guidelines">
                        <FileText className="mr-2 h-4 w-4" />
                        Orientações ({guidelines.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="plans">
                    {planTemplates.length === 0 && !loading ? (
                        <EmptyState 
                            title="Nenhum Modelo de Plano"
                            description='Crie seu primeiro modelo de plano alimentar para agilizar seu trabalho.'
                            icon={BookCopy}
                            onActionClick={() => setPlanModalOpen(true)}
                            buttonLabel="Criar Modelo de Plano"
                        />
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Seus Modelos de Plano</CardTitle>
                                <CardDescription>Modelos salvos para aplicar rapidamente aos seus pacientes.</CardDescription>
                                <div className="pt-4">
                                     <Button onClick={() => setPlanModalOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Novo Modelo de Plano
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {planTemplates.map(template => (
                                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{template.name}</CardTitle>
                                            <CardDescription className="truncate">{template.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm font-semibold text-primary">{template.calorieGoal} kcal</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="guidelines">
                     {guidelines.length === 0 && !loading ? (
                        <EmptyState 
                            title="Nenhuma Orientação Salva"
                            description='Crie sua primeira orientação (ex: lista de compras, dicas) para reutilizá-la facilmente.'
                            icon={FileText}
                            onActionClick={() => setGuidelineModalOpen(true)}
                            buttonLabel="Criar Orientação"
                        />
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Suas Orientações</CardTitle>
                                <CardDescription>Textos reutilizáveis para enviar aos seus pacientes.</CardDescription>
                                 <div className="pt-4">
                                     <Button onClick={() => setGuidelineModalOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Nova Orientação
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {guidelines.map(guideline => (
                                     <Card key={guideline.id} className="hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{guideline.title}</CardTitle>
                                            <CardDescription className="line-clamp-3">{guideline.content}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
       </div>

       {userProfile?.tenantId && (
         <>
            <CreatePlanTemplateModal 
                isOpen={isPlanModalOpen}
                onOpenChange={setPlanModalOpen}
                tenantId={userProfile.tenantId}
            />
            <CreateGuidelineModal
                isOpen={isGuidelineModalOpen}
                onOpenChange={setGuidelineModalOpen}
                tenantId={userProfile.tenantId}
            />
         </>
       )}
    </AppLayout>
  );
}

    