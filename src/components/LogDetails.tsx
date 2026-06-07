import { useState } from 'react';
import { GitBranch, ArrowRight, CornerDownRight } from 'lucide-react';

interface LogDetailsProps {
  log: any;
  onTraceSelect: (traceId: string) => void;
}

export const LogDetails = ({ log, onTraceSelect }: LogDetailsProps) => {
  const [activeTab, setActiveTab] = useState<'http' | 'json'>(
    log.type === 'transaction' && log.payload ? 'http' : 'json'
  );

  const payload = log.payload || {};
  const isTransaction = log.type === 'transaction';
  const hasHttpInfo = isTransaction && payload.request;

  return (
    <div>
      {/* Tabs list */}
      <div className="details-tabs">
        {hasHttpInfo && (
          <button 
            className={`tab-btn ${activeTab === 'http' ? 'active' : ''}`}
            onClick={() => setActiveTab('http')}
          >
            HTTP Details
          </button>
        )}
        <button 
          className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
          onClick={() => setActiveTab('json')}
        >
          Raw JSON Payload
        </button>

        {log.traceId && (
          <button 
            className="tab-btn" 
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#818cf8', fontWeight: 600 }}
            onClick={() => onTraceSelect(log.traceId)}
          >
            <GitBranch size={13} /> View Full Trace Flow
          </button>
        )}
      </div>

      {/* Tab 1: HTTP View */}
      {activeTab === 'http' && hasHttpInfo && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Request Info */}
          <div style={{ background: '#09090b', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <ArrowRight size={14} style={{ color: 'var(--color-info)' }} /> REQUEST DETAILS
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--text-muted)' }}>ENDPOINT: </span>
                <span style={{ color: '#fff', fontWeight: 500 }}>
                  {payload.request?.method} {payload.request?.url}
                </span>
              </div>
              {payload.request?.params && Object.keys(payload.request.params).length > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>QUERY PARAMS:</span>
                  <pre className="json-block" style={{ marginTop: '0.25rem', padding: '0.5rem', maxHeight: '150px' }}>
                    {JSON.stringify(payload.request.params, null, 2)}
                  </pre>
                </div>
              )}
              {payload.request?.body && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>BODY / PARAMS:</span>
                  <pre className="json-block" style={{ marginTop: '0.25rem', padding: '0.5rem', maxHeight: '200px' }}>
                    {JSON.stringify(payload.request.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Response Info */}
          <div style={{ background: '#09090b', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <CornerDownRight size={14} style={{ color: payload.response?.status >= 400 ? 'var(--color-error)' : '#10b981' }} /> RESPONSE DETAILS
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--text-muted)' }}>STATUS: </span>
                <span style={{ 
                  color: payload.response?.status >= 400 ? 'var(--color-error)' : '#10b981',
                  fontWeight: 600 
                }}>
                  {payload.response?.status || 'N/A'}
                </span>
              </div>
              {payload.response?.body && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>RESPONSE BODY:</span>
                  <pre className="json-block" style={{ marginTop: '0.25rem', padding: '0.5rem', maxHeight: '200px' }}>
                    {JSON.stringify(payload.response.body, null, 2)}
                  </pre>
                </div>
              )}
              {payload.response?.error && (
                <div style={{ color: 'var(--color-error)', fontFamily: 'var(--font-mono)', padding: '0.5rem', backgroundColor: 'rgba(244, 63, 94, 0.08)', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                  <strong>Error: </strong> {payload.response.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Raw JSON Block */}
      {activeTab === 'json' && (
        <pre className="json-block" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </div>
  );
};
