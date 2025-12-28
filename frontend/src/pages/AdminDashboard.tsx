import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminUsers, useAdminGroups } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// date-fns not strictly required if I use simple date formatting, but let's assume standard JS Date
import { Loader2, Search, Shield } from 'lucide-react';
import { PermissionManagerDialog } from '@/components/AdminDashboard/PermissionManagerDialog';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export function AdminDashboard() {
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');

  return (
    <div className="container mx-auto py-8 px-4" data-testid="admin-dashboard">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('header.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('header.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
          >
            {t('tabs.users')}
          </Button>
          <Button
            variant={activeTab === 'groups' ? 'default' : 'outline'}
            onClick={() => setActiveTab('groups')}
          >
            {t('tabs.groups')}
          </Button>
        </div>
      </div>

      {activeTab === 'users' ? <UsersTable /> : <GroupsTable />}
    </div>
  );
}

function UsersTable() {
  const { t } = useTranslation(['admin', 'common']);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const pageSize = 10;

  const { data, isLoading } = useAdminUsers({ page, pageSize, search });

  const handleOpenPermissions = (userId: string, name: string, email: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(name);
    setSelectedUserEmail(email);
  };

  const handleClosePermissions = () => {
    setSelectedUserId(null);
    setSelectedUserName('');
    setSelectedUserEmail('');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>{t('admin:users.title')}</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="user-search-input"
                placeholder={t('admin:users.searchPlaceholder')}
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table layout for larger screens */}
              <div className="hidden md:block rounded-md border">
                <table className="w-full text-sm" data-testid="users-table">
                  <thead>
                    <tr className="border-b bg-muted/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {t('admin:users.table.name')}
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {t('admin:users.table.email')}
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {t('admin:users.table.role')}
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {t('admin:users.table.permissions')}
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {t('admin:users.table.joined')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                          {t('admin:users.table.noUsers')}
                        </td>
                      </tr>
                    ) : (
                      data?.data.map(user => (
                        <UserTableRow
                          key={user.id}
                          user={user}
                          onManagePermissions={() =>
                            handleOpenPermissions(user.id, user.name, user.email)
                          }
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Card layout for mobile screens */}
              <div className="md:hidden flex flex-col gap-3">
                {data?.data.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('admin:users.table.noUsers')}
                  </div>
                ) : (
                  data?.data.map(user => (
                    <UserMobileCard
                      key={user.id}
                      user={user}
                      onManagePermissions={() =>
                        handleOpenPermissions(user.id, user.name, user.email)
                      }
                    />
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center sm:justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="pagination-prev"
                >
                  {t('common:actions.back')}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {t('admin:actions.pageInfo', {
                    current: page,
                    total: data?.meta.total_pages || 1,
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data?.meta.total_pages || 1, p + 1))}
                  disabled={page >= (data?.meta.total_pages || 1)}
                  data-testid="pagination-next"
                >
                  {t('common:actions.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <PermissionManagerDialog
          isOpen={!!selectedUserId}
          onClose={handleClosePermissions}
          userId={selectedUserId}
          userName={selectedUserName}
          userEmail={selectedUserEmail}
        />
      )}
    </>
  );
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface UserTableRowProps {
  user: User;
  onManagePermissions: () => void;
}

function UserTableRow({ user, onManagePermissions }: UserTableRowProps) {
  const { t } = useTranslation('admin');
  const { data: permissions = [] } = useUserPermissions(user.id);

  const permissionCountDisplay =
    user.role === 'admin' ? t('users.permissions.admin') : `${permissions.length}`;

  return (
    <tr
      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
      data-testid={`user-row-${user.id}`}
    >
      <td className="p-4 align-middle font-medium">{user.name}</td>
      <td className="p-4 align-middle">{user.email}</td>
      <td className="p-4 align-middle capitalize">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            user.role === 'admin'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}
        >
          {user.role === 'admin' ? t('users.role.admin') : t('users.role.user')}
        </span>
      </td>
      <td className="p-4 align-middle">
        <div className="flex items-center gap-3">
          <span
            className="text-sm text-muted-foreground"
            data-testid={`permission-count-${user.id}`}
          >
            {permissionCountDisplay}
          </span>
          {user.role !== 'admin' && (
            <Button
              size="sm"
              variant="outline"
              onClick={onManagePermissions}
              className="gap-2"
              data-testid={`manage-permissions-${user.id}`}
            >
              <Shield className="h-4 w-4" />
              {t('users.actions.manage')}
            </Button>
          )}
        </div>
      </td>
      <td className="p-4 align-middle">{new Date(user.created_at).toLocaleDateString()}</td>
    </tr>
  );
}

function UserMobileCard({ user, onManagePermissions }: UserTableRowProps) {
  const { t } = useTranslation('admin');
  const { data: permissions = [] } = useUserPermissions(user.id);

  const permissionCountDisplay =
    user.role === 'admin' ? t('users.permissions.admin') : `${permissions.length}`;

  return (
    <div className="p-4 rounded-lg border bg-card" data-testid={`user-card-${user.id}`}>
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{user.name}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            user.role === 'admin'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}
        >
          {user.role === 'admin' ? t('users.role.admin') : t('users.role.user')}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">
          {t('admin:users.table.permissions')}: {permissionCountDisplay}
        </span>
        <span className="text-muted-foreground">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      </div>
      {user.role !== 'admin' && (
        <Button
          size="sm"
          variant="outline"
          onClick={onManagePermissions}
          className="w-full mt-3 gap-2"
          data-testid={`manage-permissions-mobile-${user.id}`}
        >
          <Shield className="h-4 w-4" />
          {t('users.actions.manage')}
        </Button>
      )}
    </div>
  );
}

function GroupsTable() {
  const { t } = useTranslation(['admin', 'common']);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 10;

  const { data, isLoading } = useAdminGroups({ page, pageSize, search });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>{t('admin:groups.title')}</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin:groups.searchPlaceholder')}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table layout for larger screens */}
            <div className="hidden md:block rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t('admin:groups.table.name')}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t('admin:groups.table.adminId')}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t('admin:groups.table.historyEnabled')}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t('admin:groups.table.created')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        {t('admin:groups.table.noGroups')}
                      </td>
                    </tr>
                  ) : (
                    data?.data.map(group => (
                      <tr
                        key={group.id}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <td className="p-4 align-middle font-medium">{group.name}</td>
                        <td className="p-4 align-middle font-mono text-xs">
                          {group.admin_user_id}
                        </td>
                        <td className="p-4 align-middle">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              group.historical_exclusions_enabled
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {group.historical_exclusions_enabled
                              ? t('admin:groups.table.yes')
                              : t('admin:groups.table.no')}
                          </span>
                        </td>
                        <td className="p-4 align-middle">
                          {new Date(group.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Card layout for mobile screens */}
            <div className="md:hidden flex flex-col gap-3">
              {data?.data.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t('admin:groups.table.noGroups')}
                </div>
              ) : (
                data?.data.map(group => (
                  <div key={group.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <p className="font-medium">{group.name}</p>
                      <span
                        className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          group.historical_exclusions_enabled
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {group.historical_exclusions_enabled
                          ? t('admin:groups.table.yes')
                          : t('admin:groups.table.no')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mb-1">
                      {group.admin_user_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center sm:justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('common:actions.back')}
              </Button>
              <div className="text-sm text-muted-foreground">
                {t('admin:actions.pageInfo', { current: page, total: data?.meta.total_pages || 1 })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data?.meta.total_pages || 1, p + 1))}
                disabled={page >= (data?.meta.total_pages || 1)}
              >
                {t('common:actions.next')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
