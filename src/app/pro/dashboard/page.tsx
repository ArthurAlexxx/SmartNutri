
// src/app/pro/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, MoreHorizontal, Trash2, Building } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Tenant } from '@/types/tenant';
import AppLayout from '@/components/app-layout';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, Unsubscribe, collection, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { deleteTenant } from '@/app/actions/tenant-actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function ProDashboardPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    if (isUserLoading || !firestore) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (userProfile) {
        if (userProfile.profileType !== 'professional') {
            router.push('/dashboard');
            return;
        }

        const isSuperAdmin = userProfile.role === 'super-admin';

        let unsubRooms: Unsubscribe | undefined;
        let unsubTenants: Unsubscribe | undefined;

        if (isSuperAdmin) {
            unsubTenants = onSnapshot(collection(firestore, 'tenants'), (snapshot) => {
                setAllTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
                setLoading(false);
            });
        } 
        else if (userProfile.professionalRoomIds && userProfile.professionalRoomIds.length > 0) {
          const roomsQuery = query(collection(firestore, 'rooms'), where('__name__', 'in', userProfile.professionalRoomIds));
          unsubRooms = onSnapshot(roomsQuery, (snapshot) => {
            const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
            setAllRooms(fetchedRooms);
            setLoading(false);
          });
        } else {
          setAllRooms([]);
          setLoading(false);
        }

        return () => {
          if (unsubRooms) unsubRooms();
          if (unsubTenants) unsubTenants();
        };
    }
  }, [user, userProfile, isUserLoading, router, firestore]);
  
  const handleProfileUpdate = useCallback(() => {}, []);

  const totalPatients = allRooms.length;

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    const result = await deleteTenant(tenantId);
    if (result.success) {
        toast({ title: "Tenant Deletado", description: `A clínica ${tenantName} foi removida com sucesso.` });
    } else {
        toast({ title: "Erro ao Deletar", description: result.error, variant: 'destructive' });
    }
  };

  const isSuperAdmin = userProfile?.role === 'super-admin';

  if (loading || isUserLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando painel profissional...</p>
      </div>
    );
  }

  const renderTenantAdminDashboard = () => (
    <Card>
        <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>Resumo dos seus pacientes e planos.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 flex items-center gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                    <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                    <p className="text-muted-foreground">Total de Pacientes</p>
                    <p className="text-2xl font-bold">{totalPatients}</p>
                </div>
            </div>
        </CardContent>
    </Card>
  );

  const renderSuperAdminDashboard = () => (
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5"/>Gerenciamento de Clínicas</CardTitle>
              <CardDescription>
              Visualize e gerencie todas as clínicas (tenants) ativas na plataforma.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead>Clínica</TableHead>
                      <TableHead className="hidden sm:table-cell">Status da Assinatura</TableHead>
                      <TableHead className="hidden sm:table-cell">Profissionais</TableHead>
                      <TableHead className="hidden md:table-cell">Criado em</TableHead>
                      <TableHead><span className="sr-only">Ações</span></TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {allTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                          <TableCell>
                          <div className="font-medium">{tenant.name}</div>
                          <div className="hidden text-sm text-muted-foreground md:inline">
                              ID: {tenant.id}
                          </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                          <Badge variant={tenant.subscriptionStatus === 'active' ? 'default' : 'secondary'}>{tenant.subscriptionStatus || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{tenant.professionalIds?.length || 0}</TableCell>
                          <TableCell className="hidden md:table-cell">
                          {tenant.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                          </TableCell>
                          <TableCell>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                              </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                          <Trash2 className="mr-2 h-4 w-4" /> Deletar
                                      </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Você tem CERTEZA que quer deletar o tenant "{tenant.name}"? Esta ação é irreversível e deletará a clínica e todos os seus profissionais e pacientes.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTenant(tenant.id, tenant.name)}>Confirmar</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                              </DropdownMenuContent>
                          </DropdownMenu>
                          </TableCell>
                      </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
  );

  return (
    <AppLayout
        user={user}
        userProfile={userProfile}
        onMealAdded={() => {}}
        onProfileUpdate={handleProfileUpdate}
    >
       <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8 animate-fade-in text-center">
                <h1 className="text-3xl font-bold text-foreground font-heading">
                    {isSuperAdmin ? 'Dashboard do Super Admin' : 'Dashboard do Profissional'}
                </h1>
                <p className="text-muted-foreground max-w-2xl mt-2 mx-auto">
                     {isSuperAdmin ? 'Visão geral de toda a plataforma.' : 'Visão geral das suas métricas e pacientes.'}
                </p>
            </div>
            {isSuperAdmin ? renderSuperAdminDashboard() : renderTenantAdminDashboard()}
       </div>
    </AppLayout>
  );
}

// Minimal type for Room, since we only need a few properties here
interface Room {
  id: string;
  activePlan: {
    meals: any[];
  }
}
