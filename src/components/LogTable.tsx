import { useState, Fragment } from 'react';
import { ChevronRight, ChevronDown, GitBranch, Clock } from 'lucide-react';
import { LogDetails } from './LogDetails.tsx';

interface LogTableProps {
  logs: any[];
  onTraceSelect: (traceId: string) => void;
  timezone: string;
}

export const LogTable = ({ logs, onTraceSelect, timezone }: LogTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };

      if (timezone !== 'local') {
        options.timeZone = timezone;
      }

      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(d);

      const getVal = (type: string) => parts.find(p => p.type === type)?.value || '';

      const year = getVal('year');
      const month = getVal('month');
      const day = getVal('day');
      const hour = getVal('hour');
      const minute = getVal('minute');
      const second = getVal('second');

      const ms = String(d.getMilliseconds()).padStart(3, '0');
      
      let tzLabel = '';
      if (timezone === 'local') {
        try {
          const shortName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
            .formatToParts(d)
            .find(p => p.type === 'timeZoneName')?.value || 'Local';
          tzLabel = shortName;
        } catch {
          tzLabel = 'Local';
        }
      } else if (timezone === 'UTC') {
        tzLabel = 'UTC';
      } else {
        if (timezone === 'Asia/Kolkata') tzLabel = 'IST';
        else if (timezone === 'America/New_York') tzLabel = 'EST';
        else if (timezone === 'Europe/London') tzLabel = 'GMT';
        else tzLabel = timezone.split('/').pop() || timezone;
      }

      return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms} [${tzLabel}]`;
    } catch (e) {
      return isoString;
    }
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'badge-badge badge-error';
      case 'warn':
      case 'warning': return 'badge badge-warn';
      case 'debug': return 'badge badge-debug';
      default: return 'badge badge-info';
    }
  };

  return (
    <div className="log-table-container">
      {/* Table Header */}
      <div className="log-row-header" style={{ fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={14} /> TIME
        </div>
        <div>APP</div>
        <div>LEVEL</div>
        <div>TYPE</div>
        <div>MESSAGE</div>
        <div style={{ textAlign: 'right' }}>DURATION</div>
      </div>

      {logs.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No logs found matching your filters. Make sure the backend is active.
        </div>
      ) : (
        logs.map((log) => {
          const isExpanded = expandedId === log.id;
          const isTransaction = log.type === 'transaction';
          const duration = log.payload?.durationMs;

          return (
            <Fragment key={log.id}>
              {/* Desktop Log Row (hidden on mobile via CSS) */}
              <div 
                className={`log-row ${isExpanded ? 'expanded' : ''}`} 
                onClick={() => toggleExpand(log.id)}
              >
                {/* Time with toggle arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                  {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
                  {formatTimestamp(log.timestamp)}
                </div>

                {/* App ID */}
                <div style={{ fontWeight: 500, color: '#e4e4e7' }}>{log.appId}</div>

                {/* Level */}
                <div>
                  <span className={getLevelBadgeClass(log.level)}>{log.level}</span>
                </div>

                {/* Type */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: isTransaction ? '#818cf8' : 'var(--text-muted)' }}>
                  {log.type}
                </div>

                {/* Message */}
                <div className="log-cell-message" title={log.message}>
                  {log.message}
                </div>

                {/* Duration / Trace Actions */}
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  {isTransaction && duration !== undefined && (
                    <span style={{ fontFamily: 'var(--font-mono)', color: duration > 1000 ? 'var(--color-error)' : 'var(--text-secondary)' }}>
                      {duration} ms
                    </span>
                  )}
                  {log.traceId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTraceSelect(log.traceId);
                      }}
                      title="Filter by this trace session"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-color)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <GitBranch size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Log Row (shown on mobile via CSS) */}
              <div 
                className={`log-row-mobile ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleExpand(log.id)}
              >
                <div className="log-row-mobile-top">
                  <div className="log-row-mobile-meta">
                    {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                    <span className={getLevelBadgeClass(log.level)}>{log.level}</span>
                    <span style={{ fontWeight: 500, fontSize: '0.8rem', color: '#e4e4e7' }}>{log.appId}</span>
                    {isTransaction && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#818cf8' }}>{log.type}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {isTransaction && duration !== undefined && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: duration > 1000 ? 'var(--color-error)' : 'var(--text-secondary)' }}>
                        {duration}ms
                      </span>
                    )}
                    {log.traceId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onTraceSelect(log.traceId); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      >
                        <GitBranch size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="log-row-mobile-message" title={log.message}>
                  {log.message}
                </div>
                <div className="log-row-mobile-time">
                  {formatTimestamp(log.timestamp)}
                </div>
              </div>

              {/* Collapsible Details (shared between desktop and mobile) */}
              {isExpanded && (
                <div className="log-details-expanded" onClick={(e) => e.stopPropagation()}>
                  <LogDetails log={log} onTraceSelect={onTraceSelect} />
                </div>
              )}
            </Fragment>
          );
        })
      )}
    </div>
  );
};
