import { useForm } from 'react-hook-form';
import api from '../api/client';
import { useState } from 'react';

export default function ForgotPassword() {
  const { register, handleSubmit } = useForm();
  const [token, setToken] = useState<string | null>(null);

  const onSubmit = async (data: any) => {
    const res = await api.post('/auth/forgot-password', data);
    setToken(res.data.token);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl mb-4">Forgot Password</h2>
      <input {...register('username')} placeholder="Username" className="input mb-2 w-full" />
      <button type="submit" className="btn w-full bg-blue-600 text-white py-2 rounded">Request Reset</button>
      {token && (
        <div className="mt-4">
          <div className="text-green-600">Reset token: {token}</div>
        </div>
      )}
    </form>
  );
}
