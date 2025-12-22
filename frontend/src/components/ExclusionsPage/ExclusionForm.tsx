import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

interface ExclusionFormProps {
  members: MemberResponse[];
  onSubmit: (giver_member_id: string, receiver_member_id: string, is_mutual: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ExclusionForm({
  members,
  onSubmit,
  onCancel,
  isLoading = false,
}: ExclusionFormProps) {
  const [giverMemberId, setGiverMemberId] = useState('');
  const [receiverMemberId, setReceiverMemberId] = useState('');
  const [isMutual, setIsMutual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!giverMemberId) {
      setError('Please select a giver member');
      return;
    }

    if (!receiverMemberId) {
      setError('Please select a receiver member');
      return;
    }

    if (giverMemberId === receiverMemberId) {
      setError('Giver and receiver cannot be the same member');
      return;
    }

    onSubmit(giverMemberId, receiverMemberId, isMutual);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="giver">Giver Member</Label>
        <select
          id="giver"
          value={giverMemberId}
          onChange={e => setGiverMemberId(e.target.value)}
          disabled={isLoading}
          className="w-full mt-1 px-3 py-2 border border-input bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:bg-input/30"
        >
          <option value="" className="dark:bg-gray-900">
            Select giver member
          </option>
          {members.map(member => (
            <option key={member.id} value={member.id} className="dark:bg-gray-900">
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="receiver">Receiver Member</Label>
        <select
          id="receiver"
          value={receiverMemberId}
          onChange={e => setReceiverMemberId(e.target.value)}
          disabled={isLoading}
          className="w-full mt-1 px-3 py-2 border border-input bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:bg-input/30"
        >
          <option value="" className="dark:bg-gray-900">
            Select receiver member
          </option>
          {members.map(member => (
            <option key={member.id} value={member.id} className="dark:bg-gray-900">
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="mutual"
          checked={isMutual}
          onChange={e => setIsMutual(e.target.checked)}
          disabled={isLoading}
          className="w-4 h-4 border-input rounded focus:ring-2 focus:ring-ring"
        />
        <Label htmlFor="mutual" className="mb-0 cursor-pointer">
          Mutual exclusion (both directions)
        </Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Creating...' : 'Create Exclusion'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
