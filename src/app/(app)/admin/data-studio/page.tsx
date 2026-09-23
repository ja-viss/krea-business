
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Database, 
    Server, 
    Table as TableIcon, 
    Search, 
    Code2, 
    Play, 
    RefreshCcw, 
    Trash2, 
    Save, 
    Eye, 
    EyeOff,
    Zap,
    Loader2,
    Settings2,
    ChevronRight,
    Terminal,
    ShieldAlert,
    Cpu,
    Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function DataStudioPage() {
    const { toast } = useToast();
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState('SYSTEM_MASTER');
    const [collections, setCollections] = useState<any[]>([]);
    const [selectedCol, setSelectedCol] = useState('');
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [serverInfo, setServerInfo] = useState<any>(null);
    
    // Editor State
    const [isReadOnly, setIsReadOnly] = useState(true);
    const [queryFilter, setQueryFilter] = useState('{}');
    const [editingDoc, setEditingDoc] = useState<any>(null);
    const [jsonEditorContent, setJsonEditorContent] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const storesRes = await fetch('/api/admin/stores');
            const storesData = await storesRes.json();
            setStores(storesData);

            await fetchCollections(selectedStoreId);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo cargar el Data Studio." });
        } finally {
            setLoading(false);
        }
    };

    const fetchCollections = async (storeId: string) => {
        try {
            const res = await fetch(`/api/admin/db/collections?storeId=${storeId}`);
            const data = await res.json();
            setCollections(data.collections || []);
            setServerInfo(data.serverInfo);
            setSelectedCol('');
            setDocuments([]);
        } catch (e) {}
    };

    useEffect(() => {
        fetchData();
    }, []);

    const runQuery = async () => {
        if (!selectedCol) return;
        setLoading(true);
        try {
            let filterObj = {};
            try { filterObj = JSON.parse(queryFilter); } catch (e) { throw new Error("JSON de filtro inválido"); }

            const res = await fetch('/api/admin/db/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: selectedStoreId,
                    collectionName: selectedCol,
                    filter: filterObj
                })
            });
            const data = await res.json();
            setDocuments(data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error de Consulta", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDocument = async () => {
        try {
            const updatedData = JSON.parse(jsonEditorContent);
            const res = await fetch('/api/admin/db/document', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: selectedStoreId,
                    collectionName: selectedCol,
                    documentId: editingDoc._id,
                    updateData: updatedData,
                    userId: localStorage.getItem('userId'),
                    userName: localStorage.getItem('userName')
                })
            });
            if (!res.ok) throw new Error("Fallo al actualizar");
            
            toast({ title: "Documento Actualizado", description: "El cambio ha sido auditado y guardado." });
            setEditingDoc(null);
            runQuery();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error JSON", description: e.message });
        }
    };

    return (
        <div className="flex flex-1 flex-col h-screen overflow-hidden">
            <main className="flex-1 flex flex-col p-4 md:p-6 space-y-4">
                <PageHeader 
                    title="Data Studio & Monitor" 
                    description="Explorador de infraestructura y motor de depuración de registros."
                    actions={
                        <div className='flex gap-2'>
                            <Button 
                                variant={isReadOnly ? "secondary" : "destructive"} 
                                className="font-black text-[10px] uppercase h-11"
                                onClick={() => setIsReadOnly(!isReadOnly)}
                            >
                                {isReadOnly ? <Eye className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                {isReadOnly ? 'Modo Lectura' : 'Modo Escritura'}
                            </Button>
                            <Button variant="outline" onClick={fetchData} disabled={loading} className='h-11'>
                                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    }
                />

                <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                    
                    {/* COLUMNA IZQUIERDA: CONTEXTO Y COLECCIONES */}
                    <Card className="col-span-12 lg:col-span-3 border-2 flex flex-col shadow-xl">
                        <CardHeader className="bg-muted/30 border-b py-4">
                            <Label className="text-[10px] font-black uppercase mb-2 block">Contexto de Infraestructura</Label>
                            <Select value={selectedStoreId} onValueChange={(val) => {
                                setSelectedStoreId(val);
                                fetchCollections(val);
                            }}>
                                <SelectTrigger className="font-bold h-11 border-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SYSTEM_MASTER" className='font-black uppercase text-[10px]'>★ Nucleo Maestra</SelectItem>
                                    {stores.map(s => (
                                        <SelectItem key={s._id} value={s._id} className='font-bold uppercase text-[10px]'>🏢 {s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-y-auto">
                            <div className='p-3 border-b bg-muted/10'>
                                <span className="text-[9px] font-black uppercase opacity-40">Esquemas Detectados</span>
                            </div>
                            <div className="flex flex-col">
                                {collections.map(col => (
                                    <button
                                        key={col.name}
                                        className={cn(
                                            "flex items-center justify-between p-4 border-b text-left transition-colors hover:bg-primary/5",
                                            selectedCol === col.name ? "bg-primary text-white font-black" : ""
                                        )}
                                        onClick={() => {
                                            setSelectedCol(col.name);
                                            // Auto-run query on click
                                            setTimeout(runQuery, 100);
                                        }}
                                    >
                                        <div className='flex items-center gap-3'>
                                            <TableIcon className={cn("h-4 w-4", selectedCol === col.name ? "text-white" : "text-primary")} />
                                            <span className="text-xs uppercase tracking-tight">{col.name}</span>
                                        </div>
                                        <Badge variant="outline" className={cn("text-[9px] border-none", selectedCol === col.name ? "text-white opacity-70" : "bg-muted")}>
                                            {col.count}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ÁREA DE TRABAJO CENTRAL */}
                    <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 min-h-0">
                        
                        {/* QUERY RUNNER */}
                        <Card className='border-2 shadow-sm overflow-hidden'>
                            <div className='bg-black p-2 px-4 flex items-center justify-between'>
                                <div className='flex items-center gap-2 text-white'>
                                    <Terminal className='h-4 w-4 text-primary' />
                                    <span className='text-[10px] font-black uppercase italic'>Mongo Query Console</span>
                                </div>
                                <div className='flex items-center gap-2'>
                                    <Badge variant="outline" className='text-[8px] border-white/20 text-white/50 uppercase font-mono'>db.collection.find()</Badge>
                                </div>
                            </div>
                            <CardContent className='p-3 flex gap-3'>
                                <div className='relative flex-1'>
                                    <Code2 className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                                    <Input 
                                        className='pl-9 font-mono text-xs h-11 bg-muted/30 border-2 focus:ring-primary'
                                        placeholder='{"status": "Active"}'
                                        value={queryFilter}
                                        onChange={e => setQueryFilter(e.target.value)}
                                    />
                                </div>
                                <Button onClick={runQuery} disabled={loading || !selectedCol} className='h-11 px-6 font-black uppercase shadow-lg shadow-primary/20'>
                                    {loading ? <Loader2 className='animate-spin' /> : <Play className='mr-2 h-4 w-4' />}
                                    Ejecutar
                                </Button>
                            </CardContent>
                        </Card>

                        {/* RESULTADOS / DATA GRID */}
                        <Card className="flex-1 border-2 shadow-xl overflow-hidden flex flex-col min-h-0">
                            <CardHeader className="bg-muted/10 border-b py-3 flex flex-row items-center justify-between">
                                <div className='flex items-center gap-2'>
                                    <Search className='h-4 w-4 text-primary' />
                                    <CardTitle className="text-sm font-black uppercase">Documentos: {selectedCol || 'Seleccione colección'}</CardTitle>
                                </div>
                                {documents.length > 0 && (
                                    <Badge variant="secondary" className='text-[9px] font-black uppercase'>{documents.length} Resultados</Badge>
                                )}
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto bg-[#fafafa]">
                                {documents.length > 0 ? (
                                    <div className="divide-y">
                                        {documents.map((doc, idx) => (
                                            <div key={doc._id} className="p-4 hover:bg-white transition-colors group relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-mono text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                                                        _id: {doc._id}
                                                    </span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => {
                                                            setEditingDoc(doc);
                                                            setJsonEditorContent(JSON.stringify(doc, null, 2));
                                                        }}
                                                    >
                                                        {isReadOnly ? 'Ver JSON' : 'Editar Documento'}
                                                    </Button>
                                                </div>
                                                <pre className="text-[11px] font-mono whitespace-pre-wrap line-clamp-3 opacity-80 overflow-hidden">
                                                    {JSON.stringify(doc, (key, value) => key === '_id' ? undefined : value)}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30">
                                        <Database className="h-16 w-16 mb-4" />
                                        <p className="text-sm font-black uppercase italic">Esperando instrucción de consulta...</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* MONITOR DE SALUD (FOOTER) */}
                        {serverInfo && (
                            <div className='grid grid-cols-4 gap-4'>
                                <Card className='p-3 border-2 shadow-sm bg-black text-white'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Cpu className='h-3 w-3 text-primary'/><span className='text-[8px] font-black uppercase opacity-60'>Memoria RAM</span></div>
                                        <span className='text-xs font-black'>{serverInfo.mem?.resident || 0}MB</span>
                                    </div>
                                </Card>
                                <Card className='p-3 border-2 shadow-sm'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Activity className='h-3 w-3 text-green-500'/><span className='text-[8px] font-black uppercase opacity-60'>Conexiones</span></div>
                                        <span className='text-xs font-black'>{serverInfo.connections?.current || 0}</span>
                                    </div>
                                </Card>
                                <Card className='p-3 border-2 shadow-sm'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Zap className='h-3 w-3 text-amber-500'/><span className='text-[8px] font-black uppercase opacity-60'>Uptime</span></div>
                                        <span className='text-xs font-black'>{Math.floor(serverInfo.uptime / 3600)}h</span>
                                    </div>
                                </Card>
                                <Card className='p-3 border-2 shadow-sm'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Database className='h-3 w-3 text-primary'/><span className='text-[8px] font-black uppercase opacity-60'>Versión DB</span></div>
                                        <span className='text-xs font-black'>{serverInfo.version || 'Atlas'}</span>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL EDITOR JSON */}
            <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
                <DialogContent className="sm:max-w-[700px] border-4 overflow-hidden p-0">
                    <DialogHeader className='p-6 bg-muted/20 border-b'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <DialogTitle className='text-xl font-black uppercase italic'>Editor Maestro de Documento</DialogTitle>
                                <DialogDescription className='font-bold uppercase text-[10px]'>ID: {editingDoc?._id}</DialogDescription>
                            </div>
                            {isReadOnly && <Badge className='bg-amber-500 text-white font-black text-[9px]'>VISTA PROTEGIDA</Badge>}
                        </div>
                    </DialogHeader>
                    <div className="p-6">
                        <Textarea 
                            className="font-mono text-[12px] h-[400px] bg-black text-green-400 border-2 border-primary/20 focus:ring-0 leading-relaxed"
                            value={jsonEditorContent}
                            readOnly={isReadOnly}
                            onChange={e => setJsonEditorContent(e.target.value)}
                        />
                        {!isReadOnly && (
                            <div className='mt-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3'>
                                <ShieldAlert className='h-5 w-5 text-red-600 shrink-0' />
                                <p className='text-[10px] font-bold text-red-800 uppercase leading-tight'>
                                    ADVERTENCIA: Estás a punto de modificar un registro directamente en producción. Esta acción quedará vinculada a tu identidad y será inmutable en el log de auditoría.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="p-6 bg-muted/10 border-t">
                        <Button variant="ghost" onClick={() => setEditingDoc(null)} className="font-bold uppercase">Cerrar</Button>
                        {!isReadOnly && (
                            <Button onClick={handleSaveDocument} className="font-black uppercase px-8 shadow-xl bg-primary">
                                <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
