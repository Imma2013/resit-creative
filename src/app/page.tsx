"use client";

import { useState } from "react";
import { CalendarDays, Clapperboard, Image, MessageSquare, Settings, Sparkles, Send, Upload, Plus } from "lucide-react";
import type { AppTab } from "@/lib/types";

const nav: { id: AppTab; label: string; icon: typeof Image }[] = [
  { id: "design", label: "Design", icon: Image },
  { id: "video", label: "Video", icon: Clapperboard },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "agent", label: "Agent", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Home() {
  const [tab, setTab] = useState<AppTab>("design");
  const [ai, setAi] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [agentMessages, setAgentMessages] = useState([{ role: "ai", text: "What are we creating today? I can design, edit video, generate media, or schedule content." }]);

  async function sendAgent() {
    if (!prompt.trim()) return;
    const current = prompt;
    setPrompt("");
    setAgentMessages((m) => [...m, { role: "user", text: current }]);
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: current }) });
      const data = await res.json();
      setAgentMessages((m) => [...m, { role: "ai", text: data.text || data.error || "I couldn't complete that request." }]);
    } catch {
      setAgentMessages((m) => [...m, { role: "ai", text: "Agent connection failed. Check your Gemini API configuration." }]);
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">R</div>
      {nav.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}><Icon size={19}/><span>{label}</span></button>)}
    </aside>
    <main className="main">
      <header className="topbar"><div className="top-title">Resit</div><div className="top-actions"><button className="ghost"><Upload size={15}/> Import</button><button className="primary"><Plus size={15}/> New</button></div></header>
      {tab === "design" && <DesignView ai={ai} setAi={setAi} prompt={prompt} setPrompt={setPrompt} />}
      {tab === "video" && <VideoView ai={ai} setAi={setAi} />}
      {tab === "calendar" && <CalendarView />}
      {tab === "agent" && <AgentView messages={agentMessages} prompt={prompt} setPrompt={setPrompt} sendAgent={sendAgent} />}
      {tab === "settings" && <SettingsView />}
    </main>
  </div>;
}

function Header({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="hero"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div></div>; }

function DesignView({ ai, setAi, prompt, setPrompt }: { ai: boolean; setAi: (v:boolean)=>void; prompt:string; setPrompt:(v:string)=>void }) { return <div className="content"><Header eyebrow="Canvas" title="Design" description="Create graphics, presentations, social posts and visual assets in one canvas."/><div className="tabs"><button className="tab active">All designs</button><button className="tab">Templates</button><button className="tab">Brand</button><button className="tab">Uploads</button></div><section className="surface workspace-grid"><div className="canvas-area"><div className="canvas"><div className="canvas-grid"/><div className="sample-card"><span>RESIT / CAMPAIGN 001</span><h2>Make something people remember.</h2><span>Design workspace · 1080 × 1350</span></div></div></div><aside className="ai-panel"><div className="ai-header"><div><div className="ai-title"><Sparkles size={15}/> AI mode</div><div className="hint">Agent operates the same editor tools.</div></div><button className="toggle" aria-label="Toggle AI" onClick={()=>setAi(!ai)} style={{opacity:ai?1:.45}}/></div>{ai ? <><div className="hint">Try: “Make the headline larger and add a bold subheading.”</div><div className="ai-prompt"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Tell Resit what to change..."/><div className="ai-footer"><span className="hint">Gemini 3 Flash</span><button className="primary"><Send size={14}/></button></div></div></> : <div className="hint">AI mode is off. Edit the canvas manually.</div>}</aside></section></div> }

function VideoView({ ai, setAi }: { ai:boolean; setAi:(v:boolean)=>void }) { return <div className="content"><Header eyebrow="Timeline" title="Video" description="Edit clips manually or let the agent operate the timeline with deterministic tools."/><section className="surface workspace-grid"><div className="canvas-area"><div className="canvas" style={{aspectRatio:"16/9",background:"#171717"}}><div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",color:"#777",fontSize:14}}>Video preview</div></div></div><aside className="ai-panel"><div className="ai-header"><div><div className="ai-title"><Sparkles size={15}/> AI mode</div><div className="hint">Palmier-inspired tool architecture.</div></div><button className="toggle" aria-label="Toggle AI" onClick={()=>setAi(!ai)} style={{opacity:ai?1:.45}}/></div><div className="hint">Ask the agent to cut silence, split clips, move scenes, add captions, or apply effects.</div></aside></section><section className="surface timeline"><div className="timeline-head"><span>Launch video</span><span>00:00 / 00:32</span></div><div className="track"><div className="clip a">Intro · 00:00–00:09</div><div className="clip b">Product demo · 00:09–00:21</div><div className="clip c">Outro · 00:21–00:32</div></div></section></div> }

function CalendarView() { const days=["Mon 10","Tue 11","Wed 12","Thu 13","Fri 14","Sat 15","Sun 16"]; return <div className="content"><Header eyebrow="Publishing" title="Calendar" description="Plan, schedule and publish your creative work across every connected channel."/><div className="tabs"><button className="tab active">Week</button><button className="tab">Month</button><button className="tab">List</button><button className="tab">Drafts</button></div><section className="calendar">{days.map((d,i)=><div className="day" key={d}><div className="day-num">{d}</div>{i===1&&<div className="post">X · Resit launch</div>}{i===2&&<><div className="post green">Instagram · New feature</div><div className="post">TikTok · Demo</div></>}{i===4&&<div className="post">YouTube · Product video</div>}</div>)}</section></div> }

function AgentView({ messages, prompt, setPrompt, sendAgent }: { messages:{role:string;text:string}[]; prompt:string; setPrompt:(v:string)=>void; sendAgent:()=>void }) { return <div className="content"><Header eyebrow="Command center" title="Agent" description="One agent for creation, editing, scheduling and publishing."/><div className="agent-layout"><section className="surface agent-chat"><div className="messages">{messages.map((m,i)=><div key={i} className={`msg ${m.role}`}>{m.text}</div>)}</div><div className="composer"><input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendAgent()} placeholder="Create a post, edit a video, make an image..."/><button className="primary" onClick={sendAgent}><Send size={15}/></button></div></section><aside className="surface side-card"><h3>Connected channels</h3>{["X / Twitter","Instagram","TikTok","YouTube","Facebook","LinkedIn"].map(x=><div className="connector" key={x}><span>{x}</span><span className="status">Ready</span></div>)}</aside></div></div> }

function SettingsView() { return <div className="content"><Header eyebrow="Workspace" title="Settings" description="Manage your account, AI providers, storage and connected publishing channels."/><section className="surface settings" style={{padding:"0 22px"}}>{[["Account","Firebase authentication and profile"],["AI provider","Gemini 3 Flash"],["Database","Convex real-time project state"],["Storage","Project assets and generated media"],["Social channels","X, Instagram, TikTok, YouTube, Facebook, LinkedIn"],["Open source","Project license, contributors and integrations"]].map(([a,b])=><div className="setting" key={a}><strong>{a}</strong><span>{b}</span></div>)}</section></div> }
