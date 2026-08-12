'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Minus, Plus, Redo2, Square, Trash2, Type, Undo2, WandSparkles } from 'lucide-react';
import type { DesignAction, DesignElement } from '@/lib/types';

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
  const drag = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const selectedElement = useMemo(() => elements.find((e) => e.id === selected) ?? null, [elements, selected]);
  const commit = (next: DesignElement[]) => { setHistory((h) => [...h.slice(-39), elements]); setFuture([]); setElements(next); };
  const patch = (id: string, update: Partial<DesignElement>) => commit(elements.map((e) => e.id === id ? { ...e, ...update } : e));

  const applyActions = (actions: DesignAction[]) => {
    let next = [...elements];
    for (const action of actions) {
      const a = action.args;
      if (action.name === 'design.add_element') {
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
      }
    }
    if (actions.some((a) => a.name.startsWith('design.'))) commit(next);
  };

  const runAgent = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true); setAgentText('');
    try {
      const res = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context: { surface: 'design', canvas: { width: CANVAS_W, height: CANVAS_H }, elements } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent failed');
      applyActions(data.actions ?? []);
      setAgentText(data.text || `${(data.actions ?? []).length} editor operation${(data.actions ?? []).length === 1 ? '' : 's'} applied.`);
      setPrompt('');
    } catch (error) { setAgentText(error instanceof Error ? error.message : 'Agent failed'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      const { id, offsetX, offsetY } = drag.current;
      const rect = (event.currentTarget as Window).document.querySelector('[data-design-canvas="true"]')?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(CANVAS_W - 20, (event.clientX - rect.left) / zoom - offsetX));
      const y = Math.max(0, Math.min(CANVAS_H - 20, (event.clientY - rect.top) / zoom - offsetY));
      setElements((current) => current.map((e) => e.id === id ? { ...e, x, y } : e));
    };
    const up = () => {
      if (drag.current) { setHistory((h) => [...h.slice(-39), elements]); setFuture([]); drag.current = null; }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [elements, zoom]);

  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((f) => [...f, elements]); setHistory((h) => h.slice(0, -1)); setElements(previous); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory((h) => [...h, elements]); setFuture((f) => f.slice(0, -1)); setElements(next); };
  const addText = () => commit([...elements, { id: `el-${crypto.randomUUID()}`, type: 'text', x: 120, y: 520, width: 520, height: 80, text: 'New headline', style: { color: '#111', fontSize: 42, fontWeight: 700 } }]);
  const addShape = () => commit([...elements, { id: `el-${crypto.randomUUID()}`, type: 'shape', x: 120, y: 620, width: 360, height: 220, style: { background: '#111' } }]);
  const duplicate = () => { if (!selectedElement) return; const copy = { ...selectedElement, id: `el-${crypto.randomUUID()}`, x: selectedElement.x + 24, y: selectedElement.y + 24 }; commit([...elements, copy]); setSelected(copy.id); };
  const remove = () => { if (selected) { commit(elements.filter((e) => e.id !== selected)); setSelected(null); } };

  return <section className="design-editor surface">
    <div className="editor-toolbar">
      <div className="tool-group"><button className="icon-btn" onClick={undo} disabled={!history.length}><Undo2 size={16}/></button><button className="icon-btn" onClick={redo} disabled={!future.length}><Redo2 size={16}/></button></div>
      <div className="tool-group"><button className="editor-tool" onClick={addText}><Type size={15}/>Text</button><button className="editor-tool" onClick={addShape}><Square size={15}/>Shape</button><button className="editor-tool" onClick={duplicate} disabled={!selectedElement}><Copy size={15}/>Duplicate</button><button className="editor-tool danger" onClick={remove} disabled={!selectedElement}><Trash2 size={15}/>Delete</button></div>
      <div className="zoom-controls"><button className="icon-btn" onClick={() => setZoom(Math.max(.35, zoom-.05))}><Minus size={14}/></button><span>{Math.round(zoom*100)}%</span><button className="icon-btn" onClick={() => setZoom(Math.min(.9, zoom+.05))}><Plus size={14}/></button></div>
    </div>
    <div className="editor-main">
      <div className="canvas-stage"><div className="design-canvas" data-design-canvas="true" style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}>
        {elements.map((element) => <div key={element.id} onPointerDown={(event) => { event.stopPropagation(); setSelected(element.id); const rect = event.currentTarget.getBoundingClientRect(); drag.current = { id: element.id, offsetX: (event.clientX-rect.left)/zoom, offsetY: (event.clientY-rect.top)/zoom }; }} className={`design-element ${selected === element.id ? 'selected' : ''}`} style={{ left: element.x*zoom, top: element.y*zoom, width: element.width*zoom, height: element.height*zoom, background: element.type === 'shape' ? String(element.style?.background ?? '#111') : 'transparent', color: String(element.style?.color ?? '#111'), fontSize: Number(element.style?.fontSize ?? 32)*zoom, fontWeight: Number(element.style?.fontWeight ?? 500) }}>{element.text}</div>)}
      </div></div>
      <aside className={`editor-ai ${ai ? 'on' : ''}`}>
        <div className="ai-header"><div><div className="ai-title"><WandSparkles size={16}/>AI mode</div><div className="hint">Gemini operates the same editor tools.</div></div><button className="toggle" onClick={() => setAi(!ai)} aria-label="Toggle AI" style={{ opacity: ai ? 1 : .45 }} /></div>
        {ai ? <><div className="ai-context"><span>DESIGN CONTEXT</span><b>{elements.length} elements · 1080 × 1350</b></div><textarea className="ai-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Make the headline larger and add a bold black shape behind it…" /><div className="ai-footer"><span className="hint">Gemini 3 Flash</span><button className="primary" onClick={runAgent} disabled={busy || !prompt.trim()}>{busy ? 'Working…' : 'Run'}</button></div>{agentText && <div className="agent-result">{agentText}</div>}</> : <div className="ai-off">AI mode is off. Edit the canvas manually.</div>}
      </aside>
    </div>
    {selectedElement && <div className="inspector"><b>{selectedElement.type}</b><span>x {Math.round(selectedElement.x)}</span><span>y {Math.round(selectedElement.y)}</span><span>{Math.round(selectedElement.width)} × {Math.round(selectedElement.height)}</span></div>}
  </section>;
}
