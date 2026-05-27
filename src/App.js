import { useState, useEffect, useRef } from "react";

const SCHEDULE = [
  { day: "一", label: "Monday", workout: "恢復 Zone2", distance: "6~8km", type: "easy" },
  { day: "二", label: "Tuesday", workout: "品質課（tempo/interval）", distance: "8~10km", type: "quality" },
  { day: "三", label: "Wednesday", workout: "休息 / 重訓 / 游泳", distance: null, type: "rest" },
  { day: "四", label: "Thursday", workout: "Zone2", distance: "8~10km", type: "easy" },
  { day: "五", label: "Friday", workout: "恢復跑 + strides", distance: "5~6km", type: "recovery" },
  { day: "六", label: "Saturday", workout: "LSD 長距離", distance: "14~18km", type: "long" },
  { day: "日", label: "Sunday", workout: "單車 / 登山 / 完全休息", distance: null, type: "rest" },
];

const TYPE_COLORS = {
  easy:     { bg: "#1a2e1a", accent: "#4ade80", text: "#86efac" },
  quality:  { bg: "#2e1a1a", accent: "#f87171", text: "#fca5a5" },
  rest:     { bg: "#1a1a2e", accent: "#818cf8", text: "#a5b4fc" },
  recovery: { bg: "#2e2a1a", accent: "#fbbf24", text: "#fde68a" },
  long:     { bg: "#1a2a2e", accent: "#22d3ee", text: "#67e8f9" },
};

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function storageKey(date) { return `checkin_${dateKey(date)}`; }
function getDateFromKey(dk) {
  const [y,m,d] = dk.split("-").map(Number);
  return new Date(y, m-1, d);
}
function dateByOffset(offset) {
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate() + offset); return d;
}
function scheduleIdx(date) {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}
function getMonthCheckins(year, month) {
  const daysInMonth = new Date(year, month+1, 0).getDate();
  let total = 0; const days = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    try {
      const data = JSON.parse(localStorage.getItem(storageKey(date)));
      if (data?.done) { days[d] = data; if (data.km) total += parseFloat(data.km)||0; }
    } catch {}
  }
  return { total, days };
}
function getDaysInMonth(year, month) { return new Date(year, month+1, 0).getDate(); }
function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

const MONTH_NAMES = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
const RANGE = 7;
const EVENTS_KEY = "race_events";

function loadEvents() {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY)) || []; } catch { return []; }
}
function saveEvents(list) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
}
function daysDiff(dateStr, today) {
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

export default function App() {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayKey = dateKey(today);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const isLastDay = today.getDate() === getDaysInMonth(currentYear, currentMonth);

  const [checkins, setCheckins] = useState(() => {
    const obj = {};
    for (let o = -RANGE; o <= RANGE; o++) {
      const d = dateByOffset(o); const k = dateKey(d);
      try { obj[k] = JSON.parse(localStorage.getItem(storageKey(d))) || null; } catch { obj[k] = null; }
    }
    return obj;
  });

  const listRef = useRef(null);
  const todayRef = useRef(null);
  useEffect(() => {
    if (todayRef.current) todayRef.current.scrollIntoView({ block: "center" });
  }, []);

  const [modal, setModal] = useState(null);
  const [note, setNote] = useState("");
  const [km, setKm] = useState("");
  const [animKey, setAnimKey] = useState(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState({ year: currentYear, month: currentMonth });

  // Race events
  const [events, setEvents] = useState(loadEvents);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");

  // Upcoming events sorted, max 3 closest future ones
  const upcomingEvents = [...events]
    .map(e => ({ ...e, diff: daysDiff(e.date, today) }))
    .filter(e => e.diff >= 0)
    .sort((a, b) => a.diff - b.diff);

  function addEvent() {
    if (!newEventName.trim() || !newEventDate) return;
    const list = [...events, { id: Date.now().toString(), name: newEventName.trim(), date: newEventDate }];
    saveEvents(list); setEvents(list);
    setNewEventName(""); setNewEventDate(""); setShowAddEvent(false);
  }
  function removeEvent(id) {
    const list = events.filter(e => e.id !== id);
    saveEvents(list); setEvents(list);
  }

  const monthKm = (() => {
    let t = 0;
    Object.entries(checkins).forEach(([dk, v]) => {
      if (!v?.done || !v?.km) return;
      const d = getDateFromKey(dk);
      if (d.getFullYear()===currentYear && d.getMonth()===currentMonth) t += parseFloat(v.km)||0;
    });
    return Math.round(t*10)/10;
  })();

  const settledKey = `month_total_${currentYear}_${currentMonth}`;
  const [settledTotal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(settledKey))||null; } catch { return null; }
  });

  useEffect(() => {
    if (isLastDay) {
      const { total } = getMonthCheckins(currentYear, currentMonth);
      localStorage.setItem(settledKey, JSON.stringify(Math.round(total*10)/10));
    }
  }, [checkins]);

  const weekDoneCount = (() => {
    let count = 0;
    const dow = today.getDay();
    const mondayOffset = dow===0 ? -6 : 1-dow;
    for (let i = 0; i < 7; i++) {
      const d = dateByOffset(mondayOffset+i);
      if (checkins[dateKey(d)]?.done) count++;
    }
    return count;
  })();

  function openModal(dk) {
    const date = getDateFromKey(dk);
    setModal({ dk, date, si: scheduleIdx(date) });
    setNote(checkins[dk]?.note || "");
    setKm(checkins[dk]?.km || "");
  }
  function handleCheckin() {
    const { dk, date } = modal;
    const data = { done: true, km, note, ts: Date.now() };
    localStorage.setItem(storageKey(date), JSON.stringify(data));
    setCheckins(prev => ({ ...prev, [dk]: data }));
    setAnimKey(dk); setTimeout(() => setAnimKey(null), 600);
    setModal(null);
  }
  function handleUncheck(dk) {
    const date = getDateFromKey(dk);
    localStorage.removeItem(storageKey(date));
    setCheckins(prev => ({ ...prev, [dk]: null }));
  }

  const calDaysInMonth = getDaysInMonth(calMonth.year, calMonth.month);
  const calFirstDay = getFirstDayOfMonth(calMonth.year, calMonth.month);
  const { days: calDayData } = getMonthCheckins(calMonth.year, calMonth.month);
  const calMonthKm = Math.round(Object.values(calDayData).reduce((s,d) => s+(parseFloat(d?.km)||0), 0)*10)/10;
  const calGrid = [...Array(calFirstDay).fill(null), ...Array.from({length:calDaysInMonth},(_,i)=>i+1)];

  // event dates as set for calendar highlight
  const eventDateSet = new Set(events.map(e => e.date));

  const dayItems = [];
  for (let o = -RANGE; o <= RANGE; o++) {
    const date = dateByOffset(o); date.setHours(0,0,0,0);
    dayItems.push({ date, dk: dateKey(date), offset: o });
  }

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#0a0a0a", fontFamily:"'Noto Sans TC','PingFang TC',sans-serif", color:"#e5e5e5", overflow:"hidden" }}>

      {/* ── HEADER ── */}
      <div style={{ flexShrink:0, padding:"44px 20px 16px", borderBottom:"1px solid #1f1f1f", background:"#0a0a0a", zIndex:20 }}>
        <div style={{ fontSize:10, letterSpacing:4, color:"#444", textTransform:"uppercase", marginBottom:8 }}>Training Log</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5, lineHeight:1 }}>你的最佳週結構</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:2, justifyContent:"flex-end" }}>
                <span style={{ fontSize:20, fontWeight:900, color:"#22d3ee", lineHeight:1 }}>{isLastDay && settledTotal !== null ? settledTotal : monthKm}</span>
                <span style={{ fontSize:9, color:"#22d3ee88", fontWeight:700 }}>km</span>
              </div>
              <div style={{ fontSize:9, color:"#444", letterSpacing:1 }}>{isLastDay && settledTotal !== null ? "本月結算" : "本月累積"}</div>
            </div>
            <div style={{ width:1, height:28, background:"#222" }} />
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:20, fontWeight:900, color:"#4ade80", lineHeight:1 }}>{weekDoneCount}</div>
              <div style={{ fontSize:9, color:"#555", letterSpacing:1 }}>/ 7 本週</div>
            </div>
            <button onClick={() => { setCalMonth({ year:currentYear, month:currentMonth }); setShowCalendar(true); }}
              style={{ width:34, height:34, borderRadius:9, background:"#151515", border:"1px solid #2a2a2a", color:"#777", fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>📅</button>
          </div>
        </div>
        <div style={{ marginTop:12, height:2, background:"#1a1a1a", borderRadius:1 }}>
          <div style={{ height:"100%", borderRadius:1, background:"linear-gradient(90deg,#4ade80,#22d3ee)", width:`${(weekDoneCount/7)*100}%`, transition:"width 0.5s cubic-bezier(0.34,1.56,0.64,1)" }} />
        </div>
      </div>

      {/* ── LIST ── */}
      <div ref={listRef} style={{ flex:1, overflowY:"auto", padding:"8px 14px 40px" }}>
        {dayItems.map(({ date, dk, offset }) => {
          const si = scheduleIdx(date);
          const item = SCHEDULE[si];
          const colors = TYPE_COLORS[item.type];
          const isToday = dk === todayKey;
          const isPast = date < today;
          const checkin = checkins[dk];
          const isAnim = animKey === dk;
          const showMonthLabel = date.getDate()===1 || offset===-RANGE;

          return (
            <div key={dk}>
              {showMonthLabel && (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 4px 10px" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#333", letterSpacing:3 }}>
                    {date.getFullYear()} · {MONTH_NAMES[date.getMonth()]}
                  </div>
                  <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
                </div>
              )}
              <div
                ref={isToday ? todayRef : null}
                onClick={() => checkin?.done ? handleUncheck(dk) : openModal(dk)}
                style={{
                  marginBottom:8, borderRadius:14,
                  background: checkin?.done ? colors.bg : "#111",
                  border:`1px solid ${isToday ? colors.accent : checkin?.done ? colors.accent+"44" : "#1a1a1a"}`,
                  padding:"14px 16px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:12,
                  position:"relative", overflow:"hidden",
                  transform: isAnim ? "scale(0.97)" : "scale(1)",
                  transition:"transform 0.15s ease, opacity 0.2s ease",
                  opacity: isPast && !checkin?.done && !isToday ? 0.45 : 1,
                }}
              >
                {isToday && <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(ellipse at 0% 50%, ${colors.accent}15 0%, transparent 55%)` }} />}
                <div style={{ width:46, minWidth:46, height:46, borderRadius:11, background: isToday ? colors.accent : checkin?.done ? colors.accent+"40" : "#161616", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ fontSize:15, fontWeight:800, lineHeight:1, color: isToday ? "#000" : checkin?.done ? "#fff" : "#444" }}>{item.day}</div>
                  <div style={{ fontSize:9, color: isToday ? "#0008" : checkin?.done ? "#ffffffaa" : "#555", marginTop:2 }}>{date.getMonth()+1}/{date.getDate()}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color: checkin?.done ? "#e5e5e5" : isToday ? "#e5e5e5" : "#555", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.workout}</div>
                  {item.distance && (
                    <div style={{ fontSize:11, marginTop:2, color: checkin?.km ? colors.accent : isPast && !checkin?.done ? "#444" : "#666" }}>
                      {checkin?.km ? `${checkin.km} km 完成` : item.distance}
                    </div>
                  )}
                  {checkin?.note && <div style={{ fontSize:10, color:"#888", marginTop:2, fontStyle:"italic" }}>"{checkin.note}"</div>}
                </div>
                <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, border:`2px solid ${checkin?.done ? colors.accent : "#252525"}`, background: checkin?.done ? colors.accent : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.25s ease" }}>
                  {checkin?.done && <span style={{ fontSize:12, fontWeight:800, color: item.type==="rest" ? "#fff" : "#000" }}>✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CHECKIN MODAL ── */}
      {modal && (
        <div onClick={e => e.target===e.currentTarget && setModal(null)} style={{ position:"fixed", inset:0, zIndex:100, background:"#000000cc", display:"flex", alignItems:"flex-end", backdropFilter:"blur(6px)" }}>
          <div style={{ width:"100%", maxWidth:500, margin:"0 auto", background:"#141414", borderRadius:"22px 22px 0 0", padding:"20px 20px 44px", border:"1px solid #222" }}>
            {(() => {
              const item = SCHEDULE[modal.si];
              const colors = TYPE_COLORS[item.type];
              return (
                <>
                  <div style={{ width:36, height:4, background:"#2a2a2a", borderRadius:2, margin:"0 auto 18px" }} />
                  <div style={{ fontSize:11, color:colors.accent, letterSpacing:3, marginBottom:4 }}>{item.day}曜日 · {modal.date.getMonth()+1}/{modal.date.getDate()}</div>
                  <div style={{ fontSize:19, fontWeight:800, marginBottom:18 }}>{item.workout}</div>
                  {item.distance && (
                    <div style={{ marginBottom:12 }}>
                      <label style={{ fontSize:10, color:"#555", display:"block", marginBottom:6, letterSpacing:2 }}>實際距離 (KM)</label>
                      <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder={item.distance}
                        style={{ width:"100%", padding:"12px 14px", background:"#1a1a1a", border:`1px solid ${colors.accent}44`, borderRadius:10, color:"#e5e5e5", fontSize:16, outline:"none", boxSizing:"border-box" }} />
                    </div>
                  )}
                  <div style={{ marginBottom:18 }}>
                    <label style={{ fontSize:10, color:"#555", display:"block", marginBottom:6, letterSpacing:2 }}>備註（選填）</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="感覺如何？" rows={2}
                      style={{ width:"100%", padding:"12px 14px", background:"#1a1a1a", border:"1px solid #1f1f1f", borderRadius:10, color:"#e5e5e5", fontSize:14, outline:"none", resize:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
                  </div>
                  <button onClick={handleCheckin} style={{ width:"100%", padding:"14px", background:colors.accent, border:"none", borderRadius:12, fontSize:15, fontWeight:800, color:"#000", cursor:"pointer", letterSpacing:1 }}>✓ 完成打卡</button>
                  <button onClick={() => setModal(null)} style={{ width:"100%", padding:"11px", background:"transparent", border:"none", borderRadius:12, fontSize:13, color:"#555", cursor:"pointer", marginTop:4 }}>取消</button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── CALENDAR MODAL ── */}
      {showCalendar && (
        <div onClick={e => e.target===e.currentTarget && setShowCalendar(false)} style={{ position:"fixed", inset:0, zIndex:200, background:"#000000ee", display:"flex", alignItems:"flex-end", backdropFilter:"blur(10px)" }}>
          <div style={{ width:"100%", maxWidth:500, margin:"0 auto", background:"#0f0f0f", borderRadius:"24px 24px 0 0", border:"1px solid #1f1f1f", paddingBottom:44, maxHeight:"92vh", overflowY:"auto" }}>
            <div style={{ width:36, height:4, background:"#2a2a2a", borderRadius:2, margin:"16px auto 0" }} />

            {/* ── Race countdown ── */}
            <div style={{ padding:"20px 18px 0" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <div style={{ fontSize:10, color:"#444", letterSpacing:3 }}>🏁 賽事倒數</div>
                <button onClick={() => setShowAddEvent(v => !v)}
                  style={{ fontSize:11, color:"#555", background:"#161616", border:"1px solid #222", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>
                  {showAddEvent ? "收起" : "+ 新增賽事"}
                </button>
              </div>

              {/* Add event form */}
              {showAddEvent && (
                <div style={{ background:"#111", border:"1px solid #1f1f1f", borderRadius:12, padding:"14px", marginBottom:12, overflow:"hidden" }}>
                  <input
                    value={newEventName} onChange={e => setNewEventName(e.target.value)}
                    placeholder="賽事名稱（如：台北馬拉松）"
                    style={{ width:"100%", padding:"10px 12px", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:8, color:"#e5e5e5", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"inherit" }}
                  />
                  <div style={{ position:"relative", marginBottom:10 }}>
                    <input
                      type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
                      style={{ width:"100%", maxWidth:"100%", padding:"12px 14px", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:8, color: newEventDate ? "#e5e5e5" : "#555", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit", colorScheme:"dark", display:"block", WebkitAppearance:"none", appearance:"none", minHeight:44 }}
                    />
                    {!newEventDate && (
                      <div style={{ position:"absolute", inset:0, padding:"12px 14px", fontSize:14, color:"#555", pointerEvents:"none", display:"flex", alignItems:"center" }}>
                        選擇日期
                      </div>
                    )}
                  </div>
                  <button onClick={addEvent}
                    style={{ width:"100%", padding:"10px", background:"#f87171", border:"none", borderRadius:8, fontSize:13, fontWeight:800, color:"#000", cursor:"pointer" }}>
                    確認新增
                  </button>
                </div>
              )}

              {upcomingEvents.length === 0 && (
                <div style={{ fontSize:12, color:"#2a2a2a", marginBottom:14, textAlign:"center", padding:"10px 0" }}>尚未設定賽事</div>
              )}
            </div>

            {/* Scrollable event cards — outside padded div so overflow works */}
            {upcomingEvents.length > 0 && (
              <div style={{ overflowX:"auto", display:"flex", gap:10, padding:"0 18px 16px", scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", msOverflowStyle:"none", scrollbarWidth:"none" }}>
                {upcomingEvents.map((e, idx) => {
                  const palette = [
                    { accent:"#22d3ee", bg:"#0e2a30" },
                    { accent:"#a78bfa", bg:"#1e1a2e" },
                    { accent:"#fb923c", bg:"#2a1a0e" },
                  ];
                  const { accent, bg } = palette[idx % palette.length];
                  return (
                    <div key={e.id} style={{
                      flexShrink:0, width:"calc(33vw - 12px)", minWidth:100, maxWidth:150,
                      scrollSnapAlign:"start",
                      background: bg,
                      border:`1px solid ${accent}44`,
                      borderRadius:12, padding:"12px",
                      position:"relative",
                    }}>
                      <button onClick={() => removeEvent(e.id)}
                        style={{ position:"absolute", top:6, right:8, background:"none", border:"none", color:"#555", fontSize:13, cursor:"pointer", lineHeight:1 }}>×</button>
                      <div style={{ fontSize:22, fontWeight:900, color:accent, lineHeight:1 }}>{e.diff}</div>
                      <div style={{ fontSize:9, color:accent+"99", marginTop:1 }}>天後</div>
                      <div style={{ fontSize:11, color:"#ccc", marginTop:6, fontWeight:600, lineHeight:1.3 }}>{e.name}</div>
                      <div style={{ fontSize:9, color:"#555", marginTop:3 }}>{e.date.replace(/-/g,'/')}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Month nav ── */}
            <div style={{ height:1, background:"#161616", margin:"0 18px" }} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 16px 0" }}>
              <button onClick={() => { const d = new Date(calMonth.year, calMonth.month-1, 1); setCalMonth({ year:d.getFullYear(), month:d.getMonth() }); }}
                style={{ background:"none", border:"none", color:"#555", fontSize:22, cursor:"pointer", padding:"4px 10px" }}>‹</button>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:17, fontWeight:800 }}>{calMonth.year} · {MONTH_NAMES[calMonth.month]}</div>
                <div style={{ fontSize:13, color:"#22d3ee", marginTop:3, fontWeight:700 }}>
                  {calMonthKm} km {calMonth.year===currentYear && calMonth.month===currentMonth && isLastDay ? "· 已結算 ✓" : ""}
                </div>
              </div>
              <button onClick={() => { const d = new Date(calMonth.year, calMonth.month+1, 1); setCalMonth({ year:d.getFullYear(), month:d.getMonth() }); }}
                style={{ background:"none", border:"none", color:"#555", fontSize:22, cursor:"pointer", padding:"4px 10px" }}>›</button>
            </div>

            {/* Weekday headers */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, padding:"14px 14px 6px", textAlign:"center" }}>
              {["一","二","三","四","五","六","日"].map(d => (
                <div key={d} style={{ fontSize:9, color:"#333", paddingBottom:2 }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, padding:"0 14px" }}>
              {calGrid.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const thisDate = new Date(calMonth.year, calMonth.month, day);
                const thisDK = dateKey(thisDate);
                const isT = thisDK === todayKey;
                const data = calDayData[day];
                const hasDone = !!data?.done;
                const si2 = scheduleIdx(thisDate);
                const c = TYPE_COLORS[SCHEDULE[si2].type];
                const isRaceDay = eventDateSet.has(thisDK);
                return (
                  <div key={day} style={{ aspectRatio:"1", borderRadius:9, background: hasDone ? c.bg : isT ? "#181818" : "transparent", border:`1px solid ${isRaceDay ? "#f87171aa" : isT ? "#2a2a2a" : hasDone ? c.accent+"55" : "transparent"}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                    {hasDone && <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle, ${c.accent}1a 0%, transparent 70%)` }} />}
                    {isRaceDay && <div style={{ position:"absolute", top:2, right:2, fontSize:7, lineHeight:1 }}>🏁</div>}
                    <div style={{ fontSize:12, fontWeight:hasDone ? 700 : 400, color: isT ? "#fff" : hasDone ? c.text : "#444", lineHeight:1, zIndex:1 }}>{day}</div>
                    {hasDone && (
                      <div style={{ fontSize:data.km ? 7 : 8, color:c.accent, marginTop:1, fontWeight:800, zIndex:1 }}>
                        {data.km ? `${data.km}k` : "✓"}
                      </div>
                    )}
                    {isT && !hasDone && <div style={{ width:3, height:3, borderRadius:"50%", background:"#4ade80", marginTop:2 }} />}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display:"flex", gap:8, padding:"14px 16px 0", flexWrap:"wrap" }}>
              {Object.entries(TYPE_COLORS).map(([type, c]) => {
                const labels = { easy:"輕鬆跑", quality:"品質課", rest:"休息日", recovery:"恢復跑", long:"長距離" };
                return (
                  <div key={type} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:c.accent+"99", border:`1px solid ${c.accent}` }} />
                    <span style={{ fontSize:9, color:"#383838" }}>{labels[type]}</span>
                  </div>
                );
              })}
            </div>

            <button onClick={() => setShowCalendar(false)} style={{ display:"block", margin:"18px auto 0", padding:"9px 30px", background:"#161616", border:"1px solid #222", borderRadius:18, color:"#555", cursor:"pointer", fontSize:12 }}>關閉</button>
          </div>
        </div>
      )}
    </div>
  );
}