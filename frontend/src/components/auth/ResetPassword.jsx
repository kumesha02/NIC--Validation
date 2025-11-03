import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage as FormikError } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService.js';

const validationSchema = Yup.object({
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

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-gray-800">Invalid reset link</h1>
          <p className="mt-2 text-sm text-gray-500">
            The reset token is missing or invalid. Request a new link.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async ({ password }) => {
    try {
      await authService.resetPassword({ token, password });
      toast.success('Password updated. Please sign in.');
      navigate('/login');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-gray-800">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-500">
          Create a new password that meets the security requirements.
        </p>

        <Formik initialValues={{ password: '', confirmPassword: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  New password
                </label>
                <Field
                  id="password"
                  name="password"
                  type="password"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Enter new password"
                />
                <FormikError component="p" name="password" className="mt-1 text-sm text-red-600" />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm password
                </label>
                <Field
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Confirm new password"
                />
                <FormikError
                  component="p"
                  name="confirmPassword"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Resetting password...' : 'Reset password'}
              </button>
            </Form>
          )}
        </Formik>

        <p className="mt-6 text-center text-sm text-gray-500">
          Remembered your password?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
