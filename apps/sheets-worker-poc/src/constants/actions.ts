export const ALLOWED_ACTIONS = ["create_child_order", "use_points"] as const;

export type ActionName = (typeof ALLOWED_ACTIONS)[number];

export const ALLOWED_ACTION_SET = new Set<string>(ALLOWED_ACTIONS);
