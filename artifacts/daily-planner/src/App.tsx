import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, ListTodo, Plus, Sparkles, Trash2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

type Priority = 'High' | 'Medium' | 'Low';
type Task = { id: string; title: string; time: string; priority: Priority; completed: boolean; note?: string };
type DayData = { intention: string; tasks: Task[] };

const queryClient = new QueryClient();
const STORAGE_KEY = 'daily-planner-state-v1';

const formatKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateAtLocalMidnight = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const initialData: Record<string, DayData> = {
  [formatKey(new Date())]: {
    intention: 'Make room for what matters.',
    tasks: [
      { id: 'welcome-1', title: 'Review the shape of the day', time: '08:30', priority: 'High', completed: false, note: 'Choose the one thing that would make today feel meaningful.' },
      { id: 'welcome-2', title: 'A little movement outside', time: '10:00', priority: 'Medium', completed: false },
      { id: 'welcome-3', title: 'Send the kind email', time: '13:30', priority: 'Low', completed: false },
    ],
  },
};

function loadPlanner(): Record<string, DayData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...initialData, ...JSON.parse(stored) };
  } catch {
    // The planner remains useful if localStorage is unavailable or corrupted.
  }
  return initialData;
}

function AppShell() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function Home() {
  const todayKey = formatKey(new Date());
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [planner, setPlanner] = useState<Record<string, DayData>>(loadPlanner);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState<Priority>('Medium');

  const selectedDate = useMemo(() => dateAtLocalMidnight(selectedKey), [selectedKey]);
  const data = planner[selectedKey] ?? { intention: '', tasks: [] };
  const completedCount = data.tasks.filter((task) => task.completed).length;
  const progress = data.tasks.length ? Math.round((completedCount / data.tasks.length) * 100) : 0;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(planner)); } catch { /* local-only enhancement */ }
  }, [planner]);

  const updateDay = (updater: (day: DayData) => DayData) => {
    setPlanner((current) => ({ ...current, [selectedKey]: updater(current[selectedKey] ?? { intention: '', tasks: [] }) }));
  };

  const moveDay = (amount: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + amount);
    setSelectedKey(formatKey(next));
    setIsComposerOpen(false);
  };

  const addTask = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    updateDay((day) => ({
      ...day,
      tasks: [...day.tasks, { id: `${Date.now()}-${Math.random()}`, title: trimmed, time, priority, completed: false }],
    }));
    setTitle('');
    setTime('09:00');
    setPriority('Medium');
    setIsComposerOpen(false);
  };

  const updateIntention = (intention: string) => updateDay((day) => ({ ...day, intention }));
  const toggleTask = (id: string) => updateDay((day) => ({ ...day, tasks: day.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task) }));
  const deleteTask = (id: string) => updateDay((day) => ({ ...day, tasks: day.tasks.filter((task) => task.id !== id) }));

  const displayDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(selectedDate);
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(selectedDate);
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(selectedDate);
  const isToday = selectedKey === todayKey;

  return (
    <div className="planner-app">
      <div className="planner-shell">
        <aside className="planner-sidebar">
          <div className="sidebar-inner">
            <div className="brand-mark" data-testid="text-brand"><span className="brand-dot" aria-hidden="true" />daymark</div>
            <div className="sidebar-kicker">a daily practice</div>
            <h2 className="sidebar-title">Begin with a little clarity.</h2>
            <nav className="sidebar-nav" aria-label="Planner sections">
              <button className="sidebar-nav-item active" type="button" data-testid="button-nav-today" onClick={() => setSelectedKey(todayKey)}>
                <ListTodo size={16} strokeWidth={1.7} /><span>Today</span>
              </button>
              <button className="sidebar-nav-item" type="button" data-testid="button-nav-focus" onClick={() => document.getElementById('intention')?.focus()}>
                <Sparkles size={16} strokeWidth={1.7} /><span>Focus</span>
              </button>
            </nav>
            <div className="sidebar-footer">
              <p><strong>Small steps count.</strong></p>
              <p>Your plan lives here in this browser.</p>
            </div>
          </div>
        </aside>

        <main className="planner-main">
          <div className="topline">
            <div className="eyebrow"><span className="eyebrow-line" />{isToday ? 'Your daily page' : 'A day to return to'}</div>
            <div className="date-controls">
              <button className="icon-button" type="button" aria-label="Previous day" data-testid="button-previous-day" onClick={() => moveDay(-1)}><ChevronLeft size={18} /></button>
              {!isToday && <button className="today-button" type="button" data-testid="button-go-today" onClick={() => setSelectedKey(todayKey)}>Today</button>}
              <button className="icon-button" type="button" aria-label="Next day" data-testid="button-next-day" onClick={() => moveDay(1)}><ChevronRight size={18} /></button>
            </div>
          </div>

          <header className="planner-header">
            <div>
              <h1 className="day-name" data-testid="text-selected-day">{dayName}</h1>
              <p className="date-label" data-testid="text-selected-date"><strong>{displayDate.split(',')[1]?.trim() ?? displayDate}</strong>{isToday ? ' · Today' : ''}</p>
            </div>
            <div className="progress-block">
              <div className="progress-topline"><span className="progress-label">Day progress</span><span className="progress-number" data-testid="text-progress">{progress}%</span></div>
              <div className="progress-track" aria-label={`${progress}% of tasks complete`}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <div className="progress-subline" data-testid="text-task-summary">{completedCount} of {data.tasks.length} {data.tasks.length === 1 ? 'task' : 'tasks'} complete</div>
            </div>
          </header>

          <div className="content-grid">
            <section aria-labelledby="tasks-heading">
              <div className="section-heading">
                <h2 id="tasks-heading">The day, in pieces</h2>
                <span className="section-count">{data.tasks.length} {data.tasks.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              {data.tasks.length === 0 ? (
                <div className="empty-state" data-testid="empty-task-state">
                  <div className="empty-sun" aria-hidden="true"><Sparkles size={19} strokeWidth={1.5} /></div>
                  <h3>A blank page, for now.</h3>
                  <p>Add one small, specific thing. The rest of the day can take shape around it.</p>
                  <button className="add-task-button" type="button" data-testid="button-empty-add-task" onClick={() => setIsComposerOpen(true)}><Plus size={15} /> Add your first task</button>
                </div>
              ) : (
                <div className="task-list" data-testid="task-list">
                  {data.tasks.map((task, index) => (
                    <TaskRow key={task.id} task={task} index={index} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
                  ))}
                </div>
              )}
              {isComposerOpen ? (
                <div className="composer">
                  <label className="composer-label" htmlFor="task-title">A new piece of the day</label>
                  <input id="task-title" className="composer-title-input" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTask(); if (event.key === 'Escape') setIsComposerOpen(false); }} placeholder="What would feel good to finish?" data-testid="input-task-title" />
                  <div className="composer-options">
                    <label className="field"><span className="composer-label">Time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} data-testid="input-task-time" /></label>
                    <label className="field"><span className="composer-label">Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} data-testid="select-task-priority"><option>High</option><option>Medium</option><option>Low</option></select></label>
                    <div className="composer-actions"><button className="cancel-button" type="button" data-testid="button-cancel-task" onClick={() => setIsComposerOpen(false)}>Cancel</button><button className="add-task-button" type="button" data-testid="button-save-task" onClick={addTask}><Plus size={14} /> Add task</button></div>
                  </div>
                </div>
              ) : (
                <button className="add-task-button" type="button" data-testid="button-add-task" onClick={() => setIsComposerOpen(true)} style={{ marginTop: 17 }}><Plus size={15} /> Add task</button>
              )}
            </section>

            <aside className="aside-stack">
              <section className="intention-card" aria-labelledby="intention-heading">
                <div className="intention-label"><span id="intention-heading">Today's intention</span><Sparkles size={14} /></div>
                <textarea id="intention" className="intention-input" value={data.intention} onChange={(event) => updateIntention(event.target.value)} placeholder="What will guide you today?" data-testid="input-daily-intention" aria-label="Daily intention" />
                <p className="intention-hint">A sentence to come back to.</p>
              </section>
              <WeekOverview selectedDate={selectedDate} todayKey={todayKey} selectedKey={selectedKey} onSelect={setSelectedKey} />
              <section className="ritual-card">
                <h2>A gentle rhythm</h2>
                <div className="ritual-list">
                  <div className="ritual-item"><Clock3 size={15} /><div><strong>Leave some air</strong>Not every hour needs a plan.</div></div>
                  <div className="ritual-item"><CircleCheck size={15} /><div><strong>Notice progress</strong>Check off what is done, then let it go.</div></div>
                </div>
              </section>
            </aside>
          </div>
          <footer className="footer-note"><span>Daymark · your quiet daily page</span><span>{isToday ? 'Saved locally' : 'Planning ahead'}</span></footer>
        </main>
      </div>
    </div>
  );
}

function TaskRow({ task, index, onToggle, onDelete }: { task: Task; index: number; onToggle: () => void; onDelete: () => void }) {
  const formattedTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${task.time}`));
  return (
    <article className={`task-row ${task.completed ? 'completed' : ''}`} style={{ '--delay': `${index * 55}ms` } as CSSProperties} data-testid={`task-row-${task.id}`}>
      <button className={`check-button ${task.completed ? 'checked' : ''}`} type="button" aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} data-testid={`button-toggle-task-${task.id}`} onClick={onToggle}>{task.completed && <Check size={15} strokeWidth={2.5} />}</button>
      <time className="task-time">{formattedTime}</time>
      <div><div className="task-title">{task.title}</div>{task.note && <p className="task-notes">{task.note}</p>}</div>
      <span className={`priority-pill priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
      <button className="icon-button delete-button" type="button" aria-label={`Delete ${task.title}`} data-testid={`button-delete-task-${task.id}`} onClick={onDelete}><Trash2 size={15} /></button>
    </article>
  );
}

function WeekOverview({ selectedDate, todayKey, selectedKey, onSelect }: { selectedDate: Date; todayKey: string; selectedKey: string; onSelect: (key: string) => void }) {
  const start = new Date(selectedDate);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  return (
    <section className="mini-calendar" aria-labelledby="week-heading">
      <div className="mini-calendar-heading"><h2 id="week-heading">This week</h2><span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(selectedDate)}</span></div>
      <div className="week-row">
        {days.map((date) => {
          const key = formatKey(date);
          const isCurrent = key === todayKey;
          return <button className={`week-cell ${isCurrent ? 'current' : ''} ${key === selectedKey ? 'selected' : ''}`} type="button" key={key} onClick={() => onSelect(key)} aria-label={`Open ${date.toDateString()}`} data-testid={`button-week-day-${key}`}><span>{new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(date)}</span><span className="week-day">{date.getDate()}</span></button>;
        })}
      </div>
    </section>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;