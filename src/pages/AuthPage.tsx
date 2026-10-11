
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import { supabase } from '../supabase';

type AuthMode = 'login' | 'signup' | 'recovery' | 'updatePassword';

interface AuthPageProps {
  initialMode?: AuthMode;
}

export function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/?reset-password=true`,
          },
        );

        if (error) throw error;

        setMessage(
          'Si existe una cuenta con ese correo, recibirás un enlace para recuperar la contraseña. Revisa también la carpeta de spam.',
        );
        return;
      }

      if (mode === 'updatePassword') {
        if (password.length < 8) {
          throw new Error('La contraseña debe tener al menos 8 caracteres.');
        }

        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) throw error;

        window.location.replace(window.location.origin);
return;  
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        if (!data.session) {
          setMessage(
            'Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.',
          );
        } else {
          setMessage('Cuenta creada correctamente.');
        }

        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se ha podido completar la operación.',
      );
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === 'signup'
      ? 'Empieza con FocusUp'
      : mode === 'recovery'
        ? 'Recupera tu cuenta'
        : mode === 'updatePassword'
          ? 'Nueva contraseña'
          : 'Qué bueno verte';

  const description =
    mode === 'signup'
      ? 'Crea tu cuenta y organiza tus estudios.'
      : mode === 'recovery'
        ? 'Te enviaremos un enlace para recuperar el acceso.'
        : mode === 'updatePassword'
          ? 'Elige una contraseña nueva para tu cuenta.'
          : 'Inicia sesión para continuar con tus estudios.';

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(45rem 30rem at 15% 15%, rgb(var(--primary) / 0.16), transparent 65%), radial-gradient(40rem 30rem at 90% 90%, rgb(var(--accent) / 0.12), transparent 65%)',
        }}
      />

      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg">
            <BookOpen className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">FocusUp</span>
        </div>

        <section className="card p-6 sm:p-8">
          <div className="mb-7 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-soft">
              STUDY SMARTER
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted">{description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'updatePassword' && (
              <div>
                <label className="label" htmlFor="auth-email">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <input
                    id="auth-email"
                    className="input pl-10"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {mode !== 'recovery' && (
              <div>
                <label className="label" htmlFor="auth-password">
                  {mode === 'updatePassword'
                    ? 'Nueva contraseña'
                    : 'Contraseña'}
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <input
                    id="auth-password"
                    className="input pl-10"
                    type="password"
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {mode === 'updatePassword' && (
              <div>
                <label className="label" htmlFor="auth-confirm-password">
                  Repite la nueva contraseña
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <input
                    id="auth-confirm-password"
                    className="input pl-10"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Escribe la contraseña otra vez"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success"
              >
                {message}
              </p>
            )}

            <button
              className="btn-primary w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'signup'
                    ? 'Crear cuenta'
                    : mode === 'recovery'
                      ? 'Enviar enlace de recuperación'
                      : mode === 'updatePassword'
                        ? 'Guardar nueva contraseña'
                        : 'Iniciar sesión'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-semibold text-primary-soft hover:underline"
              onClick={() => changeMode('recovery')}
            >
              ¿Has olvidado tu contraseña?
            </button>
          )}

         {mode === 'signup' && (
  <p className="mt-6 text-center text-sm text-muted">
    ¿Ya tienes cuenta?{' '}
    <button
      type="button"
      className="font-semibold text-primary-soft hover:underline"
      onClick={() => changeMode('login')}
    >
      Inicia sesión
    </button>
  </p>
)}

{mode === 'login' && (
  <p className="mt-6 text-center text-sm text-muted">
    ¿Aún no tienes cuenta?{' '}
    <button
      type="button"
      className="font-semibold text-primary-soft hover:underline"
      onClick={() => changeMode('signup')}
    >
      Crear cuenta
    </button>
  </p>
)}

{mode === 'recovery' && (
  <p className="mt-6 text-center text-sm text-muted">
    ¿Ya recuerdas tu contraseña?{' '}
    <button
      type="button"
      className="font-semibold text-primary-soft hover:underline"
      onClick={() => changeMode('login')}
    >
      Volver al inicio de sesión
    </button>
  </p>
)}

          {mode === 'updatePassword' && (
            <button
              type="button"
              className="mt-5 w-full text-center text-sm font-semibold text-primary-soft hover:underline"
              onClick={() => changeMode('login')}
            >
              Volver al inicio de sesión
            </button>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-subtle">
          Tu espacio personal para organizarte, concentrarte y progresar.
        </p>
      </div>
    </main>
  );
}
