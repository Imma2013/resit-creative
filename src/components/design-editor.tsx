'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenterHorizontal, AlignCenterVertical, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, Copy, Frame, ImagePlus, Minus, Plus, Redo2, RotateCw, Square, Trash2, Type, Undo2, Upload, WandSparkles } from 'lucide-react';
import type { AgentMode, DesignAction, DesignElement } from '@/lib/types';
import type { DesignComponent, DesignToken } from '@/lib/design-system';
import DesignSystemPanel from './design-system-panel';

type Props = { ai: boolean; setAi: (value: boolean) => void; prompt: string; setPrompt: (value: string) => void };
const CANVAS_W = 1080;
const CANVAS_H = 1350;

const starter: DesignElement[] = [
  { id: 'headline', type: 'text', x: 90, y: 170, width: 780, height: 150, text: 'Make something people remember.', style: { color: '#111', fontSize: 64, fontWeight: 800 } },
  { id: 'subhead', type: 'text', x: 94, y: 340, width: 620, height: 70, text: 'Resit / Creative workspace', style: { color: '#777', fontSize: 24, fontWeight: 500 } }
];

export default function DesignEditor({ ai, setAi, prompt, setPrompt }: Props) {
  const [elements, setElements] = useState<DesignElement[]>(starter);
  const [selected, setSelected] = useState<string | null>('headline');
  const [history, setHistory] = useState<DesignElement[][]>([]);
  const [future, setFuture] = useState<DesignElement[][]>([]);
  const [zoom, setZoom] = useState(0.55);
  const [busy, setBusy] = useState(false);
  const [agentText, setAgentText] = useState('');
  const [agentMode, setAgentMode] = useState<AgentMode>('edit');
  const [snap, setSnap] = useState(true);
  const [resize, setResize] = useState<{ id: string; edge: string; startX: number; startY: number; width: number; height: number; x: number; y: number } | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const selectedElement = useMemo(() => elements.find((e) => e.id === selected) ?? null, [elements, selected]);
  const commit = (next: DesignElement[]) => { setHistory((h) => [...h.slice(-39), elements]); setFuture([]); setElements(next); };
  const patch = (id: string, update: Partial<DesignElement>) => commit(elements.map((e) => e.id === id ? { ...e, ...update } : e));

  const applyActions = (actions: DesignAction[]) => {
    let next = [...elements];
    for (const action of actions) {
      const a = action.args;
      if (action.name === 'design.add_frame') {
        const id = `frame-${crypto.randomUUID()}`;
        next.push({ id, type: 'frame', x: Number(a.x ?? 80), y: Number(a.y ?? 80), width: Number(a.width ?? 880), height: Number(a.height ?? 1100), text: String(a.name ?? 'Frame'), style: { background: String(a.background ?? '#fff'), color: '#111', borderRadius: 24 }, layout: { mode: (['horizontal','vertical'].includes(String(a.layout)) ? String(a.layout) : 'none') as 'none'|'horizontal'|'vertical', gap: Number(a.gap ?? 16), padding: Number(a.padding ?? 24), align: 'start' }, constraints: { horizontal: 'left', vertical: 'top' } });
        setSelected(id);
      } else if (action.name === 'design.align') {
        const ids = Array.isArray(a.elementIds) && a.elementIds.length ? a.elementIds.map(String) : selected ? [selected] : [];
        const picked = next.filter(e => ids.includes(e.id));
        if (picked.length > 1) {
          const axis = String(a.axis);
          const minX = Math.min(...picked.map(e => e.x)), minY = Math.min(...picked.map(e => e.y));
          const maxR = Math.max(...picked.map(e => e.x + e.width)), maxB = Math.max(...picked.map(e => e.y + e.height));
          const centerX = (minX + maxR) / 2, centerY = (minY + maxB) / 2;
          next = next.map(e => ids.includes(e.id) ? { ...e, ...(axis === 'x' ? { x: String(a.mode ?? 'center') === 'start' ? minX : String(a.mode ?? 'center') === 'end' ? maxR - e.width : centerX - e.width/2 } : { y: String(a.mode ?? 'center') === 'start' ? minY : String(a.mode ?? 'center') === 'end' ? maxB - e.height : centerY - e.height/2 }) } : e);
        }
      } else if (action.name === 'design.distribute') {
        const ids = Array.isArray(a.elementIds) ? a.elementIds.map(String) : [];
        const picked = next.filter(e => ids.includes(e.id)).sort((a,b) => String(a.id).localeCompare(String(b.id)));
        if (picked.length > 2) {
          const axis = String(a.axis);
          const first = picked[0], last = picked[picked.length - 1];
          const span = axis === 'x' ? (last.x - first.x) : (last.y - first.y);
          const step = span / (picked.length - 1);
          next = next.map(e => { const i = picked.findIndex(p => p.id === e.id); return i >= 0 ? { ...e, ...(axis === 'x' ? { x: first.x + step*i } : { y: first.y + step*i }) } : e; });
        }
      } else if (action.name === 'design.rotate') {
        const ids = Array.isArray(a.elementIds) && a.elementIds.length ? a.elementIds.map(String) : selected ? [selected] : [];
        next = next.map(e => ids.includes(e.id) ? { ...e, rotation: Number(e.rotation ?? 0) + Number(a.degrees ?? 0) } : e);
      } else if (action.name === 'design.set_layout') {
        next = next.map(e => e.id === a.frameId ? { ...e, layout: { mode: String(a.mode) as 'none'|'horizontal'|'vertical', gap: Number(a.gap ?? e.layout?.gap ?? 16), padding: Number(a.padding ?? e.layout?.padding ?? 24), align: (String(a.align ?? e.layout?.align ?? 'start') as 'start'|'center'|'end'|'stretch') } } : e);
      } else if (action.name === 'design.set_constraints') {
        next = next.map(e => e.id === a.elementId ? { ...e, constraints: { horizontal: String(a.horizontal) as 'left'|'right'|'center'|'scale', vertical: String(a.vertical) as 'top'|'bottom'|'center'|'scale' } } : e);
      } else if (action.name === 'design.create_variant') {
        setAgentText(`Variant “${String(a.name ?? 'Variant')}” is ready to attach to the component.`);
      } else if (action.name === 'design.critique_selection') {
        setAgentText('Critique mode is active. The agent should return concrete hierarchy, spacing, typography, and contrast fixes without changing the canvas.');
      } else if (action.name === 'design.add_element') {
        const id = `el-${crypto.randomUUID()}`;
        const type = (a.type as DesignElement['type']) || 'shape';
        next.push({ id, type, x: Number(a.x ?? 120), y: Number(a.y ?? 120), width: Number(a.width ?? 420), height: Number(a.height ?? 220), text: a.text as string | undefined, style: { background: String(a.background ?? '#111'), color: String(a.color ?? '#fff'), fontSize: Number(a.fontSize ?? 42), fontWeight: Number(a.fontWeight ?? 700) } });
        setSelected(id);
      } else if (action.name === 'design.update_element') {
        next = next.map((e) => e.id === a.id ? { ...e, text: a.text !== undefined ? String(a.text) : e.text, style: { ...e.style, ...(a.background ? { background: String(a.background) } : {}), ...(a.color ? { color: String(a.color) } : {}), ...(a.fontSize ? { fontSize: Number(a.fontSize) } : {}), ...(a.fontWeight ? { fontWeight: Number(a.fontWeight) } : {}) } } : e);
      } else if (action.name === 'design.move_element') {
        next = next.map((e) => e.id === a.id ? { ...e, x: Number(a.x), y: Number(a.y) } : e);
      } else if (action.name === 'design.resize_element') {
        next = next.map((e) => e.id === a.id ? { ...e, width: Number(a.width), height: Number(a.height) } : e);
      } else if (action.name === 'design.delete_element') {
        next = next.filter((e) => e.id !== a.id);
      } else if (action.name === 'design.apply_token') {
        const token = String(a.token ?? '');
        next = next.map((e) => e.id === a.elementId ? { ...e, style: { ...e.style, ...(a.property === 'color' ? { color: token } : a.property === 'background' ? { background: token } : {}) } } : e);
      } else if (action.name === 'design.edit_selection') {
        const instruction = String(a.instruction ?? '').toLowerCase();
        const ids = Array.isArray(a.elementIds) && a.elementIds.length ? a.elementIds.map(String) : selected ? [selected] : [];
        next = next.map((e) => {
          if (!ids.includes(e.id)) return e;
          const style = { ...e.style };
          let width = e.width, height = e.height, x = e.x, y = e.y;
          if (instruction.includes('larger') || instruction.includes('bigger')) { width *= 1.15; height *= 1.15; style.fontSize = Number(style.fontSize ?? 32) * 1.15; }
          if (instruction.includes('smaller')) { width *= .9; height *= .9; style.fontSize = Number(style.fontSize ?? 32) * .9; }
          if (instruction.includes('bold')) style.fontWeight = 800;
          if (instruction.includes('center')) x = (CANVAS_W - width) / 2;
          if (instruction.includes('top')) y = 80;
          if (instruction.includes('bottom')) y = CANVAS_H - height - 80;
          return { ...e, x, y, width, height, style };
        });
      } else if (action.name === 'design.generate_layout') {
        const brief = String(a.brief ?? 'New creative');
        const id = () => `el-${crypto.randomUUID()}`;
        next = [...next, { id: id(), type: 'shape', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, style: { background: '#f3f1ec' } }, { id: id(), type: 'text', x: 90, y: 190, width: 820, height: 150, text: brief.slice(0, 80), style: { color: '#111', fontSize: 64, fontWeight: 800 } }, { id: id(), type: 'text', x: 94, y: 370, width: 650, height: 90, text: 'Generated in Resit · editable structure', style: { color: '#666', fontSize: 22, fontWeight: 500 } }];
      }
    }
    if (actions.some((a) => a.name.startsWith('design.'))) commit(next);
  };

  const applyToken = (token: DesignToken) => {
    if (!selectedElement) return;
    const next = elements.map((e) => {
      if (e.id !== selectedElement.id) return e;
      const style = { ...e.style };
      if (token.category === 'color') style.color = token.value;
      if (token.category === 'typography') { const match = String(token.value).match(/(\d+)\s*\/\s*(\d+)/); if (match) { style.fontWeight = Number(match[1]); style.fontSize = Number(match[2]); } }
      if (token.category === 'radius') style.borderRadius = token.value;
      if (token.category === 'spacing') style.padding = token.value;
      return { ...e, style };
    });
    commit(next); setAgentText(`Applied ${token.name}.`);
  };

  const createComponent = (component: DesignComponent) => setAgentText(`Created reusable component “${component.name}” from ${component.elementIds.length} layer(s).`);
  const instantiateComponent = (component: DesignComponent) => {
    const source = elements.find((e) => component.elementIds.includes(e.id));
    if (!source) return;
    const copy = { ...source, id: `el-${crypto.randomUUID()}`, x: source.x + 40, y: source.y + 40 };
    commit([...elements, copy]); setSelected(copy.id); setAgentText(`Instantiated ${component.name}.`);
  };

  const runAgent = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true); setAgentText('');
    try {
      const res = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context: { surface: 'design', mode: agentMode, canvas: { width: CANVAS_W, height: CANVAS_H }, selectedId: selected, elements, designSystem: 'Resit Core tokens + reusable components' } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent failed');
      applyActions(data.actions ?? []);
      setAgentText(data.text || `${(data.actions ?? []).length} editor operation${(data.actions ?? []).length === 1 ? '' : 's'} applied.`);
      setPrompt('');
    } catch (error) { setAgentText(error instanceof Error ? error.message : 'Agent failed'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/design')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load design');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setProjectId(data.project.id);
        if (Array.isArray(data.document?.elements)) setElements(data.document.elements as DesignElement[]);
        setHydrated(true);
      })
      .catch((error) => {
        if (!cancelled) { setAgentText(error instanceof Error ? error.message : 'Failed to load design'); setHydrated(true); }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated || !projectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/design', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, elements, width: CANVAS_W, height: CANVAS_H })
      }).catch(() => setAgentText('Autosave failed. Your local edits are still in this session.'));
    }, 450);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [elements, hydrated, projectId]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      const { id, offsetX, offsetY } = drag.current;
      const rect = (event.currentTarget as Window).document.querySelector('[data-design-canvas="true"]')?.getBoundingClientRect();
      if (!rect) return;
      let x = Math.max(0, Math.min(CANVAS_W - 20, (event.clientX - rect.left) / zoom - offsetX));
      let y = Math.max(0, Math.min(CANVAS_H - 20, (event.clientY - rect.top) / zoom - offsetY));
      if (snap) { x = Math.round(x / 8) * 8; y = Math.round(y / 8) * 8; }
      setElements((current) => current.map((e) => e.id === id ? { ...e, x, y } : e));
    };
    const up = () => {
      if (drag.current) { setHistory((h) => [...h.slice(-39), elements]); setFuture([]); drag.current = null; }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [elements, zoom, snap]);

  useEffect(() => {
    if (!resize) return;
    const move = (event: PointerEvent) => {
      const dx = (event.clientX - resize.startX) / zoom; const dy = (event.clientY - resize.startY) / zoom;
      setElements(cur => cur.map(e => e.id === resize.id ? { ...e, width: Math.max(40, resize.width + dx), height: Math.max(40, resize.height + dy) } : e));
    };
    const up = () => { setHistory(h => [...h.slice(-39), elements]); setFuture([]); setResize(null); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [resize, zoom, elements]);

  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((f) => [...f, elements]); setHistory((h) => h.slice(0, -1)); setElements(previous); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory((h) => [...h, elements]); setFuture((f) => f.slice(0, -1)); setElements(next); };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if ((event.metaKey || event.ctrlKey) && event.key === 'd' && selectedElement) { event.preventDefault(); duplicate(); }
      if (event.key === 'Delete' || event.key === 'Backspace') { if (selectedElement && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { event.preventDefault(); remove(); } }
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) { setAgentText('Please choose an image file.'); return; }
    if (!projectId) { setAgentText('Save the design first, then upload an image.'); return; }
    setAgentText('Uploading imageâ¦');
    const form = new FormData(); form.append('file', file); form.append('projectId', projectId);
    try {
      const response = await fetch('/api/assets', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      const id = `el-${crypto.randomUUID()}`;
      commit([...elements, { id, type: 'image', x: 120, y: 420, width: 640, height: 480, src: data.asset.url, style: { objectFit: 'cover' } }]);
      setSelected(id); setAgentText('Image added to the canvas.');
    } catch (error) { setAgentText(error instanceof Error ? error.message : 'Image upload failed.'); }
  };

  const addText = () => commit([...elements, { id: `el-${crypto.randomUUID()}`, type: 'text', x: 120, y: 520, width: 520, height: 80, text: 'New headline', style: { color: '#111', fontSize: 42, fontWeight: 700 } }]);
  const addShape = () => commit([...elements, { id: `el-${crypto.randomUUID()}`, type: 'shape', x: 120, y: 620, width: 360, height: 220, style: { background: '#111' } }]);
  const duplicate = () => { if (!selectedElement) return; const copy = { ...selectedElement, id: `el-${crypto.randomUUID()}`, x: selectedElement.x + 24, y: selectedElement.y + 24 }; commit([...elements, copy]); setSelected(copy.id); };
  const remove = () => { if (selected) { commit(elements.filter((e) => e.id !== selected)); setSelected(null); } };

  return <section className="design-editor surface">
    <div className="editor-toolbar">
      <div className="tool-group"><button className="icon-btn" onClick={undo} disabled={!history.length}><Undo2 size={16}/></button><button className="icon-btn" onClick={redo} disabled={!future.length}><Redo2 size={16}/></button></div>
      <div className="tool-group"><button className="editor-tool" onClick={addText}><Type size={15}/>Text</button><label className="editor-tool" style={{cursor:'pointer'}}><ImagePlus size={15}/>Image<input type="file" accept="image/*" onChange={uploadImage} hidden /></label><button className="editor-tool" onClick={addShape}><Square size={15}/>Shape</button><button className="editor-tool" onClick={() => applyActions([{ name: 'design.add_frame', args: { name: 'Frame', x: 60, y: 60, width: 900, height: 1120, layout: 'vertical' } }])}><Frame size={15}/>Frame</button><button className={`editor-tool ${snap ? 'active-tool' : ''}`} onClick={() => setSnap(!snap)}>Snap</button><button className="editor-tool" onClick={duplicate} disabled={!selectedElement}><Copy size={15}/>Duplicate</button><button className="editor-tool danger" onClick={remove} disabled={!selectedElement}><Trash2 size={15}/>Delete</button></div>
      <div className="zoom-controls"><button className="icon-btn" onClick={() => setZoom(Math.max(.35, zoom-.05))}><Minus size={14}/></button><span>{Math.round(zoom*100)}%</span><button className="icon-btn" onClick={() => setZoom(Math.min(.9, zoom+.05))}><Plus size={14}/></button></div><div className="tool-group advanced-tools"><button className="icon-btn" title="Align center horizontally" onClick={() => applyActions([{ name:'design.align', args:{ elementIds: selected ? [selected] : [], axis:'x', mode:'center' } }])}><AlignCenterHorizontal size={14}/></button><button className="icon-btn" title="Align center vertically" onClick={() => applyActions([{ name:'design.align', args:{ elementIds: selected ? [selected] : [], axis:'y', mode:'center' } }])}><AlignCenterVertical size={14}/></button><button className="icon-btn" title="Rotate 15 degrees" onClick={() => applyActions([{ name:'design.rotate', args:{ elementIds: selected ? [selected] : [], degrees:15 } }])}><RotateCw size={14}/></button></div>
    </div>
    <div className="editor-main">
      <div className="canvas-stage"><div className="design-canvas" data-design-canvas="true" style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}>
        {elements.map((element) => <div key={element.id} onPointerDown={(event) => { event.stopPropagation(); setSelected(element.id); const rect = event.currentTarget.getBoundingClientRect(); drag.current = { id: element.id, offsetX: (event.clientX-rect.left)/zoom, offsetY: (event.clientY-rect.top)/zoom }; }} className={`design-element ${selected === element.id ? 'selected' : ''}`} style={{ left: element.x*zoom, top: element.y*zoom, width: element.width*zoom, height: element.height*zoom, background: (element.type === 'shape' || element.type === 'frame') ? String(element.style?.background ?? '#111') : 'transparent', color: String(element.style?.color ?? '#111'), fontSize: Number(element.style?.fontSize ?? 32)*zoom, fontWeight: Number(element.style?.fontWeight ?? 500), transform: `rotate(${Number(element.rotation ?? 0)}deg)`, borderRadius: element.style?.borderRadius as string | number | undefined, zIndex: element.type === 'frame' ? 0 : 1 }}>{element.type === 'image' && element.src ? <img src={element.src} alt={element.text ?? 'Canvas asset'} draggable={false} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : element.text}{element.type === 'frame' && <span style={{position:'absolute',top:8,left:10,fontSize:10,opacity:.45,pointerEvents:'none'}}>{element.text}</span>}{selected === element.id && <><span className="resize-handle rh-se" onPointerDown={(event) => { event.stopPropagation(); setResize({ id: element.id, edge:'se', startX:event.clientX, startY:event.clientY, width:element.width, height:element.height, x:element.x, y:element.y }); }} /><span className="rotate-handle" onPointerDown={(event) => { event.stopPropagation(); const start=event.clientY; const base=Number(element.rotation??0); const move=(e:PointerEvent)=>{ setElements(cur=>cur.map(x=>x.id===element.id?{...x,rotation:base+(start-e.clientY)/2}:x)); }; const up=()=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); }; window.addEventListener('pointermove',move); window.addEventListener('pointerup',up); }} /></>}</div>)}
      </div></div>
      <aside className={`editor-ai ${ai ? 'on' : ''}`}>
        <div className="ai-header"><div><div className="ai-title"><WandSparkles size={16}/>AI mode</div><div className="hint">Gemini operates the same editor tools.</div></div><button className="toggle" onClick={() => setAi(!ai)} aria-label="Toggle AI" style={{ opacity: ai ? 1 : .45 }} /></div>
        {ai ? <><div className="ai-context"><span>DESIGN CONTEXT</span><b>{elements.length} elements · 1080 × 1350</b></div><div className="agent-modes">{(['generate','edit','critique'] as AgentMode[]).map((mode) => <button key={mode} className={agentMode === mode ? 'active' : ''} onClick={() => setAgentMode(mode)}>{mode === 'generate' ? 'Generate' : mode === 'edit' ? 'Text → edit' : 'Critique'}</button>)}</div><textarea className="ai-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={agentMode === 'generate' ? 'Create a launch poster for a new sneaker…' : agentMode === 'critique' ? 'Critique this composition and suggest concrete fixes…' : 'Make the headline larger, tighter, and more premium…'} /><div className="ai-footer"><span className="hint">Gemini 3 Flash · {agentMode}</span><button className="primary" onClick={runAgent} disabled={busy || !prompt.trim()}>{busy ? 'Working…' : 'Run'}</button></div>{agentText && <div className="agent-result">{agentText}</div>}<DesignSystemPanel elements={elements} selectedId={selected} onApplyToken={applyToken} onCreateComponent={createComponent} onInstantiateComponent={instantiateComponent} /></aside>
    </div>
    {selectedElement && <div className="inspector"><b>{selectedElement.type}</b><span>x {Math.round(selectedElement.x)}</span><span>y {Math.round(selectedElement.y)}</span><span>{Math.round(selectedElement.width)} Ã {Math.round(selectedElement.height)}</span><span>{hydrated ? 'Autosaved' : 'Loadingâ¦'}</span></div>}
  </section>;
}
