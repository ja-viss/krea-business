'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Database, 
    Table as TableIcon, 
    Search, 
    Code2, 
    Play, 
    RefreshCcw, 
    Save, 
    Eye, 
    ShieldAlert,
    Zap,
    Loader2,
    Terminal,
    Cpu,
    Activity,
    LayoutGrid,
    List,
    Settings2,
    X,
    ChevronDown,
    Filter,
    ChevronLeft,
    Copy,
    ArrowRight,
    HardDrive,
    Cloud,
    Trash2,
    Edit3,
    Unlock,
    Lock,
    Maximize2,
    Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

// Utilidad para aplanar objetos anidados
function flattenObject(obj: any, prefix = ''): any {
    if (!obj || typeof obj !== 'object') return { [prefix]: obj };
    
    return Object.keys(obj).reduce((acc: any, k: string) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (
            typeof obj[k] === 'object' && 
            obj[k] !== null && 
            !Array.isArray(obj[k]) && 
            !(obj[k] instanceof Date) &&
            !(k === '_id')
        ) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

export default function DataStudioPage() {
    const { toast } = useToast();
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState('SYSTEM_MASTER');
    const [collections, setCollections] = useState<any[]>([]);
    const [selectedCol, setSelectedCol] = useState('');
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [serverInfo, setServerInfo] = useState<any>(null);
    const [dbStats, setDbStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    
    // UI State
    const [isReadOnly, setIsReadOnly] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
    const [mobileStep, setMobileStep] = useState<'stores' | 'collections' | 'data'>('stores');
    const [queryFilter, setQueryFilter] = useState('{}');
    const [editingDoc, setEditingDoc] = useState<any>(null);
    const [jsonEditorContent, setJsonEditorContent] = useState('');
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

    // Provision Form State
    const [isProvisionOpen, setIsProvisionOpen] = useState(false);
    const [provisioning, setProvisioning] = useState(false);
    const [provisionForm, setProvisionForm] = useState({
        atlasUri: '',
        user: '',
        password: '',
        dbName: '',
        collectionName: 'config_init'
    });

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
            setDbStats(null);
        } catch (e) {}
    };

    const fetchSpaceStats = async () => {
        setLoadingStats(true);
        try {
            const res = await fetch(`/api/admin/db/stats?storeId=${selectedStoreId}`);
            const data = await res.json();
            setDbStats(data);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron obtener estadísticas de espacio." });
        } finally {
            setLoadingStats(false);
        }
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
            if (window.innerWidth < 1024) setMobileStep('data');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error de Consulta", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!window.confirm("¿Está seguro de eliminar este registro permanentemente de la base de datos?")) return;
        
        try {
            const res = await fetch('/api/admin/db/document', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: selectedStoreId,
                    collectionName: selectedCol,
                    documentId: docId,
                    userId: localStorage.getItem('userId'),
                    userName: localStorage.getItem('userName')
                })
            });
            
            if (!res.ok) throw new Error("Fallo al eliminar");
            
            toast({ title: "Registro Purgado", description: "El documento ha sido eliminado físicamente." });
            setEditingDoc(null);
            runQuery();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        }
    };

    const handleSaveDocument = async () => {
        if (!jsonEditorContent.trim()) return;
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

    const flattenedDocs = useMemo(() => documents.map(doc => flattenObject(doc)), [documents]);
    
    const allHeaders = useMemo(() => {
        const keys = new Set<string>();
        flattenedDocs.forEach(doc => {
            Object.keys(doc).forEach(k => keys.add(k));
        });
        return Array.from(keys).sort((a, b) => {
            if (a === '_id') return -1;
            if (b === '_id') return 1;
            return a.localeCompare(b);
        });
    }, [flattenedDocs]);

    const visibleHeaders = allHeaders.filter(h => !hiddenColumns.has(h));

    const toggleColumn = (header: string) => {
        const next = new Set(hiddenColumns);
        if (next.has(header)) next.delete(header);
        else next.add(header);
        setHiddenColumns(next);
    };

    const formatCellValue = (val: any) => {
        if (val === null || val === undefined) return '-';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) return new Date(val).toLocaleDateString();
        if (Array.isArray(val)) return `[${val.length} items]`;
        if (typeof val === 'object') return '{...}';
        return String(val);
    };

    return (
        <div className="flex flex-1 flex-col h-screen overflow-hidden bg-slate-50/30">
            <main className="flex-1 flex flex-col p-4 md:p-8 space-y-6">
                <PageHeader 
                    title="Data Studio" 
                    description="Ingeniería de datos e infraestructura MongoDB."
                    className="hidden lg:flex"
                    actions={
                        <div className='flex gap-3'>
                            <Button 
                                variant="outline" 
                                className="font-black text-[11px] uppercase h-11 border-2 bg-white"
                                onClick={() => setIsProvisionOpen(true)}
                            >
                                <Cloud className="mr-2 h-4 w-4 text-primary" /> Provisionar Atlas
                            </Button>
                            <Button 
                                variant={isReadOnly ? "secondary" : "destructive"} 
                                className="font-black text-[11px] uppercase h-11 px-8 transition-all shadow-md"
                                onClick={() => setIsReadOnly(!isReadOnly)}
                            >
                                {isReadOnly ? <Unlock className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                {isReadOnly ? 'Habilitar Escritura' : 'Bloquear Edición'}
                            </Button>
                        </div>
                    }
                />

                {/* NAVEGACIÓN MÓVIL (BREADCRUMBS) */}
                <div className="lg:hidden flex items-center gap-3 overflow-x-auto pb-4 pt-2 no-scrollbar">
                    <Button 
                        variant={mobileStep === 'stores' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setMobileStep('stores')}
                        className="text-[10px] font-black uppercase rounded-full h-10 px-5 shrink-0"
                    >
                        1. Infraestructura
                    </Button>
                    <ArrowRight className="h-4 w-4 opacity-20 shrink-0" />
                    <Button 
                        variant={mobileStep === 'collections' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setMobileStep('collections')}
                        className="text-[10px] font-black uppercase rounded-full h-10 px-5 shrink-0"
                        disabled={!selectedStoreId}
                    >
                        2. Esquemas
                    </Button>
                    <ArrowRight className="h-4 w-4 opacity-20 shrink-0" />
                    <Button 
                        variant={mobileStep === 'data' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setMobileStep('data')}
                        className="text-[10px] font-black uppercase rounded-full h-10 px-5 shrink-0"
                        disabled={!selectedCol}
                    >
                        3. Datos
                    </Button>
                </div>

                <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                    
                    {/* PANEL IZQUIERDO: SELECCIÓN */}
                    <Card className={cn(
                        "col-span-12 lg:col-span-3 border-2 flex flex-col shadow-2xl overflow-hidden bg-white transition-all rounded-2xl",
                        mobileStep !== 'stores' && mobileStep !== 'collections' ? "hidden lg:flex" : "flex"
                    )}>
                        <CardHeader className="bg-muted/10 border-b p-5">
                            {mobileStep === 'stores' || !selectedCol ? (
                                <div className="space-y-4">
                                    <Label className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2">
                                        <Database className="h-3 w-3" /> Selección de Nodo
                                    </Label>
                                    <Select value={selectedStoreId} onValueChange={(val) => {
                                        setSelectedStoreId(val);
                                        fetchCollections(val);
                                        if (window.innerWidth < 1024) setMobileStep('collections');
                                    }}>
                                        <SelectTrigger className="font-bold h-12 border-2 shadow-sm bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-2">
                                            <SelectItem value="SYSTEM_MASTER" className='font-black uppercase text-[11px]'>★ Nucleo Maestro</SelectItem>
                                            {stores.map(s => (
                                                <SelectItem key={s._id} value={s._id} className='font-bold uppercase text-[11px] py-2'>🏢 {s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase w-full justify-start" onClick={() => setMobileStep('stores')}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Cambiar de Empresa
                                </Button>
                            )}
                        </CardHeader>
                        
                        <CardContent className={cn(
                            "p-0 flex-1 overflow-y-auto",
                            mobileStep === 'stores' && "hidden lg:block"
                        )}>
                            <div className='p-4 border-b bg-muted/5 flex items-center justify-between sticky top-0 bg-white z-10'>
                                <span className="text-[10px] font-black uppercase opacity-60">Esquemas Detectados</span>
                                <Badge variant="secondary" className='text-[10px] font-black px-2'>{collections.length}</Badge>
                            </div>
                            <div className="flex flex-col">
                                {collections.map(col => (
                                    <button
                                        key={col.name}
                                        className={cn(
                                            "flex items-center justify-between p-5 border-b text-left transition-all hover:bg-primary/[0.03] group",
                                            selectedCol === col.name ? "bg-primary text-white font-black shadow-inner" : ""
                                        )}
                                        onClick={() => {
                                            setSelectedCol(col.name);
                                            setHiddenColumns(new Set());
                                            setTimeout(runQuery, 100);
                                        }}
                                    >
                                        <div className='flex items-center gap-4'>
                                            <Layers className={cn("h-4 w-4 shrink-0", selectedCol === col.name ? "text-white" : "text-primary")} />
                                            <span className="text-xs uppercase font-bold truncate max-w-[180px]">{col.name}</span>
                                        </div>
                                        <Badge className={cn("text-[10px] border-none font-black", selectedCol === col.name ? "bg-white/20 text-white" : "bg-muted")}>
                                            {col.count}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ÁREA DE TRABAJO PRINCIPAL */}
                    <div className={cn(
                        "col-span-12 lg:col-span-9 flex flex-col gap-6 min-h-0",
                        mobileStep !== 'data' ? "hidden lg:flex" : "flex"
                    )}>
                        
                        {/* CONSOLA DE CONSULTA */}
                        <Card className='border-2 shadow-xl overflow-hidden bg-white rounded-2xl'>
                            <div className='bg-slate-900 p-3 px-6 flex items-center justify-between'>
                                <div className='flex items-center gap-3 text-white'>
                                    <Terminal className='h-5 w-5 text-primary' />
                                    <span className='text-[11px] font-black uppercase italic tracking-widest'>Core Engine Query</span>
                                </div>
                                <div className='flex items-center gap-3'>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 text-[9px] font-black uppercase text-white hover:bg-white/10"
                                        onClick={fetchSpaceStats}
                                        disabled={loadingStats}
                                    >
                                        {loadingStats ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <HardDrive className="mr-1 h-4 w-4" />} 
                                        DB Space
                                    </Button>
                                    <Separator orientation="vertical" className="h-4 bg-white/20" />
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-white hover:bg-white/10">
                                                <Settings2 className="mr-1 h-4 w-4" /> Filtros
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[320px] md:w-[450px] p-6 border-4 z-[120] rounded-2xl shadow-3xl">
                                            <Label className="text-[11px] font-black uppercase mb-3 block text-primary">Criterio JSON de Búsqueda</Label>
                                            <Textarea 
                                                value={queryFilter} 
                                                onChange={e => setQueryFilter(e.target.value)}
                                                className="font-mono text-[13px] h-48 mb-6 border-2 rounded-xl bg-slate-50"
                                                placeholder='{"status": "Active"}'
                                            />
                                            <Button onClick={runQuery} className="w-full h-12 font-black uppercase text-sm shadow-xl">Actualizar Resultados</Button>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <CardContent className='p-4 flex flex-col gap-4'>
                                {dbStats && (
                                    <div className="flex flex-wrap gap-3 animate-in slide-in-from-top-2">
                                        <Badge variant="secondary" className="text-[10px] font-black uppercase bg-primary/10 text-primary py-1 px-3 border-none">📦 Data: {dbStats.dataSize} MB</Badge>
                                        <Badge variant="secondary" className="text-[10px] font-black uppercase bg-blue-50 text-blue-700 py-1 px-3 border-none">🔍 Índices: {dbStats.indexSize} MB</Badge>
                                        <Badge variant="secondary" className="text-[10px] font-black uppercase bg-slate-100 py-1 px-3 border-none italic">📄 {dbStats.documents} Documentos</Badge>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setDbStats(null)}><X className="h-4 w-4" /></Button>
                                    </div>
                                )}
                                <div className='flex gap-3'>
                                    <div className='relative flex-1 group'>
                                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary' />
                                        <Input 
                                            className='pl-11 font-mono text-sm h-14 bg-muted/20 border-2 rounded-xl transition-all focus:ring-4 focus:ring-primary/10'
                                            placeholder='db.find({ ... })'
                                            value={queryFilter}
                                            onChange={e => setQueryFilter(e.target.value)}
                                        />
                                    </div>
                                    <Button onClick={runQuery} disabled={loading || !selectedCol} className='h-14 px-10 font-black uppercase shadow-2xl rounded-xl text-base'>
                                        {loading ? <Loader2 className='animate-spin' /> : <Play className='mr-2 h-5 w-5' />}
                                        EJECUTAR
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* RESULTADOS / DATA GRID */}
                        <Card className="flex-1 border-2 shadow-2xl overflow-hidden flex flex-col min-h-0 bg-white rounded-2xl">
                            <CardHeader className="bg-muted/10 border-b p-4 flex flex-row items-center justify-between">
                                <div className='flex items-center gap-3'>
                                    <div className='p-2 bg-primary/10 rounded-lg'><TableIcon className='h-5 w-5 text-primary' /></div>
                                    <CardTitle className="text-sm font-black uppercase">
                                        <span className="opacity-40">Esquema:</span> <span className="text-primary italic tracking-tight">{selectedCol || 'S/N'}</span>
                                    </CardTitle>
                                </div>
                                <div className='flex gap-2'>
                                    <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" className="h-9 w-9 rounded-lg" onClick={() => setViewMode('table')}>
                                        <LayoutGrid className="h-4 w-4" />
                                    </Button>
                                    <Button variant={viewMode === 'json' ? 'default' : 'outline'} size="icon" className="h-9 w-9 rounded-lg" onClick={() => setViewMode('json')}>
                                        <List className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 flex-1 overflow-auto bg-white relative">
                                {documents.length > 0 ? (
                                    viewMode === 'table' ? (
                                        <div className="min-w-full overflow-x-auto">
                                            <Table className="border-collapse">
                                                <TableHeader className="bg-muted/30 sticky top-0 z-20 shadow-sm">
                                                    <TableRow className="hover:bg-transparent">
                                                        {visibleHeaders.map(header => (
                                                            <TableHead key={header} className={cn(
                                                                "font-black text-[10px] uppercase py-4 border-r px-6 whitespace-nowrap bg-muted/20",
                                                                header === '_id' && "sticky left-0 bg-white z-30 shadow-[5px_0_15px_rgba(0,0,0,0.05)]"
                                                            )}>
                                                                {header}
                                                            </TableHead>
                                                        ))}
                                                        <TableHead className="sticky right-0 bg-muted/30 border-l z-30 font-black text-[10px] uppercase px-6 text-center">Gestión</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {flattenedDocs.map((doc, idx) => (
                                                        <TableRow key={doc._id || idx} className="hover:bg-primary/[0.02] border-b transition-colors">
                                                            {visibleHeaders.map(header => (
                                                                <TableCell key={header} className={cn(
                                                                    "text-[12px] font-medium border-r px-6 py-4 whitespace-nowrap truncate max-w-[250px]",
                                                                    header === '_id' && "sticky left-0 bg-white font-black text-primary z-10 shadow-[5px_0_15px_rgba(0,0,0,0.02)]"
                                                                )}>
                                                                    {formatCellValue(doc[header])}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="sticky right-0 bg-white/95 border-l z-10 p-0 shadow-[-5px_0_15px_rgba(0,0,0,0.02)]">
                                                                <div className="flex items-center h-full">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-12 flex-1 rounded-none font-black text-[10px] uppercase hover:bg-primary hover:text-white transition-all"
                                                                        onClick={() => {
                                                                            setEditingDoc(documents[idx]);
                                                                            setJsonEditorContent(JSON.stringify(documents[idx], null, 2));
                                                                        }}
                                                                    >
                                                                        {isReadOnly ? 'Inspeccionar' : 'Intervenir'}
                                                                    </Button>
                                                                    {!isReadOnly && (
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="sm" 
                                                                            className="h-12 w-12 rounded-none text-red-500 hover:bg-red-600 hover:text-white border-l animate-in fade-in zoom-in-75"
                                                                            onClick={() => handleDeleteDocument(documents[idx]._id)}
                                                                        >
                                                                            <Trash2 className="h-5 w-5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                                            {documents.map((doc, idx) => (
                                                <Card key={doc._id || idx} className="border-2 shadow-md hover:shadow-lg transition-all overflow-hidden rounded-2xl group">
                                                    <CardHeader className="bg-muted/5 p-4 flex flex-row justify-between items-center space-y-0 border-b">
                                                        <code className="text-[11px] font-black text-primary truncate max-w-[180px]">ID: {doc._id}</code>
                                                        <div className="flex gap-2">
                                                            {!isReadOnly && (
                                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:bg-red-50 animate-in zoom-in-75" onClick={() => handleDeleteDocument(doc._id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => {
                                                                setEditingDoc(doc);
                                                                setJsonEditorContent(JSON.stringify(doc, null, 2));
                                                            }}>
                                                                {isReadOnly ? <Eye className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-5">
                                                        <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap line-clamp-8 opacity-90 group-hover:opacity-100 transition-opacity">
                                                            {JSON.stringify(doc, (key, value) => key === '_id' ? undefined : value, 2)}
                                                        </pre>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 p-20 text-center">
                                        <Database className="h-24 w-24 mb-6" />
                                        <p className="text-lg font-black uppercase italic tracking-widest">Seleccione un esquema para explorar el nodo.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* MODAL PROVISIÓN ATLAS */}
            <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
                <DialogContent className="sm:max-w-[550px] border-4 rounded-3xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-3">
                            <Cloud className="h-8 w-8 text-primary" /> Provisionar en Atlas
                        </DialogTitle>
                        <DialogDescription className="font-bold text-sm">Inicializa una base de datos físicamente en un clúster remoto de MongoDB.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase text-muted-foreground">Atlas Connection URI (Host)</Label>
                            <Input 
                                placeholder="mongodb+srv://cluster0.example.mongodb.net" 
                                value={provisionForm.atlasUri}
                                onChange={e => setProvisionForm({...provisionForm, atlasUri: e.target.value})}
                                className="font-mono text-sm h-12 border-2 rounded-xl"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase text-muted-foreground">Usuario Auth</Label>
                                <Input 
                                    value={provisionForm.user}
                                    onChange={e => setProvisionForm({...provisionForm, user: e.target.value})}
                                    className="font-bold border-2 h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase text-muted-foreground">Password Auth</Label>
                                <Input 
                                    type="password"
                                    value={provisionForm.password}
                                    onChange={e => setProvisionForm({...provisionForm, password: e.target.value})}
                                    className="border-2 h-12 rounded-xl"
                                />
                            </div>
                        </div>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase text-primary">Nombre Nueva DB</Label>
                                <Input 
                                    placeholder="krea_cliente_abc" 
                                    value={provisionForm.dbName}
                                    onChange={e => setProvisionForm({...provisionForm, dbName: e.target.value})}
                                    className="font-black border-2 border-primary/20 h-12 rounded-xl shadow-inner bg-primary/5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase opacity-60">Colección Inicial</Label>
                                <Input 
                                    value={provisionForm.collectionName}
                                    onChange={e => setProvisionForm({...provisionForm, collectionName: e.target.value})}
                                    className="font-bold border-2 h-12 rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button variant="outline" onClick={() => setIsProvisionOpen(false)} className="font-bold h-14 px-8 rounded-xl">Cancelar</Button>
                        <Button onClick={() => {}} disabled={provisioning} className="font-black uppercase shadow-2xl h-14 px-12 flex-1 rounded-xl">
                            {provisioning ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                            EJECUTAR PROVISIÓN
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL EDITOR JSON INTEGRAL */}
            <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
                <DialogContent className="sm:max-w-[900px] h-[95vh] md:h-auto border-[8px] border-primary/10 overflow-hidden p-0 rounded-t-[3rem] md:rounded-[3rem] flex flex-col shadow-4xl">
                    <div className='bg-primary p-6 md:p-8 text-white shrink-0'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <DialogHeader>
                                    <DialogTitle className='text-xl md:text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4'>
                                        <Code2 className='h-8 w-8 md:h-10 md:w-10' /> Inspector Maestro
                                    </DialogTitle>
                                    <DialogDescription className='text-white/70 font-black uppercase text-[10px] md:text-[11px] tracking-[0.2em] mt-2'>
                                        Colección: {selectedCol} • ID: {editingDoc?._id}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className='flex items-center gap-6'>
                                <div className='flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/10'>
                                    <Label className='text-[11px] font-black uppercase tracking-tight text-white cursor-pointer select-none' htmlFor="modal-write-toggle">
                                        {isReadOnly ? <Lock className='h-4 w-4 inline mr-2 text-amber-400'/> : <Unlock className='h-4 w-4 inline mr-2 text-green-400'/>}
                                        Modo Escritura
                                    </Label>
                                    <Switch 
                                        id="modal-write-toggle"
                                        checked={!isReadOnly} 
                                        onCheckedChange={(checked) => setIsReadOnly(!checked)}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setEditingDoc(null)} className="text-white hover:bg-white/10 rounded-full h-12 w-12">
                                    <X className="h-8 w-8" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 md:p-8 bg-white overflow-y-auto flex-1">
                        <div className='mb-6 flex justify-between items-center'>
                            <Label className='text-[11px] font-black uppercase text-muted-foreground italic'>Contenido Crudo (BSON/JSON Safe)</Label>
                            {isReadOnly ? (
                                <Badge className='bg-slate-200 text-slate-700 font-black text-[10px] uppercase px-4 py-1'>Solo Lectura</Badge>
                            ) : (
                                <Badge className='bg-green-600 text-white font-black text-[10px] uppercase px-4 py-1 animate-pulse shadow-lg'>Escritura Habilitada</Badge>
                            )}
                        </div>
                        
                        <Textarea 
                            className="font-mono text-[13px] md:text-[15px] h-[450px] md:h-[500px] bg-slate-900 text-green-400 border-none focus:ring-0 leading-relaxed rounded-3xl p-6 md:p-10 shadow-inner resize-none custom-scrollbar"
                            value={jsonEditorContent}
                            readOnly={isReadOnly}
                            onChange={e => setJsonEditorContent(e.target.value)}
                        />
                        
                        {!isReadOnly && (
                            <div className='mt-6 p-5 md:p-6 bg-red-50 border-2 border-red-200 rounded-[2rem] flex items-start gap-5 animate-in shake-in duration-500'>
                                <div className='p-3 bg-red-600 rounded-2xl'><ShieldAlert className='h-6 w-6 text-white shrink-0' /></div>
                                <div className='space-y-1.5'>
                                    <p className='text-[11px] font-black text-red-800 uppercase tracking-wider'>Protocolo de Intervención Directa</p>
                                    <p className='text-[10px] font-bold text-red-700 leading-tight italic'>
                                        Cualquier cambio malformado puede corromper la instancia del cliente. La operación está siendo monitoreada por el sistema NOC.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="p-6 md:p-8 bg-slate-50 border-t flex flex-row justify-between items-center gap-4 shrink-0">
                        <Button variant="ghost" onClick={() => setEditingDoc(null)} className="font-black uppercase text-xs">Abandonar Inspector</Button>
                        <div className="flex gap-3">
                            {!isReadOnly && (
                                <Button 
                                    variant="outline" 
                                    className="font-black text-red-600 border-red-200 uppercase px-6 h-14 rounded-2xl hover:bg-red-50 animate-in slide-in-from-right-3"
                                    onClick={() => handleDeleteDocument(editingDoc._id)}
                                >
                                    <Trash2 className="mr-2 h-5 w-5" /> Purgar Registro
                                </Button>
                            )}
                            <Button 
                                onClick={handleSaveDocument} 
                                disabled={isReadOnly}
                                className={cn(
                                    "font-black uppercase px-12 h-14 shadow-2xl rounded-2xl transition-all text-sm",
                                    isReadOnly ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" : "bg-primary text-white scale-[1.02] hover:scale-[1.05]"
                                )}
                            >
                                <Save className="mr-2 h-5 w-5" /> Aplicar Mutación
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 20px; border: 4px solid transparent; background-clip: content-box; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}