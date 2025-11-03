import { Formik, Form, Field, ErrorMessage as FormikError } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth.js';

const validationSchema = Yup.object({
  username: Yup.string().min(3).max(50).required('Username is required'),
  email: Yup.string().email('Enter a valid email').required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Must contain lowercase letter')
    .matches(/[A-Z]/, 'Must contain uppercase letter')
    .matches(/[0-9]/, 'Must contain a number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm your password')
});

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async ({ username, email, password }) => {
    setSubmitting(true);
    try {
      await register({ username, email, password });
      navigate('/login');
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-gray-800">Create an account</h1>
        <p className="mt-2 text-sm text-gray-500">
          Join the NIC Validation System to manage your verification workflows.
        </p>

        <Formik
          initialValues={{ username: '', email: '', password: '', confirmPassword: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
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
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Choose a username"
                />
                <FormikError component="p" name="username" className="mt-1 text-sm text-red-600" />
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Field
                  id="email"
                  name="email"
                  type="email"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="you@example.com"
                />
                <FormikError component="p" name="email" className="mt-1 text-sm text-red-600" />
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Field
                  id="password"
                  name="password"
                  type="password"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Create a strong password"
                />
                <FormikError component="p" name="password" className="mt-1 text-sm text-red-600" />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <Field
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Confirm your password"
                />
                <FormikError
                  component="p"
                  name="confirmPassword"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || submitting}
                className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting || submitting ? 'Creating account...' : 'Create account'}
              </button>
            </Form>
          )}
        </Formik>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
