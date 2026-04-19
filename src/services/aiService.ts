/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generatePosedImage(base64Image: string, poseDescription: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: `Dựa trên người mẫu trong ảnh, hãy tạo một ảnh mới với cùng người mẫu đó nhưng ở tư thế: ${poseDescription}. Đảm bảo chất lượng ảnh chân thực, điện ảnh, ánh sáng chuyên nghiệp và độ phân giải cao. Giữ nguyên trang phục và đặc điểm khuôn mặt.`,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error('No image was generated');
  } catch (error) {
    console.error("Lỗi khi tạo ảnh:", error);
    throw error;
  }
}
