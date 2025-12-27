import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import type { Permission } from '@/hooks/useUserPermissions';
import type { components } from '@/types/schema';
import { useGrantPermission } from '@/hooks/useGrantPermission';
import { useAdminGroups } from '@/hooks/useAdmin';
import { groupOperationsByCategory } from '@/lib/groupOperations';
import { PermissionSection } from './PermissionSection';

type AdminGroupResponse = components['schemas']['AdminGroupResponse'];

interface GrantGroupAccessSectionProps {
  userId: string;
  userPermissions: Permission[];
  onGrantComplete?: () => void;
}

export function GrantGroupAccessSection({
  userId,
  userPermissions,
  onGrantComplete,
}: GrantGroupAccessSectionProps) {
  const { t } = useTranslation('admin');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedOps, setSelectedOps] = useState<Set<string>>(new Set());
  const [isGranting, setIsGranting] = useState(false);

  // Fetch groups
  const { data: groupsData, isLoading: groupsLoading } = useAdminGroups({
    page: 1,
    pageSize: 100,
    search: '',
  });

  const grantMutation = useGrantPermission(userId);

  // Check if user already has a permission for the selected group
  const hasPermission = useCallback(
    (opCode: string): boolean => {
      if (!selectedGroupId) return false;
      const resourcePermCode = `${opCode}:${selectedGroupId}`;
      return userPermissions.some(p => p.code === resourcePermCode);
    },
    [selectedGroupId, userPermissions]
  );

  // Group operations by category
  const operationsByCategory = useMemo(() => groupOperationsByCategory(), []);

  // Available groups
  const availableGroups = useMemo(() => {
    if (!groupsData?.data) return [];
    return groupsData.data;
  }, [groupsData]);

  // Handle checkbox toggle
  const handleOpToggle = useCallback((opCode: string) => {
    setSelectedOps(prev => {
      const next = new Set(prev);
      if (next.has(opCode)) {
        next.delete(opCode);
      } else {
        next.add(opCode);
      }
      return next;
    });
  }, []);

  // Handle batch grant
  const handleGrantSelected = useCallback(async () => {
    if (!selectedGroupId || selectedOps.size === 0) return;

    setIsGranting(true);
    try {
      const permissionsToGrant = Array.from(selectedOps).map(op => `${op}:${selectedGroupId}`);

      await Promise.all(
        permissionsToGrant.map(code => grantMutation.mutateAsync({ permission_code: code }))
      );

      // Reset form on success
      setSelectedGroupId(null);
      setSelectedOps(new Set());
      onGrantComplete?.();
    } catch (error) {
      // Error toasts handled by mutation hook
      console.error('Failed to grant permissions:', error);
    } finally {
      setIsGranting(false);
    }
  }, [selectedGroupId, selectedOps, grantMutation, onGrantComplete]);

  const selectedCount = selectedOps.size;
  const isDisabled = !selectedGroupId || selectedCount === 0 || isGranting;
  const isLoading = groupsLoading;

  return (
    <div className="space-y-4">
      <PermissionSection title={t('grantAccess.title')} count={availableGroups.length} icon="🔐">
        <div className="space-y-4 p-3">
          {/* Group Dropdown */}
          <div className="space-y-2">
            <label
              htmlFor="group-select"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('grantAccess.selectGroup')}
            </label>
            <select
              id="group-select"
              data-testid="select-group-dropdown"
              value={selectedGroupId || ''}
              onChange={e => {
                setSelectedGroupId(e.target.value || null);
                setSelectedOps(new Set()); // Clear selections when group changes
              }}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="">{t('grantAccess.chooseGroup')}</option>
              {availableGroups.map((group: AdminGroupResponse) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Operations Checkboxes - Only show if group selected */}
          {selectedGroupId && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('grantAccess.toGrant')}
                </p>

                {/* Group operations by category */}
                <div className="space-y-4">
                  {Array.from(operationsByCategory.entries()).map(([category, ops]) => (
                    <div key={category} className="space-y-2">
                      {/* Category Header */}
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {category}
                      </h4>

                      {/* Category Operations */}
                      <div className="space-y-2 ml-2">
                        {ops.map(op => {
                          const alreadyHas = hasPermission(op.code);
                          const isSelected = selectedOps.has(op.code);

                          return (
                            <label
                              key={op.code}
                              className={`flex items-start gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                                alreadyHas ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                data-testid={`operation-checkbox-${op.code}`}
                                checked={isSelected}
                                onChange={() => handleOpToggle(op.code)}
                                disabled={alreadyHas || isGranting}
                                className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {op.label}
                                  </span>
                                  {op.privileged && (
                                    <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                  {op.description}
                                </p>
                                {alreadyHas && (
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 italic">
                                    {t('grantAccess.alreadyGranted')}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grant Button */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <Button
                  data-testid="grant-group-access-button"
                  onClick={handleGrantSelected}
                  disabled={isDisabled}
                  className="w-full"
                >
                  {isGranting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t('grantAccess.grantButton')}{' '}
                  {selectedCount > 0
                    ? `${selectedCount} ${t('grantAccess.selected')} `
                    : `${t('grantAccess.selected')} `}
                  {selectedCount === 1 ? t('grantAccess.permission') : t('grantAccess.permissions')}
                </Button>
              </div>
            </>
          )}

          {!isLoading && availableGroups.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('grantAccess.noGroups')}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
      </PermissionSection>
    </div>
  );
}
