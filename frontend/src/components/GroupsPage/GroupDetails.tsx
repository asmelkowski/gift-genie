import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, ShieldOff, Gift, ChevronLeft } from 'lucide-react';

export default function GroupDetails() {
  const { t } = useTranslation('groups');
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const sections = [
    {
      title: t('details.membersTitle'),
      description: t('details.membersDescription'),
      icon: <Users className="size-6 text-primary" />,
      buttonText: t('details.viewMembersButton'),
      path: `/groups/${groupId}/members`,
    },
    {
      title: t('details.exclusionsTitle'),
      description: t('details.exclusionsDescription'),
      icon: <ShieldOff className="size-6 text-primary" />,
      buttonText: t('details.viewExclusionsButton'),
      path: `/groups/${groupId}/exclusions`,
    },
    {
      title: t('details.drawsTitle'),
      description: t('details.drawsDescription'),
      icon: <Gift className="size-6 text-primary" />,
      buttonText: t('details.viewDrawsButton'),
      path: `/groups/${groupId}/draws`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b pb-6">
        <div>
          <button
            onClick={() => navigate('/groups')}
            className="group flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            {t('details.backToGroupsButton')}
          </button>
          <h1 className="text-4xl font-serif font-bold text-foreground tracking-tight">
            {t('details.title')}
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-2 bg-muted/50 px-2 py-1 rounded w-fit">
            ID: {groupId}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {sections.map((section, index) => (
          <Card
            key={index}
            className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="p-2.5 rounded-xl bg-muted/50 group-hover:scale-110 transition-transform">
                {section.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription className="mt-1">{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex justify-end">
              <Button
                onClick={() => navigate(section.path)}
                variant="secondary"
                className="group/btn h-10 px-6 rounded-full font-semibold"
              >
                {section.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
