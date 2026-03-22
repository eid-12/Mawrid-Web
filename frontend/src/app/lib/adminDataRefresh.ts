/** Dispatched from AdminLayout when the admin navigates between portal routes. */
export const ADMIN_DATA_REFRESH_EVENT = 'mawrid:admin-portal-data-refresh';

export function dispatchAdminDataRefresh(): void {
  window.dispatchEvent(new CustomEvent(ADMIN_DATA_REFRESH_EVENT));
}
