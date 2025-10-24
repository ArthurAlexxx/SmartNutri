
// src/app/pro/professionals/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Users, UserX, Briefcase } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import CreateProfessionalModal from '@/components/pro/create-professional-modal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function ProProfessionalsPage() {
  const { user, userProfile, isUserLoading, onProfileUpdate } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (isUserLoading || !firestore) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (userProfile) {
        if (userProfile.profileType !== 'professional' || userProfile.role !== 'admin') {
            router.push('/dashboard'); // Redirect non-admins
            return;
        }

        const professionalsQuery = query(
            collection(firestore, 'users'), 
            where('tenantId', '==', userProfile.tenantId),
            where('profileType', '==', 'professional')
        );

        const unsubProfessionals = onSnapshot(professionalsQuery, (snapshot) => {
            const fetchedProfessionals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            setProfessionals(fetchedProfessionals);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching professionals:", error);
            setLoading(false);
        });

        return () => {
          unsubProfessionals();
        };
    } else if (!isUserLoading) {
        setLoading(false);
    }
  }, [user, userProfile, isUserLoading, router, firestore]);
  
  if (loading || isUserLoading) {
    return (
       <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
      >
        <div className="flex w-full h-full flex-col bg-background items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando profissionais...</p>
        </div>
      </AppLayout>
    );
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0,2);

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
    >
       <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 animate-fade-in text-center sm:text-left gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground font-heading">Gestão de Profissionais</h1>
                    <p className="text-muted-foreground max-w-2xl mt-2 mx-auto sm:mx-0">Adicione e gerencie os profissionais da sua clínica.</p>
                </div>
                 <Button onClick={() => setModalOpen(true)} disabled={!user}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Profissional
                </Button>
            </div>

             {professionals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {professionals.map(prof => (
                        <Card key={prof.id} className="shadow-sm hover:shadow-md transition-shadow duration-300">
                           <CardContent className="p-6 flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarFallback className="text-lg bg-secondary">{getInitials(prof.fullName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-foreground truncate">{prof.fullName}</p>
                                    <p className="text-sm text-muted-foreground truncate">{prof.email}</p>
                                    <span className={`text-xs font-bold ${prof.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`}>{prof.role === 'admin' ? 'Admin' : 'Profissional'}</span>
                                </div>
                           </CardContent>
                        </Card>
                    ))}
                </div>
             ) : (
                <div className="mt-12">
                    <Card className="max-w-2xl mx-auto shadow-sm rounded-2xl animate-fade-in border-dashed" style={{animationDelay: '150ms'}}>
                        <CardHeader className="text-center p-8">
                            <UserX className="h-12 w-12 text-primary mx-auto mb-4" />
                            <CardTitle className="text-2xl font-heading">Nenhum Profissional Adicionado</CardTitle>
                            <CardDescription className="mt-2">
                                Clique em "Novo Profissional" para convidar um membro para sua equipe.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
             )}
       </div>

       {userProfile && <CreateProfessionalModal 
          isOpen={isModalOpen}
          onOpenChange={setModalOpen}
          tenantId={userProfile.tenantId}
       />}
    </AppLayout>
  );
}

    