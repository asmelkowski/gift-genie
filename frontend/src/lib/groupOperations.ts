export interface GroupOperation {
  code: string;
  label: string;
  category: string;
  description: string;
  privileged?: boolean;
}

export const GROUP_OPERATIONS: GroupOperation[] = [
  // Group Management
  {
    code: 'groups:read',
    label: 'Read group',
    category: 'Group Management',
    description: 'View group details and settings',
  },
  {
    code: 'groups:update',
    label: 'Update group',
    category: 'Group Management',
    description: 'Modify group settings',
  },
  {
    code: 'groups:delete',
    label: 'Delete group',
    category: 'Group Management',
    description: 'Delete the group permanently',
  },

  // Member Management
  {
    code: 'members:read',
    label: 'View members',
    category: 'Member Management',
    description: 'View group members',
  },
  {
    code: 'members:create',
    label: 'Add members',
    category: 'Member Management',
    description: 'Add new members',
  },
  {
    code: 'members:update',
    label: 'Update members',
    category: 'Member Management',
    description: 'Modify member details',
  },
  {
    code: 'members:delete',
    label: 'Remove members',
    category: 'Member Management',
    description: 'Remove members from group',
  },

  // Draw Management
  {
    code: 'draws:read',
    label: 'View draws',
    category: 'Draw Management',
    description: 'View draw information',
  },
  {
    code: 'draws:create',
    label: 'Create draws',
    category: 'Draw Management',
    description: 'Create new draws',
  },
  {
    code: 'draws:finalize',
    label: 'Finalize draws',
    category: 'Draw Management',
    description: 'Lock and finalize draws',
  },
  {
    code: 'draws:view_assignments',
    label: 'View assignments',
    category: 'Draw Management',
    description: 'View draw pairings',
  },
  {
    code: 'draws:notify',
    label: 'Send notifications',
    category: 'Draw Management',
    description: 'Send email notifications',
    privileged: true,
  },

  // Exclusion Management
  {
    code: 'exclusions:read',
    label: 'View exclusions',
    category: 'Exclusion Management',
    description: 'View exclusion rules',
  },
  {
    code: 'exclusions:create',
    label: 'Create exclusions',
    category: 'Exclusion Management',
    description: 'Create exclusion rules',
  },
  {
    code: 'exclusions:delete',
    label: 'Delete exclusions',
    category: 'Exclusion Management',
    description: 'Remove exclusion rules',
  },
];

/**
 * Groups operations by their category for easier rendering.
 * Returns a Map where keys are category names and values are arrays of operations in that category.
 */
export function groupOperationsByCategory(): Map<string, GroupOperation[]> {
  const grouped = new Map<string, GroupOperation[]>();
  for (const op of GROUP_OPERATIONS) {
    const ops = grouped.get(op.category) || [];
    ops.push(op);
    grouped.set(op.category, ops);
  }
  return grouped;
}
