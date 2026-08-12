'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenterHorizontal, AlignCenterVertical, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Frame, Grid3X3, ImagePlus, Layers, Minus, Plus, Redo2, RotateCw, Square, Trash2, Type, Undo2, WandSparkles } from 'lucide-react';
import type { AgentMode, DesignAction, DesignElement } from '@/lib/types';
import type { DesignComponent, DesignToken } from '@/lib/design-system';
import DesignSystemPanel from './design-system-panel';

type Props = { ai: boolean; setAi: (value: boolean) => void; prompt: string; setPrompt: (value: string) => void };
const CANVAS_W = 1080;
const CANVAS_H = 1350;
const GRID = 8;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.25;

type ResizeState = { id: string; edge: string; startX: number; startY: number; x: number; y: number; width: number; height: number; aspect: number };
type DragState = { ids: string[]; startX: number; startY: number; origins: Record<string, { x: number; y: number }> };

const starter: DesignElement[] = [
  { id: 'headline', type: 'text', x: 90, y: 170, width: 780, height: 150, text: 'Make something people remember.', style: { color: '#111', fontSize: 64, fontWeight: 800 }, zIndex: 2 },
  { id: 'subhead', type: 'text', x: 94, y: 340, width: 620, height: 70, text: 'Resit / Creative workspace', style: { color: '#777', fontSize: 24, fontWeight: 500 }, zIndex: 2 },
];

export default function DesignEditor({ ai, setAi, prompt, setPrompt }: Props) {
  const [elements, setElements] = useState<DesignElement[]>(starter);
  const [selected, setSelected] = useState<string[]>(['headline']);
  const [history, setHistory] = useState<DesignElement[][]>([]);
  const [future, setFuture] = useState<DesignElement[][]>([]);
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [agentText, setAgentText] = useState('');
  const [agentMode, setAgentMode] = useState<AgentMode>('edit');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const selectedElements = useMemo(() => elements.filter(e => selected.includes(e.id)), [elements, selected]);
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const bounds = useMemo(() => {
    if (!selectedElements.length) return null;
    const x = Math.min(...selectedElements.map(e => e.x));
    const y = Math.min(...selectedElements.map(e => e.y));
    const right = Math.max(...selectedElements.map(e => e.x + e.width));
    const bottom = Math.max(...selectedElements.map(e => e.y + e.height));
    return { x, y, width: right - x, height: bottom - y };
  }, [selectedElements]);

  const commit = (next: DesignElement[]) => {
    setHistory(h => [...h.slice(-39), elements]);
    setFuture([]);
    setElements(next);
  };
  const updateTransient = (fn: (current: DesignElement[]) => DesignElement[]) => setElements(current => fn(current));
  const snapValue = (v: number) => snap ? Math.round(v / GRID) * GRID : v;
  const select = (id: string, additive = false) => setSelected(s => additive ? (s.includes(id) ? s.filter(x => x !== id) : [...s, id]) : [id]);

  const applyActions = (actions: DesignAction[]) => {
    let next = [...elements];
    let newSelection = [...selected];
    for (const action of actions) {
      const a = action.args;
      if (action.name === 'design.add_frame') {
        const id = `frame-${crypto.randomUUID()}`;
        next.push({ id, type: 'frame', x: Number(a.x ?? 80), y: Number(a.y ?? 80), width: Number(a.width ?? 880), height: Number(a.height ?? 1100), text: String(a.name ?? 'Frame'), style: { background: String(a.background ?? '#fff'), color: '#111', borderRadius: 24 }, layout: { mode: (['horizontal','vertical'].includes(String(a.layout)) ? String(a.layout) : 'none') as 'none'|'horizontal'|'vertical', gap: Number(a.gap ?? 16), padding: Number(a.padding ?? 24), align: 'start' }, constraints: { horizontal: 'left', vertical: 'top' }, zIndex: 0 });
        newSelection = [id];
      } else if (action.name === 'design.align') {
        const ids = Array.isArray(a.elementIds) && a.elementIds.length ? a.elementIds.map(String) : selected;
        const picked = next.filter(e => ids.includes(e.id));
        if (picked.length > 1) {
          const axis = String(a.axis), minX = Math.min(...picked.map(e => e.x)), minY = Math.min(...picked.map(e => e.y)), maxR = Math.max(...picked.map(e => e.x + e.width)), maxB = Math.max(...picked.map(e => e.y + e.height));
          const cx = (minX + maxR) / 2, cy = (minY + maxB) / 2;
          next = next.map(e => ids.includes(e.id) ? { ...e, ...(axis === 'x' ? { x: String(a.mode ?? 'center') === 'start' ? minX : String(a.mode ?? 'center') === 'end' ? maxR - e.width : cx - e.width / 2 } : { y: String(a.mode ?? 'center') === 'start' ? minY : String(a.mode ?? 'end') === 'end' ? maxB - e.height : cy - e.height / 2 }) } : e);
        }
      } else if (action.name === 'design.distribute') {
        const ids = Array.isArray(a.elementIds) ? a.elementIds.map(String) : selected;
        const picked = next.filter(e => ids.includes(e.id)).sort((x,y) => (String(a.axis) === 'x' ? x.x-y.x : x.y-y.y));
        if (picked.length > 2) {
          const axis = String(a.axis), first = picked[0], last = picked[picked.length-1], span = axis === 'x' ? last.x-first.x : last.y-first.y, step = span/(picked.length-1);
          next = next.map(e => { const i=picked.findIndex(p=>p.id===e.id); return i<0 ? e : { ...e, ...(axis==='x'?{x:first.x+step*i}:{y:first.y+step*i}) }; });
        }
      } else if (action.name === 'design.rotate') {
        const ids = Array.isArray(a.elementIds) && a.elementIds.length ? a.elementIds.map(String) : selected;
        next = next.map(e => ids.includes(e.id) ? { ...e, rotation: Number(e.rotation ?? 0) + Number(a.degrees ?? 0) } : e);
      } else if (action.name === 'design.set_layout') {
        next = next.map(e => e.id === a.frameId ? { ...e, layout: { mode: String(a.mode) as 'none'|'horizontal'|'vertical', gap: Number(a.gap ?? e.layout?.gap ?? 16), padding: Number(a.padding ?? e.layout?.padding ?? 24), align: String(a.align ?? e.layout?.align ?? 'start') as 'start'|'center'|'end'|'stretch' } } : e);
      } else if (action.name === 'design.set_constraints') {
        next = next.map(e => e.id === a.elementId ? { ...e, constraints: { horizontal: String(a.horizontal) as 'left'|'right'|'center'|'scale', vertical: String(a.vertical) as 'top'|'bottom'|'center'|'scale' } } : e);
      } else if (action.name === 'design.add_element') {
        const id=`el-${crypto.randomUUID()}`; next.push({ id, type: (a.type as DesignElement['type']) || 'shape', x:Number(a.x??120), y:Number(a.y??120), width:Number(a.width??420), height:Number(a.height??220), text:a.text as string|undefined, style:{background:String(a.background??'#111'),color:String(a.color??'#fff'),fontSize:Number(a.fontSize??42),fontWeight:Number(a.fontWeight??700)}, zIndex:Math.max(0,...next.map(e=>e.zIndex??0))+1}); newSelection=[id];
      } else if (action.name === 'design.update_element') {
        next=next.map(e=>e.id===a.id?{...e,text:a.text!==undefined?String(a.text):e.text,style:{...e.style,...(a.background?{background:String(a.background)}:{}),...(a.color?{color:String(a.color)}:{}),...(a.fontSize?{fontSize:Number(a.fontSize)}:{}),...(a.fontWeight?{fontWeight:Number(a.fontWeight)}:{})}}:e);
      } else if (action.name === 'design.move_element') next=next.map(e=>e.id===a.id?{...e,x:Number(a.x),y:Number(a.y)}:e);
      else if (action.name === 'design.resize_element') next=next.map(e=>e.id===a.id?{...e,width:Number(a.width),height:Number(a.height)}:e);
      else if (action.name === 'design.delete_element') next=next.filter(e=>e.id!==a.id);
      else if (action.name === 'design.apply_token') { const token=String(a.token??''); next=next.map(e=>e.id===a.elementId?{...e,style:{...e.style,...(a.property==='color'?{color:token}:a.property==='background'?{background:token}:{})}}:e); }
      else if (action.name === 'design.edit_selection') { const instruction=String(a.instruction??'').toLowerCase(), ids=Array.isArray(a.elementIds)&&a.elementIds.length?a.elementIds.map(String):selected; next=next.map(e=>{if(!ids.includes(e.id))return e; const style={...e.style}; let w=e.width,h=e.height,x=e.x,y=e.y;if(instruction.includes('larger')||instruction.includes('bigger')){w*=1.15;h*=1.15;style.fontSize=Number(style.fontSize??32)*1.15}if(instruction.includes('smaller')){w*=.9;h*=.9;style.fontSize=Number(style.fontSize??32)*.9}if(instruction.includes('bold'))style.fontWeight=800;if(instruction.includes('center'))x=(CANVAS_W-w)/2;if(instruction.includes('top'))y=80;if(instruction.includes('bottom'))y=CANVAS_H-h-80;return{...e,x,y,width:w,height:h,style}}); }
      else if (action.name === 'design.generate_layout') { const brief=String(a.brief??'New creative'), id=()=>`el-${crypto.randomUUID()}`; next=[...next,{id:id(),type:'shape',x:0,y:0,width:CANVAS_W,height:CANVAS_H,style:{background:'#f3f1ec'},zIndex:0},{id:id(),type:'text',x:90,y:190,width:820,height:150,text:brief.slice(0,80),style:{color:'#111',fontSize:64,fontWeight:800},zIndex:2},{id:id(),type:'text',x:94,y:370,width:650,height:90,text:'Generated in Resit · editable structure',style:{color:'#666',fontSize:22,fontWeight:500},zIndex:2}]; }
      else if (action.name === 'design.create_variant') setAgentText(`Variant “${String(a.name??'Variant')}” is ready to attach to the component.`);
      else if (action.name === 'design.critique_selection') setAgentText('Critique mode is active. The agent should return concrete hierarchy, spacing, typography, and contrast fixes without changing the canvas.');
    }
    if(actions.length){setElements(next);setHistory(h=>[...h.slice(-39),elements]);setFuture([]);setSelected(newSelection)}
  };

  const applyToken=(token:DesignToken)=>{if(!selectedElement)return;commit(elements.map(e=>e.id!==selectedElement.id?e:{...e,style:{...e.style,...(token.category==='color'?{color:token.value}:token.category==='typography'?{fontSize:token.value}:token.category==='radius'?{borderRadius:token.value}:token.category==='spacing'?{padding:token.value}:{})}}));setAgentText(`Applied ${token.name}.`)};
  const createComponent=(component:DesignComponent)=>setAgentText(`Created reusable component “${component.name}” from ${component.elementIds.length} layer(s).`);
  const instantiateComponent=(component:DesignComponent)=>{const source=elements.find(e=>component.elementIds.includes(e.id));if(!source)return;const copy={...source,id:`el-${crypto.randomUUID()}`,x:source.x+40,y:source.y+40};commit([...elements,copy]);setSelected([copy.id]);setAgentText(`Instantiated ${component.name}.`)};

  const runAgent=async()=>{if(!prompt.trim()||busy)return;setBusy(true);setAgentText('');try{const res=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,context:{surface:'design',mode:agentMode,canvas:{width:CANVAS_W,height:CANVAS_H},selectedId:selected[0]??null,selectedIds:selected,elements,designSystem:'Resit Core tokens + reusable components'}})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Agent failed');applyActions(data.actions??[]);setAgentText(data.text||`${(data.actions??[]).length} editor operation${(data.actions??[]).length===1?'':'s'} applied.`);setPrompt('')}catch(error){setAgentText(error instanceof Error?error.message:'Agent failed')}finally{setBusy(false)}};

  useEffect(()=>{let cancelled=false;fetch('/api/design').then(async r=>{if(!r.ok)throw new Error((await r.json()).error||'Failed to load design');return r.json()}).then(data=>{if(cancelled)return;setProjectId(data.project.id);if(Array.isArray(data.document?.elements))setElements(data.document.elements as DesignElement[]);setHydrated(true)}).catch(error=>{if(!cancelled){setAgentText(error instanceof Error?error.message:'Failed to load design');setHydrated(true)}});return()=>{cancelled=true}},[]);
  useEffect(()=>{if(!hydrated||!projectId)return;if(saveTimer.current)clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>{fetch('/api/design',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,elements,width:CANVAS_W,height:CANVAS_H})}).catch(()=>setAgentText('Autosave failed. Your local edits are still in this session.'))},450);return()=>{if(saveTimer.current)clearTimeout(saveTimer.current)}},[elements,hydrated,projectId]);

  const undo=()=>{const p=history.at(-1);if(!p)return;setFuture(f=>[...f,elements]);setHistory(h=>h.slice(0,-1));setElements(p)};
  const redo=()=>{const n=future.at(-1);if(!n)return;setHistory(h=>[...h,elements]);setFuture(f=>f.slice(0,-1));setElements(n)};
  const duplicate=()=>{if(!selectedElements.length)return;const copies=selectedElements.map(e=>({...e,id:`el-${crypto.randomUUID()}`,x:e.x+24,y:e.y+24,zIndex:(e.zIndex??0)+1}));commit([...elements,...copies]);setSelected(copies.map(e=>e.id));};
  const remove=()=>{if(!selected.length)return;commit(elements.filter(e=>!selected.includes(e.id)));setSelected([])};
  const nudge=(dx:number,dy:number)=>{if(!selected.length)return;commit(elements.map(e=>selected.includes(e.id)?{...e,x:Math.max(0,Math.min(CANVAS_W-e.width,e.x+dx)),y:Math.max(0,Math.min(CANVAS_H-e.height,e.y+dy))}:e))};
  const zOrder=(direction:'front'|'back'|'forward'|'backward')=>{if(!selected.length)return;const ordered=[...elements].sort((a,b)=>(a.zIndex??0)-(b.zIndex??0));const max=Math.max(0,...ordered.map(e=>e.zIndex??0)),min=Math.min(0,...ordered.map(e=>e.zIndex??0));commit(elements.map(e=>{if(!selected.includes(e.id))return e;const z=e.zIndex??0;return{...e,zIndex:direction==='front'?max+1:direction==='back'?min-1:direction==='forward'?z+1:z-1}}))};

  useEffect(()=>{const key=(e:KeyboardEvent)=>{const target=e.target as HTMLElement;if(['INPUT','TEXTAREA'].includes(target.tagName))return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();return}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();return}if(e.key==='Escape'){setSelected([]);return}const d=e.shiftKey?8:1;if(e.key==='ArrowLeft'){e.preventDefault();nudge(-d,0)}if(e.key==='ArrowRight'){e.preventDefault();nudge(d,0)}if(e.key==='ArrowUp'){e.preventDefault();nudge(0,-d)}if(e.key==='ArrowDown'){e.preventDefault();nudge(0,d)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[elements,selected,history,future]);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{if(e.code==='Space'&&!e.repeat){e.preventDefault();setSpaceDown(true)}};const up=(e:KeyboardEvent)=>{if(e.code==='Space')setSpaceDown(false)};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[]);

  const uploadImage=async(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';if(!file||!file.type.startsWith('image/')){setAgentText('Please choose an image file.');return}if(!projectId){setAgentText('Save the design first, then upload an image.');return}setAgentText('Uploading image…');const form=new FormData();form.append('file',file);form.append('projectId',projectId);try{const r=await fetch('/api/assets',{method:'POST',body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||'Upload failed');const id=`el-${crypto.randomUUID()}`;commit([...elements,{id,type:'image',x:120,y:420,width:640,height:480,src:d.asset.url,style:{objectFit:'cover'},zIndex:Math.max(0,...elements.map(e=>e.zIndex??0))+1}]);setSelected([id]);setAgentText('Image added to the canvas.')}catch(error){setAgentText(error instanceof Error?error.message:'Image upload failed.')}};
  const addText=()=>{const id=`el-${crypto.randomUUID()}`;commit([...elements,{id,type:'text',x:120,y:520,width:520,height:80,text:'New headline',style:{color:'#111',fontSize:42,fontWeight:700},zIndex:Math.max(0,...elements.map(e=>e.zIndex??0))+1}]);setSelected([id])};
  const addShape=()=>{const id=`el-${crypto.randomUUID()}`;commit([...elements,{id,type:'shape',x:120,y:620,width:360,height:220,style:{background:'#111',borderRadius:0},zIndex:Math.max(0,...elements.map(e=>e.zIndex??0))+1}]);setSelected([id])};

  const stagePoint=(clientX:number,clientY:number)=>{const r=stageRef.current?.getBoundingClientRect();if(!r)return{x:0,y:0};return{x:(clientX-r.left-pan.x-(r.width-CANVAS_W*zoom)/2)/zoom,y:(clientY-r.top-pan.y-(r.height-CANVAS_H*zoom)/2)/zoom}};
  const onCanvasDown=(e:React.PointerEvent)=>{if(spaceDown||e.button===1){setPanStart({x:e.clientX,y:e.clientY,px:pan.x,py:pan.y});return}if(e.target===e.currentTarget){const p=stagePoint(e.clientX,e.clientY);setMarquee({x:p.x,y:p.y,w:0,h:0});setSelected([])}};
  const onCanvasMove=(e:React.PointerEvent)=>{if(panStart){setPan({x:panStart.px+e.clientX-panStart.x,y:panStart.py+e.clientY-panStart.y});return}if(marquee){const p=stagePoint(e.clientX,e.clientY);setMarquee({x:Math.min(marquee.x,p.x),y:Math.min(marquee.y,p.y),w:Math.abs(p.x-marquee.x),h:Math.abs(p.y-marquee.y)});return}}
  const onCanvasUp=()=>{if(marquee){const m=marquee;const ids=elements.filter(e=>e.x<m.x+m.w&&e.x+e.width>m.x&&e.y<m.y+m.h&&e.y+e.height>m.y).map(e=>e.id);setSelected(ids);setMarquee(null)}setPanStart(null)};
  const onElementDown=(e:React.PointerEvent,el:DesignElement)=>{e.stopPropagation();if(spaceDown)return;select(el.id,e.shiftKey);const ids=e.shiftKey&&selected.includes(el.id)?selected:[el.id];setDrag({ids,startX:e.clientX,startY:e.clientY,origins:Object.fromEntries(ids.map(id=>{const x=elements.find(x=>x.id===id)!;return[id,{x:x.x,y:x.y}]}))})};
  const onDragMove=(e:React.PointerEvent)=>{if(!drag)return;const dx=(e.clientX-drag.startX)/zoom,dy=(e.clientY-drag.startY)/zoom;updateTransient(cur=>cur.map(el=>drag.ids.includes(el.id)?{...el,x:snapValue(drag.origins[el.id].x+dx),y:snapValue(drag.origins[el.id].y+dy)}:el))};
  const onDragUp=()=>{if(drag){setHistory(h=>[...h.slice(-39),elements]);setFuture([]);setDrag(null)}};
  const beginResize=(e:React.PointerEvent,el:DesignElement,edge:string)=>{e.stopPropagation();setResize({id:el.id,edge,startX:e.clientX,startY:e.clientY,x:el.x,y:el.y,width:el.width,height:el.height,aspect:el.width/el.height})};
  const onResizeMove=(e:React.PointerEvent)=>{if(!resize)return;const dx=(e.clientX-resize.startX)/zoom,dy=(e.clientY-resize.startY)/zoom;let {x,y,width,height}=resize;const edge=resize.edge;if(edge.includes('e'))width=Math.max(24,resize.width+dx);if(edge.includes('s'))height=Math.max(24,resize.height+dy);if(edge.includes('w')){width=Math.max(24,resize.width-dx);x=resize.x+dx}if(edge.includes('n')){height=Math.max(24,resize.height-dy);y=resize.y+dy}if(e.shiftKey){if(Math.abs(dx)>Math.abs(dy))height=width/resize.aspect;else width=height*resize.aspect}updateTransient(cur=>cur.map(el=>el.id===resize.id?{...el,x:snapValue(x),y:snapValue(y),width:snapValue(width),height:snapValue(height)}:el))};
  const onResizeUp=()=>{if(resize){setHistory(h=>[...h.slice(-39),elements]);setFuture([]);setResize(null)}};
  const onRotateDown=(e:React.PointerEvent,el:DesignElement)=>{e.stopPropagation();const center=stagePoint(e.currentTarget.getBoundingClientRect().left,e.currentTarget.getBoundingClientRect().top);const start=Math.atan2(e.clientY-(center.y*zoom),e.clientX-(center.x*zoom));const base=Number(el.rotation??0);const move=(ev:PointerEvent)=>{const r=stageRef.current?.getBoundingClientRect();if(!r)return;const cx=r.left+(r.width-CANVAS_W*zoom)/2+(el.x+el.width/2)*zoom+pan.x,cy=r.top+(r.height-CANVAS_H*zoom)/2+(el.y+el.height/2)*zoom+pan.y;let deg=base+(Math.atan2(ev.clientY-cy,ev.clientX-cx)-start)*180/Math.PI;if(ev.shiftKey)deg=Math.round(deg/15)*15;setElements(cur=>cur.map(x=>x.id===el.id?{...x,rotation:deg}:x))};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);setHistory(h=>[...h.slice(-39),elements]);setFuture([])};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)};
  const wheel=(e:React.WheelEvent)=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(z=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z*(e.deltaY>0?.92:1.08))))}else setPan(p=>({x:p.x-e.deltaX,y:p.y-e.deltaY}))};
  const directPatch=(field:string,value:string)=>{if(!selectedElement)return;const n=Number(value);if(!Number.isFinite(n))return;const next={...selectedElement,...(field==='x'?{x:n}:field==='y'?{y:n}:field==='width'?{width:Math.max(1,n)}:field==='height'?{height:Math.max(1,n)}:field==='rotation'?{rotation:n}:{}),style:{...selectedElement.style,...(field==='opacity'?{opacity:n}:field==='radius'?{borderRadius:n}:field==='fill'?{background:value}:field==='stroke'?{border:value}:{})}};setElements(cur=>cur.map(e=>e.id===next.id?next:e))};

  return <section className="design-editor surface">
    <div className="editor-toolbar">
      <div className="tool-group"><button className="icon-btn" onClick={undo} disabled={!history.length}><Undo2 size={16}/></button><button className="icon-btn" onClick={redo} disabled={!future.length}><Redo2 size={16}/></button><span className="editor-divider"/></div>
      <div className="tool-group"><button className="editor-tool" onClick={addText}><Type size={15}/>Text</button><label className="editor-tool"><ImagePlus size={15}/>Image<input type="file" accept="image/*" onChange={uploadImage} hidden/></label><button className="editor-tool" onClick={addShape}><Square size={15}/>Shape</button><button className="editor-tool" onClick={()=>applyActions([{name:'design.add_frame',args:{name:'Frame',x:60,y:60,width:900,height:1120,layout:'vertical'}}])}><Frame size={15}/>Frame</button><button className={`editor-tool ${snap?'active-tool':''}`} onClick={()=>setSnap(v=>!v)}>Snap</button><button className={`editor-tool ${grid?'active-tool':''}`} onClick={()=>setGrid(v=>!v)}><Grid3X3 size={14}/></button></div>
      <div className="tool-group"><button className="icon-btn" title="Bring forward" onClick={()=>zOrder('forward')} disabled={!selected.length}><ArrowUp size={14}/></button><button className="icon-btn" title="Send backward" onClick={()=>zOrder('backward')} disabled={!selected.length}><ArrowDown size={14}/></button><button className="icon-btn" title="Duplicate" onClick={duplicate} disabled={!selected.length}><Copy size={14}/></button><button className="icon-btn danger-icon" title="Delete" onClick={remove} disabled={!selected.length}><Trash2 size={14}/></button></div>
      <div className="zoom-controls"><button className="icon-btn" onClick={()=>setZoom(z=>Math.max(MIN_ZOOM,z-.05))}><Minus size={14}/></button><span>{Math.round(zoom*100)}%</span><button className="icon-btn" onClick={()=>setZoom(z=>Math.min(MAX_ZOOM,z+.05))}><Plus size={14}/></button></div>
    </div>
    <div className="editor-main">
      <div ref={stageRef} className={`canvas-stage ${spaceDown?'panning':''}`} onPointerDown={onCanvasDown} onPointerMove={e=>{onCanvasMove(e);onDragMove(e);onResizeMove(e)}} onPointerUp={e=>{onCanvasUp();onDragUp();onResizeUp()}} onWheel={wheel}>
        <div className="canvas-ruler top">{Array.from({length:14},(_,i)=><span key={i} style={{left:i*80*zoom}}>{i*80}</span>)}</div>
        <div className="canvas-ruler left">{Array.from({length:17},(_,i)=><span key={i} style={{top:i*80*zoom}}>{i*80}</span>)}</div>
        <div className="design-canvas" data-design-canvas="true" onPointerDown={e=>{if(spaceDown||e.button===1){setPanStart({x:e.clientX,y:e.clientY,px:pan.x,py:pan.y});return}if(e.target===e.currentTarget){const p=stagePoint(e.clientX,e.clientY);setMarquee({x:p.x,y:p.y,w:0,h:0});setSelected([])}}} style={{width:CANVAS_W*zoom,height:CANVAS_H*zoom,transform:`translate(${pan.x}px,${pan.y}px)`,backgroundImage:grid?'linear-gradient(to right, rgba(0,0,0,.055) 1px, transparent 1px),linear-gradient(to bottom, rgba(0,0,0,.055) 1px, transparent 1px)':undefined,backgroundSize:grid?`${GRID*zoom}px ${GRID*zoom}px`:undefined}}>
          {[...elements].sort((a,b)=>(a.zIndex??0)-(b.zIndex??0)).map(element=><div key={element.id} className={`design-element ${selected.includes(element.id)?'selected':''}`} onPointerDown={e=>onElementDown(e,element)} style={{left:element.x*zoom,top:element.y*zoom,width:element.width*zoom,height:element.height*zoom,background:(element.type==='shape'||element.type==='frame')?String(element.style?.background??'#111'):'transparent',color:String(element.style?.color??'#111'),fontSize:Number(element.style?.fontSize??32)*zoom,fontWeight:Number(element.style?.fontWeight??500),transform:`rotate(${Number(element.rotation??0)}deg)`,borderRadius:element.style?.borderRadius as string|number|undefined,zIndex:element.zIndex??1,opacity:Number(element.style?.opacity??1)}}>{element.type==='image'&&element.src?<img src={element.src} alt={element.text??'Canvas asset'} draggable={false} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:element.text}{element.type==='frame'&&<span className="frame-label">{element.text}</span>}{selected.includes(element.id)&&selected.length===1&&<><span className="rotate-handle" onPointerDown={e=>onRotateDown(e,element)}/>{['nw','n','ne','e','se','s','sw','w'].map(edge=><span key={edge} className={`resize-handle rh-${edge}`} onPointerDown={e=>beginResize(e,element,edge)}/>)}</>}</div>)}
          {bounds&&selected.length>1&&<div className="multi-selection" style={{left:bounds.x*zoom,top:bounds.y*zoom,width:bounds.width*zoom,height:bounds.height*zoom}}/>}
          {marquee&&<div className="marquee" style={{left:marquee.x*zoom,top:marquee.y*zoom,width:marquee.w*zoom,height:marquee.h*zoom}}/>}
        </div>
      </div>
      <aside className="editor-side">
        <div className="side-tabs"><span className="active">Design</span><span>Prototype</span></div>
        {selectedElement?<div className="properties"><div className="properties-title"><Layers size={14}/><b>{selectedElement.type}</b><span>{selected.length>1?`${selected.length} selected`:''}</span></div><div className="property-grid">{(['x','y','width','height','rotation'] as const).map(f=><label key={f}>{f.toUpperCase()}<input value={Math.round(Number(f==='x'?selectedElement.x:f==='y'?selectedElement.y:f==='width'?selectedElement.width:f==='height'?selectedElement.height:selectedElement.rotation??0))} onChange={e=>directPatch(f,e.target.value)}/></label>)}</div><div className="property-grid"><label>OPACITY<input value={Number(selectedElement.style?.opacity??1)} step="0.05" min="0" max="1" type="number" onChange={e=>directPatch('opacity',e.target.value)}/></label><label>RADIUS<input value={Number(selectedElement.style?.borderRadius??0)} type="number" onChange={e=>directPatch('radius',e.target.value)}/></label></div>{selectedElement.type!=='text'&&<label className="property-wide">FILL<input type="text" value={String(selectedElement.style?.background??'#ffffff')} onChange={e=>directPatch('fill',e.target.value)}/></label>}<div className="align-row"><button className="icon-btn" onClick={()=>applyActions([{name:'design.align',args:{elementIds:selected,axis:'x',mode:'start'}}])}><ArrowLeft size={14}/></button><button className="icon-btn" onClick={()=>applyActions([{name:'design.align',args:{elementIds:selected,axis:'x',mode:'center'}}])}><AlignCenterHorizontal size={14}/></button><button className="icon-btn" onClick={()=>applyActions([{name:'design.align',args:{elementIds:selected,axis:'x',mode:'end'}}])}><ArrowRight size={14}/></button><button className="icon-btn" onClick={()=>applyActions([{name:'design.align',args:{elementIds:selected,axis:'y',mode:'start'}}])}><ArrowUp size={14}/></button><button className="icon-btn" onClick={()=>applyActions([{name:'design.align',args:{elementIds:selected,axis:'y',mode:'center'}}])}><AlignCenterVertical size={14}/></button><button className="icon-btn" onClick={()=>applyActions([{name:'design.align',args:{elementIds:selected,axis:'y',mode:'end'}}])}><ArrowDown size={14}/></button></div></div>:<div className="no-selection">Select an element to edit its properties.</div>}
        <div className="side-section"><div className="section-title">AI <span>Gemini 3 Flash</span></div><div className="agent-modes">{(['generate','edit','critique'] as AgentMode[]).map(mode=><button key={mode} className={agentMode===mode?'active':''} onClick={()=>setAgentMode(mode)}>{mode==='generate'?'Generate':mode==='edit'?'Text → edit':'Critique'}</button>)}</div><textarea className="ai-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={agentMode==='generate'?'Create a launch poster…':agentMode==='critique'?'Critique this composition…':'Make the selected headline more premium…'}/><button className="primary ai-run" onClick={runAgent} disabled={busy||!prompt.trim()}><WandSparkles size={14}/>{busy?'Working…':'Run agent'}</button>{agentText&&<div className="agent-result">{agentText}</div>}</div>
        <DesignSystemPanel elements={elements} selectedId={selected[0]??null} onApplyToken={applyToken} onCreateComponent={createComponent} onInstantiateComponent={instantiateComponent}/>
      </aside>
    </div>
    <div className="inspector"><b>{selected.length?`${selected.length} selected`:'No selection'}</b><span>{hydrated?'Autosaved':'Loading…'}</span><span>Space + drag to pan</span><span>Shift = multi-select / proportional resize</span></div>
  </section>;
}
