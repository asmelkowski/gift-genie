import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './LoginForm';
import { useAuthStore } from '@/hooks/useAuthStore';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated()) {
    return <Navigate to="/groups" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle data-testid="login-page-title">{t('login.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-gray-600">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="text-blue-600 hover:underline">
              {t('login.registerLink')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
