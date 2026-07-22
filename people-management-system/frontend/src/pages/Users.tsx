import { useEffect, useState } from 'react';
import api from '../api/client';
import { User } from '../types';
import { useForm } from 'react-hook-form';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const { register, handleSubmit, reset } = useForm();

  const fetchUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const onSubmit = async (data: any) => {
    await api.post('/users', data);
    reset();
    fetchUsers();
  };

  const onDelete = async (id: number) => {
    if (window.confirm('Delete this user?')) {
      await api.delete(`/users/${id}`);
      fetchUsers();
    }
  };

  return (
    <div>
      <h2 className="text-xl mb-4">Users</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mb-6 flex gap-2">
        <input {...register('username')} placeholder="Username" className="input" required />
        <input {...register('password')} type="password" placeholder="Password" className="input" required />
        <select {...register('role')} className="input" required>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
      </form>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th>Username</th><th>Role</th><th>Created</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-t">
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>{u.createdAt.slice(0,10)}</td>
              <td>
                <button onClick={() => onDelete(u.id)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
