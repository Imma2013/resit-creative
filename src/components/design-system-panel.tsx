"use client";

import { useMemo, useState } from 'react';
import { Boxes, Check, Copy, Library, Sparkles } from 'lucide-react';
import { starterLibrary, type DesignComponent, type DesignToken } from '@/lib/design-system';
import type { DesignElement } from '@/lib/types';

type Props = {
  elements: DesignElement[];
  selectedId: string | null;
  onApplyToken: (token: DesignToken) => void;
  onCreateComponent: (component: DesignComponent) => void;
  onInstantiateComponent: (component: DesignComponent) => void;
};

export default function DesignSystemPanel({ elements, selectedId, onApplyToken, onCreateComponent, onInstantiateComponent }: Props) {
  const [tab, setTab] = useState<'tokens' | 'components'>('tokens');
  const [library, setLibrary] = useState(starterLibrary);
  const [componentName, setComponentName] = useState('Card');
  const selected = useMemo(() => elements.find((e) => e.id === selectedId), [elements, selectedId]);

  return <div className="design-system-panel">
    <div className="panel-title"><Library size={15}/> Design system <span>Resit Core</span></div>
    <div className="panel-tabs"><button className={tab === 'tokens' ? 'active' : ''} onClick={() => setTab('tokens')}>Tokens</button><button className={tab === 'components' ? 'active' : ''} onClick={() => setTab('components')}>Components</button></div>
    {tab === 'tokens' ? <div className="token-list">
      {library.tokens.map((token) => <button key={token.id} className="token-row" onClick={() => selected && onApplyToken(token)} disabled={!selected}>
        <span className="token-swatch" style={{ background: token.category === 'color' ? String(token.value) : undefined }}>{token.category === 'color' ? '' : token.category[0].toUpperCase()}</span>
        <span><b>{token.name}</b><small>{String(token.value)}</small></span><Check size={13}/>
      </button>)}
      {!selected && <div className="panel-empty"><Sparkles size={14}/> Select an element to apply a token.</div>}
    </div> : <div className="component-list">
      <div className="component-create"><input value={componentName} onChange={(e) => setComponentName(e.target.value)} /><button disabled={!selected} onClick={() => selected && onCreateComponent({ id: `cmp-${crypto.randomUUID()}`, name: componentName || 'Component', elementIds: [selected.id], variants: {} }); setLibrary((current) => ({ ...current, components: [...current.components, { id: `cmp-${crypto.randomUUID()}`, name: componentName || 'Component', elementIds: [selected.id], variants: {} }] }))}><Boxes size={13}/> Create</button></div>
      {library.components.map((component) => <div className="component-card" key={component.id}><div><b>{component.name}</b><small>{component.elementIds.length} layer(s)</small></div><button onClick={() => onInstantiateComponent(component)}><Copy size={13}/></button></div>)}
      {!library.components.length && <div className="panel-empty"><Boxes size={14}/> Components become reusable building blocks. Create one from a selection.</div>}
    </div>}
  </div>;
}
