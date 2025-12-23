import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterForm } from '@/components/RegisterForm';
import { useAuthStore } from '@/hooks/useAuthStore';

export function RegisterPage() {
  const { t } = useTranslation('auth');
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated()) {
    return <Navigate to="/app/groups" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('register.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-gray-600">
            {t('register.haveAccount')}{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              {t('register.loginLink')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
