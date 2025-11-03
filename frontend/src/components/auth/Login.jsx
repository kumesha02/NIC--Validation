import { Formik, Form, Field, ErrorMessage as FormikError } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth.js';

const validationSchema = Yup.object({
  username: Yup.string().min(3).max(50).required('Username is required'),
  password: Yup.string().required('Password is required')
});

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid credentials';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-gray-800">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">Sign in to continue to the NIC Validation Dashboard.</p>

        <Formik initialValues={{ username: '', password: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form className="mt-6 space-y-4">
              <div>
                <label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username
                </label>
                <Field
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Enter your username"
                />
                <FormikError component="p" name="username" className="mt-1 text-sm text-red-600" />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Field
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Enter your password"
                />
                <FormikError component="p" name="password" className="mt-1 text-sm text-red-600" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link to="/register" className="text-primary-600 hover:text-primary-500">
                  Create account
                </Link>
                <Link to="/forgot-password" className="text-primary-600 hover:text-primary-500">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || submitting}
                className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting || submitting ? 'Signing in...' : 'Sign in'}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Login;
