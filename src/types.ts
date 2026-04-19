/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GeneratedImage {
  id: string;
  url: string;
  label: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export const POSE_PRESETS = [
  { id: 'frontal-hair', label: 'Chính diện, tay vuốt tóc nhẹ nhàng' },
  { id: 'frontal-waist', label: 'Chính diện, tay đặt ngang hông' },
  { id: 'frontal-face', label: 'Chính diện, tay chạm nhẹ vào mặt' },
  { id: 'frontal-playful', label: 'Chính diện, tinh nghịch: trêu đùa ống kính, biểu cảm lêu lêu, nháy mắt và bắn tim bằng tay' },
  { id: 'frontal-crossed', label: 'Chính diện, dáng đứng khoanh tay quyền lực' },
  { id: 'frontal-glamour', label: 'Chính diện, ánh nhìn thẳng quyến rũ' },
];
