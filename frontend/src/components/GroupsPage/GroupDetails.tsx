import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function GroupDetails() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Group Details</h1>
          <p className="text-gray-600 mt-1">ID: {groupId}</p>
        </div>
        <Button onClick={() => navigate('/app/groups')} variant="outline">
          Back to Groups
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">Members</h2>
            <p className="text-gray-600 text-sm">Manage members in this group</p>
          </div>
          <Button onClick={() => navigate(`/app/groups/${groupId}/members`)}>
            View Members
          </Button>
        </div>
      </div>

       <div className="bg-white rounded-lg border border-gray-200 p-6">
         <div className="flex items-center justify-between">
           <div>
             <h2 className="text-lg font-semibold mb-1">Exclusions</h2>
             <p className="text-gray-600 text-sm">Manage member pairings to exclude from draws</p>
           </div>
           <Button onClick={() => navigate(`/app/groups/${groupId}/exclusions`)}>
             View Exclusions
           </Button>
         </div>
       </div>

       <div className="bg-white rounded-lg border border-gray-200 p-6">
         <div className="flex items-center justify-between">
           <div>
             <h2 className="text-lg font-semibold mb-1">Draws</h2>
             <p className="text-gray-600 text-sm">Create and manage gift exchange draws</p>
           </div>
           <Button onClick={() => navigate(`/app/groups/${groupId}/draws`)}>
             View Draws
           </Button>
         </div>
       </div>
    </div>
  );
}
