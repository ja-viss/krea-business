
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
    Lock
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

    const handleProvisionAtlas = async () => {
        setProvisioning(true);
        try {
            const res = await fetch('/api/admin/db/provision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...provisionForm,
                    userId: localStorage.getItem('userId'),
                    userName: localStorage.getItem('userName')
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast({ title: "Atlas Provisionado", description: "Base de datos creada exitosamente." });
            setIsProvisionOpen(false);
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Fallo de Provisión", description: e.message });
        } finally {
            setProvisioning(false);
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
        <div className="flex flex-1 flex-col h-screen overflow-hidden bg-slate-50/50">
            <main className="flex-1 flex flex-col p-2 md:p-6 space-y-4">
                <PageHeader 
                    title="Data Studio" 
                    description="Gestión técnica de infraestructura y depuración MongoDB."
                    className="hidden lg:flex"
                    actions={
                        <div className='flex gap-2'>
                            <Button 
                                variant="outline" 
                                className="font-black text-[10px] uppercase h-10 border-2"
                                onClick={() => setIsProvisionOpen(true)}
                            >
                                <Cloud className="mr-2 h-4 w-4 text-primary" /> Provisionar Atlas
                            </Button>
                            <Button 
                                variant={isReadOnly ? "secondary" : "destructive"} 
                                className="font-black text-[10px] uppercase h-10 px-6 transition-all"
                                onClick={() => setIsReadOnly(!isReadOnly)}
                            >
                                {isReadOnly ? <Eye className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                {isReadOnly ? 'Solo Lectura' : 'Modo Escritura'}
                            </Button>
                        </div>
                    }
                />

                {/* MÓVIL: BOTONES DE NAVEGACIÓN STACK */}
                <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2">
                    <Button 
                        variant={mobileStep === 'stores' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setMobileStep('stores')}
                        className="text-[9px] font-black uppercase rounded-full h-8 px-4 shrink-0"
                    >
                        1. Empresa
                    </Button>
                    {selectedStoreId && (
                        <>
                            <ArrowRight className="h-3 w-3 opacity-30 shrink-0" />
                            <Button 
                                variant={mobileStep === 'collections' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => setMobileStep('collections')}
                                className="text-[9px] font-black uppercase rounded-full h-8 px-4 shrink-0"
                            >
                                2. Esquemas
                            </Button>
                        </>
                    )}
                    {selectedCol && (
                        <>
                            <ArrowRight className="h-3 w-3 opacity-30 shrink-0" />
                            <Button 
                                variant={mobileStep === 'data' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => setMobileStep('data')}
                                className="text-[9px] font-black uppercase rounded-full h-8 px-4 shrink-0"
                            >
                                3. Registros
                            </Button>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0">
                    
                    {/* PANEL IZQUIERDO: EMPRESAS Y COLECCIONES */}
                    <Card className={cn(
                        "col-span-12 lg:col-span-3 border-2 flex flex-col shadow-xl overflow-hidden bg-white transition-all",
                        mobileStep !== 'stores' && mobileStep !== 'collections' ? "hidden lg:flex" : "flex"
                    )}>
                        <CardHeader className="bg-muted/30 border-b p-3 md:p-4">
                            {mobileStep === 'stores' || !selectedCol ? (
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase opacity-40">Infraestructura</Label>
                                    <Select value={selectedStoreId} onValueChange={(val) => {
                                        setSelectedStoreId(val);
                                        fetchCollections(val);
                                        if (window.innerWidth < 1024) setMobileStep('collections');
                                    }}>
                                        <SelectTrigger className="font-bold h-11 border-2 shadow-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SYSTEM_MASTER" className='font-black uppercase text-[10px]'>★ Nucleo Maestra</SelectItem>
                                            {stores.map(s => (
                                                <SelectItem key={s._id} value={s._id} className='font-bold uppercase text-[10px]'>🏢 {s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" className="font-black text-[9px] uppercase" onClick={() => setMobileStep('stores')}>
                                    <ChevronLeft className="mr-1 h-3 w-3" /> Cambiar Empresa
                                </Button>
                            )}
                        </CardHeader>
                        
                        <CardContent className={cn(
                            "p-0 flex-1 overflow-y-auto",
                            mobileStep === 'stores' && "hidden lg:block"
                        )}>
                            <div className='p-3 border-b bg-muted/10 flex items-center justify-between sticky top-0 bg-white z-10'>
                                <span className="text-[9px] font-black uppercase opacity-40">Esquemas Detectados</span>
                                <Badge variant="outline" className='text-[8px] opacity-40'>{collections.length}</Badge>
                            </div>
                            <div className="flex flex-col">
                                {collections.map(col => (
                                    <button
                                        key={col.name}
                                        className={cn(
                                            "flex items-center justify-between p-4 border-b text-left transition-all hover:bg-primary/5 group",
                                            selectedCol === col.name ? "bg-primary text-white font-black shadow-inner" : ""
                                        )}
                                        onClick={() => {
                                            setSelectedCol(col.name);
                                            setHiddenColumns(new Set());
                                            setTimeout(runQuery, 100);
                                        }}
                                    >
                                        <div className='flex items-center gap-3'>
                                            <TableIcon className={cn("h-4 w-4 shrink-0", selectedCol === col.name ? "text-white" : "text-primary")} />
                                            <span className="text-xs uppercase tracking-tight truncate max-w-[150px]">{col.name}</span>
                                        </div>
                                        <Badge className={cn("text-[9px] border-none font-bold", selectedCol === col.name ? "bg-white/20 text-white" : "bg-muted")}>
                                            {col.count}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ÁREA DE TRABAJO CENTRAL */}
                    <div className={cn(
                        "col-span-12 lg:col-span-9 flex flex-col gap-4 min-h-0",
                        mobileStep !== 'data' ? "hidden lg:flex" : "flex"
                    )}>
                        
                        {/* QUERY RUNNER */}
                        <Card className='border-2 shadow-sm overflow-hidden bg-white'>
                            <div className='bg-black p-2 md:p-3 px-4 flex items-center justify-between'>
                                <div className='flex items-center gap-2 text-white'>
                                    <Terminal className='h-4 w-4 text-primary' />
                                    <span className='text-[9px] md:text-[10px] font-black uppercase italic tracking-widest'>Query Console</span>
                                </div>
                                <div className='flex items-center gap-2'>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 text-[8px] font-black uppercase text-primary-foreground hover:bg-white/10"
                                        onClick={fetchSpaceStats}
                                        disabled={loadingStats}
                                    >
                                        {loadingStats ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <HardDrive className="mr-1 h-3 w-3" />} 
                                        Espacio DB
                                    </Button>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 text-[8px] font-black uppercase text-primary-foreground hover:bg-white/10">
                                                <Settings2 className="mr-1 h-3 w-3" /> Filtros
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] md:w-[400px] p-4 border-4 z-[120]">
                                            <Label className="text-[10px] font-black uppercase mb-2 block">Criterio JSON de Búsqueda</Label>
                                            <Textarea 
                                                value={queryFilter} 
                                                onChange={e => setQueryFilter(e.target.value)}
                                                className="font-mono text-xs h-32 mb-4 border-2"
                                                placeholder='{"status": "Active"}'
                                            />
                                            <Button onClick={runQuery} className="w-full font-black uppercase text-xs">Actualizar Vista</Button>
                                        </PopoverContent>
                                    </Popover>
                                    {viewMode === 'table' && documents.length > 0 && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 text-[8px] font-black uppercase text-primary-foreground hover:bg-white/10 hidden md:flex">
                                                    <LayoutGrid className="mr-1 h-3 w-3" /> Columnas
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-56 p-0 border-4 z-[120]">
                                                <div className="p-2 border-b bg-muted/50"><span className="text-[9px] font-black uppercase italic opacity-60">Visibilidad</span></div>
                                                <div className="max-h-[300px] overflow-y-auto p-1">
                                                    {allHeaders.map(h => (
                                                        <div key={h} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg cursor-pointer" onClick={() => toggleColumn(h)}>
                                                            <Checkbox checked={!hiddenColumns.has(h)} />
                                                            <span className="text-[10px] font-bold uppercase truncate">{h}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>
                            </div>
                            <CardContent className='p-3 flex flex-col gap-3'>
                                {dbStats && (
                                    <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-1">
                                        <Badge variant="secondary" className="text-[9px] font-black uppercase bg-primary/10 text-primary">📦 Data: {dbStats.dataSize} MB</Badge>
                                        <Badge variant="secondary" className="text-[9px] font-black uppercase bg-blue-50 text-blue-700">🔍 Índices: {dbStats.indexSize} MB</Badge>
                                        <Badge variant="secondary" className="text-[9px] font-black uppercase bg-green-50 text-green-700">📄 Docs: {dbStats.documents}</Badge>
                                        <Badge variant="secondary" className="text-[9px] font-black uppercase bg-slate-100">💿 Total: {dbStats.totalSize} MB</Badge>
                                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setDbStats(null)}><X className="h-3 w-3" /></Button>
                                    </div>
                                )}
                                <div className='flex gap-2'>
                                    <div className='relative flex-1'>
                                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                        <Input 
                                            className='pl-9 font-mono text-xs h-11 bg-muted/30 border-2'
                                            placeholder='db.find(...)'
                                            value={queryFilter}
                                            onChange={e => setQueryFilter(e.target.value)}
                                        />
                                    </div>
                                    <Button onClick={runQuery} disabled={loading || !selectedCol} className='h-11 px-4 md:px-8 font-black uppercase shadow-lg'>
                                        {loading ? <Loader2 className='animate-spin' /> : <Play className='md:mr-2 h-4 w-4' />}
                                        <span className="hidden md:inline">Ejecutar</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* RESULTADOS / DATA GRID */}
                        <Card className="flex-1 border-2 shadow-2xl overflow-hidden flex flex-col min-h-0 bg-white">
                            <CardHeader className="bg-muted/10 border-b p-3 flex flex-row items-center justify-between">
                                <div className='flex items-center gap-2'>
                                    <Database className='h-4 w-4 text-primary' />
                                    <CardTitle className="text-xs font-black uppercase">
                                        <span className="hidden sm:inline">Colección:</span> <span className="text-primary italic">{selectedCol || '---'}</span>
                                    </CardTitle>
                                </div>
                                <div className='flex gap-1'>
                                    <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => setViewMode('table')}>
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant={viewMode === 'json' ? 'default' : 'outline'} size="icon" className="h-7 w-7" onClick={() => setViewMode('json')}>
                                        <List className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 flex-1 overflow-auto bg-[#fafafa] relative">
                                {documents.length > 0 ? (
                                    viewMode === 'table' ? (
                                        <div className="min-w-full overflow-x-auto">
                                            <Table className="border-collapse table-fixed md:table-auto">
                                                <TableHeader className="bg-white sticky top-0 z-20 shadow-sm">
                                                    <TableRow className="hover:bg-transparent">
                                                        {visibleHeaders.map(header => (
                                                            <TableHead key={header} className={cn(
                                                                "font-black text-[9px] uppercase py-3 border-r border-b px-4 whitespace-nowrap bg-muted/50",
                                                                header === '_id' && "sticky left-0 bg-white z-30 shadow-[4px_0_10px_rgba(0,0,0,0.05)]"
                                                            )}>
                                                                {header}
                                                            </TableHead>
                                                        ))}
                                                        <TableHead className="sticky right-0 bg-white border-l z-30 font-black text-[9px] uppercase px-4 text-center">GESTIÓN</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {flattenedDocs.map((doc, idx) => (
                                                        <TableRow key={doc._id || idx} className="hover:bg-primary/[0.03] border-b transition-colors group">
                                                            {visibleHeaders.map(header => (
                                                                <TableCell key={header} className={cn(
                                                                    "text-[10px] font-medium border-r px-4 py-2.5 whitespace-nowrap truncate max-w-[200px]",
                                                                    header === '_id' && "sticky left-0 bg-white font-black text-primary z-10 shadow-[4px_0_10px_rgba(0,0,0,0.02)]"
                                                                )}>
                                                                    {formatCellValue(doc[header])}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="sticky right-0 bg-white border-l z-10 p-0 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                                                                <div className="flex items-center h-full">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-10 flex-1 rounded-none font-black text-[10px] uppercase hover:bg-primary hover:text-white"
                                                                        onClick={() => {
                                                                            setEditingDoc(documents[idx]);
                                                                            setJsonEditorContent(JSON.stringify(documents[idx], null, 2));
                                                                        }}
                                                                    >
                                                                        {isReadOnly ? 'Ver' : 'Editar'}
                                                                    </Button>
                                                                    {!isReadOnly && (
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="sm" 
                                                                            className="h-10 w-10 rounded-none text-red-400 hover:bg-red-500 hover:text-white border-l animate-in fade-in zoom-in-50"
                                                                            onClick={() => handleDeleteDocument(documents[idx]._id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                                            {documents.map((doc, idx) => (
                                                <Card key={doc._id || idx} className="border-2 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                                    <CardHeader className="bg-muted/5 p-3 flex flex-row justify-between items-center space-y-0">
                                                        <code className="text-[10px] font-black text-primary truncate max-w-[150px]">ID: {doc._id}</code>
                                                        <div className="flex gap-1">
                                                            {!isReadOnly && (
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-50 animate-in zoom-in-50" onClick={() => handleDeleteDocument(doc._id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                                                setEditingDoc(doc);
                                                                setJsonEditorContent(JSON.stringify(doc, null, 2));
                                                            }}>
                                                                {isReadOnly ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-3">
                                                        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap line-clamp-6 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {JSON.stringify(doc, (key, value) => key === '_id' ? undefined : value, 1)}
                                                        </pre>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 p-10 text-center">
                                        <LayoutGrid className="h-20 w-20 mb-4" />
                                        <p className="text-sm font-black uppercase italic tracking-widest">Seleccione un esquema para explorar los datos en tiempo real.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* MONITOR DE SALUD (FOOTER) - Solo en Desktop */}
                        {serverInfo && (
                            <div className='hidden md:grid grid-cols-4 gap-4'>
                                <Card className='p-3 border-2 bg-black text-white'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Cpu className='h-3 w-3 text-primary'/><span className='text-[8px] font-black uppercase opacity-60'>Uso RAM</span></div>
                                        <span className='text-xs font-black'>{serverInfo.mem?.resident || 0}MB</span>
                                    </div>
                                </Card>
                                <Card className='p-3 border-2'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Activity className='h-3 w-3 text-green-500'/><span className='text-[8px] font-black uppercase opacity-60'>Links</span></div>
                                        <span className='text-xs font-black'>{serverInfo.connections?.current || 0}</span>
                                    </div>
                                </Card>
                                <Card className='p-3 border-2'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Zap className='h-3 w-3 text-amber-500'/><span className='text-[8px] font-black uppercase opacity-60'>Uptime</span></div>
                                        <span className='text-xs font-black'>{Math.floor(serverInfo.uptime / 3600)}h</span>
                                    </div>
                                </Card>
                                <Card className='p-3 border-2'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Database className='h-3 w-3 text-primary'/><span className='text-[8px] font-black uppercase opacity-60'>Motor</span></div>
                                        <span className='text-xs font-black truncate max-w-[80px]'>{serverInfo.version || 'Atlas'}</span>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL PROVISIÓN ATLAS */}
            <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
                <DialogContent className="sm:max-w-[500px] border-4">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2">
                            <Cloud className="h-6 w-6 text-primary" /> Provisionar en Atlas
                        </DialogTitle>
                        <DialogDescription className="font-bold">Inicializa una base de datos físicamente en un clúster remoto.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Atlas URI (Host)</Label>
                            <Input 
                                placeholder="mongodb+srv://cluster0.abcde.mongodb.net" 
                                value={provisionForm.atlasUri}
                                onChange={e => setProvisionForm({...provisionForm, atlasUri: e.target.value})}
                                className="font-mono text-xs border-2"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase">Usuario DB</Label>
                                <Input 
                                    value={provisionForm.user}
                                    onChange={e => setProvisionForm({...provisionForm, user: e.target.value})}
                                    className="font-bold border-2"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase">Password DB</Label>
                                <Input 
                                    type="password"
                                    value={provisionForm.password}
                                    onChange={e => setProvisionForm({...provisionForm, password: e.target.value})}
                                    className="border-2"
                                />
                            </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-primary">Nombre Nueva DB</Label>
                                <Input 
                                    placeholder="krea_cliente_xyz" 
                                    value={provisionForm.dbName}
                                    onChange={e => setProvisionForm({...provisionForm, dbName: e.target.value})}
                                    className="font-black border-2 border-primary/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase opacity-60">Colección Inicial</Label>
                                <Input 
                                    value={provisionForm.collectionName}
                                    onChange={e => setProvisionForm({...provisionForm, collectionName: e.target.value})}
                                    className="font-bold border-2"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProvisionOpen(false)}>Cancelar</Button>
                        <Button onClick={handleProvisionAtlas} disabled={provisioning} className="font-black uppercase shadow-xl h-12 px-8">
                            {provisioning ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                            Ejecutar Provisión Atlas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL EDITOR JSON INTEGRAL */}
            <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
                <DialogContent className="sm:max-w-[800px] h-[95vh] md:h-auto border-[6px] border-primary/20 overflow-hidden p-0 rounded-t-3xl md:rounded-3xl flex flex-col">
                    <div className='bg-primary p-4 md:p-6 text-white shrink-0'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <DialogHeader>
                                    <DialogTitle className='text-lg md:text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3'>
                                        <Code2 className='h-6 w-6 md:h-8 md:w-8' /> Inspector Maestro
                                    </DialogTitle>
                                    <DialogDescription className='text-white/70 font-bold uppercase text-[9px] md:text-[10px] tracking-widest'>
                                        Contexto: {selectedCol} • ID: {editingDoc?._id}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className='flex items-center gap-4'>
                                <div className='flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/10'>
                                    <Label className='text-[10px] font-black uppercase tracking-tight text-white cursor-pointer select-none' htmlFor="modal-write-toggle">
                                        {isReadOnly ? <Lock className='h-3 w-3 inline mr-1'/> : <Unlock className='h-3 w-3 inline mr-1'/>}
                                        Modo Escritura
                                    </Label>
                                    <Switch 
                                        id="modal-write-toggle"
                                        checked={!isReadOnly} 
                                        onCheckedChange={(checked) => setIsReadOnly(!checked)}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setEditingDoc(null)} className="text-white hover:bg-white/10 rounded-full">
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 md:p-6 bg-white overflow-y-auto flex-1">
                        <div className='mb-4 flex justify-between items-center'>
                            <Label className='text-[10px] font-black uppercase text-muted-foreground'>Contenido JSON (Sintaxis Protegida)</Label>
                            {isReadOnly ? (
                                <Badge className='bg-amber-500 text-white font-black text-[9px] uppercase'>Solo Lectura</Badge>
                            ) : (
                                <Badge className='bg-green-600 text-white font-black text-[9px] uppercase'>Escritura Habilitada</Badge>
                            )}
                        </div>
                        
                        <Textarea 
                            className="font-mono text-[11px] md:text-[13px] h-[400px] md:h-[450px] bg-slate-900 text-green-400 border-none focus:ring-0 leading-relaxed rounded-2xl p-4 md:p-6 shadow-inner resize-none"
                            value={jsonEditorContent}
                            readOnly={isReadOnly}
                            onChange={e => setJsonEditorContent(e.target.value)}
                        />
                        
                        {!isReadOnly && (
                            <div className='mt-4 p-3 md:p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 animate-in shake-in duration-500'>
                                <ShieldAlert className='h-5 w-5 md:h-6 md:w-6 text-red-600 shrink-0 mt-0.5' />
                                <div className='space-y-1'>
                                    <p className='text-[10px] font-black text-red-800 uppercase'>Protocolo de Escritura Activo</p>
                                    <p className='text-[9px] font-bold text-red-700 leading-tight'>
                                        La modificación manual puede corromper la integridad si los tipos (BSON) no se mantienen. El cambio será registrado en auditoría.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="p-4 md:p-6 bg-slate-50 border-t flex flex-row justify-between items-center gap-2 shrink-0">
                        <Button variant="ghost" onClick={() => setEditingDoc(null)} className="font-black uppercase text-[10px] md:text-xs">Cerrar Inspector</Button>
                        <div className="flex gap-2">
                            {!isReadOnly && (
                                <Button 
                                    variant="outline" 
                                    className="font-black text-red-600 border-red-200 uppercase px-4 h-10 md:h-12 hover:bg-red-50 animate-in slide-in-from-right-2"
                                    onClick={() => handleDeleteDocument(editingDoc._id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Purgar Doc.
                                </Button>
                            )}
                            <Button 
                                onClick={handleSaveDocument} 
                                disabled={isReadOnly}
                                className={cn(
                                    "font-black uppercase px-6 md:px-10 h-10 md:h-12 shadow-xl transition-all",
                                    isReadOnly ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" : "bg-primary text-white"
                                )}
                            >
                                <Save className="mr-2 h-4 w-4" /> Aplicar Cambios
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
