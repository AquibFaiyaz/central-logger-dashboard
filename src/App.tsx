import { useState, useEffect, useCallback } from 'react';
import { Search, RotateCw, Trash2, Shield, Radio, Terminal } from 'lucide-react';
import { StatsPanel } from './components/StatsPanel';
import { LogTable } from './components/LogTable';
import { TraceTimeline } from './components/TraceTimeline';

const API_BASE = '/logger-api/api/v1';

export default function App() {
  const [logs, setLogs] = useState<any[]>([]);
  const [apps, setApps] = useState<string[]>([]);
  
  // Filters State
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  
  // UI & Live States
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(true); // default to live stream!
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>('local');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch apps list
  const fetchApps = async () => {
    try {
      const res = await fetch(`${API_BASE}/apps`);
      const data = await res.json();
      if (data.success) {
        setApps(data.apps);
      }
    } catch (err) {
      console.error('Failed to fetch registered apps:', err);
    }
  };

  // Fetch logs based on active filters
  const fetchLogs = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedApp) params.append('appId', selectedApp);
      if (selectedLevel) params.append('level', selectedLevel);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('limit', '80'); // Grab a clean list of recent logs

      const res = await fetch(`${API_BASE}/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to query logs:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [selectedApp, selectedLevel, debouncedSearch]);

  // Initial load
  useEffect(() => {
    fetchApps();
    fetchLogs(true);
  }, [fetchLogs]);

  // Live SSE Stream handling
  useEffect(() => {
    if (!isLive) return;

    console.log('Connecting to SSE log stream...');
    const eventSource = new EventSource(`${API_BASE}/logs/stream`);

    eventSource.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data);
        if (entry.message === 'stream_connected') {
          console.log('SSE Stream established successfully.');
          return;
        }

        // Apply filters in-memory on incoming stream events
        const appMatches = !selectedApp || entry.appId === selectedApp;
        const levelMatches = !selectedLevel || entry.level === selectedLevel;
        
        let searchMatches = true;
        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase();
          const messageMatches = entry.message?.toLowerCase().includes(searchLower);
          const payloadMatches = entry.payload ? JSON.stringify(entry.payload).toLowerCase().includes(searchLower) : false;
          searchMatches = messageMatches || payloadMatches;
        }

        if (appMatches && levelMatches && searchMatches) {
          setLogs((prevLogs) => {
            // Check if log already exists (to avoid duplicate streaming events)
            if (prevLogs.some((l) => l.id === entry.id)) return prevLogs;
            // Prepend new stream log at the top, limit list size to 200
            return [entry, ...prevLogs].slice(0, 200);
          });
        }
        
        // Proactively refresh apps dropdown if a new appId is ingested
        if (entry.appId && !apps.includes(entry.appId)) {
          setApps(prev => [...prev, entry.appId].sort());
        }
      } catch (err) {
        console.error('Error parsing SSE stream message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Stream Error, reconnecting...', err);
      eventSource.close();
    };

    return () => {
      console.log('Closing SSE Stream connection...');
      eventSource.close();
    };
  }, [isLive, selectedApp, selectedLevel, debouncedSearch, apps]);

  const clearFilters = () => {
    setSelectedApp('');
    setSelectedLevel('');
    setSearchQuery('');
    setActiveTraceId(null);
  };

  const handleTraceSelect = (traceId: string) => {
    setActiveTraceId(traceId);
  };

  return (
    <div className="dashboard-container">
      {/* 1. Sidebar */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            padding: '0.5rem',
            borderRadius: '8px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Shield size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff' }}>ANTIGRAVITY</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>LOG CENTRAL</span>
          </div>
        </div>

        {/* Navigation list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'default'
          }}>
            <Terminal size={16} style={{ color: 'var(--accent-color)' }} />
            Console Dashboard
          </div>
        </div>

        {/* Live Status indicator in footer */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`pulse-dot ${!isLive ? 'error' : ''}`} />
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                {isLive ? 'Live Ingestion On' : 'Live Paused'}
              </span>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {isLive ? 'Streaming via SSE' : 'Showing static snapshot'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main content area */}
      <div className="main-content">
        {/* Header / Query controls */}
        <div className="header-actions">
          {/* Query search */}
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search logs by message or payload content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* App Select dropdown */}
          <select
            className="filter-select"
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
          >
            <option value="">All Applications</option>
            {apps.map((app) => (
              <option key={app} value={app}>{app}</option>
            ))}
          </select>

          {/* Level selector */}
          <select
            className="filter-select"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <option value="">All Log Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>

          {/* Timezone selector */}
          <select
            className="filter-select"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{ minWidth: '130px' }}
          >
            <option value="local">Local Time Zone</option>
            <option value="UTC">UTC Zone</option>
            <option value="Asia/Kolkata">IST (Kolkata)</option>
            <option value="America/New_York">EST (New York)</option>
            <option value="Europe/London">GMT/BST (London)</option>
          </select>

          {/* Live stream switch */}
          <button 
            className={`btn-live ${isLive ? 'active' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            <Radio size={16} />
            {isLive ? 'Live Tail' : 'Pause Live'}
          </button>

          {/* Actions */}
          <button 
            className="filter-select"
            style={{ width: 'auto', paddingRight: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}
            onClick={() => fetchLogs(true)}
            title="Refresh database snapshot"
          >
            <RotateCw size={14} /> Refresh
          </button>

          {(selectedApp || selectedLevel || searchQuery || activeTraceId) && (
            <button
              className="btn-live"
              style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--color-error)' }}
              onClick={clearFilters}
            >
              <Trash2 size={15} /> Clear Filters
            </button>
          )}
        </div>

        {/* 3. Stats section */}
        <StatsPanel logs={logs} />

        {/* 4. Logs List */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-secondary)' }}>
            <RotateCw size={24} style={{ animation: 'spin 2s linear infinite', marginRight: '0.75rem' }} /> Loading central logs...
          </div>
        ) : (
          <LogTable logs={logs} onTraceSelect={handleTraceSelect} timezone={timezone} />
        )}
      </div>

      {/* 5. Trace timeline side sheet */}
      <TraceTimeline 
        traceId={activeTraceId}
        logs={logs}
        onClose={() => setActiveTraceId(null)}
      />
    </div>
  );
}
