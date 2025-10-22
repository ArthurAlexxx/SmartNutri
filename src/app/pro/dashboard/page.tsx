
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
import { deleteTenant, deleteUserAndData } from '@/app/actions/tenant-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function ProDashboardPage() {
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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
        let unsubUsers: Unsubscribe | undefined;

        if (isSuperAdmin) {
            unsubTenants = onSnapshot(collection(firestore, 'tenants'), (snapshot) => {
                setAllTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
                setLoading(false);
            });
            unsubUsers = onSnapshot(collection(firestore, 'users'), (snapshot) => {
                setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
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
          if (unsubUsers) unsubUsers();
        };
    }
  }, [user, userProfile, isUserLoading, router, firestore]);
  
  const handleProfileUpdate = useCallback(() => {}, []);

  const totalPatients = allRooms.length;
  const activePlans = allRooms.filter(room => room.activePlan && room.activePlan.meals.length > 0).length;

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    const result = await deleteTenant(tenantId);
    if (result.success) {
        toast({ title: "Tenant Deletado", description: `A clínica ${tenantName} foi removida com sucesso.` });
    } else {
        toast({ title: "Erro ao Deletar", description: result.error, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const result = await deleteUserAndData(userId);
    if (result.success) {
      toast({ title: 'Usuário Removido', description: `O usuário ${userName} e todos os seus dados foram removidos.` });
    } else {
      toast({ title: 'Erro ao Remover', description: result.error, variant: 'destructive' });
    }
  };

  const isSuperAdmin = userProfile?.role === 'super-admin';
  const tenantMap = allTenants.reduce((acc, tenant) => {
    acc[tenant.id] = tenant.name;
    return acc;
  }, {} as Record<string, string>);

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
            {/* Outros cards podem ser adicionados aqui */}
        </CardContent>
    </Card>
  );

  const renderSuperAdminDashboard = () => (
    <Tabs defaultValue="tenants" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tenants"><Building className="mr-2 h-4 w-4"/> Clínicas (Tenants)</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4"/> Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="tenants" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento de Clínicas</CardTitle>
                    <CardDescription>
                    Visualize e gerencie todas as clínicas ativas na plataforma.
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
                                            <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Você tem CERTEZA que quer deletar o tenant "{tenant.name}"? Esta ação é irreversível e deletará a clínica, seus profissionais e pacientes.</AlertDialogDescription></AlertDialogHeader>
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
        </TabsContent>
        <TabsContent value="users" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                    <CardDescription>Visualize e gerencie todos os usuários da plataforma.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                                <TableHead className="hidden md:table-cell">Clínica (Tenant)</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allUsers.map((userItem) => (
                                <TableRow key={userItem.id}>
                                    <TableCell>
                                        <div className="font-medium">{userItem.fullName}</div>
                                        <div className="text-sm text-muted-foreground">{userItem.email}</div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <Badge variant={userItem.profileType === 'professional' ? 'secondary' : 'outline'}>
                                            {userItem.profileType === 'professional' ? 'Profissional' : 'Paciente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{tenantMap[userItem.tenantId] || userItem.tenantId}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Deletar Usuário
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Você tem certeza que quer deletar o usuário "{userItem.fullName}" e todos os seus dados? Esta ação é irreversível.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(userItem.id, userItem.fullName)}>Confirmar</AlertDialogAction></AlertDialogFooter>
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
        </TabsContent>
    </Tabs>
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
