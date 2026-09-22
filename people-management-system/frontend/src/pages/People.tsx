import { useEffect, useState } from 'react';
import api from '../api/client';
import { Person } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

type CountDatum = { label: string; count: number };
type FamilyStats = {
  total: number;
  gender: CountDatum[];
  bloodGroups: CountDatum[];
  maritalStatus: CountDatum[];
  qualifications: CountDatum[];
  locations: CountDatum[];
  ageBuckets: CountDatum[];
};
type FamilyPayload = { person: Person; familyKey: string | null; members: Person[]; stats: FamilyStats };

const FAMILY_COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#e11d48', '#475569'];

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [editing, setEditing] = useState<Person | null>(null);
  const { user } = useAuth();
  const canBulkDelete = user?.role === 'ADMIN';
  const { register, handleSubmit, reset } = useForm();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ location: '', qualification: '', bloodGroup: '', minAge: '', maxAge: '' });
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [familyState, setFamilyState] = useState<{ open: boolean; loading: boolean; data?: FamilyPayload | null }>({ open: false, loading: false, data: null });

  const handleExport = async (format: 'excel' | 'csv') => {
    const res = await api.get(`/people/export?format=${format}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `people.${format === 'excel' ? 'xlsx' : 'csv'}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/people/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchPeople();
      alert('Import successful');
      setImportOpen(false);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Import failed';
      alert(message);
    }
  };

  const fetchPeople = async () => {
    setLoading(true);
    const params: any = { search, page, limit, ...filters };
    Object.keys(params).forEach(key => params[key] === '' && delete params[key]);
    const res = await api.get('/people', { params });
    const payload = res.data;
    setPeople(payload.data || payload);
    setTotal(payload.total ?? (payload.data ? payload.data.length : 0));
    setTotalPages(payload.totalPages || 1);
    setSelectedIds(prev => {
      const current = payload.data || payload || [];
      const ids = Array.isArray(current) ? current.map((p: Person) => p.id) : [];
      return prev.filter(id => ids.includes(id));
    });
    setLoading(false);
  };

  useEffect(() => { fetchPeople(); }, [page, limit]);

  const onSubmit = async (data: any) => {
    // Ensure dateOfBirth is in ISO string for backend
    if (data.dateOfBirth) {
      data.dateOfBirth = new Date(data.dateOfBirth).toISOString();
    }
    if (editing) {
      await api.put(`/people/${editing.id}`, data);
    } else {
      await api.post('/people', data);
    }
    reset();
    setEditing(null);
    fetchPeople();
  };

  const onEdit = (person: Person) => {
    setEditing(person);
    reset(person);
  };

  const onDelete = async (id: number) => {
    if (window.confirm('Delete this person?')) {
      await api.delete(`/people/${id}`);
      fetchPeople();
    }
  };

  const openFamily = async (id: number) => {
    setFamilyState(prev => ({ open: true, loading: true, data: prev.data }));
    try {
      const res = await api.get(`/people/${id}/family`);
      setFamilyState({ open: true, loading: false, data: res.data });
    } catch (err) {
      setFamilyState({ open: false, loading: false, data: null });
      alert('Unable to load family');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected ${selectedIds.length === 1 ? 'record' : 'records'}?`)) return;
    await api.post('/people/bulk-delete', { ids: selectedIds });
    fetchPeople();
  };

  const toggleSelectAll = () => {
    const ids = people.map(p => p.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : ids);
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const allVisibleSelected = people.length > 0 && people.every(p => selectedIds.includes(p.id));

  const family = familyState.data;
  const genderData = family?.stats.gender || [];
  const ageData = family?.stats.ageBuckets || [];
  const bloodData = family?.stats.bloodGroups || [];

  const clearFilters = () => {
    setSearch('');
    setFilters({ location: '', qualification: '', bloodGroup: '', minAge: '', maxAge: '' });
    setPage(1);
    fetchPeople();
  };

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden border-none bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff, transparent 25%), radial-gradient(circle at 80% 0%, #fff, transparent 20%)' }} />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/80">Directory</p>
            <h2 className="text-3xl font-semibold">People</h2>
            <p className="text-sm text-white/90">A clean workspace to search, filter, and edit your people data without friction.</p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="badge bg-white/90 text-sky-600">Total {total}</span>
              <span className="pill bg-white/15 text-white border-white/30">Page {page} · {totalPages} pages</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleExport('csv')} className="btn-secondary bg-white/90 text-slate-900">Export CSV</button>
            <button onClick={() => handleExport('excel')} className="btn bg-white text-slate-900 shadow-lg">Export Excel</button>
            {user?.role === 'ADMIN' && (
              <button onClick={() => setImportOpen(true)} className="btn-ghost text-white border border-white/40 px-4 py-2 rounded-full">Import</button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Filters & search</h3>
              <p className="text-sm text-slate-600">Stack filters to narrow the directory quickly.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={clearFilters} className="btn-secondary">Reset</button>
              <button onClick={() => { setPage(1); fetchPeople(); }} className="btn">Search</button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name" className="input" />
            <input value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} placeholder="Location" className="input" />
            <input value={filters.qualification} onChange={e => setFilters(f => ({ ...f, qualification: e.target.value }))} placeholder="Qualification" className="input" />
            <input value={filters.bloodGroup} onChange={e => setFilters(f => ({ ...f, bloodGroup: e.target.value }))} placeholder="Blood Group" className="input" />
            <input value={filters.minAge} onChange={e => setFilters(f => ({ ...f, minAge: e.target.value }))} placeholder="Min Age" className="input" />
            <input value={filters.maxAge} onChange={e => setFilters(f => ({ ...f, maxAge: e.target.value }))} placeholder="Max Age" className="input" />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-600">
            <span className="pill">Showing {people.length} of {total || '…'}</span>
            <label className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-500">Page size</span>
              <select value={limit} onChange={e => { setPage(1); setLimit(Number(e.target.value)); }} className="input w-24">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{editing ? 'Update person' : 'Add person'}</h3>
              <p className="text-sm text-slate-600">{editing ? 'Editing an existing record' : 'Create a new record'}</p>
            </div>
            {editing && (
              <button onClick={() => { setEditing(null); reset(); }} className="btn-ghost text-sm">Clear</button>
            )}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input {...register('firstName')} placeholder="First Name" className="input" required />
            <input {...register('middleName')} placeholder="Middle Name" className="input" />
            <input {...register('lastName')} placeholder="Last Name" className="input" required />
            <input {...register('location')} placeholder="Location" className="input" required />
            <input {...register('qualification')} placeholder="Qualification" className="input" required />
            <select {...register('bloodGroup')} className="input" required defaultValue="">
              <option value="" disabled>Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
            <input {...register('dateOfBirth')} type="date" placeholder="Date of Birth" className="input" required />
            <button type="submit" className="md:col-span-2 btn w-full justify-center">
              {editing ? 'Update person' : 'Add person'}
            </button>
          </form>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Directory</h3>
            <p className="text-sm text-slate-600">{loading ? 'Loading people…' : `Showing ${people.length} of ${total || '-'}`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="pill">Page {page} / {totalPages}</span>
            {canBulkDelete && (
              <button
                disabled={!selectedIds.length || loading}
                onClick={handleBulkDelete}
                className={`btn-secondary ${!selectedIds.length || loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Bulk delete ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        <div className="overflow-auto">
          <table>
            <thead>
              <tr>
                {canBulkDelete && (
                  <th>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th>First</th><th>Middle</th><th>Last</th><th>Location</th>
                <th>Qualification</th><th>Blood</th><th>DOB</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {people.map(p => (
                <tr key={p.id}>
                  {canBulkDelete && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelectOne(p.id)}
                        aria-label={`Select ${p.firstName}`}
                      />
                    </td>
                  )}
                  <td>{p.firstName}</td>
                  <td>{p.middleName}</td>
                  <td>{p.lastName}</td>
                  <td>{p.location}</td>
                  <td>{p.qualification}</td>
                  <td>{p.bloodGroup}</td>
                  <td>{p.dateOfBirth.slice(0,10)}</td>
                  <td className="space-x-3">
                    <button onClick={() => openFamily(p.id)} className="text-indigo-600 font-semibold">Family</button>
                    <button onClick={() => onEdit(p)} className="text-sky-600 font-semibold">Edit</button>
                    {user?.role === 'ADMIN' && (
                      <button onClick={() => onDelete(p.id)} className="text-rose-600 font-semibold">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {!people.length && !loading && (
                <tr>
                  <td colSpan={canBulkDelete ? 9 : 8} className="text-center text-slate-500 py-6">No people found with these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">{loading ? 'Fetching results…' : `Page ${page} of ${totalPages}`}</div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-secondary">Prev</button>
            <button disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)} className="btn">Next</button>
          </div>
        </div>
      </div>

      {importOpen && user?.role === 'ADMIN' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Import People</h3>
                <p className="text-sm text-slate-600">Download the sample, fill it, then upload your CSV/XLSX.</p>
              </div>
              <button onClick={() => setImportOpen(false)} className="btn-ghost text-slate-500">✕</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a className="btn-secondary" href="/templates/people-template.csv" download>Download sample CSV</a>
            </div>
            <label className="block border border-dashed border-gray-300 p-4 rounded-xl cursor-pointer text-center bg-white/80 hover:border-sky-200 transition">
              <div className="mb-2 font-medium">Select CSV or Excel</div>
              <input type="file" accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleImport} className="hidden" />
              <span className="text-sm text-slate-500">Columns: firstName, middleName, lastName, location, qualification, bloodGroup, dateOfBirth (YYYY-MM-DD)</span>
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setImportOpen(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {familyState.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-5xl max-h-[90vh] overflow-auto space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Family view</p>
                <h3 className="text-lg font-semibold text-slate-900">{family?.person ? `${family.person.firstName} ${family.person.lastName}` : 'Family'}</h3>
                <p className="text-sm text-slate-600">
                  {family?.familyKey ? `Family ID: ${family.familyKey}` : 'No family ID on record'} • Members: {family?.stats.total ?? '…'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setFamilyState({ open: false, loading: false, data: null })} className="btn-ghost text-slate-500">✕</button>
              </div>
            </div>

            {familyState.loading && (
              <div className="py-10 text-center text-slate-500">Loading family…</div>
            )}

            {!familyState.loading && family && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Members</p>
                    <p className="text-2xl font-semibold text-slate-900">{family.stats.total}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Primary Blood Groups</p>
                    <div className="flex flex-wrap gap-2 pt-2 text-sm">
                      {bloodData.slice(0, 4).map(item => (
                        <span key={item.label} className="pill bg-white text-slate-800 border border-slate-200">{item.label} · {item.count}</span>
                      ))}
                      {!bloodData.length && <span className="text-slate-500">No blood group data</span>}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Top locations</p>
                    <div className="flex flex-wrap gap-2 pt-2 text-sm">
                      {family.stats.locations.slice(0, 4).map(item => (
                        <span key={item.label} className="pill bg-white text-slate-800 border border-slate-200">{item.label} · {item.count}</span>
                      ))}
                      {!family.stats.locations.length && <span className="text-slate-500">No location data</span>}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-xl bg-white border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-800">Gender mix</p>
                    </div>
                    {genderData.length ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={genderData} dataKey="count" nameKey="label" innerRadius={40} outerRadius={70}>
                              {genderData.map((entry, index) => (
                                <Cell key={entry.label} fill={FAMILY_COLORS[index % FAMILY_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No gender data</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-800">Age spread</p>
                    </div>
                    {ageData.length ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ageData}>
                            <XAxis dataKey="label" tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#0ea5e9" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No age data</p>
                    )}
                  </div>
                </div>

                <div className="overflow-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Relation</th>
                        <th>Gender</th>
                        <th>Blood</th>
                        <th>DOB</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {family.members.map(m => (
                        <tr key={m.id}>
                          <td>{`${m.firstName} ${m.middleName || ''} ${m.lastName}`.trim()}</td>
                          <td>{m.relation || '-'}</td>
                          <td>{m.gender || '-'}</td>
                          <td>{m.bloodGroup}</td>
                          <td>{m.dateOfBirth ? m.dateOfBirth.slice(0,10) : '-'}</td>
                          <td>{m.location}</td>
                        </tr>
                      ))}
                      {!family.members.length && (
                        <tr><td colSpan={6} className="text-center text-slate-500 py-4">No members</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
