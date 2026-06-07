import { X, GitBranch, ArrowDown, ShieldCheck } from 'lucide-react';

interface TraceTimelineProps {
  traceId: string | null;
  logs: any[];
  onClose: () => void;
}

export const TraceTimeline = ({ traceId, logs, onClose }: TraceTimelineProps) => {
  if (!traceId) return null;

  // Filter logs for this specific traceId, sorted oldest to newest
  const traceLogs = logs
    .filter(log => log.traceId === traceId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate overall timeline metrics
  const incoming = traceLogs.find(log => log.payload?.direction === 'incoming');
  const maxDuration = incoming?.payload?.durationMs || 
                      traceLogs.reduce((max, log) => Math.max(max, log.payload?.durationMs || 0), 0) || 
                      1000;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 'min(580px, 90vw)',
      backgroundColor: '#0f0f13',
      borderLeft: '1px solid var(--border-color)',
      boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GitBranch style={{ color: 'var(--accent-color)' }} size={22} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Transaction Trace Flow</h3>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              ID: {traceId}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <X size={20} />
        </button>
      </div>

      {/* Drawer Body (Timeline Graph) */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {traceLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No transaction records found for this trace ID.
          </div>
        ) : (
          traceLogs.map((log, index) => {
            const direction = log.payload?.direction;
            const isIncoming = direction === 'incoming';
            const duration = log.payload?.durationMs;
            const status = log.payload?.response?.status;
            
            // Latency bar calculations
            const widthPercentage = duration ? Math.min(100, (duration / maxDuration) * 100) : 0;
            const isSlow = duration && duration > 1000;

            return (
              <div 
                key={log.id} 
                style={{
                  display: 'flex',
                  gap: '1rem',
                  position: 'relative',
                  paddingLeft: isIncoming ? 0 : '1.5rem',
                  animation: `fadeIn 0.2s ease-out ${index * 0.05}s forwards`,
                  opacity: 0
                }}
              >
                {/* Vertical Connector Line */}
                {index < traceLogs.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: isIncoming ? '12px' : '36px',
                    top: '24px',
                    bottom: '-1.5rem',
                    width: '1px',
                    borderLeft: '1px dashed #3f3f46',
                    zIndex: 0
                  }} />
                )}

                {/* Node icon */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: isIncoming ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: isIncoming ? '2px solid var(--accent-color)' : '1.5px solid var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  zIndex: 1,
                  color: isIncoming ? 'var(--accent-color)' : 'var(--text-secondary)'
                }}>
                  {isIncoming ? <ShieldCheck size={12} /> : <ArrowDown size={11} />}
                </div>

                {/* Card details */}
                <div style={{
                  flexGrow: 1,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  zIndex: 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      letterSpacing: '0.05em', 
                      textTransform: 'uppercase',
                      color: isIncoming ? 'var(--accent-color)' : '#93c5fd'
                    }}>
                      {isIncoming ? 'INCOMING CALL' : 'OUTGOING API CALL'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ fontWeight: 500, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                    {isIncoming ? log.message : `${log.payload?.request?.method || 'GET'} ${log.payload?.request?.url || log.message}`}
                  </div>

                  {/* Relative Latency Bar */}
                  {duration !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <div style={{ 
                        flexGrow: 1, 
                        height: '6px', 
                        backgroundColor: '#18181b', 
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          width: `${widthPercentage}%`, 
                          height: '100%', 
                          backgroundColor: isSlow ? 'var(--color-error)' : (isIncoming ? 'var(--accent-color)' : 'var(--color-info)'),
                          borderRadius: '3px',
                          transition: 'width 0.5s ease-out'
                        }} />
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontFamily: 'var(--font-mono)', 
                        fontWeight: 600,
                        color: isSlow ? 'var(--color-error)' : 'var(--text-secondary)',
                        flexShrink: 0
                      }}>
                        {duration} ms
                      </span>
                    </div>
                  )}

                  {/* Response status */}
                  {status !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        fontFamily: 'var(--font-mono)',
                        color: status >= 400 ? 'var(--color-error)' : '#10b981'
                      }}>
                        {status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
