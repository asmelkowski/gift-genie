import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function GroupDetails() {
  const { t } = useTranslation('groups');
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('details.title')}</h1>
          <p className="text-muted-foreground mt-1">ID: {groupId}</p>
        </div>
        <Button onClick={() => navigate('/groups')} variant="outline">
          {t('details.backToGroupsButton')}
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">{t('details.membersTitle')}</h2>
            <p className="text-muted-foreground text-sm">{t('details.membersDescription')}</p>
          </div>
          <Button
            onClick={() => navigate(`/groups/${groupId}/members`)}
            className="w-full sm:w-auto"
          >
            {t('details.viewMembersButton')}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">{t('details.exclusionsTitle')}</h2>
            <p className="text-muted-foreground text-sm">{t('details.exclusionsDescription')}</p>
          </div>
          <Button
            onClick={() => navigate(`/groups/${groupId}/exclusions`)}
            className="w-full sm:w-auto"
          >
            {t('details.viewExclusionsButton')}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">{t('details.drawsTitle')}</h2>
            <p className="text-muted-foreground text-sm">{t('details.drawsDescription')}</p>
          </div>
          <Button onClick={() => navigate(`/groups/${groupId}/draws`)} className="w-full sm:w-auto">
            {t('details.viewDrawsButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
