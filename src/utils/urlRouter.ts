/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * URL ROUTER & PUBLIC MENU ROUTE RESOLVER (Phase 5)
 * Detects public menu routes (/m/<code}, #/m/<code}, ?m=<code}) with optional table parameter (?t=<tableNumber>).
 */

import { getResolvedAppUrl } from '../components/brand/PermanentAppBrandBadge.tsx';

export interface ParsedRoute {
  isPublicMenu: boolean;
  establishmentCode?: string;
  tableNumber?: string;
}

export function parseAppRoute(): ParsedRoute {
  if (typeof window === 'undefined') return { isPublicMenu: false };

  const pathname = window.location.pathname || '';
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  // 1. Direct path: /m/R.0001 or /m/R.0001?t=3
  const pathMatch = pathname.match(/\/m\/([^/?#]+)/i);
  if (pathMatch) {
    const urlParams = new URLSearchParams(search);
    return {
      isPublicMenu: true,
      establishmentCode: decodeURIComponent(pathMatch[1]),
      tableNumber: urlParams.get('t') || undefined,
    };
  }

  // 2. Hash route: #/m/R.0001?t=3 or #m/R.0001
  const hashMatch = hash.match(/#\/?m\/([^/?&]+)/i);
  if (hashMatch) {
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashQuery);
    return {
      isPublicMenu: true,
      establishmentCode: decodeURIComponent(hashMatch[1]),
      tableNumber: hashParams.get('t') || undefined,
    };
  }

  // 3. Search query: ?m=R.0001&t=3
  const queryParams = new URLSearchParams(search);
  const qMenu = queryParams.get('m');
  if (qMenu) {
    return {
      isPublicMenu: true,
      establishmentCode: decodeURIComponent(qMenu),
      tableNumber: queryParams.get('t') || undefined,
    };
  }

  return { isPublicMenu: false };
}

/**
 * Builds the canonical public QR menu link for an establishment and optional table.
 */
export function getPublicMenuUrl(establishmentCode: string, tableNumber?: string): string {
  const base = getResolvedAppUrl().replace(/\/+$/, '');
  const url = `${base}/m/${encodeURIComponent(establishmentCode)}`;
  return tableNumber ? `${url}?t=${encodeURIComponent(tableNumber)}` : url;
}
