import { Database, AlertTriangle, Cpu, Activity } from 'lucide-react';

interface StatsPanelProps {
  logs: any[];
}

export const StatsPanel = ({ logs }: StatsPanelProps) => {
  // Calculations
  const totalLogs = logs.length;
  
  const errorLogs = logs.filter(log => log.level === 'error').length;
  const errorRate = totalLogs > 0 ? ((errorLogs / totalLogs) * 100).toFixed(1) : '0.0';

  // Average Latency from transactions
  const transactions = logs.filter(log => log.type === 'transaction' && log.payload?.durationMs !== undefined);
  const totalLatency = transactions.reduce((acc, log) => acc + (log.payload.durationMs || 0), 0);
  const avgLatency = transactions.length > 0 ? (totalLatency / transactions.length).toFixed(0) : '0';

  // Log level throughput
  const warningLogs = logs.filter(log => log.level === 'warn').length;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      {/* Stat 1: Total Logs */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          padding: '0.75rem',
          borderRadius: '10px',
          color: '#6366f1',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Database size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>TOTAL INGESTED</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{totalLogs.toLocaleString()}</h3>
        </div>
      </div>

      {/* Stat 2: Error Rate */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          padding: '0.75rem',
          borderRadius: '10px',
          color: 'var(--color-error)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <AlertTriangle size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>ERROR RATE</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem', color: Number(errorRate) > 5 ? 'var(--color-error)' : 'var(--text-primary)' }}>
            {errorRate}%
          </h3>
        </div>
      </div>

      {/* Stat 3: Avg Latency */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          padding: '0.75rem',
          borderRadius: '10px',
          color: 'var(--color-info)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Activity size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>AVG LATENCY</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>
            {avgLatency} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ms</span>
          </h3>
        </div>
      </div>

      {/* Stat 4: Warnings & Alerts */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          padding: '0.75rem',
          borderRadius: '10px',
          color: 'var(--color-warn)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Cpu size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>WARNINGS</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{warningLogs}</h3>
        </div>
      </div>
    </div>
  );
};
