import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    try {
      const res = await api.post('/auth/login', data);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl mb-4">Login</h2>
      <input {...register('username')} placeholder="Username" className="input mb-2 w-full" />
      {errors.username && <div className="text-red-500">{errors.username.message}</div>}
      <input {...register('password')} type="password" placeholder="Password" className="input mb-2 w-full" />
      {errors.password && <div className="text-red-500">{errors.password.message}</div>}
      <button type="submit" className="btn w-full bg-blue-600 text-white py-2 rounded">Login</button>
      <Link to="/forgot-password" className="block mt-2 text-blue-600">Forgot password?</Link>
    </form>
  );
}
