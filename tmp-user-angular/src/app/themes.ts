export type ThemeOption = {
  id: string;
  name: string;
  description: string;
  preview: string;
};

export const DEFAULT_THEME = 'aqua';

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'aqua',
    name: 'Aqua Flow',
    description: 'โทนฟ้าใส สะอาดตา เน้นความเรียบง่าย',
    preview: 'linear-gradient(120deg, #0ea5e9, #38bdf8)',
  },
  {
    id: 'sunset',
    name: 'Sunset Amber',
    description: 'โทนส้มอุ่น ๆ ดูเป็นกันเองสำหรับแผงขาย',
    preview: 'linear-gradient(120deg, #fb923c, #f97316)',
  },
  {
    id: 'forest',
    name: 'Forest Matcha',
    description: 'โทนเขียวพาสเทล ให้ความรู้สึกสดชื่น',
    preview: 'linear-gradient(120deg, #22c55e, #84cc16)',
  },
  {
    id: 'noir',
    name: 'Noir Velvet',
    description: 'โทนมืดพรีเมียม เน้นตัวอักษรอ่านง่าย',
    preview: 'linear-gradient(120deg, #0f172a, #312e81)',
  },
  {
    id: 'berry',
    name: 'Berry Punch',
    description: 'โทนม่วง-ชมพูสดใส เสริมพลังให้แบรนด์',
    preview: 'linear-gradient(120deg, #ec4899, #a855f7)',
  },
  {
    id: 'mint',
    name: 'Mint Breeze',
    description: 'โทนฟ้า-เขียวมินต์ เย็นตาสำหรับร้านสดใหม่',
    preview: 'linear-gradient(120deg, #06b6d4, #22d3ee)',
  },
  {
    id: 'sand',
    name: 'Sandy Latte',
    description: 'โทนคาราเมลนุ่ม ๆ ดูอบอุ่นและเป็นมืออาชีพ',
    preview: 'linear-gradient(120deg, #d97757, #f8c88c)',
  },
  {
    id: 'navy',
    name: 'Navy Coral',
    description: 'โทนน้ำเงินเข้มตัดสด ปรับภาพลักษณ์ให้ทันสมัย',
    preview: 'linear-gradient(120deg, #1d4ed8, #0ea5e9)',
  },
];
