import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from './Auth';
import { Brand, ErrorMessage, Field } from './UI';
import { errorMessage, media } from './api';
export default function Login({ admin = false, register = false }) {
  const { login, logout } = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const user = await login(form, register);
      if (admin && user.role === 'CUSTOMER') {
        await logout();
        throw Error('Use an internal team account to access the OMS.');
      }
      if (!admin && user.role !== 'CUSTOMER') {
        await logout();
        throw Error('Use a customer account for the storefront. Team accounts sign in to the OMS.');
      }
      navigate(location.state?.from || (admin ? '/' : '/account'), { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <h2>{admin ? 'Good business starts with a clear view.' : 'A better setup starts here.'}</h2>
          <p>
            {admin
              ? 'Every order, every product, and every next step. Your NOVARA workspace brings it all together.'
              : 'Thoughtfully chosen technology. Keep your favorites close and follow every order, from our desk to yours.'}
          </p>
          <img
            src={media('/media/catalog/workspace.jpg')}
            alt="Laptop and everyday tools on a bright workspace"
          />
        </div>
        <p className="small">NOVARA {admin ? 'Commerce workspace' : 'Thoughtfully chosen tech'}</p>
      </section>
      <section className="auth-form">
        <div>
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <h1>{register ? 'Create your account' : admin ? 'Sign in to your workspace' : 'Welcome back'}</h1>
          <p className="intro">
            {register
              ? 'A home for your orders and your next great find.'
              : admin
                ? 'Manage the day, one order at a time.'
                : 'Your next great setup is waiting.'}
          </p>
          <ErrorMessage message={error} />
          <form onSubmit={submit}>
            {register && <Field label="Full name" name="name" autoComplete="name" required maxLength={100} />}
            <Field label="Email address" name="email" type="email" autoComplete="email" required />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? 10 : undefined}
              maxLength={72}
              required
            />
            {register && <p className="small muted">Use at least 10 characters.</p>}
            <button className="primary full" disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="auth-links">
            {!admin && (
              <span>
                {register ? 'Already have an account?' : 'New to NOVARA?'}{' '}
                <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create account'}</Link>
              </span>
            )}
            {!admin && <Link to="/">Back to shop</Link>}
          </div>
          <p className="fine">
            <LockKeyhole size={13} />{' '}
            {admin
              ? 'Internal access for authorized NOVARA team members.'
              : 'This is a demonstration store. All payments are simulated.'}
          </p>
        </div>
      </section>
    </main>
  );
}
