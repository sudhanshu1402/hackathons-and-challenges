import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

type ChartDatum = { label: string; count: number };

type Overview = {
  total: number;
  gender: Record<string, number>;
  ageBuckets: ChartDatum[];
  bloodGroups: ChartDatum[];
  locations: ChartDatum[];
  qualifications: ChartDatum[];
  maritalStatus: ChartDatum[];
  professions: ChartDatum[];
  sampraday: ChartDatum[];
  families: { key: string; size: number; members: { id: number; name: string }[] }[];
};

const palette = ['#2563eb', '#fb7185', '#22d3ee', '#a855f7', '#f59e0b', '#10b981', '#94a3b8'];

export default function Reports() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<null | { key: string; members: { id: number; name: string }[] }>(null);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [personLoading, setPersonLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    qualification: '',
    bloodGroup: '',
    gender: '',
    minAge: '',
    maxAge: '',
  });

  const fetchOverview = async () => {
    setLoading(true);
    const params: any = { ...filters };
    Object.keys(params).forEach(k => params[k] === '' && delete params[k]);
    const res = await api.get('/reports/overview', { params });
    setOverview(res.data);
    setLoading(false);
  };

  useEffect(() => {
    const id = setTimeout(() => { fetchOverview(); }, 250);
    return () => clearTimeout(id);
  }, [filters]);

  const genderData = useMemo(() => {
    if (!overview) return [] as ChartDatum[];
    return Object.entries(overview.gender).map(([label, count]) => ({ label, count }));
  }, [overview]);

  const statCards = [
    { label: 'Total people', value: overview?.total ?? '-' },
    { label: 'Male', value: overview?.gender?.male ?? 0 },
    { label: 'Female', value: overview?.gender?.female ?? 0 },
    { label: 'Other/Unknown', value: (overview?.total ?? 0) - ((overview?.gender?.male ?? 0) + (overview?.gender?.female ?? 0)) },
  ];

  const clearFilters = () => {
    setFilters({ search: '', location: '', qualification: '', bloodGroup: '', gender: '', minAge: '', maxAge: '' });
  };

  const fetchPerson = async (id: number) => {
    setPersonLoading(true);
    try {
      const res = await api.get(`/people/${id}`);
      setSelectedPerson(res.data);
    } finally {
      setPersonLoading(false);
    }
  };

  const renderBar = (data: ChartDatum[], title: string, horizontal = false) => (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <span className="pill text-xs">{data.reduce((s, d) => s + d.count, 0)} total</span>
      </div>
      {data.length ? (
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart
              data={data}
              layout={horizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              {horizontal ? <YAxis dataKey="label" type="category" /> : <XAxis dataKey="label" />}
              {horizontal ? <XAxis type="number" /> : <YAxis />}
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No data.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden border-none bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff, transparent 25%), radial-gradient(circle at 80% 0%, #fff, transparent 20%)' }} />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/80">Reports</p>
            <h2 className="text-3xl font-semibold">Insight Dashboard</h2>
            <p className="text-sm text-white/90">Live filters + charts for gender, age, blood group, location, and qualifications.</p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="badge bg-white/90 text-slate-800">{overview?.total ?? '-'} people</span>
              <span className="pill bg-white/15 text-white border-white/30">Auto-refresh on filter change</span>
            </div>
          </div>
          <div className="text-sm text-white/80">{loading ? 'Refreshing…' : 'Live'}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
            <p className="text-sm text-slate-600">Adjust any filter to update the dashboard instantly.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clearFilters} className="btn-secondary">Reset</button>
            <button onClick={fetchOverview} className="btn">Refresh</button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 mt-4">
          <input className="input" placeholder="Search name" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          <input className="input" placeholder="Location" value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} />
          <input className="input" placeholder="Qualification" value={filters.qualification} onChange={e => setFilters(f => ({ ...f, qualification: e.target.value }))} />
          <select className="input" value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}>
            <option value="">Any gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <select className="input" value={filters.bloodGroup} onChange={e => setFilters(f => ({ ...f, bloodGroup: e.target.value }))}>
            <option value="">Any blood group</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Min age" value={filters.minAge} onChange={e => setFilters(f => ({ ...f, minAge: e.target.value }))} />
            <input className="input" placeholder="Max age" value={filters.maxAge} onChange={e => setFilters(f => ({ ...f, maxAge: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {statCards.map(card => (
          <div key={card.label} className="card">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
            <div className="text-3xl font-semibold text-slate-900 mt-1">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-900">Gender split</h3>
            <span className="pill text-xs">{genderData.reduce((s, d) => s + d.count, 0)} total</span>
          </div>
          {genderData.length ? (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={genderData} dataKey="count" nameKey="label" innerRadius={60} outerRadius={90} paddingAngle={3}>
                    {genderData.map((entry, index) => (
                      <Cell key={entry.label} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No data.</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-900">Age buckets</h3>
            <span className="pill text-xs">{overview?.ageBuckets?.reduce((s, d) => s + d.count, 0) ?? 0} total</span>
          </div>
          {overview?.ageBuckets?.length ? (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={overview.ageBuckets} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#22d3ee" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No data.</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {renderBar((overview?.bloodGroups || []).slice(0, 8), 'Blood groups')}
        {renderBar((overview?.locations || []).slice(0, 8), 'Top locations', true)}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {renderBar((overview?.qualifications || []).slice(0, 8), 'Top qualifications', true)}
        {renderBar((overview?.professions || []).slice(0, 8), 'Top professions')}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {renderBar((overview?.sampraday || []).slice(0, 8), 'Sampraday distribution')}
        {renderBar((overview?.maritalStatus || []).slice(0, 6), 'Marital status')}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-900">Family clusters (by Connect serial)</h3>
          <span className="pill text-xs">{overview?.families?.length ?? 0} groups</span>
        </div>
        {overview?.families?.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {overview.families.map(f => (
              <button
                key={f.key}
                className="text-left border border-slate-200 rounded-xl p-3 bg-white hover:border-sky-200 transition"
                onClick={() => { setSelectedFamily(f); setSelectedPerson(null); }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">#{f.key}</span>
                  <span className="pill text-xs">Members: {f.size}</span>
                </div>
                <div className="text-sm text-slate-600 line-clamp-2">
                  {f.members.map(m => m.name).join(', ')}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No family data found.</p>
        )}
      </div>

      {selectedFamily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="card w-full max-w-2xl relative">
            <button className="btn-ghost absolute top-3 right-3" onClick={() => { setSelectedFamily(null); setSelectedPerson(null); }}>✕</button>
            <h3 className="text-xl font-semibold text-slate-900">Family #{selectedFamily.key}</h3>
            <p className="text-sm text-slate-600 mb-3">Click a member to view details.</p>
            <div className="grid gap-2 md:grid-cols-2">
              {selectedFamily.members.map(m => (
                <button
                  key={m.id}
                  onClick={() => fetchPerson(m.id)}
                  className="text-left border border-slate-200 rounded-lg p-3 bg-white hover:border-sky-200"
                >
                  <div className="font-semibold text-slate-900">{m.name}</div>
                  <div className="text-xs text-slate-500">ID: {m.id}</div>
                </button>
              ))}
            </div>

            {personLoading && <p className="mt-3 text-sm text-slate-500">Loading member…</p>}
            {selectedPerson && !personLoading && (
              <div className="mt-4 border border-slate-200 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{selectedPerson.firstName} {selectedPerson.lastName}</div>
                    <div className="text-sm text-slate-600">{selectedPerson.qualification}</div>
                  </div>
                  {selectedPerson.bloodGroup && <span className="pill text-xs">{selectedPerson.bloodGroup}</span>}
                </div>
                <div className="grid gap-2 md:grid-cols-2 mt-3 text-sm text-slate-700">
                  <div><span className="text-slate-500">Gender:</span> {selectedPerson.gender || '-'}</div>
                  <div><span className="text-slate-500">Marital:</span> {selectedPerson.maritalStatus || '-'}</div>
                  <div><span className="text-slate-500">Profession:</span> {selectedPerson.profession || '-'}</div>
                  <div><span className="text-slate-500">Location:</span> {selectedPerson.location || '-'}</div>
                  <div><span className="text-slate-500">Sampraday:</span> {selectedPerson.sampraday || '-'}</div>
                  <div><span className="text-slate-500">Connect #:</span> {selectedPerson.nbSerialNumber || '-'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
