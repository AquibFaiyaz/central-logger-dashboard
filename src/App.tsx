import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RotateCw, Trash2, Shield, Radio, Terminal, Menu, Clock } from 'lucide-react';
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
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const [totalLogs, setTotalLogs] = useState<number>(0);

  // Time Range State
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [customStartTime, setCustomStartTime] = useState<string>('');
  const [customEndTime, setCustomEndTime] = useState<string>('');
  
  // UI & Live States
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(true); // default to live stream!
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>('local');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Compute time range boundaries
  const timeRangeBounds = useMemo(() => {
    if (timeRange === 'custom') {
      return {
        startTime: customStartTime ? new Date(customStartTime).toISOString() : undefined,
        endTime: customEndTime ? new Date(customEndTime).toISOString() : undefined,
      };
    }
    const hoursMap: Record<string, number> = { '1h': 1, '2h': 2, '5h': 5, '24h': 24 };
    const hours = hoursMap[timeRange];
    if (hours) {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      return { startTime, endTime: undefined };
    }
    return { startTime: undefined, endTime: undefined };
  }, [timeRange, customStartTime, customEndTime]);

  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));

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
      if (timeRangeBounds.startTime) params.append('startTime', timeRangeBounds.startTime);
      if (timeRangeBounds.endTime) params.append('endTime', timeRangeBounds.endTime);
      params.append('limit', String(pageSize));
      params.append('offset', String((currentPage - 1) * pageSize));

      const res = await fetch(`${API_BASE}/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setTotalLogs(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to query logs:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [selectedApp, selectedLevel, debouncedSearch, currentPage, pageSize, timeRangeBounds]);

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
    setTimeRange('1h');
    setCustomStartTime('');
    setCustomEndTime('');
    setCurrentPage(1);
  };

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedApp, selectedLevel, debouncedSearch, timeRange, customStartTime, customEndTime]);

  const handleTraceSelect = (traceId: string) => {
    setActiveTraceId(traceId);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="dashboard-container">
      {/* Mobile sidebar overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} 
        onClick={() => setSidebarOpen(false)} 
      />

      {/* 1. Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
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
          {/* Mobile menu toggle */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar menu"
          >
            <Menu size={20} />
          </button>

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

          {/* Time Range selector */}
          <select
            className="filter-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ minWidth: '130px' }}
          >
            <option value="1h">Last 1 Hour</option>
            <option value="2h">Last 2 Hours</option>
            <option value="5h">Last 5 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="custom">Custom Range</option>
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

          {(selectedApp || selectedLevel || searchQuery || activeTraceId || timeRange !== '1h') && (
            <button
              className="btn-live"
              style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--color-error)' }}
              onClick={clearFilters}
            >
              <Trash2 size={15} /> Clear Filters
            </button>
          )}
        </div>

        {/* Custom Time Range Picker */}
        {timeRange === 'custom' && (
          <div className="time-range-picker">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Custom Range:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                From
                <input
                  type="datetime-local"
                  className="time-input"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                To
                <input
                  type="datetime-local"
                  className="time-input"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {/* 3. Stats section */}
        <StatsPanel logs={logs} />

        {/* 4. Logs List & Pagination */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-secondary)' }}>
            <RotateCw size={24} style={{ animation: 'spin 2s linear infinite', marginRight: '0.75rem' }} /> Loading central logs...
          </div>
        ) : (
          <LogTable 
            logs={logs} 
            onTraceSelect={handleTraceSelect} 
            timezone={timezone}
            currentPage={currentPage}
            pageSize={pageSize}
            totalLogs={totalLogs}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
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
