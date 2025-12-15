import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

interface MemberCardProps {
  member: MemberResponse;
  onEdit: (member: MemberResponse) => void;
  onDelete: (memberId: string) => void;
}

export function MemberCard({ member, onEdit, onDelete }: MemberCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete(member.id);
    setShowDeleteConfirm(false);
  };

  const createdDate = new Date(member.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">{member.name}</h3>
            <div className="mt-1">
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {member.email ? (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Email: </span>
              {member.email}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No email provided</div>
          )}
          <div className="text-sm text-gray-600">
            <span className="font-medium">Created: </span>
            {createdDate}
          </div>
        </div>

        {showDeleteConfirm ? (
          <div
            className="bg-red-50 border border-red-200 rounded p-3 mb-4"
            role="alertdialog"
            aria-labelledby="delete-confirm-title"
          >
            <p className="text-sm text-foreground mb-3" id="delete-confirm-title">
              Are you sure you want to delete {member.name}? This will also remove any exclusion
              rules involving this member. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                size="sm"
                aria-label={`Cancel delete for ${member.name}`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                variant="destructive"
                size="sm"
                aria-label={`Confirm delete for ${member.name}`}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => onEdit(member)}
              variant="outline"
              size="sm"
              className="flex-1"
              aria-label={`Edit member ${member.name}`}
            >
              Edit
            </Button>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Delete member ${member.name}`}
            >
              Delete
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
