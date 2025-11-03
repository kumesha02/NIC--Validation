import { Formik, Form, Field, ErrorMessage as FormikError } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService.js';

const validationSchema = Yup.object({
  email: Yup.string().email('Enter a valid email').required('Email is required')
});

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values, { resetForm }) => {
    try {
      await authService.forgotPassword(values);
      toast.success('If your email is registered, a reset link has been sent.');
      setSubmitted(true);
      resetForm();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to process reset request';
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-gray-800">Forgot password?</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter the email linked to your account and we&apos;ll send reset instructions.
        </p>

        <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form className="mt-6 space-y-4">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
              </button>
            </Form>
          )}
        </Formik>

        {submitted && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Check your inbox for the reset email. Remember to inspect your spam folder if it&apos;s not
            visible.
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="text-primary-600 hover:text-primary-500">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
