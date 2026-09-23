
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Utilidad para aplanar objetos anidados (Ej: price.cost)
function flattenObject(obj: any, prefix = ''): any {
    if (!obj || typeof obj !== 'object') return { [prefix]: obj };
    
    return Object.keys(obj).reduce((acc: any, k: string) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (
            typeof obj[k] === 'object' && 
            obj[k] !== null && 
            !Array.isArray(obj[k]) && 
            !(obj[k] instanceof Date) &&
            !(k === '_id') // No aplanamos el ObjectId
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
    
    // Editor State
    const [isReadOnly, setIsReadOnly] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
    const [queryFilter, setQueryFilter] = useState('{}');
    const [editingDoc, setEditingDoc] = useState<any>(null);
    const [jsonEditorContent, setJsonEditorContent] = useState('');

    // Column Management
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

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

    // --- LÓGICA DE TABLA DINÁMICA ---
    const flattenedDocs = useMemo(() => documents.map(doc => flattenObject(doc)), [documents]);
    
    const allHeaders = useMemo(() => {
        const keys = new Set<string>();
        flattenedDocs.forEach(doc => {
            Object.keys(doc).forEach(k => keys.add(k));
        });
        // Priorizar _id y createdAt
        const sorted = Array.from(keys).sort((a, b) => {
            if (a === '_id') return -1;
            if (b === '_id') return 1;
            if (a === 'createdAt') return -1;
            if (b === 'createdAt') return 1;
            return a.localeCompare(b);
        });
        return sorted;
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
        if (typeof val === 'boolean') return val ? 'V' : 'F';
        if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/))) {
            return new Date(val).toLocaleDateString();
        }
        if (Array.isArray(val)) return `[${val.length} ítems]`;
        if (typeof val === 'object') return '{...}';
        return String(val);
    };

    return (
        <div className="flex flex-1 flex-col h-screen overflow-hidden">
            <main className="flex-1 flex flex-col p-4 md:p-6 space-y-4">
                <PageHeader 
                    title="Data Studio & Monitor" 
                    description="Ingeniería de datos avanzada para el ecosistema Krea."
                    actions={
                        <div className='flex gap-2'>
                            <div className='bg-muted/50 p-1 rounded-xl border-2 flex'>
                                <Button 
                                    variant={viewMode === 'table' ? 'default' : 'ghost'} 
                                    size="sm" 
                                    className="h-8 font-black uppercase text-[9px]"
                                    onClick={() => setViewMode('table')}
                                >
                                    <LayoutGrid className="mr-1.5 h-3 w-3" /> Tabla
                                </Button>
                                <Button 
                                    variant={viewMode === 'json' ? 'default' : 'ghost'} 
                                    size="sm" 
                                    className="h-8 font-black uppercase text-[9px]"
                                    onClick={() => setViewMode('json')}
                                >
                                    <List className="mr-1.5 h-3 w-3" /> JSON
                                </Button>
                            </div>
                            <Button 
                                variant={isReadOnly ? "secondary" : "destructive"} 
                                className="font-black text-[10px] uppercase h-11"
                                onClick={() => setIsReadOnly(!isReadOnly)}
                            >
                                {isReadOnly ? <Eye className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                {isReadOnly ? 'Lectura' : 'Escritura'}
                            </Button>
                            <Button variant="outline" onClick={fetchData} disabled={loading} className='h-11'>
                                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    }
                />

                <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                    
                    {/* COLUMNA IZQUIERDA: CONTEXTO Y COLECCIONES */}
                    <Card className="col-span-12 lg:col-span-3 border-2 flex flex-col shadow-xl overflow-hidden">
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
                            <div className='p-3 border-b bg-muted/10 flex items-center justify-between'>
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
                                            // Reset hidden columns when changing collection
                                            setHiddenColumns(new Set());
                                            setTimeout(runQuery, 100);
                                        }}
                                    >
                                        <div className='flex items-center gap-3'>
                                            <TableIcon className={cn("h-4 w-4 transition-transform group-hover:scale-110", selectedCol === col.name ? "text-white" : "text-primary")} />
                                            <span className="text-xs uppercase tracking-tight">{col.name}</span>
                                        </div>
                                        <Badge variant="outline" className={cn("text-[9px] border-none font-bold", selectedCol === col.name ? "bg-white/20 text-white" : "bg-muted")}>
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
                                    <span className='text-[10px] font-black uppercase italic tracking-widest'>Mongo Query Console</span>
                                </div>
                                <div className='flex items-center gap-4'>
                                    <span className='text-[8px] font-black text-white/40 uppercase'>db.{selectedCol || 'collection'}.find()</span>
                                    {viewMode === 'table' && documents.length > 0 && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 text-[8px] font-black uppercase text-primary-foreground hover:bg-white/10">
                                                    <Settings2 className="mr-1 h-3 w-3" /> Columnas
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-56 p-0 border-4 z-[120]">
                                                <div className="p-2 border-b bg-muted/50">
                                                    <span className="text-[9px] font-black uppercase italic opacity-60">Visibilidad de Campos</span>
                                                </div>
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
                            <CardContent className='p-3 flex gap-3'>
                                <div className='relative flex-1'>
                                    <Filter className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                                    <Input 
                                        className='pl-9 font-mono text-xs h-11 bg-muted/30 border-2 focus:ring-primary'
                                        placeholder='Filtro JSON (ej: {"status": "Active"})'
                                        value={queryFilter}
                                        onChange={e => setQueryFilter(e.target.value)}
                                    />
                                </div>
                                <Button onClick={runQuery} disabled={loading || !selectedCol} className='h-11 px-8 font-black uppercase shadow-lg shadow-primary/20 active:scale-95 transition-transform'>
                                    {loading ? <Loader2 className='animate-spin' /> : <Play className='mr-2 h-4 w-4' />}
                                    Ejecutar
                                </Button>
                            </CardContent>
                        </Card>

                        {/* RESULTADOS / DATA GRID */}
                        <Card className="flex-1 border-2 shadow-2xl overflow-hidden flex flex-col min-h-0 bg-white">
                            <CardHeader className="bg-muted/10 border-b py-3 flex flex-row items-center justify-between">
                                <div className='flex items-center gap-2'>
                                    <Search className='h-4 w-4 text-primary' />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">
                                        Colección: <span className="text-primary italic">{selectedCol || '---'}</span>
                                    </CardTitle>
                                </div>
                                {documents.length > 0 && (
                                    <div className='flex items-center gap-2'>
                                        <Badge variant="secondary" className='text-[9px] font-black uppercase'>{documents.length} Registros</Badge>
                                        <Badge variant="outline" className='text-[9px] font-black uppercase'>{visibleHeaders.length} Columnas</Badge>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto bg-[#fafafa] relative">
                                {documents.length > 0 ? (
                                    viewMode === 'table' ? (
                                        <div className="min-w-full">
                                            <Table className="border-collapse">
                                                <TableHeader className="bg-white sticky top-0 z-20 shadow-sm">
                                                    <TableRow className="hover:bg-transparent">
                                                        {visibleHeaders.map(header => (
                                                            <TableHead key={header} className="font-black text-[9px] uppercase py-3 border-r border-b px-4 whitespace-nowrap bg-muted/50">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    {header}
                                                                    <ChevronDown className="h-2.5 w-2.5 opacity-20" />
                                                                </div>
                                                            </TableHead>
                                                        ))}
                                                        <TableHead className="sticky right-0 bg-white border-l z-30 font-black text-[9px] uppercase px-4 text-center">Acción</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {flattenedDocs.map((doc, idx) => (
                                                        <TableRow key={doc._id || idx} className="hover:bg-primary/[0.03] transition-colors border-b group">
                                                            {visibleHeaders.map(header => (
                                                                <TableCell key={header} className="text-[10px] font-medium border-r px-4 py-2.5 whitespace-nowrap max-w-[250px] truncate">
                                                                    {header === '_id' ? (
                                                                        <code className="bg-primary/5 text-primary px-1.5 py-0.5 rounded font-black text-[9px]">{doc[header]}</code>
                                                                    ) : (
                                                                        formatCellValue(doc[header])
                                                                    )}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="sticky right-0 bg-white border-l z-10 p-0 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-9 w-full rounded-none font-black text-[9px] uppercase hover:bg-primary hover:text-white"
                                                                    onClick={() => {
                                                                        setEditingDoc(documents[idx]);
                                                                        setJsonEditorContent(JSON.stringify(documents[idx], null, 2));
                                                                    }}
                                                                >
                                                                    {isReadOnly ? 'Ver' : 'Editar'}
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {documents.map((doc, idx) => (
                                                <div key={doc._id || idx} className="p-4 hover:bg-white transition-all group relative border-l-4 border-transparent hover:border-primary">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-mono text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded flex items-center gap-2">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                            _id: {doc._id}
                                                        </span>
                                                        <Button 
                                                            variant="secondary" 
                                                            size="sm" 
                                                            className="h-7 text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                            onClick={() => {
                                                                setEditingDoc(doc);
                                                                setJsonEditorContent(JSON.stringify(doc, null, 2));
                                                            }}
                                                        >
                                                            {isReadOnly ? 'Abrir JSON' : 'Editar Registro'}
                                                        </Button>
                                                    </div>
                                                    <pre className="text-[11px] font-mono whitespace-pre-wrap line-clamp-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        {JSON.stringify(doc, (key, value) => key === '_id' ? undefined : value)}
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20">
                                        <Database className="h-20 w-20 mb-4" />
                                        <p className="text-sm font-black uppercase italic tracking-widest">Esperando orden de consulta...</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* MONITOR DE SALUD (FOOTER) */}
                        {serverInfo && (
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                                <Card className='p-3 border-2 shadow-sm bg-black text-white hover:bg-slate-900 transition-colors'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Cpu className='h-3 w-3 text-primary'/><span className='text-[8px] font-black uppercase opacity-60'>Uso Memoria</span></div>
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
                                        <div className='flex items-center gap-2'><Zap className='h-3 w-3 text-amber-500'/><span className='text-[8px] font-black uppercase opacity-60'>Tiempo Activo</span></div>
                                        <span className='text-xs font-black'>{Math.floor(serverInfo.uptime / 3600)}h</span>
                                    </div>
                                </Card>
                                <Card className='p-3 border-2 shadow-sm'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'><Database className='h-3 w-3 text-primary'/><span className='text-[8px] font-black uppercase opacity-60'>Versión Motor</span></div>
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
                <DialogContent className="sm:max-w-[750px] border-[6px] border-primary/20 overflow-hidden p-0 rounded-3xl">
                    <div className='bg-primary p-6 text-white'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <DialogHeader>
                                    <DialogTitle className='text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3'>
                                        <Code2 className='h-8 w-8' /> Editor Maestro
                                    </DialogTitle>
                                    <DialogDescription className='text-white/70 font-bold uppercase text-[10px] tracking-widest'>
                                        ID: {editingDoc?._id} • Contexto: {selectedCol}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setEditingDoc(null)} className="text-white hover:bg-white/10 rounded-full">
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                    
                    <div className="p-6 bg-white">
                        <div className='mb-4 flex justify-between items-center'>
                            <Label className='text-[10px] font-black uppercase text-muted-foreground'>Contenido JSON (BSON Compatible)</Label>
                            {isReadOnly && <Badge className='bg-amber-500 text-white font-black text-[9px] uppercase'>Vista Protegida</Badge>}
                        </div>
                        
                        <Textarea 
                            className="font-mono text-[13px] h-[450px] bg-slate-900 text-green-400 border-none focus:ring-0 leading-relaxed rounded-2xl p-6 shadow-inner resize-none scrollbar-hide"
                            value={jsonEditorContent}
                            readOnly={isReadOnly}
                            onChange={e => setJsonEditorContent(e.target.value)}
                        />
                        
                        {!isReadOnly && (
                            <div className='mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 animate-in shake-in duration-500'>
                                <ShieldAlert className='h-6 w-6 text-red-600 shrink-0 mt-0.5' />
                                <div className='space-y-1'>
                                    <p className='text-[10px] font-black text-red-800 uppercase'>ADVERTENCIA DE INTEGRIDAD</p>
                                    <p className='text-[9px] font-bold text-red-700 leading-tight'>
                                        Estás modificando un registro directamente en producción. El cambio será irreversible y quedará vinculado a tu IP: {serverInfo?.ip || 'Detectada'}.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="p-6 bg-slate-50 border-t flex justify-between items-center sm:justify-between">
                        <Button variant="ghost" onClick={() => setEditingDoc(null)} className="font-black uppercase text-xs">Cerrar Inspector</Button>
                        {!isReadOnly && (
                            <Button onClick={handleSaveDocument} className="font-black uppercase px-10 h-12 shadow-2xl rounded-xl bg-primary hover:scale-105 transition-transform">
                                <Save className="mr-2 h-4 w-4" /> Aplicar Cambios
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

