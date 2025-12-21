import { useState, useMemo, useCallback } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useUserPermissions, type Permission } from '@/hooks/useUserPermissions';
import { useAvailablePermissions } from '@/hooks/useAvailablePermissions';
import { useGroupNames } from '@/hooks/useGroupNames';
import { useRevokePermission } from '@/hooks/useRevokePermission';
import { useGrantPermission } from '@/hooks/useGrantPermission';
import {
  extractGroupIds,
  parsePermissionCode,
} from '@/lib/permissionHelpers';
import { PermissionSection } from './PermissionSection';
import { PermissionRow } from './PermissionRow';
import { AvailablePermissionRow } from './AvailablePermissionRow';
import { GrantGroupAccessSection } from './GrantGroupAccessSection';

interface PermissionManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
}

export function PermissionManagerDialog({
  isOpen,
  onClose,
  userId,
  userName,
  userEmail,
}: PermissionManagerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: userPermissions = [], isLoading: userPermLoading } =
    useUserPermissions(userId);
  const { data: allPermissions = [], isLoading: availablePermLoading } =
    useAvailablePermissions();

  // Mutations
  const revokeMutation = useRevokePermission(userId);
  const grantMutation = useGrantPermission(userId);

  // Compute available permissions (system permissions minus granted ones)
  const availablePermissions = useMemo(() => {
    const userPermissionCodes = new Set(userPermissions.map((p) => p.code));
    return (allPermissions || []).filter((p) => !userPermissionCodes.has(p.code));
  }, [allPermissions, userPermissions]);

  // Extract group IDs and fetch group names
  const groupIds = useMemo(() => {
    const userGroupIds = extractGroupIds(userPermissions);
    const availableGroupIdsArray = extractGroupIds(availablePermissions);
    // Combine both and deduplicate
    return Array.from(new Set([...userGroupIds, ...availableGroupIdsArray]));
  }, [userPermissions, availablePermissions]);
  const { groupNames, isLoading: groupNamesLoading } = useGroupNames(groupIds);

  const isLoading = userPermLoading || groupNamesLoading || availablePermLoading;

  // Helper function to match search query
  const matchesSearch = useCallback(
    (permission: Permission, groupName?: string): boolean => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        permission.code.toLowerCase().includes(query) ||
        permission.name.toLowerCase().includes(query) ||
        permission.description.toLowerCase().includes(query) ||
        (groupName ? groupName.toLowerCase().includes(query) : false)
      );
    },
    [searchQuery]
  );

  // Helper function to group permissions by resourceId and separate system permissions
  const groupPermissions = useCallback(
    (permissions: Permission[]) => {
      const groupsMap = new Map<string, Permission[]>();
      const systemPermissions: Permission[] = [];

      for (const permission of permissions) {
        const parsed = parsePermissionCode(permission.code);

        // System permissions are those without a resourceId (admin:*, groups:create, etc.)
        if (!parsed.resourceId) {
          systemPermissions.push(permission);
        } else {
          // Group by resourceId
          const perms = groupsMap.get(parsed.resourceId) || [];
          perms.push(permission);
          groupsMap.set(parsed.resourceId, perms);
        }
      }

      return {
        grouped: groupsMap,
        ungrouped: systemPermissions,
      };
    },
    []
  );

  // Group permissions by resourceId and separate system permissions
  const { grouped, ungrouped } = useMemo(
    () => groupPermissions(userPermissions),
    [userPermissions, groupPermissions]
  );

  // Group available permissions
  const { grouped: availableGrouped, ungrouped: availableUngrouped } = useMemo(
    () => groupPermissions(availablePermissions),
    [availablePermissions, groupPermissions]
  );

  // Filter ungrouped permissions by search
  const filteredUngrouped = useMemo(
    () => ungrouped.filter((p) => matchesSearch(p)),
    [ungrouped, matchesSearch]
  );

   // Filter grouped permissions by search
   const filteredGrouped = useMemo(() => {
     const result = new Map<string, Permission[]>();

     for (const [groupId, perms] of grouped.entries()) {
       const groupName = groupNames.get(groupId);
       const filtered = perms.filter((p) => matchesSearch(p, groupName));
       if (filtered.length > 0) {
         result.set(groupId, filtered);
       }
     }

     return result;
   }, [grouped, groupNames, matchesSearch]);

   // Filter ungrouped available permissions by search
   const filteredAvailableUngrouped = useMemo(
     () => availableUngrouped.filter((p) => matchesSearch(p)),
     [availableUngrouped, matchesSearch]
   );

   // Filter grouped available permissions by search
   const filteredAvailableGrouped = useMemo(() => {
     const result = new Map<string, Permission[]>();

     for (const [groupId, perms] of availableGrouped.entries()) {
       const groupName = groupNames.get(groupId);
       const filtered = perms.filter((p) => matchesSearch(p, groupName));
       if (filtered.length > 0) {
         result.set(groupId, filtered);
       }
     }

     return result;
   }, [availableGrouped, groupNames, matchesSearch]);

  async function handleRevoke(code: string) {
    await revokeMutation.mutateAsync(code);
  }

  async function handleGrant(code: string) {
    await grantMutation.mutateAsync({ permission_code: code });
  }

  const totalPermissions = userPermissions.length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Permissions for ${userName}`}
      testId="permission-dialog"
    >
      <div
        className="space-y-4 max-h-[75vh] overflow-y-auto"
        data-testid="permission-dialog-content"
      >
        {/* User Info */}
        <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-3">
          <div
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
            data-testid="permission-dialog-title"
          >
            {userName}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {userEmail}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {totalPermissions} permissions granted
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search permissions by name, code, or group..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />

         {isLoading ? (
           <div className="flex justify-center py-8">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
           </div>
         ) : (
           <div className="space-y-4">
              {/* Grant Group-Specific Access Section */}
              <GrantGroupAccessSection
                userId={userId}
                userPermissions={userPermissions}
              />

              {/* Separator */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Available Permissions Section */}
              {filteredAvailableUngrouped.length > 0 || filteredAvailableGrouped.size > 0 ? (
               <div className="space-y-4">
                 {/* System Available Permissions Section */}
                 {filteredAvailableUngrouped.length > 0 && (
                   <PermissionSection
                     title="Available System Permissions"
                     count={filteredAvailableUngrouped.length}
                     icon="➕"
                   >
                     <div className="space-y-1">
                        {filteredAvailableUngrouped.map((perm) => (
                          <AvailablePermissionRow
                            key={perm.code}
                            permission={perm}
                            testId={`available-permission-${perm.code}`}
                            onGrant={handleGrant}
                            isGranting={grantMutation.isPending}
                          />
                        ))}
                      </div>
                   </PermissionSection>
                 )}

                 {/* Group Available Permissions Sections */}
                 {Array.from(filteredAvailableGrouped.entries()).map(([groupId, perms]) => {
                   const groupName = groupNames.get(groupId) || `Group (${groupId.slice(0, 8)}...)`;
                   return (
                     <PermissionSection
                       key={groupId}
                       title={`${groupName} (Available)`}
                       count={perms.length}
                       icon="📦"
                     >
                       <div className="space-y-1">
                          {perms.map((perm) => (
                            <AvailablePermissionRow
                              key={perm.code}
                              permission={perm}
                              groupName={groupName}
                              testId={`available-permission-${perm.code}`}
                              onGrant={handleGrant}
                              isGranting={grantMutation.isPending}
                            />
                          ))}
                        </div>
                     </PermissionSection>
                   );
                 })}
               </div>
             ) : (
               <div className="text-center py-4">
                 <p className="text-sm text-gray-500 dark:text-gray-400">
                   All permissions granted
                 </p>
               </div>
             )}

            {/* Granted Permissions Section */}
            {totalPermissions === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No permissions granted
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* System Permissions Section */}
                {filteredUngrouped.length > 0 && (
                  <PermissionSection
                    title="Granted System Permissions"
                    count={filteredUngrouped.length}
                    icon="📋"
                  >
                    <div className="space-y-1">
                      {filteredUngrouped.map((perm) => (
                        <PermissionRow
                          key={perm.code}
                          permission={perm}
                          onRevoke={() => handleRevoke(perm.code)}
                          isRevoking={revokeMutation.isPending}
                        />
                      ))}
                    </div>
                  </PermissionSection>
                )}

                {/* Group Permissions Sections */}
                {Array.from(filteredGrouped.entries()).map(([groupId, perms]) => {
                  const groupName = groupNames.get(groupId) || `Group (${groupId.slice(0, 8)}...)`;
                  return (
                    <PermissionSection
                      key={groupId}
                      title={groupName}
                      count={perms.length}
                      icon="🎄"
                    >
                      <div className="space-y-1">
                        {perms.map((perm) => (
                          <PermissionRow
                            key={perm.code}
                            permission={perm}
                            groupName={groupName}
                            onRevoke={() => handleRevoke(perm.code)}
                            isRevoking={revokeMutation.isPending}
                          />
                        ))}
                      </div>
                    </PermissionSection>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="close-permission-dialog"
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
