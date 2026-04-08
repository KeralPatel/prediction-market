"use client";

import { useState, useEffect } from "react";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const countryFlags: Record<string, string> = {
  US:"🇺🇸",EU:"🇪🇺",GB:"🇬🇧",JP:"🇯🇵",CN:"🇨🇳",DE:"🇩🇪",
  FR:"🇫🇷",CA:"🇨🇦",AU:"🇦🇺",CH:"🇨🇭",IN:"🇮🇳",BR:"🇧🇷",
  KR:"🇰🇷",MX:"🇲🇽",SG:"🇸🇬",ES:"🇪🇸",IT:"🇮🇹",
};

const impactColor: Record<string, string> = {
  high:   "#ef4444",
  medium: "#f59e0b",
  low:    "#3b82f6",
};

interface CalEvent {
  time:      string;
  country:   string;
  name:      string;
  period:    string;
  actual:    string;
  prev:      string;
  consensus: string;
  forecast:  string;
}

// Static calendar data – extend with a live API (e.g. TradingEconomics) later
const staticEvents: Record<string, CalEvent[]> = {
  "2026-04-06": [
    {time:"02:00 PM",country:"US",name:"ISM Services PMI",period:"MAR",actual:"54.0",prev:"56.1",consensus:"55",forecast:"54"},
    {time:"02:00 PM",country:"US",name:"ISM Services Prices",period:"MAR",actual:"70.7",prev:"63.0",consensus:"",forecast:"70"},
    {time:"02:00 PM",country:"US",name:"ISM Services Employment",period:"MAR",actual:"45.2",prev:"51.8",consensus:"",forecast:"51.7"},
    {time:"05:00 AM",country:"IN",name:"HSBC Services PMI Final",period:"MAR",actual:"57.5",prev:"58.1",consensus:"57.4",forecast:"57.2"},
    {time:"07:00 AM",country:"ES",name:"Unemployment Change",period:"MAR",actual:"-22.9K",prev:"3.6K",consensus:"10.3",forecast:"7.0K"},
    {time:"03:30 PM",country:"US",name:"3-Month Bill Auction",period:"",actual:"3.635%",prev:"3.620%",consensus:"",forecast:""},
    {time:"03:30 PM",country:"US",name:"6-Month Bill Auction",period:"",actual:"3.615%",prev:"3.605%",consensus:"",forecast:""},
  ],
  "2026-04-07": [
    {time:"05:00 AM",country:"DE",name:"Factory Orders MoM",period:"FEB",actual:"",prev:"-2.3%",consensus:"3.5%",forecast:"2.8%"},
    {time:"08:30 AM",country:"US",name:"NFIB Business Optimism Index",period:"MAR",actual:"",prev:"97.4",consensus:"96.5",forecast:"96.0"},
    {time:"09:30 AM",country:"US",name:"Fed Governor Waller Speech",period:"",actual:"",prev:"",consensus:"",forecast:""},
    {time:"11:00 AM",country:"US",name:"Consumer Credit Change",period:"FEB",actual:"",prev:"$18.08B",consensus:"$15.0B",forecast:"$14.5B"},
    {time:"11:30 PM",country:"JP",name:"Household Spending YoY",period:"FEB",actual:"",prev:"-1%",consensus:"-0.7%",forecast:"-0.4%"},
  ],
  "2026-04-08": [
    {time:"07:00 AM",country:"DE",name:"Industrial Production MoM",period:"FEB",actual:"",prev:"-1.5%",consensus:"1.5%",forecast:"1.2%"},
    {time:"07:00 AM",country:"DE",name:"Trade Balance",period:"FEB",actual:"",prev:"€16.8B",consensus:"",forecast:"€17.5B"},
    {time:"09:00 AM",country:"EU",name:"GDP Growth Rate QoQ 3rd Est",period:"Q4",actual:"",prev:"0.2%",consensus:"0.1%",forecast:"0.1%"},
    {time:"10:00 AM",country:"US",name:"Wholesale Inventories MoM Final",period:"FEB",actual:"",prev:"0.8%",consensus:"0.3%",forecast:"0.4%"},
    {time:"11:00 AM",country:"US",name:"Fed Governor Jefferson Speech",period:"",actual:"",prev:"",consensus:"",forecast:""},
    {time:"01:00 PM",country:"US",name:"3-Year Note Auction",period:"",actual:"",prev:"3.834%",consensus:"",forecast:""},
  ],
  "2026-04-09": [
    {time:"08:30 AM",country:"US",name:"Initial Jobless Claims",period:"APR 4",actual:"",prev:"219K",consensus:"225K",forecast:"222K"},
    {time:"08:30 AM",country:"US",name:"GDP 3rd Release",period:"Q4",actual:"",prev:"2.3%",consensus:"2.3%",forecast:"2.3%"},
    {time:"08:30 AM",country:"US",name:"GDP Price Index 3rd Release",period:"Q4",actual:"",prev:"2.4%",consensus:"2.4%",forecast:"2.4%"},
    {time:"10:30 AM",country:"US",name:"EIA Natural Gas Storage",period:"APR 4",actual:"",prev:"-29 Bcf",consensus:"",forecast:""},
    {time:"02:00 PM",country:"US",name:"FOMC Minutes",period:"MAR 18",actual:"",prev:"",consensus:"",forecast:""},
    {time:"11:00 AM",country:"US",name:"30-Year Bond Auction",period:"",actual:"",prev:"4.541%",consensus:"",forecast:""},
  ],
  "2026-04-10": [
    {time:"06:00 AM",country:"GB",name:"GDP MoM",period:"FEB",actual:"",prev:"0.0%",consensus:"0.1%",forecast:"0.1%"},
    {time:"06:00 AM",country:"GB",name:"Industrial Production MoM",period:"FEB",actual:"",prev:"-0.1%",consensus:"0.2%",forecast:"0.1%"},
    {time:"08:30 AM",country:"US",name:"Consumer Price Index MoM",period:"MAR",actual:"",prev:"0.2%",consensus:"0.3%",forecast:"0.3%"},
    {time:"08:30 AM",country:"US",name:"Consumer Price Index YoY",period:"MAR",actual:"",prev:"2.8%",consensus:"2.9%",forecast:"2.9%"},
    {time:"08:30 AM",country:"US",name:"Core CPI MoM",period:"MAR",actual:"",prev:"0.2%",consensus:"0.3%",forecast:"0.3%"},
    {time:"08:30 AM",country:"US",name:"Core CPI YoY",period:"MAR",actual:"",prev:"3.1%",consensus:"3.0%",forecast:"3.0%"},
    {time:"10:00 AM",country:"US",name:"Michigan Consumer Sentiment Prelim",period:"APR",actual:"",prev:"57.0",consensus:"55.0",forecast:"54.5"},
    {time:"10:00 AM",country:"US",name:"Michigan Inflation Expectations",period:"APR",actual:"",prev:"5.0%",consensus:"",forecast:"4.8%"},
  ],
};

function getImpact(name: string): "high" | "medium" | "low" {
  const hi  = ["CPI","GDP","NFP","Nonfarm","FOMC","Fed","Employment","Unemployment","PMI","Retail Sales","PCE","Consumer Price","Michigan","Initial Jobless","Sentiment"];
  const med = ["Industrial Production","Factory Orders","Consumer Credit","Household","Trade Balance","Wholesale","NFIB","Spending","Auction","Bond","Note"];
  if (hi.some(k  => name.includes(k))) return "high";
  if (med.some(k => name.includes(k))) return "medium";
  return "low";
}

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function fmt(d: Date)  { return d.toISOString().slice(0, 10); }
function fmtS(d: Date) { return MONTHS[d.getMonth()] + " " + d.getDate(); }
function isToday(d: Date) {
  const t = new Date();
  return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear();
}

const impFilters  = ["all","high","medium","low"] as const;
const ctryFilters = ["All","US","EU","GB","JP","DE","CA","IN","BR"];

export default function EconomicCalendar() {
  const [weekOff,  setWeekOff]  = useState(0);
  const [selDay,   setSelDay]   = useState(fmt(new Date()));
  const [impFilt,  setImpFilt]  = useState<"all"|"high"|"medium"|"low">("all");
  const [ctryFilt, setCtryFilt] = useState("All");
  const [search,   setSearch]   = useState("");

  const week = getWeekDates(weekOff);

  useEffect(() => {
    const today = fmt(new Date());
    const inW   = week.find(d => fmt(d) === today);
    setSelDay(inW ? today : fmt(week[0]));
  }, [weekOff]); // eslint-disable-line

  const events = (staticEvents[selDay] || []).filter(e => {
    if (impFilt !== "all" && getImpact(e.name) !== impFilt) return false;
    if (ctryFilt !== "All" && e.country !== ctryFilt)       return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) &&
        !e.country.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const btn = (active: boolean, color?: string) => ({
    background:  active ? (color ? color + "22" : "#1e3a5f") : "transparent",
    border:      `1px solid ${active ? (color || "#3b82f6") : "#1e293b"}`,
    color:       active ? (color || "#60a5fa") : "#64748b",
    padding:     "6px 12px",
    borderRadius: 16,
    fontSize:    12,
    cursor:      "pointer",
    fontWeight:  600,
  } as React.CSSProperties);

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <button onClick={() => setWeekOff(w => w-1)} style={{ background:"#111827", border:"1px solid #1e293b", color:"#94a3b8", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:13 }}>← Prev</button>
        <h2 style={{ color:"#fff", fontSize:18, fontWeight:700, margin:0 }}>
          {fmtS(week[0])} – {fmtS(week[6])}, {week[0].getFullYear()}
        </h2>
        <button onClick={() => setWeekOff(w => w+1)} style={{ background:"#111827", border:"1px solid #1e293b", color:"#94a3b8", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:13 }}>Next →</button>
      </div>

      {/* Day picker */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:20 }}>
        {week.map(d => {
          const k   = fmt(d);
          const sel = selDay === k;
          const td  = isToday(d);
          const ec  = (staticEvents[k] || []).length;
          return (
            <button key={k} onClick={() => setSelDay(k)} style={{
              background:  sel ? "#1e3a5f" : "#111827",
              border:      `1px solid ${sel ? "#3b82f6" : "#1e293b"}`,
              borderRadius:10, padding:"12px 8px", cursor:"pointer",
              textAlign:"center", position:"relative",
            }}>
              <div style={{ color:sel?"#60a5fa":"#64748b", fontSize:11, fontWeight:600 }}>{DAYS[d.getDay()]}</div>
              <div style={{ color:sel?"#fff":"#94a3b8", fontSize:20, fontWeight:700, margin:"4px 0" }}>{d.getDate()}</div>
              <div style={{ color:sel?"#60a5fa":"#475569", fontSize:11 }}>{ec} events</div>
              {td && <div style={{ position:"absolute", top:6, right:6, width:6, height:6, borderRadius:"50%", background:"#10b981" }}/>}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events..."
          style={{ background:"#111827", border:"1px solid #1e293b", color:"#e2e8f0", padding:"8px 14px", borderRadius:8, fontSize:13, width:200, outline:"none" }}
        />
        <div style={{ display:"flex", gap:4 }}>
          {impFilters.map(f => (
            <button key={f} onClick={() => setImpFilt(f)} style={btn(impFilt===f, f!=="all"?impactColor[f]:undefined)}>
              {f==="all" ? "All Impact" : f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {ctryFilters.map(f => (
            <button key={f} onClick={() => setCtryFilt(f)} style={btn(ctryFilt===f)}>
              {f==="All" ? "All" : ((countryFlags[f]||"")+" "+f)}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div style={{ display:"grid", gridTemplateColumns:"80px 36px 1fr 70px 80px 80px 80px 70px", gap:8, padding:"10px 16px", background:"#0d1321", borderRadius:"10px 10px 0 0", borderBottom:"1px solid #1e293b" }}>
        {["Time","","Event","Period","Actual","Forecast","Previous","Impact"].map(h => (
          <span key={h} style={{ color:"#475569", fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase" }}>{h}</span>
        ))}
      </div>

      {/* Events */}
      <div style={{ background:"#111827", borderRadius:"0 0 10px 10px", border:"1px solid #1e293b", borderTop:"none", maxHeight:500, overflowY:"auto" }}>
        {events.length === 0 ? (
          <div style={{ padding:48, textAlign:"center", color:"#475569", fontSize:14 }}>
            {staticEvents[selDay] ? "No events match your filters." : "No data for this date. Static data covers Apr 6–10, 2026."}
          </div>
        ) : events.map((e, i) => {
          const imp  = getImpact(e.name);
          const beat = e.actual && e.consensus && parseFloat(e.actual) > parseFloat(e.consensus);
          const miss = e.actual && e.consensus && parseFloat(e.actual) < parseFloat(e.consensus);
          return (
            <div
              key={i}
              style={{ display:"grid", gridTemplateColumns:"80px 36px 1fr 70px 80px 80px 80px 70px", gap:8, padding:"11px 16px", borderBottom:i<events.length-1?"1px solid #1a2235":"none", alignItems:"center" }}
              onMouseEnter={ev => (ev.currentTarget.style.background="#162033")}
              onMouseLeave={ev => (ev.currentTarget.style.background="transparent")}
            >
              <span style={{ color:"#94a3b8", fontSize:12, fontFamily:"monospace" }}>{e.time}</span>
              <span style={{ fontSize:15 }}>{countryFlags[e.country]||"🏳️"}</span>
              <div>
                <span style={{ color:"#f1f5f9", fontSize:13, fontWeight:600 }}>{e.name}</span>
                <span style={{ color:"#475569", fontSize:11, marginLeft:6 }}>{e.country}</span>
              </div>
              <span style={{ color:"#64748b", fontSize:11 }}>{e.period}</span>
              <span style={{ color:e.actual?(beat?"#10b981":miss?"#ef4444":"#f1f5f9"):"#475569", fontWeight:e.actual?700:400, fontSize:12 }}>{e.actual||"—"}</span>
              <span style={{ color:"#94a3b8", fontSize:12 }}>{e.consensus||e.forecast||"—"}</span>
              <span style={{ color:"#64748b", fontSize:12 }}>{e.prev||"—"}</span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:impactColor[imp] }}/>
                <span style={{ color:impactColor[imp], fontSize:10, fontWeight:600 }}>{imp==="high"?"High":imp==="medium"?"Med":"Low"}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:16, marginTop:12, padding:"10px 14px", background:"#0d1321", borderRadius:8, border:"1px solid #1e293b", flexWrap:"wrap" }}>
        <span style={{ color:"#475569", fontSize:10 }}>Impact:</span>
        {[["#ef4444","High — CPI, GDP, FOMC, PMI"],["#f59e0b","Medium — Claims, Production"],["#3b82f6","Low — Auctions, Speeches"]].map(([c,l]) => (
          <span key={l} style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:c }}/>
            <span style={{ color:"#64748b", fontSize:10 }}>{l}</span>
          </span>
        ))}
        <span style={{ color:"#10b981", fontSize:10, marginLeft:"auto" }}>Green = beat</span>
        <span style={{ color:"#ef4444", fontSize:10 }}>Red = miss</span>
      </div>
    </div>
  );
}
