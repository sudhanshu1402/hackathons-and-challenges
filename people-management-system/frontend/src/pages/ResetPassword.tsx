import { useForm } from 'react-hook-form';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    await api.post('/auth/reset-password', data);
    alert('Password reset successful');
    navigate('/login');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl mb-4">Reset Password</h2>
      <input {...register('token')} placeholder="Reset Token" className="input mb-2 w-full" />
      <input {...register('newPassword')} type="password" placeholder="New Password" className="input mb-2 w-full" />
      <button type="submit" className="btn w-full bg-blue-600 text-white py-2 rounded">Reset</button>
    </form>
  );
}
