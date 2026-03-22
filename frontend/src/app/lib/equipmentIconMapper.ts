import type { LucideIcon } from 'lucide-react';
import {
  Box,
  Camera,
  Laptop,
  Monitor,
  MousePointer,
  Package,
  Presentation,
  Smartphone,
  Wrench,
} from 'lucide-react';

const keywordGroups: Array<{ icon: LucideIcon; keywords: string[] }> = [
  {
    icon: Smartphone,
    keywords: [
      'phone', 'mobile', 'iphone', 'android', 'galaxy', 'pixel', 'huawei', 'smartphone',
      'جوال', 'هاتف', 'موبايل'
    ],
  },
  {
    icon: Laptop,
    keywords: [
      'mac', 'apple', 'laptop', 'thinkpad', 'notebook', 'macbook', 'lenovo', 'hp', 'asus',
      'حاسب', 'لابتوب'
    ],
  },
  {
    icon: Monitor,
    keywords: [
      'screen', 'monitor', 'display', 'dell', 'samsung', 'lg', '24-inch', '27-inch',
      'شاشة', 'monitoring'
    ],
  },
  {
    icon: Presentation,
    keywords: ['projector', 'epson', 'benq', 'beam', 'presentation', 'بروجكتر', 'عارض'],
  },
  {
    icon: Camera,
    keywords: ['camera', 'canon', 'nikon', 'sony', 'fujifilm', 'webcam', 'كاميرا'],
  },
  {
    icon: Wrench,
    keywords: [
      'tool', 'kit', 'hammer', 'solder', 'multimeter', 'station', 'lab', 'maintenance',
      'عدة', 'ادوات', 'مختبر'
    ],
  },
  {
    icon: MousePointer,
    keywords: ['mouse', 'keyboard', 'logitech', 'keychron', 'input', 'ماوس', 'كيبورد'],
  },
];

export function getEquipmentIcon(name: string, category?: string): LucideIcon {
  const normalized = `${name ?? ''} ${category ?? ''}`.trim().toLowerCase();
  if (!normalized) return Package;

  let bestIcon: LucideIcon | null = null;
  let bestScore = 0;

  for (const group of keywordGroups) {
    const score = group.keywords.reduce((acc, keyword) => (
      normalized.includes(keyword) ? acc + 1 : acc
    ), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIcon = group.icon;
    }
  }

  if (bestIcon) return bestIcon;

  // Keep Box as fallback; Package can be used interchangeably.
  return Box;
}

